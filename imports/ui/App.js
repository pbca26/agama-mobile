import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import electrumServers from './actions/electrumServers';

import actions from './actions/actions';
import {
  setLocalStorageVar,
  getLocalStorageVar,
  convertURIToImageData,
} from './actions/utils';
import translate from './translate/translate';
import {
  devlog,
  config,
} from './actions/dev';
import {
  getRandomIntInclusive,
  sort,
} from 'agama-wallet-lib/src/utils';

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
const DEFAULT_LOCK_INACTIVE_INTERVAL = getLocalStorageVar('settings') && getLocalStorageVar('settings').autoLockTimeout ? getLocalStorageVar('settings').autoLockTimeout : 600000; // 10m

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
      overview: null,
      history: null,
      btcFees: null,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.lock = this.lock.bind(this);
    // this.getKeys = this.getKeys.bind(this);
    this.getBalance = this.getBalance.bind(this);
    this.getTransactions = this.getTransactions.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
    this.toggleCreateSeed = this.toggleCreateSeed.bind(this);
    this.toggleAddCoin = this.toggleAddCoin.bind(this);
    this.dashboardRefresh = this.dashboardRefresh.bind(this);
    this.switchCoin = this.switchCoin.bind(this);
    this.addCoin = this.addCoin.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
    this.toggleAutoRefresh = this.toggleAutoRefresh.bind(this);
    this.toggleLogin = this.toggleLogin.bind(this);
    this.toggleKMDInterest = this.toggleKMDInterest.bind(this);
    this.toggleOffileSig = this.toggleOffileSig.bind(this);
    this.togglePin = this.togglePin.bind(this);
    this.toggleSettings = this.toggleSettings.bind(this);
    this.toggleRecovery = this.toggleRecovery.bind(this);
    this.toggleOverview = this.toggleOverview.bind(this);
    this.toggle = this.toggleOverview.bind(this);
    this.globalClick = this.globalClick.bind(this);
    this.globalClickTimeout = null;
    this.overviewInterval = null;
    this.historyBack = this.historyBack.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);
    this.getBtcFees = this.getBtcFees.bind(this);
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
        setTimeout(() => {
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

  globalClick() {
    if (this.state.auth) {
      if (this.globalClickTimeout) {
        clearTimeout(this.globalClickTimeout);
      }

      if (config.dev &&
          config.preload &&
          !config.preload.disableAutoLock) {
        this.globalClickTimeout = setTimeout(() => {
          devlog(`logout after ${DEFAULT_LOCK_INACTIVE_INTERVAL}ms inactivity`);
          this.lock();
        }, DEFAULT_LOCK_INACTIVE_INTERVAL);
      }

      // devlog('global click', 'set timer');
    }
  }

  addCoin(coin) {
    const server = electrumServers[coin];
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

    // document.getElementById('body').style.overflowY = 'inherit';
    this.scrollToTop();
  }

  switchCoin(coin) {
    this.setState({
      coin: coin,
      address: this.state.pubKeys[coin],
      history: this.state.activeSection,
      activeSection: this.state.activeSection !== 'send' ? 'dashboard' : 'send',
      transactions: this.state.coins[coin] ? this.state.coins[coin].transactions: null,
      balance: this.state.coins[coin] ? this.state.coins[coin].balance: null,
    });

    // toggle refresh and update in-mem coins cache obj
    setTimeout(() => {
      this.toggleMenu();
      this.dashboardRefresh();
      this.scrollToTop();
    }, 10);
  }

  toggleAutoRefresh(disable) {
    if (disable) {
      clearInterval(this.state.updateInterval);
      clearInterval(this.state.overviewInterval);

      this.setState({
        updateInterval: null,
      });
    } else {
      const _updateInterval = setInterval(() => {
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
        this.setState({
          proxyError: true,
        });
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
          res.indexOf('error') > -1) {
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

      setTimeout(() => {
        this.toggleMenu();
      }, 10);
      setTimeout(() => {
        this.setState(this.defaultState);
      }, 20);
      this.scrollToTop();
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
        this.toggleMenu();
      }, 10);
      setTimeout(() => {
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
        history: this.state.activeSection,
        activeSection: 'dashboard',
      });

      this.dashboardRefresh();
      this.toggleAutoRefresh();
      this.globalClick();
      this.scrollToTop();
    });
  }

  toggleMenu() {
    // document.getElementById('body').style.overflow = !this.state.displayMenu ? 'hidden' : 'inherit';

    this.setState({
      displayMenu: !this.state.displayMenu,
    });
  }

  toggleSettings() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === 'settings' ? 'dashboard' : 'settings',
    });
    this.scrollToTop();
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
      const _updateInterval = setInterval(() => {
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

    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === 'overview' ? 'dashboard' : 'overview',
    });
    this.scrollToTop();
  }

  toggleRecovery() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === 'recovery' ? 'dashboard' : 'recovery',
    });
    this.scrollToTop();
  }

  togglePin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === 'pin' ? 'dashboard' : 'pin',
    });
    this.scrollToTop();
  }

  toggleOffileSig() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === 'offlinesig' ? 'dashboard' : 'offlinesig',
    });
    this.scrollToTop();
  }

  toggleAddCoin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === 'addcoin' ? 'dashboard' : 'addcoin',
    });
    this.scrollToTop();
  }

  toggleCreateSeed() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === 'create-seed' ? 'dashboard' : 'create-seed',
    });
    this.scrollToTop();
  }

  toggleLogin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      history: this.state.activeSection,
      activeSection: this.state.activeSection === 'login' ? 'dashboard' : 'login',
    });
    this.scrollToTop();
  }

  renderActiveCoins() {
    let _items = [];

    if (this.state.coins &&
        this.state.coins.kmd) {
      _items.push(
        <div
          onClick={ () => this.state.coin !== 'kmd' ? this.switchCoin('kmd') : null }
          key={ `active-coins-kmd` }
          className="active-coins">
          <img src="/images/cryptologo/kmd.png" /> <span>KMD</span>
          { this.state.coin === 'kmd' &&
            <i className="fa fa-check"></i>
          }
        </div>
      );
    }

    for (let key in this.state.coins) {
      if (key !== 'kmd') {
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
                  src="/images/template/menu/sidemenu-rectangle-9-copy-3.png" />
                <img
                  className="rectangle9copy2"
                  src="/images/template/menu/sidemenu-rectangle-9-copy-2.png" />
                <img
                  className="rectangle9copy"
                  src="/images/template/menu/sidemenu-rectangle-9-copy.png" />
              </div>
              { this.state.auth &&
                <div className="items">
                  { this.state.activeSection !== 'overview' &&
                    <div className="item">
                      <div
                        className="title"
                        onClick={ this.toggleOverview }>{ translate('APP_TITLE.OVERVIEW') }</div>
                      <img
                        className="line"
                        src="/images/template/menu/sidemenu-rectangle-3.png" />
                    </div>
                  }
                  { this.state.activeSection !== 'dashboard' &&
                    <div className="item">
                      <div
                        className="title"
                        onClick={ () => this.changeActiveSection('dashboard', true) }>{ translate('DASHBOARD.DASHBOARD') }</div>
                      <img
                        className="line"
                        src="/images/template/menu/sidemenu-rectangle-3.png" />
                    </div>
                  }
                  { this.state.activeSection !== 'recovery' &&
                    getLocalStorageVar('seed') &&
                    <div className="item">
                      <div
                        className="title"
                        onClick={ this.toggleRecovery }>{ translate('APP_TITLE.RECOVERY') }</div>
                      <img
                        className="line"
                        src="/images/template/menu/sidemenu-rectangle-3.png" />
                    </div>
                  }
                  { this.state.activeSection !== 'settings' &&
                    <div className="item">
                      <div
                        className="title"
                        onClick={ this.toggleSettings }>{ translate('APP_TITLE.SETTINGS') }</div>
                      <img
                        className="line"
                        src="/images/template/menu/sidemenu-rectangle-3.png" />
                    </div>
                  }
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.logout }>{ translate('DASHBOARD.LOGOUT') }</div>
                    <img
                      className="line"
                      src="/images/template/menu/sidemenu-rectangle-3.png" />
                  </div>
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.lock }>{ translate('DASHBOARD.LOCK') }</div>
                    <img
                      className="line"
                      src="/images/template/menu/sidemenu-rectangle-3.png" />
                  </div>
                  { this.state.activeSection !== 'addcoin' &&
                    Object.keys(this.state.coins).length !== Object.keys(electrumServers).length &&
                    <div className="item">
                      <div
                        className="title"
                        onClick={ this.toggleAddCoin }>{ translate('DASHBOARD.ADD_COIN') }</div>
                      <img
                        className="line"
                        src="/images/template/menu/sidemenu-rectangle-3.png" />
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
                      onClick={ this.toggleLogin }>{ translate('DASHBOARD.LOGIN') }</div>
                    <img
                      className="line"
                      src="/images/template/menu/sidemenu-rectangle-3.png" />
                  </div>
                }
                { this.state.activeSection !== 'addcoin' &&
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.toggleAddCoin }>{ translate('DASHBOARD.ADD_COIN') }</div>
                    <img
                      className="line"
                      src="/images/template/menu/sidemenu-rectangle-3.png" />
                  </div>
                }
                { this.state.activeSection !== 'create-seed' &&
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.toggleCreateSeed }>{ translate('DASHBOARD.CREATE_SEED') }</div>
                    <img
                      className="line"
                      src="/images/template/menu/sidemenu-rectangle-3.png" />
                  </div>
                }
                { this.state.activeSection !== 'pin' &&
                  getLocalStorageVar('seed') &&
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.togglePin }>{ translate('APP_TITLE.PIN') }</div>
                    <img
                      className="line"
                      src="/images/template/menu/sidemenu-rectangle-3.png" />
                  </div>
                }
                { /*this.state.activeSection !== 'offlinesig' &&
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.toggleOffileSig }>Offline Signing</div>
                    <img className="line" src="/images/template/menu/sidemenu-rectangle-3.png" />
                  </div>*/
                }
                { (this.state.activeSection === 'offlinesig' || this.state.activeSection === 'pin') &&
                  <div className="item">
                    <div
                      className="title"
                      onClick={ this.toggleLogin }>{ translate('APP_TITLE.LOGIN') }</div>
                    <img
                      className="line"
                      src="/images/template/menu/sidemenu-rectangle-3.png" />
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
            <img
              onClick={ this.historyBack }
              className="menu-back"
              src="/images/template/menu/trends-combined-shape.png" />
          }
          <img
            onClick={ this.toggleMenu }
            className="menu-icon"
            src="/images/template/home/home-combined-shape.png" />
          <div className="ui-title">{ this.state.displayMenu ? translate('APP_TITLE.MENU') : translate('APP_TITLE.' + this.state.activeSection.toUpperCase()) }</div>
        </div>
        { this.state.displayMenu &&
          <div className="app-main">
            { this.renderMenu() }
          </div>
        }
        { !this.state.displayMenu &&
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
            { this.state.conError &&
              <ServerSelect
                { ...this.state }
                dashboardRefresh={ this.dashboardRefresh }
                getServersList={ this.props.actions.getServersList }
                setDefaultServer={ this.props.actions.setDefaultServer } />
            }
            { this.state.proxyError &&
              <div className="con-error">
                <i className="fa fa-warning error"></i> <span className="error">{ translate('DASHBOARD.PROXY_ERROR') }</span>
              </div>
            }
            <KMDInterest
              { ...this.state }
              sendtx={ this.props.actions.sendtx }
              changeActiveSection={ this.changeActiveSection } />
            { this.state.auth &&
              this.state.activeSection === 'dashboard' &&
              !this.state.proxyError &&
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
              <Settings />
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