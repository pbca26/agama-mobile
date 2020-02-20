import React from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode.react';

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
import { Meteor } from 'meteor/meteor';
import { isPrivKey } from 'agama-wallet-lib/build/keys';
import UserAgreement from '../Settings/UserAgreement';
import QrHelper from '../QrHelper';

class NotaryVoteLogin extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: config.preload ? config.preload.seed : null,
      pin: config.preload ? config.preload.pin : '',
      pinTooShort: false,
      wrongPin: false,
      wrongPinRetries: 0,
      qrScanError: false,
      step: 0,
      restoreIsPrivKey: false,
      restorePin: null,
      restorePinConfirm: null,
      restorePinError: null,
      displaySeed: false,
      agreementAccepted: getLocalStorageVar('agreement') && getLocalStorageVar('agreement') === true || false,
      displayQrHelper: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.login = this.login.bind(this);
    this.scanQR = this.scanQR.bind(this);
    this._scanQR = this._scanQR.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.toggleSeedVisibility = this.toggleSeedVisibility.bind(this);
    this.agreementAcceptedCB = this.agreementAcceptedCB.bind(this);
    this.qrHelperCB = this.qrHelperCB.bind(this);
  }

  agreementAcceptedCB() {
    this.setState({
      agreementAccepted: true,
    });
  }

  toggleSeedVisibility() {
    this.setState({
      displaySeed: !this.state.displaySeed,
    });
  }

  nextStep() {
    if (this.state.step === 0) {
      const restoreIsPrivKey = isPrivKey(this.state.passphrase);
      
      this.setState({
        restoreIsPrivKey,
        step: this.state.step + 1,
        displaySeed: false,
      });
    } else if (this.state.step === 1) {
      let restorePinError;

      if (!this.state.restorePin ||
          (this.state.restorePin && this.state.restorePin.length < 6)) {
        restorePinError = translate('LOGIN.PIN_TOO_SHORT');
      } else if (
        !this.state.restorePinConfirm ||
        (this.state.restorePinConfirm && this.state.restorePinConfirm.length < 6)
      ) {
        restorePinError = translate('LOGIN.PIN_CONFIRM_TOO_SHORT');
      } else if (
        this.state.restorePin &&
        this.state.restorePinConfirm &&
        this.state.restorePin !== this.state.restorePinConfirm
      ) {
        restorePinError = translate('LOGIN.PIN_MISMATCH');
      }

      if (restorePinError) {
        this.setState({
          restorePinError,
        });
      } else {
        const _encryptedKey = encryptkey(this.state.restorePin, this.state.passphrase);
        
        setLocalStorageVar('nn', getLocalStorageVar('settings').pinBruteforceProtection ? {
          encryptedKey: _encryptedKey,
          pinRetries: 0,
        }: {
          encryptedKey: _encryptedKey,
        });
  
        this.setState({
          step: this.state.step + 1,
          restorePin: null,
          restorePinConfirm: null,
          passphrase: null,
        });
      }
    } else {
      this.setState({
        step: this.state.step + 1,
      });
    }
  }

  prevStep() {
    if (this.state.step === 0) {
      this.props.historyBack();
    } else {
      this.setState({
        step: this.state.step <= 1 ? 0 : this.state.step - 1,
        passphrase: this.state.step <= 1 ? this.state.passphrase : null,
        restorePin: null,
        restorePinConfirm: null,
      });
    }
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      wrongPin: false,
      qrScanError: false,
      pinTooShort: false,
    });
  }

  qrHelperCB() {
    this._scanQR();

    this.setState({
      displayQrHelper: false,
    });
  }

  _scanQR() {
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

  scanQR() {
    if (!getLocalStorageVar('qrhelper')) {
      this.setState({
        displayQrHelper: true,
      });
    } else {
      this._scanQR();
    }
  }

  login(isPinAccess) {
    // decrypt
    const _encryptedKey = getLocalStorageVar('nn');
    const pinBruteforceProtection = getLocalStorageVar('settings').pinBruteforceProtection;
    const pinBruteforceProtectionRetries = getLocalStorageVar('nn').pinRetries;

    if (_encryptedKey &&
        _encryptedKey.encryptedKey &&
        this.state.pin &&
        this.state.pin.length >= 6) {
      const _decryptedKey = decryptkey(this.state.pin, _encryptedKey.encryptedKey);

      if (_decryptedKey) {
        if (pinBruteforceProtection) {
          let _seedStorage = getLocalStorageVar('nn');
          _seedStorage.pinRetries = 0;
          setLocalStorageVar('nn', _seedStorage);
        }
        
        this.props.login(_decryptedKey);
        this.setState(this.defaultState);
      } else {
        if (!pinBruteforceProtection) {
          this.setState({
            pinTooShort: false,
            wrongPin: true,
          });
        } else if (pinBruteforceProtectionRetries < 2) {
          let _seedStorage = getLocalStorageVar('nn');
          _seedStorage.pinRetries += 1;
          setLocalStorageVar('nn', _seedStorage);
  
          this.setState({
            pinTooShort: false,
            wrongPin: true,
            wrongPinRetries: _seedStorage.pinRetries,
          });
        } else {
          this.props.lock(true);
          this.setState(this.defaultState);
        }
      }
    } else {
      this.setState({
        pinTooShort: true,
        wrongPin: true,
      });
    }
  }

  renderRestoreWallet() {
    return (
      <div className="restore-wallet">
        { !this.state.agreementAccepted &&
          <UserAgreement
            enableButton={ true }
            cb={ this.agreementAcceptedCB } />
        }
        { this.state.agreementAccepted &&
          <div>
            { this.state.step === 0 &&
              <div className="step1">
                <div className="title">{ translate('LOGIN.PLEASE_PROVIDE_SEED_BELOW') }</div>
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
                  <div className="edit create-wallet-seed">
                    { this.state.passphrase &&
                      <i
                        onClick={ this.toggleSeedVisibility }
                        className={ 'fa fa-eye' + (this.state.displaySeed ? '-slash' : '') }></i>
                    }
                    { this.state.displaySeed &&
                      <span>{ this.state.passphrase }</span>
                    }
                    { !this.state.displaySeed &&
                      <input
                        type="password"
                        className="form-control"
                        name="passphrase"
                        onChange={ this.updateInput }
                        placeholder={ `${translate('LOGIN.ENTER_PASSPHRASE')} ${translate('LOGIN.OR_WIF')}` }
                        value={ this.state.passphrase || '' } />
                    }
                  </div>
                </div>
                <div
                  disabled={ !this.state.passphrase }
                  onClick={ this.nextStep }
                  className="group3">
                  <div className="btn-inner">
                    <div className="btn">{ translate('LOGIN.NEXT') }</div>
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
            { this.state.step === 1 &&
              <div className="step2">
                <div className="title">{ translate('LOGIN.PLEASE_PROVIDE_PIN') }</div>
                <div className="group">
                  <div className="edit restore-seed-verify">
                    { translate('LOGIN.' + (this.state.restoreIsPrivKey ? 'YOU_PROVIDED_PRIVKEY' : 'YOU_PROVIDED_SEED')) }
                    <span onClick={ this.prevStep }>
                      { translate('LOGIN.WRONG') }
                    </span>
                  </div>
                </div>
                <div className="group">
                  <div className="edit">
                    <input
                      type="password"
                      className="form-control"
                      name="restorePin"
                      onChange={ this.updateInput }
                      placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                      value={ this.state.restorePin || '' } />
                  </div>
                </div>
                <div className="group">
                  <div className="edit">
                    <input
                      type="password"
                      className="form-control"
                      name="restorePinConfirm"
                      onChange={ this.updateInput }
                      placeholder={ translate('LOGIN.CONFIRM_PIN') }
                      value={ this.state.restorePinConfirm || '' } />
                  </div>
                </div>
                { this.state.restorePinError &&
                  <div className="error margin-top-15 sz350">
                    <i className="fa fa-warning"></i> { this.state.restorePinError }
                  </div>
                }
                <div
                  disabled={
                    !this.state.restorePin ||
                    !this.state.restorePinConfirm
                  }
                  onClick={ this.nextStep }
                  className="group3">
                  <div className="btn-inner">
                    <div className="btn">{ translate('LOGIN.NEXT') }</div>
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
            { this.state.step === 2 &&
              <div className="step3">
                { this.renderLoginInForm() }
              </div>
            }
          </div>
        }
      </div>
    );
  }

  renderLoginInForm() {
    return (
      <div className="form-inner">
        { !this.state.activeView &&
          <div className="title">{ translate('LOGIN.SIGN_IN_TO_YOUR_NN_ACC') }</div>
        }
        { this.state.activeView &&
          <div className="title">
            { translate('LOGIN.YOU_ARE_ALL_SET') }
            <br />
            { translate('LOGIN.TRY_TO_LOGIN_NOW') }
          </div>
        }
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
              <i className="fa fa-warning"></i> { this.state.wrongPinRetries === 0 ? translate(this.state.pinTooShort ? 'LOGIN.PIN_TOO_SHORT' : 'LOGIN.WRONG_PIN') : translate('LOGIN.WRONG_PIN_ATTEMPTS', 3 - this.state.wrongPinRetries) }
            </div>
          }
        </div>
        <div
          onClick={ this.login }
          className="group3"
          disabled={
            !this.state.pin ||
            (this.state.pin && this.state.pin.length < 6)
          }>
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
    );
  }

  render() {
    return (
      <div className="form login">
        { this.state.displayQrHelper &&
          <QrHelper cb={ this.qrHelperCB } />
        }
        { getLocalStorageVar('nn') &&
          this.renderLoginInForm()
        }
        { !getLocalStorageVar('nn') &&
          <div className="form-inner login-create-pin">
            { this.state.step < 2 &&
              <img
                id="main-app-back-btn-login"
                className="menu-back"
                src={ `${assetsPath.menu}/trends-combined-shape.png` }
                onClick={ this.prevStep } />
            }
            { this.renderRestoreWallet() }
          </div>
        }
      </div>
    );
  }
}

export default NotaryVoteLogin;