import React from 'react';
import { translate } from '../translate/translate';
import {
  secondsToString,
  formatValue,
} from '../actions/utils';

class KMDInterest extends React.Component {
  constructor() {
    super();
    this.state = {
      spvVerificationWarning: false,
      spvPreflightSendInProgress: false,
      failed: false,
      success: false,
    };
    this.confirmClaimInterest = this.confirmClaimInterest.bind(this);
    this.cancelClaimInterest = this.cancelClaimInterest.bind(this);
    this.preflightClaim = this.preflightClaim.bind(this);
  }

  preflightClaim() {
    this.setState({
      spvPreflightSendInProgress: true,
    });

    this.props.sendtx(
      this.props.coin,
      this.props.address,
      this.props.balance.balanceSats,
      true,
      false
    ).then((sendPreflight) => {
      console.warn('claim preflight', sendPreflight);

      if (sendPreflight &&
          sendPreflight.msg === 'success') {
        this.setState({
          spvVerificationWarning: !sendPreflight.result.utxoVerified,
        });
        this.confirmClaimInterest();
      } else {
        this.setState({
          spvPreflightSendInProgress: false,
        });
      }
    });
  }

  confirmClaimInterest() {
    this.props.sendtx(
      this.props.coin,
      this.props.address,
      this.props.balance.balanceSats,
      null,
      true
    ).then((res) => {
      if (res &&
          res.msg === 'success') {
        this.setState({
          failed: false,
          success: true,
          spvPreflightSendInProgress: false,
        });

        setTimeout(() => {
          this.props.changeActiveSection('dashboard');
        }, 10000);
      } else {
        this.setState({
          failed: true,
          success: false,
          spvPreflightSendInProgress: false,
        });
      }
    });
  }

  cancelClaimInterest() {
    this.setState({
      spvVerificationWarning: false,
      spvPreflightSendInProgress: false,
      failed: false,
      success: false,
    });
  }

  renderUTXO() {
    const _utxo = this.props.utxo;
    let _items = [];

    for (let i = 0; i < _utxo.length; i++) {
      _items.push(
        <tr key={ `kmd-interest-utxo-${i}` }>
          <td className={ _utxo[i].amount >= 10 ? 'green bold' : '' }>{ formatValue(_utxo[i].amount) }</td>
          <td>{ formatValue(_utxo[i].interest) }</td>
          <td>
          { _utxo[i].locktime &&
            <i className="fa fa-check-circle green locktime-icon"></i>
          }
          { !_utxo[i].locktime &&
            <i className="fa fa-exclamation-circle red locktime-icon"></i>
          }
          </td>
        </tr>
      );
    }

    return _items;
  }

  render() {
    if (this.props.activeSection === 'claim') {
      return (
        <div className="claim-interest">
          <div>
            <span
              className="btn-back"
              onClick={ () => this.props.changeActiveSection('dashboard') }>
              <i className="fa fa-arrow-left"></i> { translate('DASHBOARD.BACK') }
            </span>
          </div>
          <div className="margin-top-20 margin-left-10">
            <p>
              <strong>{ translate('CLAIM.REQ_TO_CLAIM_P1') }:</strong> { translate('CLAIM.REQ_TO_CLAIM_P2') }.
            </p>
          </div>
          <div className="text-center margin-top-20">
            <button
              className="btn btn-success waves-effect waves-light claim-btn"
              onClick={ this.preflightClaim }>
              <i className="fa fa-dollar margin-right-5"></i>
              <span>{ translate('CLAIM.CLAIM') } { formatValue(this.props.balance.interest) } KMD { translate('CLAIM.INTEREST_SM') }</span>
            </button>
          </div>
          { this.state.spvPreflightSendInProgress &&
            <div className="padding-top-40 text-center">{ translate('SEND.SPV_VERIFYING') }...</div>
          }
          { this.state.spvVerificationWarning &&
            <div className="padding-top-40">
              <div className="margin-left-10">
                <strong className="color-warning">{ translate('CLAIM.WARNING') }:</strong> { translate('CLAIM.WARNING_SPV_P1') } { translate('SEND.WARNING_SPV_P2') }
              </div>
              <div className="margin-top-15 text-center">
                <button
                  className="btn btn-success"
                  onClick={ this.confirmClaimInterest }>
                    { translate('CLAIM.CONFIRM') }
                </button>
                <button
                  className="btn btn-primary margin-left-60"
                  onClick={ this.cancelClaimInterest }>
                    { translate('CLAIM.CANCEL') }
                </button>
              </div>
            </div>
          }
          { this.state.failed &&
            <div className="padding-top-40 text-center red bold">{ translate('CLAIM.FAILED_TO_CLAIM_INTEREST') }</div>
          }
          { this.state.success &&
            <div className="padding-top-40 text-center green bold">{ translate('CLAIM.YOU_SUCCESFULLY_CLAIMED') } { formatValue(this.props.balance.interest) } KMD</div>
          }
          { this.props.utxo &&
            this.props.utxo.length &&
            this.props.utxo.length > 0 &&
            <div className="margin-top-40 margin-left-10">
              <strong>UTXO { translate('CLAIM.LIST_SM') }</strong>
            </div>
          }
          { this.props.utxo &&
            this.props.utxo.length &&
            this.props.utxo.length > 0 &&
            <table className="table table-hover dataTable table-striped margin-top-10">
              <thead>
                <tr>
                  <th>{ translate('CLAIM.AMOUNT') }</th>
                  <th>{ translate('CLAIM.INTEREST') }</th>
                  <th>Locktime</th>
                </tr>
              </thead>
              <tbody>
              { this.renderUTXO() }
              </tbody>
            </table>
          }
        </div>
      );
    } else {
      return null;
    }
  }
}

export default KMDInterest;