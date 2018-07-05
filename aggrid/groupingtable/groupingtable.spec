{
	"name": "aggrid-groupingtable",
	"displayName": "Grouping Table",
	"version": 1,
	"icon" :"aggrid/groupingtable/ag-grouping.svg",
	"definition": "aggrid/groupingtable/groupingtable.js",
	"serverscript": "aggrid/groupingtable/groupingtable_server.js",
	"libraries": [
		{ "name": "groupingtable.css", "version": "1.0", "url": "aggrid/groupingtable/groupingtable.css", "mimetype": "text/css" },
		{ "name":"moment", "version":"2.11.1", "url": "aggrid/groupingtable/lib/bootstrap-datetimepicker/js/moment-with-locales.min.js", "mimetype":"text/javascript" },
		{ "name":"moment-jdateformatparser", "version":"0.1.1", "url":"aggrid/groupingtable/lib/bootstrap-datetimepicker/js/moment-jdateformatparser.js", "mimetype":"text/javascript" },
		{ "name":"bootstrap-datetimepicker", "version":"4.7.14", "url":"aggrid/groupingtable/lib/bootstrap-datetimepicker/js/bootstrap-datetimepicker.js", "mimetype":"text/javascript" },
		{ "name":"bootstrap-datetimepicker", "version":"4.7.14", "url":"aggrid/groupingtable/lib/bootstrap-datetimepicker/css/bootstrap-datetimepicker.css", "mimetype":"text/css" }
	],
	"model":
	{
		"myFoundset": {"type": "foundset", "default" : {"foundsetSelector":""}, "pushToServer" : "allow" ,"dynamicDataproviders": true, "initialPreferredViewPortSize": 50, "sendSelectionViewportInitially": true },
		"columns": { "type": "column[]", "droppable" : true, "pushToServer": "shallow"},
		"columnState": { "type": "string", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"responsiveHeight": { "type": "int", "default": 300 },
		"rowHeight" : {"type" : "int", "default": 25, "tags": {"scope": "design"}},
		"rowStyleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },
		"styleClass": { "type": "styleclass", "default" : "ag-bootstrap"},
			"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
			"enableColumnMove": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
			"enableSorting": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
			"groupUseEntireRow" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
        	"iconGroupExpanded": { "type": "styleclass", "default" : "glyphicon glyphicon-minus ag-icon", "tags": {"scope": "design"}},
			"iconGroupContracted": { "type": "styleclass", "default" : "glyphicon glyphicon-plus ag-icon", "tags": {"scope": "design"}},
			"iconSortAscending": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortDescending": { "type": "styleclass", "tags": {"scope": "design"}},		
			"iconSortUnSort": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconRefreshData": { "type": "styleclass", "default" : "glyphicon glyphicon-refresh", "tags": {"scope": "design"}},
		"tooltipTextRefreshData" : { "type": "tagstring", "default" : "Refresh for latest data !" },
		"visible": "visible",
		"hashedFoundsets": { "type": "hashedFoundset[]", "default": [], "tags": {"scope": "private"}, "pushToServer": "shallow"},
		"hashedColumns": {"type" : "string[]", "default": [], "tags": {"scope": "private"}},
		"showColumnsMenuTab": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
		"toolPanelConfig": { "type": "toolPanelConfig", "tags": { "scope": "design" } }
	},
	"handlers" : {
		"onCellClick": {
			"description": "Called when the mouse is clicked on a row/cell (foundset and column indexes are given)\nthe foundsetindex is always -1 when there are grouped rows\nthe record is not an actual JSRecord but an object having the dataprovider values of the clicked record",
			"parameters": [{
				"name": "foundsetindex",
				"type": "int"
			}, {
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "record",
				"type": "object",
				"optional": true
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}]
		},
		"onCellDoubleClick": {
			"description": "Called when the mouse is clicked on a row/cell (foundset and column indexes are given)\nthe foundsetindex is always -1 when there are grouped rows\nthe record is not an actual JSRecord but an object having the dataprovider values of the clicked record",
			"parameters": [{
				"name": "foundsetindex",
				"type": "int"
			}, {
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "record",
				"type": "object",
				"optional": true
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}]
		},
		"onCellRightClick": {
			"description": "Called when the right mouse button is clicked on a row/cell (foundset and column indexes are given)\nthe foundsetindex is always -1 when there are grouped rows\nthe record is not an actual JSRecord but an object having the dataprovider values of the clicked record",
			"parameters": [{
				"name": "foundsetindex",
				"type": "int"
			}, {
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "record",
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
		"onColumnDataChange": {
			"description": "Called when the columns data is changed",
			"returns": "boolean",
			"parameters": [{
				"name": "foundsetindex",
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
			}]
		}
	}, 
	"api" : {
		"notifyDataChange" : {
            "parameters" : []
        },
        "refreshData" : {
        	"parameters" : []
        },
		"getColumnState" : {
			"returns": "string"
		},
		"restoreColumnState" : {
			"parameters": [
				{ "name": "columnState", "type": "string", "optional": true}
			]
		},
		"getColumnsCount": {
	        "returns": "int"
	    },
	    "getColumn": {
		    "parameters": [{
				"name": "index",
				"type": "int"
			}],
	        "returns": "column"
	    },
	    "newColumn": {
		    "parameters": [{
		      	"name": "dataprovider",
				"type": "string"
		    	},{
				"name": "index",
				"type": "int",
				"optional": true
			}],
	        "returns": "column"
	    },
	    "removeColumn": {
		    "parameters": [{
				"name": "index",
				"type": "int"
			}],
	        "returns": "boolean"
	    },
	    "removeAllColumns": {
	        "returns": "boolean"
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
                }, {
                	"name" : "sort",
                	"type" : "string"
                },{
                	"name" : "hasRowStyleClassDataprovider",
                	"type" : "boolean",
                	"optional" : true
                }
            ]
        },
		"getFoundsetRecord" : {
            "returns" : "object",
            "parameters" :
            [{
                    "name" : "parentFoundset",
                    "type" : "foundsetRef"
                }, {
                    "name" : "parentRecordFinder",
                    "type" : "rowRef"
                }
            ]
        },
        "getRecordIndex" : {
            "returns" : "int",
            "parameters" :
            [{
                    "name" : "parentFoundset",
                    "type" : "foundsetRef"
                }, {
                    "name" : "parentRecordFinder",
                    "type" : "rowRef"
                }
            ]
        },
        "removeGroupedFoundsetUUID" : {
            "returns" : "boolean",
            "parameters" : [{
                    "name": "parentFoundset",
                    "type": "foundsetRef"
                }
            ]
        }
	},
	"types" : {
		"column" : {
			"headerTitle": {"type" : "tagstring"},
			"headerStyleClass" : {"type" : "styleclass"},
			"headerTooltip" : {"type" : "tagstring"},
			"dataprovider": { "type": "dataprovider", "forFoundset": "myFoundset", "resolveValuelist" : true},
			"styleClass" : {"type" : "styleclass"},
			"styleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset"},
			"format" : {"type" : "format",  "for": ["valuelist", "dataprovider"]},
			"valuelist": { "type": "valuelist", "for": "dataprovider", "forFoundset": "myFoundset" },
			"visible":  { "type": "boolean", "default": true},
			"width":  { "type": "int", "default": 0},			
			"minWidth":  { "type": "int"},
			"maxWidth":  { "type": "int"},
			"enableRowGroup" : {"type": "boolean", "default" : true},
			"enableSort" : {"type": "boolean", "default" : true},			
			"enableResize" : {"type": "boolean", "default" : true},
			"enableToolPanel" : {"type": "boolean", "default" : true},
			"autoResize" : {"type": "boolean", "default" : true},
			"rowGroupIndex":  {"type": "int", "default": -1},
			"editType": {"type": "string", "values": ["NONE", "TEXTFIELD", "DATEPICKER", "COMBOBOX", "TYPEAHEAD"], "default": "NONE"},
			"id": {"type" : "string"}
		},
		 "hashedFoundset" : {
            "foundset": "foundset",
            "foundsetUUID": "foundsetRef",
            "uuid" : "string"
        },
        "gridConfig" : {
        	"enableSorting" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
        	"enableColResize" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
        	"groupUseEntireRow" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}}
        },
        "iconConfig" : {
        	"iconGroupExpanded": { "type": "styleclass", "default" : "glyphicon glyphicon-minus ag-icon", "tags": {"scope": "design"}},
			"iconGroupContracted": { "type": "styleclass", "default" : "glyphicon glyphicon-plus ag-icon", "tags": {"scope": "design"}},
			"iconSortAscending": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconSortDescending": { "type": "styleclass", "tags": {"scope": "design"}},		
			"iconSortUnSort": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconRefreshData": { "type": "styleclass", "default" : "glyphicon glyphicon-refresh", "tags": {"scope": "design"}}
        },
		"toolPanelConfig" : {
			"suppressRowGroups": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressSideButtons": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressColumnFilter": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressColumnSelectAll": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
			"suppressColumnExpandAll": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}}
		}
	}
}