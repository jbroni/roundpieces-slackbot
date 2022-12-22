'use strict';

const AttendanceEnum = Object.freeze({
  UNKNOWN: 'unknown',
  ATTENDING: 'attending',
  NOT_ATTENDING: 'not attending'
});

class Participant {
  constructor(id, username, admin) {
    this.id = id;
    this.username = username;
    this.admin = admin;
    this.responsible = false;
    this.attending = AttendanceEnum.UNKNOWN;
  }

  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
  }

  get username() {
    return this._username;
  }

  set username(username) {
    this._username = username;
  }

  get admin() {
    return this._admin;
  }

  set admin(admin) {
    this._admin = admin;
  }

  get responsible() {
    return this._responsible;
  }

  set responsible(responsible) {
    this._responsible = responsible;
  }

  get attending() {
    return this._attending;
  }

  set attending(attending) {
    this._attending = attending;
  }

  get link() {
    if (this.isSlackUser()) {
      return `<@${this.id}|${this.username}>`;
    }
    else {
      return this.username;
    }
  }

  isSlackUser() {
    return !!this.id;
  }

}

module.exports = {
  Participant: Participant,
  AttendanceEnum: AttendanceEnum
};
