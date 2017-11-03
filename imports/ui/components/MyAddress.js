import React from 'react';
import { translate } from '../translate/translate';

class MyAddress extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div className="margin-top-20 margin-left-10">
        <strong>
          { translate('DASHBOARD.MY') }&nbsp;
          { this.props.coin.toUpperCase() }&nbsp;
          { translate('DASHBOARD.ADDRESS') }:&nbsp;
        </strong>
        { this.props.address }
      </div>
    );
  }
}

export default MyAddress;