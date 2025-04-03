/* Data Grid is a table with advanced functionality that operates on JSFoundset data (so it can work directly with the database). It is designed to work with a large number of rows, potentially infinite, since data is loaded lazily into the table, even when grouped. */

/**
 * The foundset where data are fetched from
 */
var myFoundset;

/**
 * List all columns to be used in table as dataprovider
 */
var columns;

/**
 * Table's height to be set in a responsive form. When responsiveHeight is set to 0, the table will use 100% height of the parent container. When responsiveHeight is set to -1, the table will auto-size it's height to the number of rows displayed inside the grid - in this case there is no vertical scrollbar and all rows are rendered
 */
var responsiveHeight;

/**
 * The height in pixels of the table's rows
 */
var rowHeight;

/**
 * Use dataSource calculation as rowStyleClassDataprovider to set styleClass conditionally to rows. The calculation should return the class name (or names) to be applied to the row
 */
var rowStyleClassDataprovider;

/**
 * CSS class for the cell.
 */
var styleClass;

/**
 * Allow the user to resize columns
 */
var enableColumnResize;

/**
 * If moving of columns is enabled
 */
var enableColumnMove;

/**
 * Enable column sorting by clickin on the column's header
 */
var enableSorting;

/**
 * When true the row has a checkbox for selecting/unselecting 
 */
var checkboxSelection;

/**
 * When true the group takes the entire row
 */
var groupUseEntireRow;

/**
 * When true the group has checkbox for selecting/unselecting all child rows 
 */
var groupCheckbox;

/**
 * Tooltip text shown when hovering the refresh button
 */
var tooltipTextRefreshData;

/**
 * Controls the visibility of the grid component.
 */
var visible;

/**
 * If the column selection panel should be shown in the column menu
 */
var showColumnsMenuTab;

/**
 * Configuration object for the ag‑grid tool panel (e.g., which panels to show, button behavior).
 */
var toolPanelConfig;


/**
 * Custom icon configuration for grid features (e.g., sort, filter, group icons).
 */
var iconConfig;

/**
 * Map where additional grid properties of ag-grid can be set
 */
var gridOptions;

/**
 * Map where locales of ag-grid can be set
 */
var localeText;

/**
 * Flag indicating if the grid is in read‑only mode, disabling editing.
 */
var readOnly;

/**
 * Flag indicating if the grid is enabled for user interaction.
 */
var enabled;

/**
 * Configuration for main menu items (customizes options like column pinning, sorting, etc.).
 */
var mainMenuItemsConfig;

/**
 * Defines action on TEXTFIELD editor for up/down arrow keys
 */
var arrowsUpDownMoveWhenEditing;

/**
 * Auto sizing for columns. SIZE_COLUMNS_TO_FIT: make the currently visible columns fit the screen. AUTO_SIZE: the grid will work out the best width to fit the contents of the 'visible' cells in the column. NONE: no auto sizing action performed
 */
var columnsAutoSizing;

/**
 * Apply 'columnsAutoSizing' whenever columns width are changed
 */
var continuousColumnsAutoSizing;

/**
 * Apply 'columnsAutoSizing' for these events even if 'continuousColumnsAutoSizing' is false
 */
var columnsAutoSizingOn;

/**
 * When true the number of rows for groups is shown, beside the name
 */
var showGroupCount;

/**
 * When true, shows a loading indicator while data is being fetched or refreshed.
 */
var showLoadingIndicator;

/**
 * Determines whether the focus should move to the next cell when Enter is pressed.
 */
var editNextCellOnEnter;

/**
 * Tab sequence index used for keyboard navigation in the grid.
 */
var tabSeq;

/**
 * Callback when dragging over a row - returns one of the strings: 'copy', 'move', 'none' depending on the allowed drag operation.
 */
var onDragOverFunc;

/**
 * Called when row(s) drag-n-drop is started, to get the drag image as an html code.
 */
