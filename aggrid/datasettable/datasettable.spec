{
	"name": "aggrid-datasettable",
	"displayName": "Power Grid",
	"categoryName": "Grids",
	"version": 1,
	"icon" :"aggrid/datasettable/ag-dataset.png",
	"definition": "aggrid/datasettable/datasettable.js",
	"serverscript": "aggrid/datasettable/datasettable_server.js",
	"doc": "aggrid/datasettable/datasettable_doc.js",
	"libraries": [
		{ "name": "datasettablegroupcellrenderer.js", "version": "1.0", "url": "aggrid/datasettable/datasettablegroupcellrenderer.js", "mimetype": "text/javascript" },
		{ "name": "datasettable.css", "version": "1.0", "url": "aggrid/datasettable/datasettable.css", "mimetype": "text/css" }
	],
    "ng2Config": {
        "dependencies": {
           "csslibrary": ["~@eonasdan/tempus-dominus/dist/css/tempus-dominus.css;priority=5"]
        }
    },
	"model":
	{
		"data": { "type": "object[]", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"pks": { "type": "string[]", "tags": {"scope" : "private"}},
		"updateData": { "type": "object", "tags": {"scope" : "private"}},
		"columns": { "type": "column[]", "droppable" : true, "tags": {"doc": "List all columns to be used in table as dataprovider"}},
		"columnState": { "type": "string", "tags": {"scope" : "private", "allowaccess": "enabled"}, "pushToServer": "allow"},
		"_internalColumnState": { "type": "string", "tags": {"scope" : "private", "allowaccess": "enabled"}, "pushToServer": "allow"},
		"_internalExpandedState": { "type": "object", "tags": {"scope" : "private", "allowaccess": "enabled"}, "pushToServer": "allow"},
		"responsiveHeight": { "type": "int", "default": 300, "tags": {"doc": "Table's height to be set in a responsive form. When responsiveHeight is set to 0, the table will use 100% height of the parent container. When responsiveHeight is set to -1, the table will auto-size it's height to the number of rows displayed inside the grid - in this case there is no vertical scrollbar and all rows are rendered"} },
		"rowHeight" : {"type" : "int", "default": 25, "tags": {"scope": "design", "doc": "The height in pixels of the table's rows"}},
		"rowStyleClassFunc": { "type": "clientfunction", "tags": {"doc": "Function to add style class to row"}},
		"styleClass": { "type": "styleclass", "default" : "ag-theme-alpine"},
		"visible": "visible",
		"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"enableSorting": { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Enable column sorting by clicking on the column's header"}},
		"checkboxSelection" : {"type": "boolean", "default" : false, "tags" : {"scope": "design", "doc": "When true the row has a checkbox for selecting/unselecting "}},
		"pivotMode": { "type": "boolean", "default": false, "tags": {"scope": "design", "doc": "Pivoting allows you to take a columns values and turn them into columns"}},
		"iconConfig": { "type": "iconConfig"},
		"groupStyleClass" : {"type": "styleclass"},
		"groupWidth":  { "type": "int", "default": 200 },
		"groupMinWidth":  { "type": "int", "default": 200 },
		"groupMaxWidth":  { "type": "int" },		
		"useLazyLoading": { "type": "boolean", "default": false, "tags": {"scope": "design"}},
		"_internalResetLazyLoading": { "type": "boolean", "default": false, "tags": {"scope" : "private", "allowaccess": "enabled"}, "pushToServer": "allow"},
		"lastRowIndex": { "type": "long", "tags": {"scope" : "private"}},
		"multiSelect": { "type": "boolean", "default": false, "tags": {"scope": "design"}},
		"headerHeight" : {"type" : "int", "default": 33, "tags": {"scope": "design"}},
		"showColumnsMenuTab": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
		"toolPanelConfig": { "type": "toolPanelConfig", "tags": { "scope": "design" }},
		"gridOptions": {"type": "json", "tags": {"doc": "Map where additional grid properties of ag-grid can be set"}},
		"localeText": {"type": "map", "tags": {"doc": "Map where locales of ag-grid can be set"}},
		"groupRowRendererFunc": { "type": "clientfunction", "tags": {"doc": "Function to customize group row rendering when gridOptions.groupDisplayType is set to 'groupRows'"}},
		"mainMenuItemsConfig": { "type": "mainMenuItemsConfig", "tags": { "scope": "design" } },
		"_internalFormEditorValue": { "type": "object", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"arrowsUpDownMoveWhenEditing": {"type": "string", "values": [{"DEFAULT": null}, {"NONE":"NONE"}, {"NEXTCELL":"NEXTCELL"}, {"NEXTEDITABLECELL":"NEXTEDITABLECELL"}], "tags": {"doc": "Defines action on TEXTFIELD editor for up/down arrow keys"}},
		"editNextCellOnEnter":  { "type": "boolean", "default": false },
		"readOnly": {"type": "boolean", "default": false},
		"enabled" : {"type": "enabled", "blockingOn": false, "default": true},
		"isEditableFunc": {"type": "clientfunction", "tags": {"doc": "Callback that returns the editable state of a cell."}},
		"_internalAggCustomFuncs": { "type": "aggFuncInfo[]", "tags": {"scope" : "private"}},
		"tabSeq": { "type": "tabseq", "tags": { "scope": "design" } },
		"columnsAutoSizing": {"type": "string", "default" : null, "values": [{"SIZE_COLUMNS_TO_FIT":null}, {"AUTO_SIZE":"AUTO_SIZE"}, {"NONE":"NONE"}], "pushToServer": "allow", "tags": {"allowaccess": "enabled", "doc": "Auto sizing for columns. SIZE_COLUMNS_TO_FIT: make the currently visible columns fit the screen. AUTO_SIZE: the grid will work out the best width to fit the contents of the 'visible' cells in the column. NONE: no auto sizing action performed"}},
		"continuousColumnsAutoSizing":  { "type": "boolean", "default": false, "deprecated" : "use columnsAutoSizingOn instead", "tags": {"doc": "Apply 'columnsAutoSizing' whenever columns width are changed"} },
		"columnsAutoSizingOn":  { "type": "columnsAutoSizingOn", "tags": {"doc": "Apply 'columnsAutoSizing' for these events even if 'continuousColumnsAutoSizing' is false"} },
		"onDragOverFunc": {"type": "clientfunction", "tags": {"doc": "Callback when dragging over a row - returns one of the strings: 'copy', 'move', 'none' depending on the allowed drag operation."}},
		"onDragGetImageFunc": {"type": "clientfunction", "tags": {"doc": "Called when row(s) drag-n-drop is started, to get the drag image as an html code."}}
	},
	"handlers" : {
		"onRowSelected": {
			"doc": "Called when the mouse is clicked on a row/cell",
			"parameters": [{
				"name": "rowData",
				"type": "object"
			},{
				"name": "selected",
				"type": "boolean"
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}]
		},
		"onCellClick": {
			"doc": "Called when the mouse is clicked on a row/cell",
			"parameters": [{
				"name": "rowData",
				"type": "object"
			}, {
				"name": "columnId",
				"type": "string",
				"optional": true
			}, {
				"name": "cellData",
				"type": "object",
				"optional": true				
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			},{
				"name":"dataTarget",
				"type":"string",
				"optional": true
			}]
		},
		"onCellDoubleClick": {
			"doc": "Called when the mouse is double clicked on a row/cell",
			"parameters": [{
				"name": "rowData",
				"type": "object"
			}, {
				"name": "columnId",
				"type": "string",
				"optional": true
			}, {
				"name": "cellData",
				"type": "object",
				"optional": true				
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			},{
				"name":"dataTarget",
				"type":"string",
				"optional": true				
			}]
		},
		"onCellRightClick": {
			"doc": "Called when the right mouse button is clicked on a row/cell",
			"parameters": [{
				"name": "rowData",
				"type": "object"
			}, {
				"name": "columnId",
				"type": "string",
				"optional": true
			}, {
				"name": "cellData",
				"type": "object",
				"optional": true				
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			},{
				"name":"dataTarget",
				"type":"string",
				"optional": true				
			}]
		},
		"onColumnStateChanged": {
			"doc": "Called when the columns state is changed",
			"parameters": [
				{
					"name": "columnState",
					"type": "string"
				}, {
					"name": "event",
					"type": "JSEvent",
					"optional": true
				}
			],
			"allowaccess": "enabled"
		},
		"onColumnDataChange": {
			"doc": "Called when the columns data is changed",
			"parameters": [{
				"name": "rowindex",
				"type": "int"
			}, {
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "oldvalue",
				"type": "object",
				"optional": true
			}, {
				"name": "newvalue",
				"type": "object",
				"optional": true
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}, {
				"name": "rowData",
				"type": "object"
			}],
			"returns": {"type": "boolean", "default": true}
		},
		"onLazyLoadingGetRows": {
			"doc": "Called when lazy loading is used, and new rows are requested to display",
			"parameters": [
				{
					"name": "startRow",
					"type": "long"
				},
				{
					"name": "endRow",
					"type": "long"
				},				
				{
					"name": "rowGroupCols",
					"type": "columnVO[]"
				},
				{
					"name": "valueCols",
					"type": "columnVO[]"
				},
				{
					"name": "pivotCols",
					"type": "columnVO[]"
				},
				{
					"name": "pivotMode",
					"type": "boolean"
				},
				{
					"name": "groupKeys",
					"type": "string[]"
				},
				{
					"name": "filterModels",
					"type": "filterModelVO[]"
				},
				{
					"name": "sortModels",
					"type": "sortModelVO[]"
				}
			],
			"allowaccess": "enabled"
		},
		"onReady": {
			"doc": "Called when the table is ready to be shown",
			"allowaccess": "enabled"
		},
		"onColumnFormEditStarted": {
			"doc": "Called when the column's form editor is started",
			"parameters": [{
				"name": "rowindex",
				"type": "int",
				"optional": true
			}, {
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "value",
				"type": "object",
				"optional": true
			}]
		},
		"onRowGroupOpened": {
			"doc": "Called when group is opened/closed",
			"parameters": [{
				"name": "groupcolumnindexes",
				"type": "int[]",
				"optional": true
			}, {
				"name": "groupkeys",
				"type": "object[]",
				"optional": true
			}, {
				"name": "isopened",
				"type": "boolean",
				"optional": true
			}],
			"allowaccess": "enabled"
		},
		"onDrop": {
			"doc": "Called when a row is dropped as a result of a drag-n-drop",
			"parameters": [{
				"name": "sourceRow",
				"type": "object[]"
			}, {
				"name": "targetRow",
				"type": "object"
			}, {
				"name": "event",
				"type": "JSEvent"
			}]
		},
		"onFooterClick": {
			"doc": "Called when the mouse is clicked on a footer cell",
			"parameters": [{
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			},{
				"name":"dataTarget",
				"type":"string",
				"optional": true				
			}]
		}
	}, 
	"api" : {
		"renderData": {
			"parameters": [
				{ "name": "dataset", "type": {"type": "dataset"}, "optional": true},
				{ "name": "pks", "type" : "string[]", "optional": true }
			]
		},
		"newColumn" : {
			"parameters": [
				{ "name": "id", "type" : "string"},
				{ "name": "index", "type": "int", "optional": true }
			],
			"returns" : "column"
		},
		"deleteColumn" : {
			"parameters": [
				{ "name": "id", "type": "string" }
			]
		},
		"getColumn" : {
			"parameters": [
				{ "name": "id", "type": "string" },
				{ "name": "forChange", "type": "boolean", "optional": true}
			],
			"returns" : "column"
		},
		"getAllColumns" : {
			"returns" : "column[]"
		},
		"exportData" : {
			"parameters": [
				{ "name": "fileName", "type": "string", "optional": true},
				{ "name": "skipHeader", "type": "boolean", "optional": true},
				{ "name": "columnGroups", "type": "boolean", "optional": true},
				{ "name": "skipFooters", "type": "boolean", "optional": true},
				{ "name": "skipGroups", "type": "boolean", "optional": true},
				{ "name": "asCSV", "type": "boolean", "optional": true}				
			]
		},
		"getColumnState" : {
			"returns": "string"
		},
		"getSelectedRows" : {
			"returns": "object[]"
		},
		"setSelectedRows" : {
			"parameters": [
				{ "name": "rowIndexes", "type": "int[]"}
			]
		},
		"restoreColumnState" : {
			"parameters": [
				{ "name": "columnState", "type": "string", "optional": true}
			]
		},
		"appendLazyRequestData": {
			"parameters": [
				{ "name": "dataset", "type": {"type": "dataset"} },
				{ "name": "lastRowIndex", "type": {"type": "long"}, "optional": true }
			]
		},
		"editCellAt": {
			"parameters": [{
				"name": "rowindex",
				"type": "int"
			}, {
				"name": "columnindex",
				"type": "int"
			}]
		},
		"stopCellEditing": {
			"parameters": [
				{ "name": "cancel", "type": "boolean", "optional": true}
			]
		},
		"setFormEditorValue": {
			"parameters": [
				{ "name": "value", "type": "object"}
			]
		},
		"getExpandedGroups": {
			"returns": "object"
		},
		"setExpandedGroups": {
			"parameters": [
				{ "name": "groups", "type": "object"}
			]
		},
		"scrollToRow": {
			"parameters": [
				{ "name": "rowData", "type": "object"}
			],
			"async": true
		},
        "autoSizeAllColumns" : {
            "delayUntilFormLoads": true,
            "discardPreviouslyQueuedSimilarCalls": true,
            "parameters": [
            ]
        },
		"sizeColumnsToFit" : {
            "delayUntilFormLoads": true,
            "discardPreviouslyQueuedSimilarCalls": true,
            "parameters": [
            ]
		},		
		"newRows": {
			"parameters": [
				{ "name": "rowsData", "type": "object[]"},
				{ "name": "appendToBeginning", "type": "boolean", "optional": true}
			]
		},
		"updateRows": {
			"parameters": [
				{ "name": "rowsData", "type": "object[]"}
			]
		},
		"deleteRows": {
			"parameters": [
				{ "name": "rowsKey", "type": "object[]"}
			]
		},
		"isPivotMode" : {
			"returns": "boolean"
		},
		"addAggCustomFuncs": {
			"parameters": [
				{ "name": "aggFuncs", "type": "map"}
			]
		},
		"moveColumn" : {
			"parameters": [
				{ "name": "id", "type": "string" },
				{ "name": "index", "type": "int"}
			]
		},
		"exportToDataset" : {
			"returns": "dataset"
		}
	},
	"internalApi" : {
		"clearUpdateData" : {
			"allowaccess" : "enabled"
		},
		"internalExportToDataset" : {
			"returns": "object[]"
		}
    },	
	"types" : {
		"column" : {
			"footerText" : {"type" : "tagstring"},
			"footerStyleClass" : {"type" : "styleclass"},
			"headerGroup": {"type" : "tagstring", "tags": {"doc": "Header group, that this column will be part of"}},
			"headerGroupStyleClass" : {"type" : "styleclass"},
			"headerTitle": {"type" : "tagstring", "tags": { "useAsCaptionInDeveloper" : true, "captionPriority" : 1, "showInOutlineView": true }},
			"headerStyleClass" : {"type" : "styleclass"},
			"headerIconStyleClass" : {"type" : "styleclass", "tags": {"doc": "(Font awesome) Styles for header icon"}},
			"headerTooltip": {"type" : "tagstring"},
			"dataprovider": { "type": "string"},
			"tooltip": { "type": "string"},
			"styleClass" : {"type" : "styleclass"},
			"visible":  { "type": "boolean", "default": true},
			"excluded":  { "type": "boolean", "default": false, "tags": {"doc": "When true the column is excluded from the UI"}},
			"width":  { "type": "int", "default": 0 },
			"initialWidth":  { "type": "int", "tags": {"scope" : "private"}},
			"minWidth":  { "type": "int" },
			"maxWidth":  { "type": "int" },		
			"enableRowGroup" : {"type": "boolean", "default" : true, "tags": {"doc": "Allow the user to group or ungroup the column"}},
			"rowGroupIndex":  {"type": "int", "default": -1, "tags": {"doc": "Set the rowGroupIndex to group on the column; the index defines the order of the group when there are multiple grouped columns"}},
			"enablePivot":  {"type": "boolean", "default": false, "tags": {"doc": "If the column can be used as pivot"}},
			"pivotIndex":  {"type": "int", "default": -1, "tags": {"doc": "Set this in columns you want to pivot by"}},
			"aggFunc": {"type": "string", "values" : ["sum", "min", "max", "count", "avg", "first", "last"], "default": "", "tags": {"doc": "Name of function to use for aggregation"}},
			"enableSort" : {"type": "boolean", "default" : true},
			"enableResize" : {"type": "boolean", "default" : true},
			"enableToolPanel" : {"type": "boolean", "default" : true},
			"autoResize" : {"type": "boolean", "default" : true},
			"cellStyleClassFunc": {"type": "clientfunction"},
			"cellRendererFunc": {"type": "clientfunction", "tags": {"doc": "Function to change the cell rendering"}},
			"format": {"type": "format", "for": ["formatType"], "tags": {"doc": "Format for the type set in formatType"}},
			"formatType": {"type": "string", "values": ["TEXT", "NUMBER", "DATETIME"], "default": "TEXT", "tags": {"doc": "Type of data the format is applied on"}},
			"editType": {"type": "string", "values": [{"NONE":null}, {"TEXTFIELD":"TEXTFIELD"}, {"DATEPICKER":"DATEPICKER"}, {"COMBOBOX":"COMBOBOX"}, {"TYPEAHEAD":"TYPEAHEAD"}, {"FORM":"FORM"}, {"CHECKBOX":"CHECKBOX"}], "tags": {"doc": "Type of editing used for that column"}},
			"editForm": {"type": "form", "tags": {"doc": "Form used as custom editor"}},
			"editFormSize": {"type": "dimension", "default" : {"width":300, "height":200}},
			"filterType": {"type": "string", "values": [{"NONE":null}, {"TEXT":"TEXT"}, {"NUMBER":"NUMBER"}, {"DATE":"DATE"}, {"VALUELIST":"VALUELIST"}, {"RADIO":"RADIO"}]},
			"id": {"type" : "string", "tags": {"wizard": {"prefill" : "dataprovider", "unique": true}, "showInOutlineView": true, "doc": "Used to set the column id (colId) property in the serialized column state json string of getColumnState and onColumnStateChanged" }},
			"columnDef": {"type" : "json", "tags": {"doc": "Map where additional column properties of ag-grid can be set"}},
			"showAs": { "type": "string", "values": [{"text":null}, {"html":"html"}, {"sanitizedHtml":"sanitizedHtml"}] },
			"exportDisplayValue": {"type": "boolean", "default" : false, "tags": {"doc": "If exportData api should export the display value (with format applied) instead of the raw data of the dataset"}},
			"pivotComparatorFunc": {"type": "clientfunction", "tags": {"doc": "Function to sort the pivot columns"}},
			"valueGetterFunc": {"type": "clientfunction", "tags": {"doc": "Proxy function for getting the cell value from the model"}},
			"dndSource" : {"type": "boolean", "default" : false, "tags": {"doc": "Allow dragging"}},
			"dndSourceFunc" : { "type": "clientfunction", "tags": {"doc": "Boolean function for allow/disallow dragging."}},
			"valuelist": { "type": "valuelist", "config": "valuelistConfig"},
			"valuelistConfig" : { "type" : "valuelistConfig"}
		},
        "iconConfig" : {
			"iconMenu": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconFilter": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumns": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortAscending": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortDescending": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortUnSort": { "type": "styleclass", "tags": {"scope": "design"}},
			
			"iconGroupExpanded": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconGroupContracted": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnGroupOpened": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnGroupClosed": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnSelectOpen": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnSelectClosed": { "type": "styleclass", "tags": {"scope": "design"}},
			
			"iconCheckboxChecked": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconCheckboxUnchecked": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconCheckboxIndeterminate": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconCheckboxCheckedReadOnly": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconCheckboxUncheckedReadOnly": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconCheckboxIndeterminateReadOnly": { "type": "styleclass", "tags": {"scope": "design"}},
			
			"iconColumnMovePin": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnMoveAdd": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnMoveHide": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnMoveMove": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnMoveLeft": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnMoveRight": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnMoveGroup": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnMoveValue": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumnMovePivot": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconDropNotAllowed": { "type": "styleclass", "tags": {"scope": "design"}},
			
			"iconMenuPin": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconMenuValue": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconMenuAddRowGroup": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconMenuRemoveRowGroup": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconClipboardCopy": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconClipboardPaste": { "type": "styleclass", "tags": {"scope": "design"}},
			
			"iconRowGroupPanel": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconPivotPanel": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconValuePanel": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconRefreshData": { "type": "styleclass", "default" : "glyphicon glyphicon-refresh", "tags": {"scope": "design"}},
			"iconEditorChecked": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconEditorUnchecked": { "type": "styleclass", "tags": {"scope": "design"}}
        },
		"columnVO": {
			"id": {"type": "string"},
			"displayName": {"type": "string"},
			"aggFunc": {"type": "string"}
		},
		"sortModelVO": {
			"colId": {"type": "string"},
			"sort": {"type": "string"}
		},
		"filterModelVO": {
			"id": {"type": "string"},
			"operator": {"type": "string"},
			"value": {"type": "string"}
		},
		"rowInfo": {
			"rowData" : "object",
			"rowIndex" : "int"
		},
		"toolPanelConfig" : {
			"suppressRowGroups": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressValues": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressPivots": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressPivotMode": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressSideButtons": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressColumnFilter": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressColumnSelectAll": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressColumnExpandAll": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}}
		},
		"mainMenuItemsConfig" : {
			"pinSubMenu": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"valueAggSubMenu": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"autoSizeThis": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"autoSizeAll": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"rowGroup": {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
			"rowUnGroup": {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
			"resetColumns": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"expandAll": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"contractAll": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}}
		},
		"aggFuncInfo": {
			"name" : "string",
			"aggFunc" : "clientfunction"
		},
		"columnsAutoSizingOn" : {
			"columnResize" : { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Apply 'columnsAutoSizing' when columns are resized"} },
			"columnRowGroupChange" : { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Apply 'columnsAutoSizing' when row grouping is changed"} },
			"displayedColumnsChange" : { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Apply 'columnsAutoSizing' when columns are added/removed"} },
			"gridReady" : { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Apply 'columnsAutoSizing' when grid is ready to be shown"} },
			"gridSizeChange" : { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Apply 'columnsAutoSizing' when grid size changes"} },
			"toolPanelVisibleChange" : { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Apply 'columnsAutoSizing' when the toolpanel visibility is changed"} }
		}
	}
}