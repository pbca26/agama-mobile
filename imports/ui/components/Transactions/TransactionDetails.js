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
import { assetsPath } from '../../actions/utils';

class TransactionDetails extends React.Component {
  constructor() {
    super();
    this.state = {
    };
    this.menuBack = this.menuBack.bind(this);
    this.openExplorerUrl = this.openExplorerUrl.bind(this);
  }

  menuBack() {
    this.props.cb();
  }

  openExplorerUrl() {
    const _name = this.props.coin.split('|')[0];
    let url;
    
    if (this.props.coin.indexOf('|eth') > -1) {
      if (_name === 'eth' ||
          _name === 'eth_ropsten') {
        url = `${explorerList[_name.toUpperCase()]}${this.props.tx.txid}`;
      } else {
        url = `${explorerList.ETH}${this.props.tx.txid}`;
      }
    } else {
      url = explorerList[_name.toUpperCase()].split('/').length - 1 > 2 ? `${explorerList[_name.toUpperCase()]}${this.props.tx.txid}` : `${explorerList[_name.toUpperCase()]}/tx/${this.props.tx.txid}`;
    }

    window.open(url, '_system');
  }

  render() {
    const tx = this.props.tx;
    console.warn(tx);

    return (
      <section className="transaction-details">
        <img
          className="menu-back"
          src={ `${assetsPath.menu}/trends-combined-shape.png` }
          onClick={ this.menuBack } />
        <div className="title">{ translate('TRANSACTIONS.TRANSACTION_DETAILS') }</div>
        <div className="edit">
          { translate('TRANSACTIONS.DIRECTION') }
          <div className="shade margin-top-5 uc-first">
            { tx.type }
          </div>
        </div>
        <div className="edit">
          { translate('EXCHANGES.FROM') }
          <div className="shade margin-top-5">
            { tx.from ? tx.from[0] : translate('EXCHANGES.NA') }
          </div>
        </div>
        <div className="edit">
          { translate('EXCHANGES.TO') }
          <div className="shade margin-top-5">
            { tx.address }
          </div>
        </div>
        { this.props.coin === 'kmd|spv' &&
          Math.abs(tx.interest) > 0 &&
          <div className="edit">
            { translate('TRANSACTIONS.INTEREST') }
            <div className="shade margin-top-5">
              { Math.abs(tx.interest) }
            </div>
          </div>
        }
        <div className="edit">
          { translate('EXCHANGES.AMOUNT') }
          <div className="shade margin-top-5">
            { (Number(tx.amount) === 0 ? translate('TRANSACTIONS.UNKNOWN') : Number(tx.amount)) }
          </div>
        </div>
        { tx.amount !== tx.fee &&
          <div className="edit">
            { translate('EXCHANGES.FEE') }
            <div className="shade margin-top-5">
              { Number(tx.fee) }
            </div>
          </div>
        }
        <div className="edit">
          { translate('EXCHANGES.CONFIRMATIONS') }
          <div className="shade margin-top-5">
            { tx.confirmations }
          </div>
        </div>
        <div className="edit">
          { translate('EXCHANGES.HEIGHT') }
          <div className="shade margin-top-5">
            { tx.height }
          </div>
        </div>
        <div className="edit">
          { translate('EXCHANGES.TIMESTAMP') }
          <div className="shade margin-top-5">
            { secondsToString(tx.timestamp) }
          </div>
        </div>
        { this.props.coin === 'kmd|spv' &&
          <div className="edit">
            { translate('TRANSACTIONS.LOCKTIME') }
            <div className="shade margin-top-5">
              { tx.locktime }
            </div>
          </div>
        }
        <div className="edit">
          { translate('EXCHANGES.TX_ID') }
          <div
            className="shade margin-top-5"
            onClick={ this.openExplorerUrl }>
            { tx.txid } <i className="fa fa-external-link margin-left-10"></i>
          </div>
        </div>
      </section>
    );
  }
}

export default TransactionDetails;