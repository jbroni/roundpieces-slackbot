'use strict';

const Bot = require('slackbots');
const fs = require('fs');
const _ = require('lodash');
const CronJob = require('cron').CronJob;
const Participant = require('./participant');

class RoundpiecesBot extends Bot {
  constructor(settings) {
    super(settings);
    this.settings = settings;
  }

  run() {
    this.on('start', this._onStart);
    this.on('message', this._onMessage);
  }

  get participants() {
    return this._participants;
  }

  set participants(list) {
    this._participants = list
        .split('\n')
        .filter((userName) => this._userExists(userName))
        .map((userName) => {
          const userId = this._getUserIdFromUserName(userName);
          return new Participant(userId, userName);
        });
  }

  _getParticipantCount() {
    return this.participants.length;
  }

  _getParticipantUserNames() {
    return this.participants.map((participant) => participant.username);
  }

  _getResponsible() {
    return _.find(this.participants, (participant) => participant.responsible);
  }

  _setResponsible(responsible) {
    _.forEach(this.participants, (participant) => {
      participant.responsible = false;
    });
    _.find(this.participants, responsible).responsible = true;
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
      this.participants = data;
      if (this._getParticipantCount() < 1) {
        this._reportError('No participants in list');
        return;
      }
      this._setResponsible(this.participants[0]);

      //TODO also let administrator invoke script directly in case of virtual Friday
      new CronJob(this.settings.cronRange, () => this._notifyParticipants(), null, true);

      this.postMessageToUser(this.settings.adminUserName,
          `${this.settings.name} fully activated! Type \`help\` for a full list of commands.`);
    }
  }

  _onMessage(message) {
    if (message.type === 'message' && message.user) {
      const participant = this._getParticipantFromId(message.user);
      if (!participant) {
        this._reportError(`Unknown user id: ${message.user}`);
        console.log(message);
        return;
      }
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
    this.postMessageToUser(userName, `The next person to bring roundpieces is *${this._getResponsible().username}*`);
  }

  _printList(userName) {
    this.postMessageToUser(userName, this._getParticipantUserNames().join(', '));
  }

  _printUnknownCommand(userName) {
    this.postMessageToUser(userName, 'I don\'t understand what you\'re asking :disappointed: Type `help` for a full list of commands that I understand.');
  }

  _accept(participant) {
    if (participant.responsible) {
      this.postMessageToUser(participant.username, 'Thank you! I will notify you at 12.00 with a list of who will be attending the next roundpieces meeting.');
      participant.attending = 'yes';
      this._updateList();
    }
    else {
      this.postMessageToUser(participant.username, 'You are not the responsible for bringing roundpieces next time.');
    }
  }

  _updateList() {
    //Move responsible to end of list
    const responsible = this._getResponsible();
    _.pull(this.participants, responsible);
    this.participants.push(responsible);
    //Persist list
    fs.writeFile(this.settings.listPath, this._getParticipantUserNames().join('\n'), (error) => {
      if (error) {
        this._reportError(`Failed to save list due to ${error}`);
      }
    });
  }

  _reject(participant) {
    //TODO rejection after accept?
    if (participant.responsible) {
      this.postMessageToUser(participant.username, 'Alright, I\'ll ask the next one on the list to bring them instead.');
      participant.attending = 'no';
      const nextUser = this._getNextParticipant(participant);
      if (!nextUser) {
        //TODO remember to disable cronjob
        this.postMessageToUser(this.settings.adminUserName, 'Nobody is able to bring roundpieces for the next meeting.');
        this._setResponsible(this.participants[0]);
      }
      else {
        this._setResponsible(nextUser);
        this._notifyResponsible();
      }
    }
    else {
      this.postMessageToUser(participant.username, 'You are not the responsible for bringing roundpieces next time.');
    }
  }

  _attending(participant) {
    participant.attending = 'yes';
    this.postMessageToUser(participant.username, 'Thank you for your response. I have noted that you\'ll *be attending* tomorrow.');
  }

  _notAttending(participant) {
    participant.attending = 'no';
    this.postMessageToUser(participant.username, 'Thank you for your response. I have noted that you will *not be attending* tomorrow.');
  }

  _getUserNameFromUserId(userId) {
    const user = _.find(this.users, (user) => user.id === userId);
    return user ? user.name : null;
  }

  _getUserIdFromUserName(userName) {
    const user = _.find(this.users, (user) => user.name === userName);
    return user ? user.id : null;
  }

  _userExists(userName) {
    return Boolean(this._getUserIdFromUserName(userName));
  }

  _getParticipantFromId(userId) {
    return _.find(this.participants, (participant) => participant.id === userId);
  }

  _getNextParticipant(currentParticipant) {
    const currentIndex = _.findIndex(this.participants, currentParticipant);
    if (currentIndex >= this._getParticipantCount() - 1) {
      return null;
    }
    return this.participants[currentIndex + 1];
  }

  _notifyParticipants() {
    this._notifyResponsible();
    this._queryForAttendance();
    //TODO setup CronJob for sending participation list to responsible, changing the responsible, resetting attendance
  }

  _notifyResponsible() {
    this.postMessageToUser(this._getResponsible().username,
        `It is your turn to bring roundpieces next time!
Please respond before 12.00 today with either \`accept\` to indicate that you will bring them, or \`reject\` if you're unable.
There's currently ${this._getParticipantCount()} participants:
  ${this._getParticipantUserNames().join(', ')}`);
  }

  _queryForAttendance() {
    //TODO handle non-slack users
    this.participants
        .filter((participant) => !participant.responsible)
        .forEach((participant) => this.postMessageToUser(participant.username,
            `To help ${this._getResponsible().username} buying the correct number of roundpieces, please respond to this message before 12.00 today.
Please respond \`yes\` if you're attending the roundpieces meeting tomorrow.
If you won't attend, please respond \`no\`.`));
  }

  _reportError(error) {
    console.error(error);
    this.postMessageToUser(this.settings.adminUserName, `I'm afraid I've encountered an error: ${error}`);
  }
}

module.exports = RoundpiecesBot;
