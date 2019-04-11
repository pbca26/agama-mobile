const changeLogData = [{
  version: '0.1.6',
  changes: [
    'New asset chain K64',
    'KMD send coin clock out of sync check',
    'Transaction confirmations counter fix',
    'Low resolution screen scaling fixes',
  ],
}, {
  version: '0.1.5',
  changes: [
    'dPoW icon',
    'Recovery show priv keys toggle',
    'Transaction details view',
    'Add coin quick search string matching fix',
    'KMD rewards UTXO issues icon',
    'Better transaction history categorization',
    'Send transaction fee subtract fix',
    'Add coin ERC20 token badge',
    'BTC fee calc fix',
    'Rename lock to logout',
    'Overview related fixes, faster initialization',
    'Pin override UI change',
    'Transaction history display fiat balance',
    'Settings pin bruteforce protection option',
    'Settings change pin option',
    'Settings btc fees source option',
    'Settings remove coin section',
    'Settings fiat currency selector',
    'Settings user agreement',
    'Settings about/change log',
    'Settings support',
    'Settings main view option',
    'Cache transactions history, wallet overview',
    'Always display settings item in menu',
    'Create wallet refactor',
    'Notary Node voting section',
    'Removed ERC20 tokens: AION, BTM, CMT, EOS, ICX, NAS, NET, NULS, TUSD, VEN',
    'Added ERC20 tokens: JST, DEC8, TRET, TILE, OVAL, KEA, CLF',
    'ERC20 contract ID changed: SUB, QBUIT, MLN',
    'Removed coins/assets: ARG, MNZ',
    'New KMD asset chains: OUR, KSB, ILN, RICK, MORTY, ZEX, VOTE2019, RFOX',
    'ZCL sapling support',
    'GRS support',
    'EMC2 WIF keys export (recovery) fix',
  ],
}, {
  version: '0.1.4',
  changes: [
    'VRSC transaction signing fix',
    'QR code parse fix',
    'ETH/ERC20 pricing',
    'Overview price change icon',
    'PTX asset chain added',
    'ARG, BCBC coins removed',
  ],
}, {
  version: '0.1.3',
  changes: [
    'ETH & ERC20 Tokens support',
    'Sapling transparent transactions signing support',
    'Coin search option',
  ],
}, {
  version: '0.1.2',
  changes: [
    'KMD rewards claiming fix',
    'Minor UI changes',
  ],
}, {
  version: '0.1.1',
  changes: [
    'Updated BTG, VTC electrum servers list',
    'Fixed login/create wallet issues',
  ],
}, {
  version: '0.1.0',
  changes: [
    'New dark theme',
    'New assets: ZILLA, NINJA, CCL, CALL, VRSC',
    'New coins: BTC, EMC2, FJC, GAME, BCBC, BTCZ, QTUM, DNR, BTX, XZC, FTC, GBX',
    'Komodo Active User Reward update (height 1 million rules)',
    'Electrum runtime data cache',
    'Transactions history parser z tx decode fix, self send handling',
    'Send form display fee and total value, pub address check',
    'Disable back button after add coin',
    'Display message on settings save success',
    'Proxy retry fix',
    'Updated electrum servers list',
    'Fixed wrong atomicexplorer url',
    'Various minor bug fixes and improvements',
  ],
}, {
  version: '0.0.7',
  changes: [
    'Portfolio Overview',
    'App Settings',
    'Confirm transaction with a PIN',
    'Passphrase recovery',
    'Login QR passphrase/WIF scan',
    'Login PIN keypad',
    'Fixed transaction fee 0.0001 for Supernet related coins/assets',
    'Improved QR scanner',
  ],
}, {
  version: '0.0.6',
  changes: [
    '2 new coins XMY and ZCL',
    '1 new asset BTCH',
    'Balance is displayed on send form now',
    'Another Electrum proxy node is added for redundancy',
  ],
}, {
  version: '0.0.5',
  changes: [
    'QR code gen / scan',
    'KMD claim interest',
    'Auto logout after 10 min inactivity',
    'Transaction details toggle',
    'Faster login',
    'Memory leak fix that led to constant app crash',
    'Transaction history sorting',
  ],
}, {
  version: '0.0.4',
  changes: [
    'New coins added: DOGE, DGB, BTG, BLK, BCH, FAIR, VIA, MONA, ZEC, HUSH, ARG, DASH, CRW, VTC, LTC, NMC, SIB',
  ],
}, {
  version: '0.0.1 - 0.0.3',
  changes: [
    'Initial code, prototyping, internal testing',
  ],
}];

export default changeLogData;
