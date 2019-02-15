import { Random } from 'meteor/random';
import signature from 'agama-wallet-lib/build/message';
import { devlog } from './dev';
import networks from 'agama-wallet-lib/build/bitcoinjs-networks';

export const getCoinswitchCoins = () => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {    
      HTTP.call(
        'GET',
        'https://www.atomicexplorer.com/api/exchanges/coinswitch/coins/cached', {
        params: {},
      }, (error, result) => {
        if (!result) {
          resolve('error');
        } else {
          const coinswitchCoins = JSON.parse(result.content).result;
          devlog('actions getCoinswitchCoins', coinswitchCoins);
          resolve(coinswitchCoins);
        }
      });
    });
  }
}

export const getRate = (provider, src, dest) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      if (provider === 'coinswitch') {
        HTTP.call(
          'GET',
          'https://www.atomicexplorer.com/api/exchanges/coinswitch?method=getRate',
        {
          params: {
            src,
            dest,
          },
        }, (error, result) => {
          if (!result) {
            resolve('error');
          } else {
            const coinswitchRate = JSON.parse(JSON.parse(result.content));
            devlog('actions getRate', coinswitchRate);
            resolve(coinswitchRate);
          }
        });
      }
    });
  }
}

export const getOrder = (provider, orderId) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      if (provider === 'coinswitch') {
        HTTP.call(
          'GET',
          'https://www.atomicexplorer.com/api/exchanges/coinswitch?method=getOrder',
        {
          params: {
            orderId,
          },
        }, (error, result) => {
          if (!result) {
            resolve('error');
          } else {
            const coinswitchOrder = JSON.parse(JSON.parse(result.content));
            devlog('actions getOrder', coinswitchOrder);
            resolve(coinswitchOrder);
          }
        });
      }
    });
  }
}

export const placeOrder = (provider, src, dest, srcAmount, destAmount, destPub, refundPub) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      if (provider === 'coinswitch') {
        HTTP.call(
          'GET',
          'https://www.atomicexplorer.com/api/exchanges/coinswitch?method=placeOrder',
        {
          params: {
            src,
            dest,
            srcAmount,
            destAmount,
            destPub,
            refundPub,
          },
        }, (error, result) => {
          if (!result) {
            resolve('error');
          } else {
            const coinswitchOrderPlace = JSON.parse(JSON.parse(result.content));
            devlog('actions coinswitchOrderPlace', coinswitchOrderPlace);
            resolve(coinswitchOrderPlace);
          }
        });
      }
    });
  }
}

export const syncHistory = (provider, keys) => {
  return new Promise((resolve, reject) => {
    let electrumCoinsList = [];
    let ethereumCoins = [];

    for (let key in keys.spv) {
      electrumCoinsList.push(key.toUpperCase());
    }

    for (let key in keys.eth) {
      ethereumCoins.push(key);
    }

    devlog(`actions syncHistory spv coins: ${electrumCoinsList.join(', ')}${ethereumCoins.length ? ', ETH' : ''}`);
    let _addressPayload = [];
    let _pubKeys = [];

    for (let i = 0;  i < electrumCoinsList.length; i++) {
      const _randomString = Random.hexString(32);
      const _keys = keys.spv[electrumCoinsList[i].toLowerCase()];

      if (_keys.priv &&
          _keys.priv !== _keys.pub &&
          _pubKeys.indexOf(_keys.pub) === -1) {
        const _sig = signature.btc.sign(_keys.priv, _randomString, networks[electrumCoinsList[i].toLowerCase()].pubKeyHash.toString().length > 3 ? true : false);
        devlog(`${electrumCoinsList[i]} ${_keys.pub} sig ${_sig}`);
        _addressPayload.push(networks[electrumCoinsList[i].toLowerCase()].pubKeyHash.toString().length > 3 ? 
        {
          pub: _keys.pub,
          sig: _sig,
          message: _randomString,
          isZcash: true,
        } :{
          pub: _keys.pub,
          sig: _sig,
          message: _randomString,
        });
        _pubKeys.push(_keys.pub);
      }
    }
    
    if (provider === 'coinswitch') {
      HTTP.call(
        'POST',
        'https://www.atomicexplorer.com/api/exchanges/coinswitch/history',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          address: _addressPayload,
        },
      }, (error, result) => {
        if (!result) {
          resolve('error');
        } else {
          const coinswitchHistory = JSON.parse(result.content);
          devlog('actions coinswitchHistory', coinswitchHistory);
          resolve(coinswitchHistory.msg && coinswitchHistory.msg === 'success' ? coinswitchHistory.result : false);
        }
      });
    }
  });
}