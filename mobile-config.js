// This section sets up some basic app metadata, the entire section is optional.

App.info({
  id: 'com.supernet.agama',
  version: '0.0.2',
  buildNumber: '777',
  name: 'Agama',
  description: 'Agama Wallet Mobile',
  author: 'SuperNET',
  email: 'dev@supernet.org',
  website: 'http://supernet.org'
});

// Set up resources such as icons and launch screens.
App.icons({
  'iphone_2x': 'app-assets/icons/128x128.png',
  'iphone_3x': 'app-assets/icons/128x128.png',
  'android_mdpi': 'app-assets/icons/48x48.png',
  'android_hdpi': 'app-assets/icons/64x64.png',
  'android_xhdpi': 'app-assets/icons/96x96.png',
  'android_xxhdpi': 'app-assets/icons/128x128.png',
  'android_xxxhdpi': 'app-assets/icons/256x256.png',
});

App.launchScreens({
  'android_mdpi_portrait': 'app-assets/splash/drawable-mdpi/agama.9.png',
  'android_hdpi_portrait': 'app-assets/splash/drawable-hdpi/agama.9.png',
  'android_xhdpi_portrait': 'app-assets/splash/drawable-xhdpi/agama.9.png',
  'android_xxhdpi_portrait': 'app-assets/splash/drawable-xxhdpi/agama.9.png',
  'android_xxxhdpi_portrait': 'app-assets/splash/drawable-xxxhdpi/agama.9.png',
});

App.accessRule('*');
/*App.launchScreens({
  'iphone_2x': 'splash/Default@2x~iphone.png',
  'iphone5': 'splash/Default~iphone5.png',
  // More screen sizes and platforms...
});*/

// Set PhoneGap/Cordova preferences.
App.setPreference('BackgroundColor', '0xffffffff');
/*App.setPreference('HideKeyboardFormAccessoryBar', true);
App.setPreference('Orientation', 'default');
App.setPreference('Orientation', 'all', 'ios');*/