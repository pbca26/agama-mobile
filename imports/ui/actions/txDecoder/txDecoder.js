const txDecoder = {
  default: require('./electrumTxDecoder.js'),
};

export const electrumJSTxDecoder = (rawtx, networkName, network) => {
  return txDecoder.default(rawtx, network);
};