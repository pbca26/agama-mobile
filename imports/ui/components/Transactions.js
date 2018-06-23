import React from 'react';
import {
  secondsToString,
  formatValue,
  explorers,
  isAssetChain,
} from '../actions/utils';
import { translate } from '../translate/translate';
import Spinner from './Spinner';

class Transactions extends React.Component {
  constructor() {
    super();
    this.state = {
      toggledTxDetails: null,
    };
    this.toggleTxDetails = this.toggleTxDetails.bind(this);
    this.openExternalURL = this.openExternalURL.bind(this);
    this.isInterestDefined = this.isInterestDefined.bind(this);
  }

  isInterestDefined() {
    if (this.props.balance.interest &&
        this.props.balance.interest > 0) {
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

  renderTxType(category) {
    if (category === 'send' ||
        category === 'sent') {
      return (
        <span className="label label-danger">
          <i className="fa fa-arrow-circle-left"></i> <span>{ translate('TRANSACTIONS.OUT') }</span>
        </span>
      );
    } else if (category === 'receive' ||
        category === 'received') {
      return (
        <span className="label label-success">
          <i className="fa fa-arrow-circle-right"></i> <span>{ translate('TRANSACTIONS.IN') } &nbsp; &nbsp;</span>
        </span>
      );
    } else if (category === 'generate') {
      return (
        <span>
          <i className="fa fa-cogs"></i> <span>{ translate('TRANSACTIONS.MINE') }</span>
        </span>
      );
    } else if (category === 'immature') {
      return (
        <span>
          <i className="fa fa-clock-o"></i> <span>{ translate('TRANSACTIONS.IMMATURE') }</span>
        </span>
      );
    } else if (category === 'unknown') {
      return (
        <span>
          <i className="fa fa-meh-o"></i> <span>{ translate('TRANSACTIONS.UNKNOWN') }</span>
        </span>
      );
    }
  };

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

    return (
      <span>
        { formatValue(tx.amount) * _amountNegative || translate('TRANSACTIONS.UNKNOWN') } { this.props.coin.toUpperCase() }
        { tx.interest &&
          !amountOnly &&
          <div className="tx-interest">+{ formatValue(Math.abs(tx.interest)) }</div>
        }
      </span>
    );
  };

  render() {
    if (this.props.activeSection === 'dashboard') {
      if (this.props.transactions) {
        const _transactions = this.props.transactions;
        let _items = [];

        for (let i = 0; i < _transactions.length; i++) {
          _items.push(
            <div
              className={ `item ${_transactions[i].type}` }
              key={ `transaction-${i}` }>
              <div className="direction">{ _transactions[i].type }</div>
              <div className="date">{ secondsToString(_transactions[i].timestamp) }</div>
              { /*<div className="amount-fiat">$0</div> */ }
              <div className="amount-native">{ this.renderTxAmount(_transactions[i]) }</div>
              <div className="direction-icon"></div>
              <img className="line" src="/images/template/transactions/trends-rectangle-7.png" />
            </div>
          );
          /*_items.push(
            <div
              className="txlist-transaction"
              key={ `transaction-${i}` }>
              <div>
                { this.renderTxType(_transactions[i].type) }
                <span className="margin-left-20">{ this.renderTxAmount(_transactions[i]) }</span>
                <span className="margin-left-20">{ secondsToString(_transactions[i].timestamp) }</span>
                <span
                  onClick={ () => this.toggleTxDetails(i) }
                  className={ 'details-toggle fa ' + (this.state.toggledTxDetails === i ? 'fa-caret-up' : 'fa-caret-down') }></span>
              </div>
              { this.state.toggledTxDetails !== i &&
                <div className="margin-top-10 padding-bottom-10 txid-hash">
                { _transactions[i].txid }
                </div>
              }
              { this.state.toggledTxDetails === i &&
                <div className="margin-top-10 padding-bottom-10 tx-details">
                  <div>{ translate('TRANSACTIONS.DIRECTION') }: { _transactions[i].type }</div>
                  <div>{ translate('TRANSACTIONS.AMOUNT') }: { this.renderTxAmount(_transactions[i], true) } { this.props.coin.toUpperCase() }</div>
                  { _transactions[i].interest &&
                    Math.abs(_transactions[i].interest) > 0 &&
                    <div>{ translate('TRANSACTIONS.INTEREST') }: { formatValue(Math.abs(_transactions[i].interest)) } KMD</div>
                  }
                  <div>{ translate('TRANSACTIONS.CONFIRMATIONS') }: { _transactions[i].confirmations }</div>
                  { this.props.coin === 'kmd' &&
                    <div>Locktime: { _transactions[i].locktime }</div>
                  }
                  <div>
                  { translate('TRANSACTIONS.TIME') }: { secondsToString(_transactions[i].timestamp) }
                    { isAssetChain(this.props.coin) &&
                      <button
                        onClick={ () => this.openExternalURL(`${explorers[this.props.coin.toUpperCase()]}/tx/${_transactions[i].txid}`) }
                        className="margin-left-20 btn btn-sm white btn-dark waves-effect waves-light ext-link">
                        <i className="fa fa-external-link"></i>Explorer
                      </button>
                    }
                  </div>
                  <div>
                  { translate('TRANSACTIONS.TX_HASH') } <div className="txid-hash">{ _transactions[i].txid }</div>
                  </div>
                </div>
              }
            </div>
          );*/
        }

        return (
          <div className="transactions-ui">
            <div className="individualportfolio">
              <div className="individualportfolio-inner">
                <div className="lasttransactions">{ !_items.length ? translate('TRANSACTIONS.NO_HISTORY') : 'Last Transactions' }</div>
                <div className="cryptocardbtc-block">
                  <div className="cryptocardbtc">
                    <img
                      className="coin-icon"
                      src={ `/images/cryptologo/${this.props.coin}.png` } />
                    <div className="coin-title">{ translate('COINS.' + this.props.coin.toUpperCase()) }</div>
                    <div className="coin-balance">
                      <div className="balance">
                      { translate('BALANCE.BALANCE') }: { formatValue(this.props.balance.balance) } { this.props.coin.toUpperCase() }
                      </div>
                      { this.isInterestDefined() &&
                        <div className="interest">
                        { translate('BALANCE.INTEREST') }: { formatValue(this.props.balance.interest) } { this.props.coin.toUpperCase() }
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
                { (_items && _items.length > 0) &&
                  <div className="transactions-list">
                  { _items }
                  </div>
                }
              </div>
            </div>
          </div>
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}

export default Transactions;