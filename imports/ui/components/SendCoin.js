import React from 'react';
import translate from '../translate/translate';
import {
  convertURIToImageData,
  getLocalStorageVar,
  assetsPath,
} from '../actions/utils';
import { decryptkey } from '../actions/seedCrypt';
import jsQR from 'jsqr';
import {
  devlog,
  config,
} from '../actions/dev';
import {
  fromSats,
  toSats,
  formatValue,
  isNumber,
  parseBitcoinURL,
} from 'agama-wallet-lib/build/utils';
import {
  explorerList,
  isKomodoCoin,
} from 'agama-wallet-lib/build/coin-helpers';
import { addressVersionCheck } from 'agama-wallet-lib/build/keys';
import electrumServers from 'agama-wallet-lib/build/electrum-servers';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import { Meteor } from 'meteor/meteor';
import { getAddress } from 'ethers/utils/address';

class SendCoin extends React.Component {
  constructor() {
    super();
    this.state = {
      sendAmount: config.preload ? config.preload.send.amount : 0,
      sendTo: config.preload ? config.preload.send.address : '',
      sendCurrentStep: 0,
      sendResult: {},
      spvVerificationWarning: false,
      spvPreflightSendInProgress: false,
      spvPreflightResult: null,
      validNan: false,
      validTooMuch: false,
      validIncorrectAddress: false,
      qrScanError: false,
      wrongPin: false,
      pin: config.preload ? config.preload.pin : '',
      processing: false,
      btcFee: 'halfHourFee',
      fee: null,
      // eth
      ethPreflightSendInProgress: false,
      ethPreflightResult: null,
      ethFee: 'average',
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.changeSendCoinStep = this.changeSendCoinStep.bind(this);
    this.updateInput = this.updateInput.bind(this);
    this.scanQR = this.scanQR.bind(this);
    this.validate = this.validate.bind(this);
    this.decodeSeed = this.decodeSeed.bind(this);
    this.openExternalURL = this.openExternalURL.bind(this);
    this.setSendAmountAll = this.setSendAmountAll.bind(this);
  }

  setSendAmountAll() {
    const _coin = this.props.coin.split('|')[0];
    const _balance = this.props.balance;

    if (this.props.coin.indexOf('|spv') > -1) {
      const _amount = Number(_balance.balance + _balance.unconfirmed).toFixed(8);

      this.setState({
        sendAmount: Number(_amount) > 0 ? _amount : this.state.sendAmount,
      });
    } else if (this.props.coin.indexOf('|eth') > -1) {
      this.setState({
        sendAmount: Number(_balance.balance),
      });
    }
  }

  decodeSeed() {
    const _encryptedKey = getLocalStorageVar('seed');
    const _decryptedKey = decryptkey(this.state.pin, _encryptedKey.encryptedKey);

    if (_decryptedKey) {
      this.setState({
        wrongPin: false,
      });

      return true;
    } else {
      this.setState({
        wrongPin: true,
      });

      return false;
    }
  }

  openExternalURL() {
    const _name = this.props.coin.split('|')[0];
    let url;
    
    if (this.props.coin.indexOf('|eth') > -1) {
      if (_name === 'eth' ||
          _name === 'eth_ropsten') {
        url = `${explorerList[_name.toUpperCase()]}${this.state.sendResult.result.txid}`;
      } else {
        url = `${explorerList.ETH}${this.state.sendResult.result.txid}`;
      }
    } else if (this.props.coin.indexOf('|spv') > -1) {
      url = explorerList[_name.toUpperCase()].split('/').length - 1 > 2 ? `${explorerList[_name.toUpperCase()]}${this.state.sendResult.result.txid}` : `${explorerList[_name.toUpperCase()]}/tx/${this.state.sendResult.result.txid}`;
    }

    window.open(url, '_system');
  }

  scanQR() {
    const width = 480;
    const height = 640;

    MeteorCamera.getPicture({ quality: 100 }, (error, data) => {      
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
          devlog(imageData.data);
          devlog(imageData.height);
          devlog(imageData.width);

          const decodedQR = jsQR.decodeQRFromImage(
            imageData.data,
            imageData.width,
            imageData.height
          );

          devlog(decodedQR);

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
            let _newState = {
              qrScanError: false,
            };

            try {
              const recObj = JSON.parse(decodedQR);
        
              if (recObj &&
                  typeof recObj === 'object') {
                if (recObj.amount) {
                  _newState.sendAmount = recObj.amount;
                }
                if (recObj.address) {
                  _newState.sendTo = recObj.address;
                }
              }
            } catch (e) {
              if (decodedQR.indexOf(':') > -1) {
                const _parsedBitcoinURL = parseBitcoinURL(decodedQR);
                
                if (_parsedBitcoinURL.amount) {
                  _newState.sendAmount = _parsedBitcoinURL.amount;
                }
                if (_parsedBitcoinURL.address) {
                  _newState.sendTo = _parsedBitcoinURL.address;
                }
              } else {
                _newState.sendTo = decodedQR;
              }
            }

            this.setState(_newState);
          }
        });
      }
    });
  }

  componentWillReceiveProps(props) {
    if (props &&
        !this.props.init &&
        (props.activeSection !== 'send' || this.props.coin !== props.coin)) {
      // reset form state
      this.setState(this.defaultState);
    }
  }

  componentWillMount() {
    if (this.props.init) {
      this.setState({
        sendTo: this.props.init.pub,
        sendAmount: this.props.init.amount,
      });

      if (this.props.coin === 'btc|spv') {
        this.props.getBtcFees();
        this.setState({
          btcFee: 'halfHourFee',
        });
      } else if (this.props.coin.indexOf('|eth') > -1) {
        this.props.getEthGasPrice();
        this.setState({
          ethFee: 'average',
        });
      }
    }
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      spvVerificationWarning: false,
      spvPreflightSendInProgress: false,
      ethVerificationWarning: false,
      ethPreflightSendInProgress: false,
      validNan: false,
      validTooMuch: false,
      validIncorrectAddress: false,
      qrScanError: false,
      wrongPin: false,
      wrongAddress: false,
      fee: null,
    });
  }

  validate() {
    const _name = this.props.coin.split('|')[0];
    const _mode = this.props.coin.split('|')[1];
    const storageSettings = getLocalStorageVar('settings');
    let _isFailed = false;
    let validTooMuch = false;
    let validIncorrectAddress = false;
    let validNan = false;

    if (this.state.sendAmount > this.props.balance.balance) {
      validTooMuch = true;
      _isFailed = true;
    }

    if (_mode === 'spv') {
      const _network = electrumJSNetworks[_name.toLowerCase()] || electrumJSNetworks[isKomodoCoin(_name) ? 'kmd' : _name];

      if (!addressVersionCheck(_network, this.state.sendTo) ||
          addressVersionCheck(_network, this.state.sendTo) === 'Invalid pub address') {
        validIncorrectAddress = true;
        _isFailed = true;
      }
    } else if (_mode === 'eth') {
      try {
        getAddress(this.state.sendTo);
      } catch (e) {
        validIncorrectAddress = true;
        _isFailed = true;
      }
    }

    if (!isNumber(this.state.sendAmount)) {
      validNan = true;
      _isFailed = true;
    }

    if (this.state.sendCurrentStep === 1 &&
        ((storageSettings && storageSettings.requirePin) ||
        (config.preload && config.enablePinConfirm)) &&
        !this.decodeSeed()) {
      _isFailed = true;
    }

    this.setState({
      validTooMuch,
      validIncorrectAddress,
      validNan,
    });

    return _isFailed;
  }

  changeSendCoinStep(step, back) {
    if (step === 0) {

      if (this.props.coin === 'btc|spv') {
        this.props.getBtcFees();
        this.setState({
          btcFee: 'halfHourFee',
        });
      } else if (this.props.coin.indexOf('|eth') > -1) {
        this.props.getEthGasPrice();
        this.setState({
          ethFee: 'average',
        });
      }
    }

    if (back) {
      this.setState({
        sendCurrentStep: step,
        validIncorrectAddress: false,
        validTooMuch: false,
        validNan: false,
        pin: '',
        wrongPin: false,
        fee: null,
      });
    } else {
      if (!this.validate()) {
        switch(step) {
          case 0:
            this.setState(this.defaultState);
            break;
          case 1:
            this.setState({
              spvPreflightSendInProgress: this.props.coin.indexOf('|spv') > -1 ? true : false,
              ethPreflightSendInProgress: this.props.coin.indexOf('|eth') > -1 ? true : false,
              currentStep: step,
            });

            if (this.props.coin.indexOf('|spv') > -1) {
              // spv pre tx push request
              this.props.sendtx(
                this.props.coin,
                this.state.sendTo,
                Math.abs(toSats(this.state.sendAmount)),
                true,
                false,
                this.props.coin === 'btc' ? this.props.btcFees[this.state.btcFee] : null
              )
              .then((sendPreflight) => {
                if (sendPreflight &&
                    sendPreflight.msg === 'success') {
                  if (fromSats(sendPreflight.result.value) > this.state.sendAmount) {
                    sendPreflight.result.value = sendPreflight.result.inputValue;
                  }

                  this.setState({
                    spvVerificationWarning: !sendPreflight.result.utxoVerified,
                    spvPreflightSendInProgress: false,
                    spvPreflightResult: sendPreflight,
                  });
                } else {
                  this.setState({
                    spvPreflightSendInProgress: false,
                    spvPreflightResult: sendPreflight,
                  });
                }
              });
            } else if (this.props.coin.indexOf('|eth') > -1) {
              // eth pre tx push request
              // network, dest, amount, gasPrice, push
              this.props.sendtxEth(
                this.props.coin,
                this.state.sendTo,
                Math.abs(this.state.sendAmount),
                this.props.ethGasPrice[this.state.ethFee],
                false
              )
              .then((sendPreflight) => {
                if (sendPreflight &&
                    sendPreflight.msg === 'success') {
                  this.setState({
                    ethPreflightSendInProgress: false,
                    ethPreflightResult: sendPreflight,
                  });
                } else {
                  this.setState({
                    ethPreflightSendInProgress: false,
                    ethPreflightResult: sendPreflight,
                  });
                }
              });
            }

            this.setState({
              sendCurrentStep: 1,
            });
            break;
          case 2:
            this.setState({
              sendCurrentStep: 2,
              processing: true,
            });

            if (this.props.coin.indexOf('|spv') > -1) {
              this.props.sendtx(
                this.props.coin,
                this.state.sendTo,
                Math.abs(toSats(this.state.sendAmount)),
                null,
                true,
                this.props.coin === 'btc' ? this.props.btcFees[this.state.btcFee] : null
              )
              .then((res) => {
                devlog('spv sendtx result');
                devlog(res);

                this.setState({
                  sendResult: res,
                  processing: false,
                });

                if (this.props.init) {
                  this.props.cb(res, this.props.coin);
                }
              });
            } else if (this.props.coin.indexOf('|eth') > -1) {
              this.props.sendtxEth(
                this.props.coin,
                this.state.sendTo,
                Math.abs(this.state.sendAmount),
                this.props.ethGasPrice[this.state.ethFee],
                true
              )
              .then((res) => {
                devlog('eth sendtx result');
                devlog(res);

                this.setState({
                  sendResult: res,
                  processing: false,
                });
              });
            }
            break;
        }
      }
    }
  }

  sendFormRender() {
    const _name = this.props.coin.split('|')[0];

    return (
      <form
        method="post"
        autoComplete="off">
        <div className="edit">
          <label className="control-label padding-bottom-10">
            { translate('SEND.FROM') }
            <strong className="padding-left-5">
              [ <span className="success">
                { typeof this.props.balance === 'string' && this.props.balance === 'loading' ? '...' : formatValue(this.props.balance.balance) } { _name.toUpperCase() }
                </span> ]
            </strong>
          </label>
          <div className="shade wb--all">{ this.props.address }</div>
        </div>
        <div className="row">
          <div className="edit">
            <label
              className="control-label"
              htmlFor="kmdWalletSendTo">
              { translate('SEND.TO') }
            </label>
            <input
              type="text"
              className="form-control"
              name="sendTo"
              onChange={ this.updateInput }
              value={ this.state.sendTo }
              disabled={ this.props.init }
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
          <div className="edit">
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
              disabled={ this.props.init }
              onChange={ this.updateInput }
              id="kmdWalletAmount"
              placeholder="0.000"
              autoComplete="off" />
            { this.state.validNan &&
              <div className="error margin-top-15">
                <i className="fa fa-warning"></i> { translate('SEND.NAN') }
              </div>
            }
            { !this.props.init &&
              <div
                onClick={ this.setSendAmountAll }
                className="send-use-all-btn">Use all</div>
            }
            { this.state.validTooMuch &&
              <div className="error margin-top-15">
                <i className="fa fa-warning padding-right-5"></i>
                { translate('SEND.TOO_MUCH', `${this.props.balance.balance} ${_name.toUpperCase()}`) }
              </div>
            }
          </div>
          { this.props.coin === 'btc|spv' &&
            this.props.btcFees &&
            this.props.btcFee !== 'error' &&
            <div className="edit">
              <label className="control-label">{ translate('SEND.FEE') }</label>
              <select
                className="margin-top-15 margin-bottom-10"
                name="btcFee"
                value={ this.state.btcFee }
                onChange={ (event) => this.updateInput(event) }>
                <option value="fastestFee">{ translate('SEND.BTC_FEE_FAST') }</option>
                <option value="halfHourFee">{ translate('SEND.BTC_FEE_AVG') }</option>
                <option value="hourFee">{ translate('SEND.BTC_FEE_SLOW') }</option>
              </select>
            </div>
          }
          { this.props.coin.indexOf('|eth') > -1 &&
            this.props.ethGasPrice &&
            this.props.ethGasPrice !== 'error' &&
            <div className="edit">
              <label className="control-label">{ translate('SEND.FEE') }</label>
              <select
                className="margin-top-15 margin-bottom-10"
                name="ethFee"
                value={ this.state.ethFee }
                onChange={ (event) => this.updateInput(event) }>
                <option value="fast">{ translate('SEND.ETH_FEE_FAST') }</option>
                <option value="average">{ translate('SEND.ETH_FEE_AVG') }</option>
                <option value="slow">{ translate('SEND.ETH_FEE_SLOW') }</option>
              </select>
            </div>
          }
          { this.state.qrScanError &&
            <div className="error margin-top-15 text-center">
              <i className="fa fa-warning"></i> { translate('SEND.QR_SCAN_ERR') }
            </div>
          }
          { this.props.coin === 'btc|spv' &&
            !this.props.btcFees &&
            <div className="margin-top-15 text-center">{ translate('SEND.BTC_FEES_FETCHING') }</div>
          }
          { this.props.coin === 'btc|spv' &&
            this.props.btcFees &&
            this.props.btcFees === 'error' &&
            <div className="error margin-top-15 text-center">{ translate('SEND.BTC_FEES_FETCHING_FAILED') }</div>
          }
          { this.props.coin.indexOf('|eth') > -1 &&
            !this.props.ethGasPrice &&
            <div className="margin-top-15 text-center">{ translate('SEND.ETH_FEES_FETCHING') }</div>
          }
          { this.props.coin.indexOf('|eth') > -1 &&
            this.props.ethGasPrice &&
            this.props.ethGasPrice === 'error' &&
            <div className="error margin-top-15 text-center">{ translate('SEND.ETH_FEES_FETCHING_FAILED') }</div>
          }
          <div>
            <div
              disabled={
                !this.state.sendTo ||
                !this.state.sendAmount ||
                (this.props.coin === 'btc|spv' && (!this.props.btcFees || this.props.btcFees === 'error')) ||
                (this.props.coin.indexOf('|eth') > -1 && (!this.props.ethGasPrice || this.props.ethGasPrice === 'error'))
              }
              onClick={ () => this.changeSendCoinStep(1) }
              className="group3 margin-top-50">
              <div className="btn-inner">
                <div className="btn">{ translate('SEND.SEND') }</div>
                <div className="group2">
                  <div className="rectangle8copy"></div>
                  <img
                    className="path6"
                    src={ `${assetsPath.login}/reset-password-path-6.png` } />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    );
  }

  render() {
    if (this.props.activeSection === 'send' ||
        this.props.init) {
      const _name = this.props.coin.split('|')[0];
      const _mode = this.props.coin.split('|')[1];
  
      return (
        <div className="form send">
          <div className="steps margin-top-10">
            <div className={ 'step' + (this.state.sendCurrentStep === 0 ? ' current' : '') }></div>
            <div className={ 'step' + (this.state.sendCurrentStep === 1 ? ' current' : '') }></div>
            <div className={ 'step' + (this.state.sendCurrentStep === 2 ? ' current' : '') }></div>
          </div>

          { this.state.sendCurrentStep === 0 &&
            <div className="send-step">
              <div className="margin-bottom-40">
                <div className="step-title">{ translate('SEND.FILL_IN_DETAILS') }</div>
                { !this.props.init &&
                  <div
                    onClick={ this.scanQR }
                    className="scan-qr">
                    <i className="fa fa-qrcode"></i>
                  </div>
                }
              </div>
              { this.sendFormRender() }
            </div>
          }

          { this.state.sendCurrentStep === 1 &&
            <div className="send-step">
              <div className="send-step2">
                <div className="margin-bottom-35">
                  <div className="step-title">{ translate('SEND.CONFIRM') }</div>
                </div>
                <div className="margin-top-5 edit">
                  <strong>{ translate('SEND.TO') }</strong>
                </div>
                <div className="edit">
                  <span className="shade">{ this.state.sendTo }</span>
                </div>
                <div className="padding-top-15 edit">
                  <strong>{ translate('SEND.AMOUNT') }</strong>
                </div>
                <div className="edit">
                  <span className="shade">
                  { this.state.sendAmount } { _name.toUpperCase() }
                  </span>
                </div>
                { this.state.spvPreflightResult &&
                  this.state.spvPreflightResult.msg === 'success' &&
                  <div>
                    <div className="padding-top-15 edit">
                      <strong>{ translate('SEND.FEE') }</strong>
                    </div>
                    <div className="edit">
                      <span className="shade">
                      { Number(fromSats(this.state.spvPreflightResult.result.fee)) } { _name.toUpperCase() }
                      </span>
                    </div>
                    { this.state.spvPreflightResult.result.estimatedFee < 0 &&
                      _name.toLowerCase() === 'kmd' &&
                      <div>
                        <div className="padding-top-15 edit">
                          <strong>{ translate('SEND.KMD_INTEREST') }</strong>
                        </div>
                        <div className="edit">
                          <span className="shade">
                          { Math.abs(formatValue(fromSats(this.state.spvPreflightResult.result.estimatedFee))) } { translate('SEND.TO_SM') } { this.props.address }
                          </span>
                        </div>
                      </div>
                    }
                    { this.state.spvPreflightResult.result.estimatedFee > 0 &&
                      _name.toLowerCase() === 'kmd' &&
                      <div>
                        <div className="padding-top-15 edit">
                          <strong>{ translate('SEND.KMD_INTEREST') }</strong>
                        </div>
                        <div className="edit">
                          <span className="shade">
                          { Math.abs(formatValue(fromSats(this.state.spvPreflightResult.result.totalInterest))) } { translate('SEND.TO_SM') } { this.props.address }
                          </span>
                        </div>
                      </div>
                    }
                    { this.state.spvPreflightResult.result.change >= 0 &&
                      <div>
                        <div className="padding-top-15 edit">
                          <strong>{ translate('SEND.TOTAL') }</strong>
                        </div>
                        <div className="edit">
                          <span className="shade">
                          { formatValue(Number(fromSats(this.state.spvPreflightResult.result.value)) + Number(fromSats(fromSats(this.state.sendAmount) === this.state.spvPreflightResult.result.balance ? -1 * this.state.spvPreflightResult.result.fee : this.state.spvPreflightResult.result.fee))) } { _name.toUpperCase() }
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                }
                { this.state.ethPreflightResult &&
                  this.state.ethPreflightResult.msg === 'success' &&
                  <div>
                    <div className="padding-top-15 edit">
                      <strong>{ translate('SEND.FEE') }</strong>
                    </div>
                    <div className="edit">
                      <span className="shade">
                      { Number(this.state.ethPreflightResult.result.fee) } { _name === 'eth' || _name === 'eth_ropsten' ? _name.toUpperCase() : 'ETH' }
                      </span>
                    </div>
                    { _mode === 'eth' &&
                      _name !== 'eth' &&
                      _name !== 'eth_ropsten' &&
                      this.state.ethPreflightResult &&
                      this.state.ethPreflightResult.msg &&
                      this.state.ethPreflightResult.msg === 'error' &&
                      <div className="send-result">
                        <div className="edit error">
                        { translate('SEND.ERROR') } <i className="fa fa-close"></i>
                        </div>
                        <div className="edit padding-bottom-15">
                          <div className="shade">{ typeof this.state.sendResult.result === 'object' ? JSON.stringify(this.state.sendResult.result) : this.state.sendResult.result }</div>
                        </div>
                      </div>
                    }
                    { _mode === 'eth' &&
                      _name !== 'eth' &&
                      _name !== 'eth_ropsten' &&
                      this.state.ethPreflightResult &&
                      this.state.ethPreflightResult.msg &&
                      this.state.ethPreflightResult.msg === 'success' &&
                      <div>
                        { this.state.ethPreflightResult.result.notEnoughBalance &&
                          <div className="send-result">
                            <div className="edit error">
                            { translate('SEND.ERROR') } <i className="fa fa-close"></i>
                            </div>
                            <div className="edit padding-bottom-15">
                              <div className="shade">{ translate('SEND.ERR_NOT_ENOUGH_ETH') }</div>
                            </div>
                          </div>
                        }
                        <div>
                          <div className="padding-top-15 edit">
                            <strong>{ translate('SEND.CURRENT_BALANCE') }</strong>
                          </div>
                          <div className="edit">
                            <span className="shade padding-bottom-15">
                            { this.state.ethPreflightResult.result.maxBalance.balance }
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="padding-top-15 edit">
                            <strong>{ translate('SEND.BALANCE_AFTER_FEE') }</strong>
                          </div>
                          <div className="edit">
                            <span className="shade padding-bottom-15">
                            { this.state.ethPreflightResult.result.balanceAferFee }
                            </span>
                          </div>
                        </div>
                      </div>
                    }
                    { this.state.ethPreflightResult.result.adjustedAmount &&
                      <div>
                        <div className="padding-top-15 edit">
                          <strong>{ translate('SEND.TOTAL') }</strong>
                        </div>
                        <div className="edit">
                          <span className="shade">
                          { formatValue(Number(this.state.ethPreflightResult.result.adjustedAmount) + Number(this.state.ethPreflightResult.result.fee)) } { _name.toUpperCase() }
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
              { this.state.spvPreflightResult &&
                this.state.spvPreflightResult.msg === 'success' &&
                this.state.spvPreflightResult.result.hasOwnProperty('dpowSecured') &&
                this.state.spvPreflightResult.result.dpowSecured &&
                <div className="padding-top-20 fs-15 edit send-dpow-flag">
                  <i className="fa fa-shield success"></i> { translate('SEND.DPOW_SECURED') }
                </div>
              }
              { ((getLocalStorageVar('settings') && getLocalStorageVar('settings').requirePin) ||
                (config.preload && config.enablePinConfirm)) &&
                <div>
                  <div className="edit pin-confirm">
                    <input
                      type="password"
                      className="form-control"
                      name="pin"
                      value={ this.state.pin }
                      onChange={ this.updateInput }
                      placeholder={ translate('SEND.ENTER_YOUR_PIN') }
                      autoComplete="off" />
                  </div>
                </div>
              }
              { this.state.wrongPin &&
                <div className="error margin-top-15 margin-bottom-25 fs14">
                  <i className="fa fa-warning"></i> { translate('LOGIN.WRONG_PIN') }
                </div>
              }
              { (this.state.spvPreflightSendInProgress || this.state.ethPreflightSendInProgress) &&
                <div className="padding-top-20 fs14 text-center">{ translate('SEND.SPV_VERIFYING') }...</div>
              }
              { this.state.spvVerificationWarning &&
                <div className="padding-top-20 fs14 lh25 padding-left-15">
                  <i className="fa fa-warning warning"></i> <strong className="warning">{ translate('SEND.WARNING') }:</strong> { translate('SEND.WARNING_SPV_P1') }
                  <div>{ translate('SEND.WARNING_SPV_P2') }</div>
                </div>
              }
              { this.state.spvPreflightResult &&
                this.state.spvPreflightResult.msg === 'success' &&
                this.state.spvPreflightResult.result.hasOwnProperty('dpowSecured') &&
                !this.state.spvPreflightResult.result.dpowSecured &&
                <div className="padding-top-20 fs-15 edit">
                  <strong>{ translate('SEND.NOTICE') }:</strong> { translate('SEND.DPOW_UNSECURE') }.
                </div>
              }
              <div className="widget-body-footer">
                <div className="group3 margin-top-50">
                  <div
                    onClick={ () => this.changeSendCoinStep(0, true) }
                    className="btn-inner pull-left">
                    <div className="btn">{ translate('SEND.BACK') }</div>
                    <div className="group2">
                      <img
                        className="path6"
                        src={ `${assetsPath.menu}/trends-combined-shape.png` } />
                    </div>
                  </div>
                  <div
                    onClick={ () => this.changeSendCoinStep(2) }
                    className="btn-inner pull-right">
                    <div className="btn">{ translate('SEND.CONFIRM') }</div>
                    <div className="group2">
                    <div className="rectangle8copy"></div>
                      <img
                        className="path6"
                        src={ `${assetsPath.login}/reset-password-path-6.png` } />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
          { this.state.sendCurrentStep === 2 &&
            <div className="send-step">
              <div className="step-title">{ translate('SEND.TX_RESULT') }</div>
              <div className="margin-top-35">
                { this.state.sendResult &&
                  this.state.sendResult.msg === 'success' &&
                  <div className="send-result">
                    <div className="edit success">
                    { translate('SEND.SUCCESS') } <i className="fa fa-check"></i>
                    </div>
                    <div className="edit">
                      { translate('SEND.FROM') }
                      <div className="shade margin-top-5 wb--all">{ this.props.address }</div>
                    </div>
                    <div className="edit">
                      { translate('SEND.TO') }
                      <div className="shade margin-top-5 wb--all">{ this.state.sendTo }</div>
                    </div>
                    <div className="edit">
                      { translate('SEND.AMOUNT') }
                      <div className="shade margin-top-5">{ this.state.sendAmount } { _name.toUpperCase() }</div>
                    </div>
                    <div className="edit">
                      { translate('SEND.TXID') }
                      <div className="shade margin-top-5 wb--all">
                      {
                        this.state.sendResult &&
                        this.state.sendResult.result &&
                        this.state.sendResult.result.txid ? this.state.sendResult.result.txid : translate('SEND.PROCESSING_SM')
                      }
                      </div>
                    </div>
                    { this.state.sendResult &&
                      this.state.sendResult.result &&
                      this.state.sendResult.result.txid &&
                      <div className="edit">
                        <span onClick={ this.openExternalURL }>
                        { translate('SEND.OPEN_IN_EXPLORER') }<i className="fa fa-external-link margin-left-10"></i>
                        </span>
                      </div>
                    }
                  </div>
                }
                { (!this.state.sendResult || this.state.processing) &&
                  <div className="send-result">
                    <div className="edit">
                    { translate('SEND.PROCESSING_TX') }
                    </div>
                  </div>
                }
                { this.state.sendResult &&
                  this.state.sendResult.msg &&
                  this.state.sendResult.msg === 'error' &&
                  _mode === 'spv' &&
                  <div className="send-result">
                    <div className="edit error">
                    { translate('SEND.ERROR') } <i className="fa fa-close"></i>
                    </div>
                    <div className="edit padding-bottom-15">
                      <div className="shade">{ this.state.sendResult.result }</div>
                      { this.state.sendResult.raw &&
                        this.state.sendResult.raw.txid &&
                        <div className="shade">{ this.state.sendResult.raw.txid.replace(/\[.*\]/, '') }</div>
                      }
                    </div>
                  </div>
                }
              </div>
              { !this.props.init &&
                <div
                  disabled={
                    !this.state.sendResult ||
                    this.state.processing
                  }
                  onClick={ () => this.changeSendCoinStep(0) }
                  className="group3 margin-top-50">
                  <div className="btn-inner">
                    <div className="btn">{ translate('SEND.MAKE_ANOTHER_TX') }</div>
                    <div className="group2">
                      <div className="rectangle8copy"></div>
                      <img
                        className="path6"
                        src={ `${assetsPath.login}/reset-password-path-6.png` } />
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      );
    } else {
      return null;
    }
  }
}

export default SendCoin;