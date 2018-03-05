'use strict'
var bitcoin = require('bitcoinjs-lib');

var networks = exports;
Object.keys(bitcoin.networks).forEach((key) => {
  networks[key] = bitcoin.networks[key];
});

// https://raw.githubusercontent.com/jl777/komodo/beta/src/chainparams.cpp
networks.komodo = {
  messagePrefix: '\x19Komodo Signed Message:\n',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x3c,
  scriptHash: 0x55,
  wif: 0xbc,
  dustThreshold: 1000,
};