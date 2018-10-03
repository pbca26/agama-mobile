import React from 'react';
import QRCode from 'qrcode.react';

import {
  setLocalStorageVar,
  getLocalStorageVar,
} from '../actions/utils';
import {
  encryptkey,
  decryptkey,
} from '../actions/seedCrypt';
import translate from '../translate/translate';
import passphraseGenerator from 'agama-wallet-lib/build/crypto/passphrasegenerator';
import {
  devlog,
  config,
} from '../actions/dev';
import { assetsPath } from '../actions/utils';

class CreateSeed extends React.Component {
  constructor() {
    super();
    this.state = {
      createPin: true,
      pinOverride: config.preload ? config.preload.pin : null,
      pinOverrideTooShort: false,
      pin: config.preload ? config.preload.pin : '',
      pinConfirm: false,
      confirmSeedSaved: false,
      seed: passphraseGenerator.generatePassPhrase(256),
      pristine: true,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.login = this.login.bind(this);
    this.toggleCreatePin = this.toggleCreatePin.bind(this);
    this.toggleConfirmSeed = this.toggleConfirmSeed.bind(this);
  }

  componentWillMount() {
    this.setState({
      seed: passphraseGenerator.generatePassPhrase(256),
    });
  }

  componentWillReceiveProps(props) {
    // console.warn(props);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      pinOverrideTooShort: false,
    });
  }

  login() {
    if (!this.state.confirmSeedSaved &&
        this.state.pristine) {
      this.setState({
        pristine: false,
      });
    } else {
      if (this.state.createPin) {
        if (this.state.pinOverride &&
            this.state.pinOverride.length >= 6) {
          const _encryptedKey = encryptkey(this.state.pinOverride, this.state.seed);

          setLocalStorageVar('seed', { encryptedKey: _encryptedKey });

          this.props.login(this.state.seed);
          this.setState(this.defaultState);
        } else {
          this.setState({
            pinOverrideTooShort: true,
            wrongPin: false,
          });
        }
      } else {
        this.props.login(this.state.seed);
        this.setState(this.defaultState);
      }
    }
  }

  toggleCreatePin() {
    this.setState({
      createPin: !this.state.createPin,
    });
  }

  toggleConfirmSeed() {
    this.setState({
      confirmSeedSaved: !this.state.confirmSeedSaved,
    });
  }

  render() {
    if (this.props.activeSection === 'create-seed') {
      return (
        <div className="form create-seed">
          <div className="title margin-bottom-25">{ translate('LOGIN.THIS_IS_YOUR_NEW_SEED') }</div>
          <div className="seed-gen-box">{ this.state.seed }</div>
          <div className="text-center margin-top-30">
            <QRCode
              value={ this.state.seed }
              size={ 320 } />
          </div>
          <div className="margin-top-25 margin-bottom-25 text-center warning">
            <strong>{ translate('LOGIN.PLEASE_MAKE_SURE_TO') }</strong>
          </div>
          <div className="margin-top-35 margin-bottom-35 sz350">
            <label className="switch">
              <input
                type="checkbox"
                value="on"
                checked={ this.state.confirmSeedSaved } />
              <div
                className="slider"
                onClick={ this.toggleConfirmSeed }></div>
            </label>
            <div
              className="toggle-label pointer"
              onClick={ this.toggleConfirmSeed }>
              { translate('LOGIN.I_CONFIRM_I_SAVED_SEED') }
            </div>
            { !this.state.confirmSeedSaved &&
              !this.state.pristine &&
              <div className="error margin-top-15">
                <i className="fa fa-warning"></i> { translate('LOGIN.CONFIRMATION_REQUIRED') }
              </div>
            }
          </div>
          <div className="margin-bottom-25 margin-top-30">
            <label className="switch hide">
              <input
                type="checkbox"
                value="on"
                checked={ this.state.createPin } />
              <div
                className="slider"
                onClick={ this.toggleCreatePin }></div>
            </label>
            <div
              className="toggle-label pointer hide"
              onClick={ this.toggleCreatePin }>
              { translate('LOGIN.OVERRIDE_PIN') }
            </div>
            { this.state.createPin &&
              <div className="edit">
                <input
                  type="password"
                  className="form-control"
                  name="pinOverride"
                  onChange={ this.updateInput }
                  placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                  value={ this.state.pinOverride || '' } />
              </div>
            }
            { this.state.createPin &&
              this.state.pinOverrideTooShort &&
              <div className="error margin-top-15 sz350">
                <i className="fa fa-warning"></i> { translate('LOGIN.PIN_TOO_SHORT') }
              </div>
            }
          </div>
          <div
            onClick={ this.login }
            className="group3">
            <div className="btn-inner">
              <div className="btn">{ translate('LOGIN.SIGN_IN') }</div>
              <div className="group2">
                <img
                  className="path6"
                  src={ `${assetsPath.login}/reset-password-path-6.png` } />
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

export default CreateSeed;