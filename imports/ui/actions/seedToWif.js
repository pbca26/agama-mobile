const sha256 = require('js-sha256');
const crypto = require('crypto');
const bigi = require('bigi');
const bitcoinZcash = require('bitcoinjs-lib-zcash');
const bitcoin = require('bitcoinjs-lib');
const electrumJSNetworks = require('./electrumNetworks.js');

import { isZcash } from './txDecoder/txDecoder';

export const seedToWif = (seed, iguana, network) => {
  const hash = sha256.create().update(seed);
  bytes = hash.array();

  if (iguana) {
    bytes[0] &= 248;
    bytes[31] &= 127;
    bytes[31] |= 64;
  }

  const d = bigi.fromBuffer(bytes);
  const keyPair = isZcash(network) ? new bitcoinZcash.ECPair(d, null, { network: electrumJSNetworks[network] }) : new bitcoin.ECPair(d, null, { network: electrumJSNetworks[network] });
  const keys = {
    pub: keyPair.getAddress(),
    wif: keyPair.toWIF(),
  };

  return keys;
}

export const wifToWif = (wif, network) => {
  const key = isZcash(network) ? bitcoinZcash.ECPair.fromWIF(wif, electrumJSNetworks[network], true) : bitcoin.ECPair.fromWIF(wif, electrumJSNetworks[network], true);

  return {
    pub: key.getAddress(),
    wif: key.toWIF(),
  };
}