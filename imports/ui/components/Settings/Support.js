import React from 'react';
import translate from '../../translate/translate';

const options = [{
  url: 'https://github.com/komodoplatform/agama/issues/new?body=Please+describe+your+issue+in+details.+Attach+screenshots+if+you+can,+they+help+a+lot.',
  title: 'GH_TICKET',
}, {
  url: 'https://support.komodoplatform.com/support/tickets/new',
  title: 'SUPPORT_KOMODOPLATFORM',
}, {
  url: 'https://discordapp.com/channels/412898016371015680/453204571393622027',
  title: 'DISCORD',
}];

class SettingsSupport extends React.Component {
  constructor() {
    super();
    this.state = {
      selector: 'none',
    };
    this.updateInput = this.updateInput.bind(this);
  }

  updateInput(e) {
    if (e.target.value) {
      window.open(e.target.value, '_system');
    }
  }

  renderOptions() {
    let items = [];

    for (let i = 0; i < options.length; i++) {
      items.push(
        <option
          key={ `settings-support-${i}` }
          value={ options[i].url }>
          { translate('SUPPORT.' + options[i].title) }
        </option>
      );
    }

    return items;
  }

  render() {
    return (
      <select
        className="settings-support"
        name="selector"
        onChange={ (event) => this.updateInput(event) }>
        <option
          value="none">
          { translate('SUPPORT.SELECT_AN_OPTION') }
        </option>
        { this.renderOptions() }
      </select>
    );
  }
}

export default SettingsSupport;