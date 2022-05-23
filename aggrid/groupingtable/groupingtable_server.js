/**
 * @param {Array<Number>} groupColumns
 * @param {Array} groupKeys
 * @param {Array} idForFoundsets
 * @param {String} [sort]
 *
 * */
$scope.getGroupedFoundsetUUID = function(
	groupColumns, groupKeys, idForFoundsets, sort, sFilterModel, hasRowStyleClassDataprovider, sortColumn, sortColumnDirection) {
	log('START SERVER SIDE ------------------------------------------ ', LOG_LEVEL.WARN);

	// root is the parent
	var parentFoundset = $scope.model.myFoundset.foundset;
	
	// I need the full column/key mapping
	/** @type {QBSelect} */
	var query = parentFoundset.getQuery();

	//	console.log(query);

	var groupColumn;
	var groupColumnType;
	var groupDataprovider;

	var allGroupDataproviders = [];

	// TODO it cannot be empty !?!
	if (!groupColumns) groupColumns = [];
	if (!groupKeys) groupKeys = [];
	if (!idForFoundsets) {
		console.error("There are no idForFoundset to map to")
	}

	log("There are '" + groupColumns.length + "' groupColumns", LOG_LEVEL.WARN);
	for (var i = 0; i < groupColumns.length; i++) {
		var groupColumnIndex = groupColumns[i];

		// retrieve the grouping column
		groupDataprovider = $scope.model.columns[groupColumnIndex].dataprovider;
		allGroupDataproviders.push(groupDataprovider);
		log("Group on groupDataprovider " + groupDataprovider + " at index " + groupColumnIndex, LOG_LEVEL.WARN);
		//		console.log('group on ' + groupDataprovider);

		groupColumn = getQBColumnForDataprovider(query, groupDataprovider);
		groupColumnType = groupColumn.getTypeAsString();

		// where clause on the group column
		if (i < groupKeys.length) {
			var groupKey = groupKeys[i];
			log('The node is a sub-group of groupKey ' + groupKey, LOG_LEVEL.WARN);
			if(groupColumnType == 'DATETIME') {
				query.where.add(groupColumn.cast('date').eq(groupKey));
			}
			else {
				query.where.add(groupColumn.eq(groupKey));	
			}
		}

		if(sortColumn != undefined && sortColumn > -1) {
			var sortDataprovider = $scope.model.columns[sortColumn].dataprovider;
			var sortColumn = getQBColumnForDataprovider(query, sortDataprovider);

			query.sort.clear();
			if(sortColumnDirection === 'desc') {
				query.sort.add(sortColumn.desc);
			}
			else {
				query.sort.add(sortColumn.asc);
			}
		}
	}

	var isGroupQuery = groupColumns.length > groupKeys.length;
	var childFoundset;
	if (isGroupQuery) {
		query.result.clear();
		query.sort.clear();
		if(groupColumnType == 'DATETIME') {
			query.result.add(groupColumn.cast('date'), groupDataprovider);
			query.groupBy.add(groupColumn.cast('date'));

			if (sort === 'desc') {
				query.sort.add(groupColumn.cast('date').desc);
			} else {
				query.sort.add(groupColumn.cast('date').asc);
			}
		}
		else {
			query.result.add(groupColumn, groupDataprovider);
			query.groupBy.add(groupColumn);	

			if (sort === 'desc') {
				query.sort.add(groupColumn.desc);
			} else {
				query.sort.add(groupColumn.asc);
			}
		}
		query.result.add(groupColumn.count, "svycount");

		childFoundset = servoyApi.getViewFoundSet("", query);
	} else { // is not a new group, will be a leaf !
		childFoundset = parentFoundset.duplicateFoundSet();
		// remove foundset filters, those are already in the query!
		var foundsetFilters = childFoundset.getFoundSetFilterParams();
		for(var j = 0 ; j < foundsetFilters.length; j++) {
			childFoundset.removeFoundSetFilterParam(foundsetFilters[j][foundsetFilters[j].length - 1]);
		}
		
		if (sFilterModel) filterFoundset(childFoundset, sFilterModel);
		childFoundset.loadRecords(query);
	}

	// push dataproviders to the clientside foundset
	var dps = { };
	// FIXME this creates an issue
	log("There are " + $scope.model.columns.length + " columns and " + idForFoundsets.length + " idForFoundsets", LOG_LEVEL.WARN);
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		var column = $scope.model.columns[idx];
		// the dataprovider name e.g. orderid
		// var dpId = column.dataprovider;
		// the idForFoundset(exists only client-side, therefore i need to retrieve it from the client)
		var idForFoundset = idForFoundsets[idx];
		// Servoy resolves the real dataprovider name into the dataprovider 'field'
		// dps[idForFoundset] = dpId;
		// TODO it could be the hashmap of groupkeys/groupcolumns ?
		// dps._svyFoundsetUUID = null;

		if (column.hasOwnProperty("styleClassDataprovider")) {
			dps[idForFoundset + "_styleClassDataprovider"] = column.styleClassDataprovider;
		}

		if (column.hasOwnProperty("isEditableDataprovider")) {
			dps[idForFoundset + "_isEditableDataprovider"] = column.isEditableDataprovider;
		}

		if (column.hasOwnProperty("tooltip")) {
			dps[idForFoundset + "_tooltip"] = column.tooltip;
		}
	}
	try {
		// TODO implement rowStyleClassDataprovider
		if (hasRowStyleClassDataprovider === true) {
			dps["__rowStyleClassDataprovider"] = $scope.model.rowStyleClassDataprovider;
		}
		//		if ($scope.model.rowStyleClassDataprovider) {
		//			dps["__rowStyleClassDataprovider"] = $scope.model.rowStyleClassDataprovider;
		//		}
	} catch (e) {
		console.warn(e);
	}


	var columns = [];
	if(isGroupQuery) {
		for (var idx = 0; idx < $scope.model.columns.length; idx++) {
			if(allGroupDataproviders.indexOf($scope.model.columns[idx].dataprovider) != -1) {
				columns.push({
					dataprovider: $scope.model.columns[idx].dataprovider,
					format: $scope.model.columns[idx].format,
					valuelist: $scope.model.columns[idx].valuelist,
					id: $scope.model.columns[idx].id,
					styleClassDataprovider: $scope.model.columns[idx].styleClassDataprovider
				});
			} else {
				columns.push({
					dataprovider: $scope.model.columns[idx].dataprovider,
					id: $scope.model.columns[idx].id,
				});
			}
		}
		columns.push({
			dataprovider: 'svycount',
			id: 'svycount'
		});
	} else {
		for (var idx = 0; idx < $scope.model.columns.length; idx++) {
			columns.push({
				dataprovider: $scope.model.columns[idx].dataprovider,
				format: $scope.model.columns[idx].format,
				valuelist: $scope.model.columns[idx].valuelist,
				id: $scope.model.columns[idx].id,
				styleClassDataprovider: $scope.model.columns[idx].styleClassDataprovider
			});
		}
	}

	// TODO perhaps R&D can improve this
	// send the column mapping; clientside i don't have the dataprovider id name and server side i don't have the idForFoundset.
	$scope.model.hashedFoundsets.push({
		foundset: {
			foundset: childFoundset,
			dataproviders: dps,
			sendSelectionViewportInitially: false,
			initialPreferredViewPortSize: 15
		},
		foundsetUUID: childFoundset,
		columns: columns
	}); // send it to client as a foundset property with a UUID

	log('Group foundset retrieved' + $scope.model.hashedFoundsets[$scope.model.hashedFoundsets.length - 1], LOG_LEVEL.WARN);
	log('END SERVER SIDE QUERY --------------------------------------', LOG_LEVEL.WARN);

	return childFoundset; // return the UUID that points to this foundset (return type will make it UUID)
};

