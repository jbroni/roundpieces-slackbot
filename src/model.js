'use strict';

const _ = require('lodash');
const Participant = require('./participant').Participant;
const AttendanceEnum = require('./participant').AttendanceEnum;

class Model {
  constructor(admin) {
    this._admin = admin;
  }

  get users() {
    return this._users;
  }

  set users(users) {
    this._users = users;
  }

  get admin() {
    return this._admin;
  }

  get participants() {
    return this._participants;
  }

  set participants(list) {
    this._participants = list
        .split('\n')
        .filter((userName) => this._userExists(userName))
        .map((userName) => {
          const userId = this._getUserIdFromUserName(userName);
          return new Participant(userId, userName, userName === this.admin);
        });
  }

  getParticipantCount() {
    return this.participants.length;
  }

  getParticipantUserNames() {
    return this.participants.map((participant) => participant.username);
  }

  getParticipantUserNamesByAttendance(attendance) {
    return this.participants
        .filter((participant) => participant.attending === attendance)
        .map((participant) => participant.username);
  }

  getParticipantFromId(userId) {
    return _.find(this.participants, (participant) => participant.id === userId);
  }

  getParticipantFromUserName(userName) {
    return _.find(this.participants, (participant) => participant.username === userName);
  }

  getNextParticipant(currentParticipant) {
    const currentIndex = _.findIndex(this.participants, currentParticipant);
    if (currentIndex >= this.getParticipantCount() - 1) {
      return null;
    }
    const participant = this.participants[currentIndex + 1];
    if (participant.attending === AttendanceEnum.NOT_ATTENDING) {
      return this.getNextParticipant(participant);
    }
    return participant;
  }

  getResponsible() {
    return _.find(this.participants, (participant) => participant.responsible);
  }

  setResponsible(responsible) {
    _.forEach(this.participants, (participant) => {
      participant.responsible = false;
    });
    _.find(this.participants, responsible).responsible = true;
  }

  reset() {
    this.participants.forEach((participant) => participant.attending = AttendanceEnum.UNKNOWN);
    this.setResponsible(this.participants[0]);
  }

  updateList() {
    //Move responsible to end of list
    const responsible = this.getResponsible();
    _.pull(this.participants, responsible);
    this.participants.push(responsible);
  }

  _getUserIdFromUserName(userName) {
    const user = _.find(this.users, (user) => user.name === userName);
    return user ? user.id : null;
  }

  _userExists(userName) {
    return Boolean(this._getUserIdFromUserName(userName));
  }
}

module.exports = Model;
