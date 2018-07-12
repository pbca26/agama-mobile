import crypto from 'crypto';
import reverse from 'buffer-reverse';
import { Promise } from 'meteor/promise';
import { devlog } from './dev';
import { getRandomIntInclusive } from 'agama-wallet-lib/build/utils';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';

const CONNECTION_ERROR_OR_INCOMPLETE_DATA = 'connection error or incomplete data';

// get merkle root
const getMerkleRoot = (txid, proof, pos) => {
  const _sha256 = (data) => {
    return crypto.createHash('sha256').update(data).digest();
  }
  let hash = txid;
  let serialized;

  devlog(`getMerkleRoot txid ${txid}`);
  devlog(`getMerkleRoot pos ${pos}`);
  devlog('getMerkleRoot proof');
  devlog(`getMerkleRoot ${proof}`);

  for (i = 0; i < proof.length; i++) {
    const _hashBuff = new Buffer(hash, 'hex');
    const _proofBuff = new Buffer(proof[i], 'hex');

    if ((pos & 1) == 0) {
      serialized = Buffer.concat([reverse(_hashBuff), reverse(_proofBuff)]);
    } else {
      serialized = Buffer.concat([reverse(_proofBuff), reverse(_hashBuff)]);
    }

    hash = reverse(_sha256(_sha256(serialized))).toString('hex');
    pos /= 2;
  }

  return hash;
}

const verifyMerkle = (txid, height, serverList, electrumServer, proxyServer, cache, network) => {
  // select random server
  const _rnd = getRandomIntInclusive(0, serverList.length - 1);
  const randomServer = serverList[_rnd];
  const _randomServer = randomServer.split(':');
  const _currentServer = electrumServer;

  devlog(`current server: ${_currentServer}`);
  devlog(`verification server: ${randomServer}`);

  return new Promise((resolve, reject) => {
    HTTP.call('GET', `http://${proxyServer.ip}:${proxyServer.port}/api/getmerkle`, {
      params: {
        port: electrumServer.port,
        ip: electrumServer.ip,
        proto: electrumServer.proto,
        txid,
        height,
      },
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
                  blockInfo['merkle_root']) {
                devlog('blockinfo =>');
                devlog(blockInfo);
                devlog(blockInfo['merkle_root']);

                if (blockInfo &&
                    blockInfo['merkle_root']) {
                  if (_res === blockInfo['merkle_root']) {
                    resolve(true);
                  } else {
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
        } else {
          resolve(CONNECTION_ERROR_OR_INCOMPLETE_DATA);
        }
      }
    });
  });
}

const verifyMerkleByCoin = (txid, height, electrumServer, proxyServer, cache, network) => {
  const _serverList = electrumServer.serverList;

  devlog(`verifyMerkleByCoin`);
  devlog(`server ip ${electrumServer.ip}`);
  devlog(`server port ${electrumServer.port}`);
  devlog(electrumServer.serverList);

  return new Promise((resolve, reject) => {
    if (_serverList !== 'none') {
      let _filteredServerList = [];

      for (let i = 0; i < _serverList.length; i++) {
        if (_serverList[i] !== electrumServer.ip + ':' + electrumServer.port + ':' + electrumServer.proto) {
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