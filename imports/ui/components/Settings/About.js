import React from 'react';
import translate from '../../translate/translate';
import { version } from '../../actions/dev';
import SettingsChangeLog from './ChangeLog';

class SettingsAbout extends React.Component {
  constructor() {
    super();
    this.state = {
      displayChangeLog: false,
    };
    this.toggleDisplayChangeLog = this.toggleDisplayChangeLog.bind(this);
  }

  toggleDisplayChangeLog() {
    this.setState({
      displayChangeLog: !this.state.displayChangeLog,
    });
  }

  render() {
    return (
      <div className="home form">
        <div className="home-inner">
          <div className="app-logo">
            <img src="/images/agama-icon.svg" />
          </div>
          <div className="app-name">{ translate('ABOUT.AGAMA_MOBILE') }</div>
          <div className="app-version">{ translate('ABOUT.VERSION') }: { version }</div>
          <div className="about-change-log-link-block">
            <a
              className="about-change-log-link"
              onClick={ this.toggleDisplayChangeLog }>{ translate('ABOUT.' + (this.state.displayChangeLog ? 'HIDE_CHANGE_LOG' : 'DISPLAY_CHANGE_LOG')) }</a>
          </div>
          { this.state.displayChangeLog &&
            <SettingsChangeLog />
          }
          <div className="app-copy">&#9400; KomodoPlatform</div>
        </div>
      </div>
    );
  }
}

export default SettingsAbout;