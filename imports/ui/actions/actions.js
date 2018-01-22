const bs58check = require('bs58check');

import { Promise } from 'meteor/promise';

import {
  isAssetChain,
  getRandomIntInclusive,
  getLocalStorageVar,
} from './utils';
import {
  seedToWif,
  wifToWif,
} from './seedToWif';
import { proxyServers } from './proxyServers';
import { electrumServers } from './electrumServers';
import { getKMDBalance } from './getKMDBalance';
import { createtx } from './createtx';
import { listtransactions } from './listtransactions';
import { listunspent } from './listunspent';

let electrumKeys = {};
let proxyServer = {};
// pick a random proxy server
const _randomServer = proxyServers[getRandomIntInclusive(0, proxyServers.length - 1)];
proxyServer = {
  ip: _randomServer.ip,
  port: _randomServer.port,
};

const getServersList = () => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      resolve(electrumServers);
    });
  }
}

const setDefaultServer = (network, port, ip) => {
  return async (dispatch) => {
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

const clearKeys = () => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      electrumKeys = {};
      resolve(true);
    });
  }
}

const sendtx = (network, outputAddress, value, verify, push) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const changeAddress = electrumKeys[network].pub;
      const _electrumServer = getLocalStorageVar('coins')[network].server;

      createtx(
        proxyServer,
        _electrumServer,
        outputAddress,
        changeAddress,
        value,
        10000,
        electrumKeys[network].wif,
        network,
        verify,
        push
      )
      .then((res) => {
        resolve(res);
      });
    });
  }
}

const transactions = (network) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _electrumServer = getLocalStorageVar('coins')[network].server;

      listtransactions(
        proxyServer,
        _electrumServer,
        electrumKeys[network].pub,
        network === 'kmd' ? 'komodo' : network,
        true
      )
      .then((res) => {
        resolve(res);
      });
    });
  }
}

const balance = (network) => {
  return async (dispatch) => {
    const address = electrumKeys[network].pub;
    const _electrumServer = getLocalStorageVar('coins')[network].server;

    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance`, {
        params: {
          port: _electrumServer.port,
          ip: _electrumServer.ip,
          proto: _electrumServer.proto,
          address,
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
              _electrumServer
            )
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
        }
      });
    });
  }
}

const kmdUnspents = () => {
  return async (dispatch) => {
    const _electrumServer = getLocalStorageVar('coins').kmd.server;

    return new Promise((resolve, reject) => {
      listunspent(
        proxyServer,
        _electrumServer,
        electrumKeys.kmd.pub,
        'komodo',
        true,
        true,
      )
      .then((res) => {
        resolve(res);
      });
    });
  }
}

const auth = (seed, coins) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      let _pubKeys = {};

      for (let key in coins) {
        let isWif = false;
        let _seedToWif;

        try {
          bs58check.decode(seed);
          isWif = true;
        } catch (e) {}

        if (isWif) {
          _seedToWif = wifToWif(seed, isAssetChain(key) || key === 'komodo' ? 'komodo' : key.toLowerCase());
        } else {
          _seedToWif = seedToWif(seed, true, isAssetChain(key) || key === 'komodo' ? 'komodo' : key.toLowerCase());
        }

          electrumKeys[key] = _seedToWif;
        _pubKeys[key] = _seedToWif.pub;
      }

      // console.warn(electrumKeys);
      resolve(_pubKeys);
    });
  }
}

const addKeyPair = (coin) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _wif = electrumKeys[Object.keys(electrumKeys)[0]].wif;
      let _pubKeys = {};

      const _wifToWif = wifToWif(_wif, isAssetChain(coin) ? 'komodo' : coin);
      electrumKeys[coin] = _wifToWif;
      _pubKeys[coin] = _wifToWif.pub;

      // console.warn(electrumKeys[coin]);
      resolve(_pubKeys[coin]);
    });
  }
}

const getOverview = (coins) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      let _keys = [];

      for (let key in coins) {
        _keys.push({
          pub: electrumKeys[key].pub,
          coin: key,
        });
      }

      Promise.all(_keys.map((pair, index) => {
        return new Promise((resolve, reject) => {
          const _electrumServer = getLocalStorageVar('coins')[pair.coin].server;
      
          HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance`, {
            params: {
              port: _electrumServer.port,
              ip: _electrumServer.ip,
              proto: _electrumServer.proto,
              address: pair.pub,
            },
          }, (error, result) => {
            if (!result) {
              resolve('proxy-error');
            } else {
              const _balance = JSON.parse(result.content).result;

              resolve({
                coin: pair.coin,
                pub: pair.pub,
                balance: Number((0.00000001 * _balance.confirmed).toFixed(8)),
                unconfirmed: Number((0.00000001 * _balance.unconfirmed).toFixed(8)),
              });
            }
          });
        });
      }))
      .then(promiseResult => {
        const _pricesUrl = [
          'http://atomicexplorer.com/api/rates/kmd',
          'http://atomicexplorer.com/api/mm/prices'
        ];

        Promise.all(_pricesUrl.map((url, index) => {
          return new Promise((resolve, reject) => {
            HTTP.call('GET', url, {
            }, (error, result) => {
              if (!result) {
                resolve('prices-error');
              } else {
                const _prices = JSON.parse(result.content).result;    
                resolve(_prices);
              }
            });
          });
        }))
        .then(pricesResult => {
          let _kmdRates = {
            BTC: 0,
            USD: 0,
          };

          if (pricesResult[0].BTC &&
              pricesResult[0].USD) {
            _kmdRates.BTC = pricesResult[0].BTC;
            _kmdRates.USD = pricesResult[0].USD;
          }

          let _overviewItems = [];

          for (let i = 0; i < promiseResult.length; i++) {
            let _coinKMDPrice = 0;
            let _usdPricePerItem = 0;

            if (pricesResult[1][`${promiseResult[i].coin.toUpperCase()}/KMD`]) {
              _coinKMDPrice = pricesResult[1][`${promiseResult[i].coin.toUpperCase()}/KMD`].low;
            } else if (promiseResult[i].coin === 'kmd') {
              _coinKMDPrice = 1;
            }

            _overviewItems.push({
              coin: promiseResult[i].coin,
              balanceNative: promiseResult[i].balance,
              balanceKMD: promiseResult[i].balance * _coinKMDPrice,
              balanceUSD: promiseResult[i].balance * _coinKMDPrice * _kmdRates.USD,
              usdPricePerItem: _coinKMDPrice * _kmdRates.USD,
            });
          }

          resolve(_overviewItems);
        });
      });
    });
  }
}

export default {
  auth,
  getOverview,
  clearKeys,
  balance,
  transactions,
  sendtx,
  getServersList,
  setDefaultServer,
  addKeyPair,
  kmdUnspents,
}
