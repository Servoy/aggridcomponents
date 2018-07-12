angular.module('aggridDatasettable', ['servoy', 'aggridenterpriselicensekey']).directive('aggridDatasettable', ['$sabloConstants', '$log', '$q', '$filter', '$formatterUtils', '$injector', '$services',
function($sabloConstants, $log, $q, $filter, $formatterUtils, $injector, $services) {
    return {
        restrict: 'E',
        scope: {
            model: '=svyModel',
            handlers: '=svyHandlers',
            api: '=svyApi',
            svyServoyapi: '='
        },
        controller: function($scope, $element, $attrs) {

            var gridDiv = $element.find('.ag-table')[0];
            var columnDefs = getColumnDefs();

            // if aggrid service is present read its defaults
            var toolPanelConfig = null;
            var iconConfig = null;
            if($injector.has('datasettableDefaultConfig')) {
                var datasettableDefaultConfig = $services.getServiceScope('datasettableDefaultConfig').model;
                if(datasettableDefaultConfig.toolPanelConfig) {
                    toolPanelConfig = datasettableDefaultConfig.toolPanelConfig;
                }
                if(datasettableDefaultConfig.iconConfig) {
                    iconConfig = datasettableDefaultConfig.iconConfig;
                }
            }

            var config = $scope.model;

            if(config.toolPanelConfig) {
                toolPanelConfig = config.toolPanelConfig;
            }
            if(config.iconConfig) {
                iconConfig = config.iconConfig;
            }

            // AG grid definition
            var gridOptions = {
                
                debug: false,
                rowGroupPanelShow: 'always', // TODO expose property

                defaultColDef: {
                    width: 0,
//                    suppressFilter: true,
//                    valueFormatter: displayValueFormatter,
                    menuTabs: ['generalMenuTab', 'filterMenuTab'],
			        headerCheckboxSelection: false, //$scope.model.multiSelect === true ? isFirstColumn : false,	// FIXME triggers a long loop of onRowSelection event when a new selection is made.
			        checkboxSelection: $scope.model.multiSelect === true ? isFirstColumn : false
                },
                columnDefs: columnDefs,
                getMainMenuItems: getMainMenuItems,

                rowHeight: $scope.model.rowHeight,
                // TODO enable it ?					rowClass: $scope.model.rowStyleClass,	// add the class to each row

                headerHeight: $scope.model.headerHeight, // exposed property
				
                suppressContextMenu: false,
                suppressMovableColumns: false, // TODO persist column order changes
                enableColResize: config.enableColumnResize,
                suppressAutoSize: true,
                autoSizePadding: 25,
                suppressFieldDotNotation: true,

                suppressMovingInCss: true,
                suppressColumnMoveAnimation: true,
                suppressAnimationFrame: true,
				
                toolPanelSuppressRowGroups: toolPanelConfig ? toolPanelConfig.suppressRowGroups : false,
                toolPanelSuppressValues: toolPanelConfig ? toolPanelConfig.suppressValues : false,
                toolPanelSuppressPivots: toolPanelConfig ? toolPanelConfig.suppressPivots : false,
                toolPanelSuppressPivotMode: toolPanelConfig ? toolPanelConfig.suppressPivotMode : false,
                toolPanelSuppressSideButtons: toolPanelConfig ? toolPanelConfig.suppressSideButtons : false,
                toolPanelSuppressColumnFilter: toolPanelConfig ? toolPanelConfig.suppressColumnFilter : false,
                toolPanelSuppressColumnSelectAll: toolPanelConfig ? toolPanelConfig.suppressColumnSelectAll : false,
                toolPanelSuppressColumnExpandAll: toolPanelConfig ? toolPanelConfig.suppressColumnExpandAll : false,

                rowSelection: $scope.model.multiSelect === true ? 'multiple' : 'single',
                rowDeselection: false,
//                suppressRowClickSelection: rowGroupColsDefault.length === 0 ? false : true,
                suppressCellSelection: true, // TODO implement focus lost/gained
                enableRangeSelection: false,

                // stopEditingWhenGridLosesFocus: true,
                // singleClickEdit: true,
                // suppressClickEdit: false,
                // enableGroupEdit: false,
                // groupUseEntireRow: false,
                // groupMultiAutoColumn: true,

                pivotMode: $scope.model.pivotMode,

                animateRows: false,
                enableCellExpressions: true,

                onGridReady: function() {
                    $log.debug("gridReady");
                    // without timeout the column don't fit automatically
                    setTimeout(function() {
                        sizeColumnsToFit();
                    }, 150);
                },
                getContextMenuItems: getContextMenuItems,
                enableSorting: config.enableSorting,
                autoGroupColumnDef: {
                    cellRenderer: DatasetTableGroupCellRenderer,
                    cellRendererParams : { suppressCount: false},
                    headerName: ' ',
                    cellClass: $scope.model.groupStyleClass
                },
                enableFilter: true,
				onGridSizeChanged: function() {
					sizeColumnsToFit();
				},
				onDisplayedColumnsChanged: function() {
					sizeColumnsToFit();
					storeColumnsState();
				},
                onColumnEverythingChanged: storeColumnsState,	// do we need that ?, when is it actually triggered ?
                onSortChanged: storeColumnsState,
//                onFilterChanged: storeColumnsState,			 disable filter sets for now
//                onColumnVisible: storeColumnsState,			 covered by onDisplayedColumnsChanged
//                onColumnPinned: storeColumnsState,			 covered by onDisplayedColumnsChanged
                onColumnResized: storeColumnsState				// NOT covered by onDisplayedColumnsChanged
//                onColumnRowGroupChanged: storeColumnsState,	 covered by onDisplayedColumnsChanged
//                onColumnValueChanged: storeColumnsState,
//                onColumnMoved: storeColumnsState,              covered by onDisplayedColumnsChanged
//                onColumnGroupOpened: storeColumnsState		 i don't think we need that, it doesn't include the open group in column state
            };

            if($scope.model.useLazyLoading) {
                gridOptions.rowModelType = 'enterprise';
            }
            else {
                gridOptions.rowModelType = 'inMemory';
                gridOptions.rowData = $scope.model.data;
            }

            if($scope.model.rowStyleClassFunc) {
                var rowStyleClassFunc = eval($scope.model.rowStyleClassFunc);
                gridOptions.getRowClass = function(params) {
                    return rowStyleClassFunc(params.rowIndex, params.data, params.event);
                };
            }

            // set the icons
            if(iconConfig) {
                var icons = new Object();
                
                for (var iconName in iconConfig) {
                	if (iconName == "iconRefreshData") continue;
                	
                	var aggridIcon = iconName.slice(4);
                	aggridIcon = aggridIcon[0].toLowerCase() + aggridIcon.slice(1);
                	icons[aggridIcon] = getIconElement(iconConfig[iconName]);
                }
                
                // TODO expose property
//                icons.rowGroupPanel = " "
//                icons.pivotPanel = " "
//                icons.valuePanel = " "
                
                gridOptions.icons = icons
            }

            setHeight();

            // init the grid. If is in designer render a mocked grid
            if ($scope.svyServoyapi.isInDesigner()) {
                
                var designGridOptions = {
                    rowModelType: 'inMemory',
                    columnDefs: columnDefs,
                    rowHeight: $scope.model.rowHeight,
                    rowData: []
                };

                // init the grid
                new agGrid.Grid(gridDiv, designGridOptions);
                return;
            } else {
                // init the grid
                new agGrid.Grid(gridDiv, gridOptions);
            }

			// register listener for selection changed
			gridOptions.api.addEventListener('rowSelected', onRowSelected);
			gridOptions.api.addEventListener('selectionChanged', onSelectionChanged);
            gridOptions.api.addEventListener('cellClicked', onCellClicked);
            gridOptions.api.addEventListener('displayedColumnsChanged', function() {
                sizeColumnsToFit();
            });


            if(!$scope.svyServoyapi.isInDesigner() && $scope.model.useLazyLoading) {

                function RemoteDatasource() {
                }

                RemoteDatasource.prototype.getRows = function(params) {
                    $scope.model.data = [];
                    $scope.model.lastRowIndex = null;
                    if($scope.handlers.onLazyLoadingGetRows) {
                        var request = params.request;
                        var filterModels = [];
                        for(var id in request.filterModel) {
                            filterModels.push({id: id, operator: request.filterModel[id].type, value: request.filterModel[id].filter })
                        }

                        var getRowsPromise = $scope.handlers.onLazyLoadingGetRows(
                            request.startRow,
                            request.endRow,
                            request.rowGroupCols,
                            request.valueCols,
                            request.pivotCols,
                            request.pivotMode,
                            request.groupKeys,
                            filterModels,
                            request.sortModel);
                        getRowsPromise.then(function() {
                            params.successCallback($scope.model.data, $scope.model.lastRowIndex);
                        });
                    }
                    else {
                        params.successCallback($scope.model.data, $scope.model.lastRowIndex);
                    }
                };

                gridOptions.api.setEnterpriseDatasource(new RemoteDatasource());
            }
            else {
                $scope.$watchCollection("model.data", function(newValue, oldValue) {
                    if(gridOptions) {
                        gridOptions.api.setRowData($scope.model.data);
                    }
                });
            }

            $scope.$watchCollection("model.columns", function(newValue, oldValue) {
                if(gridOptions) {
                    var columnDefs = getColumnDefs();
                    gridOptions.api.setColumnDefs(columnDefs);
                    restoreColumnsState();
                }
            });
            

            function getColumnDefs() {
                
                //create the column definitions from the specified columns in designer
                var colDefs = [];
                var colDef = { };
                var colGroups = { };
                var column;
                for (var i = 0; $scope.model.columns && i < $scope.model.columns.length; i++) {
                    column = $scope.model.columns[i];

                    //create a column definition based on the properties defined at design time
                    colDef = {
                        headerName: "" + (column["headerTitle"] ? column["headerTitle"] : "") + "",
                        field: column["dataprovider"]
                    };

                    // set id if defined
                    if(column.id) {
                        colDef.colId = column.id;
                    }

                    // styleClass
                    colDef.headerClass = 'ag-table-header ' + column.headerStyleClass;
                    colDef.cellClass = 'ag-table-cell ' + column.styleClass;


                    // column grouping & pivoting
                    colDef.enableRowGroup = column.enableRowGroup;
                    if (column.rowGroupIndex >= 0) colDef.rowGroupIndex = column.rowGroupIndex;

                    colDef.enablePivot = column.enablePivot;
                    if (column.pivotIndex >= 0) colDef.pivotIndex = column.pivotIndex;

                    if(column.aggFunc) colDef.aggFunc = column.aggFunc;
                    
                    // tool panel
                    if (column.enableToolPanel === false) colDef.suppressToolPanel = !column.enableToolPanel;

                    // column sizing
                    if (column.width || column.width === 0) colDef.width = column.width;
                    if (column.maxWidth) colDef.maxWidth = column.maxWidth;
                    if (column.minWidth || column.minWidth === 0) colDef.minWidth = column.minWidth;

                    // column resizing https://www.ag-grid.com/javascript-grid-resizing/
        			if (column.enableResize === false) colDef.suppressResize = !column.enableResize;
        			if (column.autoResize === false) colDef.suppressSizeToFit = !column.autoResize;
                    
        			// sorting
        			if (column.enableSort === false) colDef.suppressSorting = !column.enableSort;
        			
        			// visibility
                    if (column.visible === false) colDef.hide = true;
                    
                    if (column.format) {
                        colDef.valueFormatter = createValueFormatter(column.format, column.formatType);
                    }

                    if(column.cellStyleClassFunc) {
                        colDef.cellClass = createColumnCallbackFunctionFromString(column.cellStyleClassFunc);
                    }

                    if(column.cellRendererFunc) {
                        colDef.cellRenderer = createColumnCallbackFunctionFromString(column.cellRendererFunc);
                    }                    

                    if(column.enableFilter) {
                        colDef.filter = 'text';
                        colDef.filterParams = {newRowsAction: 'keep'};
                    }
                    else {
                        colDef.suppressFilter = true;
                    }

                    if(column.headerGroup) {
                        if(!colGroups[column.headerGroup]) {
                            colGroups[column.headerGroup] = {}
                            colGroups[column.headerGroup]['headerClass'] = column.headerGroupStyleClass;
                            colGroups[column.headerGroup]['children'] = [];

                        }
                        colGroups[column.headerGroup]['children'].push(colDef);
                    }
                    else {
                        colDefs.push(colDef);
                    }
                }

                for(var groupName in colGroups) {
                    var group = {};
                    group.headerName = groupName;
                    group.headerClass = colGroups[groupName]['headerClass']; 
                    group.children = colGroups[groupName]['children'];
                    colDefs.push(group);
                }

                return colDefs;
            }

            function isResponsive() {
                return !$scope.$parent.absoluteLayout;
            }
            
            function isFirstColumn(params) {
                var displayedColumns = params.columnApi.getAllDisplayedColumns();
                var thisIsFirstColumn = displayedColumns[0] === params.column;
                return thisIsFirstColumn;
            }


            function setHeight() {
                if (isResponsive()) {
                    gridDiv.style.height = $scope.model.responsiveHeight + 'px';
                }
            }

            function sizeColumnsToFit() {
                gridOptions.api.sizeColumnsToFit();
            }

            function getIconElement(iconStyleClass) {
                return '<i class="' + iconStyleClass + '"/>';
            }

            function getMainMenuItems(params) {
                // default items
                //					pinSubMenu: Submenu for pinning. Always shown.
                //					valueAggSubMenu: Submenu for value aggregation. Always shown.
                //					autoSizeThis: Auto-size the current column. Always shown.
                //					autoSizeAll: Auto-size all columns. Always shown.
                //					rowGroup: Group by this column. Only shown if column is not grouped.
                //					rowUnGroup: Un-group by this column. Only shown if column is grouped.
                //					resetColumns: Reset column details. Always shown.
                //					expandAll: Expand all groups. Only shown if grouping by at least one column.
                //					contractAll: Contract all groups. Only shown if grouping by at least one column.
                //					toolPanel: Show the tool panel.
                var menuItems = [];
                var items = ['rowGroup', 'rowUnGroup', 'toolPanel']; // TODO enable here the menu options
                params.defaultItems.forEach(function(item) {
                    if (items.indexOf(item) > -1) {
                        menuItems.push(item);
                    }
                });
                return menuItems;
            }

            function getContextMenuItems(params) {
                // hide any context menu
                return [];
            }

            function createColumnCallbackFunctionFromString(functionAsString) {
                var f = eval(functionAsString);
                return function(params) {
                    return f(params.rowIndex, params.data, params.colDef.colId != undefined ? params.colDef.colId : params.colDef.field, params.value, params.event);
                };                
            }

            function createValueFormatter(format, formatType) {
                return function(params) {
                    if(params.value != undefined) {
                        if(formatType == 'TEXT') {
                            if(format == '|U') {
                                return params.value.toUpperCase();
                            } else if(format == '|L') {
                                return params.value.toLowerCase();
                            }
                        }
                        return $formatterUtils.format(params.value,format,formatType);
                    }
                    return '';
                }
            }

            Object.defineProperty($scope.model, $sabloConstants.modelChangeNotifier, {
                configurable: true,
                value: function(property, value) {
                    switch (property) {
                        case "responsiveHeight":
                            setHeight();
                            break;
                    }
                }
            });
            
				/**
				 * Grid Event
				 * @private
				 *
				 * */
				function onRowSelected(event) {
					var node = event.node;
					
					if ($scope.handlers.onRowSelected && node && node.data) {
						// var selectIndex = node.rowIndex + 1; Selected index doesn't make sense for a dataset since the grid may change the dataset internally
						$scope.handlers.onRowSelected(node.data, node.selected, createJSEvent());
					}
				}
				
				function getDatasetIndex(rowData) {
					// TODO it make sense to return the rowData Index ?
					// If is a dataset is enought the row Data
				}

            
        	/**
			 * Grid Event
			 * @private
			 *
			 * */
			function onSelectionChanged(event) {
				// TODO i don't think i need that
				return;
			}

            function onCellClicked(params) {
            	  if ($scope.handlers.onCellClick && params.data && params.colDef.field) {
                    $scope.handlers.onCellClick(params.data, params.colDef.colId != undefined ? params.colDef.colId : params.colDef.field, params.value, params.event);
                }
            }
            
			/**
			 * Create a JSEvent
			 *
			 * @return {JSEvent}
			 * */
			function createJSEvent() {
				var element = $element;
				var offset = element.offset();
				var x = offset.left;
				var y = offset.top;

				var event = document.createEvent("MouseEvents");
				event.initMouseEvent("click", false, true, window, 1, x, y, x, y, false, false, false, false, 0, null);
				return event;
			}

            function storeColumnsState() {
                var columnState = {
                    columnState: gridOptions.columnApi.getColumnState(),
                    rowGroupColumnsState: gridOptions.columnApi.getColumnGroupState(),
                    isToolPanelShowing: gridOptions.api.isToolPanelShowing(),
					// filterState: gridOptions.api.getFilterModel(), TODO persist column states
					sortingState: gridOptions.api.getSortModel()
                }
                var newColumnState = JSON.stringify(columnState);
                
                if (newColumnState !== $scope.model.columnState) {
	                $scope.model.columnState = newColumnState;
	                $scope.svyServoyapi.apply('columnState');
	                if ($scope.handlers.onColumnStateChanged) {
	                    $scope.handlers.onColumnStateChanged($scope.model.columnState);
	                }
                }
            }

            function restoreColumnsState() {
                if($scope.model.columnState) {
                    var columnState = JSON.parse($scope.model.columnState);
                    gridOptions.columnApi.setColumnState(columnState.columnState);
                    gridOptions.columnApi.setColumnGroupState(columnState.rowGroupColumnsState);
                    gridOptions.api.showToolPanel(columnState.isToolPanelShowing);
                    gridOptions.api.setFilterModel(columnState.filterState);
                    gridOptions.api.setSortModel(columnState.sortingState);
                }
            }

            $scope.showEditorHint = function() {
                return (!$scope.model.columns || $scope.model.columns.length == 0) && $scope.svyServoyapi.isInDesigner();
            }

            /**
             * Export data to excel format (xlsx)
             * 
             * @param {String} fileName 
             * @param {Boolean} skipHeader 
             * @param {Boolean} columnGroups 
             * @param {Boolean} skipFooters 
             * @param {Boolean} skipGroups 
             * @param {Boolean} asCSV 
             */
            $scope.api.exportData = function(fileName, skipHeader, columnGroups, skipFooters, skipGroups, asCSV) {
                // set defaults
                if(fileName == undefined) {
                    fileName = 'export.xlsx';
                }
                if(skipHeader == undefined) {
                    skipHeader = false;
                }
                if(columnGroups == undefined) {
                    columnGroups = true;
                }
                if(skipFooters == undefined) {
                    skipFooters = false;
                }
                if(skipGroups == undefined) {
                    skipGroups = false;
                }
                if(asCSV == undefined) {
                    asCSV = false;
                }

                var params = {
                    fileName: fileName,
                    skipHeader: skipHeader,
                    columnGroups: columnGroups,
                    skipFooters: skipFooters,
                    skipGroups: skipGroups
                };
                if(asCSV) {
                    gridOptions.api.exportDataAsCsv(params);
                }
                else {
                    gridOptions.api.exportDataAsExcel(params);
                }
            }

            /**
             * Restore columns state to a previously save one, using getColumnState.
             * If no argument is used, it restores the columns to designe time state.
             * 
             * @param {String} columnState
             */            
            $scope.api.restoreColumnState = function(columnState) {
                if(columnState) {
                    $scope.model.columnState = columnState;
                    restoreColumnsState();
                }
                else {
                    gridOptions.columnApi.resetColumnState();
                }
            }
            
            /**
             * Gets selected rows data
             * 
             * @return {Array<String>}
             */
            $scope.api.getSelectedRows = function() {
				var selectedNodes = gridOptions.api.getSelectedNodes();
				// TODO return the selected Nodes as JSON;
				var result = [];
				for (var i = 0; i < selectedNodes.length; i++) {
					var selectedNode = selectedNodes[i].data;
					result.push(selectedNode);
					//result.push({rowIndex:  selectedNodes[i].rowIndex, rowData: selectedNodes[i].data})
				}
				return result;
            }
        },
        templateUrl: 'aggrid/datasettable/datasettable.html'
    };
}]).run(['$aggridenterpriselicensekey', function($aggridenterpriselicensekey) {
$aggridenterpriselicensekey.setLicenseKey();
}]);