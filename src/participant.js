'use strict';

class Participant {
  constructor(id, username) {
    this.id = id;
    this.username = username;
    this.responsible = false;
    this.attending = 'unknown';
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

}

module.exports = Participant;
