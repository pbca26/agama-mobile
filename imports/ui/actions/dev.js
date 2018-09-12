export const config = {
  dev: false,
  debug: true,
};

export const devlog = (msg, data) => {
  if (config.dev ||
      config.debug) {
    if (data) {
      console.warn(msg, data);
    } else {
      console.warn(msg);
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