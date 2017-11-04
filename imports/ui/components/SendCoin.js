import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { translate } from '../translate/translate';

class SendCoin extends React.Component {
  constructor() {
    super();
    this.state = {
      display: false,
      sendAmount: 0.0001,
      sendTo: 'RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd',
      sendCurrentStep: 0,
      sendResult: null,
      spvVerificationWarning: false,
      spvPreflightSendInProgress: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.changeSendCoinStep = this.changeSendCoinStep.bind(this);
    this.updateInput = this.updateInput.bind(this);
  }

  componentWillReceiveProps(props) {
    if (props &&
        props.activeSection !== 'send') {
      // reset form state
      this.setState(this.defaultState);
    }
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  changeSendCoinStep(step, back) {
    if (back) {
      this.setState({
        sendCurrentStep: step,
      });
    } else {
      switch(step) {
        case 0:
          this.setState(this.defaultState);
          break;
        case 1:
          this.setState({
            spvPreflightSendInProgress: true,
            currentStep: step,
          });

          // spv pre tx push request
          this.props.sendtx(
            this.props.coin,
            this.state.sendTo,
            this.state.sendAmount * 100000000,
            true,
            false
          ).then((sendPreflight) => {
            if (sendPreflight &&
                sendPreflight.msg === 'success') {
              this.setState({
                spvVerificationWarning: !sendPreflight.result.utxoVerified,
                spvPreflightSendInProgress: false,
              });
            } else {
              this.setState({
                spvPreflightSendInProgress: false,
              });
            }
          });

          // todo validation
          this.setState({
            sendCurrentStep: 1,
          });
          break;
        case 2:
          this.setState({
            sendCurrentStep: 2,
          });

          this.props.sendtx(
            this.props.coin,
            this.state.sendTo,
            this.state.sendAmount * 100000000,
            null,
            true
          ).then((res) => {
            // console.warn('sendtx result');
            // console.warn(res);

            this.setState({
              sendResult: res,
            });
          });
          break;
      }
    }
  }

  sendFormRender() {
    return (
      <form
        className="extcoin-send-form"
        method="post"
        autoComplete="off">
        <div className="row">
          <div className="col-xlg-12 form-group form-material">
            <label className="control-label padding-bottom-10">{ translate('SEND.SEND_FROM') }</label>
            <div>{ this.props.address }</div>
          </div>
        </div>
        <div className="row">
          <div className="col-xlg-12 form-group form-material">
            <label
              className="control-label"
              htmlFor="kmdWalletSendTo">{ translate('SEND.SEND_TO') }</label>
            <input
              type="text"
              className="form-control"
              name="sendTo"
              onChange={ this.updateInput }
              value={ this.state.sendTo }
              id="kmdWalletSendTo"
              placeholder={ translate('SEND.ENTER_AN_ADDRESS') }
              autoComplete="off"
              required />
          </div>
          <div className="col-lg-12 form-group form-material">
            <label
              className="control-label"
              htmlFor="kmdWalletAmount">
              { translate('SEND.AMOUNT') }
            </label>
            <input
              type="text"
              className="form-control"
              name="sendAmount"
              value={ this.state.sendAmount !== 0 ? this.state.sendAmount : '' }
              onChange={ this.updateInput }
              id="kmdWalletAmount"
              placeholder="0.000"
              autoComplete="off" />
          </div>
          <div className="col-lg-12">
            <button
              type="button"
              className="btn btn-primary waves-effect waves-light pull-right"
              onClick={ () => this.changeSendCoinStep(1) }
              disabled={ !this.state.sendTo || !this.state.sendAmount }>
              { translate('SEND.SEND') } { this.state.sendAmount } { this.state.coin }
            </button>
          </div>
        </div>
      </form>
    );
  }

  render() {
    if (this.props.activeSection === 'send') {
      return (
        <div className="col-sm-12 send">
          <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12 steps-counter">
            <div className="steps row margin-top-10">
              <div className={ 'step col-md-4' + (this.state.sendCurrentStep === 0 ? ' current' : '') }>
                <span className="step-number">1</span>
              </div>
              <div className={ 'step col-md-4' + (this.state.sendCurrentStep === 1 ? ' current' : '') }>
                <span className="step-number">2</span>
              </div>
              <div className={ 'step col-md-4' + (this.state.sendCurrentStep === 2 ? ' current' : '') }>
                <span className="step-number">3</span>
              </div>
            </div>
          </div>

          <div className={ 'col-xlg-12 col-md-12 col-sm-12 col-xs-12 send-step' + (this.state.sendCurrentStep === 0 ? '' : ' hide') }>
            <div className="panel">
              <div className="panel-heading">
                <div className="margin-bottom-20">
                  <span className="step-title">{ translate('SEND.FILL_IN_DETAILS') }</span>
                </div>
              </div>
              <div className="panel-body container-fluid">
              { this.sendFormRender() }
              </div>
            </div>
          </div>

          <div className={ 'col-xlg-12 col-md-12 col-sm-12 col-xs-12 send-step' + (this.state.sendCurrentStep === 1 ? '' : ' hide') }>
            <div className="panel">
              <div className="panel-heading">
                <div className="row">
                  <div className="col-xs-12 margin-bottom-20">
                    <span className="step-title">{ translate('SEND.CONFIRM') }</span>
                  </div>
                  <div className="col-xs-12">
                    <strong>{ translate('SEND.TO') }</strong>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-xs-12">{ this.state.sendTo }</div>
                  <div className="col-lg-6 col-sm-6 col-xs-6 margin-top-10">
                    { this.state.sendAmount } { this.props.coin.toUpperCase() }
                  </div>
                </div>

                { this.state.spvPreflightSendInProgress &&
                  <div className="padding-top-20">{ translate('SEND.SPV_VERIFYING') }...</div>
                }
                { this.state.spvVerificationWarning &&
                  <div
                    className="padding-top-20"
                    style={{ fontSize: '15px' }}>
                    <i className="fa fa-warning warning"></i> <strong className="warning">{ translate('SEND.WARNING') }:</strong> { translate('SEND.WARNING_SPV_P1') }<br />
                    { translate('SEND.WARNING_SPV_P2') }
                  </div>
                }
                <div className="widget-body-footer">
                  <a
                    className="btn btn-default waves-effect waves-light"
                    onClick={ () => this.changeSendCoinStep(0, true) }>{ translate('SEND.BACK') }</a>
                  <div className="widget-actions pull-right">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={ () => this.changeSendCoinStep(2) }>
                        { translate('SEND.CONFIRM') }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={ 'col-xlg-12 col-md-12 col-sm-12 col-xs-12 send-step' + (this.state.sendCurrentStep === 2 ? '' : ' hide') }>
            <div className="panel">
              <div className="panel-heading">
                <h4 className="panel-title">
                  { translate('SEND.TX_RESULT') }
                </h4>
                <div>
                  { this.state.sendResult &&
                    this.state.sendResult.msg === 'success' &&
                    <table className="table table-hover table-striped margin-top-20">
                      <thead>
                        <tr>
                          <th>{ translate('SEND.KEY') }</th>
                          <th>{ translate('SEND.INFO') }</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                          { translate('SEND.RESULT') }
                          </td>
                          <td>
                            <span className="label label-success">{ translate('SEND.SUCCESS') }</span>
                          </td>
                        </tr>
                        <tr>
                          <td>Tx ID</td>
                          <td>{ this.state.sendResult && this.state.sendResult.result && this.state.sendResult.result.txid ? this.state.sendResult.result.txid : translate('SEND.PROCESSING_SM') }</td>
                        </tr>
                      </tbody>
                    </table>
                  }
                  { !this.state.sendResult &&
                    <div className="padding-top-20">{ translate('SEND.PROCESSING_TX') }</div>
                  }
                  { this.state.sendResult &&
                    this.state.sendResult.msg &&
                    this.state.sendResult.msg === 'error' &&
                    <div className="padding-top-20">
                      <div>
                        <strong>{ translate('SEND.ERROR') }</strong>
                      </div>
                      <div>{ this.state.sendResult.result }</div>
                    </div>
                  }
                </div>
                <div className="widget-body-footer">
                  <div className="widget-actions margin-bottom-15">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={ () => this.changeSendCoinStep(0) }>
                        { translate('SEND.MAKE_ANOTHER_TX') }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
}

export default SendCoin;