/**
 * @param {Array<Number>} groupColumns
 * @param {Array} groupKeys
 * @param {Array} idForFoundsets
 *
 * */
$scope.getGroupedFoundsetUUID = function(groupColumns, groupKeys, idForFoundsets) {
	// root is the parent
	console.log('SERVER SIDE');
	console.log(groupColumns);
	console.log(groupKeys);

	var parentFoundset = $scope.model.myFoundset.foundset

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

			console.log('is a join on ' + columnName);

			var join;
			// FIXME how do i know if has already a relation ?
			for (var j = 0; j < relationNames.length; j++) {
				var relationName = relationNames[j];
				var existingJoin = getJoin(query, relationName);
				if (existingJoin) {
					join = existingJoin;
				} else {
					join = query.joins.add(relationName, relationName);
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
		query.groupBy.add(groupColumn);
		query.sort.clear();
		query.sort.add(groupColumn);

		console.log('Run Query ' + query);

	} else { // is not a new group, will be a leaf !

		//	// if is a leaf last group should be added
		//	query.where.add(groupColumn.eq(groupKey[groupKeys.length - 1]));
	}

	console.log('try')
	//	if (parentLevelGroupColumnIndex == undefined) { // this is the root column
	// this is the first grouping operation; alter initial query to get all first level groups

	// console.log(databaseManager.getSQL(query));

	var childFoundset = parentFoundset.duplicateFoundSet();
	childFoundset.loadRecords(query);

	// push dataproviders to the clientside foundset
	var dps = { };
	var hashedColumns = [];
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		var dpId = $scope.model.columns[idx].dataprovider;
		var idForFoundset = idForFoundsets[idx];
		dps[idForFoundset] = dpId;
		hashedColumns.push(dpId);
	}

	$scope.model.hashedFoundsets.push({
		foundset: {
			foundset: childFoundset,
			dataproviders: dps,
			sendSelectionViewportInitially: false,
			initialPreferredViewPortSize: 15
		},
		foundsetUUID: childFoundset
	}); // send it to client as a foundset property with a UUID

	// TODO this is not required
	// TODO perhaps R&D can improve this
	// send the column mapping; clientside i don't have the dataprovider id name and server side i don't have the idForFoundset.
	$scope.model.hashedColumns = hashedColumns;
	console.log('End');

	return childFoundset; // return the UUID that points to this foundset (return type will make it UUID)
};

/**
 * @param {Object} parentFoundset
 * @param {Object} parentRecordFinder
 * @param {Number} parentLevelGroupColumnIndex
 * @param {Array<String>} idForFoundsets an array with the ID of all the columns. Since the id of a columns is known only client-side
 *
 *
 *  */
$scope.getLeafChildFoundsetUUID = function(parentFoundset, parentRecordFinder, parentLevelGroupColumnIndex, idForFoundsets) {

	console.log(parentRecordFinder);
	console.log(parentLevelGroupColumnIndex);
	console.log(idForFoundsets);

	// root is the parent
	console.log('SERVER SIDE LEAF');
	if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;

	/** @type {QBSelect} */
	var query = getQuery(parentFoundset); //parentFoundset.getQuery();

	var groupColumn;
	var groupDataprovider;
	var groupValue;

	groupDataprovider = $scope.model.columns[parentLevelGroupColumnIndex].dataprovider;
	groupValue = parentRecordFinder['col_' + parentLevelGroupColumnIndex];

	if (isRelatedDataprovider(groupDataprovider)) {
		// should search for all the relations (can be multiple level)

		var relationNames = getDataProviderRelations(groupDataprovider);
		var columnName = getDataProviderColumn(groupDataprovider);

		console.log('is a join on ' + columnName);

		var join;
		// FIXME how do i know if has already a relation ?
		for (var i = 0; i < relationNames.length; i++) {
			var relationName = relationNames[i];

			var existingJoin = getJoin(query, relationName);

			if (existingJoin) {
				join = existingJoin;
			} else {
				join = query.joins.add(relationName, relationName);
			}
		}

		groupColumn = join.getColumn(columnName);
	} else {
		groupColumn = query.getColumn(groupDataprovider);
	}

	console.log(parentRecordFinder)

	// this is an intemediate group expand; alter query of parent level for the child level
	query.where.add(groupColumn.eq(groupValue));

	console.log('Run Query ' + ' - ' + parentLevelGroupColumnIndex + ' - ' + groupValue);

	// console.log(databaseManager.getSQL(query));

	var childFoundset = parentFoundset.duplicateFoundSet();
	childFoundset.loadRecords(query);

	// push dataproviders to the clientside foundset
	var dps = { };
	var hashedColumns = [];
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		var dpId = $scope.model.columns[idx].dataprovider;
		var idForFoundset = idForFoundsets[idx];
		dps[idForFoundset] = dpId;
		hashedColumns.push(dpId);
	}

	$scope.model.hashedFoundsets.push({
		foundset: {
			foundset: childFoundset,
			dataproviders: dps,
			sendSelectionViewportInitially: false,
			initialPreferredViewPortSize: 15
		},
		foundsetUUID: childFoundset,
		query: query
	}); // send it to client as a foundset property with a UUID

	// TODO this is not required
	// TODO perhaps R&D can improve this
	// send the column mapping; clientside i don't have the dataprovider id name and server side i don't have the idForFoundset.
	$scope.model.hashedColumns = hashedColumns;
	console.log('End');

	return childFoundset; // return the UUID that points to this foundset (return type will make it UUID)
};

