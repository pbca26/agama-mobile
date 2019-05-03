import React from 'react';
import { Meteor } from 'meteor/meteor';

import {
  coinsList,
  assetsPath,
  getLocalStorageVar,
} from '../actions/utils';
import translate from '../translate/translate';
import { kmdAssetChains } from 'agama-wallet-lib/build/coin-helpers';
import erc20ContractId from 'agama-wallet-lib/build/eth-erc20-contract-id';
import nnConfig from './NotaryVote/config';

class AddCoin extends React.Component {
  constructor() {
    super();
    this.state = {
      multiSelect: {},
      searchTerm: '',
      searchSub: null,
    };
    this.updateInput = this.updateInput.bind(this);
    this.clearSearchTerm = this.clearSearchTerm.bind(this);
    this.addCoin = this.addCoin.bind(this);
    this.updateSearchSub = this.updateSearchSub.bind(this);
  }

  updateSearchSub(sub) {
    this.setState({
      searchSub: sub === this.state.searchSub ? null : sub,
    });
  }

  componentWillMount() {
    Meteor.setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);
  }

  clearSearchTerm() {
    this.setState({
      searchTerm: '',
    });
    window.scrollTo(0, 0);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
    window.scrollTo(0, 0);
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
          (this.state.searchTerm && (_name.substring(0, this.state.searchTerm.length).toLowerCase() === this.state.searchTerm.toLowerCase() || _coin.title.substring(0, this.state.searchTerm.length).toLowerCase() === this.state.searchTerm.toLowerCase()))) {
        _items.push(
          <div
            onClick={ () => this.addCoin(_coin.name) }
            key={ `overview-coins-${_coin.name}` }
            className={ 'overview-coin' + (_coins && _coins[_coin.name] ? ' disabled' : '') }>
            <div className="btc">
              <img
                className="oval4"
                src={ `${assetsPath.coinLogo}/${_mode}/${_name}.png` } />
            </div>
            <div className="bitcoin">{ translate(`${_mode.toUpperCase()}.${_name.toUpperCase()}`) }</div>
            { _mode === 'eth' &&
              erc20ContractId[_name.toUpperCase()] &&
              <div className="badge badge--erc20">ERC20</div>
            }
          </div>
        );

        if (this.props.activate &&
            (this.props.coins && this.props.coins.indexOf(_coin.name) === -1 || this.props.filterOut && this.props.filterOut.indexOf(_coin.name) > -1)) {
          _items.pop();
        }

        if (_name === nnConfig.coin &&
            (Math.floor(Date.now() / 1000) < nnConfig.activation || Math.floor(Date.now() / 1000) > nnConfig.deactivation)) {
          _items.pop();
        }

        if (this.state.searchSub &&
            this.state.searchSub === 'kic' &&
            (_mode === 'eth' || (_mode === 'spv' && kmdAssetChains.indexOf(_name.toUpperCase()) === -1))) {
          _items.pop();
        }

        if (this.state.searchSub &&
            this.state.searchSub === 'erc20' &&
            (_mode === 'spv' || (_mode === 'eth' && !erc20ContractId[_name.toUpperCase()]))) {
          _items.pop();
        }
      }
    }

    if (!_items.length) {
      return (
        <div className="padding-top-25 padding-left-15">{ translate('ADD_COIN.NO_MATCHING_RESULTS') }</div>
      );
    }

    return _items;
  }

  render() {
    if (this.props.activate ||
        (this.props.activeSection !== 'pin' &&
        this.props.activeSection !== 'offlinesig') ||
        ((!getLocalStorageVar('coins') || (getLocalStorageVar('coins') && !Object.keys(getLocalStorageVar('coins')).length)) && getLocalStorageVar('seed'))) {
      if (this.props.activate ||
          this.props.activeSection === 'addcoin' ||
          ((!getLocalStorageVar('coins') || (getLocalStorageVar('coins') && !Object.keys(getLocalStorageVar('coins')).length)) && getLocalStorageVar('seed'))) {
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
                { !this.props.activate &&
                  <div className="edit margin-bottom-10 toggles">
                    <div className="toggle-item">
                      <label className="switch">
                        <input
                          type="checkbox"
                          value="on"
                          checked={ this.state.searchSub === 'kic' }
                          readOnly />
                        <div
                          className="slider"
                          onClick={ () => this.updateSearchSub('kic') }></div>
                      </label>
                      <div
                        className="toggle-label"
                        onClick={ () => this.updateSearchSub('kic') }>
                        { translate('ADD_COIN.KIC') }
                      </div>
                    </div>
                    <div className="toggle-item">
                      <label className="switch">
                        <input
                          type="checkbox"
                          value="on"
                          checked={ this.state.searchSub === 'erc20' }
                          readOnly />
                        <div
                          className="slider"
                          onClick={ () => this.updateSearchSub('erc20') }></div>
                      </label>
                      <div
                        className="toggle-label"
                        onClick={ () => this.updateSearchSub('erc20') }>
                        { translate('ADD_COIN.ERC20') }
                      </div>
                    </div>
                  </div>
                }
                <div className={ 'overview-coins' + (this.props.activate ? ' overview-coins--small' : '') }>{ this.renderCoins() }</div>
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