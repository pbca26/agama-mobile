import React from 'react';
import Spinner from './Spinner';
import FiatSymbol from './FiatSymbol';

import { formatValue } from 'agama-wallet-lib/build/utils';
import translate from '../translate/translate';
import {
  assetsPath,
  getLocalStorageVar,
} from '../actions/utils';

class Overview extends React.Component {
  constructor() {
    super();
    this.state = {
    };
  }

  renderOverview() {
    if (this.props.overview) {
      const settingsCurrency = getLocalStorageVar('settings').fiat;
      const _overview = this.props.overview;
      let _items = [];
      let _totalFiatBalance = 0;

      if (_overview[0].balanceFiat !== 'loading') {
        for (let i = 0; i < _overview.length; i++) {
          _totalFiatBalance += _overview[i].balanceFiat;
        }
      }

      _items.push(
        <div
          className="group7"
          key="overview-coins-fiat-balance">
          <div className="cryptocardbg">
            <img
              className="rectangle5"
              src={ `${assetsPath.home}/home-rectangle-5.png` } />
          </div>
          { _overview[0].balanceFiat !== 'loading' &&
            <div className="totalvalue">{ translate('OVERVIEW.TOTAL_VALUE') }</div>
          }
          <div className="a3467812">{ _overview[0].balanceFiat !== 'loading' ? formatValue(_totalFiatBalance) : translate('OVERVIEW.PLEASE_WAIT') }</div>
          { _overview[0].balanceFiat !== 'loading' &&
            <div className="label1">
              <FiatSymbol symbol={ settingsCurrency } />
            </div>
          }
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
        const _name = _overview[i].coin.split('|')[0];
        const _mode = _overview[i].coin.split('|')[1];
        let _priceChangeColor = 'green';
        
        if (_overview[i].priceChange &&
            _overview[i].priceChange.data &&
            _overview[i].priceChange.data.hasOwnProperty('percent_change_1h') &&
            _overview[i].priceChange.data.percent_change_1h < 0) {
          _priceChangeColor = 'red';
        }
  
        if (_overview[i].priceChange &&
            _overview[i].priceChange.data &&
            _overview[i].priceChange.data.hasOwnProperty('percent_change_24h') &&
            _overview[i].priceChange.data.percent_change_24h < 0) {
          _priceChangeColor = 'red';
        }

        const settingsMainView = getLocalStorageVar('settings').mainView;
        _items.push(
          <div
            key={ `overview-coins-${_overview[i].coin}` }
            className="overview-coin"
            onClick={ settingsMainView !== 'default' ? () => this.props.switchCoin(_overview[i].coin, true, true) : null }>
            <img
              className="div1"
              src={ `${assetsPath.home}/trends-rectangle-7.png` } />
            { _overview[i].fiatPricePerItem > 0 &&
              <div className="a1241">
                ~ <FiatSymbol symbol={ settingsCurrency } /> { Number(Number(_overview[i].fiatPricePerItem).toFixed(4)) } { translate('OVERVIEW.PER_COIN') }
              </div>
            }
            { /*<img className="path5" src={ `${assetsPath.home}/home-path-5.png` } />*/ }
            <div className="btc">
              <img
                className="oval4"
                src={ `${assetsPath.coinLogo}/${_mode}/${_name.toLowerCase()}.png` } />
            </div>
            <div className="bitcoin">{ translate(`${_mode.toUpperCase()}.${_name.toUpperCase()}`) }</div>
            <div className="a0000041">{ formatValue(_overview[i].balanceNative) }</div>
            { _overview[i].balanceFiat > 0 &&
              <div className="a123345">
              <FiatSymbol symbol={ settingsCurrency } />{ Number(Number(_overview[i].balanceFiat).toFixed(4)) }
              { _overview[i].priceChange &&
                _overview[i].priceChange.data &&
                <i className={ `fa fa-arrow-${_priceChangeColor === 'red' ? 'down' : 'up'} icon-price-change ${_priceChangeColor}` }></i>
              }
              </div>
            }
          </div>
        );
      }

      return (
        <div>
          { _items[0] }
          <div className="overview-coins">{ _items.splice(1) }</div>
        </div>
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
              <div className="yourcoins">
                { translate('OVERVIEW.' + (this.props.overview && this.props.overview.length ? 'YOUR_COINS' : 'LOADING')) }
              </div>
              { this.props.overview &&
                this.props.overview[0].balanceNative === 'loading' &&
                <Spinner />
              }
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