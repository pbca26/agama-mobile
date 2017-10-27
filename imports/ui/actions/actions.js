const StorageKey = new Mongo.Collection(null);
const StorageSettings = new Mongo.Collection(null);

import { Promise } from 'meteor/promise';
import bitcoin from 'bitcoinjs-lib';
import coinSelect from 'coinselect';

import {
  kmdCalcInterest,
  estimateTxSize
} from './utils';

const electrumJSNetworks = require('./electrumNetworks.js');
const electrumJSTxDecoder = require('./electrumTxDecoder.js');

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

import { seedToWif } from './seedToWif';
import { proxyServer } from './proxyServers';
import { electrumServers } from './electrumServers';

let electrumKeys = {};

let _key = StorageKey.findOne(0);
console.warn(_key);
const _newKey = StorageKey.insert({
  key: '123'
});

console.log(StorageKey);

_key = StorageKey.findOne(0);
console.warn(_key);


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

const getKMDBalance = (address, json) => {
  return new Promise((resolve, reject) => {
    HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listunspent?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}`, {
      params: {}
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
            console.log(`utxo ${utxoList[i]['tx_hash']} sats ${utxoList[i].value} value ${Number(utxoList[i].value) * 0.00000001}`, true);

            if (Number(utxoList[i].value) * 0.00000001 >= 10) {
              _utxo.push(utxoList[i]);
            }
          }

          console.log('filtered utxo list =>');
          console.log(_utxo);

          if (_utxo &&
              _utxo.length) {
            let interestTotal = 0;

            Promise.all(_utxo.map((_utxoItem, index) => {
              return new Promise((resolve, reject) => {
                HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/gettransaction?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}&txid=${_utxoItem['tx_hash']}`, {
                  params: {}
                }, (error, result) => {
                  // console.log('gettransaction =>');
                  // console.log(result);

                  result = JSON.parse(result.content);

                  if (result.msg !== 'error') {
                    const _rawtxJSON = result.result;

                    console.log('electrum gettransaction ==>');
                    console.log((index + ' | ' + (_rawtxJSON.length - 1)));
                    console.log(_rawtxJSON);

                    // decode tx
                    const _network = electrumJSNetworks.komodo;
                    const decodedTx = electrumJSTxDecoder(_rawtxJSON, _network);

                    if (decodedTx &&
                        decodedTx.format &&
                        decodedTx.format.locktime > 0) {
                      interestTotal += kmdCalcInterest(decodedTx.format.locktime, _utxoItem.value);
                    }

                    console.log('decoded tx =>');
                    console.log(decodedTx);

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

// single sig
const buildSignedTx = (sendTo, changeAddress, wif, network, utxo, changeValue, spendValue) => {
  const _network = electrumJSNetworks.komodo;
  let key = bitcoin.ECPair.fromWIF(wif, _network);
  let tx = new bitcoin.TransactionBuilder(_network);

  console.log('buildSignedTx');
  console.log(`buildSignedTx priv key ${wif}`);
  console.log(`buildSignedTx pub key ${key.getAddress().toString()}`);

  for (let i = 0; i < utxo.length; i++) {
    tx.addInput(utxo[i].txid, utxo[i].vout);
  }

  tx.addOutput(sendTo, Number(spendValue));

  if (changeValue > 0) {
    tx.addOutput(changeAddress, Number(changeValue));
  }

  if (network === 'komodo' ||
      network === 'KMD') {
    const _locktime = Math.floor(Date.now() / 1000) - 777;
    tx.setLockTime(_locktime);
    console.log(`kmd tx locktime set to ${_locktime}`);
  }

  console.log('buildSignedTx unsigned tx data vin');
  console.log(tx.tx.ins);
  console.log('buildSignedTx unsigned tx data vout');
  console.log(tx.tx.outs);
  console.log('buildSignedTx unsigned tx data');
  console.log(tx);

  for (let i = 0; i < utxo.length; i++) {
    tx.sign(i, key);
  }

  const rawtx = tx.build().toHex();

  console.log('buildSignedTx signed tx hex');
  console.log(rawtx);

  return rawtx;
}

const maxSpendBalance = (utxoList, fee) => {
  let maxSpendBalance = 0;

  for (let i = 0; i < utxoList.length; i++) {
    maxSpendBalance += Number(utxoList[i].value);
  }

  if (fee) {
    return Number(maxSpendBalance) - Number(fee);
  } else {
    return maxSpendBalance;
  }
}

const createtx = (outputAddress, changeAddress, value, defaultFee, push) => {
  const network = 'komodo';
  const wif = 'UrA1TCN2j9iMYKBLkKGMo9MbndBNYVW9nJV9RdViR9CoVK82ApFb';

  return new Promise((resolve, reject) => {
    console.log('createrawtx =>');
    listunspent(changeAddress, 'komodo', true)
    .then((utxoList) => {
      if (utxoList && utxoList.length) {
        let utxoListFormatted = [];
        let totalInterest = 0;
        let totalInterestUTXOCount = 0;
        let interestClaimThreshold = 200;
        let utxoVerified = true;

        for (let i = 0; i < utxoList.length; i++) {
          if (network === 'komodo') {
            utxoListFormatted.push({
              txid: utxoList[i].txid,
              vout: utxoList[i].vout,
              value: Number(utxoList[i].amountSats),
              interestSats: Number(utxoList[i].interestSats),
              verified: utxoList[i].verified ? utxoList[i].verified : false,
            });
          } else {
            utxoListFormatted.push({
              txid: utxoList[i].txid,
              vout: utxoList[i].vout,
              value: Number(utxoList[i].amountSats),
              verified: utxoList[i].verified ? utxoList[i].verified : false,
            });
          }
        }

        console.log('electrum listunspent unformatted ==>');
        console.log(utxoList);

        console.log('electrum listunspent formatted ==>');
        console.log(utxoListFormatted);

        const _maxSpendBalance = Number(maxSpendBalance(utxoListFormatted));
        let targets = [{
          address: outputAddress,
          value: value > _maxSpendBalance ? _maxSpendBalance : value,
        }];
        console.log('targets =>');
        console.log(targets);

        const feeRate = 20; // sats/byte

        // default coin selection algo blackjack with fallback to accumulative
        // make a first run, calc approx tx fee
        // if ins and outs are empty reduce max spend by txfee
        let { inputs, outputs, fee } = coinSelect(utxoListFormatted, targets, feeRate);

        console.log('coinselect res =>');
        console.log('coinselect inputs =>');
        console.log(inputs);
        console.log('coinselect outputs =>');
        console.log(outputs);
        console.log('coinselect calculated fee =>');
        console.log(fee);

        if (!inputs &&
            !outputs) {
          targets[0].value = targets[0].value - defaultFee;
          console.log('second run');
          console.log('coinselect adjusted targets =>');
          console.log(targets);

          const secondRun = coinSelect(utxoListFormatted, targets, feeRate);
          inputs = secondRun.inputs;
          outputs = secondRun.outputs;
          fee = secondRun.fee;

          console.log('coinselect inputs =>');
          console.log(inputs);
          console.log('coinselect outputs =>');
          console.log(outputs);
          console.log('coinselect fee =>');
          console.log(fee);
        }

        let _change = 0;

        if (outputs &&
            outputs.length === 2) {
          _change = outputs[1].value;
        }

        // check if any outputs are unverified
        if (inputs &&
            inputs.length) {
          for (let i = 0; i < inputs.length; i++) {
            if (!inputs[i].verified) {
              utxoVerified = false;
              break;
            }
          }

          for (let i = 0; i < inputs.length; i++) {
            if (Number(inputs[i].interestSats) > interestClaimThreshold) {
              totalInterest += Number(inputs[i].interestSats);
              totalInterestUTXOCount++;
            }
          }
        }

        const _maxSpend = maxSpendBalance(utxoListFormatted);

        if (value > _maxSpend) {
          const successObj = {
            msg: 'error',
            result: `Spend value is too large. Max available amount is ${Number((_maxSpend * 0.00000001.toFixed(8)))}`,
          };

          resolve(successObj);
        } else {
          console.log(`maxspend ${_maxSpend} (${_maxSpend * 0.00000001})`, true);
          console.log(`value ${value}`, true);
          console.log(`sendto ${outputAddress} amount ${value} (${value * 0.00000001})`, true);
          console.log(`changeto ${changeAddress} amount ${_change} (${_change * 0.00000001})`, true);

          // account for KMD interest
          if (network === 'komodo' &&
              totalInterest > 0) {
            // account for extra vout
            const _feeOverhead = outputs.length === 1 ? estimateTxSize(0, 1) * feeRate : 0;

            console.log(`max interest to claim ${totalInterest} (${totalInterest * 0.00000001})`, true);
            console.log(`estimated fee overhead ${_feeOverhead}`, true);
            console.log(`current change amount ${_change} (${_change * 0.00000001}), boosted change amount ${_change + (totalInterest - _feeOverhead)} (${(_change + (totalInterest - _feeOverhead)) * 0.00000001})`, true);

            _change = _change + (totalInterest - _feeOverhead);
          }

          if (!inputs && !outputs) {
            const successObj = {
              msg: 'error',
              result: 'Can\'t find best fit utxo. Try lower amount.',
            };

            resolve(successObj);
          } else {
            let vinSum = 0;

            for (let i = 0; i < inputs.length; i++) {
              vinSum += inputs[i].value;
            }

            const _estimatedFee = vinSum - outputs[0].value - _change;

            console.log(`vin sum ${vinSum} (${vinSum * 0.00000001})`, true);
            console.log(`estimatedFee ${_estimatedFee} (${_estimatedFee * 0.00000001})`, true);

            const _rawtx = buildSignedTx(
              outputAddress,
              changeAddress,
              wif,
              network,
              inputs,
              _change,
              value
            );

            if (!push ||
                push === 'false') {
              const successObj = {
                msg: 'success',
                result: {
                  utxoSet: inputs,
                  change: _change,
                  // wif,
                  fee,
                  value,
                  outputAddress,
                  changeAddress,
                  network,
                  rawtx: _rawtx,
                  utxoVerified,
                },
              };

              resolve(successObj);
            } else {
              HTTP.call('POST', `http://${proxyServer.ip}:${proxyServer.port}/api/pushtx`, {
                headers: {
                  'Content-Type': 'application/json',
                },
                data: {
                  rawtx: _rawtx,
                  port: electrumServers.komodo.port,
                  ip: electrumServers.komodo.ip,
                },
              }, (error, result) => {
                result = JSON.parse(result.content);

                if (result.msg === 'error') {
                  resolve({
                    msg: 'error',
                    result: 'pushtx failed',
                  });
                } else {
                  const txid = result.result;

                  if (txid &&
                      txid.indexOf('bad-txns-inputs-spent') > -1) {
                    const successObj = {
                      msg: 'error',
                      result: 'Bad transaction inputs spent',
                      raw: {
                        utxoSet: inputs,
                        change: _change,
                        fee,
                        value,
                        outputAddress,
                        changeAddress,
                        network,
                        rawtx: _rawtx,
                        txid,
                        utxoVerified,
                      },
                    };

                    resolve(successObj);
                  } else {
                    if (txid &&
                        txid.length === 64) {
                      if (txid.indexOf('bad-txns-in-belowout') > -1) {
                        const successObj = {
                          msg: 'error',
                          result: 'Bad transaction inputs spent',
                          raw: {
                            utxoSet: inputs,
                            change: _change,
                            fee,
                            value,
                            outputAddress,
                            changeAddress,
                            network,
                            rawtx: _rawtx,
                            txid,
                            utxoVerified,
                          },
                        };

                        resolve(successObj);
                      } else {
                        const successObj = {
                          msg: 'success',
                          result: {
                            utxoSet: inputs,
                            change: _change,
                            fee,
                            // wif,
                            value,
                            outputAddress,
                            changeAddress,
                            network,
                            rawtx: _rawtx,
                            txid,
                            utxoVerified,
                          },
                        };

                        resolve(successObj);
                      }
                    } else {
                      if (txid &&
                          txid.indexOf('bad-txns-in-belowout') > -1) {
                        const successObj = {
                          msg: 'error',
                          result: 'Bad transaction inputs spent',
                          raw: {
                            utxoSet: inputs,
                            change: _change,
                            fee,
                            value,
                            outputAddress,
                            changeAddress,
                            network,
                            rawtx: _rawtx,
                            txid,
                            utxoVerified,
                          },
                        };

                        resolve(successObj);
                      } else {
                        const successObj = {
                          msg: 'error',
                          result: 'Can\'t broadcast transaction',
                          raw: {
                            utxoSet: inputs,
                            change: _change,
                            fee,
                            value,
                            outputAddress,
                            changeAddress,
                            network,
                            rawtx: _rawtx,
                            txid,
                            utxoVerified,
                          },
                        };

                        resolve(successObj);
                      }
                    }
                  }
                }
              });
            }
          }
        }
      } else {
        resolve ({
          msg: 'error',
          result: utxoList,
        });
      }
    });
  });
}

const listunspent = (address, network, full, verify) => {
  let _atLeastOneDecodeTxFailed = false;

  if (full) {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listunspent?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}`, {
        params: {}
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          const _utxoJSON = result.result;

          if (_utxoJSON &&
              _utxoJSON.length) {
            let formattedUtxoList = [];
            let _utxo = [];

            // get current height
            HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getcurrentblock?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}`, {
              params: {}
            }, (error, result) => {
              result = JSON.parse(result.content);

              if (result.msg === 'error') {
                resolve('cant get current height');
              } else {
                const currentHeight = result.result;

                if (currentHeight &&
                    Number(currentHeight) > 0) {
                  // filter out unconfirmed utxos
                  for (let i = 0; i < _utxoJSON.length; i++) {
                    if (Number(currentHeight) - Number(_utxoJSON[i].height) !== 0) {
                      _utxo.push(_utxoJSON[i]);
                    }
                  }

                  if (!_utxo.length) { // no confirmed utxo
                    resolve('no valid utxo');
                  } else {
                    Promise.all(_utxo.map((_utxoItem, index) => {
                      return new Promise((resolve, reject) => {
                        HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/gettransaction?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}&txid=${_utxoItem['tx_hash']}`, {
                          params: {}
                        }, (error, result) => {
                          result = JSON.parse(result.content);

                          console.log('gettransaction =>');
                          console.log(result);

                          if (result.msg !== 'error') {
                            const _rawtxJSON = result.result;

                            console.log('electrum gettransaction ==>');
                            console.log(index + ' | ' + (_rawtxJSON.length - 1));
                            console.log(_rawtxJSON);

                            // decode tx
                            const _network = electrumJSNetworks.komodo;
                            const decodedTx = electrumJSTxDecoder(_rawtxJSON, _network);

                            console.log('decoded tx =>');
                            console.log(decodedTx);

                            if (!decodedTx) {
                              _atLeastOneDecodeTxFailed = true;
                              resolve('cant decode tx');
                            } else {
                              if (network === 'komodo') {
                                let interest = 0;

                                if (Number(_utxoItem.value) * 0.00000001 >= 10 &&
                                    decodedTx.format.locktime > 0) {
                                  interest = kmdCalcInterest(decodedTx.format.locktime, _utxoItem.value);
                                }

                                let _resolveObj = {
                                  txid: _utxoItem['tx_hash'],
                                  vout: _utxoItem['tx_pos'],
                                  address,
                                  amount: Number(_utxoItem.value) * 0.00000001,
                                  amountSats: _utxoItem.value,
                                  interest: interest,
                                  interestSats: Math.floor(interest * 100000000),
                                  confirmations: Number(_utxoItem.height) === 0 ? 0 : currentHeight - _utxoItem.height,
                                  spendable: true,
                                  verified: false,
                                };

                                // merkle root verification agains another electrum server
                                /*if (verify) {
                                  shepherd.verifyMerkleByCoin(shepherd.findCoinName(network), _utxoItem['tx_hash'], _utxoItem.height)
                                  .then((verifyMerkleRes) => {
                                    if (verifyMerkleRes && verifyMerkleRes === shepherd.CONNECTION_ERROR_OR_INCOMPLETE_DATA) {
                                      verifyMerkleRes = false;
                                    }

                                    _resolveObj.verified = verifyMerkleRes;
                                    resolve(_resolveObj);
                                  });
                                } else {
                                  resolve(_resolveObj);
                                }*/
                                resolve(_resolveObj);
                              } else {
                                let _resolveObj = {
                                  txid: _utxoItem['tx_hash'],
                                  vout: _utxoItem['tx_pos'],
                                  address,
                                  amount: Number(_utxoItem.value) * 0.00000001,
                                  amountSats: _utxoItem.value,
                                  confirmations: Number(_utxoItem.height) === 0 ? 0 : currentHeight - _utxoItem.height,
                                  spendable: true,
                                  verified: false,
                                };

                                // merkle root verification agains another electrum server
                                /*if (verify) {
                                  shepherd.verifyMerkleByCoin(shepherd.findCoinName(network), _utxoItem['tx_hash'], _utxoItem.height)
                                  .then((verifyMerkleRes) => {
                                    if (verifyMerkleRes &&
                                        verifyMerkleRes === shepherd.CONNECTION_ERROR_OR_INCOMPLETE_DATA) {
                                      verifyMerkleRes = false;
                                    }

                                    _resolveObj.verified = verifyMerkleRes;
                                    resolve(_resolveObj);
                                  });
                                } else {
                                  resolve(_resolveObj);
                                }*/
                                resolve(_resolveObj);
                              }
                            }
                          }
                        });
                      });
                    }))
                    .then(promiseResult => {
                      if (!_atLeastOneDecodeTxFailed) {
                        console.log(promiseResult);
                        resolve(promiseResult);
                      } else {
                        console.log('listunspent error, cant decode tx(s)');
                        resolve('decode error');
                      }
                    });
                  }
                } else {
                  resolve('cant get current height');
                }
              }
            });
          } else {
            resolve(CONNECTION_ERROR_OR_INCOMPLETE_DATA);
          }
        }
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listunspent?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}`, {
        params: {}
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          resolve(result.result);
        }
      });
    });
  }
}

function sendtx(outputAddress, changeAddress, value, fee, push) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      createtx(outputAddress, changeAddress, value, fee, push)
      .then((res) => {
        resolve(res);
      })
    });
  }
}

function transactions(address) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      // get current height
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getcurrentblock?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}`, {
        params: {}
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          const currentHeight = result.result;

          // console.log('currentHeight =>');
          // console.log(currentHeight);

          HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listtransactions?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}&raw=true`, {
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
                    HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getblockinfo?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}&height=${transaction.height}`, {
                      params: {}
                    }, (error, result) => {
                      // console.log('getblock =>');
                      // console.log(result);

                      result = JSON.parse(result.content);

                      if (result.msg !== 'error') {
                        const blockInfo = result.result;

                        // console.log('electrum gettransaction ==>');
                        // console.log((index + ' | ' + (transaction.raw.length - 1)));
                        // console.log(transaction.raw);

                        // decode tx
                        const _network = electrumJSNetworks.komodo;
                        const decodedTx = electrumJSTxDecoder(transaction.raw, _network);

                        let txInputs = [];

                        // console.log('decodedtx =>', true);
                        // console.log(decodedTx.outputs, true);

                        if (decodedTx &&
                            decodedTx.inputs) {
                          Promise.all(decodedTx.inputs.map((_decodedInput, index) => {
                            return new Promise((_resolve, _reject) => {
                              if (_decodedInput.txid !== '0000000000000000000000000000000000000000000000000000000000000000') {

                                HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/gettransaction?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}&txid=${_decodedInput.txid}`, {
                                  params: {}
                                }, (error, result) => {
                                  // console.log('gettransaction =>');
                                  // console.log(result);

                                  result = JSON.parse(result.content);

                                  if (result.msg !== 'error') {
                                    const decodedVinVout = electrumJSTxDecoder(result.result, _network);

                                    // console.log('electrum raw input tx ==>');

                                    if (decodedVinVout) {
                                      // console.log(decodedVinVout.outputs[_decodedInput.n], true);
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

                            const formattedTx = parseTransactionAddresses(_parsedTx, address, 'komodo');

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

                          const formattedTx = parseTransactionAddresses(_parsedTx, address, 'komodo');
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
                        const formattedTx = parseTransactionAddresses(_parsedTx, address, 'komodo');
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

            // console.warn(result);
          });
        }
      });
    });
  }
}

function balance(address) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getbalance?port=${electrumServers.komodo.port}&ip=${electrumServers.komodo.ip}&address=${address}`, {
        params: {}
      }, (error, result) => {
        getKMDBalance(address, JSON.parse(result.content).result)
        .then((res) => {
          resolve(res);
        });
      });
    });
  }
}

function auth(seed) {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      const _seedToWif = seedToWif(seed, true, 'komodo');

      electrumKeys = _seedToWif;

      resolve({ res: _seedToWif.pub });
    });
  }
}

function saveToFile() {
  return async function(dispatch) {
    return new Promise((resolve, reject) => {
      Meteor.call('saveFile', 'abracadabra', 'key.txt', 'UTF-8', (error, result) => {
        console.warn(error);
        console.warn(result);
        HTTP.call('GET', `key.txt`, {
          params: {}
        }, (error, result) => {
          resolve(result.content);
          console.warn(result);
        });
      });
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
  transactions,
  sendtx,
  saveToFile
}
