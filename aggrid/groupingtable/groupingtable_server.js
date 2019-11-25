const SERVOY_FIND_SEARCH_CONDITION_NAME = 'SV:S'

const NULL_DISPLAY_VALUE = 'GRID_NULL_DISPLAY_VALUE'

// **************************** Internal API implementation **************************** //
/**
 * Creates a new foundset based on the provided parameters and stores it in $scope.model.hashedFoundsets
 * 
 * @param {Array<number>} groupColumns
 * @param {Array} groupKeys
 * @param {Array} idForFoundsets
 * @param {string=} sort
 * @param {object=} sFilterModel
 * @param {boolean=} hasRowStyleClassDataprovider
 */
$scope.getGroupedFoundsetUUID = function(groupColumns, groupKeys, idForFoundsets, sort, sFilterModel, hasRowStyleClassDataprovider) {
	log('START SERVER SIDE ------------------------------------------ ', LOG_LEVEL.WARN);

	var groupColumn;
	var groupDataprovider;
	var groupColumnIndex;
	var groupKey;
	var i;
	var fs;

	// TODO it cannot be empty !?!
	if (!groupColumns) groupColumns = [];
	if (!groupKeys) groupKeys = [];
	if (!idForFoundsets) {
		console.error("There are no idForFoundset to map to")
	}

	// All foundsets are derived from the root foundset
	var rootFoundset = $scope.model.myFoundset.foundset;

	/** @type {QBSelect} */
	var query = rootFoundset.getQuery();
	
	// Apply group filtering to the query
	log("There are '" + groupColumns.length + "' groupColumns", LOG_LEVEL.WARN);
	for (i = 0; i < groupColumns.length; i++) {
		groupColumnIndex = groupColumns[i];

		// retrieve the grouping column
		groupDataprovider = $scope.model.columns[groupColumnIndex].dataprovider || $scope.model.columns[groupColumnIndex].lazydataprovider;
		log("Group on groupDataprovider " + groupDataprovider + " at index " + groupColumnIndex, LOG_LEVEL.WARN);

		groupColumn = getGroupQBColumn(query, groupDataprovider, QBJoin.LEFT_OUTER_JOIN);

		// where clause on the group column
		if (i < groupKeys.length) {
			groupKey = groupKeys[i];
			log('The node is a sub-group of groupKey ' + groupKey, LOG_LEVEL.WARN);
			query.where.add(groupColumn.eq(groupKey));
		}
	}

	// instantiate either a group or leaf foundset
	if (groupColumns.length > groupKeys.length) { // group foundset
		query.result.clear();
		query.result.add(groupColumn, groupDataprovider);

		query.groupBy.add(groupColumn);
		
		query.sort.clear();
		query.sort.add(sort === 'desc' ? groupColumn.desc : groupColumn.asc);

		// CHECKME doesn't the group foundset need filtering?
		fs = servoyApi.getViewFoundSet("", query);
	} else { // leaf foundset
		fs = rootFoundset.duplicateFoundSet();
		
		if (sFilterModel) {
			filterFoundset(fs, sFilterModel);
		}
		
		// CHECKME doesn't the leaf foundset need sorting?
		fs.loadRecords(query);
	}

	log("There are " + $scope.model.columns.length + " columns and " + idForFoundsets.length + " idForFoundsets", LOG_LEVEL.WARN);
	
	// push dataproviders to the clientside foundset
	var dps = {};
	for (i = 0; i < $scope.model.columns.length; i++) {
		var column = $scope.model.columns[i];
		// the dataprovider name e.g. orderid
		// var dpId = column.dataprovider;
		// the idForFoundset(exists only client-side, therefore i need to retrieve it from the client)
		var idForFoundset = idForFoundsets[i];
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

	if (hasRowStyleClassDataprovider === true) {
		dps["__rowStyleClassDataprovider"] = $scope.model.rowStyleClassDataprovider;
	}

	var columns = [];
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		columns.push({
			dataprovider: $scope.model.columns[idx].dataprovider || $scope.model.columns[idx].lazydataprovider,
			format: $scope.model.columns[idx].format,
			valuelist: $scope.model.columns[idx].valuelist,
			id: $scope.model.columns[idx].id,
			columnDef: $scope.model.columns[idx].columnDef
		});
	}

	// CHECKME perhaps R&D can improve this: sending the column mapping cause clientside doesnt have the dataprovider id name and server side doesnt have the idForFoundset
	$scope.model.hashedFoundsets.push({
		foundset: {
			foundset: fs,
			dataproviders: dps,
			sendSelectionViewportInitially: false,
			initialPreferredViewPortSize: 15
		},
		foundsetUUID: fs,
		columns: columns
	}); // send it to client as a foundset property with a UUID

	log('Group foundset retrieved' + $scope.model.hashedFoundsets[$scope.model.hashedFoundsets.length - 1], LOG_LEVEL.WARN);
	log('END SERVER SIDE QUERY --------------------------------------', LOG_LEVEL.WARN);

	return fs; // return the UUID that points to this foundset (return type defined in the spec will make it UUID)
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
 * @param {Object} parentFoundset
 * @param {Object} parentRecordFinder
 */
$scope.getFoundsetRecord = function(parentFoundset, parentRecordFinder) {
	if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;
	var record = parentRecordFinder(parentFoundset);
	var result = {};
	for (var prop in record) {
		if (! (record[prop] instanceof Function)) {
			result[prop] = record[prop];
		}
	}
	return result;
}

/**
 * Get the foundset index of the given record
 * The only use case is to retrieve the record index while grouped.
 * Don't implement for now
 * 
 * @deprecated
 * 
 * @param {Object} parentFoundset
 * @param {Object} parentRecordFinder
 */
$scope.getRecordIndex = function(parentFoundset, parentRecordFinder) {
	if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;

	var rootFoundset = $scope.model.myFoundset.foundset;
	var record = parentRecordFinder(parentFoundset);

	return record ? rootFoundset.getRecordIndex(record) : -1;
}

//**************************** Utility functions **************************** //
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
 */
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
 * @param {QBSelect} select
 * @param {string} relationName
 * @param {string} alias
 * @param {number} joinType see QBJoin for constants
 * 
 * @return {QBJoin}
 */
function addJoin(select, relationName, alias, joinType) {
	var join = select.joins.add(relationName, alias);
	join.joinType = joinType;
	
	return join;
}

/**
 * Returns the QBColumn from the provided QBSelect based on the provided groupDataprovider
 * If the groupDataprovider is a related dataprovider, all the relations will be joined in
 * If the optional joinType is provided, the relations will be joined using the provided joinType
 * 
 * @param {QBSelect} query
 * @param {string} groupDataprovider
 * @param {number=} joinType
 * 
 * @return {QBColumn}
 */
function getGroupQBColumn(query, groupDataprovider, joinType) {
	if (!isRelatedDataprovider(groupDataprovider)) {
		return query.getColumn(groupDataprovider);
	}

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
			if (typeof joinType === 'number') { // can be 0
				join = addJoin(join, relationName, relationPath, joinType)
			} else {
				join = join.joins.add(relationName, relationPath);
			}
		}
	}

	return join.getColumn(columnName);
}

