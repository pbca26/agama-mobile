import { Promise } from 'meteor/promise';

import { devlog } from './dev';
import listunspent from './listunspent';
import { isKomodoCoin } from 'agama-wallet-lib/build/coin-helpers';
import electrumServers from 'agama-wallet-lib/build/electrum-servers';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import transactionBuilder from 'agama-wallet-lib/build/transaction-builder';
import dpowCoins from 'agama-wallet-lib/build/electrum-servers-dpow';
import translate from '../translate/translate';

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
        const _network = electrumJSNetworks[network.toLowerCase()] || electrumJSNetworks[isKomodoCoin(network) ? 'kmd' : network];    
        let _data = transactionBuilder.data(
          _network,
          value,
          fee,
          outputAddress,
          changeAddress,
          utxoList
        );
        let dpowSecured = true;
        
        devlog('send data', _data);

        if (network.toLowerCase() === 'kmd' &&
            _data.totalInterest > 0.0002) {
          fee = fee * 2;
          value = value - 10000;

          _data = transactionBuilder.data(
            _network,
            value,
            fee,
            outputAddress,
            changeAddress,
            utxoList
          );
        }

        if (dpowCoins.indexOf(network.toUpperCase()) > -1) {
          let dpowSecured = true;
          devlog(`${network} spv dpow enabled create tx, verify if all utxo are dpow secured`);
          
          for (let i = 0; i < _data.inputs.length; i++) {
            if (_data.inputs[i].hasOwnProperty('dpowSecured') &&
                !_data.inputs[i].dpowSecured) {
              dpowSecured = false;
              break;
            }
          }

          _data.dpowSecured = dpowSecured;
        }

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
          let data = {
            port: electrumServer.port,
            ip: electrumServer.ip,
            proto: electrumServer.proto,
            rawtx: _tx,
          };
          devlog('req', {
            method: 'POST',
            url: `http://${proxyServer.ip}:${proxyServer.port}/api/pushtx`,
            params: data,
          });
      
          HTTP.call(
            'POST',
            `http://${proxyServer.ip}:${proxyServer.port}/api/pushtx`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            data,
          }, (error, result) => {
            result = JSON.parse(result.content);

            if (result.msg === 'error') {
              resolve({
                msg: 'error',
                result: translate('API.CON_ERROR'),
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
                  result: translate('API.BAD_TX_INPUTS_SPENT_ERR'),
                  raw: _data,
                };

                resolve(successObj);
              } else {
                if (txid &&
                    txid.length === 64) {
                  if (txid.indexOf('bad-txns-in-belowout') > -1) {
                    const successObj = {
                      msg: 'error',
                      result: translate('API.BAD_TX_INPUTS_SPENT_ERR'),
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
                      result: translate('API.BAD_TX_INPUTS_SPENT_ERR'),
                      raw: _data,
                    };

                    resolve(successObj);
                  } else {
                    const successObj = {
                      msg: 'error',
                      result: translate('API.CANT_BROADCAST_TX_ERR'),
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
          result: translate('API.NO_UTXO_ERR'),
        });
      }
    });
  });
}

export default createtx;