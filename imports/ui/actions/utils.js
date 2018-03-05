import whitelabel from '../../../whitelabel';

export const kmdCalcInterest = (locktime, value) => { // value in sats
  const timestampDiff = Math.floor(Date.now() / 1000) - locktime - 777;
  let timestampDiffMinutes = timestampDiff / 60;
  let interest = 0;

  // calc interest
  if (timestampDiffMinutes >= 60) {
    if (timestampDiffMinutes > 365 * 24 * 60) {
      timestampDiffMinutes = 365 * 24 * 60;
    }
    timestampDiffMinutes -= 59;

    interest = ((Number(value) * 0.00000001) / 10512000) * timestampDiffMinutes;
  }

  return interest;
}

export const secondsToString = (seconds, skipMultiply, showSeconds) => {
  const a = new Date(seconds * (skipMultiply ? 1 : 1000));
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  const year = a.getFullYear();
  const month = months[a.getMonth()];
  const date = a.getDate();
  const hour = a.getHours() < 10 ? `0${a.getHours()}` : a.getHours();
  const min = a.getMinutes() < 10 ? `0${a.getMinutes()}` : a.getMinutes();
  const sec = a.getSeconds();
  const time = `${date} ${month} ${year} ${hour}:${min}${(showSeconds ? ':' + sec : '')}`;

  return time;
}

export const estimateTxSize = (numVins, numOuts) => {
  // in x 180 + out x 34 + 10 plus or minus in
  return numVins * 180 + numOuts * 34 + 11;
}

export const sortBy = (data, sortKey) => {
  return data.sort((b, a) => {
    if (a[sortKey] < b[sortKey]) {
      return -1;
    }

    if (a[sortKey] > b[sortKey]) {
      return 1;
    }

    return 0;
  });
}

export const isNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

export const isPositiveNumber = (value) => {
  return isNumber(value) && (+value) > 0;
}

export const getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// display rounding
export const formatValue = (formatValue) => {
  const _valueToStr = formatValue.toString();

  if (_valueToStr.indexOf('.') === -1) {
    return formatValue;
  } else {
    if (_valueToStr) {
      const _decimal = _valueToStr.substr(_valueToStr.indexOf('.') + 1, _valueToStr.length);
      let newVal = _valueToStr.substr(0, _valueToStr.indexOf('.') + 1);

      for (let i = 0; i < _decimal.length; i++) {
        if (_decimal[i] === '0') {
          newVal = newVal + _decimal[i];
        } else {
          newVal = newVal + _decimal[i];
          break;
        }
      }

      return newVal;
    }
  }
}

export const maskPubAddress = (pub) => {
  // keep 3 first and 3 last chars unmasked
  let masked = '';

  for (let i = 0; i < pub.length - 3 * 2; i++) {
    masked = masked + '*';
  }

  return pub[0] + pub[1] + pub[2] + masked + pub[pub.length - 3] + pub[pub.length - 2] + pub[pub.length - 1];
}

export const isAssetChain = (coin) => {
  return true;
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

export const _coinsList = [
];

export let coinsList = [];
coinsList.push(whitelabel.name);

export const _explorers = {
};

export let explorers = [];
coinsList.push({ [whitelabel.name.toUpperCase()]: whitelabel.explorer });

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