var onDragGetImageFunc;

/**
 * Menu items to append to the columns menu, beside the default aggrid menus.
 */
var customMainMenu;


var handlers = {
    /**
     * Called when the selected rows have changed.
     *
     * @param {Boolean} [isgroupselection] Indicates if the selection change pertains to a group row.
     * @param {String} [groupcolumnid] The ID of the column used for grouping, if applicable.
     * @param {Object} [groupkey] The key identifying the group whose selection has changed.
     * @param {Boolean} [groupselection] True if the entire group is selected; false if deselected.
     */
    onSelectedRowsChanged: function() {},

    /**
     * Called when the mouse is clicked on a row/cell.
     * The foundsetindex is always -1 when there are grouped rows.
     * If a column is disabled (enabled = false), ensure that you only execute code for that column if columnindex corresponds to it.
     *
     * @param {Number} foundsetindex - The index of the clicked row in the foundset (or -1 for grouped rows).
     * @param {Number} columnindex - The index of the clicked column in the grid.
     * @param {JSRecord} record - The record object corresponding to the clicked row. (Optional)
     * @param {JSEvent} [event] - The event object associated with the click. (Optional)
     * @param {String} [dataTarget] - Optional identifier indicating the target data context. (Optional)
     * @private
     */
    onCellClick: function() {},

    /**
     * Called when the mouse is double-clicked on a row/cell.
     * The foundsetindex is always -1 when there are grouped rows.
     * If a column is disabled (enabled = false), ensure that you only execute code for that column if columnindex corresponds to it.
     *
     * @param {Number} foundsetindex - The index of the double-clicked row in the foundset (or -1 for grouped rows).
     * @param {Number} [columnindex] - The index of the double-clicked column in the grid. (Optional)
     * @param {JSRecord} [record] - The record object corresponding to the double-clicked row. (Optional)
     * @param {JSEvent} [event] - The event object associated with the double-click. (Optional)
     * @param {String} [dataTarget] - Optional identifier indicating the target data context. (Optional)
     * @private
     */
    onCellDoubleClick: function() {},

    /**
     * Called when the right mouse button is clicked on a row/cell.
     * The foundsetindex is always -1 when there are grouped rows.
     * If a column is disabled (enabled = false), ensure that you only execute code for that column if columnindex corresponds to it.
     *
     * @param {Number} foundsetindex - The index of the row where the right-click occurred (or -1 for grouped rows).
     * @param {Number} [columnindex] - The index of the right-clicked column in the grid. (Optional)
     * @param {JSRecord} [record] - The record object corresponding to the right-clicked row. (Optional)
     * @param {JSEvent} [event] - The event object associated with the right-click. (Optional)
     * @param {String} [dataTarget] - Optional identifier indicating the target data context. (Optional)
     * @private
     */
    onCellRightClick: function(î) {},

    /**
     * Called when the mouse is clicked on a footer cell
     *
     * @param {Number} [columnindex] The index of the footer cell that was clicked.
     * @param {JSEvent} [event] The event object associated with the click.
     * @param {String} [dataTarget] Optional identifier indicating the target data context of the click.
     */
    onFooterClick: function() {},

    /**
     * Called when the columns state is changed
     *
     * @param {String} columnState The new serialized state of the columns (e.g., widths, order, visibility).
     * @param {JSEvent} [event] The event object triggering the state change.
     */
    onColumnStateChanged: function() {},

    /**
     * Called when the columns data is changed
     *
     * @param {Number} foundsetindex The index of the row that changed (1-based).
     * @param {Number} [columnindex] The index of the column that changed (0-based).
     * @param {Object} [oldvalue] The previous value of the cell.
     * @param {Object} [newvalue] The new value of the cell.
     * @param {JSEvent} [event] The event object associated with the data change.
     * @param {JSRecord} [record] The record object representing the changed row.
     *
     * @return {Boolean} True if the change was handled successfully.
     */
    onColumnDataChange: function() {},

    /**
     * Called when the table is ready to be shown
     */
    onReady: function() {},

    /**
     * Called when the column's form editor is started
     *
     * @param {Number} [foundsetindex] The row index where editing starts.
     * @param {Number} [columnindex] The column index where editing starts.
     * @param {Object} [value] The initial value of the cell being edited.
     */
    onColumnFormEditStarted: function() {},

    /**
     * Called when sort has changed
     *
     * @param {Array<Number>} [columnindexes] An array of column indexes that have been sorted.
     * @param {Array<String>} [sorts] An array of sort orders (e.g., 'asc', 'desc') corresponding to the sorted columns.
     */
    onSort: function() {},

    /**
     * Called when group is opened/closed
     *
     * @param {Array<Number>} [groupcolumnindexes] An array of column indexes associated with the group.
     * @param {Array<Object>} [groupkeys] An array of keys representing the group hierarchy.
     * @param {Boolean} [isopened] True if the group is opened; false if closed.
     */
    onRowGroupOpened: function() {},

    /**
     * Called when a row is dropped as a result of a drag-n-drop
     *
     * @param {Array<Object>} sourceRows An Array of JSRecord objects if dragged from a data grid, or plain objects if from a power grid
     * @param {JSRecord} targetRecord The target record where the rows were dropped.
     * @param {JSEvent} event The event object associated with the drop action.
     */
    onDrop: function() {},

    /**
     * Called when a custom main menu item is chosen.
     *
     * @param {String} menuItemName The name of the custom menu item that was selected.
     * @param {String} colId The column identifier associated with the menu action.
     */
    onCustomMainMenuAction: function() {}

};


