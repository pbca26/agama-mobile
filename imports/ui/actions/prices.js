import { Promise } from 'meteor/promise';
import { devlog } from './dev';
import {
  getLocalStorageVar,
  setLocalStorageVar,
} from '../actions/utils';

const getPrices = (coins, priceChange) => {
  return async (dispatch) => {
    return new Promise((resolve, reject) => {
      const settingsCurrency = getLocalStorageVar('settings').fiat;
      let params = {
        coins: typeof coins === 'object' ? coins.join(',') : coins,
        currency: settingsCurrency,
        pricechange: true,
      };
      devlog('req', {
        method: 'GET',
        url: 'https://www.atomicexplorer.com/api/mm/prices/v2',
        params,
      });

      HTTP.call(
        'GET',
        'https://www.atomicexplorer.com/api/mm/prices/v2', {
        params: {
          coins: typeof coins === 'object' ? coins.join(',') : coins,
          currency: settingsCurrency,
          pricechange: true,
        },
      }, (error, result) => {
        if (!result) {
          resolve('error');
        } else {
          try {
            const _prices = JSON.parse(result.content).result;
            setLocalStorageVar('prices', _prices);
            resolve(_prices);
          } catch (e) {
            devlog('unable to get https://www.atomicexplorer.com/api/mm/prices/v2');
            devlog(JSON.stringify({
              coins: typeof coins === 'object' ? coins.join(',') : coins,
              currency: settingsCurrency,
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