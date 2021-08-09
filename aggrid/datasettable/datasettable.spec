{
	"name": "aggrid-datasettable",
	"displayName": "Power Grid",
	"categoryName": "Grids",
	"version": 1,
	"icon" :"aggrid/datasettable/ag-dataset.png",
	"definition": "aggrid/datasettable/datasettable.js",
	"serverscript": "aggrid/datasettable/datasettable_server.js",
	"libraries": [
		{ "name": "datasettablegroupcellrenderer.js", "version": "1.0", "url": "aggrid/datasettable/datasettablegroupcellrenderer.js", "mimetype": "text/javascript" },
		{ "name": "datasettable.css", "version": "1.0", "url": "aggrid/datasettable/datasettable.css", "mimetype": "text/css" }
	],
	"model":
	{
		"data": { "type": "object[]", "tags": {"scope" : "private"}},
		"columns": { "type": "column[]", "droppable" : true, "tags": {"doc": "List all columns to be used in table as dataprovider"}},
		"columnState": { "type": "string", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"_internalColumnState": { "type": "string", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"_internalExpandedState": { "type": "object", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"responsiveHeight": { "type": "int", "default": 300, "tags": {"doc": "Table's height to be set in a responsive form. When responsiveHeight is set to 0, the table will use 100% height of the parent container"} },
		"rowHeight" : {"type" : "int", "default": 25, "tags": {"scope": "design", "doc": "The height in pixels of the table's rows"}},
		"rowStyleClassFunc": { "type": "string", "tags": {"doc": "Function to add style class to row"}},
		"styleClass": { "type": "styleclass", "default" : "ag-theme-bootstrap"},
		"visible": "visible",
		"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"enableSorting": { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Enable column sorting by clickin on the column's header"}},
		"pivotMode": { "type": "boolean", "default": false, "tags": {"scope": "design", "doc": "Pivoting allows you to take a columns values and turn them into columns"}},
		"iconConfig": { "type": "iconConfig"},
		"groupStyleClass" : {"type": "styleclass"},
		"groupWidth":  { "type": "int", "default": 0 },
		"groupMinWidth":  { "type": "int" },
		"groupMaxWidth":  { "type": "int" },		
		"useLazyLoading": { "type": "boolean", "default": false, "tags": {"scope": "design"}},
		"lastRowIndex": { "type": "long", "tags": {"scope" : "private"}},
		"multiSelect": { "type": "boolean", "default": false, "tags": {"scope": "design"}},
		"headerHeight" : {"type" : "int", "default": 33, "tags": {"scope": "design"}},
		"showColumnsMenuTab": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
		"toolPanelConfig": { "type": "toolPanelConfig", "tags": { "scope": "design" }},
		"gridOptions": {"type": "map", "tags": {"doc": "Map where additional grid properties of ag-grid can be set"}},
		"localeText": {"type": "map", "tags": {"doc": "Map where locales of ag-grid can be set"}},
		"groupRowRendererFunc": { "type": "string", "tags": {"doc": "Function to customize group row rendering when gridOptions.groupUseEntireRow is set to true"}},
		"mainMenuItemsConfig": { "type": "mainMenuItemsConfig", "tags": { "scope": "design" } },
		"_internalFormEditorValue": { "type": "object", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"arrowsUpDownMoveWhenEditing": {"type": "string", "values": [{"DEFAULT": null}, {"NONE":"NONE"}, {"NEXTCELL":"NEXTCELL"}, {"NEXTEDITABLECELL":"NEXTEDITABLECELL"}], "tags": {"doc": "Defines action on TEXTFIELD editor for up/down arrow keys"}},
		"editNextCellOnEnter":  { "type": "boolean", "default": false }
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
			}]
		},
		"onColumnStateChanged": {
			"doc": "Called when the columns state is changed",
			"parameters": [
				{
					"name": "columnState",
					"type": "string"
				}	
			]
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
			]
		},
		"onReady": {
			"doc": "Called when the table is ready to be shown"
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
			}]			
		}		
	}, 
	"api" : {
		"renderData": {
			"parameters": [
				{ "name": "dataset", "type": {"type": "dataset"} }
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
		}		
	},
	"types" : {
		"column" : {
			"headerGroup": {"type" : "tagstring", "tags": {"doc": "Header group, that this column will be part of"}},
			"headerGroupStyleClass" : {"type" : "styleclass"},
			"headerTitle": {"type" : "tagstring"},
			"headerStyleClass" : {"type" : "styleclass"},
			"headerTooltip": {"type" : "tagstring"},
			"dataprovider": { "type": "string"},
			"tooltip": { "type": "string"},
			"styleClass" : {"type" : "styleclass"},
			"visible":  { "type": "boolean", "default": true},
			"width":  { "type": "int", "default": 0 },
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
			"cellStyleClassFunc": {"type": "string"},
			"cellRendererFunc": {"type": "string", "tags": {"doc": "Function to change the cell rendering"}},
			"format": {"type": "tagstring", "tags": {"doc": "Format string as used in Servoy, for the type set in formatType"}},
			"formatType": {"type": "string", "values": ["TEXT", "NUMBER", "DATETIME"], "default": "TEXT", "tags": {"doc": "Type of data the format is applied on"}},
			"editType": {"type": "string", "values": [{"NONE":null}, {"TEXTFIELD":"TEXTFIELD"}, {"DATEPICKER":"DATEPICKER"}, {"FORM":"FORM"}, {"CHECKBOX":"CHECKBOX"}], "tags": {"doc": "Type of editing used for that column"}},
			"editForm": {"type": "form", "tags": {"doc": "Form used as custom editor"}},
			"editFormSize": {"type": "dimension", "default" : {"width":300, "height":200}},
			"filterType": {"type": "string", "values": [{"NONE":null}, {"TEXT":"TEXT"}, {"NUMBER":"NUMBER"}, {"DATE":"DATE"}]},
			"id": {"type" : "string", "tags": {"showInOutlineView": true, "doc": "Used to set the column id (colId) property in the serialized column state json string of getColumnState and onColumnStateChanged" }},
			"columnDef": {"type" : "map", "tags": {"doc": "Map where additional column properties of ag-grid can be set"}},
			"showAs": { "type": "string", "values": [{"text":null}, {"html":"html"}, {"sanitizedHtml":"sanitizedHtml"}] },
			"exportDisplayValue": {"type": "boolean", "default" : false, "tags": {"doc": "If exportData api should export the display value (with format applied) instead of the raw data of the dataset"}}
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
		}		
	}
}