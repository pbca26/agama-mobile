export function seedToWif(seed, iguana, network) {
  import sha256 from 'sha256';
  import CoinKey from 'coinkey';
  const electrumJSNetworks = require('./electrumNetworks.js');

  const bytes = sha256(seed, { asBytes: true });

  if (iguana) {
    bytes[0] &= 248;
    bytes[31] &= 127;
    bytes[31] |= 64;
  }

  const toHexString = (byteArray) => {
    return Array.from(byteArray, (byte) => {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
  }

  const hex = toHexString(bytes);

  const _wif = electrumJSNetworks[network].wif;
  const _pkh = electrumJSNetworks[network].pubKeyHash;

  const key = new CoinKey(new Buffer(hex, 'hex'), {
    private: _wif,
    public: _pkh,
  });

  key.compressed = true;

  // shepherd.log(`seedtowif priv key ${key.privateWif}`, true);
  // shepherd.log(`seedtowif pub key ${key.publicAddress}`, true);

  return {
    priv: key.privateWif,
    pub: key.publicAddress,
  };
}