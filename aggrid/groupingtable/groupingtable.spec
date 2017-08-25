{
	"name": "aggrid-groupingtable",
	"displayName": "Grouping Table",
	"version": 1,
	"definition": "aggrid/groupingtable/groupingtable.js",
	"serverscript": "aggrid/groupingtable/groupingtable_server.js",
	"libraries": [
		],
	"model":
	{
		"myFoundset": {"type": "foundset", "dynamicDataproviders": true, "initialPreferredViewPortSize": 15, "sendSelectionViewportInitially": true },
		"columns": { "type": "column[]", "droppable" : true, "pushToServer": "shallow" },
		"rowHeight" : 	{"type" : "int", "default": 25, "tags": {"scope": "design"} },
		"rowStyleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset", "tags": {"scope": "design"} },
		"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design"} },
		"enableSort": { "type": "boolean", "default": true, "tags": {"scope": "design"} },
		"styleClass": { "type": "styleclass" },
		"iconGroupExpanded": { "type": "styleclass", "default" : "glyphicon glyphicon-minus ag-icon"},
		"iconGroupContracted": { "type": "styleclass", "default" : "glyphicon glyphicon-plus ag-icon"},
		"iconSortAscending": { "type": "styleclass"},
		"iconSortDescending": { "type": "styleclass"},		
		"iconSortUnSort": { "type": "styleclass"},
		"tooltipTextRefreshData" : { "type": "tagstring", "default" : "Refresh for latest data !" },
		"visible": "visible",
		"hashedFoundsets": { "type": "hashedFoundset[]", "default": [], "tags": {"scope": "private"}, "pushToServer": "shallow"},
		"hashedColumns": {"type" : "string[]", "default": [], "tags": {"scope": "private"}}
	},
	"handlers" : {
	
		"onRecordSelected": {
			"description": "Called when a record is selected; to be used when the grid isn't bound to the form's foundset",
			"parameters": [{
				"name": "index",
				"type": "int"
			}, {
				"name": "record",
				"type": "record",
				"optional": true
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}]
		},
		"onCellClick": {
			"description": "Called when the mouse is clicked on a row/cell (foundset and column indexes are given) or\nwhen the ENTER key is used then only the selected foundset index is given\nUse the record to exactly match where the user clicked on",
			"parameters": [{
				"name": "foundsetindex",
				"type": "int"
			}, {
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "record",
				"type": "record",
				"optional": true
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}]
		},
		"onCellRightClick": {
			"description": "Called when the right mouse button is clicked on a row/cell (foundset and column indexes are given) or\nwhen the ENTER key is used then only the selected foundset index is given\nUse the record to exactly match where the user clicked on",
			"parameters": [{
				"name": "foundsetindex",
				"type": "int"
			}, {
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "record",
				"type": "record",
				"optional": true
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}]
		}
	}, 
	"internalApi" : {
		"getGroupedFoundsetUUID" : {
            "returns" : "foundsetRef",
            "parameters" :
            [{
                    "name": "groupColumns",
                    "type": "int[]"
                }, {
                    "name": "groupKeys",
                    "type": "object[]"
                }, {
                	"name" : "idForFoundsets",
                	"type" : "string[]"
                }
            ]
        },
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
                    "type" : "object"
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
			"headerTitle": {"type" : "tagstring", "tags" : {"scope": "design"}},
			"headerStyleClass" : {"type" : "styleclass"},
			"dataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },
			"styleClass" : {"type" : "styleclass"},
			"styleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },
			"format" : {"type" : "format",  "for": ["valuelist", "dataprovider"], "tags" : {"scope": "design"}},
			"valuelist": { "type": "valuelist", "for": "dataprovider", "tags" : {"scope": "design"} },
			"visible":  { "type": "boolean", "default": true, "tags" : {"scope": "design"} },
			"width":  { "type": "int", "default": 0, "tags" : {"scope": "design"} },			
			"enableRowGroup" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
			"rowGroupIndex":  {"type": "int", "default": null, "tags" : {"scope": "design"}}
		},
		 "hashedFoundset" : {
            "foundset": "foundset",
            "foundsetUUID": "foundsetRef",
            "query" : "object"
        }  
	}
}