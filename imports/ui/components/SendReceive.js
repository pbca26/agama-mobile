import React from 'react';
import { translate } from '../translate/translate';
import QRCode from 'qrcode.react';

class SendReceive extends React.Component {
  constructor() {
    super();
    this.state = {
      showQR: false,
    };
    this.toggleQR = this.toggleQR.bind(this);
    this.showClaimButton = this.showClaimButton.bind(this);
  }

  toggleQR() {
    this.setState({
      showQR: !this.state.showQR,
    });
  }

  showClaimButton() {
    if (this.props.coin === 'kmd' &&
        this.props.balance &&
        this.props.balance.interest &&
        this.props.balance.interest > 0) {
      return true;
    }
  }

  showSendButton() {
    if (this.props.balance &&
        this.props.balance.balance &&
        this.props.balance.balance > 0) {
      return true;
    }
  }

  render() {
    return (
      <div className={ 'margin-top-20 send-receive-block' + (this.showClaimButton() ? ' three-btn' : '') }>
        { this.showSendButton() &&
          <button
            type="button"
            onClick={ () => this.props.changeActiveSection('send') }
            className="btn btn-primary waves-effect waves-light margin-right-20">
            <i className="fa fa-send"></i> { translate('DASHBOARD.SEND') }
          </button>
        }
        <button
          type="button"
          className="btn btn-success waves-effect waves-light"
          onClick={ this.toggleQR }>
          <i className="fa fa-inbox"></i> { translate('DASHBOARD.RECEIVE') }
        </button>
        { this.state.showQR &&
          <div className="receive-qr">
            { this.props.address &&
              <div>
                <QRCode
                  value={ this.props.address }
                  size={ 198 } />
                <div className="text-center">{ this.props.address }</div>
              </div>
            }
          </div>
        }
        { this.showClaimButton() &&
          <button
            type="button"
            className="btn btn-info waves-effect waves-light margin-left-20 btn-claim"
            onClick={ this.props.toggleKMDInterest }>
            <i className="fa fa-dollar"></i> { translate('DASHBOARD.CLAIM') }
          </button>
        }
      </div>
    );
  }
}

export default SendReceive;