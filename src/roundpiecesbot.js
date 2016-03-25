'use strict';

const Bot = require('slackbots');
const fs = require('fs');
const CronJob = require('cron').CronJob;
const Model = require('./model');
const AttendanceEnum = require('./participant').AttendanceEnum;

const States = Object.freeze({
  IDLE: 'idle',
  ASKED_RESPONSBILE: 'asked responsible',
  FOUND_RESPONSIBLE: 'found responsible'
});

class RoundpiecesBot extends Bot {
  constructor(settings) {
    super(settings);
    this.settings = settings;
    this.state = States.IDLE;
    this.model = new Model(this.settings.adminUserName);
  }

  run() {
    this.on('start', this._onStart);
    this.on('message', this._onMessage);
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
  }

  _onStart() {
    this.startTime = Date.now();

    fs.readFile(this.settings.listPath, 'utf8', (error, data) => this._setup(error, data));
  }

  _setup(error, data) {
    if (error) {
      this._reportError(error);
    }
    else {
      this.model.users = this.users;
      this.model.participants = data;
      if (this.model.getParticipantCount() < 1) {
        this._reportError('No participants in list');
        return;
      }
      this.model.setResponsible(this.model.participants[0]);
      this._setupCronJobs();

      this.postMessageToUser(this.settings.adminUserName,
          `${this.settings.name} fully activated! Type \`help\` for a full list of commands.`);
    }
  }

  _setupCronJobs() {
    const cronRanges = this.settings.cronRanges;
    //TODO also let administrator invoke script directly in case of virtual Friday
    new CronJob(cronRanges.start, () => this._startResponsibleSearch(), null, true);
    new CronJob(cronRanges.end, () => this._endResponsibleSearch(), null, true);
    new CronJob(cronRanges.reset, () => this._reset(), null, true);
  }

  _startResponsibleSearch() {
    this.state = States.ASKED_RESPONSBILE;
    this._notifyParticipants();
  }

  _endResponsibleSearch() {
    if (this.state === States.FOUND_RESPONSIBLE) {
      this._sendParticipationList();
    }
    else {
      this._noResponsibleFoundInTime();
    }
  }

  _reset() {
    this.model.reset();
  }

  _onMessage(message) {
    if (message.type === 'message' && message.user) {
      const participant = this.model.getParticipantFromId(message.user);
      if (!participant) {
        this._reportError(`Unknown user id: ${message.user}`);
        console.log(message);
        return;
      }

      if (message.text.startsWith('admin')) {
        if (participant.admin) {
          const messageParts = message.text.split(' ');
          switch (messageParts[1]) {
            case 'setResponsible':
              this._changeResponsible(messageParts[2]);
              break;
            default:
              this._printUnknownCommand(participant.username);
              break;
          }
        }
        else {
          this.postMessageToUser(participant.username, 'You are not an administrator.');
        }
      }
      else {
        switch (message.text.toLowerCase()) {
          case 'help':
          case '?':
            this._printHelp(participant.username);
            break;
          case 'status':
            this._printStatus(participant.username);
            break;
          case 'next':
            this._printNext(participant.username);
            break;
          case 'list':
            this._printList(participant.username);
            break;
          case 'accept':
            this._accept(participant);
            break;
          case 'reject':
            this._reject(participant);
            break;
          case 'yes':
            this._attending(participant);
            break;
          case 'no':
            this._notAttending(participant);
            break;
          default:
            this._printUnknownCommand(participant.username);
            break;
        }
      }
    }
  }

  _printHelp(userName) {
    this.postMessageToUser(userName, `Here is a list of commands:
  • \`help\`, \`?\`: Prints this help
  • \`status\`: Prints how long I've been alive
  • \`next\`: Prints who is going to bring roundpieces next time
  • \`list\`: Prints ordered list of people participating in the roundpieces arrangement`
    );
  }

  _printStatus(userName) {
    const uptime = Date.now() - this.startTime;
    this.postMessageToUser(userName, `I have been alive for *${uptime} ms!*`);
  }

  _printNext(userName) {
    this.postMessageToUser(userName, `The next person to bring roundpieces is *${this.model.getResponsible().username}*`);
  }

  _printList(userName) {
    this.postMessageToUser(userName, this.model.getParticipantUserNames().join(', '));
  }

  _printUnknownCommand(userName) {
    this.postMessageToUser(userName, 'I don\'t understand what you\'re asking :disappointed: Type `help` for a full list of commands that I understand.');
  }

