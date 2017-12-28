angular.module('aggridDatasettable', ['servoy', 'aggridenterpriselicensekey']).directive('aggridDatasettable', ['$sabloConstants', '$log', '$q', '$filter',
function($sabloConstants, $log, $q, $filter) {
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

            var config = $scope.model;

            // AG grid definition
            var gridOptions = {
                
                debug: false,
                rowModelType: 'inMemory',
                rowData: $scope.model.data,
                rowGroupPanelShow: 'onlyWhenGrouping', // TODO expose property

                defaultColDef: {
                    width: 0,
//                    suppressFilter: true,
//                    valueFormatter: displayValueFormatter,
                    menuTabs: ['generalMenuTab', 'filterMenuTab']
                },
                columnDefs: columnDefs,
                getMainMenuItems: getMainMenuItems,

                rowHeight: $scope.model.rowHeight,
                // TODO enable it ?					rowClass: $scope.model.rowStyleClass,	// add the class to each row

                suppressContextMenu: false,
                suppressMovableColumns: true, // TODO persist column order changes
                enableColResize: config.enableColumnResize,
                suppressAutoSize: true,
                autoSizePadding: 25,
                suppressFieldDotNotation: true,

                suppressMovingInCss: true,
                suppressColumnMoveAnimation: true,
                suppressAnimationFrame: true,

                rowSelection: 'single',
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
                onGridSizeChanged: function() {
                    sizeColumnsToFit();
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
                onColumnEverythingChanged: storeColumnsState,
                onColumnVisible: storeColumnsState,
                onColumnPinned: storeColumnsState,
                onColumnResized: storeColumnsState,
                onColumnRowGroupChanged: storeColumnsState,
                onColumnValueChanged: storeColumnsState,
                onColumnMoved: storeColumnsState,
                onColumnGroupOpened: storeColumnsState
            };

            if($scope.model.rowStyleClassFunc) {
                var rowStyleClassFunc = eval($scope.model.rowStyleClassFunc);
                gridOptions.getRowClass = function(params) {
                    return rowStyleClassFunc(params.rowIndex, params.data, params.event);
                };
            }

            // set the icons
            var iconConfig = $scope.model.iconConfig;
            if(iconConfig) {
                var icons = new Object();
                if (iconConfig.iconGroupExpanded) icons.groupExpanded = getIconElement(iconConfig.iconGroupExpanded);
                if (iconConfig.iconGroupContracted) icons.groupContracted = getIconElement(iconConfig.iconGroupContracted);
                if (iconConfig.iconSortAscending) icons.sortAscending = getIconElement(iconConfig.iconSortAscending);
                if (iconConfig.iconSortDescending) icons.sortDescending = getIconElement(iconConfig.iconSortDescending);
                if (iconConfig.iconSortUnSort) icons.sortUnSort = getIconElement(iconConfig.iconSortUnSort);
                if (iconConfig.iconRowGroupPanel) icons.rowGroupPanel = getIconElement(iconConfig.iconRowGroupPanel);
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

            gridOptions.api.addEventListener('cellClicked', onCellClicked);
            gridOptions.api.addEventListener('displayedColumnsChanged', function() {
                sizeColumnsToFit();
            });


            $scope.$watchCollection("model.columns", function(newValue, oldValue) {
                if(gridOptions) {
                    var columnDefs = getColumnDefs();
                    gridOptions.api.setColumnDefs(columnDefs);
                    restoreColumnsState();
                }
            });

            $scope.$watchCollection("model.data", function(newValue, oldValue) {
                if(gridOptions) {
                    gridOptions.api.setRowData($scope.model.data);
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
                        field: column["id"]
                    };

                    // styleClass
                    colDef.headerClass = 'ag-table-header ' + column.headerStyleClass;
                    colDef.cellClass = 'ag-table-cell ' + column.styleClass;


                    colDef.enableRowGroup = column.enableRowGroup;
                    if (column.rowGroupIndex >= 0) colDef.rowGroupIndex = column.rowGroupIndex;

                    colDef.enablePivot = column.enablePivot;
                    if (column.pivotIndex >= 0) colDef.pivotIndex = column.pivotIndex;

                    if(column.aggFunc) colDef.aggFunc = column.aggFunc;

                    if (column.width || column.width === 0) colDef.width = column.width;
                    // TODO add minWidth and maxWidth to column.spec
                    if (column.maxWidth) colDef.maxWidth = column.maxWidth;
                    if (column.minWidth || column.minWidth === 0) colDef.minWidth = column.minWidth;
                    if (column.visible === false) colDef.hide = true;

                    if(column.cellStyleClassFunc) {
                        colDef.cellClass = createColumnCallbackFunctionFromString(column.cellStyleClassFunc);
                    }

                    if(column.cellRendererFunc) {
                        colDef.cellRenderer = createColumnCallbackFunctionFromString(column.cellRendererFunc);
                    }                    

                    if(column.enableFilter) {
                        colDef.filter = 'text';
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

            function getRowData() {
                if($scope.model.data) {
                    var data = [$scope.model.data.length]
                    for(var i = 1; i < $scope.model.data.length; i++) {
                        var rowData = {};
                        for(var j = 0; j < $scope.model.data[i].length; j++) {
                            rowData[$scope.model.data[0][j]] = $scope.model.data[i][j];
                        }
                        data.push(rowData);
                    }
                    return data;
                }
                else {
                    return [];
                }                
            }

            function isResponsive() {
                return !$scope.$parent.absoluteLayout;
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
                var items = ['rowGroup', 'rowUnGroup', 'toolPanel'];
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
                    return f(params.rowIndex, params.data, params.colDef.field, params.value, params.event);
                };                
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

            function onCellClicked(params) {
                if ($scope.handlers.onCellClick && params.data && params.colDef.field) {
                    $scope.handlers.onCellClick(params.data, params.colDef.field, params.value, params.event);
                }
            }

            function storeColumnsState() {
                var columnState = {
                    columnState: gridOptions.columnApi.getColumnState(),
                    columnGroupState: gridOptions.columnApi.getColumnGroupState(),
                    isToolPanelShowing: gridOptions.api.isToolPanelShowing()
                }
                $scope.model.columnState = JSON.stringify(columnState);
                $scope.svyServoyapi.apply('columnState');
                if ($scope.handlers.onColumnStateChanged) {
                    $scope.handlers.onColumnStateChanged($scope.model.columnState);
                }
            }

            function restoreColumnsState() {
                if($scope.model.columnState) {
                    var columnState = JSON.parse($scope.model.columnState);
                    gridOptions.columnApi.setColumnState(columnState.columnState);
                    gridOptions.columnApi.setColumnGroupState(columnState.columnGroupState);
                    gridOptions.api.showToolPanel(columnState.isToolPanelShowing);
                }
            }

            $scope.showEditorHint = function() {
                return (!$scope.model.columns || $scope.model.columns.length == 0) && $scope.svyServoyapi.isInDesigner();
            }

            $scope.api.exportData = function(fileName, skipHeader, columnGroups, skipFooters, skipGroups, asCSV) {
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

            $scope.api.restoreColumnState = function(columnState) {
                if(columnState) {
                    $scope.model.columnState = columnState;
                    restoreColumnsState();
                }
                else {
                    gridOptions.columnApi.resetColumnState();
                }
            }
        },
        templateUrl: 'aggrid/datasettable/datasettable.html'
    };
}]).run(['$aggridenterpriselicensekey', function($aggridenterpriselicensekey) {
$aggridenterpriselicensekey.setLicenseKey();
}]);