const bs58check = require('bs58check');

import { Promise } from 'meteor/promise';

import {
  isKomodoCoin,
} from 'agama-wallet-lib/src/coin-helpers';
import {
  getLocalStorageVar,
} from './utils';
import {
  wifToWif,
  seedToWif,
} from 'agama-wallet-lib/src/keys';
import { proxyServers } from './proxyServers';
import electrumServers from './electrumServers';
import { getKMDBalance } from './getKMDBalance';
import { createtx } from './createtx';
import { listtransactions } from './listtransactions';
import { listunspent } from './listunspent';
import {
  fromSats,
  toSats,
  getRandomIntInclusive,
} from 'agama-wallet-lib/src/utils';
import electrumJSNetworks from 'agama-wallet-lib/src/bitcoinjs-networks';
import { devlog } from './dev';

let _cache = {};

// runtime cache wrapper functions
const getTransaction = (txid, coin, httpParams) => {
  return new Promise((resolve, reject) => {
    if (!_cache[coin]) {
      _cache[coin] = {};
    }
    if (!_cache[coin].tx) {
      _cache[coin].tx = {};
    }

    if (!_cache[coin].tx[txid]) {
      devlog(`raw input tx ${txid}`);

      HTTP.call('GET', httpParams.url, {
        params: httpParams.params,
      }, (error, result) => {
        const _result = JSON.parse(result.content);
        
        if (_result.msg !== 'error') {
          _cache[coin].tx[txid] = result;          
        }

        resolve(result);
      });
    } else {
      devlog(`cached raw input tx ${txid}`);
      resolve(_cache[coin].tx[txid]);
    }
  });
}

const getBlockheader = (height, coin, httpParams) => {
  return new Promise((resolve, reject) => {
    if (!_cache[coin]) {
      _cache[coin] = {};
    }
    if (!_cache[coin].blockheader) {
      _cache[coin].blockheader = {};
    }

    if (!_cache[coin].blockheader[height]) {
      devlog(`blockheader ${height}`);

      HTTP.call('GET', httpParams.url, {
        params: httpParams.params,
      }, (error, result) => {
        const _result = JSON.parse(result.content);
        
        if (_result.msg !== 'error') {
          _cache[coin].blockheader[height] = result;          
        }

        resolve(result);
      });
    } else {
      devlog(`cached blockheader ${height}`);
      resolve(_cache[coin].blockheader[height]);
    }
  });
}

const cache = {
  getTransaction,
  getBlockheader,
};

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

const setDefaultServer = (network, port, ip, proto) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/server/version`, {
        params: {
          port,
          ip,
          proto,
        },
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          electrumServers[network].port = port;
          electrumServers[network].ip = ip;
          electrumServers[network].proto = proto;

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
      let _electrumServer = getLocalStorageVar('coins')[network].server;
      _electrumServer.serverList = electrumServers[network].serverList;

      devlog(`sendtx ${network}`);

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
      let _electrumServer = getLocalStorageVar('coins')[network].server;
      _electrumServer.serverList = electrumServers[network].serverList;

      listtransactions(
        proxyServer,
        _electrumServer,
        electrumKeys[network].pub,
        network,
        true,
        cache
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
    let _electrumServer = getLocalStorageVar('coins')[network].server;
    _electrumServer.serverList = electrumServers[network].serverList;

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
          if (network === 'kmd') {
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
              balance: Number(fromSats(_balance.confirmed).toFixed(8)),
              unconfirmed: Number(fromSats(_balance.unconfirmed).toFixed(8)),
            });
          }
        }
      });
    });
  }
}

const kmdUnspents = () => {
  return async (dispatch) => {
    let _electrumServer = getLocalStorageVar('coins').kmd.server;
    _electrumServer.serverList = electrumServers.kmd.serverList;

    return new Promise((resolve, reject) => {
      listunspent(
        proxyServer,
        _electrumServer,
        electrumKeys.kmd.pub,
        'kmd',
        true,
        true,
        cache
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
          _seedToWif = wifToWif(seed, isKomodoCoin(key) ? electrumJSNetworks.kmd : electrumJSNetworks[key.toLowerCase()]);
        } else {
          _seedToWif = seedToWif(seed, isKomodoCoin(key) ? electrumJSNetworks.kmd : electrumJSNetworks[key.toLowerCase()], true);
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
      const _wif = electrumKeys[Object.keys(electrumKeys)[0]].priv;
      let _pubKeys = {};

      const _wifToWif = wifToWif(_wif, isKomodoCoin(coin) ? electrumJSNetworks.kmd : electrumJSNetworks[coin]);
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
                balance: Number(fromSats(_balance.confirmed).toFixed(8)),
                unconfirmed: Number(fromSats(_balance.unconfirmed).toFixed(8)),
              });
            }
          });
        });
      }))
      .then(promiseResult => {
        const _pricesUrl = [
          'https://www.atomicexplorer.com/api/rates/kmd',
          'https://www.atomicexplorer.com/api/mm/prices'
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

            if (!promiseResult[i].balance) {
              promiseResult[i].balance = 0;
            }

            _overviewItems.push({
              coin: promiseResult[i].coin,
              balanceNative: promiseResult[i].balance,
              balanceKMD: promiseResult[i].balance * _coinKMDPrice,
              balanceBTC: promiseResult[i].balance * _kmdRates.BTC,
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