export const kmdCalcInterest = (locktime, value) => { // value in sats
  const timestampDiff = Math.floor(Date.now() / 1000) - locktime - 777;
  const hoursPassed = Math.floor(timestampDiff / 3600);
  const minutesPassed = Math.floor((timestampDiff - (hoursPassed * 3600)) / 60);
  const secondsPassed = timestampDiff - (hoursPassed * 3600) - (minutesPassed * 60);
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

export function sortBy(data, sortKey) {
  return data.sort(function(a, b) {
    if (a[sortKey] < b[sortKey]) {
      return -1;
    }

    if (a[sortKey] > b[sortKey]) {
      return 1;
    }

    return 0;
  });
}

export function isNumber(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

export function isPositiveNumber(value) {
  return isNumber(value) && (+value) > 0;
}

// display rounding
export function formatValue(formatValue) {
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

export function maskPubAddress(pub) {
  // keep 3 first and 3 last chars unmasked
  let masked = '';

  for (let i = 0; i < pub.length - 3 * 2; i++) {
    masked = masked + '*';
  }

  return pub[0] + pub[1] + pub[2] + masked + pub[pub.length - 3] + pub[pub.length - 2] + pub[pub.length - 1];
}

export function isAssetChain(coin) {
  coin = coin.toUpperCase();

  if (coin === 'SUPERNET' ||
      coin === 'REVS' ||
      coin === 'SUPERNET' ||
      coin === 'PANGEA' ||
      coin === 'DEX' ||
      coin === 'JUMBLR' ||
      coin === 'BET' ||
      coin === 'CRYPTO' ||
      coin === 'COQUI' ||
      coin === 'HODL' ||
      coin === 'SHARK' ||
      coin === 'BOTS' ||
      coin === 'MGW' ||
      coin === 'MVP' ||
      coin === 'KV' ||
      coin === 'CEAL' ||
      coin === 'MESH' ||
      coin === 'WLC' ||
      coin === 'MNZ' ||
      coin === 'komodo' ||
      coin === 'KMD') {
    return true;
  }

  return false;
}

export function setLocalStorageVar(name, json) {
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