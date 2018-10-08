App.info({
  id: 'com.supernet.agama',
  version: '0.1.1',
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
App.accessRule('http://94.130.225.86:80');
App.accessRule('http://94.130.98.74:80');
// atomic
App.accessRule('https://www.atomicexplorer.com');
// coin explorers
App.accessRule('https://www.kmdexplorer.io');
App.accessRule('https://kv.kmdexplorer.io');
App.accessRule('http://explorer.utrum.io');
App.accessRule('http://chain.blocnation.io');
App.accessRule('http://explorer.chainmakers.co');
App.accessRule('http://glx.info');
App.accessRule('http://explorer.prlpay.com');
App.accessRule('https://mshark.kmdexplorer.io');
App.accessRule('https://revs.kmdexplorer.io');
App.accessRule('https://supernet.kmdexplorer.io');
App.accessRule('https://dex.kmdexplorer.io');
App.accessRule('https://pangea.kmdexplorer.io');
App.accessRule('https://jumblr.kmdexplorer.io');
App.accessRule('https://bet.kmdexplorer.io');
App.accessRule('https://crypto.kmdexplorer.io');
App.accessRule('https://hodl.kmdexplorer.io');
App.accessRule('http://shark.kmdexplorer.ru');
App.accessRule('https://bots.kmdexplorer.io');
App.accessRule('https://mgw.kmdexplorer.io');
App.accessRule('https://wlc.kmdexplorer.io');
App.accessRule('https://vrsc.kmdexplorer.io');
App.accessRule('https://call.explorer.mycapitalco.in');
App.accessRule('http://ccl.explorer.dexstats.info');
App.accessRule('http://chips.explorer.supernet.org');
App.accessRule('https://explorer.coqui.cash');
App.accessRule('http://178.62.240.191');
App.accessRule('https://mnz.kmdexplorer.io');
App.accessRule('https://btch.kmdexplorer.io');
App.accessRule('https://blockchain.info');
App.accessRule('https://explorer.myhush.org');
App.accessRule('http://pizza.komodochainz.info');
App.accessRule('http://beer.komodochainz.info');
App.accessRule('https://ninja.kmdexplorer.io');
App.accessRule('http://88.99.226.252');
App.accessRule('https://explorer.qtum.org');
App.accessRule('http://denarius.name');
App.accessRule('https://live.blockcypher.com');
App.accessRule('https://bchain.info');
App.accessRule('https://explorer.viacoin.org');
App.accessRule('http://explorer.vertcoin.info');
App.accessRule('https://namecha.in');
App.accessRule('https://digiexplorer.info');
App.accessRule('http://ex.crownlab.eu');
App.accessRule('https://blockexplorer.gamecredits.com');
App.accessRule('https://btgexplorer.com');
App.accessRule('https://bitcoincash.blockexplorer.com');
App.accessRule('http://explorer.zclmine.pro');
App.accessRule('https://explorer.snowgem.org');
App.accessRule('https://myriadexplorer.com');
App.accessRule('http://explorer.bitcore.cc');
App.accessRule('https://explorer.bitcoinz.site');
App.accessRule('http://www.fuzzbawls.pw');
App.accessRule('https://chain.sibcoin.net');
App.accessRule('https://explorer.zcha.in');
App.accessRule('https://explorer.coinpayments.net');
App.accessRule('https://prohashing.com');
App.accessRule('https://chain.fair.to');
App.accessRule('https://explorer.feathercoin.com');
App.accessRule('https://chainz.cryptoid.info');
App.accessRule('http://explorer.gobyte.network');
App.accessRule('http://explorer.fujicoin.org');
App.accessRule('http://zilla.explorer.dexstats.info');
App.accessRule('https://explorer.zcoin.io');

// Set PhoneGap/Cordova preferences.
App.setPreference('BackgroundColor', '0xffffffff'); // 0x45485FFF
/*App.setPreference('HideKeyboardFormAccessoryBar', true);
App.setPreference('Orientation', 'default');
App.setPreference('Orientation', 'all', 'ios');*/