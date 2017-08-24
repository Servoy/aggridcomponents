/*
 * servoyCodeCoverageInstrumentationFixer.js
 *
 * Parse all the JS Files instrumented by Istanbul in input directory tree and save parsed file in output directory tree.
 * Istanbul inject a variable on top of every js file and a method which initiates the variable.
 * Generate a UUID property for all injected variables and wrap the method injected by istanbul in a self executing variable.
 * Those variables are used by istanbul to count the line of code hitted during executions.
 * Move the variable and the injected method in a new scope file of the test solution.
 *
 * At the onOpen event the test solution should init the newly created scope file to initiate all the variables injected by istanbul
 * The global variable __coverage__ contains the stats of all the line of code hitted during executions.
 * At the onClose event the test solution should save the content of the variable __report__ in a .json file.
 */

// require node libraries
var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var path = require('path');
var util = require('util');
var uuid = require('uuid/v4');
var Transform = stream.Transform || require('readable-stream').Transform;


var HELP = 'servoyCodeCoverageInstrumentationFixer arguments\n\
--h help\n\
--d <output_dir> <input_dir>\n\
mandatory argument! Parse file from directory tree <input_dir> and save parsed files in <output_dir> using the same tree structure\n\n\
--e <true|false>\n\
when set to true return error if any of the processed file is not instrumented. Default is false\n\n\
--rp <reportPath>\n\
The path to the reports directory. Use to store the collected coverage data to a json file\n\n\
--t <test_solution_path>\n\
The path to the directory of the test solution\n\n\
--i "<include_folder>[,<include_folder>]"\n\
include folders. List all folder to be included in a string. Use comma to separate folder names.\n\n\
--x "<exclude_folder>[,<exclude_folder>]"\n\
Exclude folders or files. List all files and folder to be excluded in a string. Use comma to separate folder or file names.\n\n\
--v <true|false>\n\
verbose logging. set verbose to true to view the log messages during execution\n';

var WORKSPACE;
var TEMP_WORKSPACE; // input directory to parse the file.
var WORKSPACE_PATH; // output directory for the parsed file.
var TEST_SOLUTION_PATH; // name of the test solution.
var EXCLUDES; // list of files to be excluded
var INCLUDES; // all included folder
var FAIL_IF_INSTRUMENTATION_FAIL = false; // return error if processed file is not instrumented
var VERBOSE = false;
var REPORT_PATH;

// process and validate the input arguments
processInputArgs(process.argv.slice(2));

var ccScopePath = TEST_SOLUTION_PATH.replace(TEMP_WORKSPACE, WORKSPACE_PATH)  + '/codeCoverageReporting.js';
if (!ccScopePath) {
	throw new Error('Path to test solution cannot be determined');
}
log('Path to test solution: ' + ccScopePath);

var reportPath = REPORT_PATH.replace(/\\/g, '/');
fs.readFile(ccScopePath, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  fs.writeFile(ccScopePath, data.replace(/@reportPath@/g, reportPath), 'utf8', function (err) {
     if (err) return console.log(err);
  });
});

//Create writeStream for the scope.codeCoverageReporting.js file that processJSFile will write to
var ccScopeWriteStream = fs.createWriteStream(ccScopePath, { flags: 'a', encoding: 'utf-8', mode: 0666 });

var jsFilesToProcess = []; // the list of js files in workspace
// 1 get all js files in directory.
buildListOfFilesToProcess(TEMP_WORKSPACE, jsFilesToProcess);

//2 edit all js files in directory.
processJSFile();

function errorHandler(err) {
	if(err) {
	    console.error(err);
	}
}

/**
 * log verbose messages
 * */
function log(msg) {
	if (VERBOSE) {
		console.log(msg);
	}
}

/**
 * Process the input arguments
 */
