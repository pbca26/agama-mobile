let electrumServers = {};

const _electrumServers = require('agama-wallet-lib/build/electrum-servers');

electrumServers = Object.assign({}, _electrumServers);

export default electrumServers;