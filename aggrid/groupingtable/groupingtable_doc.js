/**
 * Return the column index for the given column id.
 * Can be used in combination with getColumnState to retrieve the column index for the column state with colId in the columnState object.
 * 
 * @param {String} colId
 * 
 * @return {Number}
 * @example <pre>
 * // get the state
 * var state = elements.table.getColumnState();
 * // parse the state of each column
 * var columnsState = JSON.parse(state).columnState;
 *
 * for (var index = 0; index < columnsState.length; index++) {
 * 
 *   // skip column hidden by the user
 *   if (!columnsState[index].hide) {
 * 
 * 	  // get the column using the colId of the columnState
 * 	  var columnIndex = elements.table.getColumnIndex(columnsState[index].colId);
 * 		if (columnIndex > -1) {
 * 		  var column = elements.table.getColumn(columnIndex);
 * 		  // do something with column				
 * 		}
 * 	}
 * }
 * </pre>
 * @private 
 * */
function internalGetColumnIndex(colId) {
}

/**
 * Notify the component about a data change. Makes the component aware of a data change that requires a refresh data.
 * Call this method when you are aware of a relevant data change in the foundset which may affect data grouping (e.g. group node created or removed).
 * The component will alert the user of the data change and will suggest the user to perform a refresh.
 * <br/>
 * Please note that it’s not necessary to notify the table component is the component is not visible;
 * the component will always present the latest data when rendered again.
 *
 * @public
 * */
function notifyDataChange() {
}

/**
 * Force a full refresh of the data.
 * <br/>
 * <br/>
 * <b>WARNING !</b> be aware that calling this API results in bad user experience since all group nodes will be collapsed instantaneously.
 *
 * @public
 * */
function refreshData() {
}

/**
 * Returns the selected rows when in grouping mode
 */
function getGroupedSelection() {
}

/**
 * Start cell editing (only works when the table is not in grouping mode).
 * @param foundsetindex foundset row index of the editing cell (1-based)
 * @param columnindex column index in the model of the editing cell (0-based)
 */
function editCellAt(foundsetindex, columnindex) {
}

/**
 * Request focus on the given column
 * @param columnindex column index in the model of the editing cell (0-based)
 */
function requestFocus(columnindex) {
}

/**
 * Scroll to the selected row
 */				
function scrollToSelection() {
}

/**
 * If a cell is editing, it stops the editing
 * @param cancel 'true' to cancel the editing (ie don't accept changes)
 */
function stopCellEditing(cancel) {
}

/**
 * Sets expanded groups
 *
 * @param {Object} groups an object like {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
 */
function setExpandedGroups(groups) {
}


/**
 * Show or hide the ToolPanel
 *
 * @param {Boolean} show
 */
function showToolPanel(show) {
}

/**
 * Returns true if the ToolPanel is showing
 *
 * @return {Boolean}
 */
function isToolPanelShowing(show) {
}


/**
 * Table column API
 */

 /**
 * Gets the number of columns
 * 
 * @example
 *  %%prefix%%%%elementName%%.getColumnsCount()
 */ 
function getColumnsCount() {
}

/**
 * Gets the column at index. Index is 0 based.
 * 
 * @param index index between 0 and columns length -1
 * 
 * @example
 *  %%prefix%%%%elementName%%.getColumn()
 *  
 * @return {column}
 */ 
function getColumn(index) {
}

/**
 * Adds new column at specified index. Index is 0 based.
 * 
 * @param dataproviderid dataprovider of the column
 * @param index index between 0 and columns length
 * 
 * @example
 *  var column = %%prefix%%%%elementName%%.newColumn('dataproviderid')
 *
 *  @return {column}
 */
function newColumn(dataproviderid,index) {
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
function removeColumn(index) {
}

/**
 * Removes all columns.
 *
 * @example
 * %%prefix%%%%elementName%%.removeAllColumns()
 *
 * @return {boolean}
 */
function removeAllColumns() {
}

/**
 * Restore columns state to a previously save one, using getColumnState.
 * If no argument is used, it restores the columns to designe time state.
 * If the columns from columnState does not match with the columns of the component,
 * no restore will be done. The optional boolean arguments: columns, filter, sort can
 * be used to specify what to restore, the columns size/position/visibility (default true),
 * the filter state (default false), the sort state (default false).
 * 
 * @param {String} columnState
 * @param {Function} onError
 * @param {Boolean} columns
 * @param {Boolean} filter
 * @param {Boolean} sort
 */
function restoreColumnState(columnState, onError, columns, filter, sort) {
}

/**
 * Auto-sizes all columns based on content.
 * 
 */
function autoSizeAllColumns() {
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
 * Set the table read-only state. If no columnids is used, all columns read-only state is set,
 * otherwise only for the columns specified.
 *
 * @param {Boolean} readOnly read-only state
 * @param {Array<String>} columnids array of column ids to make ready-only
 */
function setReadOnly(readOnly, columnids) {
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
 * Return the column index for the given column id.
 * Can be used in combination with getColumnState to retrieve the column index for the column state with colId in the columnState object.
 * 
 * @param {String} colId
 * 
 * @return {Number}
 * @example <pre>
 * // get the state
 * var state = elements.table.getColumnState();
 * // parse the state of each column
 * var columnsState = JSON.parse(state).columnState;
 *
 * for (var index = 0; index < columnsState.length; index++) {
 * 
 *   // skip column hidden by the user
 *   if (!columnsState[index].hide) {
 * 
 *    // get the column using the colId of the columnState
 *    var columnIndex = elements.table.getColumnIndex(columnsState[index].colId);
 *      if (columnIndex > -1) {
 *        var column = elements.table.getColumn(columnIndex);
 *        // do something with column               
 *      }
 *  }
 * }
 * </pre>
 * @public
 * */
function getColumnIndex(colId) {
}

