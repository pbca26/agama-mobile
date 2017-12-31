let config = {
  dev: true,
};

export const devlog = (msg) => {
  if (config.dev) {
    console.warn(msg);
  }
};