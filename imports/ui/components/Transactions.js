import React from 'react';
import { formatValue } from 'agama-wallet-lib/build/utils';
import { secondsToString } from 'agama-wallet-lib/build/time';
import {
  explorerList,
  isKomodoCoin,
} from 'agama-wallet-lib/build/coin-helpers';
import translate from '../translate/translate';
import Spinner from './Spinner';
import QRCode from 'qrcode.react';
import { assetsPath } from '../actions/utils';

class Transactions extends React.Component {
  constructor() {
    super();
    this.state = {
      toggledTxDetails: null,
      showQR: false,
    };
    this.toggleTxDetails = this.toggleTxDetails.bind(this);
    this.openExternalURL = this.openExternalURL.bind(this);
    this.isInterestDefined = this.isInterestDefined.bind(this);
    this.toggleQR = this.toggleQR.bind(this);
    this.showClaimButton = this.showClaimButton.bind(this);
  }

  toggleQR() {
    this.setState({
      showQR: !this.state.showQR,
    });
  }

  showClaimButton() {
    const _props = this.props;

    if (_props.coin === 'kmd' &&
        _props.balance &&
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

  isInterestDefined() {
    const _props = this.props;

    if (_props.balance &&
        _props.balance.interest &&
        _props.balance.interest > 0) {
      return true;
    }
  }

  componentWillReceiveProps(props) {
    if (props.coin !== this.props.coin) {
      this.setState({
        toggledTxDetails: null,
      });
    }
  }

  toggleTxDetails(index) {
    this.setState({
      toggledTxDetails: index === this.state.toggledTxDetails ? null : index,
    });
  }

  openExternalURL(url) {
    window.open(url, '_system');
  }

  renderTxAmount(tx, amountOnly) {
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
        { formatValue(tx.amount) * _amountNegative || translate('TRANSACTIONS.UNKNOWN') }
        { Number(tx.amount) !== 0 &&
          <span className="padding-left-5">{ this.props.coin.toUpperCase() }</span>
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
      <div className={ 'send-receive-block' + (this.showClaimButton() ? ' three-btn' : '') }>
        <div className="send-receive-block-inner">
          <button
            disabled={ !this.showSendButton() }
            type="button"
            onClick={ () => this.props.changeActiveSection('send') }
            className="btn btn-primary waves-effect waves-light margin-right-20">
            <i className="fa fa-send"></i> { translate('DASHBOARD.SEND') }
          </button>
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
              key={ `transaction-${i}` }>
              <div className="direction">{ _transactions[i].type }</div>
              <div className="date">{ secondsToString(_transactions[i].timestamp) }</div>
              { /*<div className="amount-fiat">$0</div> */ }
              <div className="amount-native">{ this.renderTxAmount(_transactions[i]) }</div>
              <div className="direction-icon"></div>
              <img
                className="line"
                src={ `${assetsPath.txs}/trends-rectangle-7.png` } />
            </div>
          );
        }
      }

      const _coin = this.props.coin;
      const _balance = this.props.balance;

      return (
        <div className="transactions-ui">
          <div className="individualportfolio">
            <div className="individualportfolio-inner">
              { this.props.loading &&
                !this.props.transactions &&
                <div className="lasttransactions">{ translate('TRANSACTIONS.LOADING_HISTORY') }...</div>                  
              }
              { this.props.transactions &&
                <div className="lasttransactions">
                  { translate('TRANSACTIONS.' + (!_items.length ? 'NO_HISTORY' : 'LAST_TX')) }
                </div>
              }
              <div className="cryptocardbtc-block">
                <div className="cryptocardbtc">
                  <img
                    className="coin-icon"
                    src={ `${assetsPath.coinLogo}/${_coin}.png` } />
                  <div className="coin-title">{ translate('COINS.' + _coin.toUpperCase()) }</div>
                  <div className="coin-balance">
                    <div className="balance">
                    { translate('BALANCE.BALANCE') }: { _balance ? formatValue(_balance.balance) : 0 } { _coin.toUpperCase() }
                    </div>
                    { this.isInterestDefined() &&
                      <div className="interest">
                      { translate('BALANCE.INTEREST') }: { _balance ? formatValue(_balance.interest) : 0 } { _coin.toUpperCase() }
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
        </div>
      );
    }
  }
}

export default Transactions;