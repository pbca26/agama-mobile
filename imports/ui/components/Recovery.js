import React from 'react';

import {
  getLocalStorageVar,
} from '../actions/utils';
import { decryptkey } from '../actions/seedCrypt';
import { translate } from '../translate/translate';
import QRCode from 'qrcode.react';

class Recovery extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: null,
      pin: null,
      wrongPin: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.decodeSeed = this.decodeSeed.bind(this);
  }

  componentWillReceiveProps(props) {
    if (props.activeSection !== 'recovery' &&
        this.state.passphrase) {
      this.setState(this.defaultState);
    }
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  decodeSeed() {
    const _encryptedKey = getLocalStorageVar('seed');
    const _decryptedKey = decryptkey(this.state.pin, _encryptedKey.encryptedKey);

    if (_decryptedKey) {
      this.setState({
        wrongPin: false,
        passphrase: _decryptedKey,
      });
    } else {
      this.setState({
        wrongPin: true,
      });
    }
  }

  render() {
    return (
      <div className="col-sm-12">
        <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
          <div className="row">
            <h4 className="padding-bottom-15">Recovery passphrase</h4>
            <div className="padding-bottom-10">
            Provide your PIN number to unlock passphrase.
            </div>
            <div className="margin-bottom-25">
              <input
                type="password"
                className="form-control margin-top-20"
                name="pin"
                onChange={ this.updateInput }
                placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                value={ this.state.pin || '' } />
              { this.state.wrongPin &&
                <div className="error margin-top-15">
                  <i className="fa fa-warning"></i> { translate('LOGIN.WRONG_PIN') }
                </div>
              }
            </div>
            <button
              disabled={ !this.state.pin }
              className="btn btn-lg btn-primary btn-block ladda-button"
              onClick={ this.decodeSeed }>
              <span className="ladda-label">
              Show
              </span>
            </button>
            { this.state.passphrase &&
              <div className="margin-bottom-25 margin-top-70 decoded-seed">
                <div className="margin-bottom-40 fs-16">{ this.state.passphrase }</div>
                <QRCode
                  value={ this.state.passphrase }
                  size={ 240 } />
              </div>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default Recovery;