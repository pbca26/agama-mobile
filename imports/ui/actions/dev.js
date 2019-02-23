import { joinPropsUrl } from './utils';

export const config = {
  dev: true,
  debug: true,
  debugOptions: {
    req: false,
    stringify: false,
  },
};

export const devlog = (msg, data) => {
  if (config.dev ||
      config.debug) {
    if (config.debugOptions &&
        config.debugOptions.req &&
        msg === 'req') {
      console.warn(msg, `method: ${data.method}, url: ${data.url}?${joinPropsUrl(data.params)}`);
    } else if (msg !== 'req') {
      if (data) {
        console.warn(msg, config.debugOptions && config.debugOptions.stringify ? JSON.stringify(data) : data);
      } else {
        console.warn(msg);
      }
    }
  }
};

/* dev data example, use it for testing purposes only!
config {
  dev: true,
  preload: {
    seed: 'xyz',
    pin: '777777',
    enablePinConfirm: true,
    coins: 'kmd,chips',
    activeCoin: 'chips',
    send: {
      amount: 0.0001,
      address: 'xyz',
    },
    disableAutoLock: true,
  },
};
*/