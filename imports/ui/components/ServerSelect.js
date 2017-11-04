import React from 'react';
import { formatValue } from '../actions/utils';
import { translate } from '../translate/translate';

class ServerSelect extends React.Component {
  constructor() {
    super();
    this.state = {
      electrumServer: '',
      serverList: [],
      selectedOption: '',
      errorTestingServer: false,
      connecting: false,
    };
    this.updateInput = this.updateInput.bind(this);
    this.setElectrumServer = this.setElectrumServer.bind(this);
  }

  componentWillMount() {
    console.warn(this.props);

    this.props.getServersList()
    .then((res) => {
      const _coin = this.props.coin === 'kmd' ? 'komodo' : this.props.coin;

      this.setState({
        selectedOption: res[_coin].ip + ':' + res[_coin].port,
        electrumServer: res[_coin].ip + ':' + res[_coin].port,
        serverList: res[_coin].serverList,
      });

      console.warn(this.state);
    });
  }

  updateInput(e) {
    this.setState({
      [e.target.name]: e.target.value,
      errorTestingServer: false,
      connecting: false,
    });
  }

  setElectrumServer() {
    const _server = this.state.selectedOption.split(':');

    this.props.setDefaultServer(
      this.props.coin === 'kmd' ? 'komodo' : this.props.coin,
      _server[1],
      _server[0]
    ).then((res) => {
      if (res === 'error') {
        this.setState({
          errorTestingServer: true,
          connecting: false,
        });
      } else {
        this.setState({
          errorTestingServer: false,
          connecting: true,
        });
        this.props.dashboardRefresh();
      }

      console.warn(res);
    });
  }

  renderServerListSelectorOptions() {
    let _items = [];
    let _spvServers = this.state.serverList;

    for (let i = 0; i < _spvServers.length; i++) {
      _items.push(
        <option
          key={ `spv-server-list-${i}` }
          value={ `${_spvServers[i]}` }>{ `${_spvServers[i]}` }</option>
      );
    }

    return _items;
  }

  render() {
    return (
      <div className="con-error">
        <i className="fa fa-warning error"></i> <span className="error">{ translate('DASHBOARD.CON_ERROR', this.props.coin.toUpperCase()) }</span>
        <div>
          <hr />
          <div>
            <select
              className="form-control form-material"
              name="selectedOption"
              value={ this.state.selectedOption }
              onChange={ (event) => this.updateInput(event) }
              autoFocus>
              { this.renderServerListSelectorOptions() }
            </select>
          </div>
          { this.state.errorTestingServer &&
            <div className="error margin-top-10 margin-bottom-10">
            { translate('DASHBOARD.ERROR_TESTING_SERVER', this.state.selectedOption) }
            </div>
          }
          { this.state.connecting &&
            <div className="margin-top-20 margin-bottom-10">
            { translate('DASHBOARD.CONNECTING_TO_NEW_SERVER') }
            </div>
          }
          <div className="margin-top-30 center">
            <button
              type="button"
              className="btn btn-primary"
              onClick={ this.setElectrumServer }>
                { translate('DASHBOARD.SWITCH_SERVER') }
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ServerSelect;