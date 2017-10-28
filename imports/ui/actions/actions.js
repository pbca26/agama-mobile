import { Promise } from 'meteor/promise';
import bitcoin from 'bitcoinjs-lib';
import coinSelect from 'coinselect';

const electrumJSNetworks = require('./electrumNetworks.js');
const electrumJSTxDecoder = require('./electrumTxDecoder.js');

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

import { seedToWif } from './seedToWif';
import {
  encryptKey,
  decryptKey,
} from './seedToWif';
import { proxyServer } from './proxyServers';
import { electrumServers } from './electrumServers';
import { getKMDBalance } from './getKMDBalance';
import { createtx } from './createtx';
import { listtransactions } from './listtransactions';

let electrumKeys = {};

function sendtx(outputAddress, changeAddress, value, fee, push) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      createtx(proxyServer, electrumServers.komodo, outputAddress, changeAddress, value, fee, '', push)
      .then((res) => {
        resolve(res);
      });
    });
  }
}

function transactions(address) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      listtransactions(proxyServer, electrumServers.komodo, address, 'komodo', true)
      .then((res) => {
        resolve(res);
      });
    });
  }
}

function balance(address, network) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}`, {
        params: {}
      }, (error, result) => {
        network = 'komodo';
        if (network === 'komodo') {
          getKMDBalance(address, JSON.parse(result.content).result, proxyServer, electrumServers.komodo)
          .then((res) => {
            resolve(res);
          });
        } else {
          const _balance = JSON.parse(result.content).result;

          resolve({
            balance: Number((0.00000001 * _balance.confirmed).toFixed(8)),
            unconfirmed: Number((0.00000001 * _balance.unconfirmed).toFixed(8)),
          });
        }
      });
    });
  }
}

function auth(seed) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      const _seedToWif = seedToWif(seed, true, 'komodo');

      electrumKeys = _seedToWif;

      resolve({ res: _seedToWif.pub });
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

export default {
  auth,
  getKeys,
  balance,
  transactions,
  sendtx,
}
