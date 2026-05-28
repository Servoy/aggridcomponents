---
name: servoy-grids
description: Use when working on Servoy ag-grid table components: powergrid, datagrid, datasettable, groupingtable, aggrid, ag-grid, Power Grid, Data Grid, renderData, appendLazyRequestData, onColumnDataChange, myFoundset, foundset grid, JSDataset, rowGroupIndex, gridOptions, columnDef. Covers bug fixing and feature implementation for all four component variants (Angular TS and AngularJS).
---

# Servoy AG-Grid Components

This repository contains four Servoy table view components built on top of ag-Grid:

| Component | Display name | Framework | Data source |
|---|---|---|---|
| `powergrid` | Power Grid | Angular TypeScript | JSDataset |
| `datagrid` | Data Grid | Angular TypeScript | Servoy foundset |
| `datasettable` | Power Grid (legacy) | AngularJS JavaScript | JSDataset |
| `groupingtable` | Data Grid (legacy) | AngularJS JavaScript | Servoy foundset |

The Angular components (`powergrid`, `datagrid`) are drop-in replacements for their AngularJS counterparts and reuse the same `.spec` and `_doc.js` files.

---

## 1. Component Map — Which Files to Read/Edit

### powergrid (Angular, dataset-based)
- **Spec**: `datasettable/datasettable.spec`
- **Doc**: `datasettable/datasettable_doc.js`
- **Main impl**: `projects/nggrids/src/powergrid/powergrid.ts`
- **Service**: `projects/nggrids/src/powergrid/powergrid.service.ts`
- **Template**: `projects/nggrids/src/powergrid/powergrid.html`
- **Base class**: `projects/nggrids/src/nggrid.ts`
- **Build required**: yes — `npm run build` in `/aggrid/`

### datagrid (Angular, foundset-based)
- **Spec**: `groupingtable/groupingtable.spec`
- **Doc**: `groupingtable/groupingtable_doc.js`
- **Main impl**: `projects/nggrids/src/datagrid/datagrid.ts`
- **Service**: `projects/nggrids/src/datagrid/datagrid.service.ts`
- **Template**: `projects/nggrids/src/datagrid/datagrid.html`
- **Base class**: `projects/nggrids/src/nggrid.ts`
- **Build required**: yes — `npm run build` in `/aggrid/`

### datasettable (AngularJS, dataset-based)
- **Spec**: `datasettable/datasettable.spec` (shared with powergrid)
- **Doc**: `datasettable/datasettable_doc.js` (shared with powergrid)
- **Main impl**: `datasettable/datasettable.js`
- **Server script**: `datasettable/datasettable_server.js`
- **Group cell renderer**: `datasettable/datasettablegroupcellrenderer.js`
- **Build required**: no

### groupingtable (AngularJS, foundset-based)
- **Spec**: `groupingtable/groupingtable.spec` (shared with datagrid)
- **Doc**: `groupingtable/groupingtable_doc.js` (shared with datagrid)
- **Main impl**: `groupingtable/groupingtable.js`
- **Server script**: `groupingtable/groupingtable_server.js`
- **Build required**: no

### Shared Angular source (both powergrid and datagrid)
- **Editors**: `projects/nggrids/src/editors/` — `editor.ts`, `texteditor.ts`, `datepicker.ts`, `selecteditor.ts`, `typeaheadeditor.ts`, `formeditor.ts`
- **Filters**: `projects/nggrids/src/filters/` — `filter.ts`, `datefilter.ts`, `radiofilter.ts`, `valuelistfilter.ts`
- **Commons**: `projects/nggrids/src/datagrid/commons/` — `registration.service.ts`, `tooltip.ts`

### When modifying model properties, handlers, or API methods
Always update **three files** in sync:
1. `.spec` — the Servoy component definition (model/handlers/api/types blocks)
2. `_doc.js` — the JSDoc documentation file
3. Main `.ts` or `.js` implementation

---

## 2. Servoy vs ag-Grid Layering

Both components wrap ag-Grid. The Servoy layer exposes a curated subset of ag-Grid's API. When a behaviour is needed that the Servoy API does not expose directly:

- **Grid-level**: use the `gridOptions` map property — passed through to ag-Grid's `GridOptions`
- **Column-level**: use the `columnDef` map property per column — passed through to ag-Grid's `ColDef`

