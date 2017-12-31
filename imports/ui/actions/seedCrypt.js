import aes256 from 'nodejs-aes256';

// TODO: check pin strength

export const encryptkey = (ciperKey, string) => {
  // test pin security
  // - at least 1 char in upper case
  // - at least 1 digit
  // - at least one special character
  // - min length 8

  // const _pinTest = _pin.match('^(?=.*[A-Z])(?=.*[^<>{}\"/|;:.,~!?@#$%^=&*\\]\\\\()\\[_+]*$)(?=.*[0-9])(?=.*[a-z]).{8}$');

  const encryptedString = aes256.encrypt(ciperKey, string);

  return encryptedString;
}

export const decryptkey = (ciperKey, string) => {
  const encryptedKey = aes256.decrypt(ciperKey, string);
  // test if stored encrypted passphrase is decrypted correctly
  // if not then the key is wrong
  const _regexTest = encryptedKey.match(/^[0-9a-zA-Z ]+$/g);

  if (!_regexTest) {
    return false;
  } else {
    return encryptedKey;
  }
}