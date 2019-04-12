import { Promise } from 'meteor/promise';
import { devlog } from './dev';
import kmdCalcInterest from 'agama-wallet-lib/build/komodo-interest';
import { isKomodoCoin } from 'agama-wallet-lib/build/coin-helpers';
import verifyMerkleByCoin from './merkle';
import {
  fromSats,
  toSats,
} from 'agama-wallet-lib/build/utils';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import electrumJSTxDecoder from 'agama-wallet-lib/build/transaction-decoder';
import dpowCoins from 'agama-wallet-lib/build/electrum-servers-dpow';

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

const listunspent = (proxyServer, electrumServer, address, network, full, verify, cache) => {
  let _atLeastOneDecodeTxFailed = false;
  let params = {
    port: electrumServer.port,
    ip: electrumServer.ip,
    proto: electrumServer.proto,
    address,
  };

  if (dpowCoins.indexOf(network.toUpperCase()) > -1) {
    devlog(`${network} spv dpow enabled listunspent, req verbose tx data`);
    params.verbose = true;
  }

  devlog('req', {
    method: 'GET',
    url: `http://${proxyServer.ip}:${proxyServer.port}/api/listunspent`,
    params,
  });

  if (full) {
    return new Promise((resolve, reject) => {      
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/listunspent`, {
        params,
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
            
            params = {
              port: electrumServer.port,
              ip: electrumServer.ip,
              proto: electrumServer.proto,
            };
            
            devlog('req', {
              method: 'GET',
              url: `http://${proxyServer.ip}:${proxyServer.port}/api/getcurrentblock`,
              params,
            });
                      
            // get current height
            HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getcurrentblock`, {
              params,
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
                    if ((Number(currentHeight) - Number(_utxoJSON[i].height) + 1) >= 0) {
                      _utxo.push(_utxoJSON[i]);
                    }
                  }

                  if (!_utxo.length) { // no confirmed utxo
                    resolve('no valid utxo');
                  } else {
                    Promise.all(_utxo.map((_utxoItem, index) => {
                      return new Promise((resolve, reject) => {
                        cache.getTransaction(
                          _utxoItem.tx_hash,
                          network,
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
                          result = JSON.parse(result.content);

                          devlog('gettransaction =>');
                          devlog(result);

                          if (result.msg !== 'error') {
                            const _rawtxJSON = result.result;

                            devlog('electrum gettransaction ==>');
                            devlog(`${index} | ${(_rawtxJSON.length - 1)}`);
                            devlog(_rawtxJSON);

                            // decode tx
                            const _network = electrumJSNetworks[network.toLowerCase()] || electrumJSNetworks[isKomodoCoin(network) ? 'kmd' : network];
                            let decodedTx;
                            
                            if (cache.getDecodedTransaction(_utxoItem.tx_hash, network)) {
                              decodedTx = cache.getDecodedTransaction(_utxoItem.tx_hash, network);
                            } else {
                              decodedTx = electrumJSTxDecoder(_rawtxJSON, _network);
                              cache.getDecodedTransaction(_utxoItem.tx_hash, network, decodedTx);
                            }

                            devlog('decoded tx =>');
                            devlog(decodedTx);

                            if (!decodedTx) {
                              _atLeastOneDecodeTxFailed = true;
                              resolve('cant decode tx');
                            } else {
                              if (network === 'kmd') {
                                let interest = 0;

                                if (Number(fromSats(_utxoItem.value)) >= 10 &&
                                    decodedTx.format.locktime > 0) {
                                  interest = kmdCalcInterest(decodedTx.format.locktime, _utxoItem.value, _utxoItem.height);
                                }

                                let _resolveObj = {
                                  txid: _utxoItem.tx_hash,
                                  vout: _utxoItem.tx_pos,
                                  address,
                                  amount: Number(fromSats(_utxoItem.value)),
                                  amountSats: _utxoItem.value,
                                  interest: interest,
                                  interestSats: Math.floor(toSats(interest)),
                                  confirmations: Number(_utxoItem.height) === 0 ? 0 : currentHeight - _utxoItem.height + 1,
                                  spendable: true,
                                  verified: false,
                                  locktime: decodedTx.format.locktime,
                                };

                                if (dpowCoins.indexOf(network.toUpperCase()) > -1 &&
                                    _utxoItem.hasOwnProperty('verbose')) {
                                  _resolveObj.dpowSecured = false;
    
                                  if (_utxoItem.verbose.hasOwnProperty('confirmations')) {
                                    if (_utxoItem.verbose.confirmations >= 2) {
                                      _resolveObj.dpowSecured = true;
                                    } 
                                  }
                                }

                                // merkle root verification agains another electrum server
                                if (verify) {
                                  verifyMerkleByCoin(
                                    _utxoItem.tx_hash,
                                    _utxoItem.height,
                                    electrumServer,
                                    proxyServer,
                                    cache,
                                    network
                                  )
                                  .then((verifyMerkleRes) => {
                                    if (verifyMerkleRes &&
                                        verifyMerkleRes === CONNECTION_ERROR_OR_INCOMPLETE_DATA) {
                                      verifyMerkleRes = false;
                                    }

                                    _resolveObj.verified = verifyMerkleRes;
                                    resolve(_resolveObj);
                                  });
                                } else {
                                  resolve(_resolveObj);
                                }
                              } else {
                                let _resolveObj = {
                                  txid: _utxoItem.tx_hash,
                                  vout: _utxoItem.tx_pos,
                                  address,
                                  amount: Number(fromSats(_utxoItem.value)),
                                  amountSats: _utxoItem.value,
                                  confirmations: Number(_utxoItem.height) === 0 ? 0 : currentHeight - _utxoItem.height + 1,
                                  currentHeight,
                                  spendable: true,
                                  verified: false,
                                };

                                if (dpowCoins.indexOf(network.toUpperCase()) > -1 &&
                                    _utxoItem.hasOwnProperty('verbose')) {
                                  _resolveObj.dpowSecured = false;

                                  if (_utxoItem.verbose.hasOwnProperty('confirmations')) {
                                    if (_utxoItem.verbose.confirmations >= 2) {
                                      _resolveObj.dpowSecured = true;
                                    } 
                                  }
                                }
                                
                                // merkle root verification agains another electrum server
                                if (verify) {
                                  verifyMerkleByCoin(
                                    _utxoItem.tx_hash,
                                    _utxoItem.height,
                                    electrumServer,
                                    proxyServer,
                                    cache,
                                    network
                                  )
                                  .then((verifyMerkleRes) => {
                                    if (verifyMerkleRes &&
                                        verifyMerkleRes === CONNECTION_ERROR_OR_INCOMPLETE_DATA) {
                                      verifyMerkleRes = false;
                                    }

                                    _resolveObj.verified = verifyMerkleRes;
                                    resolve(_resolveObj);
                                  });
                                } else {
                                  resolve(_resolveObj);
                                }
                              }
                            }
                          }
                        });
                      });
                    }))
                    .then(promiseResult => {
                      if (!_atLeastOneDecodeTxFailed) {
                        devlog(`${network} listunspent`, promiseResult);
                        resolve(promiseResult);
                      } else {
                        devlog('listunspent error, cant decode tx(s)');
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
      HTTP.call(
        'GET',
        `http://${proxyServer.ip}:${proxyServer.port}/api/listunspent`,
      {
        params,
      }, (error, result) => {
        result = JSON.parse(result.content);

        resolve(result.msg === 'error' ? 'error' : result.result);
      });
    });
  }
};

export default listunspent;