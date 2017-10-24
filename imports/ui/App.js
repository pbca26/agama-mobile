import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import actions from './actions/actions';

function secondsToString(seconds, skipMultiply, showSeconds) {
  const a = new Date(seconds * (skipMultiply ? 1 : 1000));
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  const year = a.getFullYear();
  const month = months[a.getMonth()];
  const date = a.getDate();
  const hour = a.getHours() < 10 ? `0${a.getHours()}` : a.getHours();
  const min = a.getMinutes() < 10 ? `0${a.getMinutes()}` : a.getMinutes();
  const sec = a.getSeconds();
  const time = `${date} ${month} ${year} ${hour}:${min}${(showSeconds ? ':' + sec : '')}`;

  return time;
}

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
    };
    this.login = this.login.bind(this);
    this.getKeys = this.getKeys.bind(this);
    this.getBalance = this.getBalance.bind(this);
    this.getTransactions = this.getTransactions.bind(this);
    this.updateInput = this.updateInput.bind(this);
  }

  /*componentDidMount() {
    const { actions } = this.props;

    actions.getKeys()
    .then((res) => {
      console.warn(res);
    });
  }

  componentWillReceiveProps(props) {
    console.warn('componentWillReceiveProps', props);
  }*/

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
      if (res.msg === 'success') {
        this.setState({
          balance: res.result.confirmed,
        });
      } else {
        this.setState({
          address: JSON.stringify(res.result),
        });
      }
      console.warn(res);
    });
  }

  getTransactions() {
    const { actions } = this.props;

    actions.transactions(this.state.address)
    .then((res) => {
      this.setState({
        transactions: res,
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
          <i className="icon fa-arrow-circle-left"></i> <span>out</span>
        </span>
      );
    } else if (category === 'receive' ||
        category === 'received') {
      return (
        <span className="label label-success">
          <i className="icon fa-arrow-circle-right"></i> <span>in &nbsp; &nbsp;</span>
        </span>
      );
    } else if (category === 'generate') {
      return (
        <span>
          <i className="icon fa-cogs"></i> <span>mine</span>
        </span>
      );
    } else if (category === 'immature') {
      return (
        <span>
          <i className="icon fa-clock-o"></i> <span>immature</span>
        </span>
      );
    } else if (category === 'unknown') {
      return (
        <span>
          <i className="icon fa-meh-o"></i> <span>unknown</span>
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
      </span>
    );
  };

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
        <div className="app-header">
          <img src="/images/agama-logo-side.svg" />
          <i className="fa fa-bars"></i>
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
          <button
            className="btn btn-lg btn-info btn-block ladda-button"
            onClick={ this.getBalance }>
            <span className="ladda-label">
            Get Balance
            </span>
          </button>
          { this.state.balance &&
            <div style={{ margin: '10px 0', fontSize: '16px', marginTop: '20px', marginBottom: '20px' }}>
              <strong>Balance: </strong> <span>{ this.state.balance * 0.00000001 } KMD</span>
            </div>
          }
          <button
            className="btn btn-lg btn-info btn-block ladda-button margin-top-20"
            onClick={ this.getTransactions }>
            <span className="ladda-label">
            Get Transactions
            </span>
          </button>
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