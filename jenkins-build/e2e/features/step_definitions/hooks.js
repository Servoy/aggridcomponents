var reporter = require('../../index');
var assertHtmlReports = require('../../assert/assertHtmlReports');
var path = require('path');
var fs = require('fs-extra');
var find = require('find');

var { defineSupportCode } = require('cucumber');

defineSupportCode(function ({ After, Before, registerHandler }) {

    Before(function (scenario, callback) {
        this.scenario = scenario;
        callback();
    });

    After({timeout: 20 * 1000}, function (scenario, callback) {
        if (scenario.isFailed()) {
            console.log('Scenario failed');
            var world = this;
            browser.takeScreenshot().then(function (buffer) {
                return world.attach(buffer, 'image/png');
            }).then(callback);
        } else {
            console.log('Scenario passed');
            callback();
        }
    });

    registerHandler('AfterFeatures', function (features, callback) {

        var theme = {
            hierarchy: 'hierarchy',
            bootstrap: 'bootstrap',
            foundation: 'foundation',
            simple: 'simple'
        };

        var outputDirectory = 'reports/html_reports/';
        // var jsonFile = 'reports/cucumber_reports/report.json';
        var jsonDir = 'reports/cucumber_reports/';

        function removeHtmlReports() {
            var files = find.fileSync(/\.html/, outputDirectory);
            files.map(function (file) {
                fs.unlinkSync(file);
            });
        }

        function getOptions(theme) {
            return {
                name: '@cucumber-html-reporter/*&!@#$%)(~<>`', //this tests for the sanitized hyperlinks on report, otherwise this should be plain text english
                theme: theme,
                output: path.join(outputDirectory, 'cucumber_report_' + theme + '.html'),
                reportSuiteAsScenarios: true,
                launchReport: false,
                storeScreenshots: true,
                screenshotsDirectory: 'screenshots/'/*,
                metadata: {
                    'App Version': '0.3.2',
                    'Test Environment': 'STAGING',
                    'Browser': 'Chrome  54.0.2840.98',
                    'Platform': 'Windows 10',
                    'Parallel': 'Scenarios',
                    'Executed': 'Remote'
                }*/
            };
        }

        function getJsonFileOptions(theme) {
            var options = getOptions(theme);
            options.jsonFile = jsonFile;
            return options;
        }

        function getJsonDirOptions(theme) {
            var options = getOptions(theme);
            options.jsonDir = jsonDir;
            return options;
        }

        function assertJsonFile() {

            //Generate Bootstrap theme report
            reporter.generate(getJsonFileOptions(theme.bootstrap));

            //assert reports
            assertHtmlReports(outputDirectory);
        }

        function assertJsonDir() {

            // Generate Bootstrap theme report
            reporter.generate(getJsonDirOptions(theme.bootstrap));

        }

        assertJsonDir();

        callback();
    });
});