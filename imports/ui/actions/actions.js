import bs58check from 'bs58check';
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
import {
  getCoinswitchCoins,
  getRate,
  getOrder,
  placeOrder,
  syncHistory,
} from './exchanges';
import getPrices from './prices';

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
      devlog('req', {
        method: 'GET',
        url: httpParams.url,
        params: httpParams.params,
      });
  
      HTTP.call(
        'GET',
        httpParams.url, {
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
      devlog('req', {
        method: 'GET',
        url: httpParams.url,
        params: httpParams.params,
      });
      
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
      let params = {
        port,
        ip,
        proto,
      };
      devlog('req', {
        method: 'GET',
        url: `http://${proxyServer.ip}:${proxyServer.port}/api/server/version`,
        params,
      });
    
      HTTP.call(
        'GET',
        `http://${proxyServer.ip}:${proxyServer.port}/api/server/version`, {
        params,
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          const _name = network.split('|')[0];
          
          electrumServers[_name].port = port;
          electrumServers[_name].ip = ip;
          electrumServers[_name].proto = proto;

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
      const _name = network.split('|')[0];
      const changeAddress = keys.spv[_name].pub;
      let _electrumServer = getLocalStorageVar('coins')[network].server;
      _electrumServer.serverList = electrumServers[_name].serverList;

      devlog(`sendtx ${network}`);

      createtx(
        proxyServer,
        _electrumServer,
        outputAddress,
        changeAddress,
        value,
        btcFee ? { perbyte: true, value: btcFee } : (isKomodoCoin(network) ? electrumServers.kmd.txfee : electrumServers[_name].txfee),
        keys.spv[_name].priv,
        _name,
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

const sendtxEth = (network, dest, amount, gasPrice, push) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _name = network.split('|')[0];

      if (_name === 'eth' ||
          _name === 'eth_ropsten') {
        // wallet, coin, push, dest, amount, gasPrice, network
        ethCreateTx(
          connect[_name],
          _name,
          push,
          dest,
          amount,
          gasPrice,
          _name === 'eth_ropsten' ? 'ropsten' : 'homestead'
        )
        .then((res) => {
          resolve(res);
        })
      } else {
        // wallet, symbol, push, dest, amount, gasPrice
        ethCreateTxERC20(
          connect.eth,
          _name,
          push,
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

const transactions = (network, options) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _name = network.split('|')[0];
      
      if (network.indexOf('|spv') > -1) {
        let address;
        let _electrumServer;
        
        if (!options) {
          address = keys.spv[_name].pub;
          _electrumServer = getLocalStorageVar('coins')[network].server;
          _electrumServer.serverList = electrumServers[_name].serverList;
        } else {
          address = options.pub;
          const _randomElectrumServer = electrumServers[_name].serverList[getRandomIntInclusive(0, electrumServers[_name].serverList.length - 1)].split(':');
          _electrumServer = {
            ip: _randomElectrumServer[0],
            port: _randomElectrumServer[1],
            proto: _randomElectrumServer[2],
          };

          console.warn(_electrumServer);
        }

        listtransactions(
          proxyServer,
          _electrumServer,
          address,
          _name,
          true,
          cache,
          options ? options.txid : null
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
        let params = {
          port: _electrumServer.port,
          ip: _electrumServer.ip,
          proto: _electrumServer.proto,
          address,
        };
        devlog('req', {
          method: 'GET',
          url: `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance`,
          params,
        });
  
        HTTP.call(
          'GET',
          `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance`, {
          params,
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
    _electrumServer.serverList = electrumServers.kmd.serverList;

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
            _seedToWif = wifToWif(_seed, electrumJSNetworks[_key.toLowerCase()] || electrumJSNetworks.kmd);
          } else {
            _seedToWif = seedToWif(_seed, electrumJSNetworks[_key.toLowerCase()] || electrumJSNetworks.kmd, true);
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
            connect[_key.indexOf('eth_ropsten') > -1 ? 'eth_ropsten' : 'eth'] = _ethKeys.connect(new ethers.getDefaultProvider(_key.indexOf('eth_ropsten') > -1 ? 'ropsten' : 'homestead'));
          }
        }
      }

      resolve(_pubKeys);
    });
  }
}

const addKeyPair = (coin) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const _coin = coin.split('|')[0];
      let _pubKeys = {
        spv: {},
        eth: {},
      };

      if (coin.indexOf('|spv') > -1) {
        let _srcPriv;
        
        if (Object.keys(keys.spv).length) {
          _srcPriv = keys.spv[Object.keys(keys.spv)[0]].priv;
        } else if (Object.keys(keys.eth).length) {
          _srcPriv = seedToPriv(keys.eth[Object.keys(keys.eth)[0]].priv, 'btc');
        }

        const _wifToWif = wifToWif(_srcPriv, electrumJSNetworks[_coin.toLowerCase()] || electrumJSNetworks.kmd);
        keys.spv[_coin] = _wifToWif;
        _pubKeys.spv[_coin] = _wifToWif.pub;

        resolve(_pubKeys.spv[_coin]);
      } else if (coin.indexOf('|eth') > -1) {
        let _srcPriv;
        
        if (Object.keys(keys.spv).length) {
          _srcPriv = seedToPriv(keys.spv[Object.keys(keys.spv)[0]].priv, 'eth');
        } else if (Object.keys(keys.eth).length) {
          _srcPriv = keys.eth[Object.keys(keys.eth)[0]].priv;
        }

        const _ethKeys = etherKeys(_srcPriv, true);
        keys.eth[_coin] = {
          pub: _ethKeys.address,
          priv: _ethKeys.signingKey.privateKey,
        };
        _pubKeys.eth[_coin] = _ethKeys.address;
        
        if (!connect[_coin.indexOf('eth_ropsten') > -1 ? 'eth_ropsten' : 'eth']) {
          connect[_coin.indexOf('eth_ropsten') > -1 ? 'eth_ropsten' : 'eth'] = _ethKeys.connect(new ethers.getDefaultProvider(_coin.indexOf('eth_ropsten') > -1 ? 'ropsten' : 'homestead'));
        }

        resolve(_pubKeys.eth[_coin]);
      }
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

        _coins[`${_mode.toUpperCase()}.${_name.toUpperCase()}`] = _coinObjKeys[i];
      }
      
      _coins = sortObject(_coins);

      Promise.all(_keys.map((pair, index) => {
        return new Promise((resolve, reject) => {
          if (pair.coin.indexOf('|spv') > -1) {
            const _electrumServer = getLocalStorageVar('coins')[pair.coin].server;
            let params = {
              port: _electrumServer.port,
              ip: _electrumServer.ip,
              proto: _electrumServer.proto,
              address: pair.pub,
            };
            devlog('req', {
              method: 'GET',
              url: `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance`,
              params,
            });
    
            HTTP.call(
              'GET',
              `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance`, {
              params,
            }, (error, result) => {
              if (!result) {
                resolve('proxy-error');
              } else {
                try {
                  const _balance = JSON.parse(result.content).result;

                  resolve({
                    coin: pair.coin,
                    pub: pair.pub,
                    balance: _balance.hasOwnProperty('confirmed') ? Number(fromSats(_balance.confirmed).toFixed(8)) : 'n/a',
                    unconfirmed: _balance.hasOwnProperty('unconfirmed') ? Number(fromSats(_balance.unconfirmed).toFixed(8)) : 'n/a',
                  });
                } catch (e) {
                  resolve({
                    coin: pair.coin,
                    pub: pair.pub,
                    balance: 0,
                    unconfirmed: 0,
                  });
                  devlog(`unable to get spv balance for ${pair.coin}`);
                  devlog(JSON.stringify(result));
                }
              }
            });
          } else if (pair.coin.indexOf('|eth') > -1) {
            const _name = pair.coin.split('|')[0];
            const address = keys.eth[_name].pub;
            let options;
    
            if (pair.coin.indexOf('eth_ropsten') > -1) {
              options = {
                network: 'ropsten',
              };
            } else if (pair.coin.indexOf('eth|') === -1) {
              options = {
                symbol: _name,
              };
            }
    
            try {
              ethBalance(address, options)
              .then((_balance) => {
                resolve({
                  coin: pair.coin,
                  pub: pair.pub,
                  balance: _balance.balance,
                  unconfirmed: 0,
                });
              });
            } catch (e) {
              resolve({
                coin: pair.coin,
                pub: pair.pub,
                balance: 0,
                unconfirmed: 0,
              });
              devlog(`unable to get eth balance for ${pair.coin}`);
            }
          }
        });
      }))
      .then(promiseResult => {        
        let _coins = [];

        for (let i = 0; i < promiseResult.length; i++) {
          _coins.push(promiseResult[i].coin.split('|')[0]);
        }

        const settingsCurrency = getLocalStorageVar('settings').fiat;
        let params = {
          coins: _coins.length > 1 ? _coins.join(',') : _coins,
          currency: settingsCurrency,
          pricechange: true,
        };

        devlog('req', {
          method: 'GET',
          url: 'https://www.atomicexplorer.com/api/mm/prices/v2',
          params,
        });

        HTTP.call(
          'GET',
          'https://www.atomicexplorer.com/api/mm/prices/v2', {
          params,
        }, (error, result) => {
          if (!result) {
            resolve('error');
          } else {
            let _prices = {};
            
            try {
              _prices = JSON.parse(result.content).result;
            } catch (e) {
              devlog('unable to get https://www.atomicexplorer.com/api/mm/prices/v2');
              devlog(JSON.stringify({
                coins: _coins.length > 1 ? _coins.join(',') : _coins,
                currency: settingsCurrency,
                pricechange: true,
              }));
              devlog(JSON.stringify(result));
            }

            let _overviewItems = [];
  
            for (let i = 0; i < promiseResult.length; i++) {
              const _coin = promiseResult[i].coin.split('|')[0];
  
              _overviewItems.push({
                coin: promiseResult[i].coin,
                balanceNative: promiseResult[i].balance,
                balanceFiat: _prices[_coin.toUpperCase()] && _prices[_coin.toUpperCase()][settingsCurrency.toUpperCase()] && Number(promiseResult[i].balance) ? Number(_prices[_coin.toUpperCase()][settingsCurrency.toUpperCase()]) * Number(promiseResult[i].balance) : 0,
                fiatPricePerItem: _prices[_coin.toUpperCase()] && _prices[_coin.toUpperCase()][settingsCurrency.toUpperCase()] ? Number(_prices[_coin.toUpperCase()][settingsCurrency.toUpperCase()]) : 0,
                priceChange: _prices[_coin.toUpperCase()] && _prices[_coin.toUpperCase()].priceChange ? _prices[_coin.toUpperCase()].priceChange : null,
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
      devlog('req', {
        method: 'GET',
        url: 'https://www.atomicexplorer.com/api/btc/fees',
      });
  
      HTTP.call(
        'GET',
        'https://www.atomicexplorer.com/api/btc/fees', {
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

const syncExchangesHistory = (provider) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      syncHistory(provider, keys)
      .then((res) => {
        resolve(res);
      });
    });
  }
};

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
  getCoinswitchCoins,
  getPrices,
  getRate,
  getOrder,
  placeOrder,
  syncExchangesHistory,
}