$scope.filterMyFoundset = function(sFilterModel, foundset) {
	if(sFilterModel) {
		var myFoundset;

		if(foundset) {
			myFoundset = foundset;
		} else {
			myFoundset = $scope.model.myFoundset.foundset;
			if(myFoundset.getRelationName()) {
				myFoundset = myFoundset.unrelate();
				$scope.model._internalUnrelatedMyFoundsetForFilter = {
					foundset: myFoundset
				}
				$scope.model.myFoundset.foundset = myFoundset;
			}
		}
	
		if (filterFoundset(myFoundset, sFilterModel)) {
			myFoundset.reloadWithFilters();
		}
	}
}

$scope.removeGroupedFoundsetUUID = function(parentFoundset) {
	for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
		var hashedFoundset = $scope.model.hashedFoundsets[i];
		if (hashedFoundset.foundsetUUID === parentFoundset) {
			//			console.log('found the parent foundset and removed ');
			$scope.model.hashedFoundsets.splice(i, 1);
			return true;
		}
	}
	return false;
}

/**
 * @private
 * @return {QBSelect}
 * */
function getQuery(foundset) {
	//	for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
	//		var hashedFoundset = $scope.model.hashedFoundsets[i];
	//		if (hashedFoundset.foundsetUUID === foundset) {
	//			return hashedFoundset.query;
	//		}
	//	}
	return foundset.getQuery();
}

