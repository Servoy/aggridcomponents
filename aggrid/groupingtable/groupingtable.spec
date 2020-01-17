{
	"name": "aggrid-groupingtable",
	"displayName": "Data Grid",
	"version": 1,
	"icon" :"aggrid/groupingtable/ag-grouping.png",
	"definition": "aggrid/groupingtable/groupingtable.js",
	"serverscript": "aggrid/groupingtable/groupingtable_server.js",
	"libraries": [
		{ "name": "groupingtable.css", "version": "1.0", "url": "aggrid/groupingtable/groupingtable.css", "mimetype": "text/css" },
		{ "name":"moment", "version":"2.19.1", "url": "aggrid/groupingtable/lib/bootstrap-datetimepicker/js/moment-with-locales.min.js", "mimetype":"text/javascript" },
		{ "name":"moment-jdateformatparser", "version":"0.1.1", "url":"aggrid/groupingtable/lib/bootstrap-datetimepicker/js/moment-jdateformatparser.js", "mimetype":"text/javascript" },
		{ "name":"bootstrap-datetimepicker", "version":"4.7.47", "url":"aggrid/groupingtable/lib/bootstrap-datetimepicker/js/bootstrap-datetimepicker.js", "mimetype":"text/javascript" },
		{ "name":"bootstrap-datetimepicker", "version":"4.7.47", "url":"aggrid/groupingtable/lib/bootstrap-datetimepicker/css/bootstrap-datetimepicker.css", "mimetype":"text/css" }
	],
	"model":
	{
		"myFoundset": {"type": "foundset", "default" : {"foundsetSelector":""}, "pushToServer" : "allow" ,"initialPreferredViewPortSize": 50, "sendSelectionViewportInitially": true },
		"columns": { "type": "column[]", "droppable" : true, "pushToServer": "shallow"},
		"columnState": { "type": "string", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"columnStateOnError": { "type": "function", "tags": {"scope" : "private"}},
		"_internalColumnState": { "type": "string", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"restoreStates": { "type": "map", "tags": {"scope" : "private"}},
		"responsiveHeight": { "type": "int", "default": 300 },
		"rowHeight" : {"type" : "int", "default": 25, "tags": {"scope": "design"}},
		"rowStyleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset" },
		"styleClass": { "type": "styleclass", "default" : "ag-theme-bootstrap"},
		"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"enableColumnMove": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"enableSorting": { "type": "boolean", "default": true, "tags": {"scope": "design"}},
		"groupUseEntireRow" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
		"tooltipTextRefreshData" : { "type": "tagstring", "default" : "Refresh for latest data !" },
		"visible": "visible",
		"hashedFoundsets": { "type": "hashedFoundset[]", "default": [], "tags": {"scope": "private"}, "pushToServer": "shallow"},
		"hashedColumns": {"type" : "string[]", "default": [], "tags": {"scope": "private"}},
		"showColumnsMenuTab": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
		"toolPanelConfig": { "type": "toolPanelConfig", "tags": { "scope": "design" } },
		"iconConfig": { "type": "iconConfig", "tags": { "scope": "design" } },
		"gridOptions": {"type": "map"},
		"localeText": {"type": "map"},
		"filterModel": {"type": "string", "tags": {"scope": "private"}},
		"readOnly": {"type": "boolean", "default": false, "tags": {"scope" : "private"}},
		"readOnlyColumnIds": {"type": "object", "tags": {"scope" : "private"} },
		"mainMenuItemsConfig": { "type": "mainMenuItemsConfig", "tags": { "scope": "design" } },
		"_internalFormEditorValue": { "type": "object", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"arrowsUpDownMoveWhenEditing": {"type": "string", "values": [{"DEFAULT": null}, {"NONE":"NONE"}, {"NEXTCELL":"NEXTCELL"}, {"NEXTEDITABLECELL":"NEXTEDITABLECELL"}]}
	},
	"handlers" : {
    	"onSelectedRowsChanged": {
			"description": "Called when the selected rows have changed.",
			"parameters": []
		},
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
		"onFooterClick": {
			"description": "Called when the mouse is clicked on a footer cell",
			"parameters": [{
				"name": "columnindex",
				"type": "int",
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
			}, {
				"name": "event",
				"type": "JSEvent",
				"optional": true
			}],
			"returns": "boolean"
		},
		"onReady": {
			"description": "Called when the table is ready to be shown"
		},
		"onColumnFormEditStarted": {
			"description": "Called when the column's form editor is started",
			"parameters": [{
				"name": "foundsetindex",
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
		"onSort": {
			"description": "Called when sort has changed",
			"parameters": [{
				"name": "columnindex",
				"type": "int",
				"optional": true
			}, {
				"name": "sort",
				"type": "string",
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
				{ "name": "columnState", "type": "string", "optional": true},
				{ "name": "onError", "type": "function", "optional": true},
				{ "name": "columns", "type": "boolean", "optional": true},
				{ "name": "filter", "type": "boolean", "optional": true},
				{ "name": "sort", "type": "boolean", "optional": true}
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
	    },
		"getGroupedSelection": {
			"returns": "record[]"
		},
		"editCellAt": {
			"parameters": [{
				"name": "foundsetindex",
				"type": "int"
			}, {
				"name": "columnindex",
				"type": "int"
			}]
		},
		"requestFocus" : {
			"parameters": [{
				"name": "columnindex",
				"type": "int"
			}],
			"delayUntilFormLoads": true,
			"discardPreviouslyQueuedSimilarCalls": true
		},
		"scrollToSelection": {},
		"setReadOnly": {
			"parameters": [
				{ "name": "readonly", "type": "boolean"},
				{ "name": "columnids", "type": "string[]", "optional": true}
			]
		},
		"setFormEditorValue": {
			"parameters": [
				{ "name": "value", "type": "object"}
			]
		},
		"stopCellEditing": {
			"parameters": [
				{ "name": "cancel", "type": "boolean", "optional": true}
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
                	"name" : "sFilterModel",
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
        },
		"filterMyFoundset" : {
            "parameters" : [{
					"name": "sFilterModel",
					"type": "string"
				}
            ]
		}
	},
	"types" : {
		"column" : {
			"footerText" : {"type" : "tagstring"},
			"headerTitle": {"type" : "titlestring", "for": "dataprovider"},
			"footerStyleClass" : {"type" : "styleclass"},
			"headerStyleClass" : {"type" : "styleclass"},
			"headerTooltip" : {"type" : "tagstring"},
			"dataprovider": { "type": "dataprovider", "forFoundset": "myFoundset", "resolveValuelist" : true},
			"tooltip": { "type": "dataprovider", "forFoundset": "myFoundset"},
			"styleClass" : {"type" : "styleclass"},
			"styleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset"},
			"format" : {"type" : "format",  "for": ["valuelist", "dataprovider"]},
			"valuelist": { "type": "valuelist", "for": "dataprovider", "forFoundset": "myFoundset"},
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
			"isEditableDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset"},
			"editType": {"type": "string", "values": [{"NONE":null}, {"TEXTFIELD":"TEXTFIELD"}, {"DATEPICKER":"DATEPICKER"}, {"COMBOBOX":"COMBOBOX"}, {"TYPEAHEAD":"TYPEAHEAD"}, {"FORM":"FORM"}]},
			"editForm": {"type": "form"},
			"filterType": {"type": "string", "values": [{"NONE":null}, {"TEXT":"TEXT"}, {"NUMBER":"NUMBER"}, {"DATE":"DATE"}]},
			"id": {"type" : "string", "tags": {"showInOutlineView": true }},
			"columnDef": {"type" : "map"},
			"showAs": { "type": "string", "values": [{"text":null}, {"html":"html"}, {"sanitizedHtml":"sanitizedHtml"}] }
		},
		"groupedColumn" : {
            "dataprovider": { "type": "dataprovider", "forFoundset": "foundset", "resolveValuelist": true },
            "format" : { "type": "format",  "for": [ "valuelist", "dataprovider" ]},
			"valuelist": { "type": "valuelist", "for": "dataprovider", "forFoundset": "foundset" },
			"id": {"type" : "string"}
        },
		 "hashedFoundset" : {
            "foundset": "foundset",
            "foundsetUUID": "foundsetRef",
            "uuid" : "string",
			"columns": { "type": "groupedColumn[]" }
        },
        "gridConfig" : {
        	"enableSorting" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
        	"enableColResize" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}},
        	"groupUseEntireRow" : {"type": "boolean", "default" : true, "tags" : {"scope": "design"}}
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
		"toolPanelConfig" : {
			"suppressRowGroups": {"type": "boolean", "default" : false, "tags" : {"scope": "design"}},
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