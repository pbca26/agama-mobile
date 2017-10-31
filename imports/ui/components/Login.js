import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import actions from '../actions/actions';

class Login extends React.Component {
  constructor() {
    super();
    this.state = {
      passphrase: null,
    };
    this.updateInput = this.updateInput.bind(this);
    this.login = this.login.bind(this);
  }

  componentWillReceiveProps(props) {
    console.warn(props);
    console.warn(Object.keys(this.props.coins).length);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  login() {
    this.props.login(this.state.passphrase);
    this.setState({
      passphrase: null,
    });
  }

  render() {
    if ((this.props.activeSection === 'login' || !this.props.auth) &&
        Object.keys(this.props.coins).length) {
      return (
        <div className="col-sm-12 padding-top-10 fixed-layer">
          <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
            <div className="row margin-top-10">
              <h4 className="padding-bottom-10">Passphrase</h4>
              <input
                type="password"
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

              <div>{ this.state.saveSeed }</div>
              <hr />
              <h4 className="padding-bottom-10">PIN</h4>
              <button
                className="btn btn-lg btn-primary btn-block ladda-button hide"
                onClick={ this.saveSeed }>
                <span className="ladda-label">
                Save seed
                </span>
              </button>
            </div>
          </div>
        </div>
      );
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

export default connect(mapDispatchToProps)(Login);