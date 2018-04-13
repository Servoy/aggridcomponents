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
		"columns": { "type": "column[]", "droppable" : true, "pushToServer": "shallow", "tags": {"scope": "design"}},
		"columnState": { "type": "string", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"responsiveHeight": { "type": "int", "default": 300 },
		"rowHeight" : {"type" : "int", "default": 25, "tags": {"scope": "design"}},
		"rowStyleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },
		"styleClass": { "type": "styleclass", "default" : "ag-bootstrap"},
			"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
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
		"showColumnsMenuTab": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}}
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
			"headerTitle": {"type" : "tagstring", "tags" : {"scope": "design"}},
			"headerStyleClass" : {"type" : "styleclass"},
			"dataprovider": { "type": "dataprovider", "forFoundset": "myFoundset", "resolveValuelist" : true },
			"styleClass" : {"type" : "styleclass"},
			"styleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },
			"format" : {"type" : "format",  "for": ["valuelist", "dataprovider"], "tags" : {"scope": "design"}},
			"valuelist": { "type": "valuelist", "for": "dataprovider"},
			"visible":  { "type": "boolean", "default": true, "tags" : {"scope": "design"} },
			"width":  { "type": "int", "default": 0, "tags" : {"scope": "design"} },			
			"enableRowGroup" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
			"enableSort" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
			"rowGroupIndex":  {"type": "int", "default": -1, "tags" : {"scope": "design"}},
			"editType": {"type": "string", "values": ["NONE", "TEXTFIELD", "DATEPICKER", "COMBOBOX", "TYPEAHEAD"], "default": "NONE"}
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
        }
	}
}