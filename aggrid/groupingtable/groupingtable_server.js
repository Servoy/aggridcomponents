/**
 * @param {Array<Number>} groupColumns
 * @param {Array} groupKeys
 * @param {Array} idForFoundsets
 * @param {String} [sort]
 *
 * */
$scope.getGroupedFoundsetUUID = function(groupColumns, groupKeys, idForFoundsets, sort, sFilterModel, hasRowStyleClassDataprovider) {
	log('START SERVER SIDE ------------------------------------------ ', LOG_LEVEL.WARN);

	// root is the parent
	var parentFoundset = $scope.model.myFoundset.foundset;

	// I need the full column/key mapping
	/** @type {QBSelect} */
	var query = parentFoundset.getQuery();

	//	console.log(query);

	var groupColumn;
	var groupDataprovider;

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
		log("Group on groupDataprovider " + groupDataprovider + " at index " + groupColumnIndex, LOG_LEVEL.WARN);
		//		console.log('group on ' + groupDataprovider);

		if (isRelatedDataprovider(groupDataprovider)) {
			// should search for all the relations (can be multiple level)

			var relationNames = getDataProviderRelations(groupDataprovider);
			var columnName = getDataProviderColumn(groupDataprovider);

			log('The groupDataprovider is a join on ' + columnName, LOG_LEVEL.WARN);

			var join = query;

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
					// TODO check the joinType of the relation and make sure to add a join with "outer join" join type
					// 		but don't think this is possible: no way to introspect the relation before adding it and if the wrong time, (manually) duplicate the relation with the proper type
					//		and no way to either remove a wrong relation-based join (to manually add a proper duplicate) or modifying the joinType after adding the join
					join = join.joins.add(relationName, relationPath);
				}
			}

			groupColumn = join.getColumn(columnName);
		} else {
			groupColumn = query.getColumn(groupDataprovider);
		}

		// where clause on the group column
		if (i < groupKeys.length) {
			var groupKey = groupKeys[i];
			log('The node is a sub-group of groupKey ' + groupKey, LOG_LEVEL.WARN);
			query.where.add(groupColumn.eq(groupKey));
		}

	}

	var childFoundset;
	if (groupColumns.length > groupKeys.length) {
		query.result.clear();
		query.result.add(groupColumn, groupDataprovider);
		query.groupBy.add(groupColumn); // CHECKME with multilevel groups upper parent groups might return grouprows that don't have child groupd rows. Happens at least when using inner joins for non-exiting related data. Example "'T Veld". Causes the grid to stop rendering
		query.sort.clear();

		if (sort === 'desc') {
			query.sort.add(groupColumn.desc);
		} else {
			query.sort.add(groupColumn.asc);
		}

		childFoundset = servoyApi.getViewFoundSet("", query);
	} else { // is not a new group, will be a leaf !
		childFoundset = parentFoundset.duplicateFoundSet();
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

	// CHECKME this seems a basic copy of limited fields from $scope.model.columns that gets stored on each grouped FS
	// 	If just a plain copy, why not always reference $scope.model.columns clientside and remove .columns from hashedFoundsets?
	var columns = [];
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		columns.push({
			dataprovider: $scope.model.columns[idx].dataprovider,
			format: $scope.model.columns[idx].format,
			valuelist: $scope.model.columns[idx].valuelist,
			id: $scope.model.columns[idx].id,
			columnDef: $scope.model.columns[idx].columnDef
		});
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

$scope.filterMyFoundset = function(sFilterModel) {
	if (sFilterModel) filterFoundset($scope.model.myFoundset.foundset, sFilterModel);
	$scope.model.myFoundset.foundset.loadAllRecords();
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
 * @type {Object} parentFoundset
 * @type {Object} parentRecordFinder
 *
 * */
$scope.getFoundsetRecord = function(parentFoundset, parentRecordFinder) {
	if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;
	var record = parentRecordFinder(parentFoundset);
	var result = new Object();
	for (var prop in record) {
		if (! (record[prop] instanceof Function)) {
			result[prop] = record[prop];
		}
	}
	return result;
}

/**
 * The only use case is to retrieve the record index while grouped.
 * Don't implement for now
 * @deprecated
 * Get the foundset index of the given record
 * @type {Object} parentFoundset
 * @type {Object} parentRecordFinder
 *
 * */
$scope.getRecordIndex = function(parentFoundset, parentRecordFinder) {
	if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;
	var rootFoundset = $scope.model.myFoundset.foundset;
	var record = parentRecordFinder(parentFoundset);
	if (record) {
		return rootFoundset.getRecordIndex(record);
	} else {
		return -1;
	}
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
	var filterModel = JSON.parse(sFilterModel);

	foundset.removeFoundSetFilterParam("ag-groupingtable");
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
				value = new Date(filter["dateFrom"]);
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
					case "lessThan":
						op = "lt";
						break;
					case "inRange":
						op = "between";
						value = new Array();
						value.push(filter["dateFrom"]);
						value.push(filter["dateTo"]);
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
	}
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
    return $scope.model.columns.length; // Bombs if columns is null
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
	 for(var i = $scope.model.columns.length; i > insertPosition; i--) { // Use splice?!?!
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
	if(index >= 0 && index < $scope.model.columns.length) {
		for(var i = index; i < $scope.model.columns.length - 1; i++) { // Use splice?!?!
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
	   if($scope.model.columns.length > 0) {
		   $scope.model.columns.length = 0;
		   return true;
	   }
	   return false;
}

/**
 * Restore columns state to a previously save one, using getColumnState.
 * If no argument is used, it restores the columns to designe time state.
 * If the columns from columnState does not match with the columns of the component,
 * no restore will be done.
 * 
 * @param {String} columnState
 * @param {Function} onError
 */
$scope.api.restoreColumnState = function(columnState, onError) {
	$scope.model._internalColumnState = columnState;
	$scope.model.columnStateOnError = onError;
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