import React from 'react';

import { electrumServers } from '../actions/electrumServers';
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
      for (let key in electrumServers) {
        this.props.addCoin(electrumServers[key].abbr.toLowerCase());
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
    let _items = [];
    _items.push(
      <span key={ `addcoin-kmd` }>
        <img
          onClick={ () => singleSelect ? this.addCoin('kmd') : this.toggleMultiSelectCoin('kmd') }
          src={ `/images/cryptologo/kmd.png` } />
        { this.state.multiSelect.kmd &&
          !singleSelect &&
          <i className="fa fa-check-circle-o"></i>
        }
      </span>
    );

    for (let key in electrumServers) {
      if (key !== 'komodo') {
        const _coin = electrumServers[key].abbr.toLowerCase();

        _items.push(
          <span key={ `addcoin-${key}` }>
            <img
              onClick={ () => singleSelect ? this.addCoin(_coin) : this.toggleMultiSelectCoin(_coin) }
              src={ `/images/cryptologo/${_coin}.png` } />
            { this.state.multiSelect[_coin] &&
              !singleSelect &&
              <i className="fa fa-check-circle-o"></i>
            }
          </span>
        );
      }
    }

    return _items;
  }

  renderCoinShortcuts() {
    return (
      <div className="coins-list-shortcuts">
        <div
          onClick={ () => this.addCoin('kmd+chips') }
          className="combination">
          <img src="/images/cryptologo/kmd.png" />
          <i className="fa fa-plus margin-left-15 margin-right-15"></i>
          <img src="/images/cryptologo/chips.png" />
        </div>
        <div
          onClick={ () => this.addCoin('kmd+revs+jumblr') }
          className="combination">
          <img src="/images/cryptologo/kmd.png" />
          <i className="fa fa-plus margin-left-15 margin-right-15"></i>
          <img src="/images/cryptologo/revs.png" />
          <i className="fa fa-plus margin-left-15 margin-right-15"></i>
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

  render() {
    if (this.props.activeSection === 'addcoin' ||
        !this.props.coins ||
        (this.props.coins && !Object.keys(this.props.coins).length)) {
      return (
        <div className="col-sm-12">
          <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
            <div className="row">
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
              <div className="margin-top-10 padding-bottom-20">
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
        </div>
      );
    } else {
      return null;
    }
  }
}

export default AddCoin;