import React from 'react';

import translate from '../../translate/translate';
import {
  devlog,
  config,
} from '../../actions/dev';
import { secondsToString } from 'agama-wallet-lib/build/time';
import {
  explorerList,
  isKomodoCoin,
} from 'agama-wallet-lib/build/coin-helpers';
import { statusLookup } from './utils';

class ExchangesOrderDetails extends React.Component {
  constructor() {
    super();
    this.state = {
      activeOrderTxView: false,
    };
    this.orderDetailsTab = this.orderDetailsTab.bind(this);
    this.openExplorerUrl = this.openExplorerUrl.bind(this);
  }

  openExplorerUrl(coin, txid) {
    if (txid) {
      const _name = coin;
      let url;
      
      if (coin.indexOf('|eth') > -1) {
        if (_name === 'eth' ||
            _name === 'eth_ropsten') {
          url = `${explorerList[_name.toUpperCase()]}${txid}`;
        } else {
          url = `${explorerList.ETH}${txid}`;
        }
      } else {
        url = explorerList[_name.toUpperCase()].split('/').length - 1 > 2 ? `${explorerList[_name.toUpperCase()]}${txid}` : `${explorerList[_name.toUpperCase()]}/tx/${txid}`;
      }

      window.open(url, '_system');
    }
  }

  orderDetailsTab(val) {
    if (this.props.activeOrderDetailsDepositTx) {
      this.setState({
        activeOrderTxView: val,
      });
    }
  }

