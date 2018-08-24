import React from 'react';
import translate from '../translate/translate';
import { fail } from 'assert';

class ServerSelect extends React.Component {
  constructor() {
    super();
    this.state = {
      electrumServer: '',
      serverList: [],
      selectedOption: '',
      errorTestingServer: false,
      connecting: false,
      spvServerRetryInProgress: false,
    };
    this.updateInput = this.updateInput.bind(this);
    this.setElectrumServer = this.setElectrumServer.bind(this);
  }

  componentWillMount() {
    this.props.getServersList()
    .then((res) => {
      const _coin = this.props.coin;
      const _server = this.props.coins[this.props.coin].server;

      this.setState({
        selectedOption: _server.ip + ':' + _server.port + ':' + _server.proto,
        electrumServer: _server.ip + ':' + _server.port + ':' + _server.proto,
        serverList: res[_coin].serverList,
        errorTestingServer: false,
        connecting: false,
        spvServerRetryInProgress: false,
      });
    });
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      errorTestingServer: false,
      connecting: false,
      spvServerRetryInProgress: false,
    });
  }

  setElectrumServer() {
    const _server = this.state.selectedOption.split(':');

    this.setState({
      spvServerRetryInProgress: true,
    });

    this.props.setDefaultServer(
      this.props.coin,
      _server[1],
      _server[0],
      _server[2],
    )
    .then((res) => {
      if (res === 'error') {
        this.setState({
          errorTestingServer: true,
          connecting: false,
          spvServerRetryInProgress: false,
        });
      } else {
        this.setState({
          errorTestingServer: false,
          connecting: true,
          spvServerRetryInProgress: false,
        });
        this.props.updateDefaultCoinServer(
          this.props.coin,
          { 
            ip: _server[0],
            port: _server[1],
            proto: _server[2],
          } 
        );
        this.props.dashboardRefresh();
      }
    });
  }

  renderServerListSelectorOptions() {
    let _items = [];
    let _spvServers = this.state.serverList;

    for (let i = 0; i < _spvServers.length; i++) {
      _items.push(
        <option
          key={ `spv-server-list-${i}` }
          value={ _spvServers[i] }>{ `${_spvServers[i]}` }</option>
      );
    }

    return _items;
  }

  render() {
    return (
      <div className="form server-select">
        <div className="bold text-center">
          <i className="fa fa-warning error padding-right-5"></i>
          <span className="error width-limit">{ translate('DASHBOARD.CON_ERROR', this.props.coin.toUpperCase()) }</span>
        </div>
        <div className="server-select-inner">
          <div>
            <select
              disabled={ this.state.spvServerRetryInProgress }            
              className="form-control form-material"
              name="selectedOption"
              value={ this.state.selectedOption }
              onChange={ (event) => this.updateInput(event) }
              autoFocus>
              { this.renderServerListSelectorOptions() }
            </select>
          </div>
          { this.state.errorTestingServer &&
            <div className="error margin-top-30 margin-bottom-10 text-center width-limit">
            { translate('DASHBOARD.ERROR_TESTING_SERVER', this.state.selectedOption) }
            </div>
          }
          { this.state.connecting &&
            <div className="margin-top-30 margin-bottom-10 text-center">
            { translate('DASHBOARD.CONNECTING_TO_NEW_SERVER') }
            </div>
          }
          <div
            disabled={ this.state.spvServerRetryInProgress }
            onClick={ this.setElectrumServer }
            className={ 'group3 margin-top-50' + (this.state.spvServerRetryInProgress ? ' retrying' : '')}>
            <div className="btn-inner">
              <div className="btn">{ translate('DASHBOARD.SWITCH_SERVER') }</div>
              <div className="group2">
                <i className="fa fa-refresh"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ServerSelect;