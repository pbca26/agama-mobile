# Agama Mobile

## How to install

```
intall meteor 1.5.x
install npm
install nodejs
install java8, don't install java9 it won't work with meteor 1.5.x

git clone
cd to project's folder
meteor npm install sha256
meteor npm install bitcoinjs-lib
meteor npm install coinkey
meteor npm install coinselect
meteor update

os specific (build):
install android studio
install android sdk 25.x
configure path env
```

## How to run local desktop version
meteor run --port=3002

## How to build an apk
meteor add-platform android

meteor build build --server=supernet.org

sign apk with your key

## How to debug with hot code push
enable dev mode on your android device

meteor run android-device

refer to meteor docs https://guide.meteor.com