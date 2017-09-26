angular.module('aggridenterpriselicensekey', ['servoy']).factory('$aggridenterpriselicensekey',[function() {
	return {
		setLicenseKey: function() {
			agGrid.LicenseManager.setLicenseKey("Servoy_Servoy_7Devs_1OEM_22_August_2018__MTUzNDg5MjQwMDAwMA==bf70d060fe7e90b9550a7821a54f6fa8");
		}
	}
}]);