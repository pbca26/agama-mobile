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
import passphraseGenerator from 'agama-wallet-lib/build/crypto/passphrasegenerator';
import { shuffleArray } from '../../actions/utils';
import UserAgreement from '../Settings/UserAgreement';
import NotaryVoteLogin from './Login';
import nnConfig from './config';

class NotaryVote extends React.Component {
  constructor() {
    super();
    this.state = {
      auth: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.login = this.login.bind(this);
  }

  addCoin(coin) {
    let coins = getLocalStorageVar('coins') || {};

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

    setLocalStorageVar('coins', coins);
  }

  login() {
    this.setState({
      auth: true,
    });

    // sync balance/history
  }

  componentWillMount() {
    this.props.actions.isNNAuth()
    .then((res) => {
      console.warn('NotaryVote keys', res);
    });

    if (!getLocalStorageVar('coins') || (getLocalStorageVar('coins') && !getLocalStorageVar('coins')[`${nnConfig.coin}|spv|nn`])) {
      this.addCoin(`${nnConfig.coin}|spv|nn`);
    }
  }

  render() {
    if (this.state.auth) {
      return (
        <section>nn vote here</section>
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