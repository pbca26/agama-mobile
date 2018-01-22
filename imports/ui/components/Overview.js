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

      for (let i = 0; i < _overview.length; i++) {
        _totalUSDBalance += _overview[i].balanceUSD;
      }

      _items.push(
        <div
          key={ `overview-coins-usd-balance` }
          className="overview-usd-balance">
          <h4>$ { formatValue(_totalUSDBalance) }</h4>
        </div>
      );

      for (let i = 0; i < _overview.length; i++) {
        _items.push(
          <div
            key={ `overview-coins-${_overview[i].coin}` }
            className="overview-row">
            <div className="overview-row-icon">
              <img
                width="35"
                height="35"
                src={ `/images/cryptologo/${_overview[i].coin}.png` } />
              <span className="overview-row-icon-title">~ $ { formatValue(_overview[i].usdPricePerItem) } per {_overview[i].coin.toUpperCase() }</span>
            </div>
            <div className="overview-row-balance">
              <div>{ formatValue(_overview[i].balanceNative) } {_overview[i].coin.toUpperCase() }</div>
              <div>$ { formatValue(_overview[i].balanceUSD) }</div>
            </div>
          </div>
        );
      }

      return _items;
    } else {
      return (
        <Spinner />
      );
    }
  }

  render() {
    return (
      <div className="col-sm-12">
        <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
          <div className="row">
            <h4 className="padding-bottom-15">Overview</h4>
            <div>Prices source: atomicexplorer.com, lowest offer available at the moment</div>
            <div className="padding-bottom-10 overview">
            { this.renderOverview() }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Overview;