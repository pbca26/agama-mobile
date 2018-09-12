import React from 'react';

import {
  setLocalStorageVar,
  getLocalStorageVar,
} from '../actions/utils';
import {
  encryptkey,
  decryptkey,
} from '../actions/seedCrypt';
import translate from '../translate/translate';
import { Meteor } from 'meteor/meteor';

// TODO: reset settings/purge seed and pin

const SETTINGS_SAVED_MSG_TIMEOUT = 5000;

class Settings extends React.Component {
  constructor() {
    super();
    this.state = {
      autoLockTimeout: 600000,
      requirePin: false,
      isSaved: false,
    };
    this.updateInput = this.updateInput.bind(this);
    this.toggleConfirmPin = this.toggleConfirmPin.bind(this);
    this.save = this.save.bind(this);
  }

  componentWillMount() {
    const _settings = getLocalStorageVar('settings');

    if (_settings) {
      this.setState({
        autoLockTimeout: _settings.autoLockTimeout,
        requirePin: _settings.requirePin,
      });
    }
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }
  
  toggleConfirmPin() {
    this.setState({
      requirePin: !this.state.requirePin,
    });
  }

  save() {
    setLocalStorageVar('settings', {
      autoLockTimeout: this.state.autoLockTimeout,
      requirePin: this.state.requirePin,
    });

    this.setState({
      isSaved: true,
    });

    Meteor.setTimeout(() => {
      this.setState({
        isSaved: false,
      });
    }, SETTINGS_SAVED_MSG_TIMEOUT);
  }

  render() {
    return (
      <div className="form settings">
        <div className="margin-top-10 item">
          <div className="padding-bottom-20">{ translate('SETTINGS.AUTOLOCK_TIMEOUT') }</div>
          <select
            className="form-control form-material"
            name="autoLockTimeout"
            value={ this.state.autoLockTimeout }
            onChange={ (event) => this.updateInput(event) }
            autoFocus>
            <option value="600000">10 { translate('SETTINGS.MINUTES') }</option>
            <option value="1200000">20 { translate('SETTINGS.MINUTES') }</option>
            <option value="1800000">30 { translate('SETTINGS.MINUTES') }</option>
          </select>
        </div>
        <div className="item last">
          <label className="switch">
            <input
              type="checkbox"
              value="on"
              checked={ this.state.requirePin } />
            <div
              className="slider"
              onClick={ this.toggleConfirmPin }></div>
          </label>
          <div
            className="toggle-label"
            onClick={ this.toggleConfirmPin }>
            { translate('SETTINGS.REQUIRE_PIN_CONFIRM') }
          </div>
        </div>
        { this.state.isSaved &&
          <div className="padding-bottom-20 text-center success">{ translate('SETTINGS.SAVED') }</div>
        }
        <div
          onClick={ this.save }
          className="group3 margin-top-25">
          <div className="btn-inner">
            <div className="btn">{ translate('SETTINGS.SAVE') }</div>
            <div className="group2">
              <i className="fa fa-save"></i>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Settings;