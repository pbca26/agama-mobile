import aes256 from 'nodejs-aes256';

// TODO: check pin strength

export const encryptkey = (cipherKey, string) => {
  // const _pinTest = _pin.match('^(?=.*[A-Z])(?=.*[^<>{}\"/|;:.,~!?@#$%^=&*\\]\\\\()\\[_+]*$)(?=.*[0-9])(?=.*[a-z]).{8}$');

  const encryptedString = aes256.encrypt(cipherKey, string);

  return encryptedString;
}

export const decryptkey = (cipherKey, string) => {
  const encryptedKey = aes256.decrypt(cipherKey, string);
  // test if stored encrypted passphrase is decrypted correctly
  // if not then the key is wrong
  const _regexTest = encryptedKey.match(/^[0-9a-zA-Z <>{}\"/|;:.,~!?@#$%^=&*\]()\_+]+$/g);

  return !_regexTest ? false : encryptedKey;
}