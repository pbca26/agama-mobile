import React from 'react';
import Spinner from './Spinner';

import { formatValue } from 'agama-wallet-lib/build/utils';
import translate from '../translate/translate';
import { assetsPath } from '../actions/utils';

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
        _totalUSDBalance += _overview[i].balanceUSD;
        _totalBTCBalance += _overview[i].balanceBTC;
      }

      _items.push(
        <div
          className="group7"
          key="overview-coins-usd-balance">
          <div className="cryptocardbg">
            <img
              className="rectangle5"
              src={ `${assetsPath.home}/home-rectangle-5.png` } />
          </div>
          <div className="totalvalue">{ translate('OVERVIEW.TOTAL_VALUE') }</div>
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
                <img
                  className="path4"
                  src={ `${assetsPath.home}/home-path-4.png` } />
                <img
                  className="oval3"
                  src={ `${assetsPath.home}/home-oval-3.png` } />
                <img
                  className="oval3copy"
                  src={ `${assetsPath.home}/home-oval-3.png` } />
                <img
                  className="oval3copy2"
                  src={ `${assetsPath.home}/home-oval-3.png` } />
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
            <img
              className="div1"
              src={ `${assetsPath.home}/trends-rectangle-7.png` } />
            <div className="a1241">
              ~ $ { formatValue(_overview[i].usdPricePerItem) } { translate('OVERVIEW.PER_COIN') }
            </div>
            { /*<img className="path5" src={ `${assetsPath.home}/home-path-5.png` } />*/ }
            <div className="btc">
              <img
                className="oval4"
                src={ `${assetsPath.coinLogo}/${_overview[i].coin}.png` } />
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
          { this.props.overview === 'error' &&
            <div className="con-error width-limit">
              <i className="fa fa-warning error"></i> <span className="error">{ translate('OVERVIEW.PRICES_ERROR') }</span>
            </div>
          }
          { this.props.overview !== 'error' &&
            <div className="home-inner">
              { this.renderOverview() }
              <div className="yourcoins">{ translate('OVERVIEW.YOUR_COINS') }</div>
              { /*<img
                className="combinedshape2"
                src={ `${assetsPath.home}/home-combined-shape 2.png` } />*/ }
            </div>
          }
        </div>
      </div>
    );
  }
}

export default Overview;