/**
 * @param {QBSelect} query
 * @return {QBSelect}
 * */
function cloneQuery(query) {
	return query;
}

function getQBColumnForDataprovider(qbQuery, dataprovider) {
	var qbColumn;
	if (isRelatedDataprovider(dataprovider)) {
		// should search for all the relations (can be multiple level)

		var relationNames = getDataProviderRelations(dataprovider);
		var columnName = getDataProviderColumn(dataprovider);

		log('The dataprovider is a join on ' + columnName, LOG_LEVEL.WARN);

		var join = qbQuery;

		for (var j = 0; j < relationNames.length; j++) {
			var relationName = relationNames[j];
			log('Adding a join on relationName ' + relationName, LOG_LEVEL.WARN);

			// use unique name for multiple level relations
			var relationPath = relationNames.slice(0, j + 1).join("____");
			//				console.log(relationPath)
			// check if already has a relation
			var existingJoin = getJoin(join, relationPath);
			if (existingJoin) {
				join = existingJoin;
			} else {
				join = join.joins.add(relationName, relationPath);
			}
			join.joinType = QBJoin.LEFT_OUTER_JOIN;
		}

		qbColumn = join.getColumn(columnName);
	} else {
		qbColumn = qbQuery.getColumn(dataprovider);
	}

	return qbColumn;
}

/**
 * @param {String} dataProvider
 * @return {Array<String>}
 * @private
 *
 * @properties={typeid:24,uuid:"87D941E5-A21F-4E71-8ED5-0AD8AFD913C9"}
 */
function getDataProviderRelations(dataProvider) {
	var relationStack = dataProvider.split(".");
	return relationStack.slice(0, relationStack.length - 1);
}

/**
 * @param {String} dataProvider
 * @return {String}
 * @private
 *
 * @properties={typeid:24,uuid:"C1F7538D-355D-4215-A9A5-17E8DBFBC60A"}
 */
function getDataProviderColumn(dataProvider) {
	var relationStack = dataProvider.split(".");
	return relationStack[relationStack.length - 1];
}

/**
 * @param {String} dataProvider
 * @return {Boolean}
 * @private
 *
 * @properties={typeid:24,uuid:"C1F7538D-355D-4215-A9A5-17E8DBFBC60A"}
 */
function isRelatedDataprovider(dataProvider) {
	return dataProvider.split(".").length > 1;
}

/**
 * @param {QBSelect} query
 * @param {String} alias
 *
 * @return {QBJoin}
 * */
function getJoin(query, alias) {

	var joins = query.joins.getJoins();
	for (var i = 0; i < joins.length; i++) {
		var join = joins[i];
		if (join.getTableAlias() == alias) {
			return join;
		}
	}
	return null;
}

/**
 * @deprecated is not actually used
 * Generate an UUID
 *  */
function generateUUID() {
	function chr4() {
		return (new Date().getTime() * Math.random()).toString(16).slice(-4).toUpperCase();
	}
	return chr4() + chr4() + '-' + chr4() + '-' + chr4() + '-' + chr4() + '-' + chr4() + chr4() + chr4();
}

