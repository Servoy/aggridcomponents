{
	"name": "aggrid-datasettable",
	"displayName": "Dataset Table",
	"version": 1,
	"icon" :"aggrid/groupingtable/ag-dataset.svg",
	"definition": "aggrid/datasettable/datasettable.js",
	"serverscript": "aggrid/datasettable/datasettable_server.js",
	"libraries": [{ "name": "datasettable.css", "version": "1.0", "url": "aggrid/datasettable/datasettable.css", "mimetype": "text/css" }],
	"model":
	{
		"data": { "type": "object[]", "tags": {"scope" : "private"}},
		"columns": { "type": "column[]", "droppable" : true, "tags": {"scope": "design"}},
		"responsiveHeight": { "type": "int", "default": 300 },
		"rowHeight" : {"type" : "int", "default": 25, "tags": {"scope": "design"}},
		"rowStyleClassFunc": { "type": "string"},
		"styleClass": { "type": "styleclass", "default" : "ag-bootstrap"},
		"visible": "visible",
		"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"enableSorting": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"pivotMode": { "type": "boolean", "default": false, "tags": {"scope": "design"}},
		"iconConfig": { "type": "iconConfig"},
		"groupStyleClass" : {"type": "styleclass"}
	},
	"handlers" : {
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
		}
	},
	"types" : {
		"column" : {
			"headerGroup": {"type" : "tagstring"},
			"headerGroupStyleClass" : {"type" : "styleclass"},
			"headerTitle": {"type" : "tagstring"},
			"headerStyleClass" : {"type" : "styleclass"},
			"id": { "type": "string"},
			"styleClass" : {"type" : "styleclass"},
			"visible":  { "type": "boolean", "default": true},
			"width":  { "type": "int", "default": 0 },			
			"enableRowGroup" : {"type": "boolean", "default" : true},
			"rowGroupIndex":  {"type": "int", "default": -1},
			"enablePivot":  {"type": "boolean", "default": false},
			"pivotIndex":  {"type": "int", "default": -1},
			"aggFunc": {"type": "string", "values" : ["sum", "min", "max", "count", "avg", "first", "last"], "default": ""},
			"enableFilter": {"type": "boolean", "default" : false},
			"cellStyleClassFunc": {"type": "string"},
			"cellRendererFunc": {"type": "string"}

		},
        "iconConfig" : {
        	"iconGroupExpanded": { "type": "styleclass", "default" : "glyphicon glyphicon-minus ag-icon", "tags": {"scope": "design"}},
			"iconGroupContracted": { "type": "styleclass", "default" : "glyphicon glyphicon-plus ag-icon", "tags": {"scope": "design"}},
			"iconSortAscending": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortDescending": { "type": "styleclass", "tags": {"scope": "design"}},		
			"iconSortUnSort": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconRefreshData": { "type": "styleclass", "default" : "glyphicon glyphicon-refresh", "tags": {"scope": "design"}}
        }
	}
}