import { combineReducers } from 'redux';
import auth from './auth';
import dashboard from './dashboard'

const appReducer = combineReducers({
  auth,
  dashboard
});

export default appReducer
