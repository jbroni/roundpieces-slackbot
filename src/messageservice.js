'use strict';

const AttendanceEnum = require('./participant').AttendanceEnum;
const States = require('./states').States;

class MessageService {
  constructor(messageFunction, model, store) {
    this._sendMessage = messageFunction;
    this._model = model;
    this._store = store;
  }

  get sendMessage() {
    return this._sendMessage;
  }

  get model() {
    return this._model;
  }

  get store() {
    return this._store;
  }

  accepted() {
    this._messageResponsible('Thank you! I will notify you at 12.00 with a list of who will be attending the next roundpieces meeting.');
  }

  adminHelp() {
    this._messageAdmin(`Invoke admin commands by typing \`admin\` followed by one of the following commands:
    • \`help\`: Prints this help
    • \`setResponsible username\`: Sets user with \`username\` as the new responsible
    • \`skip\`: Skips next meeting
    • \`start\`: Invokes new search immediately. Useful for virtual Fridays.
    • \`state\`: Get current state of the system.
    `);
  }

  alreadyAccepted() {
    this._messageResponsible(`You have already accepted. If you wish to change this, please contact ${this.model.adminUser.link}.`);
  }

  attending(userName) {
    this.sendMessage(userName, 'Thank you for your response. I have noted that you\'ll *be attending* tomorrow.');
  }

  botActivated(botName) {
    this._messageAdmin(`${botName} fully activated! Type \`help\` for a full list of commands.`);
  }

  error(error) {
    this._messageAdmin(`I'm afraid I've encountered an error: ${error}`);
  }

  help(participant) {
    let adminHelp = '';
    if (participant.admin) {
      adminHelp = `
  • \`admin help\`: Prints available admin commands`;
    }

    this.sendMessage(participant.username, `Here is a list of commands:
  • \`help\`, \`?\`: Prints this help${adminHelp}
  • \`uptime\`: Prints how long I've been alive
  • \`status\`: Prints current participation status
  • \`next\`: Prints who is going to bring roundpieces next time
  • \`list\`: Prints ordered list of people participating in the roundpieces arrangement
  • \`yes\`: Indicate that you will be attending the next meeting
  • \`no\`: Indicate that you will not be attending the next meeting
  • \`accept\`: Indicate that you will be bringing roundpieces for the next meeting
  • \`reject\`: Indicate that you are unable to bring roundpieces for the next meeting
  `);
  }

  isResponsible() {
    this._messageResponsible('You are responsible for bringing the roundpieces for the next meeting. Please use `accept` or `reject` to indicate your attendance status instead.');
  }

  list(userName) {
    this.sendMessage(userName, this.model.getParticipantLinks().join(', '));
  }

  next(userName) {
    this.sendMessage(userName, `The next person to bring roundpieces is *${this.model.getResponsible().link}*`);
  }

  nobodyAttending() {
    this._messageAdmin('Nobody is able to bring roundpieces for the next meeting.');
  }

  noLongerResponsible() {
    this._messageResponsible('You are no longer responsible for bringing roundpieces tomorrow.');
  }

  noResponsibleResponse() {
    this._messageAdmin(`${this.model.getResponsible().link} did not respond. Please make sure that someone is able to bring roundpieces tomorrow.
Current list: ${this.model.getParticipantLinks().join(', ')}`);
  }

  notAdmin(userName) {
    this.sendMessage(userName, 'You are not an administrator.');
  }

  notAttending(userName) {
    this.sendMessage(userName, 'Thank you for your response. I have noted that you will *not be attending* tomorrow.');
  }

  notifyNewResponsible(oldResponsible) {
    this._notifyResponsible(`${oldResponsible.link} was not able to bring roundpieces next time. You're are the next one on the list so it will be your responsibility instead.`);
  }

  notifyResponsible() {
    this._notifyResponsible('It is your turn to bring roundpieces next time!');
  }

  notParticipant(participant) {
    this._messageAdmin(`${participant} is not a participant.`);
  }

  notResponsible(userName) {
    this.sendMessage(userName, 'You are not the responsible for bringing roundpieces next time.');
  }

