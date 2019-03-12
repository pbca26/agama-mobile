import React from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode.react';

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
import { isPrivKey } from 'agama-wallet-lib/build/keys';
import passphraseGenerator from 'agama-wallet-lib/build/crypto/passphrasegenerator';
import { shuffleArray } from '../actions/utils';
import AddCoin from './AddCoin';

// TODO: PIN replace onscreen keyboard with virtual one

class Login extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: config.preload ? config.preload.seed : null,
      pin: config.preload ? config.preload.pin : '',
      pinTooShort: false,
      wrongPin: false,
      wrongPinRetries: 0,
      qrScanError: false,
      activeView: null,
      step: 0,
      restoreIsPrivKey: false,
      restorePin: null,
      restorePinConfirm: null,
      restorePinError: null,
      createSeed: null,
      createSeedShuffled: null,
      createSeedConfirm: [],
      createSeedDisplayQR: false,
      createPin: null,
      createPinConfirm: null,
      createPinError: null,
      displaySeed: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.login = this.login.bind(this);
    this.restoreWalletInit = this.restoreWalletInit.bind(this);
    this.createWalletInit = this.createWalletInit.bind(this);
    this.scanQR = this.scanQR.bind(this);
    this.prevStep = this.prevStep.bind(this);
    this.nextStep = this.nextStep.bind(this);
    this.toggleCreateQR = this.toggleCreateQR.bind(this);
    this.clearCreateSeedConfirm = this.clearCreateSeedConfirm.bind(this);
    this.createSeedConfirmPush = this.createSeedConfirmPush.bind(this);
    this.addcoinCB = this.addcoinCB.bind(this);
    this.toggleSeedVisibility = this.toggleSeedVisibility.bind(this);
  }

  toggleSeedVisibility() {
    this.setState({
      displaySeed: !this.state.displaySeed,
    });
  }

  addcoinCB(coin) {
    this.props.addCoin(coin);
    
    if (this.state.activeView === 'restore') {
      const _encryptedKey = encryptkey(this.state.restorePin, this.state.passphrase);
      
      setLocalStorageVar('seed', getLocalStorageVar('settings').pinBruteforceProtection ? {
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
    } else {
      const _encryptedKey = encryptkey(this.state.createPin, this.state.createSeed);
      
      setLocalStorageVar('seed', getLocalStorageVar('settings').pinBruteforceProtection ? {
        encryptedKey: _encryptedKey,
        pinRetries: 0,
      }: {
        encryptedKey: _encryptedKey,
      });

      this.setState({
        step: this.state.step + 1,
        createPin: null,
        createPinConfirm: null,
        createSeed: null,
        createSeedConfirm: [],
        createSeedShuffled: null,
      });
    }
  }

  clearCreateSeedConfirm() {
    this.setState({
      createSeedConfirm: [],
    });
  }

  createSeedConfirmPush(word) {
    let createSeedConfirm = JSON.parse(JSON.stringify(this.state.createSeedConfirm));

    createSeedConfirm.push(word);    

    this.setState({
      createSeedConfirm,
    });
  }

  nextStep() {
    if (this.state.activeView === 'restore') {
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
          this.setState({
            step: this.state.step + 1,
          });
        }
      } else {
        this.setState({
          step: this.state.step + 1,
        });
      }
    } else {
      if (this.state.step === 2) {
        let createPinError;
        
        if (!this.state.createPin ||
            (this.state.createPin && this.state.createPin.length < 6)) {
          createPinError = translate('LOGIN.PIN_TOO_SHORT');
        } else if (
          !this.state.createPinConfirm ||
          (this.state.createPinConfirm && this.state.createPinConfirm.length < 6)
        ) {
          createPinError = translate('LOGIN.PIN_CONFIRM_TOO_SHORT');
        } else if (
          this.state.createPin &&
          this.state.createPinConfirm &&
          this.state.createPin !== this.state.createPinConfirm
        ) {
          createPinError = translate('LOGIN.PIN_MISMATCH')
        }

        if (createPinError) {
          this.setState({
            createPinError,
          });
        } else {
          this.setState({
            step: this.state.step + 1,
          });
        }
      } else {
        this.setState({
          step: this.state.step + 1,
        });
      }
    }
  }

  prevStep() {
    if (this.state.step === 0) {
      this.props.changeTitle('login');
    }

    if (this.state.activeView === 'create' &&
        this.state.step === 1) {
      const newSeed = passphraseGenerator.generatePassPhrase(256);
      
      this.setState({
        step: this.state.step <= 1 ? 0 : this.state.step - 1,
        activeView: this.state.step === 0 ? null : this.state.activeView,
        createSeed: newSeed,
        createSeedShuffled: shuffleArray(newSeed.split(' ')),
      });
    } else {
      this.setState({
        step: this.state.step <= 1 ? 0 : this.state.step - 1,
        activeView: this.state.step === 0 ? null : this.state.activeView,
        passphrase: this.state.activeView === 'restore' && this.state.step <= 1 ? this.state.passphrase : null,
        createSeedConfirm: [],
        createPin: null,
        createPinConfirm: null,
        restorePin: null,
        restorePinConfirm: null,
      });
    }
  }

  restoreWalletInit() {
    this.setState({
      activeView: 'restore',
      step: 0,
      restoreIsPrivKey: false,
      restorePin: null,
      restorePinConfirm: null,
      restorePinError: null,
      createSeed: null,
      createSeedShuffled: null,
      createSeedConfirm: [],
      createSeedDisplayQR: false,
      createPin: null,
      createPinConfirm: null,
      createPinError: null,
      displaySeed: false,
    });
    this.props.changeTitle('restore_wallet');
  }

  createWalletInit() {
    const newSeed = passphraseGenerator.generatePassPhrase(256);

    this.setState({
      activeView: 'create',
      step: 0,
      restoreIsPrivKey: false,
      restorePin: null,
      restorePinConfirm: null,
      restorePinError: null,
      createSeed: newSeed,
      createSeedShuffled: shuffleArray(newSeed.split(' ')),
      createSeedConfirm: [],
      createSeedDisplayQR: false,
      createPin: null,
      createPinConfirm: null,
      createPinError: null,
      displaySeed: false,
    });
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      wrongPin: false,
      qrScanError: false,
      pinTooShort: false,
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
    // decrypt
    const _encryptedKey = getLocalStorageVar('seed');
    const pinBruteforceProtection = getLocalStorageVar('settings').pinBruteforceProtection;
    const pinBruteforceProtectionRetries = getLocalStorageVar('seed').pinRetries;

    if (_encryptedKey &&
        _encryptedKey.encryptedKey &&
        this.state.pin &&
        this.state.pin.length >= 6) {
      const _decryptedKey = decryptkey(this.state.pin, _encryptedKey.encryptedKey);

      if (_decryptedKey) {
        if (pinBruteforceProtection) {
          let _seedStorage = getLocalStorageVar('seed');
          _seedStorage.pinRetries = 0;
          setLocalStorageVar('seed', _seedStorage);
        }
        
        this.props.changeTitle();
        this.props.login(_decryptedKey);
        this.setState(this.defaultState);
      } else {
        if (!pinBruteforceProtection) {
          this.setState({
            pinTooShort: false,
            wrongPin: true,
          });
        } else if (pinBruteforceProtectionRetries < 2) {
          let _seedStorage = getLocalStorageVar('seed');
          _seedStorage.pinRetries += 1;
          setLocalStorageVar('seed', _seedStorage);
  
          this.setState({
            pinTooShort: false,
            wrongPin: true,
            wrongPinRetries: _seedStorage.pinRetries,
          });

          setTimeout(() => {
            console.warn(this.state);
          }, 100);
        } else {
          this.props.changeTitle();
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

  toggleCreateQR() {
    this.setState({
      createSeedDisplayQR: !this.state.createSeedDisplayQR,
    });
  }

  renderCreateSeedWordsConfirm() {
    const words = this.state.createSeedShuffled;
    let items = [];

    for (let i = 0; i < words.length; i++) {
      if (this.state.createSeedConfirm.indexOf(words[i]) === -1) {
        items.push(
          <span
            key={ `seed-confirm-word-${i}` }
            className="seed-confirm-word"
            onClick={ () => this.createSeedConfirmPush(words[i]) }>
            { words[i] }
          </span>
        );
      }
    }

    return items;
  }

  renderCreateWallet() {
    return (
      <div className="create-wallet">
        { this.state.step === 0 &&
          <div className="step1">
            <div className="title">
              { translate('LOGIN.NEW_SEED_P1') }
              <br />
              { translate('LOGIN.NEW_SEED_P2') }
            </div>
            <div className="create-wallet-security-tip">{ translate('LOGIN.NEW_SEED_SEC_TIP') }</div>
            <i
              onClick={ this.toggleCreateQR }
              className="fa fa-qrcode"></i>
            <div className="seed-gen-box selectable">{ this.state.createSeed }</div>
            { this.state.createSeedDisplayQR &&
              <div className="text-center margin-top-30">
                <QRCode
                  value={ this.state.createSeed }
                  size={ 320 } />
              </div>
            }
            <div
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
            <div className="title">{ translate('LOGIN.TO_CONFIRM_SEED') }</div>
            { this.state.createSeedConfirm.length < this.state.createSeedShuffled.length &&
              <div className="seed-words-block">
                { this.renderCreateSeedWordsConfirm() }
              </div>
            }
            { this.state.createSeedConfirm &&
              this.state.createSeedConfirm.length > 0 &&
              <div className="margin-top-10">
                { this.state.createSeed !== this.state.createSeedConfirm.join(' ') &&
                  <i
                    onClick={ this.clearCreateSeedConfirm }
                    className="fa fa-trash"></i>
                }
                <div className="seed-gen-box">{ this.state.createSeedConfirm.join(' ') }</div>
              </div>
            }
            <div
              onClick={ this.nextStep }
              disabled={ this.state.createSeed !== this.state.createSeedConfirm.join(' ') }
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
            <div className="title">{ translate('LOGIN.PLEASE_PROVIDE_PIN') }</div>
            <div className="group">
              <div className="edit">
                <input
                  type="password"
                  className="form-control"
                  name="createPin"
                  onChange={ this.updateInput }
                  placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
                  value={ this.state.createPin || '' } />
              </div>
            </div>
            <div className="group">
              <div className="edit">
                <input
                  type="password"
                  className="form-control"
                  name="createPinConfirm"
                  onChange={ this.updateInput }
                  placeholder={ translate('LOGIN.CONFIRM_PIN') }
                  value={ this.state.createPinConfirm || '' } />
              </div>
            </div>
            { this.state.createPinError &&
              <div className="error margin-top-15 sz350">
                <i className="fa fa-warning"></i> { this.state.createPinError }
              </div>
            }
            <div
              disabled={
                !this.state.createPin ||
                !this.state.createPinConfirm
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
        { this.state.step === 3 &&
          <AddCoin
            cb={ this.addcoinCB }
            activate={ true } />
        }
        { this.state.step === 4 &&
          <div className="step5">
            { this.renderLoginInForm() }
          </div>
        }
      </div>
    );
  }

  renderRestoreWallet() {
    return (
      <div className="restore-wallet">
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
          <AddCoin
            cb={ this.addcoinCB }
            activate={ true } />
        }
        { this.state.step === 3 &&
          <div className="step4">
            { this.renderLoginInForm() }
          </div>
        }
      </div>
    );
  }

  renderLoginInForm() {
    return (
      <div className="form-inner">
        { !this.state.activeView &&
          <div className="title">{ translate('LOGIN.SIGN_IN_TO_YOUR_ACC') }</div>
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
    if (((getLocalStorageVar('coins') && Object.keys(getLocalStorageVar('coins')).length && getLocalStorageVar('seed')) || ((!getLocalStorageVar('coins') || (getLocalStorageVar('coins') && !Object.keys(getLocalStorageVar('coins')).length)) && !getLocalStorageVar('seed'))) &&
        ((!this.props.auth && this.props.activeSection !== 'settings') &&
        (this.props.activeSection === 'login' || (!this.props.auth && this.props.activeSection !== 'addcoin')) &&
        this.props.activeSection !== 'offlinesig' &&
        this.props.activeSection !== 'pin')) {
      return (
        <div className="form login">
          { getLocalStorageVar('seed') &&
            !this.state.activeView &&
            this.renderLoginInForm()
          }
          { (!getLocalStorageVar('seed') || this.state.activeView) &&
            <div className="form-inner login-create-pin">
              { this.state.activeView &&
                this.state.step < 2 &&
                <img
                  className="menu-back"
                  src={ `${assetsPath.menu}/trends-combined-shape.png` }
                  onClick={ this.prevStep } />
              }
              { this.state.activeView &&
                this.state.activeView === 'create' &&
                this.renderCreateWallet()
              }
              { this.state.activeView &&
                this.state.activeView === 'restore' &&
                this.renderRestoreWallet()
              }
              { !this.state.activeView &&
                <div>
                  <div className="title">{ translate('LOGIN.PLEASE_CHOOSE_AN_OPTION_BELOW') }</div>
                  <div>
                    <div
                      onClick={ this.restoreWalletInit }
                      className="group3 scan-qr">
                      <div className="btn-inner">
                        <div className="btn">{ translate('LOGIN.I_WANT_TO_RESTORE_WALLET') }</div>
                        <div className="group2">
                          <div className="rectangle8copy"></div>
                          <img
                            className="path6"
                            src={ `${assetsPath.login}/reset-password-path-6.png` } />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      onClick={ this.createWalletInit }
                      className="group3 scan-qr">
                      <div className="btn-inner">
                        <div className="btn">{ translate('LOGIN.I_WANT_TO_CREATE_WALLET') }</div>
                        <div className="group2">
                          <div className="rectangle8copy"></div>
                          <img
                            className="path6"
                            src={ `${assetsPath.login}/reset-password-path-6.png` } />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
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