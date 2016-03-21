'use strict';

const Bot = require('slackbots');
const fs = require('fs');
const _ = require('lodash');
const CronJob = require('cron').CronJob;

const RoundpiecesBot = class RoundpiecesBot extends Bot {
  constructor(settings) {
    super(settings);
    this.settings = settings;
  }

  run() {
    this.on('start', this._onStart);
    this.on('message', this._onMessage);
  }

  get responsible() {
    return this._responsible;
  }

  set responsible(userName) {
    this._responsible = userName;
  }

  get participantCount() {
    return this.participants.length;
  }

  _onStart() {
    this.startTime = Date.now();

    fs.readFile(this.settings.listPath, 'utf8', (error, data) => {
      if (error) {
        this._reportError(error);
      }
      else {
        this.participants = data.split('\n').filter((entry) => entry !== '');
        if (this.participantCount < 1) {
          this._reportError('No participants in list');
          return;
        }
        this.responsible = this.participants[0];

        //TODO also let administrator invoke script directly in case of virtual Friday
        new CronJob(this.settings.cronRange, () => this._notifyParticipants(), null, true);

        this.postMessageToUser(this.settings.adminUserName,
            `${this.settings.name} fully activated! Type \`help\` for a full list of commands.`);
      }
    });
  }

  _onMessage(message) {
    if (message.type === 'message' && message.user) {
      const userName = this._getUserNameFromUserId(message.user);
      if (!userName) {
        this._reportError(`Unknown user id: ${message.user}`);
        console.log(message);
        return;
      }
      switch (message.text.toLowerCase()) {
        case 'help':
        case '?':
          this._printHelp(userName);
          break;
        case 'status':
          this._printStatus(userName);
          break;
        case 'next':
          this._printNext(userName);
          break;
        case 'list':
          this._printList(userName);
          break;
        case 'accept':
          this._accept(userName);
          break;
        case 'reject':
          this._reject(userName);
          break;
        default:
          this._printUnknownCommand(userName);
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
    this.postMessageToUser(userName, `The next person to bring roundpieces is *${this.responsible}*`);
  }

  _printList(userName) {
    this.postMessageToUser(userName, this.participants.join(', '));
  }

  _printUnknownCommand(userName) {
    this.postMessageToUser(userName, 'I don\'t understand what you\'re asking :disappointed: Type `help` for a full list of commands that I understand.');
  }

  _accept(userName) {
    if (userName === this.responsible) {
      this.postMessageToUser(userName, 'Thank you! I will notify you at 15.00 with a list of who will be attending the next roundpieces meeting.');
      this._updateList();
    }
    else {
      this.postMessageToUser(userName, 'You are not the responsible for bringing roundpieces next time.');
    }
  }

  _updateList() {
    //TODO handle case where there has been a reject
    this.participants.push(this.participants.shift()); //Move first participant to end of array
    fs.writeFile(this.settings.listPath, this.participants.join('\n'), (error) => {
      if (error) {
        this._reportError(`Failed to save list due to ${error}`);
      }
    });
  }

  _reject(userName) {
    //TODO rejection after accept?
    if (userName === this.responsible) {
      this.postMessageToUser(userName, 'Alright, I\'ll ask the next one on the list to bring them instead.');
      const nextUser = this._getNextUser(this.responsible);
      if (!nextUser) {
        this.postMessageToUser(this.settings.adminUserName, 'Nobody is able to bring roundpieces for the next meeting.');
      }
      else {
        this.responsible = nextUser;
        this._notifyResponsible();
      }
    }
    else {
      this.postMessageToUser(userName, 'You are not the responsible for bringing roundpieces next time.');
    }
  }

  _getUserNameFromUserId(userId) {
    const user = _.find(this.users, (user) => user.id === userId);
    return user ? user.name : null;
  }

  _getNextUser(userName) {
    const currentIndex = _.findIndex(this.participants, (participant) => participant === userName);
    if (currentIndex >= this.participantCount - 1) {
      return null;
    }
    return this.participants[currentIndex + 1];
  }

  _notifyParticipants() {
    this._notifyResponsible();
    //TODO notify participants, handle non-slack users
    //TODO setup CronJob for sending participation list to responsible, changing the responsible
  }

  _notifyResponsible() {
    console.log('notifying ', this.responsible);
    this.postMessageToUser(this.responsible,
        `It is your turn to bring roundpieces next time!
Please respond before 15.00 today with either \`accept\` to indicate that you will bring them, or \`reject\` if you're unable.
There's currently ${this.participantCount} participants:
  ${this.participants}`);
  }

  _reportError(error) {
    console.error(error);
    this.postMessageToUser(this.settings.adminUserName, `I'm afraid I've encountered an error: ${error}`);
  }
};

module.exports = RoundpiecesBot;
