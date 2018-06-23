App.info({
  id: 'com.supernet.agama',
  version: '0.1.0',
  buildNumber: '777',
  name: 'Agama',
  description: 'Agama Mobile is a lightweight wallet application that allows users to manage multiple crypto currencies. It\'s built on top of SPV technology which provides a quick way to retrieve and push transaction data.',
  author: 'SuperNET',
  email: 'pbca@komodoplatform.com',
  website: 'http://komodoplatform.com'
});

// Set up resources such as icons and launch screens.
App.icons({
  // ios
  'app_store': 'app-assets/icons/app_store.png',
  'iphone': 'app-assets/icons/iphone.png',
  'iphone_2x': 'app-assets/icons/iphone_2x.png',
  'iphone_3x': 'app-assets/icons/iphone_3x.png',
  'ipad': 'app-assets/icons/ipad.png',
  'ipad_2x': 'app-assets/icons/ipad_2x.png',
  'ipad_pro': 'app-assets/icons/ipad_pro.png',
  // android
  'android_mdpi': 'app-assets/icons/48x48.png',
  'android_hdpi': 'app-assets/icons/64x64.png',
  'android_xhdpi': 'app-assets/icons/96x96.png',
  'android_xxhdpi': 'app-assets/icons/128x128.png',
  'android_xxxhdpi': 'app-assets/icons/256x256.png',
});

App.launchScreens({
  // ios
  'iphone_2x': 'app-assets/splash/iphone_2x.png',
  'iphone5': 'app-assets/splash/iphone5.png',
  'iphone6': 'app-assets/splash/iphone6.png',
  // android
  'android_mdpi_portrait': 'app-assets/splash/drawable-mdpi/agama.9.png',
  'android_hdpi_portrait': 'app-assets/splash/drawable-hdpi/agama.9.png',
  'android_xhdpi_portrait': 'app-assets/splash/drawable-xhdpi/agama.9.png',
  'android_xxhdpi_portrait': 'app-assets/splash/drawable-xxhdpi/agama.9.png',
  'android_xxxhdpi_portrait': 'app-assets/splash/drawable-xxxhdpi/agama.9.png',
});

// proxies
App.accessRule('http://94.130.225.86');
App.accessRule('http://94.130.98.74');
// atomic
App.accessRule('https://www.atomicexplorer.com');
// coin explorers
App.accessRule('http://kmdexplorer.ru');
App.accessRule('http://MSHARK.explorer.supernet.org');
App.accessRule('http://revs.explorer.supernet.org');
App.accessRule('http://SUPERNET.explorer.supernet.org');
App.accessRule('http://DEX.explorer.supernet.org');
App.accessRule('http://PANGEA.explorer.supernet.org');
App.accessRule('http://JUMBLR.explorer.supernet.org');
App.accessRule('http://BET.explorer.supernet.org');
App.accessRule('http://CRYPTO.explorer.supernet.org');
App.accessRule('http://HODL.explorer.supernet.org');
App.accessRule('http://SHARK.explorer.supernet.org');
App.accessRule('http://BOTS.explorer.supernet.org');
App.accessRule('http://MGW.explorer.supernet.org');
App.accessRule('http://WIRELESS.explorer.supernet.org');
App.accessRule('http://CHIPS1.explorer.supernet.org');
App.accessRule('https://explorer.coqui.cash');
App.accessRule('https://explorer.utrum.io');
App.accessRule('https://www.mnzexplorer.com');

// Set PhoneGap/Cordova preferences.
App.setPreference('BackgroundColor', '0xffffffff'); // 0x45485FFF
/*App.setPreference('HideKeyboardFormAccessoryBar', true);
App.setPreference('Orientation', 'default');
App.setPreference('Orientation', 'all', 'ios');*/