### Useful ag-Grid options accessible via `gridOptions`

| Option | Type | Description |
|---|---|---|
| `groupDisplayType` | `'groupRows' \| 'multipleColumns' \| 'singleColumn' \| 'custom'` | How group rows are displayed |
| `groupDefaultExpanded` | `number` | How many levels expanded by default (-1 = all) |
| `suppressAggFuncInHeader` | `boolean` | Hide agg function name in column header |
| `pivotPanelShow` | `'always' \| 'onlyWhenPivoting' \| 'never'` | Pivot panel visibility |
| `rowSelection` | `object` | Row selection configuration object |
| `suppressRowClickSelection` | `boolean` | Don't select rows on click |
| `getRowId` | `function` | Custom row identity function |
| `animateRows` | `boolean` | Animate row changes |
| `suppressAggAtRootLevel` | `boolean` | Suppress aggregation at root level |
| `treeData` | `boolean` | Enable tree data mode |

### Useful ag-Grid options accessible via `column.columnDef`

| Option | Type | Description |
|---|---|---|
| `pinned` | `'left' \| 'right'` | Pin column to side |
| `flex` | `number` | Flex-grow ratio for column width |
| `cellClass` | `string \| string[]` | CSS class(es) for cells |
| `cellStyle` | `object` | Inline CSS for cells |
| `comparator` | `function` | Custom sort comparator |
| `cellEditorPopup` | `boolean` | Show editor as popup |
| `cellEditorPopupPosition` | `'over' \| 'under'` | Popup editor position |
| `suppressMovable` | `boolean` | Prevent column from being moved |
| `lockPosition` | `'left' \| 'right'` | Lock column to position |
| `lockVisible` | `boolean` | Prevent column show/hide via UI |
| `wrapText` | `boolean` | Wrap cell text |
| `autoHeight` | `boolean` | Auto-size row height based on cell content |
| `enableCellChangeFlash` | `boolean` | Flash cell on value change |
| `colSpan` | `function` | Make cell span multiple columns |
| `spanRows` | `boolean \| function` | Merge cells with equal values |

**Important**: some ag-Grid options are marked `Initial` — they are only read at grid creation. For those, setting them via `gridOptions` after the grid is rendered has no effect; a full re-render is needed.

**Reference**: https://www.ag-grid.com/javascript-data-grid/grid-options/ | https://www.ag-grid.com/javascript-data-grid/column-properties/

---

## 3. Core Data Model Difference

This is the most important distinction between the two component families.

### powergrid / datasettable — dataset-based

- Data comes from a `JSDataset` and is loaded explicitly by calling `renderData(dataset, pks?)`
- Row identity is defined by pk string values stored in `rowData` object properties
- **`pks` must be passed to `renderData` before `updateRows` or `deleteRows` will work**
- CRUD operations (`newRows`, `updateRows`, `deleteRows`) are available on the Angular `powergrid` only — not in the AngularJS `datasettable`
- Lazy loading: set `useLazyLoading=true`, implement `onLazyLoadingGetRows`, call `appendLazyRequestData(dataset, lastRowIndex)` inside it
- When `lastRowIndex` equals total rows on server, lazy loading stops; if never set, grid behaves as infinite scroll

### datagrid / groupingtable — foundset-based

- Data is bound via the `myFoundset` property — a live Servoy foundset
- Servoy manages record identity and lifecycle; no manual data load call
- In grouping mode, `foundsetIndex` is always `-1` in all cell event handlers — use `record` object and its pks to identify the row
- **Grouping requires a single primary key** — multiple PKs are not supported
- **Calculations, aggregations, and form variables must not be used in grouped columns** — set `enableRowGroup=false` on such columns
- Viewport changes are reflected automatically; out-of-viewport changes require action:
  - `notifyDataChange()` — non-disruptive; shows orange refresh button to the user
  - `refreshData()` — forces full refresh but **collapses all group nodes** — bad UX, use sparingly
- Use `notifyDataChange()` in `onDataBroadcast` and `onAfterRecordInsert/Update/Delete` for background data changes

---

## 4. Handler Signatures

### powergrid / datasettable

