import React from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode.react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Meteor } from 'meteor/meteor';
import actions from '../../actions/actions';

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

class NotaryVote extends React.Component {
  constructor() {
    super();
    this.state = {
      auth: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.login = this.login.bind(this);
  }

  login() {

  }

  componentWillMount() {
    //this.props.actions.isNNAuth()
  }

  render() {
    if (this.state.auth) {
      return (
        <section>nn vote here</section>
      );
    } else {
      return (
        <NotaryVoteLogin
          historyBack={ this.props.historyBack }/>
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