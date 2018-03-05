import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { electrumServers } from './actions/electrumServers';
import whitelabel from '../../whitelabel';

import actions from './actions/actions';
import {
  setLocalStorageVar,
  getLocalStorageVar,
  sortBy,
  getRandomIntInclusive,
  convertURIToImageData,
} from './actions/utils';
import { translate } from './translate/translate';

import SendCoin from './components/SendCoin';
import MyAddress from './components/MyAddress';
import AddCoin from './components/AddCoin';
import Login from './components/Login';
import Transactions from './components/Transactions';
import Balance from './components/Balance';
import Spinner from './components/Spinner';
import ServerSelect from './components/ServerSelect';
import CreateSeed from './components/CreateSeed';
import SendReceive from './components/SendReceive';
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
      activeSection: null,
      saveSeed: null,
      auth: false,
      updateInterval: null,
      conError: false,
      proxyError: false,
      overview: null,
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
  }

  componentWillMount() {
    const _localStorageCoins = getLocalStorageVar('coins');

    if (!_localStorageCoins ||
      (_localStorageCoins && !_localStorageCoins[whitelabel.name])) {
      this.addCoin(whitelabel.name);
    } else {
      this.setState({
        coins: _localStorageCoins,
      });
    }
  }

  scrollToTop() {
    window.scrollTo(0, 0);
  }

  globalClick() {
    if (this.state.auth) {
      if (this.globalClickTimeout) {
        clearTimeout(this.globalClickTimeout);
      }

      this.globalClickTimeout = setTimeout(() => {
        // console.warn(`logout after ${DEFAULT_LOCK_INACTIVE_INTERVAL} inactivity`);
        this.lock();
      }, DEFAULT_LOCK_INACTIVE_INTERVAL);

      // console.warn('global click', 'set timer');
    }
  }

  addCoin(coin) {
    const server = electrumServers[coin === 'kmd' ? 'komodo' : coin];
    let coins = this.state.coins;

    // pick a random server to communicate with
    if (server.serverList &&
        server.serverList.length > 0) {
      const randomServerId = getRandomIntInclusive(0, server.serverList.length - 1);
      const randomServer = server.serverList[randomServerId];
      const serverDetails = randomServer.split(':');

      if (serverDetails.length === 2) {
        server.ip = serverDetails[0];
        server.port = serverDetails[1];
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
        activeSection: section,
      });
    } else {
      this.setState({
        activeSection: section,
      });
    }

    document.getElementById('body').style.overflow = 'inherit';
    this.scrollToTop();
  }

  switchCoin(coin) {
    this.setState({
      coin: coin,
      address: this.state.pubKeys[coin],
      activeSection: this.state.activeSection !== 'send' ? 'dashboard' : 'send',
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
        res = sortBy(res, 'timestamp');

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

      this.setState({
        auth: true,
        pubKeys: res,
        coin,
        address,
        activeSection: 'dashboard',
      });

      this.dashboardRefresh();
      this.toggleAutoRefresh();
      this.globalClick();
      this.scrollToTop();
    });
  }

  toggleMenu() {
    document.getElementById('body').style.overflow = !this.state.displayMenu ? 'hidden' : 'inherit';

    this.setState({
      displayMenu: !this.state.displayMenu,
    });
  }

  toggleSettings() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
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
      activeSection: this.state.activeSection === 'overview' ? 'dashboard' : 'overview',
    });
    this.scrollToTop();
  }

  toggleRecovery() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'recovery' ? 'dashboard' : 'recovery',
    });
    this.scrollToTop();
  }

  togglePin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'pin' ? 'dashboard' : 'pin',
    });
    this.scrollToTop();
  }

  toggleOffileSig() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'offlinesig' ? 'dashboard' : 'offlinesig',
    });
    this.scrollToTop();
  }

  toggleSend() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'send' ? 'dashboard' : 'send',
    });
    this.scrollToTop();
  }

  toggleAddCoin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'addcoin' ? 'dashboard' : 'addcoin',
    });
    this.scrollToTop();
  }

  toggleCreateSeed() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'create-seed' ? 'dashboard' : 'create-seed',
    });
    this.scrollToTop();
  }

  toggleLogin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
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
          <img
            src={ `/images/cryptologo/kmd.png` } /> <span>KMD</span>
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
        <div className="nav-menu">
          <div
            onClick={ this.toggleMenu }
            className="nav-menu-overlay"></div>
          <div
            id="nav-menu-inner"
            className="nav-menu-inner">
            <i
              onClick={ this.toggleMenu }
              className="fa fa-bars"></i>
            { this.state.auth &&
              <div className="nav-menu-items">
                { this.state.activeSection !== 'overview' &&
                  !whitelabel.disablePrices &&
                  <div onClick={ this.toggleOverview }>Overview</div>
                }
                { this.state.activeSection !== 'dashboard' &&
                  <div onClick={ () => this.changeActiveSection('dashboard', true) }>{ translate('DASHBOARD.DASHBOARD') }</div>
                }
                { this.state.activeSection !== 'recovery' &&
                  <div onClick={ this.toggleRecovery }>Recovery</div>
                }
                { this.state.activeSection !== 'settings' &&
                  <div onClick={ this.toggleSettings }>Settings</div>
                }
                <div onClick={ this.lock }>{ translate('DASHBOARD.LOGOUT') }</div>
              </div>
            }
            { !this.state.auth &&
              <div className="nav-menu-items">
                { (this.state.activeSection === 'addcoin' || this.state.activeSection === 'create-seed') &&
                  <div onClick={ this.toggleLogin }>{ translate('DASHBOARD.LOGIN') }</div>
                }
                { this.state.activeSection !== 'create-seed' &&
                  <div onClick={ this.toggleCreateSeed }>{ translate('DASHBOARD.CREATE_SEED') }</div>
                }
                { this.state.activeSection !== 'pin' &&
                  <div onClick={ this.togglePin }>PIN override</div>
                }
                { this.state.activeSection !== 'offlinesig' &&
                  !whitelabel.disableExperimental &&
                  <div onClick={ this.toggleOffileSig }>Offline Signing</div>
                }
                { (this.state.activeSection === 'offlinesig' || this.state.activeSection === 'pin') &&
                  <div onClick={ this.toggleLogin }>Login</div>
                }
              </div>
            }
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
          <img
            className="whitelabel-logo"
            src={ `/images/${whitelabel.logo}.png` } />
          { whitelabel.title &&
            <span className="whitelabel-title">{ whitelabel.title }</span>
          }
          <i
            onClick={ this.toggleMenu }
            className="fa fa-bars"></i>
        </div>
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
          { this.state.auth &&
            this.state.activeSection === 'dashboard' &&
            <MyAddress { ...this.state } />
          }
          { this.renderMenu() }
          <SendCoin
            { ...this.state }
            sendtx={ this.props.actions.sendtx }
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
            <Spinner />
          }
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
          { !this.state.proxyError &&
            !this.state.conError &&
            <Balance { ...this.state } />
          }
          { this.state.auth &&
            this.state.activeSection === 'dashboard' &&
            !this.state.proxyError &&
            !this.state.conError &&
            <SendReceive
              { ...this.state }
              changeActiveSection={ this.changeActiveSection }
              toggleKMDInterest={ this.toggleKMDInterest } />
          }
          <Transactions { ...this.state } />
          { !this.state.auth &&
            this.state.activeSection === 'offlinesig' &&
            !whitelabel.disableExperimental &&
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
            !whitelabel.disablePrices &&
            <Overview { ...this.state } />
          }
          { this.state.activeSection === 'settings' &&
            <Settings />
          }
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