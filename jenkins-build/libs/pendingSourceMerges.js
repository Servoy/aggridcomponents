var fs = require('fs');

var gDirToCheck = '';
var gFoundFiles = [];

processArgs(process.argv.slice(2));
folderToCheck(gDirToCheck);

function processArgs(args) {
    if(args.length == 0) {
        throw new Error('No path given as argument!');
    } else {
        gDirToCheck = args[0];
    }
}

function folderToCheck(dirToCheck) {
    if(dirToCheck) {
        var files = fs.readdirSync(dirToCheck);
        for (var i in files) {
            if (!files.hasOwnProperty(i)) {
                continue;
            }

            var dirname = files[i];
            var name = dirToCheck + '/' + dirname;
            if (fs.statSync(name).isDirectory()) {
                folderToCheck(name);
            } else {
                if(files[i].match(/\.r\d+|\.mine/)) {
                    console.log("FOUND Unmerged files: " + name.replace(gDirToCheck, ''));
                }
            }
        }
    }
}
