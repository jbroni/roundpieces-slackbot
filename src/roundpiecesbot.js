const Bot = require('slackbots');
const util = require('util');
const _ = require('lodash');

const RoundpiecesBot = function Constructor(settings) {
  this.settings = settings;
};

RoundpiecesBot.prototype.run = function () {
  RoundpiecesBot.super_.call(this, this.settings);

  this.on('start', this._onStart);
  this.on('message', this._onMessage);
};

RoundpiecesBot.prototype._onStart = function () {
  this.startTime = Date.now();
  this.postMessageToUser(this.settings.adminUserName,
      'RoundpiecesBot fully activated! Type `help` for a full list of commands.');
};

RoundpiecesBot.prototype._onMessage = function (message) {
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
      default:
        this._printUnknownCommand(userName);
        break;
    }
  }
};

RoundpiecesBot.prototype._printHelp = function (userName) {
  this.postMessageToUser(userName, `Here is a list of commands:
  • \`help\`, \`?\`: Prints this help
  • \`status\`: Prints how long I've been alive`);
};

RoundpiecesBot.prototype._printStatus = function (userName) {
  const uptime = Date.now() - this.startTime;
  this.postMessageToUser(userName, `I have been alive for *${uptime} ms!*`);
};

RoundpiecesBot.prototype._printUnknownCommand = function (userName) {
  this.postMessageToUser(userName, 'I don\'t understand what you\'re asking :disappointed: Type `help` for a full list of commands that I understand.');
};

RoundpiecesBot.prototype._getUserNameFromUserId = function (userId) {
  const user = _.find(this.users, (user) => user.id === userId);
  return user ? user.name : null;
};

util.inherits(RoundpiecesBot, Bot);

module.exports = RoundpiecesBot;
