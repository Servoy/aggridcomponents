var rest = require('restler');
var protractor = require('protractor')
var defered = protractor.promise.defer();

var Rest = function() {
	this.setupScenario = function (url) {
        rest.get(url).on('complete', function (result) {
            if (result instanceof Error) {
                defered.reject(result.message)
            } else {
                defered.fulfill(result);
            }
        });
        return defered.promise;
    }
}
module.exports = Rest;