var LOG_LEVEL = {
	DEBUG: "debug",
	WARN: "warn",
	ERROR: "error"
}

/** 
 * @private 
 * @param {String} msg
 * @param {type} name
 * */
function log(msg, level) {
	
	// TODO change it to ERROR
	var logLevel = LOG_LEVEL.ERROR;

	switch (level) {
	case LOG_LEVEL.ERROR:
		console.error(msg);
		break;
	case LOG_LEVEL.WARN:
		if (logLevel == LOG_LEVEL.WARN || logLevel == LOG_LEVEL.DEBUG) {
			console.warn(msg);
		}
		break;
	case LOG_LEVEL.DEBUG:
	default:
		if (logLevel == LOG_LEVEL.DEBUG) {
			console.log(msg);
		}
		break;
	}
}

function filterFoundset(foundset, sFilterModel) {
	var shouldReloadWithFilters = false;

	var filterModel = JSON.parse(sFilterModel);

	if(foundset.removeFoundSetFilterParam("ag-groupingtable")) {
		shouldReloadWithFilters = true;
	}
	var isFilterSet = false;
	
	var query;
	if(servoyApi.getQuerySelect) {
		query = servoyApi.getQuerySelect(foundset.getDataSource());
	}
	else {
		// there is an issue in Servoy, that queries are not cleared after calling removeFoundSetFilterParam
		// until loadAllRecords is called
		foundset.loadAllRecords();
		query = foundset.getQuery();
	}

	for(var i = 0; i < $scope.model.columns.length; i++) {
		var dp = $scope.model.columns[i].dataprovider;
		var filter = filterModel[i];
		if(filter) {
			var op, value;
			var useNot = false;
			var useIgnoreCase = false;

			if(filter["filterType"] == "text") {
				useIgnoreCase = true;
				switch(filter["type"]) {
					case "equals":
						op = "eq";
						value = filter["filter"];
						break;
					case "notEqual":
						useNot = true;
						op = "eq";
						value = filter["filter"];
						break;
					case "startsWith":
						op = "like";
						value = filter["filter"] + "%";
						break;
					case "endsWith":
						op = "like";
						value = "%" + filter["filter"];
						break;				
					case "contains":
						op = "like";
						value = "%" + filter["filter"] + "%";
						break;		
					case "notContains":
						useNot = true;
						op = "like";
						value = "%" + filter["filter"] + "%";
						break;	
				}
			}
			else if(filter["filterType"] == "number") {
				value = filter["filter"];
				switch(filter["type"]) {
					case "equals":
						op = "eq";
						break;
					case "notEqual":
						useNot = true;
						op = "eq";
						break;
					case "greaterThan":
						op = "gt";
						break;
					case "greaterThanOrEqual":
						op = "ge";
						break;
					case "lessThan":
						op = "lt";
						break;
					case "lessThanOrEqual":
						op = "le";
						break;
					case "inRange":
						op = "between";
						value = new Array();
						value.push(filter["filter"]);
						value.push(filter["filterTo"]);
						break;
				}
			}
			else if(filter["filterType"] == "date") {
				value = filter["dateFrom"].split(" ")[0];
				switch(filter["type"]) {
					case "notEqual":
						useNot = true;
					case "equals":
						op = "between";
						var dateFromSplit = value.split("-");
						var dateFromD = new Date(dateFromSplit[0], dateFromSplit[1] - 1, dateFromSplit[2]);
						var dateToD = new Date(dateFromD.getTime());
						dateToD.setDate(dateToD.getDate() + 1);
						var dateToDTime = dateToD.getTime();
						dateToD.setTime(dateToDTime - 1);
						value = new Array();
						value.push(dateFromD);
						value.push(dateToD);
						break;
					case "greaterThan":
						op = "gt";
						break;
					case "lessThan":
						op = "lt";
						break;
					case "inRange":
						op = "between";
						value = new Array();
						value.push(filter["dateFrom"].split(" ")[0]);
						value.push(filter["dateTo"].split(" ")[0]);
					break;
				}
			}

			if(op != undefined && value != undefined) {
				var whereClause = null;
				var aDP = dp.split('.');
				for(var j = 0; j < aDP.length - 1; j++) {
					whereClause = whereClause == null ? query.joins[aDP[j]] : whereClause.joins[aDP[j]];
				}

				whereClause = whereClause == null ? query.columns[aDP[aDP.length - 1]] : whereClause.columns[aDP[aDP.length - 1]];

				if(useIgnoreCase) {
					whereClause = whereClause["lower"];
					value = value.toLowerCase();
				}
				if(useNot) {
					whereClause = whereClause["not"];
				}
				whereClause = op == "between" ? whereClause[op](value[0], value[1]) : whereClause[op](value);
				if(!isFilterSet) isFilterSet = true;
				query.where.add(whereClause);
			}
		}
	}

	if(isFilterSet) {
		foundset.addFoundSetFilterParam(query, "ag-groupingtable");
		shouldReloadWithFilters = true;
	}

	return shouldReloadWithFilters;
}

