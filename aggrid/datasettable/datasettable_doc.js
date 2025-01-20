/* Power Grid is an editable table component providing advanced functionality such as row grouping, pivoting, summaries and powerful analytics. It's data is loaded from a JSDataSet, and the changed data (if it is edited) can be exported back as a dataset. */

/**
 * Export data to excel format (xlsx)
 * 
 * @param {string} [fileName] The name of the file to save the exported data to. If not provided, a default name will be used.
 * @param {Boolean} [skipHeader] If true, the headers of the table will be excluded from the exported file. Defaults to false.
 * @param {Boolean} [columnGroups] If true, includes column group information in the export. Defaults to false.
 * @param {Boolean} [skipFooters] If true, the footers of the table will be excluded from the exported file. Defaults to false.
 * @param {Boolean} [skipGroups] If true, group rows will be excluded from the exported file. Defaults to false.
 * @param {Boolean} [asCSV] If true, the data will be exported in CSV format instead of XLSX. Defaults to false.
 */
function exportData(fileName, skipHeader, columnGroups, skipFooters, skipGroups, asCSV) {
}

/**
 * Export data to JSDataSet
 *
 * @return {JSDataset} A dataset object containing the exported grid data, where the first row represents 
 */
function exportToDataset() {
}

/**
 *  Sets selected rows
 * 
  * @param {Array<Number>} rowIndexes An array of 0-based row indexes to be selected in the table.
 */
function setSelectedRows(rowIndexes) {
}

/**
 * Gets selected rows data
 * 
 * @return {Array<Object>} An array of objects representing the data of the currently selected rows in the table.
 */
 function getSelectedRows() {
}

/**
 * Start cell editing (only works when the table is not in grouping mode).
 * @param {Number} rowindex Row index of the editing cell (0-based)
 * @param {Number} columnindex Column index in the model of the editing cell (0-based)
 */
function editCellAt(rowindex, columnindex) {
}

/**
 * If a cell is editing, it stops the editing
 *@param {Boolean} [cancel] 'true' to cancel the editing (ie don't accept changes)
 */
function stopCellEditing(cancel) {
}

/**
 * Returns pivot mode state
 * 
 * @return {Boolean} True if the pivot mode is currently enabled, otherwise false.
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
 * @param {Object} rowData RowData with at least on attribute, used to find the viewport row to scroll to
 */
function scrollToRow(rowData) {
}

/** 
 * Adds new column at specified index. Index is 0 based.
 * 
 * @param {string} id The unique identifier for the new column to be added.
 * @param {Number} [index] 0-based index
 * @return {column} The column object that was created and added to the table.
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
 * @return {string} A JSON string representing the current state of the columns, including their width, position, and grouping state.
 */
function getColumnState() {
}


/**
 * Restore columns state to a previously save one, using getColumnState.
 * If no argument is used, it restores the columns to designe time state.
 * It won't re-create deleted columns.
 * 
 * @param {String} [columnState] A JSON string representing the saved state of the columns, including width, position, and grouping state. If not provided, the columns will be restored to their design-time state.
 */            
function restoreColumnState(columnState) {
}

/**
 * Returns all the columns
 * 
 * @return {column[]} An array of all column objects currently defined in the table.
 */
function getAllColumns() {
}

/**
 * Gets the column with id. If changes will be made on
 * the returned column, it should be called with forChange set to true
 * 
 * @param {string} id The unique identifier of the column to retrieve in the Servoy grid.
 * @param {Boolean} [forChange] Indicates whether the column is being retrieved for modifications.
 * @return {column} The column object associated with the specified id in the Servoy grid.
 */
function getColumn(id, forChange) {
}

/**
 * Fills the table with data from a dataset.
 * The column name from the dataset is used to match on the component column id
 * 
 * @param {JSDataset} [dataset] The dataset containing the data to populate the table. The dataset's column names must match the component's column IDs to bind data correctly.
 * @param {Array<String>} [pks] list of dataprovider names; needed in case of using apis: updateRows and deleteRows
 */
function renderData(dataset, pks) {
}

/**
 * When useLazyLoading is set, this method is used to append the new rows
 * to the table from inside the onLazyLoadingGetRows callback.<br/><br/>
 * 
 * The new rows are passed using a dataset.<br/><br/>
 * 
 * "lastRowIndex" specifies the index of the last row on the server; if not set, the lazy loading will behave
 * like an infinite scroll, and onLazyLoadingGetRows will be called called until "lastRowIndex" will be set
 * 
 * @param {JSDataset} dataset The dataset containing the new rows to append to the table. The dataset's structure must align with the table's columns for proper data binding.
 * @param {long} [lastRowIndex] The index of the last row available on the server. If not provided, lazy loading will function as infinite scrolling until this value is set.
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
 * Returns currently expanded groups as an object like:
 * {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
 *
 * @return {Object} An object representing the currently expanded groups in the table.
 */
function getExpandedGroups() {
}


/**
 * Create new rows
 *
 * @param {Array<Object>} rowsData new rows
 * @param {Boolean} [appendToBeginning] If true rows will be added to the beginning of the table
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
 * @param {map} aggFuncs Object with properties names the aggregates name, and values the custom function as string
 */
function addAggCustomFuncs(aggFuncs) {
}

/**
 * Move column
 * @param {string} id Column id
 * @param {Number} index New position (0-based)
 */
function moveColumn(id, index) {
}

/**
 * Automatically adjusts the widths of all columns to fit their content.
 * This method ensures that each column's width is sized according to the data it contains, 
 * without leaving extra unused space.
 *
 * @example
 * // Auto-size all columns in the grid
 * powerGridInstance.autoSizeAllColumns();
 */
function autoSizeAllColumns() {
}

/**
 * Adjusts the columns' widths to fit the available viewport, ensuring that all visible columns are resized to fill the table's width.
 * This method dynamically resizes columns to ensure no empty space remains in the grid's horizontal viewport.
 *
 * @example
 * elements.myTable.sizeColumnsToFit();
 */
function sizeColumnsToFit() {
}