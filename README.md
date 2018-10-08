# Agama Mobile

## How to install

```
intall meteor 1.6.1.4
install npm
install nodejs
install java8, don't install java9 it won't work with meteor 1.6.x

git clone
cd to project's folder
meteor update
npm install

os specific (build):
install android studio
install android sdk 26.x
configure path env
```

## How to run local desktop version
meteor run --port=3002

## How to build an apk
meteor add-platform android

meteor build build --server=localhost

sign apk with your key

## How to debug with hot code push
enable dev mode on your android device

connect your device via a usb cable to your machine
connect your device to the same wifi network as your machine

meteor run android-device

refer to meteor docs https://guide.meteor.com

## How to verify jar/apk signature
jarsigner -verify -certs -verbose filename.apk

## How to sign apk
create signing key

jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 release-unsigned.apk agama-app

## Notes
jsqr v1.1.1 breaks the code, needs thorough debugging

## Meteor 1.6.1.4 apk path (meteorjs bug)
path is relative to your project's folder

`.meteor/local/cordova-build/platforms/android/build/outputs/apk`

## Play store
Run zipalign

osx example: `/Users/yourusername/Library/Android/sdk/build-tools/26.0.0/zipalign -v 4 agama-mobile-v0.1.0.apk agama-mobile-v0.1.0.apk` 