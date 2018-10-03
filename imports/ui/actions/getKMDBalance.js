import { Promise } from 'meteor/promise';
import { devlog } from './dev';
import kmdCalcInterest from 'agama-wallet-lib/build/komodo-interest';
import {
  fromSats,
  toSats,
} from 'agama-wallet-lib/build/utils';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import electrumJSTxDecoder from 'agama-wallet-lib/build/transaction-decoder';

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

export const getKMDBalance = (address, json, proxyServer, electrumServer, cache) => {
  return new Promise((resolve, reject) => {
    HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listunspent`, {
      params: {
        port: electrumServer.port,
        ip: electrumServer.ip,
        proto: electrumServer.proto,
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
            devlog(`utxo ${utxoList[i]['tx_hash']} sats ${utxoList[i].value} value ${Number(fromSats(utxoList[i].value))}`);

            if (Number(fromSats(utxoList[i].value)) >= 10) {
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
                cache.getTransaction(
                  _utxoItem.tx_hash,
                  'kmd',
                  {
                    url: `http://${proxyServer.ip}:${proxyServer.port}/api/gettransaction`,
                    params: {
                      port: electrumServer.port,
                      ip: electrumServer.ip,
                      proto: electrumServer.proto,
                      txid: _utxoItem.tx_hash,
                    },
                  }
                )
                .then((result) => {
                  devlog('gettransaction =>');
                  devlog(result);

                  result = JSON.parse(result.content);

                  if (result.msg !== 'error') {
                    const _rawtxJSON = result.result;

                    devlog('electrum gettransaction ==>');
                    devlog(`${index} | ${(_rawtxJSON.length - 1)}`);
                    devlog(_rawtxJSON);

                    // decode tx
                    const _network = electrumJSNetworks.kmd;
                    let decodedTx;

                    if (cache.getDecodedTransaction(_utxoItem.tx_hash, 'kmd')) {
                      decodedTx = cache.getDecodedTransaction(_utxoItem.tx_hash, 'kmd');
                    } else {
                      decodedTx = electrumJSTxDecoder(_rawtxJSON, _network);
                      cache.getDecodedTransaction(_utxoItem.tx_hash, 'kmd', decodedTx);
                    }

                    if (decodedTx &&
                        decodedTx.format &&
                        decodedTx.format.locktime > 0) {
                      interestTotal += Number(kmdCalcInterest(decodedTx.format.locktime, _utxoItem.value, _utxoItem.height));
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
                balance: Number(fromSats(json.confirmed).toFixed(8)),
                unconfirmed: Number(fromSats(json.unconfirmed).toFixed(8)),
                unconfirmedSats: json.unconfirmed,
                balanceSats: json.confirmed,
                interest: Number(interestTotal.toFixed(8)),
                interestSats: Math.floor(toSats(interestTotal)),
                total: interestTotal > 0 ? Number((fromSats(json.confirmed) + interestTotal).toFixed(8)) : 0,
                totalSats: interestTotal > 0 ? json.confirmed + Math.floor(toSats(interestTotal)) : 0,
              });
            });
          } else {
            resolve({
              balance: Number(fromSats(json.confirmed).toFixed(8)),
              unconfirmed: Number(fromSats(json.unconfirmed).toFixed(8)),
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
            balance: Number(fromSats(json.confirmed).toFixed(8)),
            unconfirmed: Number(fromSats(json.unconfirmed).toFixed(8)),
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

export default getKMDBalance;