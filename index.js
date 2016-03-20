'use strict';

const RoundpiecesBot = require('./src/roundpiecesbot');

const token = process.env.BOT_API_KEY;

const roundpiecesBot = new RoundpiecesBot({
  token: token
});

roundpiecesBot.run();
