import React from 'react';

import {
  setLocalStorageVar,
  getLocalStorageVar,
} from '../actions/utils';
import {
  encryptkey,
  decryptkey,
} from '../actions/seedCrypt';
import { translate } from '../translate/translate';
import { PassPhraseGenerator } from './seedGen/passphrasegenerator';

class CreateSeed extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: null,
      createPin: true,
      pinOverride: null,
      pinOverrideTooShort: false,
      pin: '',
      pinConfirm: false,
      confirmSeedSaved: false,
      seed: PassPhraseGenerator.generatePassPhrase(256),
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
      seed: PassPhraseGenerator.generatePassPhrase(256),
    });
  }

  componentWillReceiveProps(props) {
    // console.warn(props);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
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
        <div className="col-sm-12">
          <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12 create-seed">
            <div className="row">
              <div className="margin-bottom-30">
                <span
                  className="btn-back"
                  onClick={ () => this.props.changeActiveSection('login') }>
                  <i className="fa fa-arrow-left"></i> { translate('DASHBOARD.BACK') }
                </span>
              </div>
              <h4>{ translate('LOGIN.THIS_IS_YOUR_NEW_SEED') }</h4>
              <div className="seed-gen-box">{ this.state.seed }</div>
              <div className="margin-top-25 margin-bottom-25 warning">
                <strong>{ translate('LOGIN.PLEASE_MAKE_SURE_TO') }</strong>
              </div>
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
                onClick={ this.login }>
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

export default CreateSeed;