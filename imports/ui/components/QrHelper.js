import React from 'react';

import {
  getLocalStorageVar,
  setLocalStorageVar,
} from '../actions/utils';
import translate from '../translate/translate';
import {
  devlog,
  config,
} from '../actions/dev';

class QrHelper extends React.Component {
  constructor() {
    super();
    this.state = {
      skipQrHelper: false,
    };
    this.toggleSkipQrHelper = this.toggleSkipQrHelper.bind(this);
    this.close = this.close.bind(this);
  }

  close() {
    if (this.state.skipQrHelper) {
      setLocalStorageVar('qrhelper', true);
    }

    this.props.cb();
  }

  toggleSkipQrHelper() {
    this.setState({
      skipQrHelper: !this.state.skipQrHelper,
    });
  }

  render() {
    return (
      <div className="form qr-helper">
        <div className="qr-helper-inner">
          <div className="title">
            { translate('QR_HELPER.HOW_TO_USE') }
          </div>
          <div className="margin-top-35 margin-bottom-45">
            <div className="edit fs14">
              { translate('QR_HELPER.HOW_TO_USE_DESC_P1') }
              <div className="padding-top-10">{ translate('QR_HELPER.HOW_TO_USE_DESC_P2') }</div>
            </div>
          </div>
          <div className="switch-block margin-bottom-45 width-limit">
            <label className="switch">
              <input
                type="checkbox"
                value="on"
                checked={ this.state.skipQrHelper }
                readOnly />
              <div
                className="slider"
                onClick={ this.toggleSkipQrHelper }></div>
            </label>
            <div
              className="toggle-label pointer"
              onClick={ this.toggleSkipQrHelper }>
              { translate('QR_HELPER.DONT_DISPLAY_AGAIN') }
            </div>
          </div>
          <div
            onClick={ this.close }
            className="group3 margin-top-40">
            <div className="btn-inner">
              <div className="btn">{ translate('QR_HELPER.USE_QR_SCAN') }</div>
              <div className="group2">
                <i className="fa fa-qrcode"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default QrHelper;