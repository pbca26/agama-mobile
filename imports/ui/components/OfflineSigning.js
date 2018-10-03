// TODO

import React from 'react';
import translate from '../translate/translate';
import jsQR from 'jsqr';
import QRCode from 'qrcode.react';
import {
  getLocalStorageVar,
  convertURIToImageData,
} from '../actions/utils';
import { isKomodoCoin } from 'agama-wallet-lib/build/coin-helpers';
import {
  fromSats,
  toSats,
} from 'agama-wallet-lib/build/utils';
import {
  encryptkey,
  decryptkey,
} from '../actions/seedCrypt';
import {
  wifToWif,
  seedToWif,
} from 'agama-wallet-lib/build/keys';
import { devlog } from '../actions/dev';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';

import {
  buildSignedTxForks,
  buildSignedTx,
} from '../actions/createtx';

class OfflineSigning extends React.Component {
  constructor() {
    super();
    this.state = {
      pin: null,
      wrongPin: false,
      qrScanError: false,
      sendTo: null,
      sendFrom: null,
      amount: 0,
      change: 0,
      network: null,
      utxo: null,
      signedTx: null,
      failedToSign: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.scanQR = this.scanQR.bind(this);
    this.sign = this.sign.bind(this);
    this.updateInput = this.updateInput.bind(this);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  sign() {
    // decrypt
    const _encryptedKey = getLocalStorageVar('seed');
    
    if (_encryptedKey &&
        _encryptedKey.encryptedKey &&
        this.state.pin &&
        this.state.pin.length >= 6) {
      const _decryptedKey = decryptkey(this.state.pin, _encryptedKey.encryptedKey);

      if (_decryptedKey) {
        this.setState({
          wrongPin: false,
        });
        devlog(_decryptedKey);

        const network = this.state.network.toLowerCase();
        const wif = seedToWif(_decryptedKey, isKomodoCoin(network) || network === 'kmd' ? electrumJSNetworks.kmd : electrumJSNetworks[key.toLowerCase()], true).wif;
        let _rawtx;
        
        if (network === 'btg' ||
            network === 'bch') {
          _rawtx = buildSignedTxForks(
            this.state.sendTo,
            this.state.sendFrom,
            wif,
            network,
            this.state.utxo,
            this.state.change,
            this.state.amount
          );
        } else {
          _rawtx = buildSignedTx(
            this.state.sendTo,
            this.state.sendFrom,
            wif,
            network,
            this.state.utxo,
            this.state.change,
            this.state.amount
          );
        }

        console.warn(_rawtx);

        if (_rawtx) {
          this.setState({
            signedTx: `${network}:${_rawtx}`,
          });
        } else {
          this.setState({
            failedToSign: true,
          });
        }
      } else {
        this.setState({
          wrongPin: true,
        });
      }
    } else {
      this.setState({
        wrongPin: true,
      });
    }
  }

  scanQR() {
    const width = 1920;
    const height = 1080;

    this.setState(this.defaultState);

    MeteorCamera.getPicture({
      quality: 100,
      width,
      height,
    }, (error, data) => {
      if (error) {
        devlog('qrcam err', error);
        
        this.setState({
          qrScanError: error.errorClass && error.errorClass.error && error.errorClass.error !== 'cancel' ? true : false,          
        });
      } else {
        convertURIToImageData(data)
        .then((imageData) => {
          const decodedQR = jsQR.decodeQRFromImage(
            imageData.data,
            imageData.width,
            imageData.height
          );

          if (!decodedQR ||
              (decodedQR && decodedQR.indexOf('agtx') === -1)) {
            this.setState({
              qrScanError: true,
            });
          } else {
            const _tx = decodedQR.split(':');
            const _network = _tx[1];
            const _sendTo = _tx[2];
            const _changeTo = _tx[3];
            const _amount = parseInt(_tx[4]);
            const _change = parseInt(_tx[5]);

            devlog(decodedQR);
            devlog(_tx);

            const _utxo = decodedQR.split(':u:')[1].split('-');
            let _formattedUTXO = [];

            for (let i = 0; i < _utxo.length; i++) {
              const _utxoData = _utxo[i].split(':');
              _formattedUTXO.push({
                txid: _utxoData[0],
                value: parseInt(_utxoData[1]),
                vout: parseInt(_utxoData[2]),
              });
            }

            this.setState({
              qrScanError: false,
              sendTo: _sendTo,
              sendFrom: _changeTo,
              amount: _amount,
              change: _change,
              network: _network,
              utxo: _formattedUTXO,
            });
          }
        });
      }
    });
  }

  render() {
    return (
      <div className="margin-top-20 margin-left-10">
        <h4 className="padding-bottom-10">{ translate('OFFLINE.OFFLINE_TX_SIG') }</h4>
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
        { this.state.sendFrom &&
          <div>
            <div className="margin-bottom-20">
              <div>
                <div>
                  <strong>{ translate('OFFLINE.SEND_FROM') }</strong>
                </div>
                { this.state.sendFrom }
              </div>
              <div className="margin-top-10">
                <div>
                  <strong>{ translate('OFFLINE.SEND_TO') }</strong>
                </div>
                { this.state.sendTo }
              </div>
              <div className="margin-top-10">
                <div>
                  <strong>{ translate('OFFLINE.AMOUNT') }</strong>
                </div>
                { fromSats(this.state.amount) } { this.state.network }
              </div>
            </div>

            <hr />

            <h5 className="margin-bottom-25">{ translate('OFFLINE.TX_PIN_CONFIRM') }</h5>
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
              onClick={ this.sign }>
              <span className="ladda-label">
              { translate('OFFLINE.CONFIRM') }
              </span>
            </button>

            { this.state.failedToSign &&
              <div className="error margin-bottom-25 margin-top-20">
                <i className="fa fa-warning"></i> { translate('OFFLINE.TX_SIG_FAIL') }
              </div>
            }

            { this.state.signedTx &&
              <div className="margin-top-50 margin-bottom-50">
                <hr />
                <QRCode
                  value={ this.state.signedTx }
                  size={ 320 } />
              </div>
            }
          </div>
        }
      </div>
    );
  }
}

export default OfflineSigning;