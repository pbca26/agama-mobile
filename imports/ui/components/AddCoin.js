import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import actions from '../actions/actions';
import { electrumServers } from '../actions/electrumServers';

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
  }

  componentWillReceiveProps(props) {
    console.warn(props);
  }

  renderCoins() {
    let _items = [];

    for (let key in electrumServers) {
      _items.push(
        <span key={ `addcoin-${key}` }>
          <img
            onClick={ () => this.toggleMultiSelectCoin(electrumServers[key].abbr.toLowerCase()) }
            src={ `/images/cryptologo/${electrumServers[key].abbr.toLowerCase()}.png` } />
          { this.state.multiSelect[electrumServers[key].abbr.toLowerCase()] &&
            <i className="fa fa-check-circle-o"></i>
          }
        </span>
      );
    }

    return _items;
  }

  renderCoinShortcuts() {
    return (
      <div className="coins-list-shortcuts">
        <div className="combination">
          <img
            onClick={ () => this.addCoin('kmd') }
            src="/images/cryptologo/kmd.png" />
          <strong className="margin-left-20 margin-right-20">OR</strong>
          <img
            onClick={ () => this.addCoin('chips') }
            src="/images/cryptologo/chips.png" />
        </div>
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
            Add all coins
            </span>
          </button>
        </div>
      </div>
    );
  }

  render() {
    if (this.props.activeSection === 'addcoin' ||
        !Object.keys(this.props.coins).length) {
      return (
        <div className="col-sm-12 padding-top-10 fixed-layer">
          <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
            <div className="row margin-top-10">
              <h4 className="padding-bottom-10">Shortcuts</h4>
              { this.renderCoinShortcuts() }
              <hr />
              <h4>Multi-select</h4>
              <div className="coins-list">
                { this.renderCoins() }
                <div className="margin-top-10">
                  <button
                    className="btn btn-lg btn-primary btn-block ladda-button"
                    onClick={ () => this.addCoin('multi') }>
                    <span className="ladda-label">
                    Add selected coins
                    </span>
                  </button>
                </div>
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

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch),
  }
}

export default connect(mapDispatchToProps)(AddCoin);