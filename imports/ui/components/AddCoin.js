import React from 'react';

import { coinsList } from '../actions/utils';
import { translate } from '../translate/translate';

class AddCoin extends React.Component {
  constructor() {
    super();
    this.state = {
      multiSelect: {},
    };
    this.addCoin = this.addCoin.bind(this);
    this.toggleMultiSelectCoin = this.toggleMultiSelectCoin.bind(this);
  }

  toggleMultiSelectCoin(coin) {
    let multiSelect = this.state.multiSelect;

    if (multiSelect[coin]) {
      delete multiSelect[coin];
    } else {
      multiSelect[coin] = true;
    }

    this.setState({
      multiSelect,
    });
  }

  addCoin(coin) {
    if (coin === 'multi') {
      for (let key in this.state.multiSelect) {
        this.props.addCoin(key);
      }
    } else if (coin === 'kmd+chips') {
      this.props.addCoin('kmd');
      this.props.addCoin('chips');
    } else if (coin === 'kmd+revs+jumblr') {
      this.props.addCoin('kmd');
      this.props.addCoin('revs');
      this.props.addCoin('jumblr');
    } else if (coin === 'all') {
      for (let i = 0; i < coinsList.length; i++) {
        const key = coinsList[i];
        this.props.addCoin(key.toLowerCase());
      }
    } else {
      this.props.addCoin(coin);
    }

    if (Object.keys(this.props.coins).length) {
      this.props.changeActiveSection('dashboard');
    } else {
      this.props.changeActiveSection('login');
    }

    this.setState({
      multiSelect: {},
    });
  }

  renderCoins(singleSelect) {
    let _coins = this.props.coins;
    let _items = [];

    _items.push(
      <div
        onClick={ () => this.addCoin('kmd') }
        key={ `overview-coins-kmd` }
        className={ 'overview-coin' + (_coins.kmd ? ' disabled' : '') }>
          <img className="div1" src="/images/template/home/trends-rectangle-7.png" />
          <div className="btc">
            <img
              className="oval4"
              src={ `/images/cryptologo/kmd.png` } />
          </div>
          <div className="bitcoin">{ translate('COINS.KMD') }</div>
      </div>
    );

    /*_items.push(
      <span
        className={ _coins.kmd ? 'disabled' : '' }
        key={ `addcoin-kmd` }>
        <img
          onClick={ () => singleSelect ? this.addCoin('kmd') : this.toggleMultiSelectCoin('kmd') }
          src={ `/images/cryptologo/kmd.png` } />
        <div>
          KMD
          { this.state.multiSelect.kmd &&
            !singleSelect &&
            <i className="fa fa-check-circle-o"></i>
          }        
        </div>
      </span>
    );*/

    for (let i = 0; i < coinsList.length; i++) {
      const key = coinsList[i];

      if (key !== 'komodo') {
        const _coin = key.toLowerCase();

        _items.push(
          <div
            onClick={ () => this.addCoin(_coin) }
            key={ `overview-coins-${_coin}` }
            className={ 'overview-coin' + (_coins[_coin] ? ' disabled' : '') }>
            <div className="btc">
              <img
                className="oval4"
                src={ `/images/cryptologo/${_coin}.png` } />
            </div>
            <div className="bitcoin">{ translate('COINS.' + _coin.toUpperCase()) }</div>
          </div>
        );

        /*_items.push(
          <span
            className={ _coins[key] ? 'disabled' : '' }
            key={ `addcoin-${key}` }>
            { _coins[key] &&
              <img src={ `/images/cryptologo/${_coin}.png` } />
            }
            { !_coins[key] &&
              <img
                onClick={ () => singleSelect ? this.addCoin(_coin) : this.toggleMultiSelectCoin(_coin) }
                src={ `/images/cryptologo/${_coin}.png` } />
            }
            <div>
              { key }
              { this.state.multiSelect[_coin] &&
                !singleSelect &&
                <i className="fa fa-check-circle-o"></i>
              }
            </div>
          </span>
        );*/
      }
    }

    return _items;
  }

  renderCoinShortcuts() {
    let _coins = this.props.coins;

    return (
      <div className="coins-list-shortcuts">
        <div
          onClick={ () => this.addCoin('kmd+chips') }
          className="combination margin-left-25">
          <img
            className={ _coins.kmd ? 'disabled' : '' }
            src="/images/cryptologo/kmd.png" />
          <i className="fa fa-plus margin-left-15 margin-right-15"></i>
          <img
            className={ _coins.chips ? 'disabled' : '' }
            src="/images/cryptologo/chips.png" />
        </div>
        <div
          onClick={ () => this.addCoin('kmd+revs+jumblr') }
          className="combination margin-left-25">
          <img
            className={ _coins.kmd ? 'disabled' : '' }
            src="/images/cryptologo/kmd.png" />
          <i className="fa fa-plus margin-left-15 margin-right-15"></i>
          <img
            className={ _coins.revs ? 'disabled' : '' }
            src="/images/cryptologo/revs.png" />
          <i
            className={ _coins.jumblr ? 'disabled' : '' }
            className="fa fa-plus margin-left-15 margin-right-15"></i>
          <img src="/images/cryptologo/jumblr.png" />
        </div>
        <div className="combination">
          <button
            className="btn btn-lg btn-primary btn-block ladda-button"
            onClick={ () => this.addCoin('all') }>
            <span className="ladda-label">
            { translate('ADD_COIN.ADD_ALL_COINS') }
            </span>
          </button>
        </div>
      </div>
    );
  }

/*<div className="col-sm-12 addcoin">
  <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
    <div className="row">
      <div className="margin-bottom-30">
        <span
          className="btn-back"
          onClick={ () => this.props.changeActiveSection(this.props.auth ? 'dashboard' : 'login') }>
          <i className="fa fa-arrow-left"></i> { translate('DASHBOARD.BACK') }
        </span>
      </div>
      <h4>{ translate('ADD_COIN.SHORTCUTS') }</h4>
      <div className="coins-list">
      { this.renderCoins(true) }
      </div>
      { this.renderCoinShortcuts() }
      <hr />
      <h4>{ translate('ADD_COIN.MULTI_SELECT') }</h4>
      <div className="coins-list">
        { this.renderCoins() }
      </div>
      <div className="padding-bottom-20">
        <button
          className="btn btn-lg btn-primary btn-block ladda-button"
          onClick={ () => this.addCoin('multi') }>
          <span className="ladda-label">
          { translate('ADD_COIN.ADD_SELECTED_COINS') }
          </span>
        </button>
      </div>
    </div>
  </div>
</div>*/

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