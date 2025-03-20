/* Power Grid is an editable table component providing advanced functionality such as row grouping, pivoting, summaries and powerful analytics. It's data is loaded from a JSDataSet, and the changed data (if it is edited) can be exported back as a dataset. */

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
 * Function to add style class to row
 */
var rowStyleClassFunc;

/**
 * Default CSS style class for the table.
 */
var styleClass;

/**
 * Controls whether the table is visible.
 */
var visible;

/**
 * Enables column resizing by user interaction.
 */
var enableColumnResize;

/**
 * Enable column sorting by clicking on the column's header
 */
var enableSorting;

/**
 * When true the row has a checkbox for selecting/unselecting 
 */
var checkboxSelection;

/**
 * Pivoting allows you to take a columns values and turn them into columns
 */
var pivotMode;

/**
 * Default icon configuration for grid controls.
 */
var iconConfig;

/**
 * CSS style class applied to group rows.
 */
var groupStyleClass;

/**
 * Fixed width (in pixels) for group rows.
 */
var groupWidth;

/**
 * Minimum allowed width (in pixels) for group rows.
 */
var groupMinWidth;

/**
 * Maximum allowed width (in pixels) for group rows.
 */
var groupMaxWidth;

/**
 * When true, the table uses lazy loading to fetch data on demand.
 */
var useLazyLoading;

/**
 * When true, multiple rows can be selected simultaneously.
 */
var multiSelect;

/**
 * The height (in pixels) of the table header.
 */
var headerHeight;

/**
 * When true, a dedicated columns menu tab is displayed.
 */
var showColumnsMenuTab;

/**
 * Configuration options for the grid’s tool panel.
 */
var toolPanelConfig;

/**
 * Map where additional grid properties of ag-grid can be set
 */
var gridOptions;

/**
 * Map where locales of ag-grid can be set
 */
var localeText;

/**
 * Function to customize group row rendering when gridOptions.groupDisplayType is set to 'groupRows'
 */
var groupRowRendererFunc;

/**
 * Configuration options for main menu items in the grid.
 */
var mainMenuItemsConfig;

/**
 * Defines action on TEXTFIELD editor for up/down arrow keys
 */
var arrowsUpDownMoveWhenEditing;

/**
 * When true, pressing Enter during editing will automatically move to the next cell.
 */
var editNextCellOnEnter;

/**
 * When true, the table operates in read‑only mode.
 */
var readOnly;

/**
 * When false, disables user interaction with the table.
 */
var enabled;

/**
 * Callback that returns the editable state of a cell.
 */
var isEditableFunc;

/**
 * The tab order index for keyboard navigation within the table.
 */
var tabSeq;

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
 * Callback when dragging over a row - returns one of the strings: 'copy', 'move', 'none' depending on the allowed drag operation.
 */
var onDragOverFunc;

/**
 * Called when row(s) drag-n-drop is started, to get the drag image as an html code.
 */
var onDragGetImageFunc;


