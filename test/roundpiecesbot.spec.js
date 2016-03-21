const expect = require('chai').expect;
const RoundpiecesBot = require('../src/roundpiecesbot');

describe('Roundpieces Bot', () => {
  'use strict';
  let roundpiecesBot;
  const settings = {
    token: '123456789',
    name: 'Roundpieces Administration Bot',
    cronRange: '00,10,20,30,40,50 * * * * *',
    adminUserName: 'admin',
    listPath: '~/list'
  };

  beforeEach(() => {
    roundpiecesBot = new RoundpiecesBot(settings);
  });

  it('should be initialized with settings', () => {
    expect(roundpiecesBot.settings).to.equal(settings);
  });
});
