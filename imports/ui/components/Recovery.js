import React from 'react';

import {
  getLocalStorageVar,
  setLocalStorageVar,
} from '../actions/utils';
import { decryptkey } from '../actions/seedCrypt';
import translate from '../translate/translate';
import QRCode from 'qrcode.react';
import {
  devlog,
  config,
} from '../actions/dev';
import { isPrivKey } from 'agama-wallet-lib/build/keys';

class Recovery extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: config.preload ? config.preload.seed : null,
      pin: config.preload ? config.preload.pin : null,
      wrongPin: false,
      wrongPinRetries: 0,
      showPrivKeys: false,
      isPrivKey: false,
      privKeys: [],
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.decodeSeed = this.decodeSeed.bind(this);
    this.toggleShowPrivKeys = this.toggleShowPrivKeys.bind(this);
  }

  componentWillReceiveProps(props) {
    if (props.activeSection !== 'recovery' &&
        this.state.passphrase) {
      this.setState(this.defaultState);
    }
  }

  toggleShowPrivKeys() {
    this.setState({
      showPrivKeys: !this.state.showPrivKeys,
    });
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      wrongPin: false,
    });
  }

  decodeSeed() {
    const _encryptedKey = getLocalStorageVar('seed');
    const _decryptedKey = decryptkey(this.state.pin, _encryptedKey.encryptedKey);
    const pinBruteforceProtection = getLocalStorageVar('settings').pinBruteforceProtection;
    const pinBruteforceProtectionRetries = getLocalStorageVar('seed').pinRetries;

    if (_decryptedKey) {
      if (pinBruteforceProtection) {
        let _seedStorage = getLocalStorageVar('seed');
        _seedStorage.pinRetries = 0;
        setLocalStorageVar('seed', _seedStorage);
      }

      let newState = {
        wrongPin: false,
        wrongPinRetries: 0,
        pin: null,
        passphrase: _decryptedKey,
        isPrivKey: isPrivKey(_decryptedKey),
      };

      if (this.state.showPrivKeys) {
        this.props.getKeys()
        .then((res) => {
          const _keys = res.spv;
          let keys = [];

          for (let key in _keys) {
            keys.push({
              name: key.toUpperCase(),
              value: _keys[key].priv,
            });
          }

          newState.privKeys = keys;
          this.setState(newState);
        });
      } else {
        this.setState(newState);
      }
    } else {
      if (!pinBruteforceProtection) {
        this.setState({
          wrongPin: true,
        });
      } else if (pinBruteforceProtectionRetries < 3) {
        let _seedStorage = getLocalStorageVar('seed');
        _seedStorage.pinRetries += 1;
        setLocalStorageVar('seed', _seedStorage);

        this.setState({
          wrongPin: true,
          wrongPinRetries: _seedStorage.pinRetries,
        });
      } else {
        this.props.lock(true);
      }
    }
  }

  renderPrivKeys() {
    const keys = this.state.privKeys;
    let items = [];

    for (let i = 0; i < keys.length; i++) {
      items.push(
        <div
          key={ `recovery-priv-keys-${i}` }
          className="seed-gen-box">
          <strong>{ keys[i].name }:</strong> { keys[i].value }
        </div>
      );
    }

    return items;
  }

  render() {
    return (
      <div className="form recovery">
        <div className="title margin-top-45 padding-bottom-35 text-center fs14">
        { translate('RECOVERY.PROVIDE_YOUR_PIN') }
        </div>
        <div className="margin-bottom-25">
          <div className="edit">
            <input
              type="password"
              className="form-control"
              name="pin"
              onChange={ this.updateInput }
              placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
              value={ this.state.pin || '' } />
          </div>
          { this.state.wrongPin &&
            <div className="error margin-top-15 sz350">
              <i className="fa fa-warning"></i> { this.state.wrongPinRetries === 0 ? translate('LOGIN.WRONG_PIN') : translate('LOGIN.WRONG_PIN_ATTEMPTS', 3 - this.state.wrongPinRetries) }
            </div>
          }
        </div>
        <div className={ 'switch-block margin-bottom-25 width-limit' + (!this.state.pin ? ' disabled' : '') }>
          <label className="switch">
            <input
              type="checkbox"
              value="on"
              checked={ this.state.showPrivKeys }
              readOnly />
            <div
              className="slider"
              onClick={ this.toggleShowPrivKeys }></div>
          </label>
          <div
            className="toggle-label pointer"
            onClick={ this.toggleShowPrivKeys }>
            { translate('RECOVERY.SHOW_PRIV_KEYS') }
          </div>
        </div>
        <div
          disabled={ !this.state.pin }
          onClick={ this.decodeSeed }
          className="group3 margin-top-40">
          <div className="btn-inner">
            <div className="btn">{ translate('RECOVERY.SHOW') }</div>
            <div className="group2">
              <i className="fa fa-eye"></i>
            </div>
          </div>
        </div>
        { this.state.passphrase &&
          <div className="margin-bottom-25 margin-top-30 decoded-seed">
            <div className="title margin-bottom-10">
              { translate('RECOVERY.' + (this.state.isPrivKey ? 'PRIV_KEY' : 'SEED')) }
            </div>
            <div className="seed-gen-box margin-bottom-10">{ this.state.passphrase }</div>
            { this.state.showPrivKeys &&
              <div className="recovery-priv-keys">
                <div className="title margin-bottom-10">{ translate('RECOVERY.PRIV_KEYS') }</div>
                { this.renderPrivKeys() }
              </div>
            }
            <div className="text-center margin-top-35">
              <div className="title margin-bottom-10">{ translate('RECOVERY.SEED_QR') }</div>
              <QRCode
                value={ this.state.passphrase }
                size={ 320 } />
            </div>
          </div>
        }
      </div>
    );
  }
}

export default Recovery;