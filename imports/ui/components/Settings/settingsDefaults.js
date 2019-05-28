import btcFeesSource from './btcFees';

const settingsDefaults = {
  autoLockTimeout: 600000,
  requirePin: false,
  fiat: 'usd',
  debug: false,
  btcFeesSource: btcFeesSource[0].name,
  pinBruteforceProtection: false,
  mainView: 'default',
  phoneBackButtonAction: 'default', 
};

export default settingsDefaults;