/**
 * Table column API
 */

 /**
 * Gets the number of columns
 * 
 * @example
 *	%%prefix%%%%elementName%%.getColumnsCount()
 */ 
$scope.api.getColumnsCount = function() {
    return $scope.model.columns ? $scope.model.columns.length : 0;
}

/**
 * Gets the column at index. Index is 0 based.
 * 
 * @param index index between 0 and columns length -1
 * 
 * @example
 *	%%prefix%%%%elementName%%.getColumn()
 *	
 * @return {column}
 */ 
$scope.api.getColumn = function(index) {
	if($scope.model.columns && index >= 0 && index < $scope.model.columns.length) {
		return $scope.model.columns[index];
	}
	return null;
}

/**
 * Adds new column at specified index. Index is 0 based.
 * 
 * @param dataproviderid dataprovider of the column
 * @param index index between 0 and columns length
 * 
 * @example
 *	var column = %%prefix%%%%elementName%%.newColumn('dataproviderid')
 *
 *	@return {column}
 */
$scope.api.newColumn = function(dataproviderid,index) {
	 if (!$scope.model.columns) $scope.model.columns = [];
	 var insertPosition = (index == undefined) ? $scope.model.columns.length : ((index == -1 || index > $scope.model.columns.length) ? $scope.model.columns.length : index);
	 for(var i = $scope.model.columns.length; i > insertPosition; i--) {
		  $scope.model.columns[i] = $scope.model.columns[i - 1]; 
	 }
	 $scope.model.columns[insertPosition] = {
		 'dataprovider': dataproviderid,
		 'visible': true,
		 'width': 0,
		 'enableRowGroup': true,
		 'enableSort': true,
		 'enableResize': true,
		 'enableToolPanel': true,
		 'autoResize': true,
		 'rowGroupIndex': -1
		};
	 return $scope.model.columns[insertPosition];
}

/**
 * Removes column from specified index. Index is 0 based.
 *
 * @example
 * %%prefix%%%%elementName%%.removeColumn(0)
 *
 * @param index index between 0 and columns length -1
 * 
 * @return {boolean}
 */
$scope.api.removeColumn = function(index) {
	if($scope.model.columns && index >= 0 && index < $scope.model.columns.length) {
		for(var i = index; i < $scope.model.columns.length - 1; i++) {
			$scope.model.columns[i] = $scope.model.columns[i + 1];
		}
		$scope.model.columns.length = $scope.model.columns.length - 1;
		return true;
	}
	return false;
}

/**
 * Removes all columns.
 *
 * @example
 * %%prefix%%%%elementName%%.removeAllColumns()
 *
 * @return {boolean}
 */
$scope.api.removeAllColumns = function() {
	   if($scope.model.columns && $scope.model.columns.length > 0) {
		   $scope.model.columns.length = 0;
		   return true;
	   }
	   return false;
}

