import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux'
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import './main.html';

import './assets/global/css/bootstrap.min.css';
import './styles/main.scss';
import './styles/addcoin.scss';
import './styles/interest.scss';
import './styles/menu.scss';
import './styles/send.scss';
import './styles/spinner.scss';
import './styles/switch.scss';
import './styles/transactions.scss';
// whitelabel styling
import './styles/whitelabel.scss';

import appReducer from '../imports/ui/reducers';
import App from '../imports/ui/App';

const store = createStore(appReducer, applyMiddleware(thunk));

Meteor.startup(() => {
  render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById('app')
  );
});
