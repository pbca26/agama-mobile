import { isKomodoCoin } from 'agama-wallet-lib/src/coin-helpers';

export const maskPubAddress = (pub) => {
  // keep 3 first and 3 last chars unmasked
  let masked = '';

  for (let i = 0; i < pub.length - 3 * 2; i++) {
    masked = masked + '*';
  }

  return pub[0] + pub[1] + pub[2] + masked + pub[pub.length - 3] + pub[pub.length - 2] + pub[pub.length - 1];
}

export const isAssetChain = isKomodoCoin;

export const setLocalStorageVar = (name, json) => {
  const _json = JSON.stringify(json);

  localStorage.setItem(name, _json);
}

export function getLocalStorageVar(name) {
  const _var = localStorage.getItem(name);

  if (_var) {
    const _json = JSON.parse(_var);

    return _json;
  } else {
    return null;
  }
}

export const convertURIToImageData = (URI) => {
  return new Promise((resolve, reject) => {
    if (URI === null) {
      return reject();
    }
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const image = new Image();
    
    image.addEventListener('load', () => {
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(context.getImageData(0, 0, canvas.width, canvas.height));
    }, false);

    image.src = URI;
  });
};

export const coinsList = [
  'CHIPS',
  'SUPERNET',
  'REVS',
  'PANGEA',
  'DEX',
  'JUMBLR',
  'BET',
  'CRYPTO',
  'COQUI',
  'OOT',
  'HODL',
  'SHARK',
  'MSHARK',
  'BOTS',
  'MGW',
  'BTCH',
  //'MVP',
  //'CEAL',
  'KV',
  'MESH',
  'WLC',
  'MNZ',
  'BNTN',
  'CHAIN',
  'GLXT',
  'EQL',
  'PRLPAY',
  'ZILLA',
  'NINJA',
  'VOTE2018',
  'PIZZA',
  'BEER',
  'BTC',
  'DOGE',
  'DGB',
  'BTG',
  //'BLK',
  'BCH',
  'FAIR',
  'VIA',
  'MONA',
  'ZEC',
  'HUSH',
  'ARG',
  'DASH',
  'CRW',
  'VTC',
  'LTC',
  'NMC',
  'SIB',
  'XMY',
  'ZCL',
  'EMC2',
  'FJC',
  'GAME',
  'BCBC',
  'BTCZ',
  'QTUM',
  'DNR',
  'BTX',
  'XZC',
  'FTC',
  'GBX'
];