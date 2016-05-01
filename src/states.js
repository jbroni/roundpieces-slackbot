'use strict';
const createStore = require('redux').createStore;

const States = Object.freeze({
  IDLE: 'idle',
  SEARCH_INITIATED: 'search initiated',
  AWAITING_MEETING: 'awaiting meeting',
  NO_ATTENDANCE: 'no attendance',
  RESETTING: 'resetting',
  SKIPPED: 'skipped'
});

const Actions = Object.freeze({
  INITIALIZE: 'initialize',
  INITIATE_SEARCH: 'initiate search',
  FOUND_RESPONSIBLE: 'found responsible',
  END_SEARCH: 'end search',
  NO_ATTENDANCE: 'no attendance',
  RESET: 'reset',
  RESAT: 'resat',
  SKIP: 'skip'
});

const initialState = {
  type: States.IDLE,
  foundResponsible: false
};

function changeState(state, action) {
  if (typeof state === 'undefined') {
    return initialState;
  }

  switch (action.type) {
    case Actions.INITIATE_SEARCH:
      return initiateSearch(state);
    case Actions.FOUND_RESPONSIBLE:
      return responsibleFound(state);
    case Actions.END_SEARCH:
      return endSearch(state);
    case Actions.NO_ATTENDANCE:
      return noAttendance(state);
    case Actions.RESET:
      return reset(state);
    case Actions.RESAT:
      return resat(state);
    case Actions.SKIP:
      return skip(state);
    default:
      return state;
  }
}

function initiateSearch(state) {
  if (state.type === States.IDLE) {
    return Object.assign({}, state, {type: States.SEARCH_INITIATED});
  }
  return state;
}

function responsibleFound(state) {
  if (state.type === States.SEARCH_INITIATED) {
    return Object.assign({}, state, {foundResponsible: true});
  }
  return state;
}

function endSearch(state) {
  if (state.type === States.SEARCH_INITIATED) {
    return Object.assign({}, state, {type: States.AWAITING_MEETING});
  }
  return state;
}

function noAttendance(state) {
  if (state.type === States.SEARCH_INITIATED) {
    return Object.assign({}, state, {type: States.NO_ATTENDANCE});
  }
  return state;
}

function reset(state) {
  switch (state.type) {
    case States.SEARCH_INITIATED:
    case States.AWAITING_MEETING:
    case States.NO_ATTENDANCE:
    case States.SKIPPED:
      return Object.assign({}, state, {type: States.RESETTING});
    default:
      return state;
  }
}

function resat(state) {
  if (state.type === States.RESETTING) {
    return Object.assign({}, state, {type: States.IDLE, foundResponsible: false});
  }
  return state;
}

function skip(state) {
  if (state.type === States.IDLE) {
    return Object.assign({}, state, {type: States.SKIPPED});
  }
  return state;
}

const store = createStore(changeState);

module.exports = {
  store: store,
  Actions: Actions,
  States: States
};
