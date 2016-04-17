'use strict';

const Bot = require('slackbots');
const fs = require('fs');
const CronJob = require('cron').CronJob;
const Model = require('./model');
const MessageService = require('./messageservice');
const AttendanceEnum = require('./participant').AttendanceEnum;
const store = require('./states').store;
const Actions = require('./states').Actions;
const States = require('./states').States;

class RoundpiecesBot extends Bot {
  constructor(settings) {
    super(settings);
    this.settings = settings;
    this.model = new Model(this.settings.adminUserName);
    this.messageService = new MessageService((userName, message) => this.postMessageToUser(userName, message), this.model, store);
    store.dispatch({type: Actions.INITIALIZE});
  }

  run() {
    this.on('start', this._onStart);
    this.on('message', this._onMessage);
  }

  get state() {
    return store.getState();
  }

  get hasSentSkipMessage() {
    return this._hasSentSkipMessage;
  }

  set hasSentSkipMessage(sent) {
    this._hasSentSkipMessage = sent;
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
      this._setupStoreSubscription();
      this._setupCronJobs();

      this.messageService.botActivated(this.settings.name);
    }
  }

  _setupStoreSubscription() {
    this.hasSentSkipMessage = false;
    store.subscribe(() => this._onStateChanged(store.getState()));
  }

  _onStateChanged(state) {
    switch (state.type) {
      case States.SEARCH_INITIATED:
        if (state.foundResponsible) {
          this._onFoundResponsible();
        }
        else {
          this._onSearchInitiated();
        }
        break;
      case States.AWAITING_MEETING:
        this._onAwaitingMeeting(state.foundResponsible);
        break;
      case States.RESETTING:
        this._onResetting();
        break;
      case States.NO_ATTENDANCE:
        this._onNoAttendance();
        break;
      case States.SKIPPED:
        this._onSkipped();
        break;
    }
  }

  _setupCronJobs() {
    const cronRanges = this.settings.cronRanges;
    new CronJob(cronRanges.start, () => this._startResponsibleSearch(), null, true);
    new CronJob(cronRanges.end, () => this._endResponsibleSearch(), null, true);
    new CronJob(cronRanges.reset, () => this._reset(), null, true);
  }

  _setupOneTimeJobs() {
    const endDate = this._getSearchEndTime();
    const resetDate = this._getResetTime();

    this._startResponsibleSearch();
    new CronJob(endDate, () => this._endResponsibleSearch(), null, true);
    new CronJob(resetDate, () => this._reset(), null, true);
  }

  /**
   * End time defaults to today at 12.00. If the search is started after 12.00, it defaults to an hour after the script
   * was invoked.
   * Doesn't handle the case where the script is invoked after 23.00.
   */
  _getSearchEndTime() {
    const now = new Date();
    const endDate = new Date();
    endDate.setHours(12);
    endDate.setMinutes(0);

    if (endDate < now) {
      endDate.setHours(now.getHours() + 1);
      endDate.setMinutes(now.getMinutes());
    }
    return endDate;
  }

  /**
   * Reset time defaults to today at 23.00.
   * Doesn't handle the case where the script is invoked after 23.00.
   */
  _getResetTime() {
    const resetDate = new Date();
    resetDate.setHours(23);
    resetDate.setMinutes(0);
    return resetDate;
  }

  _startResponsibleSearch() {
    store.dispatch({type: Actions.INITIATE_SEARCH});
  }

  _onSearchInitiated() {
    this._notifyParticipants();
  }

  _endResponsibleSearch() {
    store.dispatch({type: Actions.END_SEARCH});
  }

  _onAwaitingMeeting(foundResponsible) {
    if (foundResponsible) {
      this.messageService.participationList();
    }
    else {
      this.messageService.noResponsibleResponse();
    }
  }

  _reset() {
    store.dispatch({type: Actions.RESET});
  }

  _onResetting() {
    this.model.reset();
    this.hasSentSkipMessage = false;
    store.dispatch({type: Actions.RESAT});
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
            case 'skip':
              this._skipNextMeeting();
              break;
            case 'start':
              this._setupOneTimeJobs();
              break;
            case 'state':
              this.messageService.state();
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
    if (this._canAcceptOrReject(participant)) {
      store.dispatch({type: Actions.FOUND_RESPONSIBLE});
    }
  }

  _onFoundResponsible() {
    this.messageService.accepted();
    this.model.getResponsible().attending = AttendanceEnum.ATTENDING;
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
    if (this._canAcceptOrReject(participant)) {
      this.messageService.rejected(participant.username);
      participant.attending = AttendanceEnum.NOT_ATTENDING;
      const nextUser = this.model.getNextParticipant(participant);
      if (!nextUser) {
        store.dispatch({type: Actions.NO_ATTENDANCE});
      }
      else {
        this.model.setResponsible(nextUser);
        this.messageService.notifyResponsible();
      }
    }
  }

  _onNoAttendance() {
    this.messageService.nobodyAttending();
    this.model.setResponsible(this.model.participants[0]);
  }

  _canAcceptOrReject(participant) {
    if (!participant.responsible) {
      this.messageService.notResponsible(participant.username);
      return false;
    }

    if (this.state.type !== States.SEARCH_INITIATED) {
      this.messageService.wrongTime(participant.username);
      return false;
    }

    if (this.state.foundResponsible) {
      this.messageService.alreadyAccepted();
      return false;
    }
    return true;
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
    return this.state.type === States.SEARCH_INITIATED;
  }

  _changeResponsible(newResponsibleUserName) {
    const responsible = this.model.getParticipantFromUserName(newResponsibleUserName);
    if (responsible) {
      if (responsible !== this.model.getResponsible()) {
        this.messageService.noLongerResponsible();
        this.model.setResponsible(responsible);
      }
      this._updateList();
      this.messageService.participationList();
      this.messageService.responsibleChanged(responsible.username);
    }
    else {
      this.messageService.notParticipant(newResponsibleUserName);
    }
  }

  _skipNextMeeting() {
    store.dispatch({type: Actions.SKIP});
  }

  _onSkipped() {
    if (!this.hasSentSkipMessage) {
      this.messageService.skipping();
      this.hasSentSkipMessage = true;
    }
  }

  _notifyParticipants() {
    this.messageService.notifyResponsible();
    this.messageService.queryForAttendance();
  }

  _reportError(error) {
    console.error(error);
    this.messageService.error(error);
  }
}

module.exports = RoundpiecesBot;
