import { Promise } from 'meteor/promise';

import { devlog } from './dev';
import listunspent from './listunspent';
import { isAssetChain } from './utils';
import electrumServers from './electrumServers';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import transactionBuilder from 'agama-wallet-lib/build/transaction-builder';

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

const createtx = (proxyServer, electrumServer, outputAddress, changeAddress, value, fee, wif, network, verify, push, cache) => {
  devlog('createrawtx =>');

  return new Promise((resolve, reject) => {
    listunspent(
      proxyServer,
      electrumServer,
      changeAddress,
      network,
      true,
      verify,
      cache
    )
    .then((utxoList) => {
      if (utxoList &&
          utxoList.length) {
        const _network = electrumJSNetworks[isAssetChain(network) ? 'kmd' : network];    
        let _data = transactionBuilder.data(
          _network,
          value,
          fee,
          outputAddress,
          changeAddress,
          utxoList
        );

        devlog('send data', _data);

        if (_data.balance) {
          if (!push) {
            resolve ({
              msg: 'success',
              result: _data,
            });
          }
        } else {
          resolve({
            msg: 'error',
            result: _data,
          });
        }

        const _tx = transactionBuilder.transaction(
          outputAddress,
          changeAddress,
          wif,
          _network,
          _data.inputs,
          _data.change,
          _data.value
        );

        // push to network
        if (push) {
          HTTP.call('POST', `http://${proxyServer.ip}:${proxyServer.port}/api/pushtx`, {
            headers: {
              'Content-Type': 'application/json',
            },
            data: {
              rawtx: _tx,
              port: electrumServer.port,
              ip: electrumServer.ip,
              proto: electrumServer.proto,
            },
          }, (error, result) => {
            result = JSON.parse(result.content);

            if (result.msg === 'error') {
              resolve({
                msg: 'error',
                result: 'Connection error. Please retry.',
              });
            } else {
              const txid = result.result;
              _data.raw = _tx;
              _data.txid = txid; 
              _data.utxoSet = utxoList;           

              if (txid &&
                  txid.indexOf('bad-txns-inputs-spent') > -1) {
                const successObj = {
                  msg: 'error',
                  result: 'Bad transaction inputs spent',
                  raw: _data,
                };

                resolve(successObj);
              } else {
                if (txid &&
                    txid.length === 64) {
                  if (txid.indexOf('bad-txns-in-belowout') > -1) {
                    const successObj = {
                      msg: 'error',
                      result: 'Bad transaction inputs spent',
                      raw: _data,
                    };

                    resolve(successObj);
                  } else {
                    const successObj = {
                      msg: 'success',
                      result: _data,
                    };

                    resolve(successObj);
                  }
                } else {
                  if (txid &&
                      txid.indexOf('bad-txns-in-belowout') > -1) {
                    const successObj = {
                      msg: 'error',
                      result: 'Bad transaction inputs spent',
                      raw: _data,
                    };

                    resolve(successObj);
                  } else {
                    const successObj = {
                      msg: 'error',
                      result: 'Can\'t broadcast transaction',
                      raw: _data,
                    };

                    resolve(successObj);
                  }
                }
              }
            }
          });
        }
      } else {
        resolve ({
          msg: 'error',
          result: 'No available UTXO(s) or connection error',
        });
      }
    });
  });
}

export default createtx;