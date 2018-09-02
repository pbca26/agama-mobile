import React from 'react';

import { getLocalStorageVar } from '../actions/utils';
import { decryptkey } from '../actions/seedCrypt';
import translate from '../translate/translate';
import QRCode from 'qrcode.react';
import {
  devlog,
  config,
} from '../actions/dev';

class Recovery extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: config.preload ? config.preload.seed : null,
      pin: config.preload ? config.preload.pin : null,
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
      wrongPin: false,
    });
  }

  decodeSeed() {
    const _encryptedKey = getLocalStorageVar('seed');
    const _decryptedKey = decryptkey(this.state.pin, _encryptedKey.encryptedKey);

    if (_decryptedKey) {
      this.setState({
        wrongPin: false,
        pin: null,
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
      <div className="form recovery">
        <div className="title margin-top-45 padding-bottom-35 text-center fs14">
        { translate('RECOVERY.PROVIDE_YOUR_PIN') }
        </div>
        <div className="margin-bottom-25">
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
            <div className="error margin-top-15 sz350">
              <i className="fa fa-warning"></i> { translate('LOGIN.WRONG_PIN') }
            </div>
          }
        </div>
        <div
          disabled={ !this.state.pin }
          onClick={ this.decodeSeed }
          className="group3 margin-top-40">
          <div className="btn-inner">
            <div className="btn">{ translate('RECOVERY.SHOW') }</div>
            <div className="group2">
              <i className="fa fa-eye"></i>
            </div>
          </div>
        </div>
        { this.state.passphrase &&
          <div className="margin-bottom-25 margin-top-50 decoded-seed">
            <div className="seed-gen-box margin-bottom-30">{ this.state.passphrase }</div>
            <div className="text-center">
              <QRCode
                value={ this.state.passphrase }
                size={ 320 } />
            </div>
          </div>
        }
      </div>
    );
  }
}

export default Recovery;