```javascript
// Row selected
onRowSelected(rowData: Object, selected: Boolean, event?: JSEvent)

// Cell events — rowData is the full row object, columnId is the column's id property
onCellClick(rowData: Object, columnId?: String, cellData?: Object, event?: JSEvent, dataTarget?: String)
onCellDoubleClick(rowData: Object, columnId?: String, cellData?: Object, event?: JSEvent, dataTarget?: String)
onCellRightClick(rowData: Object, columnId?: String, cellData?: Object, event?: JSEvent, dataTarget?: String)
onCellFocusGained(rowData: Object, columnId?: String, cellData?: Object, event?: JSEvent)

// Data change — return false to reject and keep cell in edit mode; true/undefined to accept
onColumnDataChange(rowindex: Number, columnindex: Number, oldvalue: Object, newvalue: Object, event?: JSEvent, rowData: Object): Boolean

// Lazy loading (powergrid only)
onLazyLoadingGetRows(startRow: Number, endRow: Number, rowGroupCols: columnVO[], valueCols: columnVO[], pivotCols: columnVO[], pivotMode: Boolean, groupKeys: String[], filterModels: filterModelVO[], sortModels: sortModelVO[])

// Column state
onColumnStateChanged(columnState: String, event?: JSEvent)

// Grouping
onRowGroupOpened(groupcolumnindexes?: Number[], groupkeys?: Object[], isopened?: Boolean)

// Form editor
onColumnFormEditStarted(rowindex?: Number, columnindex?: Number, value?: Object)

// Drag and drop
onDrop(sourceRows: Object[], targetRow: Object, event: JSDNDEvent)

// Footer
onFooterClick(columnindex?: Number, event?: JSEvent, dataTarget?: String)

// Custom menu
onCustomMainMenuAction(menuItemName: String, colId: String)

// Ready
onReady()
```

### datagrid / groupingtable

```javascript
// Cell events — foundsetIndex is -1 in grouping mode; use record pks instead
onCellClick(foundsetIndex: Number, columnIndex: Number, record: Object, event: JSEvent, dataTarget?: String)
onCellDoubleClick(foundsetIndex: Number, columnIndex: Number, record: Object, event: JSEvent, dataTarget?: String)
onCellRightClick(foundsetIndex: Number, columnIndex: Number, record: Object, event: JSEvent, dataTarget?: String)
onCellFocusGained(foundsetIndex: Number, columnIndex: Number, record: Object, event: JSEvent)

// Data change — return false to reject; true/undefined to accept
onColumnDataChange(foundsetIndex: Number, columnIndex: Number, oldvalue: Object, newvalue: Object, event?: JSEvent, record: Object): Boolean

// Sort (datagrid only)
onSort(columnindexes: Number[], sorts: String[])

// Editing lifecycle (datagrid only)
onCellEditingStarted(foundsetIndex: Number, columnIndex: Number, value: Object, event?: JSEvent, record: Object)
onCellEditingStopped(foundsetIndex: Number, columnIndex: Number, oldvalue: Object, newvalue: Object, event?: JSEvent, record: Object)

// Selection
onSelectedRowsChanged(isgroupselection: Boolean, groupcolumnid: String, groupkey: Object, groupselection: Boolean, event?: JSEvent)

// Column state
onColumnStateChanged(columnState: String, event?: JSEvent)

// Grouping
onRowGroupOpened(groupcolumnindexes?: Number[], groupkeys?: String[], isopened?: Boolean)

// Form editor
onColumnFormEditStarted(foundsetIndex?: Number, columnindex?: Number, value?: Object)

// Drag and drop
onDrop(sourceRecords: Object[], targetRecord: Object, event: JSDNDEvent)

// Footer
onFooterClick(columnindex?: Number, event?: JSEvent, dataTarget?: String)

// Custom menu
onCustomMainMenuAction(menuItemName: String, colId: String)

// Ready
onReady()
```

---

## 5. API Cheat-Sheet

### Data

| Method | powergrid | datasettable | datagrid | groupingtable |
|---|---|---|---|---|
| `renderData(dataset, pks?)` | yes | yes | — | — |
| `appendLazyRequestData(dataset, lastRowIndex?, pks?)` | yes | yes | — | — |
| `newRows(rowsData[], appendToBeginning?)` | yes | — | — | — |
| `updateRows(rowsData[])` | yes | — | — | — |
| `deleteRows(rowsKey[])` | yes | — | — | — |
| `notifyDataChange()` | — | — | yes | yes |
| `refreshData()` | — | — | yes | yes |

