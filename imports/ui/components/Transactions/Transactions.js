import React from 'react';
import { formatValue } from 'agama-wallet-lib/build/utils';
import { secondsToString } from 'agama-wallet-lib/build/time';
import {
  explorerList,
  isKomodoCoin,
} from 'agama-wallet-lib/build/coin-helpers';
import translate from '../../translate/translate';
import QRCode from 'qrcode.react';
import {
  assetsPath,
  getLocalStorageVar,
} from '../../actions/utils';

import Spinner from '../Spinner';
import TransactionDetails from './TransactionDetails';
import FiatSymbol from '../FiatSymbol';

class Transactions extends React.Component {
  constructor() {
    super();
    this.state = {
      toggledTxDetails: 'none',
      showQR: false,
    };
    this.toggleTxDetails = this.toggleTxDetails.bind(this);
    this.openExternalURL = this.openExternalURL.bind(this);
    this.toggleQR = this.toggleQR.bind(this);
    this.showClaimButton = this.showClaimButton.bind(this);
    this.closeTransactionDetails = this.closeTransactionDetails.bind(this);
  }

  closeTransactionDetails() {
    this.setState({
      toggledTxDetails: 'none',
    });
  }

  toggleQR() {
    this.setState({
      showQR: !this.state.showQR,
    });
  }

  showClaimButton() {
    const _props = this.props;

    if (_props.balance &&
        _props.balance.interest &&
        _props.balance.interest > 0) {
      return true;
    }
  }

  showSendButton() {
    const _props = this.props;

    if (_props.balance &&
        _props.balance.balance &&
        _props.balance.balance > 0) {
      return true;
    }
  }

  componentWillReceiveProps(props) {
    if (props.coin !== this.props.coin) {
      this.setState({
        toggledTxDetails: 'none',
      });
    }
  }

  toggleTxDetails(index) {
    this.setState({
      toggledTxDetails: index === this.state.toggledTxDetails ? 'none' : index,
    });
  }

  openExternalURL(url) {
    window.open(url, '_system');
  }

  renderTxAmount(tx, amountOnly) {
    const _name = this.props.coin.split('|')[0];    
    let _amountNegative;

    if ((tx.category === 'send' ||
        tx.category === 'sent') ||
        (tx.type === 'send' ||
        tx.type === 'sent')) {
      _amountNegative = -1;
    } else {
      _amountNegative = 1;
    }

    if (Number(tx.interest) === Number(tx.amount)) {
      _amountNegative = -1;
    }

    return (
      <span>
        { Number(tx.interest) === Number(tx.amount) &&
          <span>+</span>
        }
        { formatValue(tx.amount) * _amountNegative || this.props.coin === 'eth|eth' ? formatValue(tx.amount) * _amountNegative : translate('TRANSACTIONS.UNKNOWN') }
        { Number(tx.amount) !== 0 &&
          <span className="padding-left-5">{ _name.toUpperCase() }</span>
        }
        { tx.interest &&
          !amountOnly &&
          (Number(tx.interest) !== Number(tx.amount)) &&
          <div className="tx-interest">+{ formatValue(Math.abs(tx.interest)) }</div>
        }
      </span>
    );
  };

