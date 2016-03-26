'use strict';

const Bot = require('slackbots');
const fs = require('fs');
const CronJob = require('cron').CronJob;
const Model = require('./model');
const MessageService = require('./messageservice');
const AttendanceEnum = require('./participant').AttendanceEnum;

const States = Object.freeze({
  IDLE: 'idle',
  ASKED_RESPONSBILE: 'asked responsible',
  FOUND_RESPONSIBLE: 'found responsible',
  NO_RESPONSIBLE: 'no responsible',
  AWAITING_MEETING: 'awaiting meeting'
});

class RoundpiecesBot extends Bot {
  constructor(settings) {
    super(settings);
    this.settings = settings;
    this.state = States.IDLE;
    this.model = new Model(this.settings.adminUserName);
    this.messageService = new MessageService((userName, message) => this.postMessageToUser(userName, message), this.model);
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

      this.messageService.botActivated(this.settings.name);
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
    switch (this.state) {
      case States.FOUND_RESPONSIBLE:
        this.messageService.participationList();
        break;
      case States.ASKED_RESPONSBILE:
        this.messageService.noResponsibleResponse();
        break;
      case States.NO_RESPONSIBLE:
        //No attendance - don't do anything
        break;
    }
    this.state = States.AWAITING_MEETING;
  }

  _reset() {
    this.model.reset();
    this.state = States.IDLE;
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
            case 'help':
              this.messageService.adminHelp();
              break;
            case 'setResponsible':
              this._changeResponsible(messageParts[2]);
              break;
            default:
              this.messageService.unknownCommand(participant.username);
              break;
          }
        }
        else {
          this.messageService.notAdmin(participant.username);
        }
      }
      else {
        switch (message.text.toLowerCase()) {
          case 'help':
          case '?':
            this.messageService.help(participant.username);
            break;
          case 'status':
            this._printStatus(participant.username);
            break;
          case 'next':
            this.messageService.next(participant.username);
            break;
          case 'list':
            this.messageService.list(participant.username);
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
            this.messageService.unknownCommand(participant.username);
            break;
        }
      }
    }
  }

  _printStatus(userName) {
    const uptime = Date.now() - this.startTime;
    this.messageService.status(userName, uptime);
  }

  _accept(participant) {
    if (!participant.responsible) {
      this.messageService.notResponsible(participant.username);
      return;
    }

    if (this.state !== States.ASKED_RESPONSBILE) {
      this.messageService.wrongTime(participant.username);
      return;
    }

    this.messageService.accepted(participant.username);
    participant.attending = AttendanceEnum.ATTENDING;
    this.state = States.FOUND_RESPONSIBLE;
    this._updateList();
  }

  _updateList() {
    this.model.updateList();
    //Persist list
    const list = this.model.getParticipantUserNames().join('\n');
    fs.writeFile(this.settings.listPath, list, (error) => {
      if (error) {
        this._reportError(`Failed to save list due to ${error}. List is currently: ${list}`);
      }
    });
  }

  _reject(participant) {
    if (!participant.responsible) {
      this.messageService.notResponsible(participant.username);
      return;
    }

    if (this.state !== States.ASKED_RESPONSBILE) {
      this.messageService.wrongTime(participant.username);
      return;
    }

    this.messageService.rejected(participant.username);
    participant.attending = AttendanceEnum.NOT_ATTENDING;
    const nextUser = this.model.getNextParticipant(participant);
    if (!nextUser) {
      this.state = States.NO_RESPONSIBLE;
      this.messageService.nobodyAttending();
      this.model.setResponsible(this.model.participants[0]);
    }
    else {
      this.model.setResponsible(nextUser);
      this.messageService.notifyResponsible();
    }
  }

  _attending(participant) {
    if (participant.responsible) {
      this.messageService.isResponsible();
      return;
    }

    if (!this._canChangeAttendanceStatus()) {
      this.messageService.wrongTime(participant.username);
      return;
    }

    participant.attending = AttendanceEnum.ATTENDING;
    this.messageService.attending(participant.username);
  }

  _notAttending(participant) {
    if (participant.responsible) {
      this.messageService.isResponsible();
      return;
    }

    if (!this._canChangeAttendanceStatus()) {
      this.messageService.wrongTime(participant.username);
      return;
    }

    participant.attending = AttendanceEnum.NOT_ATTENDING;
    this.messageService.notAttending(participant.username);
  }

  _canChangeAttendanceStatus() {
    return this.state === States.ASKED_RESPONSBILE || this.state === States.FOUND_RESPONSIBLE;
  }

  _changeResponsible(newResposibleUserName) {
    const responsible = this.model.getParticipantFromUserName(newResposibleUserName);
    if (responsible) {
      this.messageService.noLongerResponsible();
      this.model.setResponsible(responsible);
      this._updateList();
      this.messageService.participationList();
      this.messageService.responsibleChanged(responsible.username);
    }
    else {
      this.messageService.notParticipant(newResposibleUserName);
    }
  }

  _notifyParticipants() {
    //TODO handle non-slack users
    this.messageService.notifyResponsible();
    this.messageService.queryForAttendance();
  }

  _reportError(error) {
    console.error(error);
    this.messageService.error(error);
  }
}

module.exports = RoundpiecesBot;
