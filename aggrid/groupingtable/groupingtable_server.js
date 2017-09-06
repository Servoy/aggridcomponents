/**
 * @param {Array<Number>} groupColumns
 * @param {Array} groupKeys
 * @param {Array} idForFoundsets
 * @param {String} [sort]
 *
 * */
$scope.getGroupedFoundsetUUID = function(groupColumns, groupKeys, idForFoundsets, sort) {
	// root is the parent
	console.log('START SERVER SIDE ------------------------------------------ ');
	console.log(groupColumns);
	console.log(groupKeys);

	var parentFoundset = $scope.model.myFoundset.foundset;

	// I need the full column/key mapping
	/** @type {QBSelect} */
	var query = parentFoundset.getQuery();

	console.log(query);

	var groupColumn;
	var groupDataprovider;

	for (var i = 0; i < groupColumns.length; i++) {
		var groupColumnIndex = groupColumns[i];

		// retrieve the grouping column
		groupDataprovider = $scope.model.columns[groupColumnIndex].dataprovider;
		console.log('group on ' + groupDataprovider);

		if (isRelatedDataprovider(groupDataprovider)) {
			// should search for all the relations (can be multiple level)

			var relationNames = getDataProviderRelations(groupDataprovider);
			var columnName = getDataProviderColumn(groupDataprovider);

			// console.log('is a join on ' + columnName);

			var join = query;
			
			for (var j = 0; j < relationNames.length; j++) {
				var relationName = relationNames[j];
				// use unique name for multiple level relations
				var relationPath = relationNames.slice(0, j+1).join("____");
				console.log(relationPath)
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
			query.where.add(groupColumn.eq(groupKey));
		}

	}

	if (groupColumns.length > groupKeys.length) {

		// get the pks
		query.result.clear();
		query.result.addPk();
		var pkColumns = query.result.getColumns();
		query.result.clear();

		// Group pks handle pks
		for (var i = 0; i < pkColumns.length; i++) {
			query.result.add(pkColumns[i].min);
		}
		if (pkColumns.length > 1) {
			console.warn('The component does not support multiple primary keys');
			
			if (pkColumns.length === 2) {
				
//				 WHERE order_details.productid = (\
//							select order_details2.productid \
//							 from order_details order_details2 \
//							 left outer join products order_details_to_products2 on order_details2.productid=order_details_to_products2.productid \
//							 left outer join categories products_to_categories2 on order_details_to_products2.categoryid=products_to_categories2.categoryid \
//							 where products_to_categories2.categoryname = products_to_categories.categoryname and order_details2.orderid = order_details.orderid limit 1\
//					 )\
				
			}
		}
		
		query.groupBy.add(groupColumn);
		query.sort.clear();
		console.log(sort)
		if (sort === 'desc') {
			query.sort.add(groupColumn.desc);
		} else {
			query.sort.add(groupColumn.asc);
		}

		console.log('Run Query ' + query);

	} else { // is not a new group, will be a leaf !

	}

	// console.log('try');

	// this is the first grouping operation; alter initial query to get all first level groups
	var childFoundset = parentFoundset.duplicateFoundSet();
	childFoundset.loadRecords(query);
	
	console.log('Matching records ' + childFoundset.getSize());

	// push dataproviders to the clientside foundset
	var dps = { };
	// FIXME this creates an issue
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		// the dataprovider name e.g. orderid
		var dpId = $scope.model.columns[idx].dataprovider;
		// the idForFoundset(exists only client-side, therefore i need to retrieve it from the client)
		var idForFoundset = idForFoundsets[idx];
		// Servoy resolves the real dataprovider name into the dataprovider 'field'
		dps[idForFoundset] = dpId;
		// TODO it could be the hashmap of groupkeys/groupcolumns ?
		// dps._svyFoundsetUUID = null;
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
		foundsetUUID: childFoundset
	}); // send it to client as a foundset property with a UUID


	console.log('END SERVER SIDE QUERY');

	return childFoundset; // return the UUID that points to this foundset (return type will make it UUID)
};

/** 
 * @type {Object} parentFoundset
 * @type {Object} parentRecordFinder
 * 
 * */
$scope.getFoundsetRecord = function(parentFoundset, parentRecordFinder) {
    if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;
    var record = parentRecordFinder(parentFoundset);
    var result = new Object();
    for(var prop in record) {
    	if (!(record[prop] instanceof Function)) {
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

