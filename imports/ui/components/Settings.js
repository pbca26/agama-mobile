import React from 'react';

import {
  setLocalStorageVar,
  getLocalStorageVar,
} from '../actions/utils';
import {
  encryptkey,
  decryptkey,
} from '../actions/seedCrypt';
import { translate } from '../translate/translate';

// TODO: reset settings/purge seed and pin

class Settings extends React.Component {
  constructor() {
    super();
    this.state = {
      autoLockTimeout: 60000,
      requirePin: false,
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
  }

  render() {
    return (
      <div className="form settings">
        <div className="margin-top-10 item">
          <div className="padding-bottom-20">
            Auto lock timeout
          </div>
          <select
            className="form-control form-material"
            name="autoLockTimeout"
            value={ this.state.autoLockTimeout }
            onChange={ (event) => this.updateInput(event) }
            autoFocus>
            <option value="600000">10 minutes</option>
            <option value="1200000">20 minutes</option>
            <option value="1800000">30 minutes</option>
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
            Require PIN to confirm transaction
          </div>
        </div>
        <div
          onClick={ this.save }
          className="group3 margin-top-25">
          <div className="btn-inner">
            <div className="btn">Save</div>
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