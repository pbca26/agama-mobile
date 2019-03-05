import React from 'react';

import translate from '../../translate/translate';
import {
  devlog,
  config,
} from '../../actions/dev';
import supportedCoinsList from '../../actions/coins';
import { Meteor } from 'meteor/meteor';
import { assetsPath } from '../../actions/utils';

class ExchangesSupportedCoins extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    // TODO: sort
    const coins = this.props.coins;
    let items = [];

    if (coins &&
        typeof coins === 'object' &&
        coins.length &&
        coins[0].symbol) {
      for (let i = 0; i < coins.length; i++) {
        const sym = coins[i].symbol;

        if (supportedCoinsList.spv.indexOf(sym.toUpperCase()) > -1) {
          items.push(
            <div
              key={ sym }
              className="exchanges-supported-coins-tile">
              <img
                src={ `${assetsPath.coinLogo}/spv/${sym.toLowerCase()}.png` }
                width="30px"
                height="30px" />
              <span>{ coins[i].name }</span>
            </div>
          );
        }
      }
    }

    if (!items.length) {
      items.push(
        <div key="exchanges-supported-coins-loading text-center margin-top-15">
          { translate('EXCHANGES.LOADING_COINS_LIST') }...
        </div>
      );
    }

    return (
      <div className="exchanges-supported-coins margin-top-45">
        <div className="exchanges-supported-coins-inner">
          <div className="text-center padding-bottom-35">
            { translate('EXCHANGES.SUPPORTED_COINS_TO_EXCHANGES') }
          </div>
          { items }
        </div>
      </div>
    );
  }
}

export default ExchangesSupportedCoins;