  _accept(participant) {
    if (participant.responsible) {
      this.postMessageToUser(participant.username, 'Thank you! I will notify you at 12.00 with a list of who will be attending the next roundpieces meeting.');
      participant.attending = AttendanceEnum.ATTENDING;
      this.state = States.FOUND_RESPONSIBLE;
      this._updateList();
    }
    else {
      this.postMessageToUser(participant.username, 'You are not the responsible for bringing roundpieces next time.');
    }
  }

  _updateList() {
    this.model.updateList();
    //Persist list
    fs.writeFile(this.settings.listPath, this.model.getParticipantUserNames().join('\n'), (error) => {
      if (error) {
        this._reportError(`Failed to save list due to ${error}`);
      }
    });
  }

  _reject(participant) {
    //TODO rejection after accept?
    if (participant.responsible) {
      this.postMessageToUser(participant.username, 'Alright, I\'ll ask the next one on the list to bring them instead.');
      participant.attending = AttendanceEnum.NOT_ATTENDING;
      const nextUser = this.model.getNextParticipant(participant);
      if (!nextUser) {
        //TODO remember to disable cronjob
        this.postMessageToUser(this.settings.adminUserName, 'Nobody is able to bring roundpieces for the next meeting.');
        this.model.setResponsible(this.model.participants[0]);
      }
      else {
        this.model.setResponsible(nextUser);
        this._notifyResponsible();
      }
    }
    else {
      this.postMessageToUser(participant.username, 'You are not the responsible for bringing roundpieces next time.');
    }
  }

  _attending(participant) {
    participant.attending = AttendanceEnum.ATTENDING;
    this.postMessageToUser(participant.username, 'Thank you for your response. I have noted that you\'ll *be attending* tomorrow.');
  }

  _notAttending(participant) {
    participant.attending = AttendanceEnum.NOT_ATTENDING;
    this.postMessageToUser(participant.username, 'Thank you for your response. I have noted that you will *not be attending* tomorrow.');
  }

  _changeResponsible(newResposibleUserName) {
    const responsible = this.model.getParticipantFromUserName(newResposibleUserName);
    if (responsible) {
      this.model.setResponsible(responsible);
      this.state = States.FOUND_RESPONSIBLE;
      this._updateList();
      this._sendParticipationList();
      this.postMessageToUser(this.settings.adminUserName, `${responsible.username} has been set as responsible and list has been updated.`);
    }
    else {
      this.postMessageToUser(this.settings.adminUserName, `${newResposibleUserName} is not a participant.`);
    }
  }

  _notifyParticipants() {
    this._notifyResponsible();
    this._queryForAttendance();
  }

  _notifyResponsible() {
    this.postMessageToUser(this.model.getResponsible().username,
        `It is your turn to bring roundpieces next time!
Please respond before 12.00 today with either \`accept\` to indicate that you will bring them, or \`reject\` if you're unable.
There's currently ${this.model.getParticipantCount()} participants:
  ${this.model.getParticipantUserNames().join(', ')}`);
  }

  _queryForAttendance() {
    //TODO handle non-slack users
    this.model.participants
        .filter((participant) => !participant.responsible)
        .forEach((participant) => this.postMessageToUser(participant.username,
            `To help the responsible buying the correct number of roundpieces, please respond to this message before 12.00 today.
Please respond \`yes\` if you're attending the roundpieces meeting tomorrow.
If you won't attend, please respond \`no\`.`));
  }

  _sendParticipationList() {
    const attending = this.model.getParticipantUserNamesByAttendance(AttendanceEnum.ATTENDING);
    const notAttending = this.model.getParticipantUserNamesByAttendance(AttendanceEnum.NOT_ATTENDING);
    const unknown = this.model.getParticipantUserNamesByAttendance(AttendanceEnum.UNKNOWN);

    //TODO bring cake if less than half are participating

    this.postMessageToUser(this.model.getResponsible().username,
        `You will have to bring roundpieces for *${attending.length + unknown.length}* people tomorrow.

Attending: ${attending.join(', ')}
Not attending: ${notAttending.join(', ')}
Unknown attendance: ${unknown.join(', ')}`
    );
  }

  _noResponsibleFoundInTime() {
    //TODO make sure admin is able to set list in correct order
    this.postMessageToUser(this.settings.adminUserName,
        `${this.model.getResponsible().username} did not respond. Please make sure that someone is able to bring roundpieces tomorrow.
Current list: ${this.model.getParticipantUserNames().join(', ')}`);
  }

  _reportError(error) {
    console.error(error);
    this.postMessageToUser(this.settings.adminUserName, `I'm afraid I've encountered an error: ${error}`);
  }
}

module.exports = RoundpiecesBot;
