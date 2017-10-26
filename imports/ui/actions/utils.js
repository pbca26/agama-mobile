export const kmdCalcInterest = (locktime, value) => { // value in sats
  const timestampDiff = Math.floor(Date.now() / 1000) - locktime - 777;
  const hoursPassed = Math.floor(timestampDiff / 3600);
  const minutesPassed = Math.floor((timestampDiff - (hoursPassed * 3600)) / 60);
  const secondsPassed = timestampDiff - (hoursPassed * 3600) - (minutesPassed * 60);
  let timestampDiffMinutes = timestampDiff / 60;
  let interest = 0;

  console.log('kmdCalcInterest', true);
  console.log(`locktime ${locktime}`, true);
  console.log(`minutes converted ${timestampDiffMinutes}`, true);
  console.log(`passed ${hoursPassed}h ${minutesPassed}m ${secondsPassed}s`, true);

  // calc interest
  if (timestampDiffMinutes >= 60) {
    if (timestampDiffMinutes > 365 * 24 * 60) {
      timestampDiffMinutes = 365 * 24 * 60;
    }
    timestampDiffMinutes -= 59;

    console.log(`minutes if statement ${timestampDiffMinutes}`, true);

    interest = ((Number(value) * 0.00000001) / 10512000) * timestampDiffMinutes;
    console.log(`interest ${interest}`, true);
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