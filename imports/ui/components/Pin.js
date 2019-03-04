import React from 'react';
import {
  setLocalStorageVar,
  getLocalStorageVar,
} from '../actions/utils';
import {
  encryptkey,
  decryptkey,
} from '../actions/seedCrypt';
import translate from '../translate/translate';
import {
  devlog,
  config,
} from '../actions/dev';
import { Meteor } from 'meteor/meteor';

class Pin extends React.Component {
  constructor() {
    super();
    this.state = {
      oldPing: null,
      wrongOldPin: false,
      wrongPinRetries: 0,
      pinOverride: config.preload ? config.preload.pin : null,
      pinOverrideTooShort: false,
      pinSet: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.save = this.save.bind(this);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      pinOverrideTooShort: false,
    });
  }

  save() {
    if (this.state.pinOverride &&
        this.state.pinOverride.length >= 6) {
      const _encryptedKey = getLocalStorageVar('seed');
      const _decryptedKey = decryptkey(this.state.oldPin, _encryptedKey.encryptedKey);
      const pinBruteforceProtection = getLocalStorageVar('settings').pinBruteforceProtection;
      const pinBruteforceProtectionRetries = getLocalStorageVar('seed').pinRetries;
      
      if (_decryptedKey) {
        if (pinBruteforceProtection) {
          let _seedStorage = getLocalStorageVar('seed');
          _seedStorage.pinRetries = 0;
          setLocalStorageVar('seed', _seedStorage);
        }

        this.setState({
          oldPin: null,
          wrongPinRetries: 0,
          pinSet: true,
          pinOverrideTooShort: false,
        });

        Meteor.setTimeout(() => {
          this.setState(this.defaultState);
          this.props.lock(true);
        }, 3000);
      } else {
        if (!pinBruteforceProtection) {
          this.setState({
            wrongPin: true,
            pinOverrideTooShort: false,
          });
        } else if (pinBruteforceProtectionRetries < 3) {
          let _seedStorage = getLocalStorageVar('seed');
          _seedStorage.pinRetries += 1;
          setLocalStorageVar('seed', _seedStorage);
  
          this.setState({
            wrongPin: true,
            wrongPinRetries: _seedStorage.pinRetries,
            pinOverrideTooShort: false,
          });
        } else {
          this.props.lock(true);
        }
      }
    } else {
      this.setState({
        pinOverrideTooShort: true,
      });
    }
  }

  render() {
    return (
      <div className="form pin-override">
        <div className="title padding-bottom-30 text-center fs14 sz350">
        { translate('PIN.PROVIDE_PIN') }
        </div>
        <div className="edit margin-bottom-10">
          <input
            type="password"
            className="form-control"
            name="oldPin"
            onChange={ this.updateInput }
            placeholder={ translate('PIN.ENTER_OLD_PIN') }
            value={ this.state.oldPin || '' } />
        </div>
        { this.state.wrongPin &&
          <div className="error margin-top-15 sz350">
            <i className="fa fa-warning"></i> { this.state.wrongPinRetries === 0 ? translate('LOGIN.WRONG_PIN') : translate('LOGIN.WRONG_PIN_ATTEMPTS', 3 - this.state.wrongPinRetries) }
          </div>
        }
        <div className="margin-bottom-25 margin-top-40 edit">
          <input
            type="password"
            name="pinOverride"
            onChange={ this.updateInput }
            placeholder={ translate('PIN.ENTER_NEW_PIN') }
            value={ this.state.pinOverride || '' } />
        </div>
        { this.state.pinOverrideTooShort &&
          <div className="error margin-top-15 sz350">
            <i className="fa fa-warning"></i> { translate('LOGIN.PIN_TOO_SHORT') }
          </div>
        }
        { this.state.pinSet &&
          <div className="margin-bottom-15 margin-top-15 sz350">{ translate('PIN.SEED_IS_ENCRYPTED') }</div>
        }
        <div
          onClick={ this.save }
          className="group3 margin-top-40"
          disabled={
            !this.state.oldPin ||
            !this.state.pinOverride
          }>
          <div className="btn-inner">
            <div className="btn">{ translate('PIN.SAVE') }</div>
            <div className="group2">
              <i className="fa fa-save"></i>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Pin;