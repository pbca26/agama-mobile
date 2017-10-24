// import API from '../../api/api';

import { Promise } from 'meteor/promise';

import sha256 from 'sha256';
import CoinKey from 'coinkey';

const electrumJSNetworks = require('../../api/electrumNetworks.js');
const electrumJSTxDecoder = require('../../api/electrumTxDecoder.js');

function seedToWif(seed, iguana) {
  const bytes = sha256(seed, { asBytes: true });

  if (iguana) {
    bytes[0] &= 248;
    bytes[31] &= 127;
    bytes[31] |= 64;
  }

  const toHexString = (byteArray) => {
    return Array.from(byteArray, (byte) => {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
  }

  const hex = toHexString(bytes);

  const _wif = electrumJSNetworks.komodo.wif;
  const _pkh = electrumJSNetworks.komodo.pubKeyHash;

  const key = new CoinKey(new Buffer(hex, 'hex'), {
    private: _wif,
    public: _pkh,
  });

  key.compressed = true;

  // shepherd.log(`seedtowif priv key ${key.privateWif}`, true);
  // shepherd.log(`seedtowif pub key ${key.publicAddress}`, true);

  return {
    priv: key.privateWif,
    pub: key.publicAddress,
  };
}

let electrumKeys = {};
let proxyServer = {
  ip: '46.20.235.46',
  port: 9999,
};
let electrumServer = {
  komodo: { // !estimatefee
    ip: '173.212.225.176',
    port: 50011,
    proto: 'tcp',
    txfee: 10000,
    abbr: 'KMD',
    serverList: [
      '173.212.225.176:50011',
      '136.243.45.140:50011'
    ],
  },
};

function transactions(address) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listtransactions?port=${electrumServer.komodo.port}&ip=${electrumServer.komodo.ip}&address=${address}&raw=true`, {
        params: {}
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg !== 'error') {
          let _transactions = [];

          for (let i = 0; i < result.result.length; i++) {
            const decodedTx = electrumJSTxDecoder(result.result[i].raw, electrumJSNetworks.komodo);

            _transactions.push({
              format: decodedTx.format,
              inputs: decodedTx.inputs,
              outputs: decodedTx.outputs,
            });
            // console.log(decodedTx);
          }
          resolve(_transactions);
        } else {
          resolve('error');
        }

        console.warn(result);
      });
    });
  }
}

function balance(address) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance?port=${electrumServer.komodo.port}&ip=${electrumServer.komodo.ip}&address=${address}`, {
        params: {}
      }, (error, result) => {
        resolve(JSON.parse(result.content));
      });
    });
  }
}

function auth(seed) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      const _seedToWif = seedToWif(seed, true);

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
  transactions
}