### Columns

| Method | powergrid | datasettable | datagrid | groupingtable |
|---|---|---|---|---|
| `newColumn(id, index?)` | yes | yes | — | — |
| `newColumn(dataprovider, index?)` | — | — | yes | yes |
| `deleteColumn(id)` | yes | yes | — | — |
| `removeColumn(index)` | — | — | yes | yes |
| `removeAllColumns()` | — | — | yes | yes |
| `getColumn(id, forChange?)` | yes | yes | — | — |
| `getColumn(index)` | — | — | yes | yes |
| `getColumnById(colId)` | — | — | yes | yes |
| `getAllColumns()` | yes | yes | — | — |
| `getViewColumns()` | — | — | yes | yes |
| `getColumnsCount()` | — | — | yes | yes |
| `getColumnIndex(colId)` | — | — | yes | yes |
| `setColumns(columns[])` | — | — | yes | yes |
| `moveColumn(id, index)` | yes | yes | yes | yes |

### Selection

| Method | powergrid | datasettable | datagrid | groupingtable |
|---|---|---|---|---|
| `getSelectedRows()` | yes | yes | — | — |
| `setSelectedRows(rowIndexes[])` | yes | yes | — | — |
| `getGroupedSelection()` | — | — | yes | yes |
| `setGroupedSelection(records[])` | — | — | yes | yes |
| `getCheckboxGroupSelection()` | — | — | yes | yes |
| `setCheckboxGroupSelection(groups[])` | — | — | yes | yes |

### Editing

| Method | All variants |
|---|---|
| `editCellAt(rowindex/foundsetindex, columnindex)` | yes (rowindex is 0-based for powergrid/datasettable; 1-based for datagrid/groupingtable) |
| `stopCellEditing(cancel?)` | yes |
| `setFormEditorValue(value)` | yes |

### Layout & Display

| Method | powergrid | datasettable | datagrid | groupingtable |
|---|---|---|---|---|
| `autoSizeAllColumns()` | yes | yes | yes | yes |
| `sizeColumnsToFit()` | yes | yes | yes | yes |
| `setReadOnly(readonly, columnids[]?)` | — | — | yes | yes |
| `requestFocus(columnindex)` | — | — | yes | yes |
| `showToolPanel(show)` | — | — | yes | yes |
| `isToolPanelShowing()` | — | — | yes | yes |

### Column State

| Method | powergrid/datasettable | datagrid/groupingtable |
|---|---|---|
| `getColumnState()` | returns JSON string | returns JSON string |
| `restoreColumnState(state?)` | restores; omit arg for design-time state | `(state, onError?, columns?, filter?, sort?)` — more control |
| `getColumnsFromState(state?)` | — | yes |
| `setColumnsToState(columns[], state?)` | — | yes |

### Groups, Scroll, Export

| Method | powergrid | datasettable | datagrid | groupingtable |
|---|---|---|---|---|
| `getExpandedGroups()` | yes | yes | yes | yes |
| `setExpandedGroups(groups)` | yes | yes | yes | yes |
| `setFilterModel(filterModel)` | — | — | yes | yes |
| `scrollToRow(rowData)` *(async)* | yes | yes | — | — |
| `scrollToSelection()` | — | — | yes | yes |
| `exportData(fileName?, ...)` | yes | yes | — | — |
| `exportToDataset()` | yes | yes | — | — |
| `isPivotMode()` | yes | yes | — | — |
| `addAggCustomFuncs(aggFuncs)` | yes | yes | — | — |

---

## 6. Func Properties (powergrid / datasettable)

These are client-side functions evaluated in the browser — **no Servoy API access**. Always wrap in an IIFE. **Never use inline comments** (they get inlined and break evaluation).

