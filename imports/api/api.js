const API = new Mongo.Collection('keys');

import { Promise } from 'meteor/promise';

import sha256 from 'sha256';
import CoinKey from 'coinkey';

const electrumJSNetworks = require('./electrumNetworks.js');
const electrumJSTxDecoder = require('./electrumTxDecoder.js');

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

  const key = new CoinKey(new Buffer(hex, 'hex'), {
    private: electrumJSNetworks.komodo.wif, // shepherd.getNetworkData(network).wif,
    public: electrumJSNetworks.pubKeyHash, // shepherd.getNetworkData(network).pubKeyHash,
  });

  key.compressed = true;

  // shepherd.log(`seedtowif priv key ${key.privateWif}`, true);
  // shepherd.log(`seedtowif pub key ${key.publicAddress}`, true);

  return {
    priv: key.privateWif,
    pub: key.publicAddress,
  };
}

Meteor.methods({
  'auth'(seed) {
    const _seedToWif = seedToWif(seed, true);
    console.log(_seedToWif);

    electrumKeys = _seedToWif;

    return _seedToWif.pub;
  },
  'keys'() {
    return electrumKeys;
  },
  'balance'(address) {
    address = electrumKeys.pub || address;

    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance?port=${electrumServer.komodo.port}&ip=${electrumServer.komodo.ip}&address=${address}`, {
        params: {}
      }, (error, result) => {
        resolve(JSON.parse(result.content));
      });
    });
  },
  'transactions'(address) {
    address = electrumKeys.pub || address;

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
  },
  // 'widgets.fetch'() { return Widgets.find().fetch(); },
  // 'widgets.insert'(data) { return Widgets.insert(data); }
})

export default API;
