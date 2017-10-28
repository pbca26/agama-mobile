import { devlog } from './dev';

export const parseTransactionAddresses = (tx, targetAddress, network) => {
  // TODO: - sum vins / sum vouts to the same address
  //       - multi vin multi vout
  //       - detect change address
  let result = [];
  let _parse = {
    inputs: {},
    outputs: {},
  };
  let _sum = {
    inputs: 0,
    outputs: 0,
  };
  let _total = {
    inputs: 0,
    outputs: 0,
  };

  devlog('parseTransactionAddresses result ==>');

  if (tx.format === 'cant parse') {
    return {
      type: 'unknown',
      amount: 'unknown',
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    }
  }

  for (let key in _parse) {
    if (!tx[key].length) {
      _parse[key] = [];
      _parse[key].push(tx[key]);
    } else {
      _parse[key] = tx[key];
    }

    for (let i = 0; i < _parse[key].length; i++) {
      devlog(`key ==>`);
      devlog(_parse[key][i]);
      devlog(Number(_parse[key][i].value));

      _total[key] += Number(_parse[key][i].value);

      if (_parse[key][i].scriptPubKey &&
          _parse[key][i].scriptPubKey.addresses &&
          _parse[key][i].scriptPubKey.addresses[0] === targetAddress &&
          _parse[key][i].value) {
        _sum[key] += Number(_parse[key][i].value);
      }
    }
  }

  if (_sum.inputs > 0 &&
      _sum.outputs > 0) {
    // vin + change, break into two tx
    result = [{ // reorder since tx sort by default is from newest to oldest
      type: 'sent',
      amount: Number(_sum.inputs.toFixed(8)),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    }, {
      type: 'received',
      amount: Number(_sum.outputs.toFixed(8)),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    }];

    if (network === 'komodo') { // calc claimed interest amount
      const vinVoutDiff = _total.inputs - _total.outputs;

      if (vinVoutDiff < 0) {
        result[1].interest = Number(vinVoutDiff.toFixed(8));
      }
    }
  } else if (_sum.inputs === 0 && _sum.outputs > 0) {
    result = {
      type: 'received',
      amount: Number(_sum.outputs.toFixed(8)),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    };
  } else if (_sum.inputs > 0 && _sum.outputs === 0) {
    result = {
      type: 'sent',
      amount: Number(_sum.inputs.toFixed(8)),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    };
  } else {
    // (?)
    result = {
      type: 'other',
      amount: 'unknown',
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmations: tx.confirmations,
    };
  }

  devlog(_sum);
  devlog(result);

  return result;
}