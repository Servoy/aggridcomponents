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

			var join = query;
			
			// FIXME how do i know if has already a relation ?
			for (var j = 0; j < relationNames.length; j++) {
				var relationName = relationNames[j];
				// use unique name for multiple level relations
				var relationPath = relationNames.slice(0, j+1).join("____");
				console.log(relationPath)
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
		query.groupBy.add(groupColumn);
		query.sort.clear();
		query.sort.add(groupColumn);

		console.log('Run Query ' + query);

	} else { // is not a new group, will be a leaf !

	}

	console.log('try')

	// this is the first grouping operation; alter initial query to get all first level groups
	var childFoundset = parentFoundset.duplicateFoundSet();
	childFoundset.loadRecords(query);
	
	console.log('Matching records ' + childFoundset.getSize());

	// push dataproviders to the clientside foundset
	var dps = { };
	for (var idx = 0; idx < $scope.model.columns.length; idx++) {
		// the dataprovider name e.g. orderid
		var dpId = $scope.model.columns[idx].dataprovider;
		// the idForFoundset(exists only client-side, therefore i need to retrieve it from the client)
		var idForFoundset = idForFoundsets[idx];
		// Servoy resolves the real dataprovider name into the dataprovider 'field'
		dps[idForFoundset] = dpId;
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
	for (var i = 0; i < joins.length; i++) {
		var join = joins[i];
		if (join.getTableAlias() == alias) {
			return join;
		}
	}
	return null;
}

