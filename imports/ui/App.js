import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import actions from './actions/actions';
import { secondsToString, maskPubAddress, sortBy } from './actions/utils';

import SendCoin from './components/SendCoin';
import MyAddress from './components/MyAddress';
import AddCoin from './components/AddCoin';
import Login from './components/Login';
import Transactions from './components/Transactions';
import Balance from './components/Balance';

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
  }

  addCoin(coin) {
    let coins = this.state.coins;
    coins[coin] = {
      // defaults
    };

    this.setState({
      coins,
    });
  }

  changeActiveSection(section) {
    this.setState({
      activeSection: section,
    });
  }

  switchCoin(coin) {
    this.setState({
      coin: coin,
      address: this.state.pubKeys[coin],
      displayMenu: false,
    });

    // toggle refresh and update in-mem coins cache obj
    setTimeout(() => {
      this.dashboardRefresh();
    }, 100);
  }

  componentDidMount() {
    if (this.state.auth) {
      this.dashboardRefresh();
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

    actions.balance(this.state.address, this.state.coin === 'kmd' ? 'komodo' : this.state.coin)
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

    actions.transactions(this.state.address, this.state.coin === 'kmd' ? 'komodo' : this.state.coin)
    .then((res) => {
      res = sortBy(res, 'confirmations');

      this.setState({
        transactions: res,
        loading: false,
      });
      console.warn(res);
    });
  }

  logout() {
    const { actions } = this.props;

    actions.clearKeys()
    .then((res) => {
      this.setState(this.defaultState);
    });
  }

  lock() {
    const lockState = Object.assign({}, this.defaultState);
    lockState.coins = this.state.coins;

    this.setState(lockState);
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
      });

      this.dashboardRefresh();

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
    this.setState({
      activeSection: this.state.activeSection === 'send' ? 'dashboard' : 'send',
      displayMenu: !this.state.displayMenu,
    });
  }

  toggleAddCoin() {
    this.setState({
      activeSection: this.state.activeSection === 'addcoin' ? 'dashboard' : 'addcoin',
      displayMenu: !this.state.displayMenu,
    });
  }

  renderActiveCoins() {
    let _items = [];

    for (let key in this.state.coins) {
      _items.push(
        <div
          onClick={ () => this.switchCoin(key) }
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
              <div onClick={ this.toggleSend }>Dashboard</div>
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

  render() {
    return (
      <div className="app-container">
        <div className="app-header">
          <img src="/images/agama-logo-side.svg" />
          <img
            className="margin-left-20"
            src={ `/images/cryptologo/${this.state.coin}.png` } />
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
            { ...this.state } />
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
            <div className="loader">
              <svg className="circle">
                <circle className="path" cx="50" cy="50" r="20" fill="none" strokeWidth="5" strokeMiterlimit="10"/>
                <circle className="path2" cx="50" cy="50" r="20" fill="none" strokeWidth="5" strokeMiterlimit="10"/>
                <circle className="path3" cx="50" cy="50" r="20" fill="none" strokeWidth="5" strokeMiterlimit="10"/>
                <circle className="path4" cx="50" cy="50" r="20" fill="none" strokeWidth="5" strokeMiterlimit="10"/>
              </svg>
            </div>
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