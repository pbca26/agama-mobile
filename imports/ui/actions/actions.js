// import API from '../../api/api';

import { Promise } from 'meteor/promise';

import sha256 from 'sha256';
import CoinKey from 'coinkey';

const electrumJSNetworks = require('../../api/electrumNetworks.js');
const electrumJSTxDecoder = require('../../api/electrumTxDecoder.js');

function seedToWif(seed, iguana) {
  const bytes = sha256(seed, { asBytes: true });

  if (iguana) {
    bytes[0] &= 248;
    bytes[31] &= 127;
    bytes[31] |= 64;
  }

  const toHexString = (byteArray) => {
    return Array.from(byteArray, (byte) => {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
  }

  const hex = toHexString(bytes);

  const _wif = electrumJSNetworks.komodo.wif;
  const _pkh = electrumJSNetworks.komodo.pubKeyHash;

  const key = new CoinKey(new Buffer(hex, 'hex'), {
    private: _wif,
    public: _pkh,
  });

  key.compressed = true;

  // shepherd.log(`seedtowif priv key ${key.privateWif}`, true);
  // shepherd.log(`seedtowif pub key ${key.publicAddress}`, true);

  return {
    priv: key.privateWif,
    pub: key.publicAddress,
  };
}

let electrumKeys = {};
let proxyServer = {
  ip: '46.20.235.46',
  port: 9999,
};
let electrumServer = {
  komodo: { // !estimatefee
    ip: '173.212.225.176',
    port: 50011,
    proto: 'tcp',
    txfee: 10000,
    abbr: 'KMD',
    serverList: [
      '173.212.225.176:50011',
      '136.243.45.140:50011'
    ],
  },
};

const parseTransactionAddresses = (tx, targetAddress, network) => {
  // TODO: - sum vins / sum vouts to the same address
  //       - multi vin multi vout
  //       - detect change address
  let result = [];
  let _parse = {
    inputs: {},
    outputs: {},
  };
  let _sum = {
    inputs: 0,
    outputs: 0,
  };
  let _total = {
    inputs: 0,
    outputs: 0,
  };

  console.log('parseTransactionAddresses result ==>', true);

  if (tx.format === 'cant parse') {
    return {
      type: 'unknown',
      amount: 'unknown',
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    }
  }

  for (let key in _parse) {
    if (!tx[key].length) {
      _parse[key] = [];
      _parse[key].push(tx[key]);
    } else {
      _parse[key] = tx[key];
    }

    for (let i = 0; i < _parse[key].length; i++) {
      console.log(`key ==>`, true);
      console.log(_parse[key][i], true);
      console.log(Number(_parse[key][i].value), true);

      _total[key] += Number(_parse[key][i].value);

      if (_parse[key][i].scriptPubKey &&
          _parse[key][i].scriptPubKey.addresses &&
          _parse[key][i].scriptPubKey.addresses[0] === targetAddress &&
          _parse[key][i].value) {
        _sum[key] += Number(_parse[key][i].value);
      }
    }
  }

  if (_sum.inputs > 0 &&
      _sum.outputs > 0) {
    // vin + change, break into two tx
    result = [{ // reorder since tx sort by default is from newest to oldest
      type: 'sent',
      amount: Number(_sum.inputs.toFixed(8)),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    }, {
      type: 'received',
      amount: Number(_sum.outputs.toFixed(8)),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    }];

    if (network === 'komodo') { // calc claimed interest amount
      const vinVoutDiff = _total.inputs - _total.outputs;

      if (vinVoutDiff < 0) {
        result[1].interest = Number(vinVoutDiff.toFixed(8));
      }
    }
  } else if (_sum.inputs === 0 && _sum.outputs > 0) {
    result = {
      type: 'received',
      amount: Number(_sum.outputs.toFixed(8)),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    };
  } else if (_sum.inputs > 0 && _sum.outputs === 0) {
    result = {
      type: 'sent',
      amount: Number(_sum.inputs.toFixed(8)),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    };
  } else {
    // (?)
    result = {
      type: 'other',
      amount: 'unknown',
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    };
  }

  console.log(_sum, true);
  console.log(result, true);

  return result;
}

function transactions(address) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      // get current height
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getcurrentblock?port=${electrumServer.komodo.port}&ip=${electrumServer.komodo.ip}`, {
        params: {}
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          const currentHeight = result.result;

          console.log('currentHeight =>');
          console.log(currentHeight);

          HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listtransactions?port=${electrumServer.komodo.port}&ip=${electrumServer.komodo.ip}&address=${address}&raw=true`, {
            params: {}
          }, (error, result) => {
            result = JSON.parse(result.content);

            if (result.msg !== 'error') {
              let _transactions = [];

              // parse listtransactions
              const json = result.result;

              if (json &&
                  json.length) {
                let _rawtx = [];

                Promise.all(json.map((transaction, index) => {
                  return new Promise((resolve, reject) => {
                    HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getblockinfo?port=${electrumServer.komodo.port}&ip=${electrumServer.komodo.ip}&address=${address}&height=${transaction.height}`, {
                      params: {}
                    }, (error, result) => {
                      console.log('getblock =>');
                      console.log(result);

                      result = JSON.parse(result.content);

                      if (result.msg !== 'error') {
                        const blockInfo = result.result;

                        console.log('electrum gettransaction ==>');
                        console.log((index + ' | ' + (transaction.raw.length - 1)));
                        console.log(transaction.raw);

                        // decode tx
                        const _network = electrumJSNetworks.komodo;
                        const decodedTx = electrumJSTxDecoder(transaction.raw, _network);

                        let txInputs = [];

                        console.log('decodedtx =>', true);
                        console.log(decodedTx.outputs, true);

                        if (decodedTx &&
                            decodedTx.inputs) {
                          Promise.all(decodedTx.inputs.map((_decodedInput, index) => {
                            return new Promise((_resolve, _reject) => {
                              if (_decodedInput.txid !== '0000000000000000000000000000000000000000000000000000000000000000') {

                                HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/gettransaction?port=${electrumServer.komodo.port}&ip=${electrumServer.komodo.ip}&address=${address}&txid=${_decodedInput.txid}`, {
                                  params: {}
                                }, (error, result) => {
                                  console.log('gettransaction =>');
                                  console.log(result);

                                  result = JSON.parse(result.content);

                                  if (result.msg !== 'error') {
                                    const decodedVinVout = electrumJSTxDecoder(result.result, _network);

                                    console.log('electrum raw input tx ==>');

                                    if (decodedVinVout) {
                                      console.log(decodedVinVout.outputs[_decodedInput.n], true);
                                      txInputs.push(decodedVinVout.outputs[_decodedInput.n]);
                                      _resolve(true);
                                    } else {
                                      _resolve(true);
                                    }
                                  }
                                });
                              } else {
                                _resolve(true);
                              }
                            });
                          }))
                          .then(promiseResult => {
                            const _parsedTx = {
                              network: decodedTx.network,
                              format: decodedTx.format,
                              inputs: txInputs,
                              outputs: decodedTx.outputs,
                              height: transaction.height,
                              timestamp: Number(transaction.height) === 0 ? Math.floor(Date.now() / 1000) : blockInfo.timestamp,
                              confirmations: Number(transaction.height) === 0 ? 0 : currentHeight - transaction.height,
                            };

                            const formattedTx = parseTransactionAddresses(_parsedTx, address, null);

                            if (formattedTx.type) {
                              formattedTx.height = transaction.height;
                              formattedTx.blocktime = blockInfo.timestamp;
                              formattedTx.timereceived = blockInfo.timereceived;
                              formattedTx.hex = transaction.raw;
                              formattedTx.inputs = decodedTx.inputs;
                              formattedTx.outputs = decodedTx.outputs;
                              formattedTx.locktime = decodedTx.format.locktime;
                              _rawtx.push(formattedTx);
                            } else {
                              formattedTx[0].height = transaction.height;
                              formattedTx[0].blocktime = blockInfo.timestamp;
                              formattedTx[0].timereceived = blockInfo.timereceived;
                              formattedTx[0].hex = transaction.raw;
                              formattedTx[0].inputs = decodedTx.inputs;
                              formattedTx[0].outputs = decodedTx.outputs;
                              formattedTx[0].locktime = decodedTx.format.locktime;
                              formattedTx[1].height = transaction.height;
                              formattedTx[1].blocktime = blockInfo.timestamp;
                              formattedTx[1].timereceived = blockInfo.timereceived;
                              formattedTx[1].hex = transaction.raw;
                              formattedTx[1].inputs = decodedTx.inputs;
                              formattedTx[1].outputs = decodedTx.outputs;
                              formattedTx[1].locktime = decodedTx.format.locktime;
                              _rawtx.push(formattedTx[0]);
                              _rawtx.push(formattedTx[1]);
                            }
                            resolve(true);
                          });
                        } else {
                          const _parsedTx = {
                            network: decodedTx.network,
                            format: 'cant parse',
                            inputs: 'cant parse',
                            outputs: 'cant parse',
                            height: transaction.height,
                            timestamp: Number(transaction.height) === 0 ? Math.floor(Date.now() / 1000) : blockInfo.timestamp,
                            confirmations: Number(transaction.height) === 0 ? 0 : currentHeight - transaction.height,
                          };

                          const formattedTx = parseTransactionAddresses(_parsedTx, address, null);
                          _rawtx.push(formattedTx);
                          resolve(true);
                        }
                      } else {
                        const _parsedTx = {
                          network: 'cant parse',
                          format: 'cant parse',
                          inputs: 'cant parse',
                          outputs: 'cant parse',
                          height: transaction.height,
                          timestamp: 'cant get block info',
                          confirmations: Number(transaction.height) === 0 ? 0 : currentHeight - transaction.height,
                        };
                        const formattedTx = parseTransactionAddresses(_parsedTx, address, null);
                        _rawtx.push(formattedTx);
                        resolve(true);
                      }
                    });
                  });
                }))
                .then(promiseResult => {
                  resolve(_rawtx);
                });
              } else {
                // empty history
                resolve([]);
              }
            } else {
              resolve('error');
            }

            console.warn(result);
          });
        }
      });
    });
  }
}

function balance(address) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance?port=${electrumServer.komodo.port}&ip=${electrumServer.komodo.ip}&address=${address}`, {
        params: {}
      }, (error, result) => {
        resolve(JSON.parse(result.content));
      });
    });
  }
}

function auth(seed) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      const _seedToWif = seedToWif(seed, true);

      electrumKeys = _seedToWif;

      resolve({ res: _seedToWif.pub });
    });
  }
}

function getKeys() {
  return async function(dispatch) {
    const _keys = await Meteor.callPromise('keys');

    return dispatch({
      type: 'KEYS',
      res: _keys,
    });
  }
}

export default {
  auth,
  getKeys,
  balance,
  transactions
}
