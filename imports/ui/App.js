import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import actions from './actions/actions';
import {
  setLocalStorageVar,
  getLocalStorageVar,
  sortBy,
} from './actions/utils';

import SendCoin from './components/SendCoin';
import MyAddress from './components/MyAddress';
import AddCoin from './components/AddCoin';
import Login from './components/Login';
import Transactions from './components/Transactions';
import Balance from './components/Balance';

const DASHBOARD_UPDATE_INTERVAL = 120000;

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      address: null,
      balance: null,
      transactions: null,
      utxo: null,
      errors: null,
      displayMenu: false,
      loading: false,
      coin: null,
      coins: {
        //'kmd': {}
      },
      pubKeys: {},
      activeSection: null,
      saveSeed: null,
      auth: false,
      updateInterval: null,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.lock = this.lock.bind(this);
    // this.getKeys = this.getKeys.bind(this);
    this.getBalance = this.getBalance.bind(this);
    this.getTransactions = this.getTransactions.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
    this.toggleSend = this.toggleSend.bind(this);
    this.toggleAddCoin = this.toggleAddCoin.bind(this);
    this.dashboardRefresh = this.dashboardRefresh.bind(this);
    this.saveSeed = this.saveSeed.bind(this);
    this.switchCoin = this.switchCoin.bind(this);
    this.addCoin = this.addCoin.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
    this.toggleAutoRefresh = this.toggleAutoRefresh.bind(this);
  }

  componentWillMount() {
    const _localStorageCoins = getLocalStorageVar('coins');
    console.warn(_localStorageCoins);

    if (_localStorageCoins) {
      this.setState({
        coins: _localStorageCoins,
      });
    }
  }

  addCoin(coin) {
    let coins = this.state.coins;
    coins[coin] = {
      // defaults
    };

    this.setState({
      coins,
    });

    setLocalStorageVar('coins', this.state.coins);
  }

  changeActiveSection(section, toggleMenu) {
    if (toggleMenu) {
      this.setState({
        displayMenu: false,
        activeSection: section,
      });
    } else {
      this.setState({
        activeSection: section,
      });
    }
  }

  switchCoin(coin) {
    this.setState({
      coin: coin,
      address: this.state.pubKeys[coin],
    });

    // toggle refresh and update in-mem coins cache obj
    setTimeout(() => {
      this.toggleMenu();
      this.dashboardRefresh();
    }, 10);
  }

  toggleAutoRefresh(disable) {
    if (disable) {
      console.warn('disable updates');
      console.warn('interval id ' + this.state.updateInterval);
      clearInterval(this.state.updateInterval);

      this.setState({
        updateInterval: null,
      });
    } else {
      const _updateInterval = setInterval(() => {
        console.warn('dashboard update triggered');
        if (this.state.activeSection === 'dashboard') {
          this.dashboardRefresh();
        }
      }, DASHBOARD_UPDATE_INTERVAL);

      console.warn('set inverval id ' + _updateInterval);
      this.setState({
        updateInterval: _updateInterval,
      });
    }
  }

  dashboardRefresh() {
    this.getBalance();
    this.getTransactions();
  }

  /*getKeys() {
    const { actions } = this.props;

    actions.getKeys()
    .then((res) => {
      console.warn(res);
    });
  }*/

  getBalance() {
    const { actions } = this.props;

    actions.balance(this.state.coin)
    .then((res) => {
      this.setState({
        balance: res,
      });
      console.warn(res);
    });
  }

  getTransactions() {
    const { actions } = this.props;

    this.setState({
      loading: true,
    });

    actions.transactions(this.state.coin)
    .then((res) => {
      res = sortBy(res, 'confirmations');

      this.setState({
        transactions: res,
        loading: false,
      });
      console.warn(res);
    });
  }

  // purge keys and added coins
  logout() {
    const { actions } = this.props;

    actions.clearKeys()
    .then((res) => {
      this.toggleAutoRefresh(true);
      setLocalStorageVar('coins', {});

      setTimeout(() => {
        this.setState(this.defaultState);
      }, 10);
    });
  }

  // lock is logout when list of added coins is persistent
  lock() {
    const { actions } = this.props;

    actions.clearKeys()
    .then((res) => {
      const lockState = Object.assign({}, this.defaultState);
      lockState.coins = this.state.coins;

      this.toggleAutoRefresh(true);

      setTimeout(() => {
        this.setState(lockState);
      }, 10);
    });
  }

  login(passphrase) {
    const { actions } = this.props;

    actions.auth(passphrase)
    .then((res) => {
      // select a coin and an address
      let coin;
      let address;

      if (this.state.coins.kmd) {
        coin = 'kmd';
        address = res.kmd;
      } else {
        coin = Object.keys(this.state.coins)[0];
        address = res[coin];
      }

      this.setState({
        auth: true,
        pubKeys: res,
        coin,
        address,
        activeSection: 'dashboard',
      });

      this.dashboardRefresh();
      this.toggleAutoRefresh();

      console.warn('post login state');
      console.warn(this.state);
    });
  }

  saveSeed() {
    const { actions } = this.props;

    actions.saveToFile()
    .then((res) => {
      this.setState({
        saveSeed: res,
      });
      console.warn('saveToFile', res);
    });
  }

  toggleMenu() {
    if (!this.state.displayMenu) {
      document.getElementById('body').style.overflow = 'hidden';
    } else {
      document.getElementById('body').style.overflow = 'inherit';
    }

    this.setState({
      displayMenu: !this.state.displayMenu,
    });
  }

  toggleSend() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'send' ? 'dashboard' : 'send',
    });
  }

  toggleAddCoin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'addcoin' ? 'dashboard' : 'addcoin',
    });
  }

  renderActiveCoins() {
    let _items = [];

    for (let key in this.state.coins) {
      _items.push(
        <div
          onClick={ () => key !== this.state.coin ? this.switchCoin(key) : null }
          key={ `active-coins-${key}` }
          className="active-coins">
          <img
            src={ `/images/cryptologo/${key}.png` } /> <span>{ key.toUpperCase() }</span>
          { key === this.state.coin &&
            <i className="fa fa-check"></i>
          }
        </div>
      );
    }

    return _items;
  }

  renderMenu() {
    if (this.state.displayMenu) {
      return (
        <div className="nav-menu">
          <div className="nav-menu-overlay"></div>
          <div className="nav-menu-inner">
            <i
              onClick={ this.toggleMenu }
              className="fa fa-bars"></i>
            <div className="nav-menu-items">
              <div onClick={ this.logout }>Logout</div>
              <div onClick={ this.lock }>Lock</div>
              <div onClick={ () => this.changeActiveSection('dashboard', true) }>Dashboard</div>
              <div onClick={ this.toggleSend }>Send</div>
              <div>
              { this.renderActiveCoins() }
              </div>
              <div onClick={ this.toggleAddCoin }>Add coin</div>
            </div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  renderSpinner() {
    let _paths = [];

    for (let i = 0; i < 4; i++) {
      _paths.push(
        <circle
          className={ i === 0 ? 'path' : `path${i + 1}` }
          cx="50"
          cy="50"
          r="20"
          fill="none"
          strokeWidth="5"
          strokeMiterlimit="10"
          key={ `spinner-circle-${i}` } />
      );
    }

    return (
      <div className="loader">
        <svg className="circle">
        { _paths }
        </svg>
      </div>
    );
  }

  render() {
    return (
      <div className="app-container">
        <div className="app-header">
          <img src="/images/agama-logo-side.svg" />
          { this.state.auth &&
            <img
              className="margin-left-20"
              src={ `/images/cryptologo/${this.state.coin}.png` } />
          }
          { this.state.auth &&
            <i
              onClick={ this.toggleMenu }
              className="fa fa-bars"></i>
          }
        </div>
        <div className="app-main">
          <Login
            { ...this.state }
            login={ this.login } />
          { this.state.auth &&
            this.state.activeSection === 'dashboard' &&
            <MyAddress { ...this.state } />
          }
          { this.renderMenu() }
          <SendCoin
            { ...this.state }
            sendtx={ this.props.actions.sendtx } />
          <AddCoin
            { ...this.state }
            addCoin={ this.addCoin }
            changeActiveSection={ this.changeActiveSection } />
          { !this.state.loading &&
            this.state.auth &&
            this.state.activeSection === 'dashboard' &&
            <i
              onClick={ this.dashboardRefresh }
              className="fa fa-refresh dashboard-refresh"></i>
          }
          { this.state.loading &&
            this.state.activeSection === 'dashboard' &&
            this.renderSpinner()
          }
          <Balance { ...this.state } />
          <Transactions { ...this.state } />
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    keys: state.keys,
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch),
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);