```javascript
// rowStyleClassFunc — grid-level, returns CSS class for the whole row
(function(idx, data, field, value, e) {
  return data.status === 'active' ? 'row-active' : '';
})

// cellStyleClassFunc — column-level, returns CSS class for individual cell
(function(rowIndex, rowData, field, columnData, event) {
  if (!columnData) return '';
  return columnData > 100 ? 'cell-high' : 'cell-low';
})

// cellRendererFunc — column-level, returns HTML string for cell content
(function(idx, data, field, value) {
  return '<strong>' + value + '</strong>';
})

// isEditableFunc — grid-level, returns boolean for cell editability
(function(idx, data, field) {
  return data.editable === true;
})

// valueGetterFunc — column-level, custom value retrieval
(function(idx, data, field, params) {
  return data[field] ? data[field].toUpperCase() : '';
})

// dndSourceFunc — column-level, allow/disallow dragging per row
(function(idx, data, field) {
  return data.draggable === true;
})

// groupRowRendererFunc — grid-level, custom group row HTML (requires gridOptions.groupDisplayType='groupRows')
(function(params) {
  var label = params.node.key;
  if (params.node.aggData) {
    label += ' [count: ' + params.node.aggData.count + ']';
  }
  return label;
})

// onDragOverFunc — grid-level, return 'copy', 'move', or 'none'
(function(src, dest, e, targetCell) {
  return dest.id === 'targetId' ? 'move' : 'none';
})

// onDragGetImageFunc — grid-level, custom drag image HTML
(function(src, e) {
  return '<div>Dragging ' + src.length + ' rows</div>';
})
```

datagrid / groupingtable uses **dataproviders** instead of func strings:
- `rowStyleClassDataprovider` — calculation returning CSS class for the row
- `styleClassDataprovider` — per-column calculation returning CSS class for cell
- `isEditableDataprovider` — calculation returning non-zero to enable editing
- `dndSourceDataprovider` — boolean dataprovider for drag allow/disallow

---

## 7. Common Implementation Patterns

### Power Grid — Basic Setup

```javascript
// onShow handler in Servoy form
function onShow(firstShow, event) {
  var ds = databaseManager.convertToDataSet(foundset, ['orderid', 'shipcountry', 'orderdate']);
  elements.powergrid.renderData(ds, ['orderid']);
}

// onColumnDataChange handler — save edits back
function onColumnDataChange(rowindex, columnindex, oldvalue, newvalue, event, rowData) {
  var record = foundset.getRecord(rowData.orderid);
  if (record) {
    record[columnHeaders[columnindex]] = newvalue;
    databaseManager.saveData(record);
  }
  return true;
}
```

### Power Grid — CRUD (Angular powergrid only)

```javascript
// Initial load with pks
elements.powergrid.renderData(ds, ['id']);

// Add rows
elements.powergrid.newRows([{id: newId, name: 'New Item'}]);

// Update — rowData must include pk field
elements.powergrid.updateRows([{id: existingId, name: 'Updated Name'}]);

// Delete — rowsKey must include pk field
elements.powergrid.deleteRows([{id: deletedId}]);
```

### Power Grid — Lazy Loading

```javascript
// Set useLazyLoading=true on the component, then:
function onLazyLoadingGetRows(startRow, endRow, rowGroupCols, valueCols, pivotCols, pivotMode, groupKeys, filterModels, sortModels) {
  var sql = 'SELECT id, name, amount FROM orders ORDER BY id LIMIT ? OFFSET ?';
  var size = endRow - startRow;
  var dataset = databaseManager.getDataSetByQuery('myserver', sql, [size, startRow], size);

  var colNames = dataset.getColumnNames();
  for (var i = 0; i < colNames.length; i++) {
    dataset.setColumnName(i + 1, colNames[i].toLowerCase());
  }

  var nextRow = databaseManager.getDataSetByQuery('myserver', sql, [1, endRow], 1);
  var lastRowIndex = -1;
  if (nextRow.getMaxRowIndex() === 0) {
    lastRowIndex = startRow + dataset.getMaxRowIndex();
  }

  elements.powergrid.appendLazyRequestData(dataset, lastRowIndex);
}
```

### Inline Editing Setup

```javascript
// In Servoy Developer, set column.editType to one of:
// TEXTFIELD, DATEPICKER, COMBOBOX, TYPEAHEAD, FORM, CHECKBOX

// Handle the edit — returning false keeps the cell in edit mode
function onColumnDataChange(rowindex, columnindex, oldvalue, newvalue, event, rowData) {
  if (newvalue === null || newvalue === '') {
    return false;
  }
  return true;
}
```

### Custom Form Editor

