/**
 * Export data to excel format (xlsx)
 * 
 * @param {String} fileName 
 * @param {Boolean} skipHeader 
 * @param {Boolean} columnGroups 
 * @param {Boolean} skipFooters 
 * @param {Boolean} skipGroups 
 * @param {Boolean} asCSV 
 */
function exportData(fileName, skipHeader, columnGroups, skipFooters, skipGroups, asCSV) {
}

/**
 *  Sets selected rows
 * 
 *  @param Array<Number> rowIndexes (0-based)
 */
function setSelectedRows(rowIndexes) {
}

/**
 * Gets selected rows data
 * 
 * @return {Array<String>}
 */
 function getSelectedRows() {
}

/**
 * Start cell editing (only works when the table is not in grouping mode).
 * @param rowindex row index of the editing cell (0-based)
 * @param columnindex column index in the model of the editing cell (0-based)
 */
function editCellAt(rowindex, columnindex) {
}

/**
 * If a cell is editing, it stops the editing
 * @param cancel 'true' to cancel the editing (ie don't accept changes)
 */
function stopCellEditing(cancel) {
}

/**
 * Returns pivot mode state
 */
function isPivotMode() {    
}

/**
 * Sets expanded groups
 *
 * @param {Object} groups an object like {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
 */
function setExpandedGroups(groups) {
}

/**
 * Scroll viewport to matching row
 * 
 * @param rowData rowData with at least on attribute, used to find the viewport row to scroll to
 */
function scrollToRow(rowData) {
}

/** 
 * Adds new column at specified index. Index is 0 based.
 * 
 * @param {String} id
 * @param {Number} [index] 0-based index
 * @return {column}
 * 
 */
function newColumn(id, index) {
}

/**
 * Removes column with id
 * 
 * @param {String} id 
 */
function deleteColumn(id) {
}

/**
 * Returns the current state of the columns (width, position, grouping state) as a json string
 * that can be used to restore to this state using restoreColumnState
 * 
 * @return {String}
 */
function getColumnState() {
}


/**
 * Restore columns state to a previously save one, using getColumnState.
 * If no argument is used, it restores the columns to designe time state.
 * It won't re-create deleted columns.
 * 
 * @param {String} columnState
 * @return {boolean}
 */            
function restoreColumnState(columnState) {
}

/**
 * Returns all the columns
 * 
 * @return {Array<column>}
 */
function getAllColumns() {
}

/**
 * Gets the column with id. If changes will be made on
 * the returned column, it should be called with forChange set to true
 * 
 * @param {String} id 
 * @param {Boolean} forChange 
 * @return {column}
 */
function getColumn(id, forChange) {
}

/**
 * Fills the table with data from a dataset.
 * The column name from the dataset is used to match on the
 * component column id
 * 
 * @param {JSDataSet} dataset
 * @param {Array<String>} [pks] list of dataprovider names; needed in case of using apis: updateRows and deleteRows
 */
function renderData(dataset, pks) {
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
function appendLazyRequestData(dataset, lastRowIndex) {
}

/**
 * Set the currently opened form editor value
 *
 * @param {Object} value form editor value
 */
function setFormEditorValue(value) {
}

/**
 * Returns currently expanded groups as an object like
 * {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
 *
 * @returns {Object}
 */
function getExpandedGroups() {
}


/**
 * Create new rows
 *
 * @param {Array<Object>} rowsData new rows
 * @param {Boolean} appendToBeginning if true rows will be added to the beginning of the table 
 */
function newRows(rowsData, appendToBeginning) {
}

/**
 * Update rows - in order to work, pks needs to be set using renderData, and the rowData objects needs to have pk
 *
 * @param {Array<Object>} rowsData update rows
 */
function updateRows(rowsData) {
}

/**
 * Delete rows - in order to work, pks needs to be set using renderData, and the rowsKey objects needs to have pk
 *
 * @param {Array<Object>} rowsKey delete rows
 */
function deleteRows(rowsKey) {
}

/**
 * Add custom aggregate functions.
 * Ex.: addAggCustomFuncs({ myAggregate: '(function (valuesArray) { return myAggValueNumber })'})
 *
 * @param {Object} aggFuncs object with properties names the aggregates name, and values the custom function as string
 */
function addAggCustomFuncs(aggFuncs) {
}

/**
 * Move column
 * @param id column id
 * @param index new position (0-based)
 */
function moveColumn(id, index) {
}
