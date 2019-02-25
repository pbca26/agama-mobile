import React from 'react';

import translate from '../../translate/translate';
import { Meteor } from 'meteor/meteor';
import { assetsPath } from '../../actions/utils';

class SettingsCoins extends React.Component {
  constructor() {
    super();
    this.state = {
      removeCoinsToggle: {},
    };
    this.toggleRemoveCoin = this.toggleRemoveCoin.bind(this);
    this.menuBack = this.menuBack.bind(this);
  }

  menuBack() {
    this.props.cb(this.state.removeCoinsToggle);
  }

  toggleRemoveCoin(coin) {
    let newState = JSON.parse(JSON.stringify(this.state));
    newState.removeCoinsToggle[coin] = !newState.removeCoinsToggle[coin];

    this.setState(newState);
  }

  componentWillMount() {
    const _updateState = (coins) => {
      let newState = {
        removeCoinsToggle: {},
      };

      for (let key in coins) {
        if (coins[key] !== undefined &&
            coins[key] === true) {
          newState.removeCoinsToggle[key] = true;
        } else if (
          coins[key] !== undefined &&
          coins[key] === false) {
          newState.removeCoinsToggle[key] = false;
        } else {
          newState.removeCoinsToggle[key] = true;
        }
      }

      this.setState(newState);
    };

    if (this.props.removeCoins) {
      const coins = this.props.removeCoins;
      _updateState(coins);
    } else if (this.props.coins) {
      const coins = this.props.coins;
      _updateState(coins);
    }
  }

  renderCoins() {
    let items = [];
    let coins = Object.keys(this.props.coins);

    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      const name = coin.split('|')[0];
      const mode = coin.split('|')[1];

      items.push(
        <div
          key={ `overview-coins-${coin}` }
          className="overview-coin">
          <div className="btc">
            <img
              className="oval4"
              src={ `${assetsPath.coinLogo}/${mode}/${name}.png` } />
          </div>
          <div className="bitcoin">{ translate(`${mode.toUpperCase()}.${name.toUpperCase()}`) }</div>
          <div className="switch-block">
            <label className="switch">
              <input
                type="checkbox"
                value="on"
                checked={ this.state.removeCoinsToggle[coin] }
                readOnly />
              <div
                className="slider"
                onClick={ () => this.toggleRemoveCoin(coin) }></div>
            </label>
          </div>
        </div>
      );
    }

    return items;
  }

  render() {
    return (
      <div className="addcoin-ui settings-coins">
        <img
          className="menu-back"
          src={ `${assetsPath.menu}/trends-combined-shape.png` }
          onClick={ this.menuBack } />
        <div className="home form">
          <div className="home-inner">
            <div className="overview-coins">
              { this.renderCoins() }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default SettingsCoins;