$scope.getGroupedChildFoundsetUUID2 = function(parentFoundset, parentRecordFinder, parentLevelGroupColumnIndex, newLevelGroupColumnIndex, idForFoundsets) {
	// root is the parent
	console.log('SERVER SIDE');
	console.log(parentRecordFinder);
	console.log(parentLevelGroupColumnIndex);
	console.log(newLevelGroupColumnIndex);
	console.log(idForFoundsets);

	if (!parentFoundset) {
		parentFoundset = $scope.model.myFoundset.foundset;
	} else {
		console.log('Has a Parent Foundset');
	}

	// FIXME i cannot get the query from the parent foundset. I don't know if there is any duplicate relation.
	// I need the full column/key mapping
	/** @type {QBSelect} */
	var query = getQuery(parentFoundset); //parentFoundset.getQuery();

	console.log(query);

	var groupColumn;
	var groupDataprovider;
	if (newLevelGroupColumnIndex && newLevelGroupColumnIndex > -1) {
		// retrieve the grouping column
		groupDataprovider = $scope.model.columns[newLevelGroupColumnIndex].dataprovider;
		console.log('group on ' + groupDataprovider);

		if (isRelatedDataprovider(groupDataprovider)) {
			// should search for all the relations (can be multiple level)

			var relationNames = getDataProviderRelations(groupDataprovider);
			var columnName = getDataProviderColumn(groupDataprovider);

			console.log('is a join on ' + columnName);

			var join;
			// FIXME how do i know if has already a relation ?
			for (var i = 0; i < relationNames.length; i++) {
				var relationName = relationNames[i];
				var existingJoin = getJoin(query, relationName);
				if (existingJoin) {
					join = existingJoin;
				} else {
					join = query.joins.add(relationName, relationName);
				}
			}

			groupColumn = join.getColumn(columnName);
		} else {
			groupColumn = query.getColumn(groupDataprovider);
		}
	} else { // is not a new group, will be a leaf !

	}

	console.log('try')
	//	if (parentLevelGroupColumnIndex == undefined) { // this is the root column
	// this is the first grouping operation; alter initial query to get all first level groups

	// get the pks
	query.result.clear();
	query.result.addPk();
	var pkColumns = query.result.getColumns();
	query.result.clear();

	// Group pks handle pks
	for (var i = 0; i < pkColumns.length; i++) {
		query.result.add(pkColumns[i].min);
	}
	query.groupBy.add(groupColumn);
	query.sort.clear();
	query.sort.add(groupColumn);

	//	} else {
	//		// this is an intemediate group expand; alter query of parent level for the child level
	//		query.groupBy.clear();
	//		query.groupBy.add(groupColumn);
	//		var parentGroupColumnName = $scope.model.columns[parentLevelGroupColumnIndex].dataprovider;
	//		query.where.add(query.columns[parentGroupColumnName].eq(parentRecordFinder(parentFoundset)[parentGroupColumnName]));
	//	}

	console.log('Run Query ' + query);

	// console.log(databaseManager.getSQL(query));

	var childFoundset = parentFoundset.duplicateFoundSet();
	childFoundset.loadRecords(query);

	// push dataproviders to the clientside foundset
	var dps = { };
	var hashedColumns = [];
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		var dpId = $scope.model.columns[idx].dataprovider;
		var idForFoundset = idForFoundsets[idx];
		dps[idForFoundset] = dpId;
		hashedColumns.push(dpId);
	}

	$scope.model.hashedFoundsets.push({
		foundset: {
			foundset: childFoundset,
			dataproviders: dps,
			sendSelectionViewportInitially: false,
			initialPreferredViewPortSize: 15
		},
		foundsetUUID: childFoundset,
		query: query
	}); // send it to client as a foundset property with a UUID

	// TODO this is not required
	// TODO perhaps R&D can improve this
	// send the column mapping; clientside i don't have the dataprovider id name and server side i don't have the idForFoundset.
	$scope.model.hashedColumns = hashedColumns;
	console.log('End');

	return childFoundset; // return the UUID that points to this foundset (return type will make it UUID)
};