/**
 * Notify the component about a data change. Makes the component aware of a data change that requires a refresh data.
 * 
 * Call this method when you are aware of a relevant data change in the foundset which may affect data grouping (e.g. group node created or removed).
 * The component will alert the user of the data change and it will suggest to the user to perform a refresh.
 * 
 * Please note that it’s not necessary to notify the table component if the component is not visible; the component will always present the latest data when rendered again.
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
 * @param {Number} foundsetindex Foundset row index of the editing cell (1-based)
 * @param {Number} columnindex Column index in the model of the editing cell (0-based)
 */
function editCellAt(foundsetindex, columnindex) {
}

/**
 * Request focus on the given column
 * @param {Number} columnindex column index in the model of the editing cell (0-based)
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
 * @param {Boolean} [cancel] 'true' to cancel the editing (ie don't accept changes)
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
 * @param {Boolean} show A flag indicating whether to show (true) or hide (false) the ToolPanel in the Servoy component.
 */
function showToolPanel(show) {
}

/**
 * Returns true if the ToolPanel is showing
 *
 * @return {Boolean} `true` if the ToolPanel is showing otherwise `false`
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
 *     %%prefix%%elements.%%elementName%%.getColumnsCount()
 * 
 * @return {Number} The total number of columns in the specified element.
 */ 
function getColumnsCount() {
}

/**
 * Gets the column at index. Index is 0 based.
 * 
 * @param {Number} index Index between 0 and columns length -1
 * 
 * @example
 *     %%prefix%%elements.%%elementName%%.getColumn()
 *  
 * @return {CustomType<aggrid-groupingtable.column>} The column object at the specified index.
 */ 
function getColumn(index) {
}

/**
 * Gets the column with id colId
 * 
 * @param {string} colId Id of the column
 * 
 * @example
 *     %%prefix%%elements.%%elementName%%.getColumnById('myid')
 *	
 * @return {CustomType<aggrid-groupingtable.column>} The column object corresponding to the provided id.
 */ 
 function getColumnById(colId) {
 }

