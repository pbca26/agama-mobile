import React from 'react';
import jsQR from 'jsqr';
import {
  setLocalStorageVar,
  getLocalStorageVar,
  convertURIToImageData,
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
      passphrase: config.preload ? config.preload.seed : null,
      passphraseTooShort: false,
      pinOverride: config.preload ? config.preload.pin : null,
      pinOverrideTooShort: false,
      pinSet: false,
      qrScanError: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.updateInput = this.updateInput.bind(this);
    this.scanQR = this.scanQR.bind(this);
    this.save = this.save.bind(this);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      passphraseTooShort: false,
      pinOverrideTooShort: false,
      qrScanError: false,
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

  save() {
    if (!this.state.passphrase) {
      this.setState({
        passphraseTooShort: true,
      });
    } else {
      if (this.state.pinOverride &&
          this.state.pinOverride.length >= 6) {
        const _encryptedKey = encryptkey(this.state.pinOverride, this.state.passphrase);

        setLocalStorageVar('seed', { encryptedKey: _encryptedKey });
        this.setState({
          pinSet: true,
          pinOverrideTooShort: false,
          qrScanError: false,
          passphraseTooShort: false,
        });

        Meteor.setTimeout(() => {
          this.setState(this.defaultState);
          this.props.changeActiveSection('login');
        }, 500);
      } else {
        this.setState({
          pinOverrideTooShort: true,
          qrScanError: false,
          passphraseTooShort: false,
        });
      }
    }
  }

  render() {
    return (
      <div className="form pin-override">
        <div className="title padding-bottom-30 text-center fs14 sz350">
        { translate('PIN.PROVIDE_A_SEED') }
        </div>
        <div
          onClick={ this.scanQR }
          className="group3 margin-bottom-20">
          <div className="btn-inner">
            <div className="btn">{ translate('SEND.SCAN_QR') }</div>
            <div className="group2">
              <i className="fa fa-qrcode"></i>
            </div>
          </div>
        </div>
        { this.state.qrScanError &&
          <div className="error margin-top-5 margin-bottom-15 sz350">
            <i className="fa fa-warning"></i> { translate('SEND.QR_SCAN_ERR') }
          </div>
        }
        <div className="edit margin-bottom-10">
          <input
            type="password"
            name="passphrase"
            onChange={ this.updateInput }
            placeholder={ `${translate('LOGIN.ENTER_PASSPHRASE')} ${translate('LOGIN.OR_WIF')}` }
            value={ this.state.passphrase || '' } />
        </div>
        { this.state.passphraseTooShort &&
          <div className="error margin-top-15 sz350">
            <i className="fa fa-warning"></i> { translate('PIN.PROVIDE_A_PASSPHRASE') }
          </div>
        }
        <div className="margin-bottom-25 margin-top-40 edit">
          <input
            type="password"
            name="pinOverride"
            onChange={ this.updateInput }
            placeholder={ translate('LOGIN.ENTER_6_DIGIT_PIN') }
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
          className="group3 margin-top-40">
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