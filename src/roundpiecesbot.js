'use strict';

const Bot = require('slackbots');
const util = require('util');

const RoundpiecesBot = function Constructor(settings) {
  this.settings = settings;
};

RoundpiecesBot.prototype.run = function () {
  RoundpiecesBot.super_.call(this, this.settings);

  this.on('start', this._onStart);
  this.on('message', this._onMessage);
};

RoundpiecesBot.prototype._onStart = function () {
  this.postMessageToUser(this.settings.adminUserName,
      'RoundpiecesBot fully activated! Type help for a full list of commands');
};

RoundpiecesBot.prototype._onMessage = function (message) {
  if (message.type === 'message') {
    switch (message.text) {
      case 'help':
      case '?':
        this._printHelp();
        break;
      default:
        console.log(message);
        break;
    }
  }
};

RoundpiecesBot.prototype._printHelp = function () {
  console.log('help');
};

util.inherits(RoundpiecesBot, Bot);

module.exports = RoundpiecesBot;
