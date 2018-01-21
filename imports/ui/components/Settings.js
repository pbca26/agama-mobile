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
      <div className="col-sm-12">
        <div className="col-xlg-12 col-md-12 col-sm-12 col-xs-12">
          <div className="row">
            <h4 className="padding-bottom-15">Settings</h4>
            <div className="padding-bottom-10">
              Auto lock timeout
            </div>
            <div className="margin-bottom-20">
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
            <div className="margin-bottom-40 margin-top-45">
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
            <button
              className="btn btn-lg btn-primary btn-block ladda-button"
              onClick={ this.save }>
              <span className="ladda-label">
              Save
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default Settings;