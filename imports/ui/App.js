import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import electrumServers from 'agama-wallet-lib/build/electrum-servers';
import { Meteor } from 'meteor/meteor';
import actions from './actions/actions';
import {
  setLocalStorageVar,
  getLocalStorageVar,
  convertURIToImageData,
  assetsPath,
  sortObject,
} from './actions/utils';
import translate from './translate/translate';
import {
  devlog,
  config,
} from './actions/dev';
import {
  getRandomIntInclusive,
  sort,
} from 'agama-wallet-lib/build/utils';

import SendCoin from './components/SendCoin';
import AddCoin from './components/AddCoin';
import Login from './components/Login';
import Transactions from './components/Transactions';
import ServerSelect from './components/ServerSelect';
import CreateSeed from './components/CreateSeed';
import KMDInterest from './components/KMDInterest';
import OfflineSigning from './components/OfflineSigning';
import Pin from './components/Pin';
import Recovery from './components/Recovery';
import Overview  from './components/Overview';
import Settings  from './components/Settings';

const DASHBOARD_UPDATE_INTERVAL = 120000; // 2m
const PROXY_RETRY_COUNT = 2;
const PROXY_RETRY_TIMEOUT = 5000;

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
      coins: {},
      pubKeys: {},
      activeSection: 'login',
      saveSeed: null,
      auth: false,
      updateInterval: null,
      conError: false,
      proxyError: false,
      proxyErrorCount: 0,
      proxyRetryInProgress: false,
      overview: null,
      history: null,
      btcFees: null,
    };
    this.globalClickTimeout = null;
    this.overviewInterval = null;
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.lock = this.lock.bind(this);
    // this.getKeys = this.getKeys.bind(this);
    this.getBalance = this.getBalance.bind(this);
    this.getTransactions = this.getTransactions.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
    this.dashboardRefresh = this.dashboardRefresh.bind(this);
    this.switchCoin = this.switchCoin.bind(this);
    this.addCoin = this.addCoin.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
    this.toggleAutoRefresh = this.toggleAutoRefresh.bind(this);
    this.toggleKMDInterest = this.toggleKMDInterest.bind(this);
    this.toggleOverview = this.toggleOverview.bind(this);
    this.toggleMenuOption = this.toggleMenuOption.bind(this);
    this.globalClick = this.globalClick.bind(this);
    this.historyBack = this.historyBack.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.getBtcFees = this.getBtcFees.bind(this);
    this.retryProxy = this.retryProxy.bind(this);
    this.updateDefaultCoinServer = this.updateDefaultCoinServer.bind(this);
  }

  componentWillMount() {
    const { actions } = this.props;
    const _localStorageCoins = getLocalStorageVar('coins');

    if (_localStorageCoins) {
      this.setState({
        coins: _localStorageCoins,
      });
    }
  
    actions.getOverview(this.state.coins)
    .then((res) => {
      this.setState({
        overview: res,
      });
    });
  }

  updateDefaultCoinServer(coin, server) {
    let _newState = JSON.parse(JSON.stringify(this.state.coins));
    _newState[coin].server = server;
    
    setLocalStorageVar('coins', _newState);
    this.setState({
      coins: _newState,
    });
  }

  retryProxy(disableAnimation) {
    const { actions } = this.props;

    if (!disableAnimation ||
       typeof disableAnimation === 'object') {
      this.setState({
        proxyRetryInProgress: true,
      });

      Meteor.setTimeout(() => {
        this.setState({
          proxyRetryInProgress: false,
        });
      }, 1000);
    }
    
    actions.getAnotherProxy();
    this.dashboardRefresh();
  }

  getBtcFees() {
    const { actions } = this.props;
  
    this.setState({
      btcFees: null,
    });

    actions.getBtcFees()
    .then((res) => {
      this.setState({
        btcFees: res,
      });

      if (res === 'error') {
        Meteor.setTimeout(() => {
          this.getBtcFees();
        }, 5000);
      }
    });
  }

  historyBack() {
    this.setState({
      activeSection: this.state.history,
      history: null,
    });
  }

  scrollToTop() {
    window.scrollTo(0, 0);
  }

  /*globalClick() {
    if (this.state.auth) {
      if (this.globalClickTimeout) {
        Meteor.clearTimeout(this.globalClickTimeout);
      }

      if (!config.dev ||
          (config.dev && config.preload && !config.preload.disableAutoLock) ||
          (config.dev && !config.preload)) {
        this.globalClickTimeout = Meteor.setTimeout(() => {
          devlog(`logout after ${DEFAULT_LOCK_INACTIVE_INTERVAL}ms inactivity`);
          this.lock();
        }, DEFAULT_LOCK_INACTIVE_INTERVAL);
      }

      devlog('global click', 'set timer');
    }
  }*/

  globalClick() {
    const _storageSettings = getLocalStorageVar('settings');    
    const DEFAULT_LOCK_INACTIVE_INTERVAL = _storageSettings && _storageSettings.autoLockTimeout ? _storageSettings.autoLockTimeout : 600000; // 10m
    
    if (this.state.auth) {
      if (this.globalClickTimeout) {
        Meteor.clearTimeout(this.globalClickTimeout);
      }

      if (!config.dev ||
          (config.dev && config.preload && !config.preload.disableAutoLock) ||
          (config.dev && !config.preload)) {
        this.globalClickTimeout = Meteor.setTimeout(() => {
          devlog(`logout after ${DEFAULT_LOCK_INACTIVE_INTERVAL}ms inactivity`);
          this.lock();
        }, DEFAULT_LOCK_INACTIVE_INTERVAL);
      }

      devlog('global click', 'set timer');
    }
  }

  addCoin(coin) {
    let server = electrumServers[coin];
    let coins = this.state.coins;

    // pick a random server to communicate with
    if (server.serverList &&
        server.serverList.length > 0) {
      const randomServerId = getRandomIntInclusive(0, server.serverList.length - 1);
      const randomServer = server.serverList[randomServerId];
      const serverDetails = randomServer.split(':');

      if (serverDetails.length === 3) {
        server = {
          ip: serverDetails[0],
          port: serverDetails[1],
          proto: serverDetails[2],
        };
      }
    }

    coins[coin] = {
      server,
    };

    setLocalStorageVar('coins', this.state.coins);

    if (!this.state.auth) {
      this.setState({
        coins,
        history: null,
        activeSection: 'login',
      });
    } else {
      const { actions } = this.props;

      actions.addKeyPair(coin)
      .then((res) => {
        this.setState({
          coins,
          history: null,
          activeSection: 'dashboard',
          coin,
          address: res,
          loading: true,
          transactions: this.state.coins[coin] ? this.state.coins[coin].transactions: null,
          balance: this.state.coins[coin] ? this.state.coins[coin].balance: null,
        });
        this.scrollToTop();
        this.dashboardRefresh();
      });
    }
  }

  toggleKMDInterest() {
    const { actions } = this.props;

    this.setState({
      utxo: null,
      history: this.state.activeSection,
      activeSection: 'claim',
    });

    actions.kmdUnspents()
    .then((res) => {
      this.scrollToTop();
      this.setState({
        utxo: res,
      });
    });
  }

  changeActiveSection(section, toggleMenu) {
    if (toggleMenu) {
      this.setState({
        displayMenu: false,
        history: this.state.activeSection,
        activeSection: section,
      });
    } else {
      this.setState({
        history: this.state.activeSection,        
        activeSection: section,
      });
    }

    if (this.state.coin === 'btc' &&
        section === 'send') {
      this.getBtcFees();
    }

    this.scrollToTop();
  }

  switchCoin(coin) {
    this.setState({
      coin: coin,
      address: this.state.pubKeys[coin],
      history: this.state.activeSection,
      activeSection: 'dashboard',
      transactions: this.state.coins[coin] ? this.state.coins[coin].transactions: null,
      balance: this.state.coins[coin] ? this.state.coins[coin].balance: null,
    });

    // toggle refresh and update in-mem coins cache obj
    Meteor.setTimeout(() => {
      this.toggleMenu();
      this.dashboardRefresh();
      this.scrollToTop();
    }, 10);
  }

  toggleAutoRefresh(disable) {
    if (disable) {
      Meteor.clearInterval(this.state.updateInterval);
      Meteor.clearInterval(this.state.overviewInterval);

      this.setState({
        updateInterval: null,
      });
    } else {
      const _updateInterval = Meteor.setInterval(() => {
        if (this.state.activeSection === 'dashboard') {
          this.dashboardRefresh();
        }
      }, DASHBOARD_UPDATE_INTERVAL);

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
      if (res &&
          res === 'proxy-error') {
        let _newState = {
          proxyError: true,
          proxyErrorCount: this.state.proxyErrorCount + 1,
        };

        if (this.state.proxyErrorCount + 1 <= PROXY_RETRY_COUNT &&
            this.state.proxyErrorCount >= 0) {
          Meteor.setTimeout(() => {
            devlog(`proxy retry attempt #${this.state.proxyErrorCount}`);
            this.retryProxy(true);
          }, PROXY_RETRY_TIMEOUT);
        } else {
          _newState = {
            proxyError: true,
            proxyErrorCount: -777,
          }
          devlog(`${PROXY_RETRY_COUNT} consecutive proxy retry attempts have failed, go manual`);
        }

        this.setState(_newState);
      } else {
        if (res &&
            !res.hasOwnProperty('balance') &&
            res.indexOf('error') > -1) {
          this.setState({
            balance: null,
            transactions: null,
            conError: true,
          });
        } else {
          this.setState({
            balance: res,
            conError: false,
            proxyError: false,
            proxyErrorCount: 0,
          });
        }
      }
    });
  }

  getTransactions() {
    const { actions } = this.props;

    this.setState({
      loading: true,
    });

    actions.transactions(this.state.coin)
    .then((res) => {
      if (res &&
          (res.indexOf('error') > -1 || res.indexOf('proxy-error') > -1)) {
        this.setState({
          balance: null,
          transactions: null,
          loading: false,
          conError: true,
        });
      } else {
        res = sort(res, 'timestamp', true);

        this.setState({
          transactions: res,
          loading: false,
          conError: false,
          proxyError: false,
          proxyErrorCount: 0,          
        });
      }
    });
  }

  // purge keys and added coins
  logout() {
    const { actions } = this.props;

    actions.clearKeys()
    .then((res) => {
      this.toggleAutoRefresh(true);
      setLocalStorageVar('coins', {});

      Meteor.setTimeout(() => {
        this.toggleMenu();
      }, 10);
      Meteor.setTimeout(() => {
        this.setState(this.defaultState);
      }, 20);
      this.scrollToTop();
    });
  }

  // lock is logout when list of added coins is persistent
  lock() {
    const { actions } = this.props;

    if (this.globalClickTimeout) {
      Meteor.clearTimeout(this.globalClickTimeout);
    }

    actions.clearKeys()
    .then((res) => {
      const lockState = Object.assign({}, this.defaultState);
      lockState.coins = this.state.coins;

      this.toggleAutoRefresh(true);
      Meteor.setTimeout(() => {
        this.toggleMenu();
      }, 10);
      Meteor.setTimeout(() => {
        this.setState(lockState);
      }, 20);
      this.scrollToTop();
    });
  }

  login(passphrase) {
    const { actions } = this.props;

    actions.auth(passphrase, this.state.coins)
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

      if (config.preload &&
          config.preload.activeCoin) {
        coin = config.preload.activeCoin;
        address = res[coin];
      }

      this.setState({
        auth: true,
        pubKeys: res,
        coin,
        address,
        history: null,
        activeSection: 'dashboard',
      });

      this.dashboardRefresh();
      this.toggleAutoRefresh();
      this.globalClick();
      this.scrollToTop();
    });
  }

  toggleMenu() {
    this.setState({
      displayMenu: !this.state.displayMenu,
    });
  }

  toggleOverview() {
    const { actions } = this.props;
    
    actions.getOverview(this.state.coins)
    .then((res) => {
      this.setState({
        overview: res,
      });
    });

    if (!this.state.overviewInterval) {
      const _updateInterval = Meteor.setInterval(() => {
        if (this.state.activeSection === 'overview') {
          actions.getOverview(this.state.coins)
          .then((res) => {
            this.setState({
              overview: res,
            });
          });
        }
      }, DASHBOARD_UPDATE_INTERVAL);

      this.setState({
        overviewInterval: _updateInterval,
      });
    }

    this.toggleMenuOption('overview');
  }

  toggleMenuOption(optionName) {
    Meteor.setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === optionName ? (this.state.auth ? 'dashboard' : 'login') : optionName,
    });
    this.scrollToTop();
  }

  renderActiveCoins() {
    let _coins = JSON.parse(JSON.stringify(this.state.coins));
    let _items = [];
    _coins = sortObject(_coins);

    for (let key in _coins) {
      _items.push(
        <div
          onClick={ () => key !== this.state.coin ? this.switchCoin(key) : null }
          key={ `active-coins-${key}` }
          className="active-coins">
          <img src={ `${assetsPath.coinLogo}/${key}.png` } /> <span>{ key.toUpperCase() }</span>
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
        <div className="menu-ui">
          <div className="sidemenu">
            <div className="sidemenu-inner">
              <div className="group">
                <img
                  className="rectangle9copy3"
                  src={ `${assetsPath.menu}/sidemenu-rectangle-9-copy-3.png` } />
                <img
                  className="rectangle9copy2"
                  src={ `${assetsPath.menu}/sidemenu-rectangle-9-copy-2.png` } />
                <img
                  className="rectangle9copy"
                  src={ `${assetsPath.menu}/sidemenu-rectangle-9-copy.png` } />
              </div>
              { this.state.auth &&
                <div className="items">
                  <div
                    className="item"
                    disabled={ this.state.activeSection === 'overview' }>
                    <div
                      className="title"
                      onClick={ this.toggleOverview }>
                      { translate('APP_TITLE.OVERVIEW') }
                    </div>
                    <img
                      className="line"
                      src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                  </div>
                  <div
                    className="item"
                    disabled={ this.state.activeSection === 'dashboard' }>
                    <div
                      className="title"
                      onClick={ () => this.changeActiveSection('dashboard', true) }>
                      { translate('DASHBOARD.DASHBOARD') }
                    </div>
                    <img
                      className="line"
                      src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                  </div>
                  { getLocalStorageVar('seed') &&
                    <div
                      className="item"
                      disabled={ this.state.activeSection === 'recovery' }>
                      <div
                        className="title"
                        onClick={ () => this.toggleMenuOption('recovery') }>
                        { translate('APP_TITLE.RECOVERY') }
                      </div>
                      <img
                        className="line"
                        src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                    </div>
                  }
                  <div
                    className="item"
                    disabled={ this.state.activeSection === 'settings' }>
                    <div
                      className="title"
                      onClick={ () => this.toggleMenuOption('settings') }>
                      { translate('APP_TITLE.SETTINGS') }
                    </div>
                    <img
                      className="line"
                      src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                  </div>
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.logout }>
                      { translate('DASHBOARD.LOGOUT') }
                    </div>
                    <img
                      className="line"
                      src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                  </div>
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.lock }>
                      { translate('DASHBOARD.LOCK') }
                    </div>
                    <img
                      className="line"
                      src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                  </div>
                  { Object.keys(this.state.coins).length !== Object.keys(electrumServers).length &&
                    <div
                      className="item"
                      disabled={ this.state.activeSection === 'addcoin' }>
                      <div
                        className="title"
                        onClick={ () => this.toggleMenuOption('addcoin') }>
                        { translate('DASHBOARD.ADD_COIN') }
                      </div>
                      <img
                        className="line"
                        src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                    </div>
                  }
                  <div>
                  { this.renderActiveCoins() }
                  </div>
                </div>
              }
              { !this.state.auth &&
                <div className="items">
                  { (this.state.activeSection === 'addcoin' || this.state.activeSection === 'create-seed') &&
                    <div className="item">
                      <div
                        className="title"
                        onClick={ () => this.toggleMenuOption('login') }>
                        { translate('DASHBOARD.LOGIN') }
                      </div>
                      <img
                        className="line"
                        src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                    </div>
                  }
                  <div
                    className="item"
                    disabled={ this.state.activeSection === 'addcoin' }>
                    <div
                      className="title"
                      onClick={ () => this.toggleMenuOption('addcoin') }>
                      { translate('DASHBOARD.ADD_COIN') }
                    </div>
                    <img
                      className="line"
                      src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                  </div>
                  <div
                    className="item"
                    disabled={ this.state.activeSection === 'create-seed' }>
                    <div
                      className="title"
                      onClick={ () => this.toggleMenuOption('create-seed') }>
                      { translate('DASHBOARD.CREATE_SEED') }
                    </div>
                    <img
                      className="line"
                      src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                  </div>
                  { getLocalStorageVar('seed') &&
                    <div
                      className="item"
                      disabled={ this.state.activeSection === 'pin' }>
                      <div
                        className="title"
                        onClick={ () => this.toggleMenuOption('pin') }>
                        { translate('APP_TITLE.PIN') }
                      </div>
                      <img
                        className="line"
                        src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                    </div>
                  }
                  { /*this.state.activeSection !== 'offlinesig' &&
                    <div className="item">
                      <div
                        className="title"
                        onClick={ () => this.toggleMenuOption('offline-sig') }>Offline Signing</div>
                      <img
                        className="line"
                        src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                    </div>*/
                  }
                  { (this.state.activeSection === 'offlinesig' || this.state.activeSection === 'pin') &&
                    <div className="item">
                      <div
                        className="title"
                        onClick={ () => this.toggleMenuOption('login') }>
                        { translate('APP_TITLE.LOGIN') }
                      </div>
                      <img
                        className="line"
                        src={ `${assetsPath.menu}/sidemenu-rectangle-3.png` } />
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  render() {
    return (
      <div
        className="app-container"
        onClick={ this.globalClick }>
        <div className="app-header">
          { this.state.history &&
            !this.state.displayMenu &&
            ((this.state.auth && this.state.history !== 'login' && this.state.history !== 'create-seed') || !this.state.auth) &&
            this.state.history !== this.state.activeSection &&
            (!this.state.proxyError || (this.state.proxyError && this.state.proxyErrorCount !== -777)) &&
            <img
              onClick={ this.historyBack }
              className="menu-back"
              src={ `${assetsPath.menu}/trends-combined-shape.png` } />
          }
          { (!this.state.proxyError || (this.state.proxyError && this.state.proxyErrorCount !== -777)) &&
            <img
              onClick={ this.toggleMenu }
              className="menu-icon"
              src={ `${assetsPath.home}/home-combined-shape.png` } />
          }
          <div className="ui-title">
            { translate('APP_TITLE.' + (this.state.displayMenu ? 'MENU' : this.state.activeSection.toUpperCase())) }
          </div>
        </div>
        { this.state.displayMenu &&
          (!this.state.proxyError || (this.state.proxyError && this.state.proxyErrorCount !== -777)) &&
          <div className="app-main">
            { this.renderMenu() }
          </div>
        }
        { this.state.proxyError &&
          this.state.proxyErrorCount === -777 &&
          <div className="app-main">
            <div className="con-error width-limit">
              <i className="fa fa-warning error"></i> <span className="error">{ translate('DASHBOARD.PROXY_ERROR') }</span>
            </div>
            <div className="form proxy">
              <div
                onClick={ this.retryProxy }
                disabled={
                  this.state.proxyRetryInProgress &&
                  this.state.proxyErrorCount !== -777
                }
                className={ 'group3' + (this.state.proxyRetryInProgress ? ' retrying' : '') }>
                <div className="btn-inner">
                  <div className="btn">{ translate('DASHBOARD.RETRY') }</div>
                  <div className="group2">
                    <i className="fa fa-refresh"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
        { (!this.state.proxyError || (this.state.proxyError && this.state.proxyErrorCount !== -777)) &&
          !this.state.displayMenu &&
          this.state.conError &&
          <ServerSelect
            { ...this.state }
            dashboardRefresh={ this.dashboardRefresh }
            getServersList={ this.props.actions.getServersList }
            setDefaultServer={ this.props.actions.setDefaultServer }
            updateDefaultCoinServer={ this.updateDefaultCoinServer } />
        }
        { (!this.state.proxyError || (this.state.proxyError && this.state.proxyErrorCount !== -777)) &&
          !this.state.displayMenu &&
          !this.state.conError &&
          <div className="app-main">
            { (this.state.activeSection !== 'pin' || this.state.activeSection !== 'offlinesig') &&
              <Login
                { ...this.state }
                login={ this.login } />
            }
            { this.state.activeSection === 'create-seed' &&
              <CreateSeed
                { ...this.state }
                login={ this.login }
                changeActiveSection={ this.changeActiveSection } />
            }
            <SendCoin
              { ...this.state }
              sendtx={ this.props.actions.sendtx }
              changeActiveSection={ this.changeActiveSection }
              getBtcFees={ this.getBtcFees } />
            <AddCoin
              { ...this.state }
              addCoin={ this.addCoin }
              changeActiveSection={ this.changeActiveSection } />
            <KMDInterest
              { ...this.state }
              sendtx={ this.props.actions.sendtx }
              changeActiveSection={ this.changeActiveSection } />
            { this.state.auth &&
              this.state.activeSection === 'dashboard' &&
              (!this.state.proxyError || (this.state.proxyError && this.state.proxyErrorCount !== -777)) &&
              <Transactions
                { ...this.state }
                dashboardRefresh={ this.dashboardRefresh }
                changeActiveSection={ this.changeActiveSection }
                toggleKMDInterest={ this.toggleKMDInterest } />
            }
            { !this.state.auth &&
              this.state.activeSection === 'offlinesig' &&
              <OfflineSigning />
            }
            { !this.state.auth &&
              this.state.activeSection === 'pin' &&
              <Pin changeActiveSection={ this.changeActiveSection } />
            }
            { this.state.auth &&
              this.state.activeSection === 'recovery' &&
              <Recovery { ...this.state } />
            }
            { this.state.auth &&
              this.state.activeSection === 'overview' &&
              <Overview { ...this.state } />
            }
            { this.state.activeSection === 'settings' &&
              <Settings globalClick={ this.globalClick } />
            }
          </div>
        }
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