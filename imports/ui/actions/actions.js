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
  seedToPriv,
  etherKeys,
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
import ethers from 'ethers';
import ethBalance from './eth/balance';
import ethTransactions from './eth/transactions';
import ethGasPrice from './eth/gasPrice';
import {
  ethCreateTx,
  ethCreateTxERC20,
} from './eth/createtx';

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

let keys = {
  spv: {},
  eth: {},
};
let connect = {
  eth: null,
  eth_ropsten: null,
};
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
      keys = {
        spv: {},
        eth: {},
      };
      connect = {
        eth: null,
        eth_ropsten: null,
      };
      resolve(true);
    });
  }
}

const sendtx = (network, outputAddress, value, verify, push, btcFee) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const changeAddress = keys.spv[network].pub;
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
        keys.spv[network].priv,
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

const sendtxEth = (network, push, speed, dest, amount, gasPrice) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _name = network.split('|')[0];

      if (_name === 'eth' ||
          _name === 'eth_ropsten') {
        // wallet, coin, push, speed, dest, amount, gasPrice, network
        ethCreateTx(
          connect[_name],
          _name,
          false,
          speed,
          dest,
          amount,
          gasPrice,
          _name === 'eth_ropsten' ? 'ropsten' : 'homestead'
        )
        .then((res) => {
          resolve(res);
        })
      } else {
        // wallet, symbol, push, speed, dest, amount, gasPrice
        ethCreateTxERC20(
          connect.eth,
          _name,
          false,
          speed,
          dest,
          amount,
          gasPrice
        )
        .then((res) => {
          resolve(res);
        })
      }
    });
  }
}

const transactions = (network) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _name = network.split('|')[0];
      
      if (network.indexOf('|spv') > -1) {
        const address = keys.spv[_name].pub;
        let _electrumServer = getLocalStorageVar('coins')[network].server;
        _electrumServer.serverList = electrumServers[_name].serverList;

        listtransactions(
          proxyServer,
          _electrumServer,
          address,
          _name,
          true,
          cache
        )
        .then((res) => {
          resolve(res);
        });
      } else if (network.indexOf('|eth') > -1) {
        const address = keys.eth[_name].pub;
        let options;

        if (network.indexOf('eth_ropsten') > -1) {
          options = {
            network: 'ropsten',
          };
        } else if (_name.indexOf('eth') === -1) {
          options = {
            symbol: _name,
          };
        }

        ethTransactions(address, options)
        .then((_transactions) => {
          resolve(_transactions);
        });
      }
    });
  }
}

const balance = (network) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _name = network.split('|')[0];

      if (network.indexOf('|spv') > -1) {
        const address = keys.spv[_name].pub;
        let _electrumServer = getLocalStorageVar('coins')[network].server;
        _electrumServer.serverList = electrumServers[_name].serverList;

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
            
            if (network === 'kmd|spv') {
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
      } else if (network.indexOf('|eth') > -1) {
        const address = keys.eth[_name].pub;
        let options;

        if (network.indexOf('eth_ropsten') > -1) {
          options = {
            network: 'ropsten',
          };
        } else if (_name.indexOf('eth') === -1) {
          options = {
            symbol: _name,
          };
        }

        ethBalance(address, options)
        .then((_balance) => {
          resolve({
            balance: _balance.balance,
            unconfirmed: 0,
          });
        });
      }
    });
  }
}

