import ethers from 'ethers';
import { Promise } from 'meteor/promise';
import erc20ContractId from 'agama-wallet-lib/build/eth-erc20-contract-id';
import decimals from 'agama-wallet-lib/build/eth-erc20-decimals';
import { devlog } from '../dev';

const balance = (address, options) => {
  return new Promise((resolve, reject) => {
    if (options &&
        options.symbol) {
      balanceERC20(address, options.symbol.toUpperCase())
      .then((balance) => {
        resolve(balance);
      });
    } else {
      balanceEtherscan(address, options ? options.network : 'homestead')
      .then((balance) => {
        resolve(balance);
      });
    }
  });
};

export const balanceEtherscan = (address, network = 'homestead') => {
  return new Promise((resolve, reject) => {
    const _etherscanEndPoint = network === 'homestead' ? 'https://api.etherscan.io/api' : `https://api-${network}.etherscan.io/api`;

    HTTP.call(
      'GET',
      _etherscanEndPoint,
    {
      params: {
        module: 'account',
        action: 'balance',
        address,
        tag: 'latest',
        apikey: 'YourApiKeyToken',
      },
    }, (error, result) => {
      const _json = JSON.parse(result.content);
    
      if (_json.message === 'OK' &&
          _json.result) {
        resolve({
          balance: ethers.utils.formatEther(_json.result),
          balanceWei: _json.result,
        });
      } else {
        resolve('error');
      }
    });
  });
};

const balanceERC20 = (address, symbol) => {
  return new Promise((resolve, reject) => {
    HTTP.call(
      'GET',
      'https://api.etherscan.io/api',
    {
      params: {
        module: 'account',
        action: 'tokenbalance',
        address,
        contractaddress: erc20ContractId[symbol],
        tag: 'latest',
        apikey: 'YourApiKeyToken',
      },
    }, (error, result) => {
      const _json = JSON.parse(result.content);
    
      if (_json.message === 'OK' &&
          _json.result) {
        const _decimals = decimals[symbol.toUpperCase()];
        resolve({
          balance: ethers.utils.formatEther(ethers.utils.parseUnits(_json.result, _decimals < 18 && _decimals >= 0 ? 18 - _decimals : 0).toString()),
          balanceWei: _json.result,
        });
      } else {
        resolve('error');
      }
    });
  });
};

export default balance;