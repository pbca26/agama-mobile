import React from 'react';
import translate from '../../translate/translate';

class SettingsUserAgreement extends React.Component {
  constructor() {
    super();
    this.state = {
    };
  }

  render() {
    return (
      <div className="settings-user-agreement">
        <div className="home form">
          <div className="home-inner">
            <h4>{ translate('AGREEMENT.AGREEMENT_P1') }</h4>
            <p>{ translate('AGREEMENT.AGREEMENT_P2') }</p>
            <p>{ translate('AGREEMENT.AGREEMENT_P3') }</p>
            <p>{ translate('AGREEMENT.AGREEMENT_P4') }</p>
          </div>
        </div>
      </div>
    );
  }
}

export default SettingsUserAgreement;