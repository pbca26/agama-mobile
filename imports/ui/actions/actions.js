import API from '../../api/api';
import { HTTP } from 'meteor/http';

function transactions(address) {
  return async function(dispatch) {
    const _transactions = await Meteor.callPromise('transactions', address);

    return _transactions;
  }
}

function balance(address) {
  return async function(dispatch) {
    const _balance = await Meteor.callPromise('balance', address);

    return _balance;
  }
}

function auth(seed) {
  return async function(dispatch) {
    const _auth = await Meteor.callPromise('auth', seed);

    return dispatch({
      type: 'AUTH',
      res: _auth,
    });
  }
}

function getKeys() {
  return async function(dispatch) {
    const _keys = await Meteor.callPromise('keys');

    return dispatch({
      type: 'KEYS',
      res: _keys,
    });
  }
}

function getWidgets() {
  return async function(dispatch) {
     const widgets = await Meteor.callPromise('auth', 'lime lime');
    //let widgets;

    return dispatch({
      type: 'GET_WIDGETS',
      payload: widgets
    });
  }
}

function createWidget(data) {
  return async function(dispatch) {
    const { name } = data;
    const widgetId = await Meteor.callPromise('widgets.insert', { name });

    return dispatch({
      type: 'CREATE_WIDGET',
      payload: {
        _id: widgetId,
        name
      }
    })
  }
}

export default {
  auth,
  getKeys,
  balance,
  transactions
}
