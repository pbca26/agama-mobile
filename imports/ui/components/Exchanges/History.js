import React from 'react';

import translate from '../../translate/translate';
import {
  devlog,
  config,
} from '../../actions/dev';
import { assetsPath } from '../../actions/utils';
import { secondsToString } from 'agama-wallet-lib/build/time';
import {
  sort,
  formatValue,
} from 'agama-wallet-lib/build/utils';
import { statusLookup } from './utils';

const MAX_ORDERS = 30;

class ExchangesHistory extends React.Component {
  constructor() {
    super();
    this.state = {
    };
  }

  render() {
    const _cache = this.props.orders;
    const _deposits = this.props.deposits;
    let _cacheFlat = [];
    let _items = [];
  
    for (let key in _cache) {
      _cacheFlat.push(_cache[key]);
    }
  
    _cacheFlat = sort(_cacheFlat, 'createdAt', true);
  
    for (let i = 0; i < _cacheFlat.length && i < MAX_ORDERS; i++) {
      if (this.props.provider === 'coinswitch') {
        _items.push(
          <div
            key={ `${this.props.provider}-${i}` }
            className="item"
            onClick={ () => this.props.openOrderDetails(_cacheFlat[i].orderId) }>
            <div className="src">
              <div className="date">{ secondsToString(_cacheFlat[i].createdAt / 1000) }</div>
              <div className="item-info">
                <img
                  className="icon"
                  src={ `${assetsPath.coinLogo}/spv/${_cacheFlat[i].depositCoin}.png` } />
                <div className="item-info-details">
                  <div className="name">{ _cacheFlat[i].depositCoin.toUpperCase() }</div>
                  <div className="amount">{ formatValue(_cacheFlat[i].expectedDepositCoinAmount) }</div>
                </div>
              </div>
            </div>
            <i className="fa fa-exchange"></i>
            <div className="dest">
              <div className={
                _cacheFlat[i].status === 'confirming' ||
                _cacheFlat[i].status === 'exchanging' ||
                (_cacheFlat[i].status === 'sending' && !_cacheFlat[i].outputTransactionHash) ? 'status col-warning' : 'status' }>
                { _cacheFlat[i].outputTransactionHash ? 'complete' : statusLookup.coinswitch[_cacheFlat[i].status] ? statusLookup.coinswitch[_cacheFlat[i].status] : _cacheFlat[i].status }
              </div>
              <div className="item-info">
                <img
                  className="icon"
                  src={ `${assetsPath.coinLogo}/spv/${_cacheFlat[i].destinationCoin}.png` } />
                <div className="item-info-details">
                  <div className="name">{ _cacheFlat[i].destinationCoin.toUpperCase() }</div>
                  <div className="amount">{ formatValue(_cacheFlat[i].expectedDestinationCoinAmount) }</div>
                </div>
              </div>
              <div className="deposit">
                { this.props.findDeposits(_cacheFlat[i].orderId).length > 0 ||
                  (this.props.provider === 'coinswitch' && _cacheFlat[i].inputTransactionHash) ||
                  (this.props.provider === 'coinswitch' && _cacheFlat[i].inputTransactionHash && _deposits && _deposits[`${_cacheFlat[i].depositCoin.toLowerCase()}-${_cacheFlat[i].inputTransactionHash}`]) ? <i className="fa fa-check-circle green"></i> : <i className="fa fa-exclamation-circle"></i>
                }
              </div>
            </div>
          </div>
        );
      }
    }
  
    if (_items.length) {
      return (
        <div className="exchanges-history-inner-block">
        { _items }
        </div>
      );
    } else {
      return (
        <div className="margin-left-10">{ translate('EXCHANGES.NO_HISTORY') }</div>
      );
    }
  }
}

export default ExchangesHistory;