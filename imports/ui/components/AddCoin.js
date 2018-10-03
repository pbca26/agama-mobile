import React from 'react';

import {
  coinsList,
  assetsPath,
} from '../actions/utils';
import translate from '../translate/translate';

class AddCoin extends React.Component {
  constructor() {
    super();
    this.state = {
      multiSelect: {},
    };
    this.addCoin = this.addCoin.bind(this);
  }

  addCoin(coin) {
    const _props = this.props;

    _props.addCoin(coin);
    _props.changeActiveSection(_props.auth ? 'dashboard' : 'login');

    this.setState({
      multiSelect: {},
    });
  }

  renderCoins(singleSelect) {
    let _coins = this.props.coins;
    let _items = [];

    for (let i = 0; i < coinsList.length; i++) {
      const key = coinsList[i];
      const _coin = key.toLowerCase();

      _items.push(
        <div
          onClick={ () => this.addCoin(_coin) }
          key={ `overview-coins-${_coin}` }
          className={ 'overview-coin' + (_coins[_coin] ? ' disabled' : '') }>
          <div className="btc">
            <img
              className="oval4"
              src={ `${assetsPath.coinLogo}/${_coin}.png` } />
          </div>
          <div className="bitcoin">{ translate('COINS.' + _coin.toUpperCase()) }</div>
        </div>
      );
    }

    return _items;
  }

  render() {
    if (this.props.activeSection !== 'create-seed' &&
        this.props.activeSection !== 'pin' &&
        this.props.activeSection !== 'offlinesig') {
      if (this.props.activeSection === 'addcoin' ||
          !this.props.coins ||
          (this.props.coins && !Object.keys(this.props.coins).length)) {
        return (
          <div className="addcoin-ui">
            <div className="home">
              <div className="home-inner">
                <div className="overview-coins">{ this.renderCoins() }</div>
              </div>
            </div>
          </div>
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}

export default AddCoin;