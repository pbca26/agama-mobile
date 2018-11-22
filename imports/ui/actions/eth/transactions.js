import ethers from 'ethers';
import { Promise } from 'meteor/promise';
import erc20ContractId from 'agama-wallet-lib/build/eth-erc20-contract-id';
import decimals from 'agama-wallet-lib/build/eth-erc20-decimals';
import { ethTransactionsToBtc } from 'agama-wallet-lib/build/eth';
import { devlog } from '../dev';

const transactions = (address, options) => {
  return new Promise((resolve, reject) => {
    if (options &&
        options.symbol) {
      transactionsERC20(address, options.symbol.toUpperCase())
      .then((balance) => {
        resolve(balance);
      });
    } else {
      transactionsEtherscan(address, options ? options.network : 'homestead')
      .then((transactions) => {
        resolve(transactions);
      });
    }
  });
};

const transactionsEtherscan = (address, network = 'homestead', sort = 'asc') => {
  return new Promise((resolve, reject) => {
    const _etherscanEndPoint = network === 'homestead' ? 'https://api.etherscan.io/api' : `https://api-${network}.etherscan.io/api`;

    HTTP.call('GET', _etherscanEndPoint, {
      params: {
        module: 'account',
        action: 'txlist',
        address,
        startblock: '0',
        endblock: '99999999',
        sort,
        apikey: 'YourApiKeyToken',
      },
    }, (error, result) => {    
      const _json = JSON.parse(result.content);

      if ((_json.message === 'OK' || _json.message === 'No transactions found') &&
          _json.result) {
        const _txs = ethTransactionsToBtc(_json.result, address);
        resolve(_txs);
      } else {
        resolve(_json);
      }
    });
  });
};

const transactionsERC20 = (address, symbol) => {
  return new Promise((resolve, reject) => {
    HTTP.call('GET', 'https://api.etherscan.io/api', {
      params: {
        module: 'account',
        action: 'tokentx',
        address,
        contractaddress: erc20ContractId[symbol],
        apikey: 'YourApiKeyToken',
      },
    }, (error, result) => {
      const _json = JSON.parse(result.content);
    
      if ((_json.message === 'OK' || _json.message === 'No transactions found') &&
          _json.result) {
        const _decimals = decimals[symbol];
        const _txs = ethTransactionsToBtc(_json.result, address, true, _decimals < 18 && _decimals >= 0 ? 18 - _decimals : 0);
        resolve(_txs);
      } else {
        resolve(_json);
      }
    });
  });
};

export default transactions;