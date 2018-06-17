import React from 'react';
import Spinner from './Spinner';

import { formatValue } from '../actions/utils';
import { translate } from '../translate/translate';

class Overview extends React.Component {
  constructor() {
    super();
    this.state = {
    };
  }

  renderOverview() {
    if (this.props.overview) {
      const _overview = this.props.overview;
      let _items = [];
      let _totalUSDBalance = 0;
      let _totalBTCBalance = 0;

      for (let i = 0; i < _overview.length; i++) {
        console.warn(_overview[i]);
        _totalUSDBalance += _overview[i].balanceUSD;
        _totalBTCBalance += _overview[i].balanceBTC;
      }

      _items.push(
        <div
          className="group7"
          key={ `overview-coins-usd-balance` }>
          <img className="rectangle5copy" src="/images/template/home/home-rectangle-5-copy.png" />
          <div className="cryptocardbg">
            <img className="rectangle5" src="/images/template/home/home-rectangle-5.png" />
          </div>
          <div className="totalvalue">Total Value</div>
          <div className="a3467812">{ formatValue(_totalUSDBalance) }</div>
          <div className="label1">$</div>
          <div className="cryptocardgraph">
            <div className="group4">
              <div className="group2">
                <div className="rectangle6"></div>
                <div className="rectangle6copy"></div>
                <div className="rectangle6copy9"></div>
                <div className="rectangle6copy10"></div>
                <div className="rectangle6copy11"></div>
                <div className="rectangle6copy12"></div>
                <div className="rectangle6copy13"></div>
                <div className="rectangle6copy14"></div>
                <div className="rectangle6copy15"></div>
                <div className="rectangle6copy16"></div>
                <div className="rectangle6copy2"></div>
                <div className="rectangle6copy5"></div>
                <div className="rectangle6copy4"></div>
                <div className="rectangle6copy3"></div>
                <div className="rectangle6copy8"></div>
                <div className="rectangle6copy7"></div>
                <div className="rectangle6copy6"></div>
              </div>
              <div className="group3">
                <img className="path4" src="/images/template/home/home-path-4.png" />
                <img className="oval3" src="/images/template/home/home-oval-3.png" />
                <img className="oval3copy" src="/images/template/home/home-oval-3.png" />
                <img className="oval3copy2" src="/images/template/home/home-oval-3.png" />
              </div>
            </div>
          </div>
        </div>
      );

      for (let i = 0; i < _overview.length; i++) {
        _items.push(
          <div
          key={ `overview-coins-${_overview[i].coin}` }
            className="overview-coin">
            <img className="div1" src="/images/template/home/trends-rectangle-7.png" />
            <div className="a1241">~ $ { formatValue(_overview[i].usdPricePerItem) } per coin</div>
            { /*<img className="path5" src="/images/template/home/home-path-5.png" />*/ }
            <div className="btc">
              <img
                className="oval4"
                src={ `/images/cryptologo/${_overview[i].coin}.png` } />
            </div>
            <div className="bitcoin">{ translate('COINS.' + _overview[i].coin.toUpperCase()) }</div>
            <div className="a0000041">{ formatValue(_overview[i].balanceNative) }</div>
            <div className="a123345">${ formatValue(_overview[i].balanceUSD) }</div>
          </div>
        );
      }

      return (
        <div>
          { _items[0] }
          <div className="overview-coins">{ _items.splice(1) }</div>
        </div>
      );
    } else {
      return (
        <Spinner />
      );
    }
  }

  render() {
    return (
      <div className="overview-ui">
        <div className="home">
          <div className="home-inner">
            { this.renderOverview() }
            <div className="yourcoins">Your Coins</div>
            { /*<img
              className="combinedshape2"
            src="/images/template/home/home-combined-shape 2.png" />*/ }
          </div>
        </div>
      </div>
    );
  }
}

export default Overview;