const kmdUnspents = () => {
  return async (dispatch) => {
    let _electrumServer = getLocalStorageVar('coins')['kmd|spv'].server;
    _electrumServer.serverList = electrumServers['kmd|spv'].serverList;

    return new Promise((resolve, reject) => {
      listunspent(
        proxyServer,
        _electrumServer,
        keys.spv.kmd.pub,
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
      let _pubKeys = {
        spv: {},
        eth: {},
      };

      for (let key in coins) {
        const _key = key.split('|')[0];
        let isWif = false;
        let _seedToWif;
        
        if (key.indexOf('|spv') > -1) {
          const _seed = seedToPriv(seed, 'btc');
          
          try {
            bs58check.decode(seed);
            isWif = true;
          } catch (e) {}

          if (isWif) {
            _seedToWif = wifToWif(_seed, isKomodoCoin(_key) ? electrumJSNetworks.kmd : electrumJSNetworks[_key.toLowerCase()]);
          } else {
            _seedToWif = seedToWif(_seed, isKomodoCoin(_key) ? electrumJSNetworks.kmd : electrumJSNetworks[_key.toLowerCase()], true);
          }

          keys.spv[_key] = {
            pub: _seedToWif.pub,
            priv: _seedToWif.priv,
          };
          _pubKeys.spv[_key] = _seedToWif.pub;
        } else if (key.indexOf('|eth') > -1) {
          const _seed = seedToPriv(seed, 'eth');
          const _ethKeys = etherKeys(_seed, true);
          keys.eth[_key] = {
            pub: _ethKeys.address,
            priv: _ethKeys.signingKey.privateKey,
          };
          _pubKeys.eth[_key] = _ethKeys.address;

          if (!connect[_key.indexOf('eth_ropsten') > -1 ? 'eth_ropsten' : 'eth']) {
            connect[_key.indexOf('eth_ropsten') > -1 ? 'eth_ropsten' : 'eth'] = _ethKeys.connect(new ethers.getDefaultProvider(_key.indexOf('eth_ropsten') ? 'ropsten' : 'homestead'));
          }
        }
      }

      console.warn('auth', keys);
      resolve(_pubKeys);
    });
  }
}

const addKeyPair = (coin) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _coin = coin.split('|')[0];
      let _pubKeys = {};

      if (coin.indexOf('|spv') > -1) {
        let _srcPriv;
        
        if (Object.keys(keys.spv).length) {
          _srcPriv = keys.spv[Object.keys(keys.spv)[0]].priv;
        } else if (Object.keys(keys.eth).length) {
          _srcPriv = seedToPriv(keys.eth[Object.keys(keys.eth)[0]].priv, 'btc');
        }        

        const _wifToWif = wifToWif(_srcPriv, isKomodoCoin(_coin) ? electrumJSNetworks.kmd : electrumJSNetworks[_coin]);
        keys.spv[_coin] = _wifToWif;
        _pubKeys[_coin] = _wifToWif.pub;

        console.warn(addKeyPair, keys.spv[_coin]);
      } else if (coin.indexOf('|eth') > -1) {
        let _srcPriv;
        
        if (Object.keys(keys.spv).length) {
          _srcPriv = seedToPriv(keys.spv[Object.keys(keys.spv)[0]].priv, 'eth');
        } else if (Object.keys(keys.eth).length) {
          _srcPriv = keys.eth[Object.keys(keys.eth)[0]].priv;
        }

        const _ethKeys = etherKeys(_srcPriv, true);
        keys.spv[_coin] = {
          pub: _ethKeys.address,
          priv: _ethKeys.signingKey.privateKey,
        };
        _pubKeys[_coin] = _ethKeys.address;
        
        if (!connect[_coin.indexOf('eth_ropsten') > -1 ? 'eth_ropsten' : 'eth']) {
          connect[_coin.indexOf('eth_ropsten') > -1 ? 'eth_ropsten' : 'eth'] = _ethKeys.connect(new ethers.getDefaultProvider(_coin.indexOf('eth_ropsten') ? 'ropsten' : 'homestead'));
        }
        
        console.warn(connect);
        console.warn('addKeyPair eth path');
      }

      resolve(_pubKeys[_coin]);
    });
  }
}

const getOverview = (coins) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      // sort coins
      const _coinObjKeys = Object.keys(coins);
      let _coins = {};
      let _keys = [];
      
      for (let i = 0; i < _coinObjKeys.length; i++) {
        const _name = _coinObjKeys[i].split('|')[0];
        const _mode = _coinObjKeys[i].split('|')[1];

        _keys.push({
          pub: keys[_mode][_name].pub,
          coin: _coinObjKeys[i],
        });

        _coins[_mode.toUpperCase() + '.' + _name.toUpperCase()] = _coinObjKeys[i];
      }
      
      _coins = sortObject(_coins);

      Promise.all(_keys.map((pair, index) => {
        return new Promise((resolve, reject) => {
          if (pair.coin.indexOf('|spv') > -1) {
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
          } else if (pair.coin.indexOf('|eth') > -1) {
            // TODO: get eth balance
            resolve({
              coin: pair.coin,
              pub: pair.pub,
              balance: 0,
              unconfirmed: 0,
            });
          }
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

const getEthGasPrice = () => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {    
      ethGasPrice()
      .then((res) => {
        resolve(res);
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
  sendtxEth,
  getServersList,
  setDefaultServer,
  addKeyPair,
  kmdUnspents,
  getBtcFees,
  getEthGasPrice,
  getAnotherProxy,
}