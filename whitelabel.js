/*
  whitelabel is kmd asset chains only
  single coin config
*/

const whitelabel = {
  electrum: {
    ip: 'electrum1.cipig.net',
    port: 10005,
    proto: 'tcp',
    txfee: 10000,
    abbr: 'SUPERNET',
    serverList: [
      'electrum1.cipig.net:10005',
      'electrum2.cipig.net:10005'
    ],
  },
  explorer: 'http://SUPERNET.explorer.supernet.org',
  name: 'supernet',
  title: 'SuperNET',
  logo: 'supernet',
  disablePrices: true,
  disableExperimental: true,
};

export default whitelabel;