'use strict';
const createStore = require('redux').createStore;

const States = Object.freeze({
  IDLE: 'idle',
  SEARCH_INITIATED: 'search initiated',
  AWAITING_MEETING: 'awaiting meeting',
  RESETTING: 'resetting',
  SKIPPED: 'skipped'
});

const Actions = Object.freeze({
  INITIATE_SEARCH: 'initiate search',
  FOUND_RESPONSIBLE: 'found responsible',
  END_SEARCH: 'end search',
  RESET: 'reset',
  RESAT: 'resat',
  SKIP: 'skip'
});

const initialState = {
  type: States.IDLE,
  responsible: null
};

function changeState(state, action) {
  if (typeof state === 'undefined') {
    return initialState;
  }

  switch (action.type) {
    case Actions.INITIATE_SEARCH:
      return initiateSearch(state);
    case Actions.FOUND_RESPONSIBLE:
      return responsibleFound(state, action.responsible);
    case Actions.END_SEARCH:
      return endSearch(state);
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

function responsibleFound(state, responsible) {
  if (state.type === States.SEARCH_INITIATED) {
    return Object.assign({}, state, {responsible: responsible});
  }
  return state;
}

function endSearch(state) {
  if (state.type === States.SEARCH_INITIATED) {
    return Object.assign({}, state, {type: States.AWAITING_MEETING});
  }
  return state;
}

function reset(state) {
  switch (state.type) {
    case States.SEARCH_INITIATED:
    case States.AWAITING_MEETING:
      return Object.assign({}, state, {type: States.RESETTING});
    case States.SKIPPED:
      return Object.assign({}, state, {type: States.IDLE});
    default:
      return state;
  }
}

function resat(state) {
  if (state.type === States.RESETTING) {
    return Object.assign({}, state, {type: States.IDLE, responsible: null});
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
  Actions: Actions
};
