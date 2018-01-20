import React from 'react';

import {
  maskPubAddress,
  setLocalStorageVar,
  getLocalStorageVar,
} from '../actions/utils';
import {
  encryptkey,
  decryptkey,
} from '../actions/seedCrypt';
import { translate } from '../translate/translate';

class Pin extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: null,
      pinOverride: null,
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
    });
  }

  save() {
    if (this.state.pinOverride.length >= 6) {
      const _encryptedKey = encryptkey(this.state.pinOverride, this.state.passphrase);

      setLocalStorageVar('seed', { encryptedKey: _encryptedKey });
      this.setState({
        pinSet: true,
        pinOverrideTooShort: false,
      });

      setTimeout(() => {
        this.setState(this.defaultState);        
      }, 5000);
    } else {
      this.setState({
        pinOverrideTooShort: true,
      });
    }
  }

  render() {
    return (
      <div className="col-sm-12">
        <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
          <div className="row">
            <h4 className="padding-bottom-15">Override PIN</h4>
            <div className="padding-bottom-10">
            Provide a seed and enter 6 digit PIN number in the form below.
            </div>
            <input
              type="password"
              className="form-control margin-bottom-10"
              name="passphrase"
              onChange={ this.updateInput }
              placeholder={ translate('LOGIN.ENTER_PASSPHRASE') }
              value={ this.state.passphrase || '' } />

            <div className="margin-bottom-25 margin-top-30">
              <input
                type="password"
                className="form-control margin-top-20"
                name="pinOverride"
                onChange={ this.updateInput }
                placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                value={ this.state.pinOverride || '' } />
              { this.state.pinOverrideTooShort &&
                <div className="error margin-top-15">
                  <i className="fa fa-warning"></i> { translate('LOGIN.PIN_TOO_SHORT') }
                </div>
              }
            </div>
            { this.state.pinSet &&
              <div className="margin-bottom-15 margin-top-15">Seed is encrypted with provided PIN. Use the PIN to login or sign a transaction.</div>
            }
            <button
              className="btn btn-lg btn-primary btn-block ladda-button"
              onClick={ this.save }>
              <span className="ladda-label">
              Save
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default Pin;