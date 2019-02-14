import React from 'react';
import translate from '../translate/translate';
import electrumServers from 'agama-wallet-lib/build/electrum-servers';
import { getRandomElectrumServer } from 'agama-wallet-lib/build/utils';

const MAX_RETRIES = 3;

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
      retryCount: 0,
    };
    this.updateInput = this.updateInput.bind(this);
    this.setElectrumServer = this.setElectrumServer.bind(this);
  }

  componentWillMount() {
    this.props.getServersList()
    .then((res) => {
      const _coin = this.props.coin;
      const _name = _coin.split('|')[0];
      const _server = this.props.coins[this.props.coin].server;

      this.setState({
        selectedOption: `${_server.ip}:${_server.port}:${_server.proto}`,
        electrumServer: `${_server.ip}:${_server.port}:${_server.proto}`,
        serverList: res[_name].serverList,
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
    const _coin = this.props.coin.split('|')[0].toLowerCase();

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
        if (electrumServers[_coin].serverList !== 'none' &&
            electrumServers[_coin].serverList.length > 1 &&
            this.state.retryCount <= MAX_RETRIES) {
          const _spvServers = electrumServers[_coin].serverList;
          const _randomServer = getRandomElectrumServer(
            _spvServers,
            _server
          );

          this.setState({
            selectedOption: `${_randomServer.ip}:${_randomServer.port}:${_randomServer.proto}`,
            retryCount: this.state.retryCount + 1,
          });

          setTimeout(() => {
            this.setElectrumServer();
          }, 100);
        } else {
          this.setState({
            errorTestingServer: true,
            connecting: false,
            spvServerRetryInProgress: false,
            retryCount: 0,
          });
        }
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

        if (this.props.activeSection === 'server-select') {
          this.props.historyBack();
        }
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
          value={ _spvServers[i] }>
          { `${_spvServers[i]}` }
        </option>
      );
    }

    return _items;
  }

  render() {
    const _name = this.props.coin.split('|')[0];
    const _mode = this.props.coin.split('|')[1];

    return (
      <div className="form server-select">
        { this.props.activeSection !== 'server-select' &&
          <div className="bold text-center">
            <i className="fa fa-warning error padding-right-5"></i>
            <span className="error width-limit">{ translate('DASHBOARD.CON_ERROR', _name.toUpperCase()) }</span>
          </div>
        }
        { this.props.activeSection === 'server-select' &&
          <div className="bold text-center">
            <span className="width-limit">{ translate('SETTINGS.SELECT_SERVER_BELOW') }</span>
          </div>
        }
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