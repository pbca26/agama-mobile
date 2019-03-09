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

// TODO: PIN replace onscreen keyboard with virtual one

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
      wrongPinRetries: 0,
      qrScanError: false,
      activeView: null,
      step: 0,
      restoreIsPrivKey: false,
      restorePin: null,
      restorePinCofirm: null,
      restorePinError: null,
      createSeed: null,
      createSeedShuffled: null,
      createSeedConfirm: [],
      createSeedDisplayQR: false,
      createPin: null,
      createPinCofirm: null,
      createPinError: null,
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
        });
      } else if (this.state.step === 1) {
        let restorePinError;

        if (!this.state.restorePin ||
            (this.state.restorePin && this.state.restorePin.length < 6)) {
          restorePinError = 'PIN is too short';
        } else if (
          !this.state.restorePinConfirm ||
          (this.state.restorePinConfirm && this.state.restorePinConfirm.length < 6)
        ) {
          restorePinError = 'PIN confirm is too short';
        } else if (
          this.state.restorePin &&
          this.state.restorePinConfirm &&
          this.state.restorePin !== this.state.restorePinConfirm
        ) {
          restorePinError = 'PIN and PIN confirmation are not matching';
        }

        if (restorePinError) {
          this.setState({
            restorePinError,
          });
        } else {
          const _encryptedKey = encryptkey(this.state.restorePin, this.state.passphrase);

          setLocalStorageVar('seed', getLocalStorageVar('settings').pinBruteforceProtection ? {
            encryptedKey: _encryptedKey,
            pinRetries: 0,
          }: {
            encryptedKey: _encryptedKey,
          });

          this.setState({
            step: this.state.step + 1,
          });
        }
      }
    } else {
      if (this.state.step === 2) {
        let createPinError;
        
        if (!this.state.createPin ||
            (this.state.createPin && this.state.createPin.length < 6)) {
          createPinError = 'PIN is too short';
        } else if (
          !this.state.createPinConfirm ||
          (this.state.createPinConfirm && this.state.createPinConfirm.length < 6)
        ) {
          createPinError = 'PIN confirm is too short';
        } else if (
          this.state.createPin &&
          this.state.createPinConfirm &&
          this.state.createPin !== this.state.createPinConfirm
        ) {
          createPinError = 'PIN and PIN confirmation are not matching';
        }

        if (createPinError) {
          this.setState({
            createPinError,
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
        createPinConfirm: [],
        createPin: null,
        createPinCofirm: null,
        restorePin: null,
        restorePinCofirm: null,
      });
    }
  }

  restoreWalletInit() {
    this.setState({
      activeView: 'restore',
      step: 0,
      restoreIsPrivKey: false,
      restorePin: null,
      restorePinCofirm: null,
      restorePinError: null,
      createSeed: null,
      createSeedShuffled: null,
      createSeedConfirm: [],
      createSeedDisplayQR: false,
      createPin: null,
      createPinCofirm: null,
      createPinError: null,
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
      restorePinCofirm: null,
      restorePinError: null,
      createSeed: newSeed,
      createSeedShuffled: shuffleArray(newSeed.split(' ')),
      createSeedConfirm: [],
      createSeedDisplayQR: false,
      createPin: null,
      createPinCofirm: null,
      createPinError: null,
    });
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
              pinOverrideTooShort: false,
              wrongPin: true,
            });
          } else if (pinBruteforceProtectionRetries < 3) {
            let _seedStorage = getLocalStorageVar('seed');
            _seedStorage.pinRetries += 1;
            setLocalStorageVar('seed', _seedStorage);
    
            this.setState({
              pinOverrideTooShort: false,
              wrongPin: true,
              wrongPinRetries: _seedStorage.pinRetries,
            });
          } else {
            this.props.changeTitle();
            this.props.lock(true);
            this.setState(this.defaultState);
          }
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
        this.props.changeTitle();
        this.props.login(this.state.passphrase);
        this.setState(this.defaultState);
      }
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
            <div className="title">This is your new seed<br />Please write it down somewhere safe.</div>
            <div className="create-wallet-security-tip">For best security practices make sure you are in a private space/room.</div>
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
                <div className="btn">Next</div>
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
            <div className="title">To confirm that you recorded your seed please place the words in their exact order below.</div>
            { this.state.createSeedConfirm.length < this.state.createSeedShuffled.length &&
              <div className="seed-words-block">
                { this.renderCreateSeedWordsConfirm() }
              </div>
            }
            { this.state.createSeedConfirm &&
              this.state.createSeedConfirm.length > 0 &&
              <div className="margin-top-10">
                <i
                  onClick={ this.clearCreateSeedConfirm }
                  className="fa fa-trash"></i>
                <div className="seed-gen-box">{ this.state.createSeedConfirm.join(' ') }</div>
              </div>
            }
            <div
              onClick={ this.nextStep }
              className="group3">
              <div className="btn-inner">
                <div className="btn">Next</div>
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
            <div className="title">Please provide PIN and PIN confirmation below</div>
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
                  placeholder="Confirm PIN"
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
                <div className="btn">Next</div>
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
          <div className="step4">
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
            <div className="title">Please provide your seed / private key (WIF) below</div>
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
            <div
              disabled={ !this.state.passphrase }
              onClick={ this.nextStep }
              className="group3">
              <div className="btn-inner">
                <div className="btn">Next</div>
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
            <div className="title">Please provide PIN and PIN confirmation below</div>
            <div className="group">
              <div className="edit restore-seed-verify">
                { this.state.isPrivKey ? 'You provided a private key' : 'You provided a seed' }
                <span onClick={ this.prevStep }>Wrong?</span>
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
                  placeholder="Confirm PIN"
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
                <div className="btn">Next</div>
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
    );
  }

  renderLoginInForm() {
    return (
      <div className="form-inner">
        { !this.state.activeView &&
          <div className="title">{ translate('LOGIN.SIGN_IN_TO_YOUR_ACC') }</div>
        }
        { this.state.activeView &&
          <div className="title">You are all set!<br />Try to login now.</div>
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
              <i className="fa fa-warning"></i> { this.state.wrongPinRetries === 0 ? translate('LOGIN.WRONG_PIN') : translate('LOGIN.WRONG_PIN_ATTEMPTS', 3 - this.state.wrongPinRetries) }
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
    );
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
                  <div className="title">Please choose an option below</div>
                  <div>
                    <div
                      onClick={ this.restoreWalletInit }
                      className="group3 scan-qr">
                      <div className="btn-inner">
                        <div className="btn">I want to restore wallet</div>
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
                        <div className="btn">I want to create new wallet</div>
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