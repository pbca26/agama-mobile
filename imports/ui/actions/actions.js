import { Promise } from 'meteor/promise';
import bitcoin from 'bitcoinjs-lib';
import coinSelect from 'coinselect';

const electrumJSNetworks = require('./electrumNetworks.js');
const electrumJSTxDecoder = require('./electrumTxDecoder.js');

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

import { isAssetChain } from './utils';
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
      createtx(proxyServer, electrumServers[network], outputAddress, changeAddress, value, fee, '', push)
      .then((res) => {
        resolve(res);
      });
    });
  }
}

function transactions(address, network) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      listtransactions(proxyServer, electrumServers[network], address, network, true)
      .then((res) => {
        resolve(res);
      });
    });
  }
}

function balance(address, network) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance?port=${electrumServers[network].port}&ip=${electrumServers[network].ip}&address=${address}`, {
        params: {}
      }, (error, result) => {
        // network = 'komodo';
        if (network === 'komodo') {
          getKMDBalance(address, JSON.parse(result.content).result, proxyServer, electrumServers[network])
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
      let _pubKeys = {};

      for (let key in electrumServers) {
        const _seedToWif = seedToWif(seed, true, isAssetChain(key) || key === 'komodo' ? 'komodo' : key.toLowerCase());
        electrumKeys[electrumServers[key].abbr.toLowerCase()] = _seedToWif;
        _pubKeys[electrumServers[key].abbr.toLowerCase()] = _seedToWif.pub;
      }

      console.warn(electrumKeys);
      resolve(_pubKeys);
    });
  }
}

function getKeys() {
  return async function(dispatch) {
    // todo
  }
}

export default {
  auth,
  getKeys,
  balance,
  transactions,
  sendtx,
}
