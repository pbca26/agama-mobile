import { Promise } from 'meteor/promise';

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

function getServersList() {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      resolve(electrumServers);
    });
  }
}

function setDefaultServer(network, port, ip) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/server/version`, {
        params: {
          port,
          ip,
        },
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          electrumServers[network].port = port;
          electrumServers[network].ip = ip;

          resolve(true);
        }
      });
    });
  }
}

function clearKeys() {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      electrumKeys = {};
      resolve(true);
    });
  }
}

function sendtx(network, outputAddress, value, verify, push) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      const changeAddress = electrumKeys[network].pub;

      createtx(
        proxyServer,
        electrumServers[network === 'kmd' ? 'komodo' : network],
        outputAddress,
        changeAddress,
        value,
        10000,
        electrumKeys[network].wif,
        network,
        verify,
        push
      ).then((res) => {
        resolve(res);
      });
    });
  }
}

function transactions(network) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      listtransactions(
        proxyServer,
        electrumServers[network === 'kmd' ? 'komodo' : network],
        electrumKeys[network].pub,
        network === 'kmd' ? 'komodo' : network,
        true
      ).then((res) => {
        resolve(res);
      });
    });
  }
}

function balance(network) {
  return async function(dispatch) {
    const address = electrumKeys[network].pub;

    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance`, {
        params: {
          port: electrumServers[network === 'kmd' ? 'komodo' : network].port,
          ip: electrumServers[network === 'kmd' ? 'komodo' : network].ip,
          address: address,
        },
      }, (error, result) => {
        if (!result) {
          resolve('proxy-error');
        } else {
          if (network === 'komodo' ||
              network === 'kmd') {
            getKMDBalance(
              address,
              JSON.parse(result.content).result,
              proxyServer,
              electrumServers[network === 'kmd' ? 'komodo' : network]
            ).then((res) => {
              resolve(res);
            });
          } else {
            const _balance = JSON.parse(result.content).result;

            resolve({
              balance: Number((0.00000001 * _balance.confirmed).toFixed(8)),
              unconfirmed: Number((0.00000001 * _balance.unconfirmed).toFixed(8)),
            });
          }
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

      // console.warn(electrumKeys);
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
  clearKeys,
  balance,
  transactions,
  sendtx,
  getServersList,
  setDefaultServer,
}
