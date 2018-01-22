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
import { translate } from '../translate/translate';

class Pin extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: null,
      pinOverride: null,
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
    });
  }

  scanQR() {
    MeteorCamera.getPicture({
      quality: 100,
    }, (error, data) => {
      if (error) {
        this.setState({
          qrScanError: true,
        });
      } else {
        convertURIToImageData(data)
        .then((imageData) => {
          const decodedQR = jsQR.decodeQRFromImage(imageData.data, imageData.width, imageData.height);

          if (!decodedQR) {
            this.setState({
              qrScanError: true,
            });
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
    if (this.state.pinOverride.length >= 6) {
      const _encryptedKey = encryptkey(this.state.pinOverride, this.state.passphrase);

      setLocalStorageVar('seed', { encryptedKey: _encryptedKey });
      this.setState({
        pinSet: true,
        pinOverrideTooShort: false,
        qrScanError: false,
      });

      setTimeout(() => {
        this.setState(this.defaultState);
        this.props.changeActiveSection('login');
      }, 500);
    } else {
      this.setState({
        pinOverrideTooShort: true,
        qrScanError: false,
      });
    }
  }

  render() {
    return (
      <div className="col-sm-12">
        <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
          <div className="row">
            <h4 className="padding-bottom-15">Override PIN</h4>
            <div className="padding-bottom-20">
            Provide a seed and enter 6 digit PIN number in the form below.
            </div>
            <button
              className="btn btn-default btn-scan-qr margin-bottom-30"
              onClick={ this.scanQR }>
              <i className="fa fa-qrcode"></i>
              { translate('SEND.SCAN_QR') }
            </button>
            { this.state.qrScanError &&
              <div className="col-lg-12">
                <div className="error margin-top-15">
                  <i className="fa fa-warning"></i> { translate('SEND.QR_SCAN_ERR') }
                </div>
              </div>
            }
            <input
              type="password"
              className="form-control margin-bottom-10"
              name="passphrase"
              onChange={ this.updateInput }
              placeholder={ translate('LOGIN.ENTER_PASSPHRASE') + ' or WIF' }
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