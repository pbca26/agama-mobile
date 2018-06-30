# Agama Mobile

## How to install

```
intall meteor 1.6.x
install npm
install nodejs
install java8, don't install java9 it won't work with meteor 1.6.x

git clone
cd to project's folder
meteor update
npm install

os specific (build):
install android studio
install android sdk 25.x
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