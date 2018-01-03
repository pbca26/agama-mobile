let config = {
  dev: false,
};

export const devlog = (msg) => {
  if (config.dev) {
    console.warn(msg);
  }
};