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
          console.warn('actions getCoinswitchCoins', coinswitchCoins);
          resolve(coinswitchCoins);
        }
      });
    });
  }
}

export const getRate = (provider, src, dest) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      if (provider === 'coinswitch') {
        HTTP.call(
          'GET',
          'https://www.atomicexplorer.com/api/exchanges/coinswitch?method=getRate', {
          params: {
            src,
            dest,
          },
        }, (error, result) => {
          if (!result) {
            resolve('error');
          } else {
            const coinswitchRate = JSON.parse(JSON.parse(result.content));
            console.warn('actions getRate', coinswitchRate);
            resolve(coinswitchRate);
          }
        });
      }
    });
  }
}

export const getOrder = (provider, orderId) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      if (provider === 'coinswitch') {
        HTTP.call(
          'GET',
          'https://www.atomicexplorer.com/api/exchanges/coinswitch?method=getOrder', {
          params: {
            orderId,
          },
        }, (error, result) => {
          if (!result) {
            resolve('error');
          } else {
            const coinswitchOrder = JSON.parse(JSON.parse(result.content));
            console.warn('actions getOrder', coinswitchOrder);
            resolve(coinswitchOrder);
          }
        });
      }
    });
  }
}