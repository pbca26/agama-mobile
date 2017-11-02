import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { formatValue } from '../actions/utils';

import actions from '../actions/actions';

class Balance extends React.Component {
  constructor() {
    super();
    this.state = {
    };
  }

  render() {
    if (this.props.activeSection === 'dashboard') {
      if (this.props.balance) {
        return (
          <div style={{ fontSize: '16px', margin: '20px', marginLeft: '10px', marginBottom: '35px' }}>
            <div>
              <strong>Balance: </strong> <span>{ formatValue(this.props.balance.balance) } { this.props.coin.toUpperCase() }</span>
            </div>
            { this.props.balance.interest &&
              <div className="margin-top-10">
                <strong>Interest: </strong> <span>{ formatValue(this.props.balance.interest) } { this.props.coin.toUpperCase() }</span>
              </div>
            }
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

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch),
  }
}

export default connect(mapDispatchToProps)(Balance);