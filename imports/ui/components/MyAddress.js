import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import actions from '../actions/actions';
import { translate } from '../translate/translate';

class MyAddress extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div className="margin-top-20 margin-left-10">
        <strong>{ translate('INDEX.MY') } { this.props.coin.toUpperCase() } { translate('INDEX.ADDRESS') }: </strong>
        { this.props.address }
      </div>
    );
  }
}


export default MyAddress;