/**
 * Returns an array with the columnDefs for the grouped columns
 * 
 * TODO explain the logic of this function
 * 
 * @return {Array}
 */
function getGroupColumnDefs() {
	const columnDefs = [];
	
	if (!$scope.model.columns) return columnDefs;
	
	const indexedColumns = {}
	const flaggedColumns = []
	
	var columnDef;
	var i;
	
	for (i = 0; i < $scope.model.columns.length; i++) {
		columnDef = $scope.model.columns[i];
		
		if (typeof columnDef.rowGroupIndex === 'number' && columnDef.rowGroupIndex !== -1) {
			if (!indexedColumns.hasOwnProperty(columnDef.rowGroupIndex)) {
				indexedColumns[columnDef.rowGroupIndex] = []
			}
			
			indexedColumns[columnDef.rowGroupIndex].push(columnDef)
		} else if (columnDef.columnDef && columnDef.columnDef.rowGroup) {
			flaggedColumns.push(columnDef)
		}
	}
	
	const indexes = Object.keys(indexedColumns).sort()
	
	for (i = 0; i < indexes.length; i++) {
		columnDefs.push.apply(columnDefs, indexedColumns[indexes[i]]);
	}
	
	return columnDefs.concat(flaggedColumns)
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
	if (servoyApi.getQuerySelect) {
		query = servoyApi.getQuerySelect(foundset.getDataSource());
	} else {
		// there is an issue in Servoy, that queries are not cleared after calling removeFoundSetFilterParam
		// until loadAllRecords is called
		foundset.loadAllRecords();
		query = foundset.getQuery();
	}

	for (var i = 0; i < $scope.model.columns.length; i++) {
		var dp = $scope.model.columns[i].dataprovider || $scope.model.columns[i].lazydataprovider;
		var filter = filterModel[i];
		if (filter) {
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
			} else if (filter["filterType"] == "number") {
				value = filter["filter"];
				switch (filter["type"]) {
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
			} else if (filter["filterType"] == "date") {
				value = new Date(filter["dateFrom"]);
				switch (filter["type"]) {
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

			if (op != undefined && value != undefined) {
				var whereClause = null;
				var aDP = dp.split('.');
				for (var j = 0; j < aDP.length - 1; j++) {
					whereClause = whereClause == null ? query.joins[aDP[j]] : whereClause.joins[aDP[j]];
				}

				whereClause = whereClause == null ? query.columns[aDP[aDP.length - 1]] : whereClause.columns[aDP[aDP.length - 1]];

				if (useIgnoreCase) {
					whereClause = whereClause["lower"];
					value = value.toLowerCase();
				}
				
				if (useNot) {
					whereClause = whereClause["not"];
				}
				whereClause = op == "between" ? whereClause[op](value[0], value[1]) : whereClause[op](value);
				
				if(!isFilterSet) isFilterSet = true;
				query.where.add(whereClause);
			}
		}
	}

	if (isFilterSet) {
		foundset.addFoundSetFilterParam(query, "ag-groupingtable");
	}
}

//**************************** Component API **************************** //
//------------ APIs related to columns ------------ //
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
   if ($scope.model.columns.length > 0) {
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

//------------ APIs related to selection ------------ //
/**
 * Returns a FoundSet that contains all the records that are logically selected
 * 
 * If the grid is not in group mode, the returned foundset will contain only the selected records from the foundset set through the myfoundset property
 * 
 * In grouped mode, the returned foundset ......
 * Note that edited records, that possibly change in which groups records belong and thus if they ought to be included in the selection or not are NOT taken into account!
 * 
 * @return {JSFoundSet} null if the myfoundset property is not set on the component
 * 
 * TODO rename to getSelectionFoundSet or getSelectedRecordsFoundSet
 */
$scope.api.getSelectedRecordFoundSet = function() {
	if (!$scope.model.myFoundset) return null;
	
	// Using foundset.getOmittedPKs() as a workaround for not having the ability to retrieve the names of the PK columns: the returned JSDataSet has its columnNames set to the PK column(s)
	const pkColumnNames = $scope.model.myFoundset.foundset.getOmittedPKs().getColumnNames();
	if (pkColumnNames.length !== 1) { // Not supporting multi-column PKs (yet)
		console.warn('NG Grouping Grid doesn\'t support multi-column PKs');
		return null;
	}

	const selectionFs = $scope.model.myFoundset.foundset.duplicateFoundSet();
	/** @type {QBSelect} */
	const selectionQuery = $scope.model.myFoundset.foundset.getQuery();
	// Remove filter condition if still applied on the root foundset: query to get selected records based on $scope.model.state will contain the proper restrictions
	// without removing the condition, the filter will be applied on the entire selection
	// TODO make configurable, might depends on Servoy 2019.03 to do properly (allow selecting predefined values (for Servoy constants) or custom conditionNames (like 'pgnSearch' in our case))
	selectionQuery.where.remove(SERVOY_FIND_SEARCH_CONDITION_NAME);
	
	if (true /*&& isGrouped*/) { // build a query that takes into grouping and including all records for the group if the group was selected
		/*
		const state = {
			"children": {
				"AACHEN": {
					"expanded": true,
					"children": {
						"DUITSLAND": {
							"expanded": true,
							"children": {
								"AACHENER-TAUCHSCHULE": {
									"children": {}
								},
								"BAUMANN SPORT": {
									"children": {}
								},
								"DIECKMANN.S": {
									"children": {},
									"expanded": true,
									"pks": [
										"2539"
									],
									"selected": true
								},
								"IMMOBILIEN": {
									"children": {}
								},
								"TAUCHAIXPERTE": {
									"children": {}
								}
							}
						}
					}
				},
				"'T VELD": {
					"children": {},
					"selected": true
				},
				"'S-HERTOGENBOSCH": {
					"children": {
						"UDEN": {
							"children": {},
							"selected": true
						},
						"ROSMALEN": {
							"children": {},
							"selected": true
						}
					},
					"expanded": true
				}
			}
		}
		
		 * a state as suggested above leads to an SQL statement like:
		where ....
		and		(
			-- 1st group level node selected
			(key1 = "'T VELD")
			 OR
			-- multiple 2nd level groups selected decendants
			(key1 = "x" and ( (key2 = ROSMALEN and xyz) OR (key2 = VUCHT and abc) )
			 OR
			-- only 2 2nd level groups selected
			(key1 = "'S HERTOGENBOSCH" and key2 in (ROSMALEN, VUCHT))
			 OR
			-- 2nd level group having 2 leafs selected
			(key1 = AACHEN and key2 === DUITSLAND and company_id in (2194, 1278))
		)
		 *
		 * which can be created using the querybuilder like:
		selectionOrCondition
			// (key1 = "'T VELD")
			.add(key1.eq("'T VELD"))
		 	// (key1 = "x" and ( (key2 = ROSMALEN and xyz) OR (key2 = VUCHT and abc) )
			.add(selectionQuery.and
				.add(key1.eq("x"))
				.add(selectionQuery.or
					.add(selectionQuery.and
						.add(key2.eq("ROSMALEN"))
						.add(xyz)
					)
					.add(selectionQuery.and
						.add(key2.eq("VUCHT"))
						.add(abc)
					)
				)
			)
			// (key1 = "'S HERTOGENBOSCH" and key2 in (ROSMALEN, VUCHT))
			.add(selectionQuery.and
				.add(key1.eq("'S HERTOGENBOSCH"))
				.add(selectionQuery.and
					.add(key2.isin(["ROSMALEN", "VUCHT"])) // CHECKME needs loop through all children before knowing if such in clause is required
				)
			)
			// (key1 = AACHEN and key2 === DUITSLAND and company_id in (2194, 1278))
			.add(selectionQuery.and
				.add(key1.eq("AACHEN"))
				.add(key2.eq("DUITSLAND"))
				.and(pkColumn.isin([2194, 1278])) // CHECKME need a reference to the pk column
			)
		 */

		const groupColumnsDefs = getGroupColumnDefs();
		const groupColumns = [];		
		const pkColumn = selectionQuery.columns[pkColumnNames[0]];

		function appendSelectionWhereClauses(groupState, groupColumn, groupKey, level, condition) {
			var hasSelection = false;
			
			// CHECKME is selected ever false? Can't remember...
			if (groupState.selected) { // selected group: include all children
				condition.add(groupColumn.eq(groupKey));
				hasSelection = true;
			} else if (groupState.pks && groupState.pks.length) { //leafgroup: include selected PK's // CHECKME what happens is pks doesn't contain any pks?
				condition.add(pkColumn.isin(groupState.pks));
				hasSelection = true;
			} else if (groupState.children) { // must be another level group level 
				const keys = Object.keys(groupState.children);
				if (!keys.length) return false; // Should not happen, but anyway...
				
				var nextGroupColumn = groupColumns[level] || (groupColumns[level] = getGroupQBColumn(selectionQuery, groupColumnsDefs[level].dataprovider || groupColumnsDefs[level].lazydataprovider, QBJoin.LEFT_OUTER_JOIN));
				
				const selectedChildren = []
				const childrenCondition = condition.root.or
				condition.add(childrenCondition)
				
				for (var i = 0; i < keys.length; i++) {
					var key = keys[i];
					var child = groupState.children[key];
					var childCondition = condition.root.and
					childrenCondition.add(childCondition)
					
					if (child.selected && key !== NULL_DISPLAY_VALUE) { // Optimize for case where children are only selected groups: use isin([]) instead of nested OR's
						selectedChildren.push(key)
					} else {
						if (appendSelectionWhereClauses(groupState.children[key], nextGroupColumn, key, level + 1, childCondition)) {
							childCondition.add(key === NULL_DISPLAY_VALUE ? nextGroupColumn.isNull : nextGroupColumn.eq(key));
							hasSelection = true;
						}
					}
				}
				
				if (selectedChildren.length) {
					childrenCondition.add(nextGroupColumn.isin(selectedChildren));
					hasSelection = true;
				}
			}
			
			return hasSelection;
		}
		
		if (!appendSelectionWhereClauses($scope.model.state, null, null, 0, selectionQuery.where)) {
			selectionQuery.where.add(pkColumn.eq(null));
		}
		
		// Make sure the resulting foundset is sorted like on the grid
		var sortSolumns = [].concat(groupColumns);
		var descSorts = [];
		selectionFs.getCurrentSort().split(',').forEach(function(sort) {
			var parts = sort.split(' ');
			var qbCol = selectionQuery.getColumn(parts[0]);
			
			if (!qbCol) {
				console.warn('Failed to convert sort column "' + parts[0] + '" to QBColumn');
				return;
			}
			
			sortSolumns.push(qbCol);
			
			if (parts[1] === 'desc') {
				descSorts.push(qbCol);
			}
		});		
		
		selectionQuery.sort.clear();
		sortSolumns.forEach(function(col) {
			if (descSorts.indexOf(col) !== -1) {
				selectionQuery.sort.add(col.desc);
			} else {
				selectionQuery.sort.add(col);
			}
		});
	} else { // create a duplicate of the root foundset and limit it to only contain the records that are selected in the root foundset
		const selectedRecords = $scope.model.myFoundset.foundset.getSelectedRecords();
		
		if (!selectedRecords.length) {
			selectionQuery.where.add('selectedRecords', selectionQuery.columns[pkColumnNames[0]].isNull)
		} else {
			const pks = [];

			for (var i = 0; i < selectedRecords.length; i++) {
				pks.push(selectedRecords[i].getPKs()[0])
			}

			selectionQuery.where.add('selectedRecords', selectionQuery.columns[pkColumnNames[0]].isin(pks))
		}
	}

	selectionFs.loadRecords(selectionQuery)
	
	return selectionFs;
}

//------------ APIs related to grouping ------------ //
$scope.api.getGroupedState = function() {
	const filteredState = JSON.stringify($scope.model.state, function(key, value){
		return  key === 'selected' || key === 'pks' ? undefined : value;
	});
	
	return JSON.parse(filteredState)
}

$scope.enableColumn = function(indexes, enabled) {
	var idx;
	
	for (var i = 0; i < indexes.length; i++) {
		idx = indexes[i];
		
		if (enabled) {
			$scope.model.columns[idx].dataprovider = $scope.model.columns[idx].lazydataprovider;
		} else {
			$scope.model.columns[idx].dataprovider = null;
		}
	}
}