var handlers = {
    /**
     * Called when the mouse is clicked on a row/cell
     *
     * @param {Object} rowData The data for the clicked row.
     * @param {Boolean} selected True if the row has been selected, false if deselected.
     * @param {JSEvent} [event] The event object associated with the click.
     */
    onRowSelected: function() {},

    /**
     * Called when the mouse is clicked on a row/cell
     *
     * @param {Object} rowData The data for the clicked row.
     * @param {String} [columnId] The identifier of the clicked column.
     * @param {Object} [cellData] The data of the clicked cell.
     * @param {JSEvent} [event] The event object associated with the click.
     * @param {String} [dataTarget] Optional data target identifier.
     */
    onCellClick: function() {},

    /**
     * Called when the mouse is double clicked on a row/cell
     *
     * @param {Object} rowData The data for the double-clicked row.
     * @param {String} [columnId] The identifier of the double-clicked column.
     * @param {Object} [cellData] The data of the double-clicked cell.
     * @param {JSEvent} [event] The event object associated with the double-click.
     * @param {String} [dataTarget] Optional data target identifier.
     */
    onCellDoubleClick: function() {},

    /**
     * Called when the right mouse button is clicked on a row/cell
     *
     * @param {Object} rowData The data for the right-clicked row.
     * @param {String} [columnId] The identifier of the right-clicked column.
     * @param {Object} [cellData] The data of the right-clicked cell.
     * @param {JSEvent} [event] The event object associated with the right-click.
     * @param {String} [dataTarget] Optional data target identifier.
     */
    onCellRightClick: function() {},

    /**
     * Called when the columns state is changed
     *
     * @param {String} columnState A JSON string representing the new state of the columns.
     * @param {JSEvent} [event] The event that triggered the change.
     */
    onColumnStateChanged: function() {},

    /**
     * Called when the columns data is changed
     *
     * @param {Number} rowindex The index of the row where the change occurred.
     * @param {Number} [columnindex] The index of the column where the change occurred.
     * @param {Object} [oldvalue] The previous value of the cell.
     * @param {Object} [newvalue] The new value of the cell.
     * @param {JSEvent} [event] The event that triggered the change.
     * @param {Object} rowData The full data object for the row.
     *
     * @returns {Boolean} True if the change was successfully handled.
     */
    onColumnDataChange: function() {},

    /**
     * Called when lazy loading is used, and new rows are requested to display
     *
     * @param {Long} startRow The index of the first row to load.
     * @param {Long} endRow The index of the last row to load.
     * @param {Array<CustomType<aggrid-datasettable.columnVO>>} rowGroupCols The columns used for grouping.
     * @param {Array<CustomType<aggrid-datasettable.columnVO>>} valueCols The columns used for values.
     * @param {Array<CustomType<aggrid-datasettable.columnVO>>} pivotCols The columns used for pivoting.
     * @param {Boolean} pivotMode Indicates if pivot mode is enabled.
     * @param {Array<String>} groupKeys The keys representing the current grouping.
     * @param {Array<CustomType<aggrid-datasettable.filterModelVO>>} filterModels The current filter models.
     * @param {Array<CustomType<aggrid-datasettable.sortModelVO>>} sortModels The current sort models.
     */
    onLazyLoadingGetRows: function() {},

    /**
     * Called when the table is ready to be shown
     */
    onReady: function() {},

    /**
     * Called when the column's form editor is started
     *
     * @param {Number} [rowindex] The index of the row being edited.
     * @param {Number} [columnindex] The index of the column being edited.
     * @param {Object} [value] The initial value of the cell for editing.
     */
    onColumnFormEditStarted: function() {},

    /**
     * Called when group is opened/closed
     *
     * @param {Array<Number>} [groupcolumnindexes] An array of column indexes associated with the group.
     * @param {Array<Object>} [groupkeys] The keys representing the group hierarchy.
     * @param {Boolean} [isopened] True if the group was expanded, false if collapsed.
     */
    onRowGroupOpened: function() {},

    /**
     * Called when a row is dropped as a result of a drag-n-drop
     *
     * @param {Array<Object>} sourceRows an Array of plain objects if dragged from a power grid, or JSRecord objects if from a data grid
     * @param {Object} targetRow The target row where the rows were dropped.
     * @param {JSEvent} event The event object associated with the drop action.
     */
    onDrop: function() {},

    /**
     * Called when the mouse is clicked on a footer cell
     *
     * @param {Number} [columnindex] The index of the footer column that was clicked.
     * @param {JSEvent} [event] The event object associated with the click.
     * @param {String} [dataTarget] Optional target identifier for the click.
     */
    onFooterClick: function() {}
};


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
 * @return {CustomType<aggrid-datasettable.column>} The column object that was created and added to the table.
 * 
 */
function newColumn(id, index) {
}

/**
 * Removes column with id
 * 
 * @param {String} id The unique identifier of the column to be removed from the component.
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
 * @return {Array<CustomType<aggrid-datasettable.column>>} An array of all column objects currently defined in the table.
 */
function getAllColumns() {
}

