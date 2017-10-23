import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import actions from './actions/actions';

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

  componentDidMount() {
    const { actions } = this.props;

    actions.getKeys()
    .then((res) => {
      console.warn(res);
    });
  }

  componentWillReceiveProps(props) {
    console.warn('componentWillReceiveProps', props);
  }

  handleForm(e) {
    e.preventDefault();
    const { widgetActions } = this.props;
    const name = this.refs.name.value;

    this.props.widgetActions.createWidget({ name });

    this.refs.name.value = '';
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

  renderTransactions() {
    const _transactions = this.state.transactions;
    let _items = [];

    for (let i = 0; i < _transactions.length; i++) {
      _items.push(
        <div>
        { JSON.stringify(_transactions[i], null, '\t') }
        </div>
      );
    }

    return _items;
  }

  render() {
    return (
      <div>
        <input
          type="text"
          className="form-control"
          name="passphrase"
          onChange={ this.updateInput }
          value={ this.state.passphrase || '' } />
        <button
          className="btn btn-lg btn-primary btn-block ladda-button"
          onClick={ this.login }>
          <span className="ladda-label">
          Login
          </span>
        </button>
        <hr />
        <button
          className="btn btn-lg btn-primary btn-block ladda-button"
          onClick={ this.getKeys }>
          <span className="ladda-label">
          Get Keys
          </span>
        </button>
        <hr />
        <input
          type="text"
          className="form-control"
          name="passphrase"
          onChange={ this.updateInput }
          value={ this.state.address || '' } />
        <button
          className="btn btn-lg btn-primary btn-block ladda-button"
          onClick={ this.getBalance }>
          <span className="ladda-label">
          Get Balance
          </span>
        </button>
        { this.state.balance &&
          <div style={{ margin: '10px 0' }}>
            <strong>Balance: </strong> <span>{ this.state.balance * 0.00000001 } KMD</span>
          </div>
        }
        <hr />
        <button
          className="btn btn-lg btn-primary btn-block ladda-button"
          onClick={ this.getTransactions }>
          <span className="ladda-label">
          Get Transactions
          </span>
        </button>
        { this.state.transactions &&
          <div>{ this.renderTransactions() }</div>
        }
        { this.state.errors &&
          <div>
            <hr />
            <h4>Errors</h4>
            <div>{ this.state.errors }</div>
          </div>
        }
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

/*
      <div>
        <h1>widgets</h1>
        <ul>
          { widgets
            ?
            widgets.map(w => <li key={w._id}>{w.name}</li>)
            :
            <li>none</li>
          }
        </ul>
        <form onSubmit={this.handleForm.bind(this)}>
          <label htmlFor="name">Name</label>
          <input type="text" name="name" ref="name" />
          <input type="submit" value="Add Widget" />
        </form>
      </div>
*/
