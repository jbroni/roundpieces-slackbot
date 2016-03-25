const expect = require('chai').expect;
const sinon = require('sinon');
const RoundpiecesBot = require('../src/roundpiecesbot');
const Participant = require('../src/participant').Participant;
const fs = require('fs');

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
  const list = 'a\nb\nc\nd';
  let participants = [];

  beforeEach(() => {
    roundpiecesBot = new RoundpiecesBot(settings);
    roundpiecesBot.users = users;
    participants = [
      new Participant(users[0].id, users[0].name),
      new Participant(users[1].id, users[1].name),
      new Participant(users[2].id, users[2].name),
      new Participant(users[3].id, users[3].name)];
    participants[0].responsible = true;
  });

  it('should be initialized with settings', () => {
    expect(roundpiecesBot.settings).to.equal(settings);
  });

  describe('_setup()', () => {
    beforeEach(() => {
      roundpiecesBot._setup(null, list);
    });

    it('should create a participant array with the correct number of users', () => {
      expect(roundpiecesBot.participants.length).to.equal(4);
    });

    it('should create a participant array with the correct users', () => {
      expect(roundpiecesBot.participants).to.deep.equal(participants);
    });

    it('should set the responsible to the first participant', () => {
      expect(roundpiecesBot._getResponsible()).to.deep.equal(participants[0]);
    });
  });

  describe('_setResponsible()', () => {
    beforeEach(() => {
      roundpiecesBot._setup(null, list);
    });

    it('should correctly set the responsible', () => {
      roundpiecesBot._setResponsible(participants[1]);
      expect(roundpiecesBot._getResponsible().id).to.equal(participants[1].id);
    });

    it('should be able to change the responsible multiple times', () => {
      roundpiecesBot._setResponsible(participants[1]);
      roundpiecesBot._setResponsible(participants[2]);
      expect(roundpiecesBot._getResponsible().id).to.equal(participants[2].id);
    });
  });

  describe('_updateList()', () => {
    beforeEach(() => {
      roundpiecesBot._setup(null, list);
      sinon.stub(fs, 'writeFile');

      roundpiecesBot._setResponsible(participants[1]);
      roundpiecesBot._updateList();
    });

    afterEach(() => {
      fs.writeFile.restore();
    });

    it('should move the responsible to the end of the list', () => {
      expect(roundpiecesBot.participants[roundpiecesBot._getParticipantCount() - 1].id).to.equal(participants[1].id);
    });

    it('should preserve the rest of the list', () => {
      expect(roundpiecesBot.participants[0].id).to.equal(participants[0].id);
      expect(roundpiecesBot.participants[1].id).to.equal(participants[2].id);
      expect(roundpiecesBot.participants[2].id).to.equal(participants[3].id);
    });
  });

  describe('_getUserNameFromUserId', () => {
    beforeEach(() => {
      roundpiecesBot._setup(null, list);
    });

    it('should get the user from the user id', () => {
      expect(roundpiecesBot._getUserNameFromUserId('idc')).to.equal('c');
    });

    it('should return null for an unknown user id', () => {
      expect(roundpiecesBot._getUserNameFromUserId('unknown')).to.equal(null);
    });
  });

  describe('_getNextParticipant()', () => {
    beforeEach(() => {
      roundpiecesBot._setup(null, list);
    });

    it('should find the next participant', () => {
      expect(roundpiecesBot._getNextParticipant(participants[0])).to.deep.equal(participants[1]);
    });

    it('should return null for the last participant', () => {
      expect(roundpiecesBot._getNextParticipant(participants[3])).to.equal(null);
    });

    it('should return the first participant for an unknown user', () => {
      expect(roundpiecesBot._getNextParticipant(new Participant('unknown_id', 'unknown_name'))).to.deep.equal(participants[0]);
    });
  });
});