/**
 * Adds new column at specified index. Index is 0 based.
 * 
 * @param {string} dataprovider Dataprovider of the column
 * @param {Number} [index] Index between 0 and columns length
 * 
 * @example
 *     var column = %%prefix%%elements.%%elementName%%.newColumn('dataproviderid')
 *
 * @return {CustomType<aggrid-groupingtable.column>} The newly created column object at the specified index with the given dataprovider.
 */
function newColumn(dataproviderid,index) {
}

/**
 * Removes column from specified index. Index is 0 based.
 *
 * @example
 *     %%prefix%%elements.%%elementName%%.removeColumn(0)
 *
 * @param {Number} index Index between 0 and columns length -1
 * 
 * @return {Boolean} True if the column was successfully removed, false otherwise.
 */
function removeColumn(index) {
}

/**
 * Removes all columns.
 *
 * @example
 *     %%prefix%%elements.%%elementName%%.removeAllColumns()
 *
 * @return {Boolean} True if all columns were successfully removed; otherwise, false.
 */
function removeAllColumns() {
}

/**
 * Returns an array of view columns currently visible in the grid.
 *
 * @return {Array<CustomType<aggrid-groupingtable.viewColumn>>} An array of view column objects representing the columns currently displayed.
 */
function getViewColumns() {

}

/**
 * Returns the view column corresponding to the given column ID.
 *
 * @param {String} colId - The unique identifier of the column.
 * 
 * @return {CustomType<aggrid-groupingtable.viewColumn>} The view column object corresponding to the specified column ID.
 */
function getViewColumnById() {

}

/**
 * Move column
 * @param {string} id Column id
 * @param {Number} index New position (0-based)
 */
function moveColumn(id, index) {
}

/**
 * Restore columns state to a previously save one, using getColumnState.
 * 
 * If no argument is used, it restores the columns to designe time state.
 * If the columns from columnState does not match with the columns of the component, no restore will be done.
 * 
 * The optional boolean arguments: columns, filter, sort can be used to specify what to restore:
 * - the columns size/position/visibility (default true),
 * - the filter state (default false),
 * - the sort state (default false).
 * 
 * @param {string} [columnState] A JSON string representing the saved state of the columns, including width, position, visibility, filters, and sorting. If omitted, the columns will be restored to their design-time state.
 * @param {function} [onError] A callback function to handle errors during the restore process, such as mismatched column configurations.
 * @param {Boolean} [columns] Specifies whether to restore the columns' size, position, and visibility. Defaults to true.
 * @param {Boolean} [filter] Specifies whether to restore the columns' filter state. Defaults to false.
 * @param {Boolean} [sort] Specifies whether to restore the columns' sort state. Defaults to false.
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
 * @return {string} The current state of the columns as a JSON string for restoring the state.
 */
function getColumnState() {
}

/**
 * Set the table read-only state. If no columnids is used, all columns read-only state is set,
 * otherwise only for the columns specified.
 *
 * @param {Boolean} readonly Read-only state
 * @param {Array<String>} [columnids] Array of column ids to make ready-only
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
 * Returns currently expanded groups as an object like:
 * {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
 *
 * @return {object} An object representing the currently expanded groups, where each key is a group name, and its value is an object detailing any expanded subgroups.
 */
function getExpandedGroups() {
}

