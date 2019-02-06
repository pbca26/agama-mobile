import { Promise } from 'meteor/promise';
import { devlog } from './dev';

const getPrices = (coins, priceChange) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      HTTP.call(
        'GET',
        'https://www.atomicexplorer.com/api/mm/prices/v2', {
        params: {
          coins: typeof coins === 'object' ? coins.join(',') : coins,
          currency: 'usd',
          pricechange: true,
        },
      }, (error, result) => {
        if (!result) {
          resolve('error');
        } else {          
          try {
            resolve(JSON.parse(result.content).result);
          } catch (e) {
            devlog('unable to get https://www.atomicexplorer.com/api/mm/prices/v2');
            devlog(JSON.stringify({
              coins: typeof coins === 'object' ? coins.join(',') : coins,
              currency: 'usd',
              pricechange: true,
            }));
            devlog(JSON.stringify(result));
            resolve('error');
          }
        }
      });
    });
  };
};

export default getPrices;