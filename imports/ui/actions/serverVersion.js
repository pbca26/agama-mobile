import { devlog } from './dev';
import { Promise } from 'meteor/promise';
import {
  getLocalStorageVar,
  setLocalStorageVar,
} from './utils';

const getServerVersion = async function (proxyServer, ip, port, proto) {
  let protocolVersion = getLocalStorageVar('protocolVersion');
  
  return new Promise((resolve, reject) => {
    if (protocolVersion[`${ip}:${port}:${proto}`] &&
        protocolVersion[`${ip}:${port}:${proto}`] === 1.4) {
      resolve(true);
    } else if (
      protocolVersion[`${ip}:${port}:${proto}`] &&
      protocolVersion[`${ip}:${port}:${proto}`] < 1.4) {
      resolve(false);
    } else {
      const params = {
        port,
        ip,
        proto,
      };
      devlog('req', {
        method: 'GET',
        url: `http://${proxyServer.ip}:${proxyServer.port}/api/server/version`,
        params,
      });

      HTTP.call(
        'GET',
        `http://${proxyServer.ip}:${proxyServer.port}/api/server/version`, {
        params,
      }, (error, result) => {
        result = JSON.parse(result.content);

        if (result.msg === 'error') {
          resolve('error');
        } else {
          devlog('getServerVersion', result.result);

          if (result.result &&
              typeof result.result === 'object' &&
              result.result.length === 2 &&
              result.result[0].indexOf('ElectrumX') > -1 &&
              Number(result.result[1])) {
            protocolVersion[`${ip}:${port}:${proto}`] = Number(result.result[1]);
            setLocalStorageVar('protocolVersion', protocolVersion);

            resolve(true);
          } else {
            resolve(false);
          }
        }
      });
    }
  });
}

export default getServerVersion;