```javascript
// Set column.editType = FORM, column.editForm = 'myEditorForm'

// When editor opens — populate the form
function onColumnFormEditStarted(rowindex, columnindex, value) {
  forms.myEditorForm.elements.inputField.text = value;
}

// In myEditorForm save button — commit the value
function onSave() {
  elements.powergrid.setFormEditorValue(forms.myEditorForm.elements.inputField.text);
  elements.powergrid.stopCellEditing(false);
}
```

### Column State Persistence

```javascript
// Save state (e.g. in onHide or on a save button)
var state = elements.powergrid.getColumnState();
application.setUserProperty('gridState', state);

// Restore state (e.g. in onShow)
var state = application.getUserProperty('gridState');
if (state) {
  elements.powergrid.restoreColumnState(state);
}
```

### Row Grouping Setup

```javascript
// In Servoy Developer: set column.rowGroupIndex = 0 (first group), 1 (second group), etc.
// Set column.enableRowGroup = true to allow user to change grouping via UI

// Restore expanded state
var groups = {
  'USA': {
    'California': {}
  },
  'Canada': {}
};
elements.datagrid.setExpandedGroups(groups);

// Save expanded state
var currentGroups = elements.datagrid.getExpandedGroups();
```

### Pivot Mode (powergrid)

```javascript
// In Servoy Developer:
// - Set grid property: pivotMode = true
// - On the pivot column: enablePivot = true, pivotIndex = 0
// - On the value column: aggFunc = 'sum' (or min/max/count/avg/first/last)
// - On the grouping column: rowGroupIndex = 0

// Check pivot state at runtime
if (elements.powergrid.isPivotMode()) {
  // pivot is active
}
```

### Custom Aggregation Functions (powergrid)

```javascript
// Register before renderData
elements.powergrid.addAggCustomFuncs({
  weightedAvg: '(function(values) { var sum = 0; for (var i = 0; i < values.length; i++) { sum += values[i]; } return sum / values.length; })'
});
// Then set column.aggFunc = 'weightedAvg'
```

### Accessing Raw ag-Grid Behaviour via gridOptions / columnDef

```javascript
// Example: set groupDisplayType to 'groupRows' and custom group renderer
// In Servoy Developer, set gridOptions map:
// gridOptions.groupDisplayType = 'groupRows'
// gridOptions.groupDefaultExpanded = -1

// Example: pin a column to the left via columnDef
// On the column, set columnDef map:
// columnDef.pinned = 'left'
// columnDef.suppressMovable = true
```

### Data Grid — Data Refresh

```javascript
// Non-disruptive: shows orange refresh button — let user decide when to refresh
elements.datagrid.notifyDataChange();

// Forced full refresh — collapses ALL group nodes (bad UX for users mid-navigation)
elements.datagrid.refreshData();

// Recommended: use notifyDataChange in broadcast handlers
function onDataBroadcast(dataSource, action, pks, cachedRecordWillChange) {
  if (dataSource === 'orders') {
    elements.datagrid.notifyDataChange();
  }
}
```

### Data Grid — Filter

```javascript
// Set a filter model (maps to ag-Grid's setFilterModel)
elements.datagrid.setFilterModel({
  'status': { filterType: 'text', type: 'equals', filter: 'active' },
  'amount': { filterType: 'number', type: 'greaterThan', filter: 100 }
});

// Clear all filters
elements.datagrid.setFilterModel({});
```

### Drag-and-Drop

```javascript
// In Servoy Developer: set column.dndSource = true

// Handle drop
function onDrop(sourceRows, targetRow, event) {
  // sourceRows: array of row data objects from the source grid
  // targetRow: row data object at drop target
  // event.sourceGridName: name of the source grid element
  // event.targetColumnId / event.sourceColumnId: column ids
  for (var i = 0; i < sourceRows.length; i++) {
    // reorder or process drag
  }
}
```

---

## 8. CSS Selectors (datagrid / groupingtable)

