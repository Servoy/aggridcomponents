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
 * @param {JSDataSet} [dataset]
 * @param {Array<String>} [pks] list of dataprovider names; needed in case of using apis: updateRows and deleteRows
 */
$scope.api.renderData = function(dataset, pks) {
    if(dataset) {
        $scope.model.pks = pks;
        $scope.model.data = []
        var rowsCount = dataset.getMaxRowIndex();

        for(var i = 1; i <= rowsCount; i++) {
            var row = dataset.getRowAsArray(i);
            var rowData = {};
            for(var j = 0; j < row.length; j++) {
                var columnName = dataset.getColumnName(j + 1);
				columnName = columnName.toLowerCase();
                rowData[columnName] = convertData(row[j], columnName);
            }
            $scope.model.data.push(rowData);
        }
    } else {
        $scope.model._internalResetLazyLoading = true;
    }
}

function convertData(value, columnName) {
    var convertedValue = value;
    if(convertedValue instanceof Date) {
        var column = getColumnByDataprovider(columnName);
        if(column && column.formatType == 'DATETIME' && column.format) {
            try {
                var formatJSON = JSON.parse(column.format);
                if(formatJSON.useLocalDateTime) {
                    var tzoffset = convertedValue.getTimezoneOffset() * 60000; //offset in milliseconds
                    convertedValue = (new Date(convertedValue.getTime() - tzoffset)).toISOString().slice(0, -1);
                }
            }
            catch(e) {}
        }
    }
    return convertedValue;
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
 * @param {Array<String>} [pks] list of dataprovider names; needed in case of using apis: updateRows and deleteRows
 */
$scope.api.appendLazyRequestData = function(dataset, lastRowIndex, pks) {
    $scope.model.lastRowIndex = null;
    $scope.api.renderData(dataset, pks ? pks : $scope.model.pks);
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

$scope.clearUpdateData = function() {
    $scope.model.updateData = null;
}

/**
 * Create new rows
 *
 * @param {Array<Object>} rowsData new rows
 * @param {Boolean} appendToBeginning if true rows will be added to the beginning of the table 
 */
$scope.api.newRows = function(rowsData, appendToBeginning) {
    if(!$scope.model.updateData) $scope.model.updateData = {};
    $scope.model.updateData['add'] = getConvertedRowData(rowsData);
    $scope.model.updateData['addIndex'] = appendToBeginning ? 0 : null;
}

/**
 * Update rows - in order to work, pks needs to be set using renderData, and the rowData objects needs to have pk
 *
 * @param {Array<Object>} rowsData update rows
 */
$scope.api.updateRows = function(rowsData) {
    if(!$scope.model.updateData) $scope.model.updateData = {};
    $scope.model.updateData['update'] = getConvertedRowData(rowsData);
}

/**
 * Delete rows - in order to work, pks needs to be set using renderData, and the rowsKey objects needs to have pk
 *
 * @param {Array<Object>} rowsKey delete rows
 */
$scope.api.deleteRows = function(rowsKey) {
    if(!$scope.model.updateData) $scope.model.updateData = {};
    $scope.model.updateData['remove'] = getConvertedRowData(rowsKey);
}

function getConvertedRowData(rowsData) {
    var convertedRowsData = [];
    if(rowsData && rowsData.length) {
        for(var i = 0; i < rowsData.length; i++) {
            var rowDataCopy = {};
            for (var prop in rowsData[i]) {
                if (rowsData[i].hasOwnProperty(prop)) {
                    rowDataCopy[prop] = convertData(rowsData[i][prop], prop);
                }
            }
            convertedRowsData.push(rowDataCopy);
        }
    }
    return convertedRowsData;
}

/**
 * Add custom aggregate functions.
 * Ex.: addAggCustomFuncs({ myAggregate: '(function (valuesArray) { return myAggValueNumber })'})
 *
 * @param {Object} aggFuncs object with properties names the aggregates name, and values the custom function as string
 */
$scope.api.addAggCustomFuncs = function(aggFuncs) {
    $scope.model._internalAggCustomFuncs = [];

    for(var aggFuncName in aggFuncs) {
        $scope.model._internalAggCustomFuncs.push({
            name: aggFuncName,
            aggFunc: aggFuncs[aggFuncName]
        });
    }
}

$scope.api.exportToDataset = function() {
    var exportDataSet = null;
    var exportData = $scope.api.internalExportToDataset();
    if(exportData.length) {
        exportDataSet = servoyApi.createEmptyDataSet();
        for(var colIndex = 0; colIndex < exportData[0].length; colIndex++) {
            exportDataSet.addColumn(rowIndex, exportData[0][colIndex]);
        }
        for(var rowIndex = 1; rowIndex < exportData.length; rowIndex++) {
            exportDataSet.addRow(rowIndex, exportData[rowIndex]);
        }
    }
    return exportDataSet;
}
