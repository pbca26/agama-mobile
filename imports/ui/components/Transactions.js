import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  secondsToString,
  formatValue,
} from '../actions/utils';

import actions from '../actions/actions';

class Transactions extends React.Component {
  constructor() {
    super();
    this.state = {
    };
  }

  renderTxDetailIcon() {
    return (
      <button
        type="button"
        className="btn btn-xs white btn-info">
        <i className="fa fa-search"></i>
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
        { formatValue(tx.amount) * _amountNegative || 'uknown' }
        { tx.interest &&
          <span className="tx-interest margin-left-15">(+{ formatValue(Math.abs(tx.interest)) })</span>
        }
      </span>
    );
  };

/*
              <div className="margin-top-10">
              { _transactions[i].address }
              </div>
*/

  render() {
    if (this.props.activeSection === 'dashboard') {
      if (this.props.transactions) {
        const _transactions = this.props.transactions;
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
              <div className="margin-top-10 padding-bottom-10">
              { _transactions[i].txid }
              </div>
            </div>
          );
        }

        if (!_items.length) {
          return (
            <div className="txhistory">No history</div>
          );
        } else {
          return (
            <div className="txhistory">{ _items }</div>
          );
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch),
  }
}

export default connect(mapDispatchToProps)(Transactions);