{
	"name": "uigridfilter-uigrid-Dataset",
	"displayName": "uigridDataset",
	"version": 1,
	"definition": "uigridfilter/uigridDataset/uigridDataset.js",
	"libraries": [
		{
			"name": "angular-touch.js",
			"version": "1",
			"url": "http://ajax.googleapis.com/ajax/libs/angularjs/1.5.8/angular-touch.js",
			"mimetype": "text/javascript"
		},
		{
			"name": "angular-animate.js",
			"version": "1",
			"url": "http://ajax.googleapis.com/ajax/libs/angularjs/1.5.8/angular-animate.js",
			"mimetype": "text/javascript"
		},
		{
			"name": "main.css",
			"version": "1",
			"url": "uigridfilter/uigridDataset/uigridDataset.css",
			"mimetype": "text/css"
		}
	],	"model":
	{
		"dataset": 		{ "type": "dataset", "includeColumnNames": true },
		"config": 		{ "type": "object", "pushToServer" : "allow" },
		"columns": 		{ "type": "column[]", "droppable" : true}
	},
	"handlers": 
	{
		"onRowSelected": {
			"description": "Called when a row is selected",
			"parameters": [{
				"name": "index",
				"type": "int"
			}, {
				"name": "row",
				"type": "object",
				"optional": true
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}]
		},
		"onGroupChanged" : {
			"parameters": 
			[
				{
					"name": "columnIndex",
					"type": "int"
				},
				{
					"name": "groupIndex",
					"type": "int"
				},
				{
					"name": "isGrouped",
					"type": "boolean"
				}
			]
		},
		"onNodeExpanded" : {
			"parameters": 
			[
				{
					"name": "columnIndex",
					"type": "int"
				},
				{
					"name": "value",
					"type": "string"
				}
			]
		}
	},
	"api":
	{
		"init": {
			"parameters": [
				{ "name": "dataset", "type": {"type": "dataset", "includeColumnNames": "true" } },	
				{ "name": "rowColumnNames", "type": "string[]" },	
				{ "name": "columnColumnNames", "type": "string[]" },	
				{ "name": "valueColumnNames", "type": "string[]" }
			]
		},
		"setSelectedIndex" : {
			"parameters": 
			[
				{
					"name": "index",
					"type": "int"
				},
				{
					"name": "mustExecuteOnSelect",
					"type": "boolean",
					"optional": true
				}
			]
		},
		"getGrouping" : {
			"parameters": [],
			"returns" : "string"
		},
		"groupColumn" : {
			"parameters": 
			[
				{
					"name": "index",
					"type": "int"
				}
			]
		},
		"ungroupColumn" : {
			"parameters": 
			[
				{
					"name": "index",
					"type": "int"
				}
			]
		},
		"clearGrouping" : {
			"parameters": []
		}
	},
	"types" : {
		"column" : {
			"headerTitle": {"type" : "tagstring"},
			"styleClass" : {"type" : "styleclass"},
			"format" : "format",
			"visible":  { "type": "boolean", "default": true },
			"onActionMethodID" : "function"
		}
	}
}