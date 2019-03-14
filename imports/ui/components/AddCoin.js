import React from 'react';

import {
  coinsList,
  assetsPath,
} from '../actions/utils';
import translate from '../translate/translate';
import { isKomodoCoin } from 'agama-wallet-lib/build/coin-helpers';
import erc20ContractId from 'agama-wallet-lib/build/eth-erc20-contract-id';

class AddCoin extends React.Component {
  constructor() {
    super();
    this.state = {
      multiSelect: {},
      searchTerm: '',
    };
    this.updateInput = this.updateInput.bind(this);
    this.clearSearchTerm = this.clearSearchTerm.bind(this);
    this.addCoin = this.addCoin.bind(this);
  }

  clearSearchTerm() {
    this.setState({
      searchTerm: '',
    });
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  addCoin(coin) {
    if (this.props.activate) {
      this.props.cb(coin);
    } else {
      const _props = this.props;

      _props.addCoin(coin);
      _props.changeActiveSection(_props.auth ? 'dashboard' : 'login');

      this.setState({
        multiSelect: {},
        searchTerm: '',
      });
    }
  }

  renderCoins(singleSelect) {
    let _coins = this.props.coins;
    let _items = [];
    let _allItems = [];

    for (let i = 0; i < coinsList.length; i++) {
      const _coin = coinsList[i];
      const _name = _coin.name.split('|')[0];
      const _mode = _coin.name.split('|')[1];

      if (!this.state.searchTerm ||
          (this.state.searchTerm && ((this.state.searchTerm.toLowerCase() === 'kmd' && isKomodoCoin(_name.toLowerCase()) && !erc20ContractId[_name.toLowerCase()]) || _name.substring(0, this.state.searchTerm.length).toLowerCase() === this.state.searchTerm.toLowerCase() || _mode.substring(0, this.state.searchTerm.length).toLowerCase() === this.state.searchTerm.toLowerCase() || _coin.title.substring(0, this.state.searchTerm.length).toLowerCase() === this.state.searchTerm.toLowerCase()))) {
        _items.push(
          <div
            onClick={ () => this.addCoin(_coin.name) }
            key={ `overview-coins-${_coin.name}` }
            className={ 'overview-coin' + (_coins[_coin.name] ? ' disabled' : '') }>
            <div className="btc">
              <img
                className="oval4"
                src={ `${assetsPath.coinLogo}/${_mode}/${_name}.png` } />
            </div>
            <div className="bitcoin">{ translate(`${_mode.toUpperCase()}.${_name.toUpperCase()}`) }</div>
            { _mode === 'eth' &&
              erc20ContractId[_mode.toUpperCase()] &&
              <div className="badge badge--erc20">ERC20</div>
            }
          </div>
        );

        if (this.props.activate &&
            (this.props.coins.indexOf(_coin.name) === -1 || this.props.filterOut.indexOf(_coin.name) > -1)) {
          _items.pop();
        }
      }
    }

    if (!_items.length) {
      return (
        <div className="padding-top-15 padding-left-15">{ translate('ADD_COIN.NO_MATCHING_RESULTS') }</div>
      );
    }

    return _items;
  }

  render() {
    if (this.props.activate ||
        (this.props.activeSection !== 'create-seed' &&
        this.props.activeSection !== 'pin' &&
        this.props.activeSection !== 'offlinesig')) {
      if (this.props.activate ||
          this.props.activeSection === 'addcoin' ||
          !this.props.coins ||
          (this.props.coins && !Object.keys(this.props.coins).length)) {
        return (
          <div className="addcoin-ui">
            <div className="home form">
              <div className="home-inner">
                <div className="edit margin-bottom-10">
                  <input
                    type="text"
                    name="searchTerm"
                    onChange={ this.updateInput }
                    placeholder={ translate('ADD_COIN.QUICK_SEARCH') }
                    value={ this.state.searchTerm || '' } />
                  <i
                    onClick={ this.clearSearchTerm }
                    className="search-remove">x</i>
                </div>
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