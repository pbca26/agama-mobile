import React from 'react';

import {
  setLocalStorageVar,
  getLocalStorageVar,
} from '../../actions/utils';
import {
  encryptkey,
  decryptkey,
} from '../../actions/seedCrypt';
import translate from '../../translate/translate';
import { Meteor } from 'meteor/meteor';
import fiatList from './fiatList';
import settingsDefaults from './settingsDefaults';
import SettingsCoins from './Coins';

// TODO: reset settings/purge seed and pin

const SETTINGS_SAVED_MSG_TIMEOUT = 5000;
const SETTINGS_SAVED_PURGE_MSG_TIMEOUT = 2000;

class Settings extends React.Component {
  constructor() {
    super();
    this.state = {
      autoLockTimeout: 600000,
      requirePin: false,
      isSaved: false,
      purgeData: false,
      fiat: 'usd',
      debug: false,
      activeView: null,
      removeCoins: null,
    };
    this.updateInput = this.updateInput.bind(this);
    this.toggleConfirmPin = this.toggleConfirmPin.bind(this);
    this.togglePurgeData = this.togglePurgeData.bind(this);
    this.toggleDebug = this.toggleDebug.bind(this);
    this.toggleActiveView = this.toggleActiveView.bind(this);
    this.updateCoinsCB = this.updateCoinsCB.bind(this);
    this.save = this.save.bind(this);
  }

  componentWillMount() {
    const _settings = getLocalStorageVar('settings');

    if (_settings) {
      this.setState({
        autoLockTimeout: _settings.autoLockTimeout,
        requirePin: _settings.requirePin,
        fiat: _settings.fiat,
        debug: _settings.debug,
        purgeData: false,
        removeCoins: null,
      });
    }
  }

  updateCoinsCB(removeCoins) {
    this.setState({
      activeView: null,
      removeCoins,
    });
  }

  toggleActiveView(name) {
    this.setState({
      activeView: name,
    });

    window.scrollTo(0, 0);
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  togglePurgeData() {
    this.setState({
      purgeData: !this.state.purgeData,
    });
  }
  
  toggleConfirmPin() {
    this.setState({
      requirePin: !this.state.requirePin,
    });
  }

  toggleDebug() {
    this.setState({
      debug: !this.state.debug,
    });
  }

  save() {
    if (this.state.purgeData) {
      setLocalStorageVar('settings', settingsDefaults);
      setLocalStorageVar('coins', {});
      setLocalStorageVar('seed', null);
      setLocalStorageVar('exchanges', {
        coinswitch: {
          orders: {},
          deposits: {},
        },
      });
    } else {
      setLocalStorageVar('settings', {
        autoLockTimeout: this.state.autoLockTimeout,
        requirePin: this.state.requirePin,
        fiat: this.state.fiat,
        debug: this.state.debug,
      });

      if (this.state.removeCoins) {
        let localStorageCoins = getLocalStorageVar('coins');

        for (let key in this.state.removeCoins) {
          if (!this.state.removeCoins[key]) {
            delete localStorageCoins[key];
          }
        }

        setLocalStorageVar('coins', localStorageCoins);
        this.props.updateCoinsList();
      }
    }

    this.setState({
      isSaved: true,
    });

    Meteor.setTimeout(() => {
      this.setState({
        isSaved: false,
      });

      if (this.state.purgeData) {
        this.props.logout();
      }
    }, this.state.purgeData ? SETTINGS_SAVED_PURGE_MSG_TIMEOUT : SETTINGS_SAVED_MSG_TIMEOUT);

    this.props.globalClick();
  }

  renderFiatOptions() {
    let items = [];

    for (let i = 0; i < fiatList.length; i++) {
      items.push(
        <option
          key={ `settings-fiat-${fiatList[i]}` }
          value={ fiatList[i] }>
          { translate('FIAT_CURRENCIES.' + fiatList[i].toUpperCase()) }
        </option>
      );
    }

    return items;
  }

  render() {
    if (!this.state.activeView) {
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
          <div className="margin-top-10 item">
            <div className="padding-bottom-20">{ translate('SETTINGS.CURRENCY') }</div>
            <select
              className="form-control form-material"
              name="fiat"
              value={ this.state.fiat }
              onChange={ (event) => this.updateInput(event) }
              autoFocus>
              { this.renderFiatOptions() }
            </select>
          </div>
          <div className="item item--sm">
            <label className="switch">
              <input
                type="checkbox"
                value="on"
                checked={ this.state.requirePin }
                readOnly />
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
          <div className="item item--sm">
            <label className="switch">
              <input
                type="checkbox"
                value="on"
                checked={ this.state.purgeData }
                readOnly />
              <div
                className="slider"
                onClick={ this.togglePurgeData }></div>
            </label>
            <div
              className="toggle-label"
              onClick={ this.togglePurgeData }>
              { translate('SETTINGS.PURGE_ALL_DATA') }
            </div>
            { this.state.purgeData &&
              <div className="error margin-top-15 sz350">
                <i className="fa fa-warning"></i> { translate('SETTINGS.PURGE_ALL_DATA_WARNING') }
              </div>
            }
          </div>
          <div className="item item--sm">
            <label className="switch">
              <input
                type="checkbox"
                value="on"
                checked={ this.state.debug }
                readOnly />
              <div
                className="slider"
                onClick={ this.toggleDebug }></div>
            </label>
            <div
              className="toggle-label"
              onClick={ this.toggleDebug }>
              { translate('SETTINGS.DEBUG') }
            </div>
          </div>
          { this.props.coin.indexOf('|spv') > -1 &&
            <div
              onClick={ () => this.props.changeActiveSection('server-select') }
              className="item item--sm">
              { translate('SETTINGS.CHANGE_SERVER', this.props.coin.split('|')[0].toUpperCase()) }
            </div>
          }
          <div
            onClick={ () => this.toggleActiveView('coins') }
            className="item item--sm last">
            { translate('SETTINGS.REMOVE_COIN') }
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
    } else if (this.state.activeView === 'coins') {
      return (
        <SettingsCoins
          coin={ this.props.coin }
          coins={ this.props.coins }
          removeCoins={ this.state.removeCoins }
          cb={ this.updateCoinsCB } />
      );
    }
  }
}

export default Settings;