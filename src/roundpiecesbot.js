'use strict';

const Bot = require('slackbots');
const util = require('util');

const RoundpiecesBot = function Constructor(settings) {
  this.settings = settings;
  this.settings.name = this.settings.name || 'RoundpiecesBot';
};

RoundpiecesBot.prototype.run = function () {
  RoundpiecesBot.super_.call(this, this.settings);

  this.on('start', this._onStart);
  this.on('message', this._onMessage);
};

RoundpiecesBot.prototype._onStart = function () {
  this.postMessageToUser('jba', 'Hello Jesper');
};

RoundpiecesBot.prototype._onMessage = function (message) {
  console.log(message);
};

util.inherits(RoundpiecesBot, Bot);

module.exports = RoundpiecesBot;