/**
 * @param {Object} parentFoundset
 * @param {Object} parentRecordFinder
 * @param {Number} parentLevelGroupColumnIndex
 * @param {Array<String>} idForFoundsets an array with the ID of all the columns. Since the id of a columns is known only client-side
 *
 *
 *  */
$scope.getLeafChildFoundsetUUID2 = function(parentFoundset, parentRecordFinder, parentLevelGroupColumnIndex, idForFoundsets) {

	console.log(parentRecordFinder);
	console.log(parentLevelGroupColumnIndex);
	console.log(idForFoundsets);

	// root is the parent
	console.log('SERVER SIDE LEAF');
	if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;

	/** @type {QBSelect} */
	var query = getQuery(parentFoundset); //parentFoundset.getQuery();

	var groupColumn;
	var groupDataprovider;
	var groupValue;

	groupDataprovider = $scope.model.columns[parentLevelGroupColumnIndex].dataprovider;
	groupValue = parentRecordFinder['col_' + parentLevelGroupColumnIndex];

	if (isRelatedDataprovider(groupDataprovider)) {
		// should search for all the relations (can be multiple level)

		var relationNames = getDataProviderRelations(groupDataprovider);
		var columnName = getDataProviderColumn(groupDataprovider);

		console.log('is a join on ' + columnName);

		var join;
		// FIXME how do i know if has already a relation ?
		for (var i = 0; i < relationNames.length; i++) {
			var relationName = relationNames[i];

			var existingJoin = getJoin(query, relationName);

			if (existingJoin) {
				join = existingJoin;
			} else {
				join = query.joins.add(relationName, relationName);
			}
		}

		groupColumn = join.getColumn(columnName);
	} else {
		groupColumn = query.getColumn(groupDataprovider);
	}

	console.log(parentRecordFinder)

	// this is an intemediate group expand; alter query of parent level for the child level
	query.where.add(groupColumn.eq(groupValue));

	console.log('Run Query ' + ' - ' + parentLevelGroupColumnIndex + ' - ' + groupValue);

	// console.log(databaseManager.getSQL(query));

	var childFoundset = parentFoundset.duplicateFoundSet();
	childFoundset.loadRecords(query);

	// push dataproviders to the clientside foundset
	var dps = { };
	var hashedColumns = [];
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		var dpId = $scope.model.columns[idx].dataprovider;
		var idForFoundset = idForFoundsets[idx];
		dps[idForFoundset] = dpId;
		hashedColumns.push(dpId);
	}

	$scope.model.hashedFoundsets.push({
		foundset: {
			foundset: childFoundset,
			dataproviders: dps,
			sendSelectionViewportInitially: false,
			initialPreferredViewPortSize: 15
		},
		foundsetUUID: childFoundset,
		query: query
	}); // send it to client as a foundset property with a UUID

	// TODO this is not required
	// TODO perhaps R&D can improve this
	// send the column mapping; clientside i don't have the dataprovider id name and server side i don't have the idForFoundset.
	$scope.model.hashedColumns = hashedColumns;
	console.log('End');

	return childFoundset; // return the UUID that points to this foundset (return type will make it UUID)
};

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

	console.log('getJoins ' + joins.length);
	for (var i = 0; i < joins.length; i++) {
		var join = joins[i];

		console.log(join.getTableAlias());
		if (join.getTableAlias() == alias) {
			return join;
		}
	}
	return null;
}

