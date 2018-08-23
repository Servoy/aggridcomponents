/**
 * @param {Array<Number>} groupColumns
 * @param {Array} groupKeys
 * @param {Array} idForFoundsets
 * @param {String} [sort]
 *
 * */
$scope.getGroupedFoundsetUUID = function(groupColumns, groupKeys, idForFoundsets, sort, hasRowStyleClassDataprovider) {
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

	if (groupColumns.length > groupKeys.length) {

		// get the pks
		query.result.clear();
		query.result.addPk();
		var pkColumns = query.result.getColumns();
		query.result.clear();

		log("There are " + pkColumns.length + " pks", LOG_LEVEL.WARN);
		
		if (pkColumns < 1) {
			console.error("No primary key has been found for the given foundset. The component's foundset must have one single primary key to enable grouping");
			throw "No primary key has been found for the given foundset. The component's foundset must have one single primary key to enable grouping";
		}
		if (pkColumns.length > 1) {
			//			if (pkColumns.length === 2) {
			//
			//							//				 WHERE order_details.productid = (\
			//							//							select order_details2.productid \
			//							//							 from order_details order_details2 \
			//							//							 left outer join products order_details_to_products2 on order_details2.productid=order_details_to_products2.productid \
			//							//							 left outer join categories products_to_categories2 on order_details_to_products2.categoryid=products_to_categories2.categoryid \
			//							//							 where products_to_categories2.categoryname = products_to_categories.categoryname and order_details2.orderid = order_details.orderid limit 1\
			//							//					 )\
			//
			//						}

			console.error("Grouping is not supported on foundset having multiple primary keys. The component's foundset must have one single primary key to enable grouping");
			throw "Grouping is not supported on foundset having multiple primary keys. The component's foundset must have one single primary key to enable grouping";
		}
		
		// Group pks handle pks
		var UUID_COLUMN_TYPE = 4;
		for (var pkIndex = 0; pkIndex < pkColumns.length; pkIndex++) {
			var flags = pkColumns[pkIndex].getFlags();
			if((flags & UUID_COLUMN_TYPE) != 0) {
				// is uuid
				query.result.add(pkColumns[pkIndex].cast(QUERY_COLUMN_TYPES.TYPE_TEXT).min);
			}
			else {
				query.result.add(pkColumns[pkIndex].min);
			}
		}


		query.groupBy.add(groupColumn);
		query.sort.clear();
		//		console.log(sort)
		if (sort === 'desc') {
			query.sort.add(groupColumn.desc);
		} else {
			query.sort.add(groupColumn.asc);
		}

		//		console.log('Run Query ' + query);

	} else { // is not a new group, will be a leaf !

	}

	// console.log('try');

	// this is the first grouping operation; alter initial query to get all first level groups
	var childFoundset = parentFoundset.duplicateFoundSet();
	childFoundset.loadRecords(query);

	//	console.log('Matching records ' + childFoundset.getSize());

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
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		columns.push({
			dataprovider: $scope.model.columns[idx].dataprovider,
			format: $scope.model.columns[idx].format,
			valuelist: $scope.model.columns[idx].valuelist,
			id: $scope.model.columns[idx].id
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
 * The only use case is to retrieve the record index while gruped.
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
    return $scope.model.columns.length; 
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
	 $scope.model.columns[insertPosition] = {'dataprovider':dataproviderid};
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
	   if($scope.model.columns.length > 0) {
		   $scope.model.columns.length = 0;
		   return true;
	   }
	   return false;
}