/*
  whitelabel is kmd asset chains only
  single coin config
*/

const whitelabel = {
  electrum: {
    ip: 'electrum1.cipig.net',
    port: 10003,
    proto: 'tcp',
    txfee: 10000,
    abbr: 'COQUI',
    serverList: [
      'electrum1.cipig.net:10003',
      'electrum2.cipig.net:10003'
    ],
  },
  explorer: 'https://explorer.coqui.cash',
  name: 'coqui',
  title: 'Coqui',
  logo: 'coqui',
  disablePrices: true,
  disableExperimental: true,
};

export default whitelabel;