$scope.getGroupedChildFoundsetUUID = function(parentFoundset, parentRecordFinder, parentLevelGroupColumnIndex, newLevelGroupColumnIndex, idForFoundsets) {
	// root is the parent
	console.log('SERVER SIDE');
	if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;

	/** @type {QBSelect} */
	var query = parentFoundset.getQuery();

	var groupColumn;
	var groupDataprovider;
	if (newLevelGroupColumnIndex && newLevelGroupColumnIndex > -1) {
		// retrieve the grouping column
		groupDataprovider = $scope.model.columns[newLevelGroupColumnIndex].dataprovider;
		groupColumn = query.getColumn(groupDataprovider);
	} else { // is not a new group, will be a leaf !

	}

	console.log('try')
	if (parentLevelGroupColumnIndex == undefined) { // this is the root column
		// this is the first grouping operation; alter initial query to get all first level groups

		var pkColumns = query.result.getColumns();

		query.result.clear();
		// Group pks handle pks
		for (var i = 0; i < pkColumns.length; i++) {
			query.result.add(pkColumns[i].min);
		}
		query.groupBy.add(groupColumn);
		query.sort.clear();
		query.sort.add(groupColumn);

	} else {
		// this is an intemediate group expand; alter query of parent level for the child level
		query.groupBy.clear();
		query.groupBy.add(groupColumn);
		var parentGroupColumnName = $scope.model.columns[parentLevelGroupColumnIndex].dataprovider;
		query.where.add(query.columns[parentGroupColumnName].eq(parentRecordFinder(parentFoundset)[parentGroupColumnName]));
	}

	console.log('Run Query');

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
		}, foundsetUUID: childFoundset
	}); // send it to client as a foundset property with a UUID

	// TODO this is not required
	// TODO perhaps R&D can improve this
	// send the column mapping; clientside i don't have the dataprovider id name and server side i don't have the idForFoundset.
	$scope.model.hashedColumns = hashedColumns;
	console.log('End');

	return childFoundset; // return the UUID that points to this foundset (return type will make it UUID)
};

$scope.getLeafChildFoundsetUUID = function(parentFoundset, parentRecordFinder, parentLevelGroupColumnIndex, idForFoundsets) {

	// root is the parent
	console.log('SERVER SIDE LEAF');
	if (!parentFoundset) parentFoundset = $scope.model.myFoundset.foundset;

	/** @type {QBSelect} */
	var query = parentFoundset.getQuery();

	var groupColumn;
	var groupDataprovider;
	var groupValue;
	

	groupDataprovider = $scope.model.columns[parentLevelGroupColumnIndex].dataprovider;
	groupColumn = query.getColumn(groupDataprovider);
	groupValue = parentRecordFinder['col_' + parentLevelGroupColumnIndex];
	
	console.log(parentRecordFinder)


	// this is an intemediate group expand; alter query of parent level for the child level
	query.where.add(groupColumn.eq(groupValue));

	console.log('Run Query ' + ' - ' + parentLevelGroupColumnIndex +  ' - ' + groupValue);

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
		}, foundsetUUID: childFoundset
	}); // send it to client as a foundset property with a UUID

	// TODO this is not required
	// TODO perhaps R&D can improve this
	// send the column mapping; clientside i don't have the dataprovider id name and server side i don't have the idForFoundset.
	$scope.model.hashedColumns = hashedColumns;
	console.log('End');

	return childFoundset; // return the UUID that points to this foundset (return type will make it UUID)
};