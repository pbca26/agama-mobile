import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import actions from './actions/actions';
import {
  secondsToString,
  calcKmdInterest
} from './actions/utils';

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: null,
      address: 'RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd',
      balance: null,
      transactions: null,
      utxo: null,
      errors: null,
      displayMenu: false,
      loading: false,
      coin: 'kmd',
      displaySend: false,
      sendAmount: 0.0001,
      sendTo: 'RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd',
      sendCurrentStep: 0,
      sendResult: null,
    };
    this.login = this.login.bind(this);
    this.getKeys = this.getKeys.bind(this);
    this.getBalance = this.getBalance.bind(this);
    this.getTransactions = this.getTransactions.bind(this);
    this.updateInput = this.updateInput.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
    this.changeSendCoinStep = this.changeSendCoinStep.bind(this);
    this.toggleSend = this.toggleSend.bind(this);
    this.dashboardRefresh = this.dashboardRefresh.bind(this);
  }

  componentDidMount() {
    this.dashboardRefresh();
  }

  dashboardRefresh() {
    this.getBalance();
    this.getTransactions();
  }

  getKeys() {
    const { actions } = this.props;

    actions.getKeys()
    .then((res) => {
      console.warn(res);
    });
  }

  getBalance() {
    const { actions } = this.props;

    actions.balance(this.state.address)
    .then((res) => {
      this.setState({
        balance: res,
      });
      console.warn(res);
    });
  }

  getTransactions() {
    const { actions } = this.props;

    this.setState({
      loading: true,
    });

    actions.transactions(this.state.address)
    .then((res) => {
      this.setState({
        transactions: res,
        loading: false,
      });
      console.warn(res);
    });
  }

  login() {
    const { actions } = this.props;

    actions.auth(this.state.passphrase)
    .then((res) => {
      this.setState({
        address: res.res,
      });
      console.warn(res);
    });
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  renderTxDetailIcon() {
    return (
      <button
        type="button"
        className="btn btn-xs white btn-info"
        onClick={ () => this.toggleTxInfoModal() }>
        <i className="icon fa-search"></i>
      </button>
    );
  };

  renderTxType(category) {
    if (category === 'send' ||
        category === 'sent') {
      return (
        <span className="label label-danger">
          <i className="fa fa-arrow-circle-left"></i> <span>out</span>
        </span>
      );
    } else if (category === 'receive' ||
        category === 'received') {
      return (
        <span className="label label-success">
          <i className="fa fa-arrow-circle-right"></i> <span>in &nbsp; &nbsp;</span>
        </span>
      );
    } else if (category === 'generate') {
      return (
        <span>
          <i className="fa fa-cogs"></i> <span>mine</span>
        </span>
      );
    } else if (category === 'immature') {
      return (
        <span>
          <i className="fa fa-clock-o"></i> <span>immature</span>
        </span>
      );
    } else if (category === 'unknown') {
      return (
        <span>
          <i className="fa fa-meh-o"></i> <span>unknown</span>
        </span>
      );
    }
  };

  renderTxAmount(tx) {
    let _amountNegative;

    if ((tx.category === 'send' ||
        tx.category === 'sent') ||
        (tx.type === 'send' ||
        tx.type === 'sent')) {
      _amountNegative = -1;
    } else {
      _amountNegative = 1;
    }

    return (
      <span>
        { tx.amount * _amountNegative || 'uknown' }
        { tx.interest &&
          <span className="tx-interest margin-left-15">(+{ Math.abs(tx.interest) })</span>
        }
      </span>
    );
  };

  toggleMenu() {
    this.setState({
      displayMenu: !this.state.displayMenu,
    });
  }

  toggleSend() {
    this.setState({
      sendCurrentStep: 0,
      displaySend: !this.state.displaySend,
      displayMenu: !this.state.displayMenu,
    });
  }

  changeSendCoinStep(step) {
    const { actions } = this.props;

    switch(step) {
      case 0:
        this.setState({
          sendCurrentStep: 0,
        });
        break;
      case 1:
        this.setState({
          sendCurrentStep: 1,
        });
        break;
      case 2:
        // todo
        this.setState({
          sendCurrentStep: 2,
        });

        console.warn('send confirm');
        actions.sendtx(this.state.sendTo, this.state.address, this.state.sendAmount * 100000000, 10000, true)
        .then((res) => {
          console.warn('sendtx result');
          console.warn(res);

          this.setState({
            sendResult: res,
          });
        });
        break;
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
            <label className="control-label padding-bottom-10">Send from</label>
            <div>{ this.state.address }</div>
          </div>
        </div>
        <div className="row">
          <div className="col-xlg-12 form-group form-material">
            <label
              className="control-label"
              htmlFor="kmdWalletSendTo">Send to</label>
            <input
              type="text"
              className="form-control"
              name="sendTo"
              onChange={ this.updateInput }
              value={ this.state.sendTo }
              id="kmdWalletSendTo"
              placeholder="Enter address"
              autoComplete="off"
              required />
          </div>
          <div className="col-lg-12 form-group form-material">
            <label
              className="control-label"
              htmlFor="kmdWalletAmount">
              Amount
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
              Send { this.state.sendAmount } { this.state.coin }
            </button>
          </div>
        </div>
      </form>
    );
  }

  sendRender() {
    if (this.state.displaySend) {
      return (
        <div className="col-sm-12 padding-top-10 send">
          <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
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
                <div className="col-xs-12 no-padding-left margin-bottom-20">
                  <span className="step-title">Fill send form</span>
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
                    <span className="step-title">Confirm</span>
                  </div>
                  <div className="col-xs-12">
                    <strong>To</strong>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-xs-12">{ this.state.sendTo }</div>
                  <div className="col-lg-6 col-sm-6 col-xs-6 margin-top-10">
                    { this.state.sendAmount } { this.state.coin.toUpperCase() }
                  </div>
                </div>

                { this.state.spvPreflightSendInProgress &&
                  <div className="padding-top-20">{ translate('SEND.SPV_VERIFYING') }...</div>
                }
                { this.state.spvVerificationWarning &&
                  <div
                    className="padding-top-20"
                    style={{ fontSize: '15px' }}>
                    <strong className="color-warning">{ translate('SEND.WARNING') }:</strong> { translate('SEND.WARNING_SPV_P1') }<br />
                    { translate('SEND.WARNING_SPV_P2') }
                  </div>
                }
                <div className="widget-body-footer">
                  <a
                    className="btn btn-default waves-effect waves-light"
                    onClick={ () => this.changeSendCoinStep(0, true) }>Back</a>
                  <div className="widget-actions pull-right">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={ () => this.changeSendCoinStep(2) }>
                        Confirm
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
                  Transaction result
                </h4>
                <div>
                  { this.state.sendResult &&
                    this.state.sendResult.msg === 'success' &&
                    <table className="table table-hover table-striped">
                      <thead>
                        <tr>
                          <th className="padding-left-30">Key</th>
                          <th className="padding-left-30">Info</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="padding-left-30">
                          Result
                          </td>
                          <td className="padding-left-30">
                            <span className="label label-success">success</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="padding-left-30">Transaction ID</td>
                          <td className="padding-left-30">{ this.state.sendResult && this.state.sendResult.result && this.state.sendResult.result.txid ? this.state.sendResult.result.txid : 'processing...' }</td>
                        </tr>
                      </tbody>
                    </table>
                  }
                  { !this.state.sendResult &&
                    <div className="padding-left-30 padding-top-10">Processing transaction...</div>
                  }
                  { this.state.sendResult &&
                    this.state.sendResult.msg &&
                    this.state.sendResult.msg === 'error' &&
                    <div className="padding-left-30 padding-top-10">
                      <div>
                        <strong>Error</strong>
                      </div>
                      <div>{ this.state.sendResult.result }</div>
                    </div>
                  }
                </div>
                <div className="widget-body-footer">
                  <div className="widget-actions margin-bottom-15 margin-right-15">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={ () => this.changeSendCoinStep(0) }>
                        Make another tx
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
  };

  renderMenu() {
    if (this.state.displayMenu) {
      return (
        <div className="nav-menu">
          <div className="nav-menu-inner">
            <i
              onClick={ this.toggleMenu }
              className="fa fa-bars"></i>
            <div className="nav-menu-items">
              <div>Switch account</div>
              <div>Coins</div>
              <div onClick={ this.toggleSend }>Dashboard</div>
              <div onClick={ this.toggleSend }>Send</div>
              <div>Logout</div>
            </div>
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  renderTransactions() {
    if (this.state.transactions) {
      const _transactions = this.state.transactions;
      let _items = [];

      for (let i = 0; i < _transactions.length; i++) {
        _items.push(
          <div
            className="txlist-transaction"
            key={ `transaction-${i}` }>
            <div>
              { this.renderTxType(_transactions[i].type) }
              <span className="margin-left-20">{ this.renderTxAmount(_transactions[i]) }</span>
              <span className="margin-left-20">{ secondsToString(_transactions[i].timestamp) }</span>
            </div>
            <div className="margin-top-10">
            { _transactions[i].address }
            </div>
            <div className="margin-top-10 padding-bottom-10">
            { _transactions[i].txid }
            </div>
          </div>
        );
      }

      return _items;
    } else {
      return null;
    }
  }

  render() {
    return (
      <div className="app-container">
        { this.renderMenu() }
        { this.sendRender() }
        <div className="app-header">
          <img src="/images/agama-logo-side.svg" />
          <img
            className="margin-left-20"
            src={ `/images/cryptologo/${this.state.coin}.png` } />
          <i
            onClick={ this.toggleMenu }
            className="fa fa-bars"></i>
        </div>
        <div className="app-main">
          <input
            type="text"
            className="form-control margin-bottom-10"
            name="passphrase"
            onChange={ this.updateInput }
            placeholder="Enter passphrase"
            value={ this.state.passphrase || '' } />
          <button
            className="btn btn-lg btn-primary btn-block ladda-button"
            onClick={ this.login }>
            <span className="ladda-label">
            Login
            </span>
          </button>
          <input
            type="text"
            className="form-control margin-top-20 margin-bottom-20"
            name="passphrase"
            onChange={ this.updateInput }
            value={ this.state.address || '' } />
          <i
            onClick={ this.dashboardRefresh }
            className="fa fa-refresh dashboard-refresh"></i>
          { this.state.balance &&
            <div style={{ margin: '10px 0', fontSize: '16px', margin: '20px' }}>
              <div>
                <strong>Balance: </strong> <span>{ this.state.balance.balance } KMD</span>
              </div>
              <div className="margin-top-10">
                <strong>Interest: </strong> <span>{ this.state.balance.interest } KMD</span>
              </div>
            </div>
          }
          { this.state.loading &&
            <div className="margin-top-10 margin-bottom-20">Loading...</div>
          }
          { this.state.transactions &&
            <div className="txhistory">{ this.renderTransactions() }</div>
          }
          { this.state.errors &&
            <div>
              <hr />
              <h4>Errors</h4>
              <div>{ this.state.errors }</div>
            </div>
          }
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    keys: state.keys,
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch),
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);