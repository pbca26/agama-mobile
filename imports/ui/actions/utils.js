import translate from '../translate/translate';
import { Meteor } from 'meteor/meteor';
import _coinsList from './coins';
import electrumServers from 'agama-wallet-lib/build/electrum-servers';

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
let _coins = {
  spv: {},
  eth: {},
};

for (let key in _coins) {
  for (let i = 0; i < _coinsList[key].length; i++) {
    _coins[key][translate(`${key.toUpperCase()}.${_coinsList[key][i].toUpperCase()}`)] = _coinsList[key][i];
  }
  
  _coins[key] = sortObject(_coins[key]);

  for (let _key in _coins[key]) {
    coinsList.push({
      name: (`${_coins[key][_key]}|${key}`).toLowerCase(),
      title: _key,
      mode: key,
    });
  }
}

export const removeDisabledSPVCoins = (coins) => {
  for (let key in coins) {
    if (key.indexOf('|spv') > -1) {
      const _name = key.split('|')[0];
    
      if (!electrumServers[_name]) delete coins[key];
    }
  }

  return coins;
};

export const sortTransactions = (transactions, sortBy) => {
  return transactions.sort((b, a) => {
    if (a[sortBy ? sortBy : 'height'] < b[sortBy ? sortBy : 'height'] &&
        a[sortBy ? sortBy : 'height'] &&
        b[sortBy ? sortBy : 'height']) {
      return -1;
    }

    if (a[sortBy ? sortBy : 'height'] > b[sortBy ? sortBy : 'height'] &&
        a[sortBy ? sortBy : 'height'] &&
        b[sortBy ? sortBy : 'height']) {
      return 1;
    }

    if (!a[sortBy ? sortBy : 'height'] &&
        b[sortBy ? sortBy : 'height']) {
      return 1;
    }

    if (!b[sortBy ? sortBy : 'height'] &&
        a[sortBy ? sortBy : 'height']) {
      return -1;
    }

    return 0;
  });
}

// single level
export const joinPropsUrl = (obj) => {
  let out = [];
  
  for (let key in obj) {
    out.push(`${key}=${obj[key]}`);
  }

  return out.join('&');
};

// ref: https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
export const shuffleArray = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
};