  renderSendReceiveBtn() {
    return (
      <div className={ 'send-receive-block' + (this.props.coin === 'kmd|spv' ? ' three-btn' : '') }>
        <div className="send-receive-block-inner">
          <button
            disabled={ !this.showSendButton() }
            type="button"
            onClick={ () => this.props.changeActiveSection('send') }
            className={ 'btn btn-primary waves-effect waves-light ' + (this.props.vote ? 'no-margin-right' : 'margin-right-20') }>
            <i className="fa fa-send"></i> { translate('DASHBOARD.' + (!this.props.vote ? 'SEND': 'SEND_VOTE')) }
          </button>
          { !this.props.vote &&
            <button
              type="button"
              className="btn btn-success waves-effect waves-light"
              onClick={ this.toggleQR }>
              <i className="fa fa-inbox"></i> { translate('DASHBOARD.RECEIVE') }
            </button>
          }
          { this.props.coin === 'kmd|spv' &&
            <button
              type="button"
              className="btn btn-info waves-effect waves-light margin-left-20 btn-claim"
              disabled={
                (this.props.balance && this.props.balance.interest && this.props.balance.interest < 0.0002) ||
                !this.showClaimButton()
              }
              onClick={ this.props.toggleKMDInterest }>
              <i className="fa fa-dollar"></i> { translate('DASHBOARD.CLAIM') }
              { this.props.balance &&
                this.props.balance.utxoIssues &&
                <i className="fa fa-exclamation"></i>
              }
            </button>
          }
          { this.state.showQR &&
            <div className="receive-qr">
              { this.props.address &&
                <div>
                  <QRCode
                    value={ this.props.address }
                    size={ 198 } />
                  <div className="text-center wb--all selectable">{ this.props.address }</div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    );
  }

  render() {
    if (this.props.activeSection === 'dashboard' &&
        this.props.coin) {
      const _transactions = this.props.transactions;
      let _items = [];

      if (_transactions) {
        for (let i = 0; i < _transactions.length; i++) {
          _items.push(
            <div
              className={ `item ${_transactions[i].interest && Math.abs(_transactions[i].interest) > 0 ? 'received' : _transactions[i].type}` }
              key={ `transaction-${i}` }
              onClick={ () => this.toggleTxDetails(i) }>
              <div className="direction">{ _transactions[i].type }</div>
              <div className="date">{ secondsToString(_transactions[i].timestamp) }</div>
              { /*<div className="amount-fiat">$0</div> */ }
              <div className="amount-native">{ this.renderTxAmount(_transactions[i]) }</div>
              <div className="direction-icon"></div>
              <img
                className="line"
                src={ `${assetsPath.txs}/trends-rectangle-7.png` } />
              { _transactions[i].hasOwnProperty('dpowSecured') &&
                _transactions[i].dpowSecured &&
                <i className="fa fa-shield success transactions-dpow-flag"></i>
              }
            </div>
          );
        }
      }

      const _coin = this.props.coin;
      const _balance = this.props.balance;
      const _name = _coin.split('|')[0];
      const _mode = _coin.split('|')[1];
      const settingsCurrency = getLocalStorageVar('settings').fiat;

      return (
        <div className="transactions-ui">
          { this.state.toggledTxDetails !== 'none' &&
            <TransactionDetails
              coin={ this.props.coin }
              tx={ this.props.transactions[this.state.toggledTxDetails] }
              cb={ this.closeTransactionDetails }
              vote={ this.props.vote } />
          }
          { this.state.toggledTxDetails === 'none' &&
            <div className="individualportfolio">
              <div className="individualportfolio-inner">
                { this.props.loading &&
                  !this.props.transactions &&
                  <div className="lasttransactions">{ translate('TRANSACTIONS.' + (this.props.vote ? 'LOADING_HISTORY_VOTE' : 'LOADING_HISTORY')) }...</div>                  
                }
                { this.props.transactions &&
                  <div className="lasttransactions">
                    { translate('TRANSACTIONS.' + (!_items.length ? 'NO_HISTORY' : (this.props.vote ? 'LAST_TX_VOTE' : 'LAST_TX'))) }
                  </div>
                }
                <div className="cryptocardbtc-block">
                  <div className="cryptocardbtc">
                    <img
                      className="coin-icon"
                      src={ `${assetsPath.coinLogo}/${_mode}/${_name.toLowerCase()}.png` } />
                    <div className="coin-title">
                    { translate(_mode.toUpperCase() + '.' + _name.toUpperCase()).length > 18 ? _name.toUpperCase() :  translate(_mode.toUpperCase() + '.' + _name.toUpperCase()) }
                    </div>
                    <div className="coin-balance">
                      <div className="balance">
                        { translate('BALANCE.BALANCE') }: { _balance ? formatValue(_balance.balance) : 0 } { _name.toUpperCase() }
                        { _balance &&
                          Number(_balance.balance) > 0 &&
                          this.props.prices &&
                          this.props.prices[_name.toUpperCase()] &&
                          this.props.prices[_name.toUpperCase()][settingsCurrency.toUpperCase()] &&
                          (_mode === 'eth' || (_mode === 'spv' && !isKomodoCoin(_name.toUpperCase())) || (_mode === 'spv' && isKomodoCoin(_name.toUpperCase()) && !this.props.prices[_name.toUpperCase()].hasOwnProperty('KIC'))) &&
                          <div className={ 'balance-fiat' + (this.showClaimButton() ? ' kmd-interest' : '') }>
                            <FiatSymbol symbol={ settingsCurrency } /> { formatValue(_balance.balance * (this.props.prices[_name.toUpperCase()].AVG && this.props.prices[_name.toUpperCase()].AVG[settingsCurrency.toUpperCase()] ? this.props.prices[_name.toUpperCase()].AVG[settingsCurrency.toUpperCase()] : this.props.prices[_name.toUpperCase()][settingsCurrency.toUpperCase()])) }
                          </div>
                        }
                      </div>
                      { this.showClaimButton() &&
                        <div className="interest">
                        { translate('BALANCE.INTEREST') }: { _balance ? formatValue(_balance.interest) : 0 } { _name.toUpperCase() }
                        </div>
                      }
                    </div>
                    { !this.props.loading &&
                      this.props.auth &&
                      this.props.activeSection === 'dashboard' &&
                      (_items && _items.length > 0) &&
                      <i
                        onClick={ this.props.dashboardRefresh }
                        className="fa fa-refresh dashboard-refresh"></i>
                      }
                      { this.props.loading &&
                        this.props.activeSection === 'dashboard' &&
                        <Spinner />
                      }
                  </div>
                </div>
                { this.renderSendReceiveBtn() }
                { (_items && _items.length > 0 && !this.state.showQR) &&
                  <div className="transactions-list">
                  { _items }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      );
    }
  }
}

export default Transactions;