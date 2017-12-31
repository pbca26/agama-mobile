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

class Login extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: null,
      createPin: false,
      pinOverride: null,
      pinOverrideTooShort: false,
      pin: '',
      wrongPin: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.login = this.login.bind(this);
    this.toggleCreatePin = this.toggleCreatePin.bind(this);
  }

  componentWillReceiveProps(props) {
    // console.warn(props);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  login(isPinAccess) {
    if (isPinAccess) {
      // decrypt
      const _encryptedKey = getLocalStorageVar('seed');

      if (_encryptedKey &&
          _encryptedKey.encryptedKey &&
          this.state.pin &&
          this.state.pin.length >= 6) {
        const _decryptedKey = decryptkey(this.state.pin, _encryptedKey.encryptedKey);

        if (_decryptedKey) {
          this.props.login(_decryptedKey);
          this.setState(this.defaultState);
        } else {
          this.setState({
            pinOverrideTooShort: false,
            wrongPin: true,
          });
        }
      } else {
        this.setState({
          pinOverrideTooShort: false,
          wrongPin: true,
        });
      }
    } else {
      if (this.state.createPin) {
        if (this.state.pinOverride &&
            this.state.pinOverride.length >= 6) {
          const _encryptedKey = encryptkey(this.state.pinOverride, this.state.passphrase);

          setLocalStorageVar('seed', { encryptedKey: _encryptedKey });

          this.props.login(this.state.passphrase);
          this.setState(this.defaultState);
        } else {
          this.setState({
            pinOverrideTooShort: true,
            wrongPin: false,
          });
        }
      } else {
        this.props.login(this.state.passphrase);
        this.setState(this.defaultState);
      }
    }
  }

  toggleCreatePin() {
    this.setState({
      createPin: !this.state.createPin,
    });
  }

  render() {
    if ((this.props.activeSection === 'login' || (!this.props.auth && this.props.activeSection !== 'addcoin')) &&
        this.props.coins &&
        Object.keys(this.props.coins).length &&
        this.props.activeSection !== 'create-seed') {
      return (
        <div className="col-sm-12">
          <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
            <div className="row">
              <h4 className="padding-bottom-10">{ translate('LOGIN.PIN_ACCESS') }</h4>
              <input
                type="password"
                className="form-control margin-bottom-30"
                name="pin"
                onChange={ this.updateInput }
                placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                value={ this.state.pin || '' } />
              { this.state.wrongPin &&
                <div className="error margin-bottom-25">
                  <i className="fa fa-warning"></i> { translate('LOGIN.WRONG_PIN') }
                </div>
              }
              <button
                className="btn btn-lg btn-primary btn-block ladda-button"
                onClick={ () => this.login(true) }>
                <span className="ladda-label">
                { translate('LOGIN.LOGIN') }
                </span>
              </button>

              <hr />

              <h4 className="padding-bottom-10">{ translate('LOGIN.PASSPHRASE_ACCESS') }</h4>
              <input
                type="password"
                className="form-control margin-bottom-10"
                name="passphrase"
                onChange={ this.updateInput }
                placeholder={ translate('LOGIN.ENTER_PASSPHRASE') }
                value={ this.state.passphrase || '' } />

              <div className="margin-bottom-25 margin-top-30">
                <label className="switch">
                  <input
                    type="checkbox"
                    value="on"
                    checked={ this.state.createPin } />
                  <div
                    className="slider"
                    onClick={ this.toggleCreatePin }></div>
                </label>
                <div
                  className="toggle-label pointer"
                  onClick={ this.toggleCreatePin }>
                  { translate('LOGIN.OVERRIDE_PIN') }
                </div>
                { this.state.createPin &&
                  <input
                    type="password"
                    className="form-control margin-top-20"
                    name="pinOverride"
                    onChange={ this.updateInput }
                    placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                    value={ this.state.pinOverride || '' } />
                }
                { this.state.createPin &&
                  this.state.pinOverrideTooShort &&
                  <div className="error margin-top-15">
                    <i className="fa fa-warning"></i> { translate('LOGIN.PIN_TOO_SHORT') }
                  </div>
                }
              </div>

              <button
                className="btn btn-lg btn-primary btn-block ladda-button"
                onClick={ () => this.login(false) }>
                <span className="ladda-label">
                { translate('LOGIN.LOGIN') }
                </span>
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
}

export default Login;