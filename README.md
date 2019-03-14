
### This is experimental and unfinished software. Use at your own risk! No warranty for any kind of damage!

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# Agama Mobile

## How to install

```
intall meteor 1.8
install npm
install nodejs
install java8, don't install java9 it won't work with meteor 1.6.x+

git clone
cd to project's folder
meteor update
npm install

os specific (build):
install android studio
install android sdk 27.x
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

## Meteor 1.6+ apk path (meteorjs bug)
path is relative to your project's folder

`.meteor/local/cordova-build/platforms/android/build/outputs/apk`

## Play store
Run zipalign

osx example: `/Users/yourusername/Library/Android/sdk/build-tools/27.0.0/zipalign -v 4 agama-mobile-v0.1.0.apk agama-mobile-v0.1.0.apk` 

## Meteor 1.7 ES6 transpile (symlink)
https://github.com/meteor/meteor/pull/9826#issuecomment-392541768

## Possible compatibility (legacy?) issues during build between different MacOS/Xcode versions
Xcode 10.1 / 9.2
MacOS 10.14.1 / 0.12.6