/**
 * Return the column index for the given column id.
 * Can be used in combination with getColumnState to retrieve the column index for the column state with colId in the columnState object.
 * 
 * @param {string} colId The unique identifier of the column whose index is to be retrieved.
 * 
 * @return {Number} The 0-based index of the column corresponding to the given column id, or -1 if the column id is not found.
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

/**
 * Set the filter model.
 * This api maps to ag-grid's setFilterModel; for more details on the model's structure check this page: https://www.ag-grid.com/angular-data-grid/filter-api/
 * To clear the filter, use an empty object ({}) as filterModel;
 * 
 * NOTE: The name of the columns from the model are the id properties of the column.
 *
 * @param {Object} filterModel The filter model object defining the filtering criteria for the grid. Each key represents a column's id, and its value specifies the filter configuration, including filter type, conditions, and operator. To clear all filters, pass an empty object ({}).
 * @example <pre>
 *	var filterModel = {
 *		"country": {
 *			"filterType":"text",
 *			"type":"contains",
 *			"filter":"Argentina"
 *		}
 *	};
 *	
 *	var filterModelWithCondition = {
 *		"freight": {
 *			"filterType":"number",
 *			"operator":"OR",
 *			"condition1": { 
 *				"filterType":"number",
 *				"type":"equals",
 *				"filter":66
 *			},
 *			"condition2": {
 *				"filterType":"number",
 *				"type":"equals",
 *				"filter":23
 *			}
 *		}
 *	};
 *	
 *	elements.groupingtable_1.setFilterModel(filterModelWithCondition);
 *	
 *	//clear filter
 *	//elements.groupingtable_1.setFilterModel({});
 * </pre>
 * @public
 */
 function setFilterModel(filterModel) {
}

/**
 * Set the selection in grouping mode 111. The table must be already in grouping mode,
 * and the record already loaded (the group of the record expanded - see: setExpandedGroups)
 *
 * @param {Array<JSRecord>} selectedRecords Form editor value
 */ 
function setGroupedSelection(selectedRecords) {
}

/**
 * Returns the selected rows when in grouping mode
 * 
 * @return {Array<JSRecord>} An array of JSRecord objects representing the selected rows in grouping mode.
 */
function getGroupedSelection() {
}

/**
 * Add a Servoy solution function to the grid, that can be called from AGGRID using params.context.componentParent.executeFunctionCall
 * 
 * @example <pre>
 * function onLoad(event) {
 *	var f = function(params) {		
 *	     var generalMenuItems = ['pinSubMenu'];		
 *	     var saveLayoutItem = {	          
 *	          name: 'Save Layout',	
 *	          action: function() {	        	 
 *	               params.context.componentParent.executeFunctionCall('saveLayout', 'myLayout');
 *	          }
 *	     };		
 *	     generalMenuItems.push(saveLayoutItem);		
 *	     return generalMenuItems;	
 *	}
 *	elements.datagrid_2.addFunctionCall('saveLayout', saveLayout);
 *	elements.datagrid_2.gridOptions = { "getMainMenuItems": application.generateBrowserFunction(String(f)) };
 * }
 * </pre>
 * 
 * @param {String} alias name used in params.context.componentParent.executeFunctionCall to call the function
 * @param {Function} f the Servoy solution function
 */
 function addFunctionCall(alias, f) {
 }

 /**
 * Sets the selected headers or groups in the table when the headerCheckbox or groupCheckbox property is used.
 * The input should be an array of objects where each object represents a selected group or header.
 * The objects should have a `colId` representing the column identifier, and optionally a `groupkey`
 * representing the key of the group. For headers, the `groupkey` should not be included.
 *
 * @param {Array<Object>} groups The selected headers or groups. Each object should have the following structure:
 *                                   - `colId` (String): The identifier of the column.
 *                                   - `groupkey` (String, optional): The key of the group (not included for headers).
 *
 * @example
 * // Example of selecting groups
 * const selectedGroups = [
 *     { colId: 'country', groupkey: 'USA' },
 *     { colId: 'country', groupkey: 'Canada' }
 * ];
 * elements.myTable.setCheckboxGroupSelection(selectedGroups);
 *
 * @example
 * // Example of selecting headers
 * const selectedHeaders = [
 *     { colId: 'country' },
 *     { colId: 'region' }
 * ];
 * elements.myTable.setCheckboxGroupSelection(selectedHeaders);
 */
function setCheckboxGroupSelection() {
}

