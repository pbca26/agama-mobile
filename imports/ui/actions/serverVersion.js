import { devlog } from './dev';
import { Promise } from 'meteor/promise';

const getServerVersion = async function (proxyServer, port, ip, proto) {
  return new Promise((resolve, reject) => {
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
        return 'error';
      } else {
        console.warn(result.result);
        resolve(true);
      }
    });
  });
}

export default getServerVersion;