/**
 * Restore columns state to a previously save one, using getColumnState.
 * If no argument is used, it restores the columns to designe time state.
 * If the columns from columnState does not match with the columns of the component,
 * no restore will be done. The optional boolean arguments: columns, filter, sort can
 * be used to specify what to restore, the columns size/position/visibility (default true),
 * the filter state (default false), the sort state (default false).
 * 
 * @param {String} columnState
 * @param {Function} onError
 * @param {Boolean} columns
 * @param {Boolean} filter
 * @param {Boolean} sort
 */
$scope.api.restoreColumnState = function(columnState, onError, columns, filter, sort) {
	$scope.model._internalColumnState = columnState;
	$scope.model.columnStateOnError = onError;
	$scope.model.restoreStates = { columns: columns, filter: filter, sort: sort };
}

/**
 * Auto-sizes all columns based on content.
 * 
 */
$scope.api.autoSizeAllColumns = function() {
	$scope.model._internalAutoSizeState = true;
}

/**
 * Returns the current state of the columns (width, position, grouping state) as a json string
 * that can be used to restore to this state using restoreColumnState
 * 
 * @return {String}
 */
$scope.api.getColumnState = function() {
	return $scope.model.columnState;
}

/**
 * Set the table read-only state. If no columnids is used, all columns read-only state is set,
 * otherwise only for the columns specified.
 *
 * @param {Boolean} readOnly read-only state
 * @param {Array<String>} columnids array of column ids to make ready-only
 */
$scope.api.setReadOnly = function(readOnly, columnids) {

	if(!columnids) {
		$scope.model.readOnly = readOnly;
		$scope.model.readOnlyColumnIds = null;
	}
	else {
		if(!$scope.model.readOnlyColumnIds) {
			$scope.model.readOnlyColumnIds = {}
		}
		for(var i = 0; i < columnids.length; i++) {
			$scope.model.readOnlyColumnIds['_' + columnids[i]] = readOnly;
		}
	}
}

/**
 * Set the currently opened form editor value
 *
 * @param {Object} value form editor value
 */
$scope.api.setFormEditorValue = function(value) {
	$scope.model._internalFormEditorValue = value;
}

/**
 * Returns currently expanded groups as an object like
 * {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
 *
 * @returns {Object}
 */
$scope.api.getExpandedGroups = function() {
	return $scope.model._internalExpandedState;
}

/**
 * Return the column index for the given column id.
 * Can be used in combination with getColumnState to retrieve the column index for the column state with colId in the columnState object.
 * 
 * @param {String} colId
 * 
 * @return {Number}
 * @example <pre>
 * // get the state
 * var state = elements.table.getColumnState();
 * // parse the state of each column
 * var columnsState = JSON.parse(state).columnState;
 *
 * for (var index = 0; index < columnsState.length; index++) {
 * 
 *   // skip column hidden by the user
 *   if (!columnsState[index].hide) {
 * 
 * 	  // get the column using the colId of the columnState
 * 	  var columnIndex = elements.table.getColumnIndex(columnsState[index].colId);
 * 		if (columnIndex > -1) {
 * 		  var column = elements.table.getColumn(columnIndex);
 * 		  // do something with column				
 * 		}
 * 	}
 * }
 * </pre>
 * @public
 * */
$scope.api.getColumnIndex = function(colId) {
	if (!colId) {
		// TODO shall log a warning for colId being null ?
		return -1;
	}
	
	var columns = $scope.model.columns;
	for (var i = 0; i < columns.length; i++) {
		var column = columns[i];
		if (column.id === colId || getColumnID(column, i) == colId) {
			return i;
		}
	}
	
	/**
	 * Returns the column identifier
	 * @param {Object} column
	 * @param {Number} idx
	 *
	 * @return {String}
	 *
	 * @private
	 * */
	function getColumnID(col, idx) {					
		if (col.dataprovider || col.styleClassDataprovider) {
			// shall verify if idForFoundset is a match clientside
			return null;
		}
		else {
			return "col_" + idx;
		}
	}
	
	// if column column has not been found check if there is a match clientside for dataprovider.idForFoundset
	return $scope.api.internalGetColumnIndex(colId);
}

