import React from 'react';
import { formatValue } from '../actions/utils';
import { translate } from '../translate/translate';

class Balance extends React.Component {
  constructor() {
    super();
    this.state = {
    };
    this.isInterestDefined = this.isInterestDefined.bind(this);
  }

  isInterestDefined() {
    if (this.props.balance.interest &&
        this.props.balance.interest > 0) {
      return true;
    }
  }

  render() {
    if (this.props.activeSection === 'dashboard') {
      const _balance = this.props.balance;
      const _coin = this.props.coin && this.props.coin.toUpperCase();

      if (_balance) {
        return (
          <div className="balance">
            <div>
              <strong>{ translate('BALANCE.BALANCE') }: </strong> <span>{ formatValue(_balance.balance) } { _coin }</span>
            </div>
            { this.isInterestDefined() &&
              <div className="margin-top-10">
                <strong> { translate('BALANCE.INTEREST') }: </strong> <span>{ formatValue(_balance.interest) } { _coin }</span>
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

export default Balance;