import { Promise } from 'meteor/promise';
import { devlog } from './dev';
import { isKomodoCoin } from 'agama-wallet-lib/build/coin-helpers';
import parseTransactionAddresses from 'agama-wallet-lib/build/transaction-type';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import electrumJSTxDecoder from 'agama-wallet-lib/build/transaction-decoder';
import dpowCoins from 'agama-wallet-lib/build/electrum-servers-dpow';
import { sortTransactions } from 'agama-wallet-lib/build/utils';
import getServerVersion from './serverVersion';
import { pubToElectrumScriptHashHex } from 'agama-wallet-lib/build/keys';

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

const listtransactions = (proxyServer, electrumServer, address, network, full, cache, txid) => {
  return new Promise((resolve, reject) => {
    (async function() {
      const isElectrumProtocolV4 = await getServerVersion(
        proxyServer,
        electrumServer.ip,
        electrumServer.port,
        electrumServer.proto
      );

      // get current height
      let params = {
        port: electrumServer.port,
        ip: electrumServer.ip,
        proto: electrumServer.proto,
      };

      devlog('req', {
        method: 'GET',
        url: `http://${proxyServer.ip}:${proxyServer.port}/api/getcurrentblock`,
        params,
      });
      
      HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getcurrentblock`, {
        params,
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          const currentHeight = result.result;

          devlog('currentHeight =>');
          devlog(currentHeight);

          let params = {
            port: electrumServer.port,
            ip: electrumServer.ip,
            proto: electrumServer.proto,
            address,
            raw: true,
            // maxlength: 2,
          };

          if (txid) {
            delete params.raw;
          }

          if (isElectrumProtocolV4 === true) {
            params.eprotocol = 1.4;
            params.address = pubToElectrumScriptHashHex(
              params.address,
              electrumJSNetworks[network.split('|')[0].toLowerCase()] || electrumJSNetworks.kmd
            );
          }

          if (dpowCoins.indexOf(network.toUpperCase()) > -1) {
            devlog(`${network} spv dpow enabled listtransactions, req verbose tx data`);
            params.verbose = true;
          }

          devlog('req', {
            method: 'GET',
            url: `http://${proxyServer.ip}:${proxyServer.port}/api/listtransactions`,
            params,
          });
          
          HTTP.call(
            'GET',
            `http://${proxyServer.ip}:${proxyServer.port}/api/listtransactions`,
          {
            params,
          }, (error, result) => {
            result = JSON.parse(result.content);

            if (result.msg !== 'error') {
              let _transactions = [];

              // parse listtransactions
              let json = result.result;

              if (json &&
                  json.length) {
                let _rawtx = [];

                const fetchTransactions = () => {
                  Promise.all(json.map((transaction, index) => {
                    return new Promise((resolve, reject) => {
                      cache.getBlockheader(
                        transaction.height,
                        network,
                        {
                          url: `http://${proxyServer.ip}:${proxyServer.port}/api/getblockinfo`,
                          params: {
                            port: electrumServer.port,
                            ip: electrumServer.ip,
                            proto: electrumServer.proto,
                            height: transaction.height,
                            isElectrumProtocolV4,
                          },
                        }
                      )
                      .then((result) => {
                        devlog('getblock =>');
                        devlog(result);

                        result = JSON.parse(result.content);

                        if (result.msg !== 'error') {
                          const blockInfo = result.result;

                          devlog('electrum gettransaction ==>');
                          devlog(`${index} | ${(transaction.raw.length - 1)}`);
                          devlog(transaction.raw);

                          // decode tx
                          const _network = electrumJSNetworks[network.toLowerCase()] || electrumJSNetworks[isKomodoCoin(network) || network === 'kmd' ? 'kmd' : network];
                          const decodedTx = electrumJSTxDecoder(transaction.raw, _network);

                          let txInputs = [];

                          devlog('decodedtx =>');
                          devlog(decodedTx.outputs);

                          if (decodedTx &&
                              decodedTx.inputs) {
                            Promise.all(decodedTx.inputs.map((_decodedInput, index) => {
                              return new Promise((_resolve, _reject) => {
                                if (_decodedInput.txid !== '0000000000000000000000000000000000000000000000000000000000000000') {
                                  cache.getTransaction(
                                    _decodedInput.txid,
                                    network,
                                    {
                                      url: `http://${proxyServer.ip}:${proxyServer.port}/api/gettransaction`,
                                      params: {
                                        port: electrumServer.port,
                                        ip: electrumServer.ip,
                                        proto: electrumServer.proto,
                                        txid: _decodedInput.txid,
                                      },
                                    }
                                  )
                                  .then((result) => {
                                    devlog('gettransaction =>');
                                    devlog(result);

                                    result = JSON.parse(result.content);

                                    if (result.msg !== 'error') {
                                      let decodedVinVout;

                                      if (cache.getDecodedTransaction(_decodedInput.txid, network)) {
                                        decodedVinVout = cache.getDecodedTransaction(_decodedInput.txid, network);
                                      } else {
                                        decodedVinVout = electrumJSTxDecoder(result.result, _network);
                                        cache.getDecodedTransaction(_decodedInput.txid, network, decodedVinVout);
                                      }

                                      devlog('electrum raw input tx ==>');

                                      if (decodedVinVout) {
                                        devlog(decodedVinVout.outputs[_decodedInput.n], true);
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
                                confirmations: Number(transaction.height) === 0 ? 0 : currentHeight - transaction.height + 1,
                              };

                              const formattedTx = parseTransactionAddresses(_parsedTx, address, network === 'kmd' ? true : false);

                              if (formattedTx.type) {
                                formattedTx.height = transaction.height;
                                formattedTx.blocktime = blockInfo.timestamp;
                                formattedTx.timereceived = blockInfo.timereceived;
                                formattedTx.hex = transaction.raw;
                                formattedTx.inputs = decodedTx.inputs;
                                formattedTx.outputs = decodedTx.outputs;
                                formattedTx.locktime = decodedTx.format.locktime;

                                if (dpowCoins.indexOf(network.toUpperCase()) > -1 &&
                                    transaction.hasOwnProperty('verbose')) {
                                  formattedTx.dpowSecured = false;
    
                                  if (transaction.verbose.hasOwnProperty('confirmations')) {
                                    if (transaction.verbose.confirmations >= 2) {
                                      formattedTx.dpowSecured = true;
                                      formattedTx.rawconfirmations = formattedTx.confirmations;
                                    } else {
                                      formattedTx.confirmations = transaction.verbose.confirmations;
                                      formattedTx.rawconfirmations = transaction.verbose.rawconfirmations;
                                    }             
                                  }
                                }

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

                                if (dpowCoins.indexOf(network.toUpperCase()) > -1 &&
                                    transaction.hasOwnProperty('verbose')) {
                                  formattedTx[0].dpowSecured = false;
                                  formattedTx[1].dpowSecured = false;
    
                                  if (transaction.verbose.hasOwnProperty('confirmations')) {
                                    if (transaction.verbose.confirmations >= 2) {
                                      formattedTx[0].dpowSecured = true;
                                      formattedTx[0].rawconfirmations = formattedTx[0].confirmations;
                                      formattedTx[1].dpowSecured = true;
                                      formattedTx[1].rawconfirmations = formattedTx[1].confirmations;
                                    } else {
                                      formattedTx[0].confirmations = transaction.verbose.confirmations;
                                      formattedTx[0].rawconfirmations = transaction.verbose.rawconfirmations;
                                      formattedTx[1].confirmations = transaction.verbose.confirmations;
                                      formattedTx[1].rawconfirmations = transaction.verbose.rawconfirmations;
                                    }
                                  }
                                }

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
                              confirmations: Number(transaction.height) === 0 ? 0 : currentHeight - transaction.height + 1,
                            };

                            const formattedTx = parseTransactionAddresses(_parsedTx, address, network === 'kmd' ? true : false);
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
                            confirmations: Number(transaction.height) === 0 ? 0 : currentHeight - transaction.height + 1,
                          };
                          const formattedTx = parseTransactionAddresses(_parsedTx, address, network === 'kmd' ? true : false);
                          _rawtx.push(formattedTx);
                          resolve(true);
                        }
                      });
                    });
                  }))
                  .then(promiseResult => {
                    _rawtx = sortTransactions(_rawtx);
                    resolve(_rawtx);
                  });
                };

                if (txid) {
                  cache.getTransaction(
                    txid,
                    network,
                    {
                      url: `http://${proxyServer.ip}:${proxyServer.port}/api/gettransaction`,
                      params: {
                        port: electrumServer.port,
                        ip: electrumServer.ip,
                        proto: electrumServer.proto,
                        txid: txid,
                      },
                    }
                  )
                  .then((result) => {
                    devlog('gettransaction =>');
                    devlog(result);

                    result = JSON.parse(result.content);

                    if (result.msg !== 'error') {
                      for (let i = 0; i < json.length; i++) {
                        if (json[i].tx_hash === txid) {
                          json = [json[i]];
                          json[0].raw = result.result;
                          break;
                        }
                      }
                    }

                    fetchTransactions();
                  });
                } else {
                  fetchTransactions();
                }
              } else {
                // empty history
                resolve([]);
              }
            } else {
              resolve('error');
            }

            devlog(result);
          });
        }
      });
    })();
  });
};

export default listtransactions;