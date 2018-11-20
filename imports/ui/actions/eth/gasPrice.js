import ethers from 'ethers';
import { Promise } from 'meteor/promise';
import { devlog } from '../dev';
import { ethGasStationRateToWei } from 'agama-wallet-lib/build/eth';

const ethGasPrice = () => {
  return new Promise((resolve, reject) => {
    HTTP.call('GET', 'https://ethgasstation.info/json/ethgasAPI.json', {
      params: {},
    }, (error, result) => {    
      const _json = JSON.parse(result.content);

      if (_json &&
          _json.average &&
          _json.fast &&
          _json.safeLow) {
        const _gasPrice = {
          fast: ethGasStationRateToWei(_json.fast),
          average: ethGasStationRateToWei(_json.average),
          slow: ethGasStationRateToWei(_json.safeLow),
        };

        resolve(_gasPrice);
      } else {
        resolve('error');
      }
    });
  });
};

export default ethGasPrice;