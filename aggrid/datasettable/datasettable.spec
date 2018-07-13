{
	"name": "aggrid-datasettable",
	"displayName": "Dataset Table",
	"version": 1,
	"icon" :"aggrid/groupingtable/ag-dataset.svg",
	"definition": "aggrid/datasettable/datasettable.js",
	"serverscript": "aggrid/datasettable/datasettable_server.js",
	"libraries": [
		{ "name": "datasettablegroupcellrenderer.js", "version": "1.0", "url": "aggrid/datasettable/datasettablegroupcellrenderer.js", "mimetype": "text/javascript" },
		{ "name": "datasettable.css", "version": "1.0", "url": "aggrid/datasettable/datasettable.css", "mimetype": "text/css" }
	],
	"model":
	{
		"data": { "type": "object[]", "tags": {"scope" : "private"}},
		"columns": { "type": "column[]", "droppable" : true, "tags": {}},
		"columnState": { "type": "string", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"responsiveHeight": { "type": "int", "default": 300 },
		"rowHeight" : {"type" : "int", "default": 25, "tags": {"scope": "design"}},
		"rowStyleClassFunc": { "type": "string"},
		"styleClass": { "type": "styleclass", "default" : "ag-bootstrap"},
		"visible": "visible",
		"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"enableSorting": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"pivotMode": { "type": "boolean", "default": false, "tags": {"scope": "design"}},
		"iconConfig": { "type": "iconConfig"},
		"groupStyleClass" : {"type": "styleclass"},
		"useLazyLoading": { "type": "boolean", "default": false, "tags": {"scope": "design"}},
		"lastRowIndex": { "type": "long", "tags": {"scope" : "private"}},
		"multiSelect": { "type": "boolean", "default": false, "tags": {"scope": "design"}},
		"headerHeight" : {"type" : "int", "default": 33, "tags": {"scope": "design"}},
		"toolPanelConfig": { "type": "toolPanelConfig", "tags": { "scope": "design" } }
		
	},
	"handlers" : {
		"onRowSelected": {
			"description": "Called when the mouse is clicked on a row/cell",
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
			"description": "Called when the mouse is clicked on a row/cell",
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
			"description": "Called when the columns state is changed",
			"parameters": [
				{
					"name": "columnState",
					"type": "string"
				}	
			]
		},
		"onLazyLoadingGetRows": {
			"description": "Called when lazy loading is used, and new rows are requested to display",
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
		}
	},
	"types" : {
		"column" : {
			"headerGroup": {"type" : "tagstring"},
			"headerGroupStyleClass" : {"type" : "styleclass"},
			"headerTitle": {"type" : "tagstring"},
			"headerStyleClass" : {"type" : "styleclass"},
			"dataprovider": { "type": "string"},
			"styleClass" : {"type" : "styleclass"},
			"visible":  { "type": "boolean", "default": true},
			"width":  { "type": "int", "default": 0 },
			"minWidth":  { "type": "int" },
			"maxWidth":  { "type": "int" },		
			"enableRowGroup" : {"type": "boolean", "default" : true},
			"rowGroupIndex":  {"type": "int", "default": -1},
			"enablePivot":  {"type": "boolean", "default": false},
			"pivotIndex":  {"type": "int", "default": -1},
			"aggFunc": {"type": "string", "values" : ["sum", "min", "max", "count", "avg", "first", "last"], "default": ""},
			"enableFilter": {"type": "boolean", "default" : false},
			"enableSort" : {"type": "boolean", "default" : true},
			"enableResize" : {"type": "boolean", "default" : true},
			"enableToolPanel" : {"type": "boolean", "default" : true},
			"autoResize" : {"type": "boolean", "default" : true},
			"cellStyleClassFunc": {"type": "string"},
			"cellRendererFunc": {"type": "string"},
			"format": {"type": "tagstring"},
			"formatType": {"type": "string", "values": ["TEXT", "NUMBER", "DATETIME"], "default": "TEXT"},
			"id": { "type": "string"}
		},
        "iconConfig" : {
			"iconMenu": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconFilter": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconColumns": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortAscending": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortDescending": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortUnSort": { "type": "styleclass", "tags": {"scope": "design"}},
			
			"iconGroupExpanded": { "type": "styleclass", "default" : "glyphicon glyphicon-minus ag-icon", "tags": {"scope": "design"}},
			"iconGroupContracted": { "type": "styleclass", "default" : "glyphicon glyphicon-plus ag-icon", "tags": {"scope": "design"}},
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
			"iconRefreshData": { "type": "styleclass", "default" : "glyphicon glyphicon-refresh", "tags": {"scope": "design"}}
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
		}
	}
}