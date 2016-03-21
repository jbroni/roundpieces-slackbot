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

  get next() {
    return this.participants[0];
  }

  get participantCount() {
    return this.participants.length;
  }

  _onStart() {
    this.startTime = Date.now();

    fs.readFile(this.settings.listPath, 'utf8', (error, data) => {
      if (error) {
        console.log(error);
      }
      else {
        this.participants = data.split('\n').filter((entry) => entry !== '');

        new CronJob(this.settings.cronRange, () => this._notifyParticipants(), null, true);

        this.postMessageToUser(this.settings.adminUserName,
            'RoundpiecesBot fully activated! Type `help` for a full list of commands.');
      }
    });
  }

  _onMessage(message) {
    if (message.type === 'message' && message.user) {
      const userName = this._getUserNameFromUserId(message.user);
      if (!userName) {
        console.error('Unknown user id', message.user);
        console.log(message);
        return;
      }
      switch (message.text) {
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
    this.postMessageToUser(userName, `The next person to bring roundpieces is *${this.next}*`);
  }

  _printList(userName) {
    this.postMessageToUser(userName, this.participants.join(', '));
  }

  _printUnknownCommand(userName) {
    this.postMessageToUser(userName, 'I don\'t understand what you\'re asking :disappointed: Type `help` for a full list of commands that I understand.');
  }

  _getUserNameFromUserId(userId) {
    const user = _.find(this.users, (user) => user.id === userId);
    return user ? user.name : null;
  }

  _notifyParticipants() {
    this._notifyResponsible();
  }

  _notifyResponsible() {
    this.postMessageToUser(this.next,
        `It is your turn to bring roundpieces next time!
Please respond before 15.00 today with either \`accept\` to indicate that you will bring them, or \`reject\` if you're unable.
There's currently ${this.participantCount} participants:
  ${this.participants}`);
  }
};

module.exports = RoundpiecesBot;
