/**
 * Returns the configuration object of the current state of the pivot <br>
 * This object can be serialized and stored to restore the current settings <br>
 * using <code>setConfig</code>
 * 
 * @return {{aggregatorName: String}}
 */
$scope.api.getConfig = function() {
	if (!$scope.model.config) {
		return {};
	}
	return JSON.parse($scope.model.config);
}

/**
 * Sets the configuration object of the pivot
 * 
 * @return {Object}
 */
$scope.api.setConfig = function(config) {
	$scope.model.config = JSON.stringify(config);
}

/**
 * Returns filter entries excluded from the pivot as an object with the <br>
 * filter name being the property name holding an array of excluded entries
 * 
 * @return {Object<Array<String>>}
 */
$scope.api.getExclusions = function() {
	if ($scope.model.config) {
		return $scope.api.getConfig().exclusions;
	} else {
		return {};
	}
}

/**
 * Sets filter entries to be excluded from the pivot as an object with the <br>
 * filter name being the property name holding an array of excluded entries
 * 
 * @param {Object<Array<String>>} exclusions
 */
$scope.api.setExclusions = function(exclusions) {
	var config = $scope.api.getConfig();
	config.exclusions = exclusions;
	$scope.api.setConfig(config);
}

/**
 * Returns filter entries included in the pivot as an object with the <br>
 * filter name being the property name holding an array of included entries
 * 
 * @return {Object<Array<String>>}
 */
$scope.api.getInclusions = function() {
	if ($scope.model.config) {
		return $scope.api.getConfig().inclusions;
	} else {
		return {};
	}
}
	
/**
 * Sets filter entries to be included in the pivot as an object with the <br>
 * filter name being the property name holding an array of included entries
 * 
 * @param {Object<Array<String>>} inclusions
 */
$scope.api.setInclusions = function(inclusions) {
	var config = $scope.api.getConfig();
	config.inclusions = inclusions;
	$scope.api.setConfig(config);
}

/**
 * Returns the row filters of the pivot
 * 
 * @return {Array<String>}
 */
$scope.api.getRows = function() {
	if ($scope.model.config) {
		return $scope.api.getConfig().rows;
	} else {
		return [];
	}
}
	
/**
 * Sets the row filters of the pivot
 * 
 * @param {Array<String>} rows
 */
$scope.api.setRows = function(rows) {
	var config = $scope.api.getConfig();
	config.rows = rows;
	$scope.api.setConfig(config);
}

/**
 * Returns the value providers of the pivot
 * 
 * @return {Array<String>}
 */
$scope.api.getValues = function() {
	if ($scope.model.config) {
		return $scope.api.getConfig().vals;
	} else {
		return [];
	}
}
	
/**
 * Sets the value providers of the pivot
 * 
 * @param {Array<String>} values
 */
$scope.api.setValues = function(values) {
	var config = $scope.api.getConfig();
	config.vals = values;
	$scope.api.setConfig(config);
}

/**
 * Returns the column filters of the pivot
 * 
 * @return {Array<String>}
 */

$scope.api.getColumns = function() {
	if ($scope.model.config) {
		return $scope.api.getConfig().cols;
	} else {
		return [];
	}
}
	
/**
 * Sets the column filters of the pivot
 * 
 * @param {Array<String>} columns
 */
$scope.api.setColumns = function(columns) {
	var config = $scope.api.getConfig();
	config.cols = columns;
	$scope.api.setConfig(config);
}
	
/**
 * Sets the aggregator of the pivot<br>
 * 
 * Supported aggregators are 
 * <ul><li>Sum</li>
 * <li>Count</li>
 * <li>Count Unique Values</li>
 * <li>List Unique Values</li>
 * <li>Integer Sum</li>
 * <li>Average</li>
 * <li>Minimum</li>
 * <li>Maximum</li>
 * <li>First</li>
 * <li>Last</li>
 * <li>Sum over Sum</li>
 * <li>80% Upper Bound</li>
 * <li>80% Lower Bound</li>
 * <li>Sum as Fraction of Total</li>
 * <li>Sum as Fraction of Rows</li>
 * <li>Sum as Fraction of Columns</li>
 * <li>Count as Fraction of Total</li>
 * <li>Count as Fraction of Rows</li>
 * <li>Count as Fraction of Columns</li>
 * </ul>
 * 
 * @param {String} aggregatorName
 * @param {Object} arg
 */
$scope.api.setAggregator = function(aggregatorName, arg) {
	var config = $scope.api.getConfig();
	config.aggregatorName = aggregatorName;
	config.aggregatorArg = arg;
	$scope.api.setConfig(config);
}

/**
 * Returns the aggregator of the pivot
 * 
 * @return {String}
 */

$scope.api.getAggregator = function() {
	if ($scope.model.config) {
		return $scope.api.getConfig().aggregatorName;
	} else {
		return null;
	}
}