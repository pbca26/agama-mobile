import ethers from 'ethers';
import fees from 'agama-wallet-lib/build/fees';
import { maxSpend } from 'agama-wallet-lib/build/eth';
import standartABI from 'agama-wallet-lib/build/erc20-standard-abi';
import { Promise } from 'meteor/promise';
import erc20ContractId from 'agama-wallet-lib/build/eth-erc20-contract-id';
import decimals from 'agama-wallet-lib/build/eth-erc20-decimals';
import { devlog } from '../dev';
import { balanceEtherscan } from './balance';

// TODO: error handling, input vars check

export const ethCreateTx = (wallet, coin, push, dest, amount, gasPrice, network) => {
  let adjustedAmount = 0;
  let gasLimit = fees[coin.toLowerCase()];
  
  coin = coin ? coin.toUpperCase() : null;
  push = push ? push : false;
  dest = dest ? dest : null;
  network = network ? network : 'homestead';
  amount = amount ? amount : 0;

  balanceEtherscan(
    wallet.signingKey.address,
    network
  )
  .then((maxBalance) => {
    const fee = ethers.utils.formatEther(ethers.utils.bigNumberify(gasLimit).mul(ethers.utils.bigNumberify(gasPrice)));
    const _adjustedAmount = maxSpend(maxBalance.balance, fee, amount);
    const _adjustedAmountWei = Number(ethers.utils.parseEther(Number(_adjustedAmount).toPrecision(8)).toString());

    if (!push) {
      const data = {
        coin,
        network,
        address: wallet.signingKey.address,
        dest, 
        push,
        gasLimit,
        gasPrice,
        fee,
        feeWei: ethers.utils.bigNumberify(gasLimit).mul(ethers.utils.bigNumberify(gasPrice)).toString(),
        amount,
        amountWei: ethers.utils.parseEther(Number(amount).toPrecision(8)).toString(),
        adjustedAmount: _adjustedAmount,
        adjustedAmountWei: _adjustedAmountWei,
        maxBalance,
      };

      devlog('eth tx data');
      devlog(data);
      
      const retObj = {
        msg: 'success',
        result: data,
      };

      resolve(retObj);
    } else {
      wallet.sendTransaction({
        to: dest,
        value: _adjustedAmountWei,
        gasPrice: ethers.utils.bigNumberify(gasPrice),
        gasLimit,
      })
      .then((tx) => {
        devlog('eth tx pushed');
        devlog(tx);

        tx.txid = tx.hash;
        
        const retObj = {
          msg: 'success',
          result: tx,
        };

        resolve(retObj);
      }, (error) => {
        const retObj = {
          msg: 'error',
          result: tx,
        };

        resolve(retObj);
      });
    }
  });
};

export const ethCreateTxERC20 = (wallet, symbol, push, dest, amount, gasPrice) => {
  let adjustedAmount = 0;

  push = push ? push : false;
  dest = dest ? dest : null;
  amount = amount ? amount : 0;
  symbol = symbol ? symbol : null;

  balanceEtherscan(
    wallet.signingKey.address,
    'homestead'
  )
  .then((maxBalance) => {
    const contractAddress = erc20ContractId[symbol.toUpperCase()];
    const contract = new ethers.Contract(contractAddress, standartABI, wallet);
    const numberOfDecimals = decimals[symbol.toUpperCase()] || 18;
    const numberOfTokens = ethers.utils.parseUnits(amount, numberOfDecimals);

    devlog(`${symbol.toUpperCase()} decimals ${decimals[symbol.toUpperCase()]}`);
    
    if (!push) {
      contract.estimate.transfer(contractAddress, numberOfTokens)
      .then((estimate) => {
        const _estimate = estimate.toString();
        devlog(`erc20 ${symbol.toUpperCase()} transfer estimate ${_estimate}`);
        devlog(`gas price ${gasPrice}`);

        const _fee = ethers.utils.bigNumberify(_estimate).mul(ethers.utils.bigNumberify(gasPrice));
        const _balanceAferFee = ethers.utils.bigNumberify(maxBalance.balanceWei).sub(_fee).toString();

        const retObj = {
          msg: 'success',
          result: {
            symbol,
            gasLimit: _estimate,
            gasPrice: ethers.utils.bigNumberify(gasPrice).toString(),
            feeWei: _fee.toString(),
            fee: ethers.utils.formatEther(_fee.toString()),
            maxBalance,
            balanceAfterFeeWei: _balanceAferFee,
            balanceAferFee: ethers.utils.formatEther(_balanceAferFee.toString()),
            notEnoughBalance: Number(_balanceAferFee) > 0 ? false : true,
          },
        };
  
        resolve(retObj);
      });
    } else {
      contract.transfer(dest, numberOfTokens, {
        gasPrice: ethers.utils.bigNumberify(gasPrice),
      })
      .then((tx) => {
        devlog('erc20 tx pushed');
        devlog(tx);

        tx.txid = tx.hash;
        
        const retObj = {
          msg: 'success',
          result: tx,
        };

        resolve(retObj);
      }, (error) => {
        const retObj = {
          msg: 'error',
          result: error,
        };

        resolve(retObj);
      });
    }
  });
};