| Selector | Description |
|---|---|
| `.ag-table` | The whole table component |
| `.ag-table-info` | The refresh icon |
| `.ag-table-info-notify` | Refresh icon when notified of pending data changes (default: orange) |
| `.ag-header` | Table header |
| `.ag-body` | Table body |
| `.ag-header-cell` | Individual header cell |
| `.ag-header-label` | Label text inside header cell |
| `.ag-row` | A table row |
| `.ag-row-even` | Even rows |
| `.ag-row-odd` | Odd rows |
| `.ag-row-selected` | Selected row |
| `.ag-row-level-0` | Row at group level 0 (top-level group) |
| `.ag-row-level-1` | Row at group level 1 (nested group) |
| `.ag-row-level-x` | Row at group level x — zero-indexed |
| `.ag-icon` | Icons in the grid |
| `.ag-column-drop-cell` | Droppable column in the row group panel |
| `.ag-column-drop-cell-text` | Label inside droppable column |
| `.ag-column-drop-cell-button` | Remove button inside droppable column |
| `.ag-table-header-tooltip` | Column header tooltip |
| `.ag-table-cell-tooltip` | Cell tooltip |

ag-Grid itself uses many more CSS custom properties and class selectors — see https://www.ag-grid.com/javascript-data-grid/theming-api/ for the full theming reference. The default theme is `ag-theme-alpine` for powergrid and can be set via the `styleClass` property.

---

## 9. Bug-Fixing Checklist

Before making any edit, read the relevant section of the implementation file to understand the current behaviour. Fix root cause, not symptoms.

| Symptom | Root cause | Fix |
|---|---|---|
| `updateRows` / `deleteRows` silently does nothing | `pks` not passed to `renderData` | Call `renderData(dataset, ['pkColumnName'])` |
| Column property change has no effect | `getColumn` called without `forChange=true` | Use `getColumn(id, true)` before modifying |
| `onColumnDataChange` rejects all edits | Handler returning `false` (or implicit `undefined` being treated as false in some paths) | Ensure handler returns `true` or nothing to accept; `false` to keep in edit mode |
| Angular edit has no effect in browser | `npm run build` not run after TypeScript change | Run `npm run build` in `/aggrid/` |
| Column widths are ignored | `columnsAutoSizing` is set to `SIZE_COLUMNS_TO_FIT` which overrides explicit `width` | Set `columnsAutoSizing` to `NONE` or `AUTO_SIZE`, or remove it |
| Lazy loading calls `onLazyLoadingGetRows` infinitely | `lastRowIndex` never passed to `appendLazyRequestData` | Detect last page and pass total row count as `lastRowIndex` |
| `scrollToRow` has no immediate effect | It is `async: true` — must be called after grid is ready | Call inside or after `onReady` handler |
| Cell click `foundsetIndex` is always `-1` | Table is in grouping mode | This is by design — use `record` object pks to identify the row |
| Grouping breaks with multiple PKs | Data Grid does not support grouping with multiple PKs | Use a single PK foundset; this is a known limitation |
| Calculations/aggregations show wrong data in grouped columns | Not supported — grouped columns should not use calculations | Set `enableRowGroup=false` on calculation columns |
| Func property (`cellRendererFunc`, etc.) does nothing | Inline JS comments inside the string break browser eval | Remove all `//` and `/* */` comments from func strings |
| `gridOptions` / `columnDef` setting has no effect | The ag-Grid option is marked `Initial` — only read at grid creation | The grid must be re-created; avoid relying on post-init changes for Initial options |
| `restoreColumnState` does nothing on datagrid | If column IDs from saved state don't match current columns, restore is skipped by design | Ensure column `id` properties are stable and match between save and restore |
| `checkboxEditorValueServerToClientFunc` / `checkboxEditorValueClientToServerFunc` not applied | datagrid-specific properties not set | Set these on the groupingtable/datagrid component to convert checkbox values |

---

## 10. ag-Grid Reference Links

Use these when `gridOptions` or `columnDef` are needed to access ag-Grid behaviour not exposed by the Servoy wrapper:

- **Grid options**: https://www.ag-grid.com/javascript-data-grid/grid-options/
- **Grid API**: https://www.ag-grid.com/javascript-data-grid/grid-api/
- **Column properties**: https://www.ag-grid.com/javascript-data-grid/column-properties/
- **Grid events**: https://www.ag-grid.com/javascript-data-grid/grid-events/
- **Row object**: https://www.ag-grid.com/javascript-data-grid/row-object/
- **Column state**: https://www.ag-grid.com/javascript-data-grid/column-state/
- **Theming**: https://www.ag-grid.com/javascript-data-grid/theming-api/
- **Filter API**: https://www.ag-grid.com/javascript-data-grid/filter-api/