function processInputArgs(args) {
	for (var i = 0; i < args.length; i++) {
		if (!isArgument(args[i])) {
			continue;
		}
		
		switch (args[i]) {
			case '--x': // exclude
				if (!args[i + 1] || isArgument(args[i + 1]) || args[i + 1] === "${instrument.exclude.modules}") {
					log("must specify a list of folder names after option --x. Exclude will be ignored");
					break;
				}
				/** @type {String} */
				var excludes = args[i + 1].split(',');
				var excludedFile;
				for (var x = 0; x < excludes.length; x++) {
					excludedFile = excludes[x].trim();
					if (!EXCLUDES) {
						log('init exclude');
						EXCLUDES = { };
					}
					log('exclude ' + excludedFile);
					EXCLUDES[excludedFile] = -1;
				}
				// utils.stringTrim(textString)
				break;
			case '--e': // fail if instrumentation fails
				var value = args[i + 1];
				if (value === 'true') {
					FAIL_IF_INSTRUMENTATION_FAIL = true;
					log('FAIL IF INSTRUMENTATION FAILS ' + FAIL_IF_INSTRUMENTATION_FAIL);
				} else if (value === 'false') {
					FAIL_IF_INSTRUMENTATION_FAIL = false;
				} else {
					throw new Error(value + ' is not a valid value for argument ' + args[i] + '. value must be true or false ! run node ServoyParser.js --help for help');
				}
				break;
			case '--i': // include arguments
				if (!args[i + 1] || isArgument(args[i + 1]) || args[i + 1] == "${instrument.include.modules}") {
					log("must specify a list of folder names after option --i. Include will be ignored");
					break;
				}
				/** @type {String} */
				var includes = args[i + 1].split(',');
				var includedFile;
				for (var j = 0; j < includes.length; j++) {
					includedFile = includes[j].trim();
					if (!INCLUDES) {
						log('init includes');
						INCLUDES = { };
					}
					log('include ' + includedFile);
					INCLUDES[includedFile] = -1;
				}
				break;
			case '--tsp': // test solution path
				TEST_SOLUTION_PATH = args[i + 1];
				break;
			case '--rp': // report path
				REPORT_PATH = args[i + 1];
				break;
			case '--d': // input directory
				WORKSPACE = args[i + 1];
				TEMP_WORKSPACE = path.resolve(args[i + 2]);
				WORKSPACE_PATH = path.resolve(WORKSPACE);
				break;
			case '--v': // Verbose logging
				var valueVerbose = args[i + 1];
				if (valueVerbose == 'true') {
					VERBOSE = true;
					log('Verbose logging');
				} else if (valueVerbose == 'false') {
					VERBOSE = false;
				}
				break;
			case '--h': //show help menu
				console.log(HELP);
				process.exit(1);
				break;
			default:
				throw new Error(args[i] + ' is not a valid argument !');
		}
	}
}

/**
 * is string an argument
 */
function isArgument(arg) {
	if (!arg) {
		return false;
	}
	return arg.slice(0, 2) === '--';
}

/**
 * Adds all the .js files that are included and not excluded to the fileList array
 */
function buildListOfFilesToProcess(dir, fileList) {
	if (!dir) {
		console.error("Directory 'dir' is undefined or NULL");
		return;
	}
	if (!fileList) {
		console.error("Variable 'fileList' is undefined or NULL.");
		return;
	}
	
	var files = fs.readdirSync(dir);
	for (var i in files) {
		if (!files.hasOwnProperty(i)) {
			continue;
		}
		
		var filePath = dir + path.sep + files[i];
		
		if (isFileExcluded(files[i])) { // skip the file or folder if is listed in the excluded files
			log('Skipping excluded file: ' + files[i]);
			continue;
		}
		
		if (fs.statSync(filePath).isDirectory()) { // search files in directory
			if (files[i] == 'medias') { // skip files in medias folder.
				continue;
			}
			
			buildListOfFilesToProcess(filePath, fileList);
		} else if (fs.statSync(filePath).isFile()) {
			if (!filePath.endsWith('.js')) { //Exclude non-js files
				continue;
			}
			
			if (!isFileIncluded(filePath)) { // if one of parent directory of file is not in INCLUDED list skip the file
				log('file ' + filePath + ' is not in the included list');
				continue;
			}
			
			fileList[fileList.length] = filePath; //Add file to list
		}
	}
}

/**
 * returns true if the file or folder is included in the list of excluded files given by the argument --x
 */
function isFileExcluded(fileName) {
	if (!EXCLUDES) {
		return false;
	}
	return EXCLUDES.hasOwnProperty(fileName);
}

/**
 * returns true if the folder is included in the list of included files given by the argument --i
 */
function isFileIncluded(filePath) {
	if (!INCLUDES) {
		return true;
	}
	var paths = filePath.split(path.sep);
	for (var i = WORKSPACE_PATH.split(path.sep).length; i < paths.length; i++) {
		if (INCLUDES.hasOwnProperty(paths[i])) {
			return true;
		}
	}
	return false;
}

