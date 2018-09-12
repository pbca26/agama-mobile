import React from 'react';
import Spinner from './Spinner';

import translate from '../translate/translate';
import { secondsToString } from 'agama-wallet-lib/build/time';
import { formatValue } from 'agama-wallet-lib/build/utils';
import { Meteor } from 'meteor/meteor';

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
    )
    .then((sendPreflight) => {
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
      Number(this.props.balance.balanceSats) - 10000,
      null,
      true
    )
    .then((res) => {
      if (res &&
          res.msg === 'success') {
        this.setState({
          failed: false,
          success: true,
          spvPreflightSendInProgress: false,
        });

        Meteor.setTimeout(() => {
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
          <td className={ _utxo[i].amount >= 10 ? 'green bold' : '' }>
            { formatValue(_utxo[i].amount) }
          </td>
          <td className={ _utxo[i].interest > 0 ? 'green bold' : '' }>
            { formatValue(_utxo[i].interest) }
          </td>
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
        <div className="form claim-interest">
          <div className="margin-top-40">
            <p>
              <strong className="green">{ translate('CLAIM.REQ_TO_CLAIM_P1') }:</strong> { translate('CLAIM.REQ_TO_CLAIM_P2') }.
            </p>
          </div>
          <div className="text-center margin-top-35">
            <div className="group3 margin-bottom-30 claim-btn">
              <div
                onClick={ this.preflightClaim }
                className="btn-inner">
                <div className="btn">
                  <span>
                    { translate('CLAIM.CLAIM') } { formatValue(this.props.balance.interest) } KMD { translate('CLAIM.INTEREST_SM') }
                  </span>
                </div>
                <div className="group2">
                  <i className="fa fa-dollar"></i>
                </div>
              </div>
            </div>
          </div>
          { this.state.spvPreflightSendInProgress &&
            <div className="text-center">{ translate('SEND.SPV_VERIFYING') }...</div>
          }
          { this.state.spvVerificationWarning &&
            <div>
              <div className="margin-left-10">
                <strong className="warning">{ translate('CLAIM.WARNING') }:</strong> { translate('CLAIM.WARNING_SPV_P1') } { translate('SEND.WARNING_SPV_P2') }
              </div>
              <div className="margin-top-30 text-center">
                <button
                  className="btn btn-confirm"
                  onClick={ this.confirmClaimInterest }>
                  { translate('CLAIM.CONFIRM') }<i className="fa fa-check"></i>
                </button>
                <button
                  className="btn btn-cancel margin-left-60"
                  onClick={ this.cancelClaimInterest }>
                  { translate('CLAIM.CANCEL') }<i className="fa fa-close"></i>
                </button>
              </div>
            </div>
          }
          { this.state.failed &&
            <div className="padding-bottom-10 text-center red bold">
              { translate('CLAIM.FAILED_TO_CLAIM_INTEREST') }
            </div>
          }
          { this.state.success &&
            <div className="padding-bottom-10 text-center green bold">
              { translate('CLAIM.YOU_SUCCESFULLY_CLAIMED') } { formatValue(this.props.balance.interest) } KMD
            </div>
          }
          { !this.props.utxo &&
            <Spinner />
          }
          { this.props.utxo &&
            this.props.utxo.length &&
            this.props.utxo.length > 0 &&
            <div className="margin-top-40 margin-bottom-20 text-center">
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