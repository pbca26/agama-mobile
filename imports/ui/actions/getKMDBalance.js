import { Promise } from 'meteor/promise';
import { devlog } from './dev';
import { kmdCalcInterest } from './utils';
import { electrumJSTxDecoder } from './txDecoder/txDecoder';

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

const electrumJSNetworks = require('./electrumNetworks.js');

export const getKMDBalance = (address, json, proxyServer, electrumServer) => {
  return new Promise((resolve, reject) => {
    HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listunspent`, {
      params: {
        port: electrumServer.port,
        ip: electrumServer.ip,
        address,
      },
    }, (error, result) => {
      result = JSON.parse(result.content);

      if (result.msg === 'error') {
        resolve('error');
      } else {
        const utxoList = result.result;

        if (utxoList &&
            utxoList.length) {
          // filter out < 10 KMD amounts
          let _utxo = [];

          for (let i = 0; i < utxoList.length; i++) {
            devlog(`utxo ${utxoList[i]['tx_hash']} sats ${utxoList[i].value} value ${Number(utxoList[i].value) * 0.00000001}`);

            if (Number(utxoList[i].value) * 0.00000001 >= 10) {
              _utxo.push(utxoList[i]);
            }
          }

          devlog('filtered utxo list =>');
          devlog(_utxo);

          if (_utxo &&
              _utxo.length) {
            let interestTotal = 0;

            Promise.all(_utxo.map((_utxoItem, index) => {
              return new Promise((resolve, reject) => {
                HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/gettransaction`, {
                  params: {
                    port: electrumServer.port,
                    ip: electrumServer.ip,
                    address,
                    txid: _utxoItem['tx_hash'],
                  },
                }, (error, result) => {
                  // devlog('gettransaction =>');
                  // devlog(result);

                  result = JSON.parse(result.content);

                  if (result.msg !== 'error') {
                    const _rawtxJSON = result.result;

                    devlog('electrum gettransaction ==>');
                    devlog((index + ' | ' + (_rawtxJSON.length - 1)));
                    devlog(_rawtxJSON);

                    // decode tx
                    const _network = electrumJSNetworks.komodo;
                    const decodedTx = electrumJSTxDecoder(_rawtxJSON, 'kmd', _network);

                    if (decodedTx &&
                        decodedTx.format &&
                        decodedTx.format.locktime > 0) {
                      interestTotal += kmdCalcInterest(decodedTx.format.locktime, _utxoItem.value);
                    }

                    devlog('decoded tx =>');
                    devlog(decodedTx);

                    resolve(true);
                  }
                });
              });
            }))
            .then(promiseResult => {
              resolve({
                  balance: Number((0.00000001 * json.confirmed).toFixed(8)),
                  unconfirmed: Number((0.00000001 * json.unconfirmed).toFixed(8)),
                  unconfirmedSats: json.unconfirmed,
                  balanceSats: json.confirmed,
                  interest: Number(interestTotal.toFixed(8)),
                  interestSats: Math.floor(interestTotal * 100000000),
                  total: interestTotal > 0 ? Number((0.00000001 * json.confirmed + interestTotal).toFixed(8)) : 0,
                  totalSats: interestTotal > 0 ?json.confirmed + Math.floor(interestTotal * 100000000) : 0,
              });
            });
          } else {
            resolve({
              balance: Number((0.00000001 * json.confirmed).toFixed(8)),
              unconfirmed: Number((0.00000001 * json.unconfirmed).toFixed(8)),
              unconfirmedSats: json.unconfirmed,
              balanceSats: json.confirmed,
              interest: 0,
              interestSats: 0,
              total: 0,
              totalSats: 0,
            });
          }
        } else {
          resolve({
            balance: Number((0.00000001 * json.confirmed).toFixed(8)),
            unconfirmed: Number((0.00000001 * json.unconfirmed).toFixed(8)),
            unconfirmedSats: json.unconfirmed,
            balanceSats: json.confirmed,
            interest: 0,
            interestSats: 0,
            total: 0,
            totalSats: 0,
          });
        }
      }
    });
  });
}