{
	"name": "aggrid-groupingtable",
	"displayName": "Data Grid",
	"categoryName": "Grids",
	"version": 1,
	"icon" :"aggrid/groupingtable/ag-grouping.png",
	"definition": "aggrid/groupingtable/groupingtable.js",
	"serverscript": "aggrid/groupingtable/groupingtable_server.js",
	"doc": "aggrid/groupingtable/groupingtable_doc.js",
	"libraries": [
		{ "name": "groupingtable.css", "version": "1.0", "url": "aggrid/groupingtable/groupingtable.css", "mimetype": "text/css" }
	],
    "ng2Config": {
        "dependencies": {
           "csslibrary": ["~@servoy/tempus-dominus/dist/css/tempus-dominus.css;priority=5"]
        }
    },
	"model":
	{
		"myFoundset": {"type": "foundset", "default" : {"foundsetSelector":""}, "pushToServer" : "allow" , "foundsetDefinitionListener": true,"initialPreferredViewPortSize": 50, "sendSelectionViewportInitially": true, "tags": {"allowaccess": "enabled", "doc": "The foundset where data are fetched from"} },
		"columns": { "type": "column[]", "droppable" : true, "pushToServer": "shallow", "tags": {"wizard": "autoshow", "allowaccess": "enabled", "doc": "List all columns to be used in table as dataprovider"}},
		"columnState": { "type": "string", "tags": {"scope" : "private", "allowaccess": "enabled"}, "pushToServer": "allow"},
		"columnStateOnError": { "type": "function", "tags": {"scope" : "private", "allowaccess": "enabled"}},
		"_internalAutoSizeState": { "type": "boolean", "tags": {"scope" : "private", "allowaccess": "enabled"}, "pushToServer": "allow"},
		"_internalColumnState": { "type": "string", "tags": {"scope" : "private", "allowaccess": "enabled"}, "pushToServer": "allow"},
		"_internalExpandedState": { "type": "object", "tags": {"scope" : "private", "allowaccess": "enabled"}, "pushToServer": "allow"},
		"restoreStates": { "type": "map", "tags": {"scope" : "private"}},
		"responsiveHeight": { "type": "int", "default": 300, "tags": {"doc": "Table's height to be set in a responsive form. When responsiveHeight is set to 0, the table will use 100% height of the parent container"} },
		"rowHeight" : {"type" : "int", "default": 25, "tags": {"scope": "design", "doc": "The height in pixels of the table's rows"}},
		"rowStyleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset", "tags": {"doc": "Use dataSource calculation as rowStyleClassDataprovider to set styleClass conditionally to rows. The calculation should return the class name (or names) to be applied to the row"} },
		"styleClass": { "type": "styleclass", "default" : "ag-theme-bootstrap" },
		"enableColumnResize": { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Allow the user to resize columns"}},
		"enableColumnMove": { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "If moving of columns is enabled"}},
		"enableSorting": { "type": "boolean", "default": true, "tags": {"scope": "design", "doc": "Enable column sorting by clickin on the column's header"}},
		"groupUseEntireRow" : {"type": "boolean", "default" : true, "tags" : {"scope": "design", "doc": "When true the group takes the entire row"}},
		"tooltipTextRefreshData" : { "type": "tagstring", "default" : "Refresh for latest data !", "tags": {"doc": "Tooltip text shown when hovering the refresh button"}},
		"visible": "visible",
		"hashedFoundsets": { "type": "hashedFoundset[]", "default": [], "tags": {"scope": "private", "allowaccess": "enabled"}, "pushToServer": "shallow"},
		"hashedColumns": {"type" : "string[]", "default": [], "tags": {"scope": "private"}},
		"showColumnsMenuTab": {"type": "boolean", "default" : false, "tags" : {"scope": "design", "doc": "If the column selection panel should be shown in the column menu"}},
		"toolPanelConfig": { "type": "toolPanelConfig", "tags": { "scope": "design" } },
		"iconConfig": { "type": "iconConfig", "tags": { "scope": "design" } },
		"gridOptions": {"type": "map", "tags": {"doc": "Map where additional grid properties of ag-grid can be set"}},
		"localeText": {"type": "map", "tags": {"doc": "Map where locales of ag-grid can be set"}},
		"readOnly": {"type": "boolean", "default": false},
		"enabled" : {"type": "enabled", "blockingOn": false, "default": true},
		"readOnlyColumnIds": {"type": "object", "tags": {"scope" : "private"} },
		"mainMenuItemsConfig": { "type": "mainMenuItemsConfig", "tags": { "scope": "design" } },
		"_internalFormEditorValue": { "type": "object", "tags": {"scope" : "private"}, "pushToServer": "allow"},
		"arrowsUpDownMoveWhenEditing": {"type": "string", "values": [{"DEFAULT": null}, {"NONE":"NONE"}, {"NEXTCELL":"NEXTCELL"}, {"NEXTEDITABLECELL":"NEXTEDITABLECELL"}], "tags": {"doc": "Defines action on TEXTFIELD editor for up/down arrow keys"}},
		"columnsAutoSizing": {"type": "string", "default" : null, "values": [{"SIZE_COLUMNS_TO_FIT":null}, {"AUTO_SIZE":"AUTO_SIZE"}, {"NONE":"NONE"}], "tags": {"doc": "Auto sizing for columns. SIZE_COLUMNS_TO_FIT: make the currently visible columns fit the screen. AUTO_SIZE: the grid will work out the best width to fit the contents of the 'visible' cells in the column. NONE: no auto sizing action performed"}},
		"showGroupCount" : {"type": "boolean", "default" : false, "tags" : {"scope": "design", "doc": "When true the number of rows for groups is shown, beside the name"}},
		"showLoadingIndicator":  { "type": "boolean", "default": true },
		"editNextCellOnEnter":  { "type": "boolean", "default": false },
		"tabSeq": { "type": "tabseq", "tags": { "scope": "design" } }
	},
	"handlers" : {
    	"onSelectedRowsChanged": {
			"doc": "Called when the selected rows have changed.",
			"parameters": []
		},
		"onCellClick": {
			"doc": "Called when the mouse is clicked on a row/cell (foundset and column indexes are given)\nthe foundsetindex is always -1 when there are grouped rows",
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
		"onCellDoubleClick": {
			"doc": "Called when the mouse is clicked on a row/cell (foundset and column indexes are given)\nthe foundsetindex is always -1 when there are grouped rows",
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
			"doc": "Called when the right mouse button is clicked on a row/cell (foundset and column indexes are given)\nthe foundsetindex is always -1 when there are grouped rows",
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
		"onFooterClick": {
			"doc": "Called when the mouse is clicked on a footer cell",
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
			"doc": "Called when the columns state is changed",
			"parameters": [
				{
					"name": "columnState",
					"type": "string"
				}	
			],
			"allowaccess": "enabled"
		},
		"onColumnDataChange": {
			"doc": "Called when the columns data is changed",
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
			}, {
				"name": "record",
				"type": "record",
				"optional": true
			}],
			"returns": {"type": "boolean", "default": true},
			"ignoreNGBlockDuplicateEvents": true
		},
		"onReady": {
			"doc": "Called when the table is ready to be shown",
			"allowaccess": "enabled"
		},
		"onColumnFormEditStarted": {
			"doc": "Called when the column's form editor is started",
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
			"doc": "Called when sort has changed",
			"parameters": [{
				"name": "columnindexes",
				"type": "int[]",
				"optional": true
			}, {
				"name": "sorts",
				"type": "string[]",
				"optional": true
			}],
			"allowaccess": "enabled"
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
			}],
			"allowaccess": "enabled"
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
		"autoSizeAllColumns" : {
			"parameters": [
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
	    "getColumnIndex" : {
			"parameters": [{
				"name": "colId",
				"type": "string"
			}],
			"returns": "int"
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
		},
		"getExpandedGroups": {
			"returns": "object"
		},
		"setExpandedGroups": {
			"parameters": [
				{ "name": "groups", "type": "object"}
			]
		},
		"showToolPanel": {
			"parameters": [
				{ "name": "show", "type": "boolean"}
			]
		},
		"isToolPanelShowing": {
			"returns": "boolean"
		},
		"moveColumn" : {
			"parameters": [
				{ "name": "id", "type": "string" },
				{ "name": "index", "type": "int"}
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
            ],
			"allowaccess" : "enabled"
        },
        "removeGroupedFoundsetUUID" : {
            "returns" : "boolean",
            "parameters" : [{
                    "name": "parentFoundset",
                    "type": "foundsetRef"
                }
            ],
			"allowaccess" : "enabled,visible"
        },
		"filterMyFoundset" : {
            "parameters" : [{
					"name": "sFilterModel",
					"type": "string"
				}
            ],
			"allowaccess" : "enabled,visible"
		},
		"internalGetColumnIndex" : {
			"parameters": [{
				"name": "colId",
				"type": "string"
			}],
			"returns": "int"
		}
	},
	"types" : {
		"column" : {
			"footerText" : {"type" : "tagstring"},
			"headerTitle": {"type" : "titlestring", "for": "dataprovider", "tags": { "wizard": "i18n", "useAsCaptionInDeveloper" : true, "captionPriority" : 1, "showInOutlineView": true }},
			"footerStyleClass" : {"type" : "styleclass"},
			"headerStyleClass" : {"type" : "styleclass"},
			"headerTooltip" : {"type" : "tagstring"},
			"headerGroup": {"type" : "tagstring", "tags": {"doc": "Header group, that this column will be part of"}},
			"headerGroupStyleClass" : {"type" : "styleclass"},
			"dataprovider": { "type": "dataprovider", "forFoundset": "myFoundset", "resolveValuelist" : true, "pushToServer" : "allow", "tags": { "wizard": "1", "useAsCaptionInDeveloper" : true, "captionPriority" : 2 }},
			"tooltip": { "type": "dataprovider", "forFoundset": "myFoundset"},
			"styleClass" : {"type" : "styleclass","tags": {"wizard": [{"name": "Pencil icon", "cls": "fa fa-pencil"}, {"name": "Trash icon", "cls": "fa fa-trash"}, {"name": "Eye icon", "cls": "fa fa-eye"}, {"name": "Gear icon", "cls": "fa fa-gear"}] } },
			"styleClassDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset", "tags": {"wizard": "2", "doc": "Use a Servoy calculation as styleClassDataprovider to set styleClass conditionally to the table cell"}},
			"format" : {"type" : "format",  "for": ["valuelist", "dataprovider"]},
			"valuelist": { "type": "valuelist", "for": "dataprovider", "forFoundset": "myFoundset"},
			"visible":  { "type": "boolean", "default": true},
			"width":  { "type": "int", "default": 0},			
			"minWidth":  { "type": "int"},
			"maxWidth":  { "type": "int"},
			"enableRowGroup" : {"type": "boolean", "default" : true, "tags": {"doc": "Allow the user to group or ungroup the column"}},
			"enableSort" : {"type": "boolean", "default" : true},			
			"enableResize" : {"type": "boolean", "default" : true},
			"enableToolPanel" : {"type": "boolean", "default" : true, "tags": {"doc" : "If the column should be visible in the tool panel"}},
			"autoResize" : {"type": "boolean", "default" : true},
			"rowGroupIndex":  {"type": "int", "default": -1, "tags": {"doc": "Set the rowGroupIndex to group on the column; the index defines the order of the group when there are multiple grouped columns"}},
			"isEditableDataprovider": { "type": "dataprovider", "forFoundset": "myFoundset", "tags": {"doc": "Use a Servoy calculation as isEditableDataprovider to set edit state conditionally to the table cell"}},
			"editType": {"type": "string", "values": [{"NONE":null}, {"TEXTFIELD":"TEXTFIELD"}, {"DATEPICKER":"DATEPICKER"}, {"COMBOBOX":"COMBOBOX"}, {"TYPEAHEAD":"TYPEAHEAD"}, {"FORM":"FORM"}, {"CHECKBOX":"CHECKBOX"}], "tags": {"doc": "Type of editing used for that column"}},
			"editForm": {"type": "form", "tags": {"doc": "Form used as custom editor"}},
			"editFormSize": {"type": "dimension", "default" : {"width":300, "height":200}},
			"stopEditingOnChange" : {"type": "boolean", "default" : false},
			"filterType": {"type": "string", "values": [{"NONE":null}, {"TEXT":"TEXT"}, {"NUMBER":"NUMBER"}, {"DATE":"DATE"}, {"VALUELIST":"VALUELIST"}, {"RADIO":"RADIO"}]},
			"id": {"type" : "string", "tags": {"wizard": {"prefill" : "dataprovider"}, "showInOutlineView": true, "doc": "Used to set the column id (colId) property in the serialized column state json string of getColumnState and onColumnStateChanged" }},
			"columnDef": {"type" : "map", "tags": {"doc": "Map where additional column properties of ag-grid can be set"}},
			"showAs": { "type": "string", "values": [{"text":null}, {"html":"html"}, {"sanitizedHtml":"sanitizedHtml"}] }
		},
		"groupedColumn" : {
            "dataprovider": { "type": "dataprovider", "forFoundset": "foundset", "resolveValuelist": true, "pushToServer" : "allow"},
            "format" : { "type": "format",  "for": [ "valuelist", "dataprovider" ]},
			"valuelist": { "type": "valuelist", "for": "dataprovider", "forFoundset": "foundset" },
			"id": {"type" : "string"},
			"styleClassDataprovider": { "type": "dataprovider", "forFoundset": "foundset" }
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
			
			"iconRefreshData": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconEditorChecked": { "type": "styleclass", "tags": {"scope": "design"}},
			"iconEditorUnchecked": { "type": "styleclass", "tags": {"scope": "design"}}
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