{
	"name": "aggrid-groupingtable",
	"displayName": "Grouping Table",
	"version": 1,
	"definition": "aggrid/groupingtable/groupingtable.js",
	"serverscript": "aggrid/groupingtable/groupingtable_server.js",
	"libraries": [
		{
			"name": "ag-grid.js",
			"version": "1",
			"url": "aggrid/groupingtable/lib/dist/ag-grid.js",
			"mimetype": "text/javascript"
		},
		{
			"name": "ag-grid-enterprise.js",
			"version": "1",
			"url": "aggrid/groupingtable/lib/dist/ag-grid-enterprise.js",
			"mimetype": "text/javascript"
		},
		{
			"name": "ag-grid.css",
			"version": "1",
			"url": "aggrid/groupingtable/lib/dist/styles/ag-grid.css",
			"mimetype": "text/css"
		}],
	"model":
	{
		"myFoundset": {"type": "foundset", "dynamicDataproviders": true, "initialPreferredViewPortSize": 50, "sendSelectionViewportInitially": true },
		"columns": 		{ "type": "column[]", "droppable" : true },
		"hashedFoundsets": { "type": "hashedFoundset[]", "default": [], "tags": {"scope": "private"}},
		"hashedColumns": {"type" : "string[]", "default": [], "tags": {"scope": "private"}},
		"visible": "visible"
	},
	"handlers" : {
	
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
			],
			"returns" : "dataset"
		}
	}, 
	"api" : {
		"getGroupedChildFoundsetUUID" : {
            "returns" : "foundsetRef",
            "parameters" :
            [{
                    "name" : "parentFoundset",
                    "type" : "foundsetRef"
                }, {
                    "name" : "parentRecordFinder",
                    "type" : "rowRef"
                }, {
                    "name": "parentLevelGroupColumnIndex",
                    "type": "int"
                }, {
                    "name": "newLevelGroupColumnIndex",
                    "type": "int"
                }, {
                	"name" : "idForFoundsets",
                	"type" : "string[]"
                }
            ]
        },
        "getLeafChildFoundsetUUID" : {
            "returns" : "foundsetRef",
            "parameters" :
            [{
                    "name" : "parentFoundset",
                    "type" : "foundsetRef"
                }, {
                    "name" : "parentRecordFinder",
                    "type" : "rowRef"
                }, {
                    "name": "parentLevelGroupColumnIndex",
                    "type": "int"
                }, {
                	"name" : "idForFoundsets",
                	"type" : "string[]"
                }
            ]
        }
	},
	"types" : {
		"column" : {
			"dataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },
			"headerTitle": {"type" : "tagstring"},
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