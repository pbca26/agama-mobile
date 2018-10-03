import lang from './en';

const translate = (langID, interpolateStr) => {
  const defaultLang = 'EN';

  if (langID &&
      langID.indexOf('.') > -1) {
    let langIDComponents = langID.split('.');

    if (lang &&
        langIDComponents &&
        lang[defaultLang][langIDComponents[0]][langIDComponents[1]]) {
      if (interpolateStr) {
        return lang[defaultLang][langIDComponents[0]][langIDComponents[1]].replace('@template@', interpolateStr);
      } else {
        return lang[defaultLang][langIDComponents[0]][langIDComponents[1]];
      }
    } else {
      console.warn(`Missing translation ${langID} in js/${defaultLang.toLowerCase()}.js`);
      return `--> ${langID} <--`;
    }
  } else {
    if (langID.length) {
      console.warn(`Missing translation ${langID} in js/${defaultLang.toLowerCase()}.js`);
      return `--> ${langID} <--`;
    }
  }
}

export default translate;