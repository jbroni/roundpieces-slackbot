'use strict';

const AttendanceEnum = require('./participant').AttendanceEnum;

class MessageService {
  constructor(messageFunction, model) {
    this._sendMessage = messageFunction;
    this._model = model;
  }

  get sendMessage() {
    return this._sendMessage;
  }

  get model() {
    return this._model;
  }

  accepted(userName) {
    this.sendMessage(userName, 'Thank you! I will notify you at 12.00 with a list of who will be attending the next roundpieces meeting.');
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

  help(userName) {
    this.sendMessage(userName, `Here is a list of commands:
  • \`help\`, \`?\`: Prints this help
  • \`status\`: Prints how long I've been alive
  • \`next\`: Prints who is going to bring roundpieces next time
  • \`list\`: Prints ordered list of people participating in the roundpieces arrangement`);
  }

  list(userName) {
    this.sendMessage(userName, this.model.getParticipantUserNames().join(', '));
  }

  next(userName) {
    this.sendMessage(userName, `The next person to bring roundpieces is *${this.model.getResponsible().username}*`);
  }

  nobodyAttending() {
    this._messageAdmin('Nobody is able to bring roundpieces for the next meeting.');
  }

  noResponsibleResponse() {
    this._messageAdmin(`${this.model.getResponsible().username} did not respond. Please make sure that someone is able to bring roundpieces tomorrow.
Current list: ${this.model.getParticipantUserNames().join(', ')}`);
  }

  notAdmin(userName) {
    this.sendMessage(userName, 'You are not an administrator.');
  }

  notAttending(userName) {
    this.sendMessage(userName, 'Thank you for your response. I have noted that you will *not be attending* tomorrow.');
  }

  notifyResponsible() {
    this._messageResponsible(`It is your turn to bring roundpieces next time!
Please respond before 12.00 today with either \`accept\` to indicate that you will bring them, or \`reject\` if you're unable.
There's currently ${this.model.getParticipantCount()} participants:
  ${this.model.getParticipantUserNames().join(', ')}`);
  }

  notParticipant(participant) {
    this._messageAdmin(`${participant} is not a participant.`);
  }

  notResponsible(userName) {
    this.sendMessage(userName, 'You are not the responsible for bringing roundpieces next time.');
  }

  participationList() {
    const attending = this.model.getParticipantUserNamesByAttendance(AttendanceEnum.ATTENDING);
    const notAttending = this.model.getParticipantUserNamesByAttendance(AttendanceEnum.NOT_ATTENDING);
    const unknown = this.model.getParticipantUserNamesByAttendance(AttendanceEnum.UNKNOWN);

    let bringCake = '';
    if (attending.length + unknown.length < this.model.getParticipantCount() / 2) {
      bringCake = 'Less than half of the participant will be attending tomorrow. That means you will also have to *bring cake*.';
    }

    this.sendMessage(this.model.getResponsible().username,
        `You will have to bring roundpieces for *${attending.length + unknown.length}* people tomorrow. ${bringCake}

Attending: ${attending.join(', ')}
Not attending: ${notAttending.join(', ')}
Unknown attendance: ${unknown.join(', ')}`
    );
  }

  queryForAttendance() {
    this.model.participants
        .filter((participant) => !participant.responsible)
        .forEach((participant) => this.sendMessage(participant.username,
            `To help the responsible buying the correct number of roundpieces, please respond to this message before 12.00 today.
Please respond \`yes\` if you're attending the roundpieces meeting tomorrow.
If you won't attend, please respond \`no\`.`));
  }

  rejected(userName) {
    this.sendMessage(userName, 'Alright, I\'ll ask the next one on the list to bring them instead.');
  }

  responsibleChanged(responsible) {
    this._messageAdmin(`${responsible} has been set as responsible and list has been updated.`);
  }

  status(userName, uptime) {
    this.sendMessage(userName, `I have been alive for *${uptime} ms!*`);
  }

  unknownCommand(userName) {
    this.sendMessage(userName, 'I don\'t understand what you\'re asking :disappointed: Type `help` for a full list of commands that I understand.');
  }

  _messageAdmin(message) {
    this.sendMessage(this.model.admin, message);
  }

  _messageResponsible(message) {
    this.sendMessage(this.model.getResponsible().username, message);
  }
}

module.exports = MessageService;
