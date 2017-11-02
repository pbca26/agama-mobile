import aes256 from 'nodejs-aes256';

export const encryptkey = (ciperKey, string) => {
  // test pin security
  // - at least 1 char in upper case
  // - at least 1 digit
  // - at least one special character
  // - min length 8

  // const _pinTest = _pin.match('^(?=.*[A-Z])(?=.*[^<>{}\"/|;:.,~!?@#$%^=&*\\]\\\\()\\[_+]*$)(?=.*[0-9])(?=.*[a-z]).{8}$');

  const encryptedString = aes256.encrypt(ciperKey, string);

  console.warn('encryptkey', encryptedString);

  return encryptedString;
}

export const decryptkey = (ciperKey, string) => {
  const encryptedKey = aes256.decrypt(ciperKey, string);
  // test if stored encrypted passphrase is decrypted correctly
  // if not then the key is wrong
  const _regexTest = encryptedKey.match(/^[0-9a-zA-Z ]+$/g);

  console.warn('decryptkey', _regexTest);

  if (!_regexTest) {
    return false;
  } else {
    return encryptedKey;
  }
}