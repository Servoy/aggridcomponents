var AdmZip = require('adm-zip');

// creating archives
var zip = new AdmZip();

zip.addLocalFolder("./META-INF/", "/META-INF/");
zip.addLocalFolder("./dist/servoy/nggrids/", "/dist/servoy/nggrids/");
zip.addLocalFolder("./datasettable/", "/datasettable/");
zip.addLocalFolder("./groupingtable/", "/groupingtable/");
zip.addLocalFolder("./lib/", "/lib/");

zip.writeZip("aggrid.zip");