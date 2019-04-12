import React from 'react';
import translate from '../../translate/translate';
import { version } from '../../actions/dev';
import changeLogData from './changeLogData';

class SettingsChangeLog extends React.Component {
  constructor() {
    super();
    this.state = {
    };
  }

  renderItems() {
    let items = [];
    
    for (let i = 0; i < changeLogData.length; i++) {
      let itemsChanges = [];
  
      for (let j = 0; j < changeLogData[i].changes.length; j++) {
        itemsChanges.push(
          <li key={ `change-log-items-${i}-${j}` }>
          { changeLogData[i].changes[j] }
          </li>
        );
      }
  
      items.push(
        <div
          key={ `change-log-items-${i}` }
          className="item padding-bottom-15">
          <h4>v{ changeLogData[i].version }</h4>
          <ul>{ itemsChanges }</ul>
        </div>
      );
    }
  
    return items;
  }

  render() {
    return (
      <div className="about-change-log">
        <h4>{ translate('ABOUT.CHANGE_LOG') }</h4>
        { this.renderItems() }
      </div>
    );
  }
}

export default SettingsChangeLog;