/**
 * Gets the column with id. If changes will be made on
 * the returned column, it should be called with forChange set to true
 * 
 * @param {string} id The unique identifier of the column to retrieve in the Servoy grid.
 * @param {Boolean} [forChange] Indicates whether the column is being retrieved for modifications.
 * @return {CustomType<aggrid-datasettable.column>} The column object at the specified index.
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

var svy_types = {

    /**
     * Defines a column configuration for the grid.
     */
    column: {

        /**
         * The text to be displayed in the column footer.
         */
        footerText: null,

        /**
         * CSS style class for the column footer.
         */
        footerStyleClass: null,

        /**
         * Header group, that this column will be part of
         */
        headerGroup : null,

        /**
         * CSS style class for the header group.
         */
        headerGroupStyleClass: null,

        /**
         * The title text to be displayed in the column header.
         */
        headerTitle: null,

        /**
         * CSS style class for the column header.
         */
        headerStyleClass: null,

        /**
         * (Font awesome) Styles for header icon
         */
        headerIconStyleClass : null,

        /**
         * Tooltip text for the column header.
         */
        headerTooltip: null,

        /**
         * The data provider name associated with the column.
         */
        dataprovider: null,

        /**
         * Tooltip text for the cell.
         */
        tooltip: null,

        /**
         * CSS style class for the cell.
         */
        styleClass: null,

        /**
         * Visibility flag; when false the column is hidden.
         */
        visible: null,

        /**
         * When true the column is excluded from the UI
         */
        excluded : null,

        /**
         * The width of the column in pixels.
         */
        width: null,

        /**
         * The minimum width allowed for the column in pixels.
         */
        minWidth: null,

        /**
         * The maximum width allowed for the column in pixels.
         */
        maxWidth: null,

        /**
         * Allow the user to group or ungroup the column
         */
        enableRowGroup : null,

        /**
         * Set the rowGroupIndex to group on the column; the index defines the order of the group when there are multiple grouped columns
         */
        rowGroupIndex : null,

        /**
         * If the column can be used as pivot
         */
        enablePivot : null,

        /**
         * Set this in columns you want to pivot by
         */
        pivotIndex : null,

        /**
         * Name of function to use for aggregation
         */
        aggFunc : null,

        /**
         * Enables sorting for this column.
         */
        enableSort: null,

        /**
         * Enables resizing for this column.
         */
        enableResize: null,

        /**
         * When true, the column is available in the tool panel.
         */
        enableToolPanel: null,

        /**
         * Enables auto-resizing of the column based on its content.
         */
        autoResize: null,

        /**
         * Function to determine the CSS style class for the cell dynamically.
         */
        cellStyleClassFunc: null,

        /**
         * Function to change the cell rendering
         */
        cellRendererFunc : null,

        /**
         * Format for the type set in formatType
         */
        format : null,

        /**
         * Type of data the format is applied on
         */
        formatType : null,

        /**
         * Type of editing used for that column
         */
        editType : null,

        /**
         * Form used as custom editor
         */
        editForm : null,

        /**
         * Size configuration for the custom cell editor form.
         */
        editFormSize: null,

        /**
         * The type of filter applied to this column.
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
         * Alternative display mode for the column.
         */
        showAs: null,

        /**
         * If exportData api should export the display value (with format applied) instead of the raw data of the dataset
         */
        exportDisplayValue : null,

        /**
         * Function to sort the pivot columns
         */
        pivotComparatorFunc : null,

        /**
         * Proxy function for getting the cell value from the model
         */
        valueGetterFunc : null,

        /**
         * Allow dragging
         */
        dndSource : null,

        /**
         * Boolean function for allow/disallow dragging.
         */
        dndSourceFunc : null,

        /**
         * Value list for mapping the column's values.
         */
        valuelist: null,

        /**
         * Configuration settings for the value list.
         */
        valuelistConfig: null,

    },

    iconConfig: {

        /**
         * Icon for the grid menu.
         */
        iconMenu: null,

        /**
         * Icon for filtering functionality.
         */
        iconFilter: null,

        /**
         * Icon representing the columns panel.
         */
        iconColumns: null,

        /**
         * Icon indicating ascending sort order.
         */
        iconSortAscending: null,

        /**
         * Icon indicating descending sort order.
         */
        iconSortDescending: null,

        /**
         * Icon indicating an unsorted column.
         */
        iconSortUnSort: null,

        /**
         * Icon representing an expanded group.
         */
        iconGroupExpanded: null,

        /**
         * Icon representing a collapsed group.
         */
        iconGroupContracted: null,

        /**
         * Icon for an open column group.
         */
        iconColumnGroupOpened: null,

        /**
         * Icon for a closed column group.
         */
        iconColumnGroupClosed: null,

        /**
         * Icon for an open column selection.
         */
        iconColumnSelectOpen: null,

        /**
         * Icon for a closed column selection.
         */
        iconColumnSelectClosed: null,

        /**
         * Icon for a checked checkbox.
         */
        iconCheckboxChecked: null,

        /**
         * Icon for an unchecked checkbox.
         */
        iconCheckboxUnchecked: null,

        /**
         * Icon for an indeterminate checkbox state.
         */
        iconCheckboxIndeterminate: null,

        /**
         * Icon for a read-only checked checkbox.
         */
        iconCheckboxCheckedReadOnly: null,

        /**
         * Icon for a read-only unchecked checkbox.
         */
        iconCheckboxUncheckedReadOnly: null,

        /**
         * Icon for a read-only indeterminate checkbox.
         */
        iconCheckboxIndeterminateReadOnly: null,

        /**
         * Icon for pinning a column.
         */
        iconColumnMovePin: null,

        /**
         * Icon for adding a column.
         */
        iconColumnMoveAdd: null,

        /**
         * Icon for hiding a column.
         */
        iconColumnMoveHide: null,

        /**
         * Icon for moving a column.
         */
        iconColumnMoveMove: null,

        /**
         * Icon for moving a column to the left.
         */
        iconColumnMoveLeft: null,

        /**
         * Icon for moving a column to the right.
         */
        iconColumnMoveRight: null,

        /**
         * Icon for grouping columns.
         */
        iconColumnMoveGroup: null,

        /**
         * Icon for moving a column's value.
         */
        iconColumnMoveValue: null,

        /**
         * Icon for pivoting a column.
         */
        iconColumnMovePivot: null,

        /**
         * Icon indicating that a drop operation is not allowed.
         */
        iconDropNotAllowed: null,

        /**
         * Icon for pinning via the menu.
         */
        iconMenuPin: null,

        /**
         * Icon for displaying values in the menu.
         */
        iconMenuValue: null,

        /**
         * Icon for adding a row group via the menu.
         */
        iconMenuAddRowGroup: null,

        /**
         * Icon for removing a row group via the menu.
         */
        iconMenuRemoveRowGroup: null,

        /**
         * Icon for copying to the clipboard.
         */
        iconClipboardCopy: null,

        /**
         * Icon for pasting from the clipboard.
         */
        iconClipboardPaste: null,

        /**
         * Icon for the row group panel.
         */
        iconRowGroupPanel: null,

        /**
         * Icon for the pivot panel.
         */
        iconPivotPanel: null,

        /**
         * Icon for the value panel.
         */
        iconValuePanel: null,

        /**
         * Icon for refreshing grid data.
         */
        iconRefreshData: null,

        /**
         * Icon for a checked state in an editor.
         */
        iconEditorChecked: null,

        /**
         * Icon for an unchecked state in an editor.
         */
        iconEditorUnchecked: null,
    },

    columnVO: {

        /**
         * Unique identifier of the column.
         */
        id: null,

        /**
         * The display name for the column.
         */
        displayName: null,

        /**
         * The aggregation function associated with the column.
         */
        aggFunc: null,

    },

    sortModelVO: {

       /**
         * The column identifier to which this sorting model applies.
         */
       colId: null,

       /**
        * The sort direction ('asc' for ascending, 'desc' for descending).
        */
       sort: null,

    },

    filterModelVO: {

        /**
         * The unique identifier of the filter.
         */
        id: null,

        /**
         * The operator used in the filter (e.g., '=', '>', '<').
         */
        operator: null,

        /**
         * The value used for filtering.
         */
        value: null,

    },

    rowInfo: {

        /**
         * The data object for the row.
         */
        rowData: null,

        /**
         * The index of the row in the grid.
         */
        rowIndex: null,

    },

    toolPanelConfig: {

        /**
         * When true, row groups are suppressed in the tool panel.
         */
        suppressRowGroups: null,

        /**
         * When true, values are suppressed in the tool panel.
         */
        suppressValues: null,

        /**
         * When true, pivot options are suppressed in the tool panel.
         */
        suppressPivots: null,

        /**
         * When true, the pivot mode option is suppressed in the tool panel.
         */
        suppressPivotMode: null,

        /**
         * When true, side buttons in the tool panel are suppressed.
         */
        suppressSideButtons: null,

        /**
         * When true, the column filter is suppressed in the tool panel.
         */
        suppressColumnFilter: null,

        /**
         * When true, the option to select all columns is suppressed in the tool panel.
         */
        suppressColumnSelectAll: null,

        /**
         * When true, the option to expand all columns is suppressed in the tool panel.
         */
        suppressColumnExpandAll: null,

    },

    mainMenuItemsConfig: {

        /**
         * Configuration for the pin sub-menu.
         */
        pinSubMenu: null,

        /**
         * Configuration for the value aggregation sub-menu.
         */
        valueAggSubMenu: null,

        /**
         * Option to auto-size the current column.
         */
        autoSizeThis: null,

        /**
         * Option to auto-size all columns.
         */
        autoSizeAll: null,

        /**
         * Option to group rows by this column.
         */
        rowGroup: null,

        /**
         * Option to ungroup rows.
         */
        rowUnGroup: null,

        /**
         * Option to reset columns to their default state.
         */
        resetColumns: null,

        /**
         * Option to expand all groups in the grid.
         */
        expandAll: null,

        /**
         * Option to collapse all groups in the grid.
         */
        contractAll: null,

    },

    aggFuncInfo: {

        /**
         * The name of the aggregation function.
         */
        name: null,

        /**
         * The aggregation function implementation.
         */
        aggFunc: null,

    },

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
