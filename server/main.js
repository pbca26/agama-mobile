import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  //
});

Meteor.methods({
  saveFile: function(blob, name, encoding) {
    console.warn('savefile called');
    var path = cleanPath(path), fs = Npm.require('fs'),
      name = cleanName(name || 'file'), encoding = encoding || 'binary',
      chroot = Meteor.chroot || (process.env['PWD'] + '/public');
    // Clean up the path. Remove any initial and final '/' -we prefix them-,
    // any sort of attempt to go to the parent directory '..' and any empty directories in
    // between '/////' - which may happen after removing '..'
    path = chroot + (path ? '/' + path + '/' : '/');

    // TODO Add file existance checks, etc...
    /*fs.writeFileSync(path + name, blob, encoding, function(err) {
      if (err) {
        Session.set('saveSeedResult', error);
        console.log(err);
        // throw (new Meteor.Error(500, 'Failed to save file.', err));
      } else {
        Session.set('saveSeedResult', name);
        console.log('The file ' + name + ' (' + encoding + ') was saved to ' + path);
      }
    });*/
    return fs.writeFileSync(path + name, blob, encoding);

    function cleanPath(str) {
      if (str) {
        return str.replace(/\.\./g,'').replace(/\/+/g,'').
          replace(/^\/+/,'').replace(/\/+$/,'');
      }
    }
    function cleanName(str) {
      return str.replace(/\.\./g,'').replace(/\//g,'');
    }
  }
});