  participationList() {
    const attending = this.model.getParticipantLinksByAttendance(AttendanceEnum.ATTENDING);
    const unknown = this.model.getParticipantLinksByAttendance(AttendanceEnum.UNKNOWN);

    let bringCake = '';
    if (attending.length + unknown.length < this.model.getParticipantCount() / 2) {
      bringCake = 'Less than half of the participant will be attending tomorrow. That means you will also have to *bring cake*.';
    }

    this.sendMessage(this.model.getResponsible().username,
        `You will have to bring roundpieces for *${attending.length + unknown.length}* people tomorrow. ${bringCake}

${this._generateParticipationList()}`
    );
  }

  queryForAttendance() {
    this.model.participants
        .filter((participant) => !participant.responsible && participant.isSlackUser() && participant.attending === AttendanceEnum.UNKNOWN)
        .forEach((participant) => this.sendMessage(participant.username,
            `To help ${this.model.getResponsible().link} buy the correct number of roundpieces, please respond to this message before 12.00 today.
Please respond \`yes\` if you're attending the roundpieces meeting tomorrow.
If you won't attend, please respond \`no\`.`));
  }

  rejected(userName) {
    this.sendMessage(userName, 'Alright, I\'ll ask the next one on the list to bring them instead.');
  }

  responsibleChanged(responsible) {
    const responsibleLink = this.model.getParticipantFromUserName(responsible).link;
    this._messageAdmin(`${responsibleLink} has been set as responsible and list has been updated.`);
  }

  skipping() {
    this._messageAdmin('Next meeting will be skipped.');
  }

  state() {
    const state = this.store.getState();
    this._messageAdmin(`Current state is "${state.type}". Found reponsible: \`${state.foundResponsible}\`.`);
  }

  status(userName) {
    const state = this.store.getState();
    if (state.type === States.SEARCH_INITIATED || state.type === States.AWAITING_MEETING) {
      this.sendMessage(userName, `Responsible: ${this.model.getResponsible().link} (${state.foundResponsible ? 'confirmed' : 'not confirmed'})

${this._generateParticipationList()}`);
    }
    else {
      this.sendMessage(userName, 'Participation count has not yet begun.');
    }
  }

  unknownCommand(userName) {
    this.sendMessage(userName, 'I don\'t understand what you\'re asking :disappointed: Type `help` for a full list of commands that I understand.');
  }

  uptime(userName, uptime) {
    this.sendMessage(userName, `I have been alive for *${uptime} ms!*`);
  }

  wrongTime(userName) {
    this.sendMessage(userName, `You cannot do that now. Contact ${this.model.adminUser.link} if you think you should be able to.`);
  }

  _messageAdmin(message) {
    this.sendMessage(this.model.admin, `*ADMIN MESSAGE:* ${message}`);
  }

  _messageResponsible(message) {
    this.sendMessage(this.model.getResponsible().username, message);
  }

  _generateParticipationList() {
    const attending = this.model.getParticipantLinksByAttendance(AttendanceEnum.ATTENDING);
    const notAttending = this.model.getParticipantLinksByAttendance(AttendanceEnum.NOT_ATTENDING);
    const unknown = this.model.getParticipantLinksByAttendance(AttendanceEnum.UNKNOWN);

    return `Attending: ${attending.join(', ')}
Not attending: ${notAttending.join(', ')}
Unknown attendance: ${unknown.join(', ')}`;
  }

  _notifyResponsible(message) {
    if (this.model.getResponsible().isSlackUser()) {
      this._messageResponsible(`${message}
Please respond before 12.00 today with either \`accept\` to indicate that you will bring them, or \`reject\` if you're unable.
There's currently ${this.model.getParticipantCount()} participants:
  ${this.model.getParticipantLinks().join(', ')}`);
    }
    else {
      this._messageAdmin(`It is non-slack user *${this.model.getResponsible().link}*'s turn to bring roundpieces next time. Please notify the participant manually.`);
    }
  }
}

module.exports = MessageService;
