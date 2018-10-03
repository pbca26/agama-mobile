import React from 'react';
import jsQR from 'jsqr';
import {
  maskPubAddress,
  setLocalStorageVar,
  getLocalStorageVar,
  convertURIToImageData,
  assetsPath,
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

class Login extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: config.preload ? config.preload.seed : null,
      createPin: !getLocalStorageVar('seed') ? true : false,
      pinOverride: config.preload ? config.preload.pin : null,
      pinOverrideTooShort: false,
      pin: config.preload ? config.preload.pin : '',
      wrongPin: false,
      qrScanError: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.triggerKey = this.triggerKey.bind(this);
    this.login = this.login.bind(this);
    this.toggleCreatePin = this.toggleCreatePin.bind(this);
    this.scanQR = this.scanQR.bind(this);    
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      wrongPin: false,
      qrScanError: false,
      pinOverrideTooShort: false,
    });
  }

  scanQR() {
    MeteorCamera.getPicture({
      quality: 100,
    }, (error, data) => {
      if (error) {
        devlog('qrcam err', error);
        
        this.setState({
          qrScanError: error.errorClass && error.errorClass.error && error.errorClass.error !== 'cancel' ? true : false,
        });
      
        Meteor.setTimeout(() => {
          this.setState({
            qrScanError: false,
          });
        }, 5000);
      } else {
        convertURIToImageData(data)
        .then((imageData) => {        
          const decodedQR = jsQR.decodeQRFromImage(
            imageData.data,
            imageData.width,
            imageData.height
          );

          if (!decodedQR) {
            this.setState({
              qrScanError: true,
            });

            Meteor.setTimeout(() => {
              this.setState({
                qrScanError: false,
              });
            }, 5000);
          } else {
            this.setState({
              qrScanError: false,
              passphrase: decodedQR,
            });
          }
        });
      }
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

  triggerKey(key) {
    if (key === 'back') {
      this.setState({
        pin: this.state.pin.slice(0, -1),
        wrongPin: false,
      });
    } else if (key === 'remove') {
      this.setState({
        pin: '',
        wrongPin: false,
      });
    } else {
      this.setState({
        pin: this.state.pin + key,
        wrongPin: false,
      });
    }
  }

  render() {
    if ((this.props.activeSection === 'login' || (!this.props.auth && this.props.activeSection !== 'addcoin')) &&
        this.props.coins &&
        Object.keys(this.props.coins).length &&
        this.props.activeSection !== 'create-seed' &&
        this.props.activeSection !== 'offlinesig' &&
        this.props.activeSection !== 'pin') {
      return (
        <div className="form login">
          { getLocalStorageVar('seed') &&
            <div className="form-inner">
              <div className="title">{ translate('LOGIN.SIGN_IN_TO_YOUR_ACC') }</div>
              <div className="group">
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
                  <div className="error margin-top-10 margin-bottom-25 sz350">
                    <i className="fa fa-warning"></i> { translate('LOGIN.WRONG_PIN') }
                  </div>
                }
              </div>
              <div
                onClick={ () => this.login(true) }
                className="group3">
                <div className="btn-inner">
                  <div className="btn">{ translate('LOGIN.SIGN_IN') }</div>
                  <div className="group2">
                    <div className="rectangle8copy"></div>
                    <img
                      className="path6"
                      src={ `${assetsPath.login}/reset-password-path-6.png` } />
                  </div>
                </div>
              </div>
            </div>
          }
          { !getLocalStorageVar('seed') &&
            <div className="form-inner login-create-pin">
              <div className="title">{ translate('LOGIN.CREATE_A_PIN') }</div>
              <div className="title fs14 text-center width-limit">{ translate('LOGIN.EMPTY_SEED') }</div>
              <div>
                <div
                  onClick={ this.scanQR }
                  className="group3 scan-qr">
                  <div className="btn-inner">
                    <div className="btn">{ translate('SEND.SCAN_QR') }</div>
                    <div className="group2">
                      <i className="fa fa-qrcode"></i>
                    </div>
                  </div>
                </div>
                { this.state.qrScanError &&
                  <div className="error margin-top-15 sz350">
                    <i className="fa fa-warning"></i> { translate('SEND.QR_SCAN_ERR') }
                  </div>
                }
                <div className="group">
                  <div className="edit">
                    <input
                      type="password"
                      className="form-control"
                      name="passphrase"
                      onChange={ this.updateInput }
                      placeholder={ `${translate('LOGIN.ENTER_PASSPHRASE')} ${translate('LOGIN.OR_WIF')}` }
                      value={ this.state.passphrase || '' } />
                  </div>
                </div>
                <div className="margin-bottom-35 margin-top-40 sz350">
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
                </div>
              </div>
              { this.state.createPin &&
                <div className="group no-padding-top">
                  <div className="edit">
                    <input
                      type="password"
                      className="form-control"
                      name="pinOverride"
                      onChange={ this.updateInput }
                      placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                      value={ this.state.pinOverride || '' } />
                  </div>
                </div>
              }
              { this.state.createPin &&
                this.state.pinOverrideTooShort &&
                <div className="error margin-top-15 sz350">
                  <i className="fa fa-warning"></i> { translate('LOGIN.PIN_TOO_SHORT') }
                </div>
              }
              <div
                disabled={ !this.state.passphrase }
                onClick={ () => this.login(false) }
                className="group3">
                <div className="btn-inner">
                  <div className="btn">{ translate('LOGIN.SIGN_IN') }</div>
                  <div className="group2">
                    <div className="rectangle8copy"></div>
                    <img
                      className="path6"
                      src={ `${assetsPath.login}/reset-password-path-6.png` } />
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      );
    } else {
      return null;
    }
  }
}

export default Login;