  render() {
    const _cache = this.props.order;
    const _deposits = this.props.deposit;
    const renderDepositTab = this.props.findDeposits(_cache.orderId).length > 0 ||
      (this.props.provider === 'coinswitch' && _cache.inputTransactionHash) ||
      (this.props.provider === 'coinswitch' && _cache.inputTransactionHash && _deposits && _deposits[`${_cache.depositCoin.toLowerCase()}-${_cache.inputTransactionHash}`]);

    return (
      <section className="exchanges-order-details">
        { this.props.findDeposits(_cache.orderId).length === 0 &&
          !_cache.inputTransactionHash &&
          _cache.status === 'no_deposit' &&
          <div className="group3 margin-bottom-50 make-deposit-btn">
            <div
              onClick={ this.props.makeDeposit }
              className="btn-inner">
              <div className="btn">
                { translate('EXCHANGES.MAKE_A_DEPOSIT') }
              </div>
              <div className="group2">
                <i className="fa fa-money"></i>
              </div>
            </div>
          </div>
        }
        <div className="tabs">
          <div
            onClick={ () => this.orderDetailsTab(false) }
            className={ 'tab' + (this.state.activeOrderTxView && this.props.activeOrderDetailsDepositTx ? ' active' : '') }>
            { translate('EXCHANGES.ORDER_INFO') }
          </div>
          <div
            onClick={ () => this.orderDetailsTab(true) }
            className={ `tab${!this.props.activeOrderDetailsDepositTx ? ' disabled' : ''}` + (!this.state.activeOrderTxView ? ' active' : '') }>
            { translate('EXCHANGES.DEPOSIT_INFO') }
          </div>
        </div>
        { !this.state.activeOrderTxView &&
          <div>
            <div className="edit">
              { translate('EXCHANGES.DATE') }
              <div className="shade margin-top-5">
                { secondsToString(_cache.createdAt / 1000) }
              </div>
            </div>
            { _cache.validTill &&
              <div className="edit">
                { translate('EXCHANGES.VALID_UNTIL') }
                <div className="shade margin-top-5">
                  { secondsToString(_cache.validTill / 1000) }
                </div>
              </div>
            }
            <div className="edit">
              { translate('EXCHANGES.DEPOSIT') }
              <div className="shade margin-top-5">
                { Number(Number(_cache.expectedDepositCoinAmount).toFixed(8)) } { _cache.depositCoin.toUpperCase() }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.DESTINATION') }
              <div className="shade margin-top-5">
                { Number(Number(_cache.expectedDestinationCoinAmount).toFixed(8)) } { _cache.destinationCoin.toUpperCase() }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.EXCHANGE_RATE') }
              <div className="shade margin-top-5">
                { Number(Number((1 / _cache.expectedDepositCoinAmount) * _cache.expectedDestinationCoinAmount).toFixed(8)) } { _cache.destinationCoin.toUpperCase() } { translate('EXCHANGES.FOR_SM') } 1 { _cache.depositCoin.toUpperCase() }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.DEPOSIT_ADDRESS') }
              <div className="shade margin-top-5">
                { _cache.exchangeAddress.address }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.DEPOSIT_TX_ID') }
              <div
                className="shade margin-top-5"
                onClick={ () => this.openExplorerUrl(_cache.depositCoin.toLowerCase(), _cache.inputTransactionHash || this.props.findDeposits(_cache.orderId)[0]) }>
                { _cache.inputTransactionHash || this.props.findDeposits(_cache.orderId)[0] ? <span>{ _cache.inputTransactionHash || this.props.findDeposits(_cache.orderId)[0] } <i className="fa fa-external-link margin-left-10"></i></span> : translate('EXCHANGES.NA') }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.DEST_ADDRESS') }
              <div className="shade margin-top-5">
                { _cache.destinationAddress.address }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.DEST_TX_ID') }
              <div
                className="shade margin-top-5"
                onClick={ () => this.openExplorerUrl(_cache.destinationCoin.toLowerCase(), _cache.outputTransactionHash) }>
                { _cache.outputTransactionHash ? <span>{ _cache.outputTransactionHash } <i className="fa fa-external-link margin-left-10"></i></span> : translate('EXCHANGES.NA') }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.STATUS') }
              <div className="shade margin-top-5">
                { _cache.outputTransactionHash ? translate('EXCHANGES.COMPLETE_SM') : statusLookup.coinswitch[_cache.status] ? statusLookup.coinswitch[_cache.status] : _cache.status }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.ORDER_ID') }
              <div
                className="shade margin-top-5"
                onClick={ this.props.openOrderOnline }>
                { _cache.orderId }
                <i className="fa fa-external-link margin-left-10"></i>
              </div>
            </div>
          </div>
        }
        { this.state.activeOrderTxView &&
          this.props.activeOrderDetailsDepositTx &&
          <div>
            <div className="edit">
              { translate('EXCHANGES.FROM') }
              <div className="shade margin-top-5">
                { this.props.activeOrderDetailsDepositTx.inputAddresses ? this.props.activeOrderDetailsDepositTx.inputAddresses[0] : translate('EXCHANGES.NA') }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.TO') }
              <div className="shade margin-top-5">
                { this.props.activeOrderDetailsDepositTx.address }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.AMOUNT') }
              <div className="shade margin-top-5">
                { (Number(this.props.activeOrderDetailsDepositTx.amount) === 0 ? translate('TRANSACTIONS.UNKNOWN') : Number(this.props.activeOrderDetailsDepositTx.amount)) }
              </div>
            </div>
            { this.props.activeOrderDetailsDepositTx.amount !== this.props.activeOrderDetailsDepositTx.fee &&
              <div className="edit">
                { translate('EXCHANGES.FEE') }
                <div className="shade margin-top-5">
                  { Number(this.props.activeOrderDetailsDepositTx.fee) }
                </div>
              </div>
            }
            <div className="edit">
              { translate('EXCHANGES.CONFIRMATIONS') }
              <div className="shade margin-top-5">
                { this.props.activeOrderDetailsDepositTx.confirmations }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.HEIGHT') }
              <div className="shade margin-top-5">
                { this.props.activeOrderDetailsDepositTx.height }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.TIMESTAMP') }
              <div className="shade margin-top-5">
                { secondsToString(this.props.activeOrderDetailsDepositTx.timestamp) }
              </div>
            </div>
            <div className="edit">
              { translate('EXCHANGES.TX_ID') }
              <div
                className="shade margin-top-5"
                onClick={ () => this.openExplorerUrl(_cache.depositCoin.toLowerCase(), this.props.activeOrderDetailsDepositTx.txid) }>
                { this.props.activeOrderDetailsDepositTx.txid } <i className="fa fa-external-link margin-left-10"></i>
              </div>
            </div>
          </div>
        }
      </section>
    );
  }
}

export default ExchangesOrderDetails;