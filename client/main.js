import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux'
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import './main.html';

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
