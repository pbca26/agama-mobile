import React from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode.react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Meteor } from 'meteor/meteor';
import actions from '../../actions/actions';
import electrumServers from 'agama-wallet-lib/build/electrum-servers';
import {
  getRandomIntInclusive,
  sort,
} from 'agama-wallet-lib/build/utils';

import {
  setLocalStorageVar,
  getLocalStorageVar,
  convertURIToImageData,
  assetsPath,
} from '../../actions/utils';
import {
  encryptkey,
  decryptkey,
} from '../../actions/seedCrypt';
import translate from '../../translate/translate';
import {
  devlog,
  config,
} from '../../actions/dev';
import { isPrivKey } from 'agama-wallet-lib/build/keys';
import UserAgreement from '../Settings/UserAgreement';
import NotaryVoteLogin from './Login';
import nnConfig from './config';
import Transactions from '../Transactions/Transactions';
import SendCoin from '../SendCoin';

const PROXY_RETRY_COUNT = 2;
const PROXY_RETRY_TIMEOUT = 5000;

class NotaryVote extends React.Component {
  constructor() {
    super();
    this.state = {
      auth: false,
      coin: `${nnConfig.coin}|spv|nn`,
      address: null,
      history: null,
      balance: null,
      activeSection: 'dashboard',
      loading: false,
      conError: false,
      proxyError: false,
      proxyErrorCount: 0,
      proxyRetryInProgress: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.login = this.login.bind(this);
    this.dashboardRefresh = this.dashboardRefresh.bind(this);
    this.getBalance = this.getBalance.bind(this);
    this.getTransactions = this.getTransactions.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
    this.lock = this.lock.bind(this);
  }

  lock() {
    this.setState(this.defaultState);
    setLocalStorageVar('nn', null);
  }

  changeActiveSection(activeSection) {
    this.setState({
      activeSection,
    });
  }

  addCoin(coin) {
    let coins = getLocalStorageVar('nnCoin') || {};

    const _coin = coin.split('|')[0];
    let server = electrumServers[_coin];

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

      coins[coin] = {
        server,
      };
    } else {
      coins[coin] = {};
    }

    setLocalStorageVar('nnCoin', coins);
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
    
    this.props.actions.getAnotherProxy();
    this.dashboardRefresh();
  }

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
    this.setState({
      loading: true,
    });

    this.props.actions.transactions(this.state.coin)
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

  dashboardRefresh() {
    this.getBalance();
    this.getTransactions();
  }

  scrollToTop() {
    window.scrollTo(0, 0);
  }

  login(passphrase) {
    this.props.actions.auth(passphrase, getLocalStorageVar('nnCoin'))
    .then((res) => {
      // select a coin and an address
      const address = res.nn && res.nn[nnConfig.coin];

      this.setState({
        auth: true,
        address,
        history: null,
        activeSection: 'dashboard',
      });

      this.dashboardRefresh();
      this.scrollToTop();
    });
  }

  componentWillMount() {
    this.props.actions.isNNAuth()
    .then((res) => {
      let _cache = getLocalStorageVar('cache');
      let _balance;
      let _transactions;
      
      if (_cache &&
          _cache.balance &&
          _cache.balance[this.state.coin]) {
        _balance = _cache.balance[this.state.coin];
      }
  
      if (_cache &&
          _cache.transactions &&
          _cache.transactions[this.state.coin]) {
         _transactions = _cache.transactions[this.state.coin];
      }

      this.setState({
        auth: res,
        transactions: _transactions,
        balance: _balance,
      });
    });

    if (!getLocalStorageVar('nnCoin') || (getLocalStorageVar('nnCoin') && !getLocalStorageVar('nnCoin')[`${nnConfig.coin}|spv|nn`])) {
      this.addCoin(`${nnConfig.coin}|spv|nn`);
    }
  }

  render() {
    if (this.state.auth) {
      return (
        <section className="vote-main">
          { !this.state.conError &&
            this.state.activeSection === 'send' &&
            <img
              className="menu-back"
              src={ `${assetsPath.menu}/trends-combined-shape.png` }
              onClick={ () => this.changeActiveSection('dashboard') } />
          }
          { !this.state.conError &&
            this.state.activeSection === 'dashboard' &&
            <Transactions
              { ...this.state }
              changeActiveSection={ this.changeActiveSection }
              vote={ true } />
          }
          { !this.state.conError &&
            this.state.activeSection === 'send' &&
            <SendCoin
              vote={ true }
              coin={ this.state.coin }
              address={ this.state.address }
              balance={ this.state.balance || 'loading' }
              sendtx={ this.props.actions.sendtx }
              lock={ this.lock } />
          }
        </section>
      );
    } else {
      return (
        <NotaryVoteLogin
          historyBack={ this.props.historyBack }
          lock={ this.lock }
          login={ this.login } />
      );
    }
  }
}

mapStateToProps = (state) => {
  return {
    auth: state.auth,
  }
}

mapDispatchToProps = (dispatch) => {
  return {
    actions: bindActionCreators(actions, dispatch),
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotaryVote);