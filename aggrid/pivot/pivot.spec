{
	"name": "aggrid-pivot",
	"displayName": "Pivot Grid",
	"version": 1,
	"definition": "aggrid/pivot/pivot.js",
	"serverscript": "aggrid/pivot/pivot_server.js",
	"libraries": [],
	"model":
	{
		"config": 		{ "type": "string", "pushToServer": "allow", "tags": { "scope": "private" } },
		"myFoundset": {"type": "foundset", "dynamicDataproviders": true, "initialPreferredViewPortSize": 200, "sendSelectionViewportInitially": true },
		"columns": 		{ "type": "column[]", "droppable" : true },
		"hashedFoundsets": { "type": "hashedFoundset[]", "default": [], "tags": {"scope": "private"}},
		"hashedColumns": {"type" : "string[]", "default": [], "tags": {"scope": "private"}},
		"pivotTotals" : {"type" : "boolean", "default" : false},
		"visible": "visible"
	},
	"api":
	{
		"pivot": {
			"parameters": [
				{ "name": "dataset", "type": {"type": "dataset", "includeColumnNames": "true" } },	
				{ "name": "rowColumnNames", "type": "string[]" },	
				{ "name": "columnColumnNames", "type": "string[]" },	
				{ "name": "valueColumnNames", "type": "string[]" },	
				{ "name": "aggregatorName", "type": "string", "optional": true },
				{ "name": "aggregatorArgs", "type": "object", "optional": true }
			]
		},
		"pivotUI": {
			"parameters": [
				{ "name": "dataset", "type": {"type": "dataset", "includeColumnNames": "true" } },	
				{ "name": "rowColumnNames", "type": "string[]" },	
				{ "name": "columnColumnNames", "type": "string[]" },	
				{ "name": "valueColumnNames", "type": "string[]" },	
				{ "name": "aggregatorNames", "type": "string[]", "optional": true }, 
				{ "name": "aggregatorName", "type": "string", "optional": true },
				{ "name": "aggregatorArgs", "type": "object", "optional": true }
			]
		},
		"getConfig": {
			"parameters": [
			]
		},
		"setConfig": {
			"parameters": [
				{ "name": "config", "type": "object" }
			]
		},
		"render": {
			"parameters": [
			]
		},
		"getExclusions": {
			"parameters": [
			]
		},
		"setExclusions": {
			"parameters": [
				{ "name": "exclusions", "type": "object" }
			]
		},
		"getInclusions": {
			"parameters": [
			]
		},
		"setInclusions": {
			"parameters": [
				{ "name": "inclusions", "type": "object" }
			]
		},
		"getAggregator": {
			"parameters": [
			]
		},
		"getRows": {
			"parameters": [
			]
		},
		"getColumns": {
			"parameters": [
			]
		},
		"getValues": {
			"parameters": [
			]
		},
		"setRows": {
			"parameters": [
				{ "name": "rows", "type": "string[]" }
			]
		},
		"setColumns": {
			"parameters": [
				{ "name": "columns", "type": "string[]" }
			]
		},
		"setValues": {
			"parameters": [
				{ "name": "values", "type": "string[]" }
			]
		},
		"setAggregator": {
			"parameters": [
				{ "name": "aggregator", "type": "string" },
				{ "name": "args", "type": "object", "optional": true }
			]
		}
	},
	"handlers":
	{
		"onCellClicked": {
			"parameters": [
				{ "name": "event", "type": "JSEvent" },
				{ "name": "value", "type": "number" },
				{ "name": "filters", "type": "object" },
				{ "name": "records", "type": "object[]" }
			]
		},
		"onCellDoubleClicked": {
			"parameters": [
				{ "name": "event", "type": "JSEvent" },
				{ "name": "value", "type": "number" },
				{ "name": "filters", "type": "object" },
				{ "name": "records", "type": "object[]" }
			]
		},
		"onRightClick": {
			"parameters": [
				{ "name": "event", "type": "JSEvent" },
				{ "name": "value", "type": "number" },
				{ "name": "filters", "type": "object" },
				{ "name": "records", "type": "object[]" }
			]
		}
	},
	"types" : {
		"column" : {
			"dataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },
			"headerTitle": {"type" : "tagstring"},
			"pivot" : {"type" : "boolean", "default" : false},
			"enablePivot" : {"type" : "boolean", "default" : false},
			"rowGroup" : {"type" : "boolean", "default" : false},
			"enableRowGroup" : {"type" : "boolean", "default" : false},
			"enableValue" : {"type" : "boolean", "default" : false},
			"aggFunc"  : {"type" : "string", "values": [{"SUM": "sum"}]},
			"styleClass" : {"type" : "styleclass"},
			"format" : "format",
			"visible":  { "type": "boolean", "default": true },
			"onActionMethodID" : "function"
		},
		 "hashedFoundset" : {
            "foundset": "foundset",
            "foundsetUUID": "foundsetRef"
        }  
	}
}