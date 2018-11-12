import translate from '../translate/translate';
import { Meteor } from 'meteor/meteor';
import _coinsList from './coins';

export const assetsPath = {
  coinLogo: '/images/cryptologo',
  login: '/images/template/login',
  menu: '/images/template/menu',
  home: '/images/template/home',
  txs: '/images/template/transactions',
};

// https://stackoverflow.com/questions/5467129/sort-javascript-object-by-key
export const sortObject = (o) => {
  return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
}

export const maskPubAddress = (pub) => {
  // keep 3 first and 3 last chars unmasked
  let masked = '';

  for (let i = 0; i < pub.length - 3 * 2; i++) {
    masked = masked + '*';
  }

  return pub[0] + pub[1] + pub[2] + masked + pub[pub.length - 3] + pub[pub.length - 2] + pub[pub.length - 1];
}

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

// sorting needs to be done
export let coinsList = []; // sorted
let _coins = {};

for (let i = 0; i < _coinsList.length; i++) {
  _coins[translate('COINS.' + _coinsList[i].toUpperCase())] = _coinsList[i];
}

_coins = sortObject(_coins);

for (let key in _coins) {
  coinsList.push(_coins[key]);
}