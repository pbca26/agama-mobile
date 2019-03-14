import React from 'react';
import translate from '../../translate/translate';
import {
  assetsPath,
  getLocalStorageVar,
  setLocalStorageVar,
} from '../../actions/utils';

class SettingsUserAgreement extends React.Component {
  constructor() {
    super();
    this.state = {
    };
    this.confirm = this.confirm.bind(this);
  }

  confirm() {
    setLocalStorageVar('agreement', true);
    this.props.cb();
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
            { this.props.enableButton &&
              <div
                onClick={ this.confirm }
                className="group3">
                <div className="btn-inner">
                  <div className="btn">{ translate('AGREEMENT.AGREE') }</div>
                  <div className="group2">
                    <div className="rectangle8copy"></div>
                    <img
                      className="path6"
                      src={ `${assetsPath.login}/reset-password-path-6.png` } />
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default SettingsUserAgreement;