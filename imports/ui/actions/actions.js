const bs58check = require('bs58check');

import { Promise } from 'meteor/promise';

import { isKomodoCoin } from 'agama-wallet-lib/build/coin-helpers';
import {
  getLocalStorageVar,
  sortObject,
} from './utils';
import {
  wifToWif,
  seedToWif,
} from 'agama-wallet-lib/build/keys';
import proxyServers from './proxyServers';
import electrumServers from 'agama-wallet-lib/build/electrum-servers';
import getKMDBalance from './getKMDBalance';
import createtx from './createtx';
import listtransactions from './listtransactions';
import listunspent from './listunspent';
import {
  fromSats,
  toSats,
  getRandomIntInclusive,
} from 'agama-wallet-lib/build/utils';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import { devlog } from './dev';
import translate from '../translate/translate';

let _cache = {};

// runtime cache wrapper functions
const getDecodedTransaction = (txid, coin, data) => {
  if (!_cache[coin].txDecoded) {
    _cache[coin].txDecoded = {};
  }

  if (_cache[coin].txDecoded[txid]) {
    devlog(`raw input tx decoded ${txid}`);
    return _cache[coin].txDecoded[txid];
  } else {
    if (data) {
      _cache[coin].txDecoded[txid] = data;
    } else {
      return false;
    }
  }
}

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
  getDecodedTransaction,
};

let electrumKeys = {};
let proxyServer = {};
// pick a random proxy server

const _getAnotherProxy = () => {
  if (proxyServer &&
      proxyServer.ip &&
      proxyServer.port) {
    for (let i = 0; i < proxyServers.length; i++) {
      devlog('_getanotherproxy proxies', proxyServers[i]);
      devlog('_getanotherproxy active proxy', proxyServer);
      
      if (proxyServer.ip !== proxyServers[i].ip ||
          proxyServer.port !== proxyServers[i].port) {
        devlog('new proxy', proxyServers[i]);
        proxyServer = {
          ip: proxyServers[i].ip,
          port: proxyServers[i].port,
        };
        break;
      }
    }
  } else {
    const _randomServer = proxyServers[getRandomIntInclusive(0, proxyServers.length - 1)];
    proxyServer = {
      ip: _randomServer.ip,
      port: _randomServer.port,
    };
  }

  devlog(`proxy ${proxyServer.ip}:${proxyServer.port}`);
};

const getAnotherProxy = () => {
  return async (dispatch) => {
    _getAnotherProxy();
  };
}

_getAnotherProxy();

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

const sendtx = (network, outputAddress, value, verify, push, btcFee) => {
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
        btcFee ? { perbyte: true, value: btcFee } : (isKomodoCoin(network) ? electrumServers.kmd.txfee : electrumServers[network].txfee),
        electrumKeys[network].priv,
        network,
        verify,
        push,
        cache
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
          const _balance = JSON.parse(result.content).result;
          
          if (network === 'kmd') {
            if (!_balance.hasOwnProperty('confirmed')) {
              resolve('error');
            } else {
              getKMDBalance(
                address,
                JSON.parse(result.content).result,
                proxyServer,
                _electrumServer,
                cache
              )
              .then((res) => {
                resolve(res);
              });
            }
          } else {
            if (!_balance.hasOwnProperty('confirmed')) {
              resolve('error');
            } else {
              resolve({
                balance: Number(fromSats(_balance.confirmed).toFixed(8)),
                unconfirmed: Number(fromSats(_balance.unconfirmed).toFixed(8)),
              });
            }
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
      // sort coins
      const _coinObjKeys = Object.keys(coins);
      let _coins = {};
      
      for (let i = 0; i < _coinObjKeys.length; i++) {
        _coins[translate('COINS.' + _coinObjKeys[i].toUpperCase())] = _coinObjKeys[i];
      }

      _coins = sortObject(_coins);

      let _keys = [];

      for (let key in _coins) {
        _keys.push({
          pub: electrumKeys[_coins[key]].pub,
          coin: _coins[key],
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
          if (pricesResult[0] === 'prices-error') {
            resolve('error');
          } else {
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
          }
        });
      });
    });
  }
}

const getBtcFees = () => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {    
      HTTP.call('GET', `https://www.atomicexplorer.com/api/btc/fees`, {
        params: {},
      }, (error, result) => {
        if (!result) {
          resolve('error');
        } else {
          const _btcFees = JSON.parse(result.content).result;

          devlog('btc fees');
          devlog(_btcFees);

          if (_btcFees.recommended &&
              _btcFees.recommended.fastestFee,
              _btcFees.recommended.halfHourFee,
              _btcFees.recommended.hourFee) {
            resolve(_btcFees.recommended);
          } else {
            resolve('error');
          }
        }
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
  getBtcFees,
  getAnotherProxy,
}