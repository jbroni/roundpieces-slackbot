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
  this.postMessageToUser(this.settings.adminUserName, 'RoundpiecesBot fully activated!');
};

RoundpiecesBot.prototype._onMessage = function (message) {
  console.log(message);
};

util.inherits(RoundpiecesBot, Bot);

module.exports = RoundpiecesBot;
