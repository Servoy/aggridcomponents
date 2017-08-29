var startDate;
// protractor --params.jsonDirectory=reports/cucumber_reports/ --params.screenshotDirectory=reports/screenshots/ --params.htmlDirectory=reports/html_reports/ config.servoy.js --disableChecks
var jsonDirectory = 'reports/cucumber_reports/';
exports.config = {
  seleniumAddress: 'http://127.0.0.1:4444/wd/hub',
  framework: 'custom',
  params: {
    screenshotDirectory: 'reports/screenshots/',
    htmlDirectory: 'reports/html_reports/',
    jsonDirectory: 'reports/cucumber_reports/'
  },
  // path relative to the current config file
  frameworkPath: require.resolve('protractor-cucumber-framework'),

  //  capabilities: {
  //     'browserName': 'firefox'/*,
  //     'chromeOptions': {
  //       'args': ['--headless', '--disable-gpu'],
  //       'mobileEmulation' : {
  //         'deviceName': 'Apple iPhone 6 Plus'
  //       }
  //     }*/
  //   },
  multiCapabilities: [{
    'browserName': 'chrome'
  }],

  // Spec patterns are relative to this directory.
  specs: [
    'features/sample_application/grouping.feature'
  ],

  cucumberOpts: {
    require: ['features/step_definitions/servoy_step_definitions.js',
      'env.js',
      'features/step_definitions/hooks.js'],
    tags: false,
    // format: 'pretty',
    format: ['json:reports/cucumber_reports/report.json', 'pretty'],
    profile: false,
    keepAlive: false,
    'no-source': true
  },

  beforeLaunch: () => {
    console.log('beforeLaunch');
    removeJsonReports(jsonDirectory);
    startDate = new Date();
  },

  onPrepare: () => {
    console.log('onPrepare');
    // browser.driver.manage().window().maximize();
    browser.driver.executeScript(function () {
      return {
        width: window.screen.availWidth,
        height: window.screen.availHeight
      };
    }).then(function (result) {
      browser.driver.manage().window().setSize(result.width, result.height);
    });
  },

  onComplete: () => {
    console.log('onComplete');
  },

  onCleanUp: () => {
    console.log('onCleanUp');
  },

  afterLaunch: () => {
    console.log('afterLaunch');
    console.log('Test(s) ended after: ' + ((new Date() - startDate) / 1000) + ' seconds.');
  },

};

function generateJsonReport() {
  var fs = require('fs');
  var proc = require('process');
  var json = fs.readFileSync(proc.cwd() + '//reports//cucumber_reports//report.json');
  var a = JSON.parse(json);
  var scenarioSucceeded = a.length;
  for (var x in a) {
    var duration = 0;
    var failed = 0;
    var succeeded = 0;
    var skipped = 0;
    var scenarioFailed = 0;

    console.log("Scenario: " + a[x].description);
    for (var y in a[x].events) {
      console.log("\tCucumber step: \t\t\t\t" + a[x].events[y].name);
      //bug in protractor, if it's skipped, the step still counts as passed
      if (a[x].events[y].durationMillis > 0) {//no check means an NaN error
        // console.log("\tCucumber step: \t\t\t\t" + a[x].events[y].name);
        console.log("\tSuccess/fail: \t\t\t\t" + a[x].events[y].emitterEvent);
        console.log("\tDuration cucumber step: \t\t" + a[x].events[y].durationMillis + " miliseconds");
      } else {
        console.log("\tCucumber step: \t\t\t\ttestSkipped");
        console.log("\tDuration cucumber step: \t\tN/A");
        skipped++;
      }

      console.log();
      if (a[x].events[y].durationMillis > 0) {
        duration += a[x].events[y].durationMillis;
      }
      if (a[x].events[y].emitterEvent == "testPass" && a[x].events[y].durationMillis > 0) { //a skipped test still counts as passed in protractors JSON results file
        succeeded++;
      } else if (a[x].events[y].emitterEvent == "testFail") {
        failed++;
        scenarioSucceeded--;
      }
    }
    console.log('\tCucumber steps passed:\t' + succeeded);
    console.log('\tCucumber steps failed:\t' + failed);
    console.log('\tCucumber steps skipped:\t' + skipped);
    console.log("\tScenario ended after: " + duration + " miliseconds");
    console.log();
  }
  console.log('Scenarios passed:\t' + scenarioSucceeded);
  console.log('Scenarios failed:\t' + (a.length - scenarioSucceeded));
}

function removeJsonReports(jsonDirectory) {
  var find = require('find');
  var fs = require('fs-extra');
  var files = find.fileSync(/\.json/, jsonDirectory);
  files.map(function (file) {
    fs.unlinkSync(file);
  });
}