/**
 * Process a .js file from the jsFilesToProcess array one at a time. The process does the following things:
 * 1. make the .js file valid for Servoy again after instrumentation by Istanbul, by wrapping the code added by Istanbul at the top of each .js file in a iife with proper JSDoc
 * 2. write the 'init' code for each .js file into the codeCoverageReporting.js scope file in the test solution, to allow forcing all .js files to be included in the Code Coverage report
 */
function processJSFile() {
	var inFilePath = jsFilesToProcess.pop();
	var outFilePath = WORKSPACE_PATH + inFilePath.substring(TEMP_WORKSPACE.length);
	log('processing file: ' + outFilePath);

	// TODO bad performance. read all file in once.
	// copy the content into a different file.
	fs.readFile(inFilePath, { flags: "r", encoding: 'utf8', mode: 0666 }, function(err, data) {
		if (err) {
			throw new Error(err);
		}

		if (data.substring(0, 11) === '\nvar __cov_' && data.search('__coverage__') !== -1) {
			/*
			 * Istanbul adds the following code at the top of each instrumented file:
			 * 
			 * 
			 * var __cov_OQM1Zv_fD$FYkYtAaXevrA = (Function('return this'))();
			 * if (!__cov_OQM1Zv_fD$FYkYtAaXevrA.__coverage__) { __cov_OQM1Zv_fD$FYkYtAaXevrA.__coverage__ = {}; }
			 * __cov_OQM1Zv_fD$FYkYtAaXevrA = __cov_OQM1Zv_fD$FYkYtAaXevrA.__coverage__;
			 * if (!(__cov_OQM1Zv_fD$FYkYtAaXevrA['C:\\Program Files (x86)\\Jenkins\\Paragon\\paragon\\datasources\\pcd\\item_calculations.js'])) {
			 *    __cov_OQM1Zv_fD$FYkYtAaXevrA['C:\\Program Files (x86)\\Jenkins\\Paragon\\paragon\\datasources\\pcd\\item_calculations.js'] = {"path":"C:\\Program Files (x86)\\Jenkins\\Paragon\\paragon\\datasources\\pcd\\item_calculations.js","s":{"1":1,"2":0,"3":0,"4":1,"5":0,"6":1,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0,"14":1,"15":0,"16":1,"17":0,"18":0,"19":0,"20":0,"21":0,"22":0,"23":0,"24":1,"25":0,"26":1,"27":0,"28":1,"29":1,"30":0,"31":0,"32":0,"33":1,"34":0,"35":0,"36":0,"37":1,"38":0,"39":0,"40":0,"41":1,"42":0,"43":0,"44":0,"45":0,"46":0,"47":0,"48":1,"49":0,"50":1,"51":0,"52":0,"53":0,"54":1,"55":0,"56":0,"57":0,"58":0,"59":0,"60":0,"61":0,"62":0,"63":1,"64":0,"65":1,"66":1,"67":0,"68":0,"69":0,"70":1,"71":1,"72":0,"73":0,"74":0,"75":0,"76":0,"77":0,"78":0,"79":0,"80":0,"81":0,"82":0,"83":0,"84":0,"85":0,"86":0,"87":0,"88":0,"89":0,"90":0,"91":0,"92":0,"93":0,"94":0},"b":{"1":[0,0],"2":[0,0],"3":[0,0],"4":[0,0],"5":[0,0],"6":[0,0],"7":[0,0],"8":[0,0],"9":[0,0],"10":[0,0],"11":[0,0],"12":[0,0],"13":[0,0],"14":[0,0],"15":[0,0],"16":[0,0],"17":[0,0],"18":[0,0],"19":[0,0],"20":[0,0],"21":[0,0],"22":[0,0],"23":[0,0],"24":[0,0]},"f":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0,"17":0,"18":0,"19":0,"20":0},"fnMap":{"1":{"name":"unreserved_stock","line":7,"loc":{"start":{"line":7,"column":0},"end":{"line":8,"column":0}}},"2":{"name":"wip_purchase","line":18,"loc":{"start":{"line":18,"column":0},"end":{"line":19,"column":0}}},"3":{"name":"display_type","line":26,"loc":{"start":{"line":26,"column":0},"end":{"line":27,"column":0}}},"4":{"name":"defining_values","line":42,"loc":{"start":{"line":42,"column":0},"end":{"line":43,"column":0}}},"5":{"name":"display_item_type","line":50,"loc":{"start":{"line":50,"column":0},"end":{"line":50,"column":29}}},"6":{"name":"getnoteicon","line":66,"loc":{"start":{"line":66,"column":0},"end":{"line":66,"column":23}}},"7":{"name":"calc_sequence","line":73,"loc":{"start":{"line":73,"column":0},"end":{"line":73,"column":25}}},"8":{"name":"tempidfield","line":80,"loc":{"start":{"line":80,"column":0},"end":{"line":80,"column":23}}},"9":{"name":"tempcostfield","line":87,"loc":{"start":{"line":87,"column":0},"end":{"line":87,"column":25}}},"10":{"name":"calc_cost","line":97,"loc":{"start":{"line":97,"column":0},"end":{"line":97,"column":21}}},"11":{"name":"uom_enter","line":109,"loc":{"start":{"line":109,"column":0},"end":{"line":109,"column":20}}},"12":{"name":"calc_price","line":121,"loc":{"start":{"line":121,"column":0},"end":{"line":121,"column":22}}},"13":{"name":"quantity","line":134,"loc":{"start":{"line":134,"column":0},"end":{"line":134,"column":20}}},"14":{"name":"shortlongdesc","line":141,"loc":{"start":{"line":141,"column":0},"end":{"line":141,"column":25}}},"15":{"name":"treeimageval","line":152,"loc":{"start":{"line":152,"column":0},"end":{"line":152,"column":24}}},"16":{"name":"isexpanded","line":171,"loc":{"start":{"line":171,"column":0},"end":{"line":171,"column":21}}},"17":{"name":"isSelected","line":178,"loc":{"start":{"line":178,"column":0},"end":{"line":178,"column":22}}},"18":{"name":"displayshortdesc","line":186,"loc":{"start":{"line":186,"column":0},"end":{"line":186,"column":28}}},"19":{"name":"checkbox","line":197,"loc":{"start":{"line":197,"column":0},"end":{"line":197,"column":20}}},"20":{"name":"display_item_dims","line":204,"loc":{"start":{"line":204,"column":0},"end":{"line":204,"column":28}}}},"statementMap":{"1":{"start":{"line":7,"column":0},"end":{"line":11,"column":1}},"2":{"start":{"line":9,"column":1},"end":{"line":9,"column":83}},"3":{"start":{"line":10,"column":1},"end":{"line":10,"column":48}},"4":{"start":{"line":18,"column":0},"end":{"line":21,"column":1}},"5":{"start":{"line":20,"column":1},"end":{"line":20,"column":54}},"6":{"start":{"line":26,"column":0},"end":{"line":37,"column":1}},"7":{"start":{"line":28,"column":1},"end":{"line":28,"column":16}},"8":{"start":{"line":29,"column":1},"end":{"line":29,"column":67}},"9":{"start":{"line":30,"column":1},"end":{"line":35,"column":2}},"10":{"start":{"line":31,"column":2},"end":{"line":31,"column":26}},"11":{"start":{"line":32,"column":2},"end":{"line":34,"column":3}},"12":{"start":{"line":33,"column":3},"end":{"line":33,"column":27}},"13":{"start":{"line":36,"column":1},"end":{"line":36,"column":24}},"14":{"start":{"line":42,"column":0},"end":{"line":45,"column":1}},"15":{"start":{"line":44,"column":1},"end":{"line":44,"column":9}},"16":{"start":{"line":50,"column":0},"end":{"line":61,"column":1}},"17":{"start":{"line":52,"column":1},"end":{"line":52,"column":16}},"18":{"start":{"line":53,"column":1},"end":{"line":53,"column":67}},"19":{"start":{"line":54,"column":1},"end":{"line":59,"column":2}},"20":{"start":{"line":55,"column":2},"end":{"line":55,"column":26}},"21":{"start":{"line":56,"column":2},"end":{"line":58,"column":3}},"22":{"start":{"line":57,"column":3},"end":{"line":57,"column":27}},"23":{"start":{"line":60,"column":1},"end":{"line":60,"column":24}},"24":{"start":{"line":66,"column":0},"end":{"line":68,"column":1}},"25":{"start":{"line":67,"column":1},"end":{"line":67,"column":66}},"26":{"start":{"line":73,"column":0},"end":{"line":75,"column":1}},"27":{"start":{"line":74,"column":1},"end":{"line":74,"column":10}},"28":{"start":{"line":80,"column":0},"end":{"line":82,"column":1}},"29":{"start":{"line":87,"column":0},"end":{"line":92,"column":1}},"30":{"start":{"line":88,"column":1},"end":{"line":91,"column":19}},"31":{"start":{"line":90,"column":3},"end":{"line":90,"column":61}},"32":{"start":{"line":91,"column":8},"end":{"line":91,"column":19}},"33":{"start":{"line":97,"column":0},"end":{"line":104,"column":1}},"34":{"start":{"line":99,"column":1},"end":{"line":102,"column":19}},"35":{"start":{"line":101,"column":3},"end":{"line":101,"column":61}},"36":{"start":{"line":102,"column":8},"end":{"line":102,"column":19}},"37":{"start":{"line":109,"column":0},"end":{"line":116,"column":1}},"38":{"start":{"line":110,"column":1},"end":{"line":115,"column":2}},"39":{"start":{"line":111,"column":2},"end":{"line":111,"column":52}},"40":{"start":{"line":114,"column":2},"end":{"line":114,"column":11}},"41":{"start":{"line":121,"column":0},"end":{"line":129,"column":1}},"42":{"start":{"line":122,"column":1},"end":{"line":122,"column":163}},"43":{"start":{"line":123,"column":1},"end":{"line":123,"column":142}},"44":{"start":{"line":124,"column":1},"end":{"line":124,"column":20}},"45":{"start":{"line":125,"column":1},"end":{"line":127,"column":2}},"46":{"start":{"line":126,"column":2},"end":{"line":126,"column":50}},"47":{"start":{"line":128,"column":1},"end":{"line":128,"column":34}},"48":{"start":{"line":134,"column":0},"end":{"line":136,"column":1}},"49":{"start":{"line":135,"column":1},"end":{"line":135,"column":10}},"50":{"start":{"line":141,"column":0},"end":{"line":147,"column":1}},"51":{"start":{"line":142,"column":1},"end":{"line":146,"column":2}},"52":{"start":{"line":143,"column":1},"end":{"line":143,"column":71}},"53":{"start":{"line":145,"column":2},"end":{"line":145,"column":136}},"54":{"start":{"line":152,"column":0},"end":{"line":166,"column":1}},"55":{"start":{"line":153,"column":1},"end":{"line":153,"column":16}},"56":{"start":{"line":154,"column":1},"end":{"line":164,"column":2}},"57":{"start":{"line":155,"column":2},"end":{"line":155,"column":33}},"58":{"start":{"line":158,"column":2},"end":{"line":158,"column":38}},"59":{"start":{"line":159,"column":2},"end":{"line":163,"column":3}},"60":{"start":{"line":160,"column":3},"end":{"line":160,"column":69}},"61":{"start":{"line":162,"column":3},"end":{"line":162,"column":35}},"62":{"start":{"line":165,"column":1},"end":{"line":165,"column":43}},"63":{"start":{"line":171,"column":0},"end":{"line":173,"column":1}},"64":{"start":{"line":172,"column":1},"end":{"line":172,"column":9}},"65":{"start":{"line":178,"column":0},"end":{"line":181,"column":2}},"66":{"start":{"line":186,"column":0},"end":{"line":192,"column":1}},"67":{"start":{"line":187,"column":1},"end":{"line":191,"column":2}},"68":{"start":{"line":188,"column":2},"end":{"line":188,"column":26}},"69":{"start":{"line":190,"column":2},"end":{"line":190,"column":11}},"70":{"start":{"line":197,"column":0},"end":{"line":199,"column":1}},"71":{"start":{"line":204,"column":0},"end":{"line":237,"column":1}},"72":{"start":{"line":205,"column":1},"end":{"line":205,"column":24}},"73":{"start":{"line":206,"column":1},"end":{"line":206,"column":32}},"74":{"start":{"line":207,"column":1},"end":{"line":209,"column":2}},"75":{"start":{"line":208,"column":2},"end":{"line":208,"column":12}},"76":{"start":{"line":210,"column":1},"end":{"line":235,"column":2}},"77":{"start":{"line":211,"column":2},"end":{"line":211,"column":54}},"78":{"start":{"line":212,"column":2},"end":{"line":227,"column":3}},"79":{"start":{"line":213,"column":3},"end":{"line":213,"column":92}},"80":{"start":{"line":214,"column":3},"end":{"line":214,"column":84}},"81":{"start":{"line":215,"column":3},"end":{"line":215,"column":81}},"82":{"start":{"line":216,"column":3},"end":{"line":223,"column":4}},"83":{"start":{"line":217,"column":4},"end":{"line":222,"column":5}},"84":{"start":{"line":218,"column":5},"end":{"line":218,"column":12}},"85":{"start":{"line":219,"column":5},"end":{"line":219,"column":22}},"86":{"start":{"line":221,"column":5},"end":{"line":221,"column":15}},"87":{"start":{"line":224,"column":3},"end":{"line":226,"column":4}},"88":{"start":{"line":225,"column":4},"end":{"line":225,"column":56}},"89":{"start":{"line":228,"column":2},"end":{"line":230,"column":3}},"90":{"start":{"line":229,"column":4},"end":{"line":229,"column":49}},"91":{"start":{"line":231,"column":2},"end":{"line":233,"column":3}},"92":{"start":{"line":232,"column":3},"end":{"line":232,"column":11}},"93":{"start":{"line":234,"column":2},"end":{"line":234,"column":34}},"94":{"start":{"line":236,"column":1},"end":{"line":236,"column":22}}},"branchMap":{"1":{"line":10,"type":"cond-expr","locations":[{"start":{"line":10,"column":28},"end":{"line":10,"column":43}},{"start":{"line":10,"column":44},"end":{"line":10,"column":48}}]},"2":{"line":32,"type":"if","locations":[{"start":{"line":32,"column":2},"end":{"line":32,"column":2}},{"start":{"line":32,"column":2},"end":{"line":32,"column":2}}]},"3":{"line":32,"type":"binary-expr","locations":[{"start":{"line":32,"column":6},"end":{"line":32,"column":28}},{"start":{"line":32,"column":32},"end":{"line":32,"column":57}}]},"4":{"line":56,"type":"if","locations":[{"start":{"line":56,"column":2},"end":{"line":56,"column":2}},{"start":{"line":56,"column":2},"end":{"line":56,"column":2}}]},"5":{"line":56,"type":"binary-expr","locations":[{"start":{"line":56,"column":6},"end":{"line":56,"column":28}},{"start":{"line":56,"column":32},"end":{"line":56,"column":57}}]},"6":{"line":88,"type":"if","locations":[{"start":{"line":88,"column":1},"end":{"line":88,"column":1}},{"start":{"line":88,"column":1},"end":{"line":88,"column":1}}]},"7":{"line":99,"type":"if","locations":[{"start":{"line":99,"column":1},"end":{"line":99,"column":1}},{"start":{"line":99,"column":1},"end":{"line":99,"column":1}}]},"8":{"line":110,"type":"if","locations":[{"start":{"line":110,"column":1},"end":{"line":110,"column":1}},{"start":{"line":110,"column":1},"end":{"line":110,"column":1}}]},"9":{"line":122,"type":"cond-expr","locations":[{"start":{"line":122,"column":61},"end":{"line":122,"column":99}},{"start":{"line":122,"column":102},"end":{"line":122,"column":163}}]},"10":{"line":123,"type":"cond-expr","locations":[{"start":{"line":123,"column":79},"end":{"line":123,"column":113}},{"start":{"line":123,"column":116},"end":{"line":123,"column":142}}]},"11":{"line":125,"type":"if","locations":[{"start":{"line":125,"column":1},"end":{"line":125,"column":1}},{"start":{"line":125,"column":1},"end":{"line":125,"column":1}}]},"12":{"line":128,"type":"cond-expr","locations":[{"start":{"line":128,"column":21},"end":{"line":128,"column":32}},{"start":{"line":128,"column":33},"end":{"line":128,"column":34}}]},"13":{"line":142,"type":"if","locations":[{"start":{"line":142,"column":1},"end":{"line":142,"column":1}},{"start":{"line":142,"column":1},"end":{"line":142,"column":1}}]},"14":{"line":154,"type":"if","locations":[{"start":{"line":154,"column":1},"end":{"line":154,"column":1}},{"start":{"line":154,"column":1},"end":{"line":154,"column":1}}]},"15":{"line":159,"type":"if","locations":[{"start":{"line":159,"column":2},"end":{"line":159,"column":2}},{"start":{"line":159,"column":2},"end":{"line":159,"column":2}}]},"16":{"line":160,"type":"cond-expr","locations":[{"start":{"line":160,"column":27},"end":{"line":160,"column":46}},{"start":{"line":160,"column":49},"end":{"line":160,"column":69}}]},"17":{"line":187,"type":"if","locations":[{"start":{"line":187,"column":1},"end":{"line":187,"column":1}},{"start":{"line":187,"column":1},"end":{"line":187,"column":1}}]},"18":{"line":207,"type":"if","locations":[{"start":{"line":207,"column":1},"end":{"line":207,"column":1}},{"start":{"line":207,"column":1},"end":{"line":207,"column":1}}]},"19":{"line":212,"type":"if","locations":[{"start":{"line":212,"column":2},"end":{"line":212,"column":2}},{"start":{"line":212,"column":2},"end":{"line":212,"column":2}}]},"20":{"line":216,"type":"if","locations":[{"start":{"line":216,"column":3},"end":{"line":216,"column":3}},{"start":{"line":216,"column":3},"end":{"line":216,"column":3}}]},"21":{"line":217,"type":"if","locations":[{"start":{"line":217,"column":4},"end":{"line":217,"column":4}},{"start":{"line":217,"column":4},"end":{"line":217,"column":4}}]},"22":{"line":224,"type":"if","locations":[{"start":{"line":224,"column":3},"end":{"line":224,"column":3}},{"start":{"line":224,"column":3},"end":{"line":224,"column":3}}]},"23":{"line":228,"type":"if","locations":[{"start":{"line":228,"column":2},"end":{"line":228,"column":2}},{"start":{"line":228,"column":2},"end":{"line":228,"column":2}}]},"24":{"line":231,"type":"if","locations":[{"start":{"line":231,"column":2},"end":{"line":231,"column":2}},{"start":{"line":231,"column":2},"end":{"line":231,"column":2}}]}}};
			 * }
			 * __cov_OQM1Zv_fD$FYkYtAaXevrA = __cov_OQM1Zv_fD$FYkYtAaXevrA['C:\\Program Files (x86)\\Jenkins\\Paragon\\paragon\\datasources\\pcd\\item_calculations.js'];		
			 * 
			 * There are several reasons why this doesn't work within Servoy
			 * 1: Since JSdoc is missing, Servoy chokes on this. 
			 * 2: if a file is not touched @runtime when the tests are ran, the code will not be invokes and the file will be missing from the coverage report
			 * 3: the added variables are not allowed in calculation and entity method .js files
			 * 
			 * The processing rewrites the added init code so it becomes valid Servoy code, by adding JSDoc and wrapping the non-declarative code in a iife
			 * It also extracts the code the takes care of getting the .js file into the report and writes that to an open method in codeCoverageReporting.js scope
			 * 
			 * Taking the sourcecode an break up the init code into 4 bits
			 * bits[0]: entire Code Coverage init code
			 * bits[1]: declaration of the Code Coverage variable, f.e. __cov_OQM1Zv_fD$FYkYtAaXevrA
			 * bits[2]: Code Coverage variable name
			 * bits[3]: The code for updating the initial value of the Code Coverage variable
			 * bits[4]: The subset of the update code that sets a default value
			 * bits[5]: the fileName, surrounded by square brackets
			 */
			var bits =  /\s*(var (__cov_\S*).*)\n([\S\s]*(if \(!\(__cov.*(\[.*\])[\S\s]*)\n__cov_[\S\s]*.js'];)/g.exec(data);
			
			// Write init code to codeCoverageReporting.js (only for calculatiosn and entity method .js files as they cannot contain variables)
			if (inFilePath.indexOf(path.sep+'datasources'+path.sep) !== -1) {
				var src = bits[4].replace(new RegExp(bits[2].replace(/\$/g, '\\$'), 'g'), '__coverage__') + '\n';
				
//				TODO str.replace(/("\d+":)(1)/g, '$10') //Also resetting the baseline coverage info for functions to 0 
				ccScopeWriteStream.write(src);
			} 
			
			//If the last file is processed, 'close' the codeCoverageReporting.js file
			if (!jsFilesToProcess.length) {
				if(ccScopeWriteStream.bytesWritten > 0) {
					ccScopeWriteStream.end('}');
				} else {
					ccScopeWriteStream.end();
				}
			}
		
			// Update file content to previous content but with JSDoc and init code wrapped in an iife
			fs.open(outFilePath, "w", "0666", function(oerr, fd) {
				if (oerr) {
					throw new Error(oerr);
				}

				var fileBuffer;
				if (inFilePath.indexOf(path.sep+'datasources'+path.sep) !== -1) {
					/* Handle .js files for entity methods and calculations differently, as they cannot contain variables
					 * The ccInitCode will be pushed into codeCoverageReporting.js
					 * References to the __cov_xxxxx variable in the file itself will be replaced by a reference to the __coverage__ variable in the scopes.codeCoverageReporting
					 */
					fileBuffer = data.slice(data.indexOf('/*')).replace(new RegExp(bits[2].replace(/\$/g, '\\$'), 'g'), 'scopes.codeCoverageReporting.__coverage__' + bits[5]);
				} else {
					/* Add JSDoc to the __cov_xxxx variable
					 * Wrap the init code in a iife with JSDoc
					 * move all incrementers for scope variables (so they are not lost when Servoy gets a hold of the file): 
					 * 		instead of having '__cov_OQM1Zv_fD$FYkYtAaXevrA.s['x']++;' before the JSDoc block
					 * 		to before the value assignment like 'var myVar = (__cov_OQM1Zv_fD$FYkYtAaXevrA.s['x']++,null)||myValue'
					 */
					var WRAPPER_PRE = '(';
					var WRAPPER_POST = ',\'\')||';
					var WRAPPER_EQUAL = '=';
					var WRAPPER_UNDEFINED = 'undefined';
					
					var newContent = [
						'/**@properties={typeid:35,uuid:"' + uuid() + '",variableType:-4}*/',
						bits[1],
						'/**@properties={typeid:35,uuid:"' + uuid() + '",variableType:-4}*/var init' + bits[2] + ' = (function(){',
						bits[3],
						'}());'
					];
					
					/* Regex to find all scope variable declarations in a file
					 * m[0]: entire match from init code up to variable value
					 * m[1]: the init code
					 * m[2]: the ' = ' part of the value assignment if exists
					 */
					var varCCCodeRegex = /(__cov_[a-zA-Z0-9\$\_]*\.s\['(\d+)']\+\+;)(?:\s|\n\s*(?:\/{2}|\/?\*).*)*\/\*{2}(?:.*\n\s*\*\s*)*@properties={typeid:35,.*\n[\s\S]*?\*\/\s*var\s*[a-zA-z0-9\_\$]*(\s*=\s*)?/gm;
					var code = data.slice(bits[0].length);
					var m;
					var lastPosition = 0;
					
                    while ((m = varCCCodeRegex.exec(code)) !== null) {
                    	newContent[newContent.length] = code.slice(lastPosition, m.index); //Add all non-matched code since last match
						newContent[newContent.length] = code.slice(m.index + m[1].length, varCCCodeRegex.lastIndex); //Add matched code minus init code
						if (!m[3]) {
							newContent[newContent.length] = WRAPPER_EQUAL; //Add missing assignment operator on variables without value
						}
						newContent[newContent.length] = WRAPPER_PRE;
						newContent[newContent.length] = m[1].slice(0, -1); //Add varInitCode (and strip the semicolon at the end to make the code valid)
						newContent[newContent.length] = WRAPPER_POST;
						if (!m[3]) {
							newContent[newContent.length] = WRAPPER_UNDEFINED; //Add 'undefined' as value for variables without value
						}
                        lastPosition = varCCCodeRegex.lastIndex;
					}
                    newContent[newContent.length] = code.slice(lastPosition); //Add the remainder of the code in the file
						
					fileBuffer = new Buffer(newContent.join(''));
				}
				
				fs.write(fd, fileBuffer, 0, fileBuffer.length, null, function(werr) {
					if (werr) {
						throw new Error(werr);
					}
					fs.close(fd, function() {});
				});
			});
		}

		//process next file
		if (jsFilesToProcess.length) {
			processJSFile();
		}
	});
}