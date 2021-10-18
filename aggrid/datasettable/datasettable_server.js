/** 
 * Adds new column at specified index. Index is 0 based.
 * 
 * @param {String} id
 * @param {Number} [index] 0-based index
 * @return {column}
 * 
 */
$scope.api.newColumn = function(id, index) {
    if(!$scope.model.columns) {
        $scope.model.columns = [];
    }
    var newColumn = {}
    newColumn["id"] = id;
    newColumn["pivotIndex"] = -1;
    newColumn["rowGroupIndex"] = -1;
    newColumn["visible"] = true;
    newColumn["width"] = 0;

    if (index >= 0) {
    	$scope.model.columns.splice(index, 0, newColumn);
    	return $scope.model.columns[index];
    } else {
    	$scope.model.columns.push(newColumn);
    	return $scope.model.columns[$scope.model.columns.length - 1];
    }
}

/**
 * Removes column with id
 * 
 * @param {String} id 
 */
$scope.api.deleteColumn = function(id) {
    if($scope.model.columns) {
        for(var i = 0; i < $scope.model.columns.length; i++) {
            if(id == $scope.model.columns[i]["id"]) {
                $scope.model.columns.splice(i, 1);
                break;
            }
        }
    }
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
 * Restore columns state to a previously save one, using getColumnState.
 * If no argument is used, it restores the columns to designe time state.
 * It won't re-create deleted columns.
 * 
 * @param {String} columnState
 * @return {boolean}
 */            
$scope.api.restoreColumnState = function(columnState) {
    // TODO: add checks if restore can't be done, and return false
    $scope.model._internalColumnState = columnState;
}

/**
 * Returns all the columns
 * 
 * @return {Array<column>}
 */
$scope.api.getAllColumns = function() {
    return $scope.model.columns;
}

/**
 * Gets the column with id. If changes will be made on
 * the returned column, it should be called with forChange set to true
 * 
 * @param {String} id 
 * @param {Boolean} forChange 
 * @return {column}
 */
$scope.api.getColumn = function(id, forChange) {
    if($scope.model.columns) {
        for(var i = 0; i < $scope.model.columns.length; i++) {
            if(id == $scope.model.columns[i]["id"]) {
                var column = $scope.model.columns[i];
                if(forChange) {
                    // force structure change so it will be sent to the client
                    $scope.model.columns.splice(i, 1);
                    $scope.model.columns.splice(i, 0, column);
                }
                return column;                 
            }
        }
    }
    return null;
}

/**
 * Fills the table with data from a dataset.
 * The column name from the dataset is used to match on the
 * component column id
 * 
 * @param {JSDataSet} dataset 
 */
$scope.api.renderData = function(dataset) {
    $scope.model.data = []
    var rowsCount = dataset.getMaxRowIndex();

    for(var i = 1; i <= rowsCount; i++) {
        var row = dataset.getRowAsArray(i);
        var rowData = {};
        for(var j = 0; j < row.length; j++) {
            var columnName = dataset.getColumnName(j + 1);
            var value = row[j];
        	if(value instanceof Date) {
                var column = getColumnByDataprovider(columnName);
                if(column && column.formatType == 'DATETIME' && column.format) {
                    try {
                        var formatJSON = JSON.parse(column.format);
                        if(formatJSON.useLocalDateTime) {
                            var tzoffset = value.getTimezoneOffset() * 60000; //offset in milliseconds
                            value = (new Date(value.getTime() - tzoffset)).toISOString().slice(0, -1);
                        }
                    }
                    catch(e) {}
                }
        	}
            rowData[columnName] = value;
        }
        $scope.model.data.push(rowData);
    }     
}

/**
 * When useLazyLoading is set, this method is used to append the new rows
 * to the table from inside the onLazyLoadingGetRows callback.
 * The new rows are passed using a dataset, lastRowIndex specify the index
 * of the last row on the server, if not set, the lazy loading will behave 
 * like an infinite scroll, and onLazyLoadingGetRows called until lastRowIndex
 * will be set
 * 
 * @param {JSDataSet} dataset
 * @param {Number} lastRowIndex 
 */
$scope.api.appendLazyRequestData = function(dataset, lastRowIndex) {
    $scope.model.lastRowIndex = null;
    $scope.api.renderData(dataset);
    if(lastRowIndex) {
        $scope.model.lastRowIndex = lastRowIndex;
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

function getColumnByDataprovider(dp) {
    if($scope.model.columns) {
        for(var i = 0; i < $scope.model.columns.length; i++) {
            if(dp == $scope.model.columns[i]["dataprovider"]) {
                return $scope.model.columns[i];
            }
        }
    }
    return null;
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