export const getCoinswitchCoins = () => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {    
      HTTP.call(
        'GET',
        'https://www.atomicexplorer.com/api/exchanges/coinswitch/coins/cached', {
        params: {},
      }, (error, result) => {
        if (!result) {
          resolve('error');
        } else {
          const coinswitchCoins = JSON.parse(result.content).result;
          console.warn('getCoinswitchCoins', coinswitchCoins);
          resolve(coinswitchCoins);
        }
      });
    });
  }
}