/**
 * Returns the selected headers or groups in the table when the headerCheckbox or groupCheckbox property is used.
 * The returned value is an array of objects, where each object represents a selected group or header.
 * Each object includes a `colId` representing the column identifier and, for groups, a `groupkey` representing the group key.
 * For headers, the `groupkey` property is not included.
 *
 * @return {Array<Object>} The selected headers or groups. Each object has the following structure:
 *                    - `colId` (String): The identifier of the column.
 *                    - `groupkey` (String, optional): The key of the group (not included for headers).
 *
 * @example
 * // Example of returned data
 * [
 *     { colId: 'country', groupkey: 'USA' },   // Group selection
 *     { colId: 'region' }                      // Header selection
 * ]
 */
function getCheckboxGroupSelection() {
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

/**
 * Type definitions for aggrid-groupingtable types.
 */
var svy_types = {

    /**
     * Type definition for a grid column.
     */
    column: {

        /**
         * Footer text to display in the column.
         */
        footerText: null,

        /**
         * Defines how the footer text is rendered (e.g., inline, tooltip).
         */
        footerTextShowAs: null,

        /**
         * If the column has a database linked dataprovider, the default value of the headerTitle is the title text of the database column or if that is not set, the database column name.
         */
        headerTitle : null,

        /**
         * CSS class for the column footer.
         */
        footerStyleClass: null,

        /**
         * CSS class for the column header.
         */
        headerStyleClass: null,

        /**
         * (Font awesome) Styles for header icon
         */
        headerIconStyleClass : null,

        /**
         * Tooltip text for the header.
         */
        headerTooltip: null,

        /**
         * Header group, that this column will be part of
         */
        headerGroup : null,

        /**
         * CSS class for the header group.
         */
        headerGroupStyleClass: null,

        /**
         * When true the column has checkbox for selecting/unselecting all rows
         */
        headerCheckbox : null,

        /**
         * Data provider identifier for the column.
         */
        dataprovider: null,

        /**
         * Tooltip text for the cell.
         */
        tooltip: null,

        /**
         * CSS class for the cell.
         */
        styleClass: null,

        /**
         * Use a Servoy calculation as styleClassDataprovider to set styleClass conditionally to the table cell
         */
        styleClassDataprovider : null,

        /**
         * Format pattern for the column's data.
         */
        format: null,

        /**
         * Value list used to map column values.
         */
        valuelist: null,

        /**
         * Configuration for the value list.
         */
        valuelistConfig: null,

        /**
         * Visibility state of the column.
         */
        visible: null,

        /**
         * When true the column is excluded from the UI
         */
        excluded : null,

        /**
         * Flag indicating if the column is enabled.
         */
        enabled: null,

        /**
         * Column width in pixels.
         */
        width: null,

        /**
         * Minimum width in pixels.
         */
        minWidth: null,

        /**
         * Maximum width in pixels.
         */
        maxWidth: null,

        /**
         * Allow the user to group or ungroup the column
         */
        enableRowGroup : null,

        /**
         * Allows sorting on this column.
         */
        enableSort: null,

        /**
         * Allows resizing of the column.
         */
        enableResize: null,

        /**
         * If the column should be visible in the tool panel
         */
        enableToolPanel : null,

       /**
         * Enables auto-resizing for the column.
         */
        autoResize: null,

        /**
         * Set the rowGroupIndex to group on the column; the index defines the order of the group when there are multiple grouped columns
         */
        rowGroupIndex : null,

        /**
         * Use a Servoy calculation as isEditableDataprovider to set edit state conditionally to the table cell
         */
        isEditableDataprovider : null,

        /**
         * Type of editing used for that column
         */
        editType : null,

        /**
         * Form used as custom editor
         */
        editForm : null,

        /**
         * Size configuration for the custom editor form.
         */
        editFormSize: null,

        /**
         * When true, editing stops on change.
         */
        stopEditingOnChange: null,

        /**
         * Filter type to be used for this column.
         */
        filterType: null,

        /**
         * Used to set the column id (colId) property in the serialized column state json string of getColumnState and onColumnStateChanged
         */
        id : null,

        /**
         * Map where additional column properties of ag-grid can be set
         */
        columnDef : null,

        /**
         * Defines an alternative display mode for the column.
         */
        showAs: null,

        /**
         * Allow dragging
         */
        dndSource : null,

        /**
         * Boolean dataprovider for allow/disallow dragging.
         */
        dndSourceDataprovider : null,

    },

    /**
     * Type definition for a grouped column.
     */
    groupedColumn: {

        /**
         * Data provider for the grouped column.
         */
        dataprovider: null,

        /**
         * Format pattern for the grouped column.
         */
        format: null,

        /**
         * Value list for mapping grouped column data.
         */
        valuelist: null,

        /**
         * Unique identifier for the grouped column.
         */
        id: null,

        /**
         * Original column identifier associated with this group.
         */
        columnid: null,

        /**
         * Calculation to conditionally set CSS classes for the group.
         */
        styleClassDataprovider: null,
    },

    /**
     * Type definition for a view column.
     */
    viewColumn: {

        /**
         * Unique identifier for the view column.
         */
        colId: null,

        /**
         * When true, the column is hidden.
         */
        hide: null,

        /**
         * Indicates if the column is used for grouping.
         */
        rowGroup: null,

        /**
         * Grouping order index.
         */
        rowGroupIndex: null,

        /**
         * Sorting order (e.g., asc, desc).
         */
        sort: null,

        /**
         * Index for multi-column sorting.
         */
        sortIndex: null,

        /**
         * Width of the view column.
         */
        width: null,
    },

    /**
     * Type definition for a hashed foundset.
     */
    hashedFoundset: {

        /**
         * The foundset object reference.
         */
        foundset: null,

        /**
         * Unique identifier for the foundset.
         */
        foundsetUUID: null,

        /**
         * Unique hash identifier.
         */
        uuid: null,

        /**
         * Column configuration for the foundset.
         */
        columns: null,

    },

    /**
     * Grid configuration options.
     */
    gridConfig: {

        /**
         * Enables column sorting.
         */
        enableSorting: null,

        /**
         * Enables column resizing.
         */
        enableColResize: null,
        
        /**
         * When true, group rows span the entire row.
         */
        groupUseEntireRow: null,

    },

    /**
     * Icon configuration for various grid features.
     */
    iconConfig: {

         /** Icon for the menu. */
        iconMenu: null,

        /** Icon for filtering. */
        iconFilter: null,

        /** Icon for the columns panel. */
        iconColumns: null,

        /** Icon for ascending sort. */
        iconSortAscending: null,

        /** Icon for descending sort. */
        iconSortDescending: null,

        /** Icon for unsorted state. */
        iconSortUnSort: null,

        /** Icon indicating an expanded group. */
        iconGroupExpanded: null,

        /** Icon indicating a contracted group. */
        iconGroupContracted: null,

        /** Icon for an open column group. */
        iconColumnGroupOpened: null,

        /** Icon for a closed column group. */
        iconColumnGroupClosed: null,

        /** Icon for open column selection. */
        iconColumnSelectOpen: null,

        /** Icon for closed column selection. */
        iconColumnSelectClosed: null,

        /** Icon for a checked checkbox. */
        iconCheckboxChecked: null,

        /** Icon for an unchecked checkbox. */
        iconCheckboxUnchecked: null,

        /** Icon for an indeterminate checkbox. */
        iconCheckboxIndeterminate: null,

        /** Icon for a read-only checked checkbox. */
        iconCheckboxCheckedReadOnly: null,

        /** Icon for a read-only unchecked checkbox. */
        iconCheckboxUncheckedReadOnly: null,

        /** Icon for a read-only indeterminate checkbox. */
        iconCheckboxIndeterminateReadOnly: null,

        /** Icon for pinning a column. */
        iconColumnMovePin: null,

        /** Icon for adding a column. */
        iconColumnMoveAdd: null,

        /** Icon for hiding a column. */
        iconColumnMoveHide: null,

        /** Icon for moving a column. */
        iconColumnMoveMove: null,

        /** Icon for moving a column to the left. */
        iconColumnMoveLeft: null,

        /** Icon for moving a column to the right. */
        iconColumnMoveRight: null,

        /** Icon for grouping a column. */
        iconColumnMoveGroup: null,

        /** Icon for moving a column's value. */
        iconColumnMoveValue: null,

        /** Icon for pivoting a column. */
        iconColumnMovePivot: null,

        /** Icon indicating drop is not allowed. */
        iconDropNotAllowed: null,

        /** Icon for pinning in the header menu. */
        iconMenuPin: null,

        /** Icon for displaying values in the header menu. */
        iconMenuValue: null,

        /** Icon for adding a row group via the menu. */
        iconMenuAddRowGroup: null,

        /** Icon for removing a row group via the menu. */
        iconMenuRemoveRowGroup: null,

        /** Icon for copying to the clipboard. */
        iconClipboardCopy: null,

        /** Icon for pasting from the clipboard. */
        iconClipboardPaste: null,

        /** Icon for the row group panel. */
        iconRowGroupPanel: null,

        /** Icon for the pivot panel. */
        iconPivotPanel: null,

        /** Icon for the value panel. */
        iconValuePanel: null,

        /** Icon for refreshing data. */
        iconRefreshData: null,

        /** Icon for a checked editor state. */
        iconEditorChecked: null,
        
        /** Icon for an unchecked editor state. */
        iconEditorUnchecked: null,

    },

    /**
     * Configuration options for the ag‑grid tool panel.
     */
    toolPanelConfig: {

        /** Suppress row groups in the tool panel. */
        suppressRowGroups: null,

        /** Suppress side buttons in the tool panel. */
        suppressSideButtons: null,

        /** Suppress the column filter in the tool panel. */
        suppressColumnFilter: null,

        /** Suppress the "select all" option in the tool panel. */
        suppressColumnSelectAll: null,

        /** Suppress the "expand all" option in the tool panel. */
        suppressColumnExpandAll: null,

    },

    /**
     * Configuration options for main menu items.
     */
    mainMenuItemsConfig: {

        /** Configuration for the pin sub-menu. */
        pinSubMenu: null,

        /** Configuration for the value aggregation sub-menu. */
        valueAggSubMenu: null,

        /** Option to auto-size the current column. */
        autoSizeThis: null,

        /** Option to auto-size all columns. */
        autoSizeAll: null,

        /** Option to group rows by this column. */
        rowGroup: null,

        /** Option to ungroup rows. */
        rowUnGroup: null,

        /** Option to reset columns to default. */
        resetColumns: null,

        /** Option to expand all groups. */
        expandAll: null,

        /** Option to contract all groups. */
        contractAll: null,
    },

    /**
     * Definition for a Servoy solution function call.
     */
    functionCall: {
        /** Alias for the function call. */
        alias: null,

        /** The function reference to execute. */
        f: null,
    },

    /**
     * Events that trigger auto-sizing of columns.
     */
    columnsAutoSizingOn: {

        /**
         * Apply 'columnsAutoSizing' when columns are resized
         */
        columnResize : null,

        /**
         * Apply 'columnsAutoSizing' when row grouping is changed
         */
        columnRowGroupChange : null,

        /**
         * Apply 'columnsAutoSizing' when columns are added/removed
         */
        displayedColumnsChange : null,

        /**
         * Apply 'columnsAutoSizing' when grid is ready to be shown
         */
        gridReady : null,

        /**
         * Apply 'columnsAutoSizing' when grid size changes
         */
        gridSizeChange : null,

        /**
         * Apply 'columnsAutoSizing' when the toolpanel visibility is changed
         */
        toolPanelVisibleChange : null,

    }
}
