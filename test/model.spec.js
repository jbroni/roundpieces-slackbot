'use strict';

const expect = require('chai').expect;
const Model = require('../src/model');
const Participant = require('../src/participant').Participant;
const AttendanceEnum = require('../src/participant').AttendanceEnum;

describe('Model', () => {
  let model;
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
    model = new Model('a');
    model.users = users;
    participants = [
      new Participant(users[0].id, users[0].name, true),
      new Participant(users[1].id, users[1].name, false),
      new Participant(users[2].id, users[2].name, false),
      new Participant(users[3].id, users[3].name, false)];
  });

  it('should be initialized with admin', () => {
    expect(model.admin).to.equal('a');
  });

  describe('set participants', () => {
    it('should create a participant array with the correct number of users', () => {
      model.participants = list;
      expect(model.participants.length).to.equal(4);
    });

    it('should create a participant array with the correct users', () => {
      model.participants = list;
      expect(model.participants).to.deep.equal(participants);
    });
  });

  describe('setResponsible()', () => {
    beforeEach(() => {
      model.participants = list;
    });

    it('should correctly set the responsible', () => {
      model.setResponsible(participants[1]);
      expect(model.getResponsible().id).to.equal(participants[1].id);
    });

    it('should be able to change the responsible multiple times', () => {
      model.setResponsible(participants[1]);
      model.setResponsible(participants[2]);
      expect(model.getResponsible().id).to.equal(participants[2].id);
    });
  });

  describe('reset()', () => {
    beforeEach(() => {
      model.participants = list;
    });

    it('should set the responsible to the first in list', () => {
      model.setResponsible(participants[1]);
      model.reset();
      expect(model.getResponsible().id).to.equal(participants[0].id);
    });

    it('should reset the attendance status for each participant', () => {
      model.participants[0].attending = AttendanceEnum.ATTENDING;
      model.participants[2].attending = AttendanceEnum.NOT_ATTENDING;
      model.reset();
      model.participants.forEach((participant) => {
        expect(participant.attending).to.equal(AttendanceEnum.UNKNOWN);
      });
    });
  });

  describe('updateList()', () => {
    beforeEach(() => {
      model.participants = list;
      model.setResponsible(participants[1]);
      model.updateList();
    });

    it('should move the responsible to the end of the list', () => {
      expect(model.participants[model.getParticipantCount() - 1].id).to.equal(participants[1].id);
    });

    it('should preserve the rest of the list', () => {
      expect(model.participants[0].id).to.equal(participants[0].id);
      expect(model.participants[1].id).to.equal(participants[2].id);
      expect(model.participants[2].id).to.equal(participants[3].id);
    });
  });

  describe('getNextParticipant()', () => {
    beforeEach(() => {
      model.participants = list;
    });

    it('should find the next participant', () => {
      expect(model.getNextParticipant(participants[0])).to.deep.equal(participants[1]);
    });

    it('should skip participants that won\'t be attending', () => {
      model.participants[1].attending = AttendanceEnum.NOT_ATTENDING;
      expect(model.getNextParticipant(participants[0])).to.deep.equal(participants[2]);
    });

    it('should return null if it\'s the last participant', () => {
      expect(model.getNextParticipant(participants[3])).to.equal(null);
    });

    it('should return the first participant for an unknown user', () => {
      expect(model.getNextParticipant(new Participant('unknown_id', 'unknown_name', false))).to.deep.equal(participants[0]);
    });
  });

  describe('_getUserIdFromUserName()', () => {
    beforeEach(() => {
      model.participants = list;
    });

    it('should get the user id from the user name', () => {
      expect(model._getUserIdFromUserName('c')).to.equal('idc');
    });

    it('should return null for an unknown user name', () => {
      expect(model._getUserIdFromUserName('unknown')).to.equal(null);
    });
  });

});
