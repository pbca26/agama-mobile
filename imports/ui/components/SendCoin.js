import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { translate } from '../translate/translate';
import {
  isNumber,
  explorers,
  isAssetChain,
} from '../actions/utils';
import jsQR from 'jsqr';

class SendCoin extends React.Component {
  constructor() {
    super();
    this.state = {
      display: false,
      sendAmount: 0,
      sendTo: '',
      sendCurrentStep: 0,
      sendResult: null,
      spvVerificationWarning: false,
      spvPreflightSendInProgress: false,
      validNan: false,
      validTooMuch: false,
      validIncorrectAddress: false,
      qrScanError: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.changeSendCoinStep = this.changeSendCoinStep.bind(this);
    this.updateInput = this.updateInput.bind(this);
    this.scanQR = this.scanQR.bind(this);
    this.validate = this.validate.bind(this);
    this.openExternalURL = this.openExternalURL.bind(this);    
  }

  openExternalURL(url) {
    window.open(url, '_system');
  }

  scanQR() {
    const width = 480;
    const height = 640;

    MeteorCamera.getPicture({ quality: 100 }, (error, data) => {
      if (error) {
        console.warn(error);
        this.setState({
          qrScanError: true,
        });
      } else {
        const canvas = document.getElementById('qrScan');
        const img = new Image();
        img.src = data;
        
        /*console.warn(data);
        console.warn(img.clientWidth);
        console.warn(img.clientHeight);*/
  
        const canvasContext = canvas.getContext("2d");
        canvasContext.drawImage(img, 0, 0, Math.floor(width / 2.5), Math.floor(height / 3.5));
        const image = canvasContext.getImageData(0, 0, width, height);
  
        /*console.warn(data.length);
        console.warn(width * height * 4);*/
        const decodedQR = jsQR.decodeQRFromImage(image.data, image.width, image.height);
        // console.warn(decodedQR);

        if (!decodedQR) {
          this.setState({
            qrScanError: true,
          });
        } else {
          this.setState({
            qrScanError: false,
            sendTo: decodedQR,
          });
        }
      }
    });
  }

  componentWillReceiveProps(props) {
    if (props &&
        (props.activeSection !== 'send' || this.props.coin !== props.coin)) {
      // reset form state
      this.setState(this.defaultState);
    }
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  validate() {
    let _isFailed = false;

    if (this.state.sendAmount > this.props.balance.balance) {
      this.setState({
        validTooMuch: true,
      });
      _isFailed = true;
    }

    if (this.state.sendTo.length < 34 ||
        this.state.sendTo.length > 36) {
      this.setState({
        validIncorrectAddress: true,
      });
      _isFailed = true;
    }

    if (!isNumber(this.state.sendAmount)) {
      this.setState({
        validNan: true,
      });
      _isFailed = true;
    }

    return _isFailed;
  }

  changeSendCoinStep(step, back) {
    if (back) {
      this.setState({
        sendCurrentStep: step,
        validIncorrectAddress: false,
        validTooMuch: false,
        validNan: false,
      });
    } else {
      if (!this.validate()) {
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
              Math.abs(this.state.sendAmount * 100000000),
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
              Math.abs(this.state.sendAmount * 100000000),
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
  }

  sendFormRender() {
    return (
      <form
        className="extcoin-send-form"
        method="post"
        autoComplete="off">
        <div className="row">
          <div className="col-xlg-12 form-group form-material">
            <label className="control-label padding-bottom-10">{ translate('SEND.FROM') }</label>
            <div>{ this.props.address }</div>
          </div>
        </div>
        <div className="row">
          <div className="col-xlg-12 form-group form-material">
            <label
              className="control-label"
              htmlFor="kmdWalletSendTo">{ translate('SEND.TO') }</label>
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
          { this.state.validIncorrectAddress &&
            <div className="error margin-top-15">
              <i className="fa fa-warning"></i> { translate('SEND.ADDRESS_IS_INCORECT') }
            </div>
          }
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
            { this.state.validNan &&
              <div className="error margin-top-15">
                <i className="fa fa-warning"></i> { translate('SEND.NAN') }
              </div>
            }
            { this.state.validTooMuch &&
              <div className="error margin-top-15">
                <i className="fa fa-warning"></i> { translate('SEND.TOO_MUCH', `${this.props.balance.balance} ${this.props.coin.toUpperCase()}`) }
              </div>
            }
          </div>
          { this.state.qrScanError &&
            <div className="col-lg-12">
              <div className="error margin-top-15">
                <i className="fa fa-warning"></i> { translate('SEND.QR_SCAN_ERR') }
              </div>
            </div>
          }
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
          <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12 btn-back-block">
            <span
              className="btn-back"
              onClick={ () => this.props.changeActiveSection('dashboard') }>
              <i className="fa fa-arrow-left"></i> { translate('DASHBOARD.BACK') }
            </span>
          </div>
          <canvas id="qrScan" style={{ width: '640px', height: '480px', position: 'absolute', zIndex: '1' }}></canvas>
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
                  <span className="step-title margin-right-40">{ translate('SEND.FILL_IN_DETAILS') }</span>
                  <button
                    className="btn btn-default btn-scan-qr"
                    onClick={ this.scanQR }>
                    <i className="fa fa-qrcode"></i>
                    { translate('SEND.SCAN_QR') }
                  </button>
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
                          <td>
                          { translate('SEND.FROM') }
                          </td>
                          <td>
                            { this.props.address }
                          </td>
                        </tr>
                        <tr>
                          <td>
                          { translate('SEND.TO') }
                          </td>
                          <td>
                            { this.state.sendTo }
                          </td>
                        </tr>
                        <tr>
                          <td>
                          { translate('SEND.AMOUNT') }
                          </td>
                          <td>
                            { this.state.sendAmount } { this.props.coin.toUpperCase() }
                          </td>
                        </tr>
                        <tr>
                          <td>Tx ID</td>
                          <td>{ this.state.sendResult && this.state.sendResult.result && this.state.sendResult.result.txid ? this.state.sendResult.result.txid : translate('SEND.PROCESSING_SM') }</td>
                        </tr>
                        <tr>
                          <td></td>
                          <td>
                          { isAssetChain(this.props.coin) &&
                            this.state.sendResult &&
                            this.state.sendResult.result &&
                            this.state.sendResult.result.txid &&
                            <button
                              onClick={ () => this.openExternalURL(`${explorers[this.props.coin.toUpperCase()]}/tx/${this.state.sendResult.result.txid}`) }
                              className="margin-left-20 btn btn-sm white btn-dark waves-effect waves-light ext-link">
                              <i className="fa fa-external-link"></i>Explorer
                            </button>
                          }
                          </td>
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