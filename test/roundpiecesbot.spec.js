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
  const users = [
    {
      name: 'a',
      id: 'ida'
    },
    {
      name: 'b',
      id: 'idb'
    },
    {
      name: 'c',
      id: 'idc'
    },
    {
      name: 'd',
      id: 'idd'
    },
    {
      name: 'e',
      id: 'ide'
    }
  ];
  const participants = 'a\nb\nc\nd';

  beforeEach(() => {
    roundpiecesBot = new RoundpiecesBot(settings);
    roundpiecesBot.users = users;
  });

  it('should be initialized with settings', () => {
    expect(roundpiecesBot.settings).to.equal(settings);
  });

  describe('_setup()', () => {
    beforeEach(() => {
      roundpiecesBot._setup(null, participants);
    });

    it('should create a participant array', () => {
      expect(roundpiecesBot.participants).to.deep.equal(participants.split('\n'));
    });

    it('should set the responsible to the first participant', () => {
      expect(roundpiecesBot.responsible).to.equal('a');
    });
  });

  describe('_getUserNameFromUserId', () => {
    beforeEach(() => {
      roundpiecesBot._setup(null, participants);
    });

    it('should get the user from the user id', () => {
      expect(roundpiecesBot._getUserNameFromUserId('idc')).to.equal('c');
    });

    it('should return null for an unknown user id', () => {
      expect(roundpiecesBot._getUserNameFromUserId('unknown')).to.equal(null);
    });
  });

  describe('_getNextUser()', () => {
    beforeEach(() => {
      roundpiecesBot._setup(null, participants);
    });

    it('should find the participant', () => {
      expect(roundpiecesBot._getNextUser('a')).to.equal('b');
    });

    it('should return null for the last participant', () => {
      expect(roundpiecesBot._getNextUser('d')).to.equal(null);
    });

    it('should return the first participant for an unknown user', () => {
      expect(roundpiecesBot._getNextUser('unknown')).to.equal('a');
    });
  });
});
