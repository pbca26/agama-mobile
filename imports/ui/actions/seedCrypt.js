import aes256 from 'nodejs-aes256';

export const encryptkey = (cipherKey, string) => {
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