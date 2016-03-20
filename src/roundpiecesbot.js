'use strict';

const Bot = require('slackbots');
const fs = require('fs');
const _ = require('lodash');

const RoundpiecesBot = class RoundpiecesBot extends Bot {
  constructor(settings) {
    super(settings);
    this.settings = settings;
    this.settings.name = this.settings.name | 'Roundpieces Administration Bot';
  }

  run() {
    this.on('start', this._onStart);
    this.on('message', this._onMessage);
  }

  _onStart() {
    this.startTime = Date.now();

    fs.readFile(this.settings.listPath, 'utf8', (error, data) => {
      if (error) {
        console.log(error);
      }
      else {
        this.peopleList = data.split('\n').filter((entry) => entry !== '');
      }
    });

    this.postMessageToUser(this.settings.adminUserName,
        'RoundpiecesBot fully activated! Type `help` for a full list of commands.');
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
    this.postMessageToUser(userName, `The next person to bring roundpieces is *${this.peopleList[0]}*`);
  }

  _printList(userName) {
    this.postMessageToUser(userName, this.peopleList.join(', '));
  }

  _printUnknownCommand(userName) {
    this.postMessageToUser(userName, 'I don\'t understand what you\'re asking :disappointed: Type `help` for a full list of commands that I understand.');
  }

  _getUserNameFromUserId(userId) {
    const user = _.find(this.users, (user) => user.id === userId);
    return user ? user.name : null;
  }
};

module.exports = RoundpiecesBot;
