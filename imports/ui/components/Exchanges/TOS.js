import React from 'react';

import translate from '../../translate/translate';
import { Meteor } from 'meteor/meteor';

class ExchangesTOS extends React.Component {
  constructor() {
    super();
    this.state = {};
    this.openCoinswitchTOS = this.openCoinswitchTOS.bind(this);
  }

  openCoinswitchTOS() {
    window.open('https://coinswitch.co/terms', '_system');
  }

  render() {
    return (
      <div className="exchanges-tos margin-top-45">
        <div className="exchanges-tos-inner">
          <div className="text-center padding-bottom-10">{ translate('EXCHANGES.TOS') }</div>
          <p>{ translate('EXCHANGES.TOS_P1') } <a onClick={ this.openCoinswitchTOS } className="pointer">{ translate('EXCHANGES.TOS_SM') }</a>. { translate('EXCHANGES.TOS_P2') } <a onClick={ this.openCoinswitchTOS } className="pointer">{ translate('EXCHANGES.TOS_SM') }</a>.</p>
          <p>{ translate('EXCHANGES.TOS_P3') }</p>
        </div>
      </div>
    );
  }
}

export default ExchangesTOS;