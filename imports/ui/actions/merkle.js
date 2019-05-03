import { Promise } from 'meteor/promise';
import { devlog } from './dev';
import { getRandomIntInclusive } from 'agama-wallet-lib/build/utils';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import getMerkleRoot from 'agama-wallet-lib/build/transaction-merkle';
import getServerVersion from './serverVersion';

// TODO: reduce verifymerkle to a single call if array

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

const verifyMerkle = (txid, height, serverList, electrumServer, proxyServer, cache, network) => {
  // select random server
  return new Promise((resolve, reject) => {
    if (serverList.length === 0) {
      resolve(false);
    } else {
      const _rnd = getRandomIntInclusive(0, serverList.length - 1);
      const randomServer = serverList[_rnd];
      const _randomServer = randomServer.split(':');
      const _currentServer = electrumServer;

      devlog(`current server: ${JSON.stringify(_currentServer)}`);
      devlog(`verification server: ${randomServer}`);

      let params = {
        port: electrumServer.port,
        ip: electrumServer.ip,
        proto: electrumServer.proto,
        txid,
        height,
      };
      devlog('req', {
        method: 'GET',
        url: `http://${proxyServer.ip}:${proxyServer.port}/api/getmerkle`,
        params,
      });

      HTTP.call(
        'GET',
        `http://${proxyServer.ip}:${proxyServer.port}/api/getmerkle`,
      {
        params,
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve(CONNECTION_ERROR_OR_INCOMPLETE_DATA);
        } else {
          const merkleData = result.result;

          if (merkleData &&
              merkleData.merkle &&
              merkleData.pos) {
            devlog('electrum getmerkle =>');
            devlog(merkleData);

            const _res = getMerkleRoot(txid, merkleData.merkle, merkleData.pos);
            devlog(_res, true);

            (async function() {
              const isElectrumProtocolV4 = await getServerVersion(
                proxyServer,
                _randomServer[1],
                _randomServer[0],
                _randomServer[2],
              );

              cache.getBlockheader(
                height,
                network,
                {
                  url: `http://${proxyServer.ip}:${proxyServer.port}/api/getblockinfo`,
                  params: {
                    ip: _randomServer[0],
                    port: _randomServer[1],
                    proto: _randomServer[2],
                    height,
                    isElectrumProtocolV4,
                  },
                }
              )
              .then((result) => {
                result = JSON.parse(result.content);

                if (result.msg === 'error') {
                  resolve(CONNECTION_ERROR_OR_INCOMPLETE_DATA);
                } else {
                  const blockInfo = result.result;

                  if (blockInfo &&
                      blockInfo.merkle_root) {
                    devlog('blockinfo =>');
                    devlog(blockInfo);
                    devlog(blockInfo.merkle_root);

                    if (blockInfo &&
                        blockInfo.merkle_root) {
                      if (_res === blockInfo.merkle_root) {
                        devlog(`txid ${txid} verified`);
                        resolve(true);
                      } else {
                        devlog(`txid ${txid} unverified`);
                        resolve(false);
                      }
                    } else {
                      resolve(CONNECTION_ERROR_OR_INCOMPLETE_DATA);
                    }
                  } else {
                    resolve(CONNECTION_ERROR_OR_INCOMPLETE_DATA);
                  }
                }
              });
            })();
          } else {
            resolve(CONNECTION_ERROR_OR_INCOMPLETE_DATA);
          }
        }
      });
    }
  });
}

const verifyMerkleByCoin = (txid, height, electrumServer, proxyServer, cache, network) => {
  const _serverList = electrumServer.serverList;

  devlog('verifyMerkleByCoin');
  devlog(`server ip ${electrumServer.ip}`);
  devlog(`server port ${electrumServer.port}`);
  devlog(electrumServer.serverList);

  return new Promise((resolve, reject) => {
    if (_serverList !== 'none') {
      let _filteredServerList = [];

      for (let i = 0; i < _serverList.length; i++) {
        if (_serverList[i] !== `${electrumServer.ip}:${electrumServer.port}:${electrumServer.proto}`) {
          _filteredServerList.push(_serverList[i]);
        }
      }

      verifyMerkle(
        txid,
        height,
        _filteredServerList,
        electrumServer,
        proxyServer,
        cache,
        network
      )
      .then((proof) => {
        resolve(proof);
      });
    } else {
      resolve(false);
    }
  });
}

export default verifyMerkleByCoin;