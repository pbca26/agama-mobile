// This section sets up some basic app metadata, the entire section is optional.
App.info({
  id: 'com.supernet.agama',
  name: 'agama-app',
  description: 'Agama Wallet Mobile',
  author: 'SuperNET',
  email: 'dev@supernet.org',
  website: 'http://supernet.org'
});

// Set up resources such as icons and launch screens.
App.icons({
  'iphone_2x': 'icons/128x128.png',
  'iphone_3x': 'icons/128x128.png',
  'android_mdpi': 'icons/48x48.png',
  'android_hdpi': 'icons/64x64.png',
  'android_xhdpi': 'icons/96x96.png'
});

/*App.launchScreens({
  'iphone_2x': 'splash/Default@2x~iphone.png',
  'iphone5': 'splash/Default~iphone5.png',
  // More screen sizes and platforms...
});*/

// Set PhoneGap/Cordova preferences.
/*App.setPreference('BackgroundColor', '0xff0000ff');
App.setPreference('HideKeyboardFormAccessoryBar', true);
App.setPreference('Orientation', 'default');
App.setPreference('Orientation', 'all', 'ios');*/