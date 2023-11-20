angular.module('aggridDatasettable', ['servoy']).directive('aggridDatasettable', ['$sabloApplication', '$sabloConstants', '$log', '$formatterUtils', '$injector', '$services', '$sanitize', '$applicationService', '$windowService', '$filter', '$compile',
function($sabloApplication, $sabloConstants, $log, $formatterUtils, $injector, $services, $sanitize, $applicationService, $windowService, $filter, $compile) {
    return {
        restrict: 'E',
        scope: {
            model: '=svyModel',
            handlers: '=svyHandlers',
            api: '=svyApi',
            svyServoyapi: '='
        },
        controller: function($scope, $element, $attrs) {

            function initGrid() {

                var GRID_EVENT_TYPES = {
                    GRID_READY: 'gridReady',
                    DISPLAYED_COLUMNS_CHANGED : 'displayedColumnsChanged',
                    GRID_COLUMNS_CHANGED: 'gridColumnsChanged'
                }

                var gridDiv = $element.find('.ag-table')[0];
                var hasAutoHeightColumn = false;
                var columnDefs = getColumnDefs();

                // position of cell with invalid data as reported by the return of onColumnDataChange
                var invalidCellDataIndex = { rowIndex: -1, colKey: ''};
                var onColumnDataChangePromise = null;

                // if aggrid service is present read its defaults
                var toolPanelConfig = null;
                var iconConfig = null;
                var userGridOptions = null;
                var localeText = null;
                var mainMenuItemsConfig = null;
                if($injector.has('ngPowerGrid')) {
                    var datasettableDefaultConfig = $services.getServiceScope('ngPowerGrid').model;
                    if(datasettableDefaultConfig.toolPanelConfig) {
                        toolPanelConfig = datasettableDefaultConfig.toolPanelConfig;
                    }
                    if(datasettableDefaultConfig.iconConfig) {
                        iconConfig = datasettableDefaultConfig.iconConfig;
                    }
                    if(datasettableDefaultConfig.gridOptions) {
                        userGridOptions = datasettableDefaultConfig.gridOptions;
                    }                
                    if(datasettableDefaultConfig.localeText) {
                        localeText = datasettableDefaultConfig.localeText;
                    }
                    if(datasettableDefaultConfig.mainMenuItemsConfig) {
                        mainMenuItemsConfig = datasettableDefaultConfig.mainMenuItemsConfig;
                    }                
                }

                var config = $scope.model;

                $scope.$watchCollection("model.iconConfig", function(newValue, oldValue) {
                    $log.debug('iconConfig changed');
                    if(newValue && newValue != oldValue) {
                        if($injector.has('ngPowerGrid')) {
                            var datasettableDefaultConfig = $services.getServiceScope('ngPowerGrid').model;
                            if(datasettableDefaultConfig.iconConfig) {
                                iconConfig = datasettableDefaultConfig.iconConfig;
                            }
                        }
                        iconConfig = mergeConfig(iconConfig, newValue);
                        initializeIconConfig(iconConfig);
                    }
                });
                
                // set the icons
                function initializeIconConfig(iconConfig){
                    if(iconConfig) {
                        var icons = new Object();
                        
                        for (var iconName in iconConfig) {
                            if (iconName == "iconRefreshData") continue;
                        
                            var aggridIcon = iconName.slice(4);
                            aggridIcon = aggridIcon[0].toLowerCase() + aggridIcon.slice(1);
                            icons[aggridIcon] = getIconElement(iconConfig[iconName]);
                        }
                    
                        // TODO expose property
                        // icons.rowGroupPanel = " "
                        // icons.pivotPanel = " "
                        // icons.valuePanel = " "
                        gridOptions.icons = icons
                    }
                }
                        
                function mergeConfig(target, source) {
                    // clone target to avoid side effects
                    var mergeConfig = {};
                    for (property in target) {
                        mergeConfig[property] = target[property];
                    }
                    
                    if(source) {
                        if(mergeConfig) {
                            for (property in source) {
                                if (source.hasOwnProperty(property)) {
                                    mergeConfig[property] = source[property];
                                }
                            }
                        } else {
                            mergeConfig = source;
                        }
                    }
                    return mergeConfig;
                }

                function getAggCustomFuncs() {
                    var aggFuncs = {};
                    for(var i = 0; i < $scope.model._internalAggCustomFuncs.length; i++) {
                        aggFuncs[$scope.model._internalAggCustomFuncs[i]['name']] = createAggCustomFunctionFromString($scope.model._internalAggCustomFuncs[i]['aggFunc']);
                    }
                    return aggFuncs;
                }

                // defaults
                var TABLE_PROPERTIES_DEFAULTS = {
                    rowHeight: { gridOptionsProperty: "rowHeight", default: 25 },
                    headerHeight: { gridOptionsProperty: "headerHeight", default: 33 },
                    multiSelect: { gridOptionsProperty: "rowSelection", default: false }
                }
                var COLUMN_PROPERTIES_DEFAULTS = {
                    id: { colDefProperty: "colId", default: null },
                    headerTitle: { colDefProperty: "headerName", default: null },
                    headerTooltip: { colDefProperty: "headerTooltip", default: null },
                    headerStyleClass: { colDefProperty: "headerClass", default: null },
                    tooltip: {colDefProperty: "tooltipField", default: null},
                    styleClass: { colDefProperty: "cellClass", default: null },
                    enableRowGroup: { colDefProperty: "enableRowGroup", default: true },
                    rowGroupIndex: { colDefProperty: "rowGroupIndex", default: -1 },
                    enablePivot: { colDefProperty: "enablePivot", default: false },
                    pivotIndex: { colDefProperty: "pivotIndex", default: -1 },
                    aggFunc: { colDefProperty: "aggFunc", default: "" },
                    width: { colDefProperty: "width", default: 0 },
                    enableToolPanel: { colDefProperty: "suppressToolPanel", default: true },
                    maxWidth: { colDefProperty: "maxWidth", default: null },
                    minWidth: { colDefProperty: "minWidth", default: null },                
                    visible: { colDefProperty: "hide", default: true },
                    enableResize: { colDefProperty: "resizable", default: true },
                    autoResize: { colDefProperty: "suppressSizeToFit", default: true },
                    enableSort: { colDefProperty: "sortable", default: true },
                    cellStyleClassFunc: { colDefProperty: "cellClass", default: null },
                    cellRendererFunc: { colDefProperty: "cellRenderer", default: null },
                    pivotComparatorFunc: { colDefProperty: "pivotComparator", default: null },
                    valueGetterFunc: { colDefProperty: "valueGetter", default: null }
                }

                toolPanelConfig = mergeConfig(toolPanelConfig, config.toolPanelConfig);
                iconConfig = mergeConfig(iconConfig, config.iconConfig);
                userGridOptions = mergeConfig(userGridOptions, config.gridOptions);
                localeText = mergeConfig(localeText, config.localeText);
                mainMenuItemsConfig = mergeConfig(mainMenuItemsConfig, config.mainMenuItemsConfig);
                
                var vMenuTabs = ['generalMenuTab','filterMenuTab'];
                
                if(config.showColumnsMenuTab) vMenuTabs.push('columnsMenuTab');
                
                var sideBar;
                if (toolPanelConfig && toolPanelConfig.suppressSideButtons === true) {
                    sideBar = false;
                } else {
                    sideBar = {
                        toolPanels: [
                        {
                            id: 'columns',
                            labelDefault: 'Columns',
                            labelKey: 'columns',
                            iconKey: 'columns',
                            toolPanel: 'agColumnsToolPanel',
                            toolPanelParams: {
                                suppressRowGroups: toolPanelConfig ? toolPanelConfig.suppressRowGroups : false,
                                suppressValues: toolPanelConfig ? toolPanelConfig.suppressValues : false,
                                suppressPivots: toolPanelConfig ? toolPanelConfig.suppressPivots : false,
                                suppressPivotMode: toolPanelConfig ? toolPanelConfig.suppressPivotMode : false,
                                suppressSideButtons: toolPanelConfig ? toolPanelConfig.suppressSideButtons : false,
                                suppressColumnFilter: toolPanelConfig ? toolPanelConfig.suppressColumnFilter : false,
                                suppressColumnSelectAll: toolPanelConfig ? toolPanelConfig.suppressColumnSelectAll : false,
                                suppressColumnExpandAll: toolPanelConfig ? toolPanelConfig.suppressColumnExpandAll : false
                            }
                        }                    
                    ]};
                }

                $scope.showEditorHint = function() {
                    return (!$scope.model.columns || $scope.model.columns.length == 0) && $scope.svyServoyapi.isInDesigner();
                }

                $scope.getStyleClass = function() {
                    if($scope.model.styleClass) {
                        var styleClassA = $scope.model.styleClass.split(" ");
                        for(var i = 0; i < styleClassA.length; i++) {
                            if(styleClassA[i] === 'ag-theme-alpine') {
                                styleClassA[i] = 'ag-theme-bootstrap';
                            }								
                        }
                        return styleClassA.join(" ");
                    }
                    return $scope.model.styleClass;
                }                

                /**
                 * Store the state of the table.
                 * */
                var state = {
                    expanded: {
                        /** the group fields in order
                         * This is a re-duntant info. I can obtain it via:
                         * 	
                         * var groupedColumns = gridOptions.columnApi.getRowGroupColumns();
                         * var groupFields = [];
                         * for (var j = 0; j < groupedColumns.length; j++) {
                         *	    groupFields.push(groupedColumns[j].colDef.field);
                            * }
                            *  */
                        fields: [],
                    }
                }

                var contextMenuItems = [];

                var isGridReady = false;

                var isDataRendering = false;

                var scrollToRowAfterDataRendering = null;

                var sizeColumnsToFitTimeout = null;

                // AG grid definition
                var gridOptions = {
                    
                    debug: false,
                    rowGroupPanelShow: 'always', // TODO expose property

                    defaultColDef: {
                        width: 0,
                        filter: false,
    //                    valueFormatter: displayValueFormatter,
                        menuTabs: vMenuTabs,
                        headerCheckboxSelection: false, //$scope.model.multiSelect === true ? isFirstColumn : false,	// FIXME triggers a long loop of onRowSelection event when a new selection is made.
                        checkboxSelection: $scope.model.multiSelect === true ? isFirstColumn : false,
                        sortable: config.enableSorting,
                        resizable: config.enableColumnResize,
                        tooltipComponent: getHtmlTooltip()
                    },
                    excelStyles: [
                        {
                            id: 'stringType',
                            dataType: 'string'
                        }
                    ],
                    columnDefs: columnDefs,
                    getMainMenuItems: getMainMenuItems,

                    rowHeight: $scope.model.rowHeight,
                    // TODO enable it ?					rowClass: $scope.model.rowStyleClass,	// add the class to each row

                    headerHeight: $scope.model.headerHeight, // exposed property
                    
                    suppressContextMenu: false,
                    suppressMovableColumns: false, // TODO persist column order changes
                    suppressAutoSize: true,
                    autoSizePadding: 25,
                    suppressFieldDotNotation: true,

                    // suppressMovingInCss: true,
                    suppressColumnMoveAnimation: true,
                    suppressAnimationFrame: true,
                    
                    rowSelection: $scope.model.multiSelect === true ? 'multiple' : 'single',
                    rowDeselection: false,
    //                suppressRowClickSelection: rowGroupColsDefault.length === 0 ? false : true,
                    suppressCellSelection: false, // TODO implement focus lost/gained
                    enableRangeSelection: false,
                    suppressRowClickSelection: !$scope.model.enabled,

                    stopEditingWhenGridLosesFocus: true,
                    singleClickEdit: true,
                    suppressClickEdit: false,
                    enableGroupEdit: false,
                    // groupUseEntireRow: false,
                    // groupMultiAutoColumn: true,

                    pivotMode: $scope.model.pivotMode,

                    animateRows: false,
                    enableCellExpressions: true,

                    onGridReady: function() {
                        $log.debug("gridReady");
                        isGridReady = true;
                        if($scope.model.visible) {
                            if($scope.model._internalColumnState !== "_empty") {
                                $scope.model.columnState = $scope.model._internalColumnState;
                                // need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
                                $scope.model._internalColumnState = "_empty";
                                $scope.svyServoyapi.apply('_internalColumnState');
                                if($scope.model.columnState) {
                                    restoreColumnsState();
                                }
                            }
                            if(!$scope.model.columnState) {
                                storeColumnsState(true);
                            }
                            applyExpandedState();
                        }
                        gridOptions.onDisplayedColumnsChanged = function() {
                            sizeColumnsToFit(GRID_EVENT_TYPES.DISPLAYED_COLUMNS_CHANGED);
                            storeColumnsState();
                        };
                        if($scope.handlers.onReady) {
                            $scope.handlers.onReady();
                        }
                        // without timeout the column don't fit automatically
                        setTimeout(function() {
                            sizeColumnsToFit(GRID_EVENT_TYPES.GRID_READY);
                        }, 150);
                    },
                    getContextMenuItems: getContextMenuItems,
                    autoGroupColumnDef: {
                        cellRenderer: DatasetTableGroupCellRenderer,
                        cellRendererParams : { suppressCount: false},
                        headerName: ' ',
                        cellClass: $scope.model.groupStyleClass
                    },
                    onGridSizeChanged: function() {
                        setTimeout(function() {
                            // if not yet destroyed
                            if(gridOptions.onGridSizeChanged) {
                                sizeColumnsToFit();
                            }
                        }, 150);
                    },
    //                onColumnEverythingChanged: storeColumnsState,	// do we need that ?, when is it actually triggered ?
                    onSortChanged: storeColumnsState,
    //                onFilterChanged: storeColumnsState,			 disable filter sets for now
    //                onColumnVisible: storeColumnsState,			 covered by onDisplayedColumnsChanged
    //                onColumnPinned: storeColumnsState,			 covered by onDisplayedColumnsChanged
                    onColumnResized: function(e) {				 // NOT covered by onDisplayedColumnsChanged
						if($scope.model.continuousColumnsAutoSizing && e.source === 'uiColumnDragged') {
							if(sizeColumnsToFitTimeout !== null) {
								clearTimeout(sizeColumnsToFitTimeout);
							}
							sizeColumnsToFitTimeout = setTimeout(function() {
								sizeColumnsToFitTimeout = null;
								sizeColumnsToFit();
								storeColumnsState();
							}, 500);
						} else {
							storeColumnsState();
						}
					},
    //                onColumnRowGroupChanged: storeColumnsState,	 covered by onDisplayedColumnsChanged
    //                onColumnValueChanged: storeColumnsState,
    //                onColumnMoved: storeColumnsState,              covered by onDisplayedColumnsChanged
    //                onColumnGroupOpened: storeColumnsState		 i don't think we need that, it doesn't include the open group in column state

                    navigateToNextCell: selectionChangeNavigation,
                    tabToNextCell: tabSelectionChangeNavigation,
                    sideBar : sideBar,
                    popupParent: gridDiv,
                    enableBrowserTooltips: false,
                    onToolPanelVisibleChanged : function(event) {
                        sizeColumnsToFit();
                    },
                    onCellEditingStopped : function(event) {
                        // don't allow escape if cell data is invalid
                        if(onColumnDataChangePromise == null) {
                            var rowIndex = event.rowIndex;
                            var colId = event.column.colId;
                            if(invalidCellDataIndex.rowIndex == rowIndex  && invalidCellDataIndex.colKey == colId) {
                                gridOptions.api.startEditingCell({
                                    rowIndex: rowIndex,
                                    colKey: colId
                                });
                            }
                        }
                    },
                    onCellEditingStarted : function(event) {
                        // don't allow editing another cell if we have an invalidCellData
                        if(invalidCellDataIndex.rowIndex != -1 && invalidCellDataIndex.colKey != '') {
                            var rowIndex = event.rowIndex;
                            var colId = event.column.colId;
                            if(invalidCellDataIndex.rowIndex != rowIndex  || invalidCellDataIndex.colKey != colId) {
                                gridOptions.api.stopEditing();
                                gridOptions.api.startEditingCell({
                                    rowIndex: invalidCellDataIndex.rowIndex,
                                    colKey: invalidCellDataIndex.colKey
                                });
                            }
                        }
                    }                
                };

                if ($scope.model.groupWidth || $scope.model.groupWidth === 0) gridOptions.autoGroupColumnDef.width = $scope.model.groupWidth;
                if ($scope.model.groupMaxWidth) gridOptions.autoGroupColumnDef.maxWidth = $scope.model.groupMaxWidth;
                if ($scope.model.groupMinWidth || $scope.model.groupMinWidth === 0) gridOptions.autoGroupColumnDef.minWidth = $scope.model.groupMinWidth;

                // check if we have filters
                for(var i = 0; gridOptions.sideBar && gridOptions.sideBar.toolPanels && i < columnDefs.length; i++) {
                    if(columnDefs[i].filter) {
                        gridOptions.sideBar.toolPanels.push({
                            id: 'filters',
                            labelDefault: 'Filters',
                            labelKey: 'filters',
                            iconKey: 'filter',
                            toolPanel: 'agFiltersToolPanel',
                        })
                        break;
                    }
                }

                if($scope.model.useLazyLoading) {
                    gridOptions.rowModelType = 'serverSide';
                }
                else {
                    gridOptions.rowModelType = 'clientSide';
                    gridOptions.rowData = $scope.model.data;
                }

                if($scope.model.rowStyleClassFunc) {
                    var rowStyleClassFunc = eval($scope.model.rowStyleClassFunc);
                    gridOptions.getRowClass = function(params) {
                        // skip pinned (footer) nodes
						if(params.node.rowPinned) return "";
                        var rowData = params.data || Object.assign(params.node.groupData, params.node.aggData);
                        return rowStyleClassFunc(params.rowIndex, rowData, params.event, params.node.group);
                    };
                }

                var isEditableFunc;
                if($scope.model.isEditableFunc) {
                    var f = eval($scope.model.isEditableFunc);
                    isEditableFunc = function(params) {
                        return f(params.node != undefined ? params.node.rowIndex : params.rowIndex, params.data, params.colDef.colId != undefined ? params.colDef.colId : params.colDef.field);
                    };
                }

                if($scope.model._internalAggCustomFuncs) {
                    gridOptions.aggFuncs = getAggCustomFuncs();
                }

                var gridFooterData = getFooterData();
                if (gridFooterData) {
                    gridOptions.pinnedBottomRowData = gridFooterData;
                }

                initializeIconConfig(iconConfig);

                setHeight();

                // locale text
                if (localeText) {
                    gridOptions['localeText'] = localeText; 
                }

                // fill user grid options properties
                if (userGridOptions) {
                    var gridOptionsSetByComponent = {};
                    for( var p in TABLE_PROPERTIES_DEFAULTS) {
                        if(TABLE_PROPERTIES_DEFAULTS[p]["default"] != config[p]) {
                            gridOptionsSetByComponent[TABLE_PROPERTIES_DEFAULTS[p]["gridOptionsProperty"]] = true;
                        }
                    }

                    for (var property in userGridOptions) {
                        if (userGridOptions.hasOwnProperty(property) && !gridOptionsSetByComponent.hasOwnProperty(property)) {
                            gridOptions[property] = userGridOptions[property];
                        }
                    }
                }

                if(gridOptions.groupUseEntireRow) {
                    var groupRowRendererFunc = groupRowInnerRenderer;
                    if($scope.model.groupRowRendererFunc) {
                        groupRowRendererFunc = eval($scope.model.groupRowRendererFunc);
                    }
                    gridOptions.groupRowRenderer = DatasetTableGroupCellRenderer;
                    gridOptions.groupRowInnerRenderer = groupRowRendererFunc;
                }

                // handle options that are dependent on gridOptions
                if(gridOptions["enableCharts"] && gridOptions["enableRangeSelection"]) {
                    contextMenuItems.push("chartRange");
                }

                // init the grid. If is in designer render a mocked grid
                if ($scope.svyServoyapi.isInDesigner()) {
                    $element.addClass("design-mode");
                    var designGridOptions = {
                        rowModelType: 'clientSide',
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
                    if($scope.model.visible) {
                        restoreColumnsState();
                    }
                }

                // register listener for selection changed
                gridOptions.api.addEventListener('rowSelected', onRowSelected);
                gridOptions.api.addEventListener('selectionChanged', onSelectionChanged);
                gridOptions.api.addEventListener('cellClicked', cellClickHandler);
                gridOptions.api.addEventListener('cellDoubleClicked', onCellDoubleClicked);
                gridOptions.api.addEventListener('cellContextMenu', onCellContextMenu);
                gridOptions.api.addEventListener('displayedColumnsChanged', onDisplayedColumnsChanged);

                // listen to group changes
                gridOptions.api.addEventListener('columnRowGroupChanged', onColumnRowGroupChanged);

                // listen to group collapsed
                gridOptions.api.addEventListener('rowGroupOpened', onRowGroupOpened);


                gridDiv.addEventListener("focus", function(e) {
                    if(gridOptions.api && gridOptions.columnApi) {
                        var allDisplayedColumns = gridOptions.columnApi.getAllDisplayedColumns()
                        if(allDisplayedColumns && allDisplayedColumns.length) {
                            var focuseFromEl = e.relatedTarget;
                            if(focuseFromEl && (focuseFromEl.classList.contains('ag-cell') || focuseFromEl.classList.contains('ag-header-cell'))) { // focuse out from the grid
                                gridOptions.api.clearFocusedCell();
                            } else if (gridOptions.columnApi.columnController.rowGroupColumns.length === 0){
                                gridOptions.api.ensureIndexVisible(0);
                                gridOptions.api.ensureColumnVisible(allDisplayedColumns[0]);
                                $scope.api.setSelectedRows([0]);
                                gridOptions.api.setFocusedCell(0, allDisplayedColumns[0]);                            
                            }
                        }
                    }
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

                    var lazyLoadingRemoteDatasource = new RemoteDatasource();
                    gridOptions.api.setServerSideDatasource(lazyLoadingRemoteDatasource);

                    $scope.$watch("model._internalResetLazyLoading", function(newValue) {
                        if(isGridReady && newValue) {
                            $scope.model._internalResetLazyLoading = false;
                            $scope.svyServoyapi.apply('_internalResetLazyLoading');
                            gridOptions.api.setServerSideDatasource(lazyLoadingRemoteDatasource);
                        }
                    });
                }
                else {
                    $scope.$watchCollection("model.data", function(newValue, oldValue) {
                        if(gridOptions && (newValue !== oldValue)) {
                            isDataRendering = true;
                            // make sure we clear any settings ag-grid holds on with the previous row data
                            gridOptions.api.setRowData(null);
                            setTimeout(function() {
                            gridOptions.api.setRowData($scope.model.data);
                            isDataRendering = false;
                            applyExpandedState();
                            if(scrollToRowAfterDataRendering) {
                                $scope.api.scrollToRow(scrollToRowAfterDataRendering);
                                scrollToRowAfterDataRendering = null;
                            }
                            },0);
                        }
                    });
                }

                var columnWatches = [];
                $scope.$watchCollection("model.columns", function(newValue, oldValue) {
                    $log.debug('columns changed');
                    if(newValue) {
                        for(var i = 0; i < columnWatches.length; i++) {
                            columnWatches[i]();
                        }
                        columnWatches.length = 0;
                        var columnKeysToWatch = [
                            "headerTitle",
                            "headerStyleClass",
                            "headerTooltip",
                            "footerText",
                            "styleClass",
                            "visible",
                            "width",
                            "minWidth",
                            "maxWidth",
                            "enableRowGroup",
                            "enableSort",
                            "enableResize",
                            "enableToolPanel",
                            "autoResize",
                            "editType",
                            "id"
                        ];
                        for(var i = 0; i < $scope.model.columns.length; i++) {
                            for( var j = 0; j < columnKeysToWatch.length; j++) {
                                columnWatches.push(watchColumnModel(i, columnKeysToWatch[j]));
                            }
                        }					

                        if(newValue != oldValue) {
                            updateColumnDefs();
                        }
                    }
                });

                /**
                 * @private 
                 */
                function watchColumnModel(index, property) {
                    var columnWatch = $scope.$watch("model.columns[" + index + "]['" + property + "']",
                    function(newValue, oldValue) {
                        if(newValue != oldValue) {
                            $log.debug('column property changed');
                            if(isGridReady) {
                                if(property != "headerTooltip" && property != "footerText" && property != "headerTitle" && property != "visible" && property != "width") {
                                    updateColumnDefs();
                                    if(property != "enableToolPanel") {
                                        restoreColumnsState();
                                    }
                                }
                            }

                            if(property == "headerTitle") {
                                handleColumnHeader(index, "headerName", newValue, oldValue);
                            }
                            else if(property == "headerTooltip") {
                                handleColumnHeader(index, property, newValue, oldValue);
                            }                            
                            else if (property == "footerText") {
                                handleColumnFooterText(newValue, oldValue);
                            }
							else if(property == "visible" || property == "width") {
                                // column id is either the id of the column
                                var column = $scope.model.columns[index];
                                var colId = column.id;
                                if (!colId) {
                                    colId = column["dataprovider"];
                                }
                                if (!colId) {
                                    $log.warn("cannot update '" + property + "' property on column at position index " + index);
                                    return;
                                }

								if(property == "visible") {
									gridOptions.columnApi.setColumnVisible(colId, newValue);
								} else {
									gridOptions.columnApi.setColumnWidth(colId, newValue);
									sizeColumnsToFit();
								}
							}                            
                        }
                    });
                    return columnWatch;
                }


                function updateColumnDefs() {
                    if(gridOptions && gridOptions.api) {
                        // need to clear/remove old columns first, else the id for
                        // the new columns will have the counter at the end (ex. "myid_1")
                        // and that will broke our getColumn()
                        gridOptions.api.setColumnDefs([]);

                        // make sure custom agg functions are added before setting the column defs, as the aggs may already
                        // been referenced in the columns
                        if($scope.model._internalAggCustomFuncs) {
                            gridOptions.api.addAggFuncs(getAggCustomFuncs()); 
                        }
                        gridOptions.api.setColumnDefs(getColumnDefs());
                    }
                }

                function handleColumnHeader(index, property, newValue, oldValue) {
                    $log.debug('header column property changed');
                    
                    // column id is either the id of the column
                    var column = $scope.model.columns[index];
                    var colId = column.id;
                    if (!colId) {
                        colId = column["dataprovider"];
                    }
                    
                    if (!colId) {
                        $log.warn("cannot update header for column at position index " + index);
                        return;
                    }
                    updateColumnHeader(colId, property, newValue);
                }

                function updateColumnHeader(id, property, text) {					
                    // get a reference to the column
                    var col = gridOptions.columnApi.getColumn(id);

                    // obtain the column definition from the column
                    var colDef = col.getColDef();

                    // update the header
                    colDef[property] = text;

                    // the column is now updated. to reflect the header change, get the grid refresh the header
                    gridOptions.api.refreshHeader();
                    sizeHeader();
                }

                function handleColumnFooterText(newValue, oldValue) {
                    $log.debug('footer text column property changed');
                    gridOptions.api.setPinnedBottomRowData(getFooterData());
                }
                
                function getFooterData() {
                    var result = [];
                    var hasFooterData = false;
                    var resultData = {}
                    for (var i = 0; $scope.model.columns && i < $scope.model.columns.length; i++) {
                        var column = $scope.model.columns[i];
                        if (column.footerText && column.dataprovider) {
                            resultData[column.dataprovider] = column.footerText;
                            hasFooterData = true;
                        }
                    }
                    if (hasFooterData) {
                        result.push(resultData)
                    }
                    return result;
                }                

                /**
                 * Update header height based on cells content height
                 */
                function sizeHeader() {
                    var headerCell = $element.find('.ag-header-cell');
                    var paddingTop = headerCell.length ? parseInt(headerCell.css('padding-top'), 10) : 0;
                    var paddinBottom = headerCell.length ? parseInt(headerCell.css('padding-bottom'), 10) : 0;
                    var headerCellLabels = $element.find('.ag-header-cell-text');
                    var minHeight = (gridOptions && (gridOptions.headerHeight >= 0)) ? gridOptions.headerHeight : 25;

                    if(minHeight > 0) {
                        for(var i = 0; i < headerCellLabels.length; i++) {
                            minHeight = Math.max(minHeight, headerCellLabels[i].scrollHeight + paddingTop + paddinBottom);
                        }
                    }
                    gridOptions.api.setHeaderHeight(minHeight);
                }          

                $scope.$watch("model._internalColumnState", function(newValue, oldValue) {
                    if(isGridReady && (newValue !== "_empty")) {
                        $scope.model.columnState = newValue;
                        // need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
                        $scope.model._internalColumnState = "_empty";
                        $scope.svyServoyapi.apply('_internalColumnState');
                        if($scope.model.columnState) {
                            restoreColumnsState();
                        }
                        else {
                            gridOptions.columnApi.resetColumnState();
                        }
                    }
                });

                $scope.$watch("model._internalAggCustomFuncs", function() {
                    if(gridOptions && gridOptions.api && $scope.model._internalAggCustomFuncs) {
                        gridOptions.api.addAggFuncs(getAggCustomFuncs()); 
                    }
                });

				$scope.$watch("model.enabled", function(newValue, oldValue) {
					if(isGridReady) {
						gridOptions.suppressRowClickSelection = !newValue;
					}
				});

                function getIconCheckboxEditor(state) {
                    var checkboxEditorIconConfig = iconConfig ? iconConfig : $scope.model.iconConfig;
                    
                    if(state) {
                        return checkboxEditorIconConfig && checkboxEditorIconConfig.iconEditorChecked ?
                        checkboxEditorIconConfig.iconEditorChecked : "glyphicon glyphicon-check";
                    }
                    else {
                        return checkboxEditorIconConfig && checkboxEditorIconConfig.iconEditorUnchecked ?
                        checkboxEditorIconConfig.iconEditorUnchecked : "glyphicon glyphicon-unchecked";
                    }
                }

                function getDefaultCellRenderer(column) {
                    return function(params) {
                        if(column.editType == 'CHECKBOX' && !params.node.group) {
                            var checkboxEl = document.createElement('i');
                            checkboxEl.className = getIconCheckboxEditor(parseInt(params.value));
                            return checkboxEl;
                        }

                        var value = params.value != null ? params.value : "";
                        var valueFormatted = params.valueFormatted != null ? params.valueFormatted : value;
                        
                        var returnValueFormatted = false;
                        if(column != null && column.showAs == 'html') {
                            value =  value && value.displayValue != undefined ? value.displayValue : value;
                        } else if(column != null && column.showAs == 'sanitizedHtml') {
                            value = $sanitize(value && value.displayValue != undefined ? value.displayValue : value)
                        } else if (value && value.contentType && value.contentType.indexOf('image/') == 0 && value.url) {
                            value = '<img class="ag-table-image-cell" src="' + value.url + '">';
                        } else {
                            returnValueFormatted = true;
                        }

                        return returnValueFormatted ? document.createTextNode(valueFormatted) : value;
                    };
                }

                function onCellValueChanged(params) {
                    var rowIndex = params.node.rowIndex;
                    var colId = params.column.colId;

                    // if we have an invalid cell data, ignore any updates for other cells
                    if((invalidCellDataIndex.rowIndex != -1 && invalidCellDataIndex.rowIndex != rowIndex)
                        || (invalidCellDataIndex.colKey != '' && invalidCellDataIndex.colKey != colId)) {
                        return;
                    }

                    var newValue = params.newValue;
                    var oldValue = params.oldValue;
                    var oldValueStr = oldValue;
                    if(oldValueStr == null) oldValueStr = "";

                    var col = getColumn(params.colDef.field);
                    // ignore types in compare only for non null values ("200"/200 are equals, but ""/0 is not)
                    var isValueChanged = newValue != oldValueStr || (!newValue && newValue !== oldValueStr);
                    if(isValueChanged && newValue instanceof Date && oldValue instanceof Date) {
                        isValueChanged = newValue.toISOString() != oldValue.toISOString();
                    }
                    if(isValueChanged) $scope.svyServoyapi.apply('data');
                    if(col && col["dataprovider"] && (isValueChanged || invalidCellDataIndex.rowIndex != -1)) {
                        if($scope.handlers.onColumnDataChange && isValueChanged) {
                            var currentEditCells = gridOptions.api.getEditingCells();
                            onColumnDataChangePromise = $scope.handlers.onColumnDataChange(
                                rowIndex,
                                getColumnIndex(params.column.colId),
                                oldValue,
                                newValue,
                                createJSEvent(),
                                params.data
                            );
                            onColumnDataChangePromise.then(function(r) {
                                if(r == false) {
                                    // if old value was reset, clear invalid state
                                    var currentValue = gridOptions.api.getValue(colId, params.node);
                                    if(oldValue === currentValue) {
                                        invalidCellDataIndex.rowIndex = -1;
                                        invalidCellDataIndex.colKey = '';
                                    }
                                    else {
                                        invalidCellDataIndex.rowIndex = rowIndex;
                                        invalidCellDataIndex.colKey = colId;
                                    }
                                    var editCells = gridOptions.api.getEditingCells();
                                    if(!editCells.length || (editCells[0].rowIndex != rowIndex || editCells[0].column.colId != colId)) {
                                        gridOptions.api.stopEditing();
                                        gridOptions.api.startEditingCell({
                                            rowIndex: rowIndex,
                                            colKey: colId
                                        });
                                        setTimeout(function() {
                                            gridOptions.api.forEachNode( function(node) {
                                                if (node.rowIndex === rowIndex) {
                                                    node.setSelected(true, true);
                                                }
                                            });
                                        }, 0);
                                    }
                                }
                                else {
                                    invalidCellDataIndex.rowIndex = -1;
                                    invalidCellDataIndex.colKey = '';
                                    var editCells = gridOptions.api.getEditingCells();
                                    if(editCells.length == 0 && currentEditCells.length != 0) {
                                        gridOptions.api.startEditingCell({
                                            rowIndex: currentEditCells[0].rowIndex,
                                            colKey: currentEditCells[0].column.colId
                                        });
                                    }
                                }
                                onColumnDataChangePromise = null;
                            }).catch(function(e) {
                                $log.error(e);
                                invalidCellDataIndex.rowIndex = -1;
                                invalidCellDataIndex.colKey = '';
                                onColumnDataChangePromise = null;
                            });
                        }
                    }
                }

                function getColumnDefs() {
                    hasAutoHeightColumn = false;
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
                            headerTooltip: column["headerTooltip"] ? column["headerTooltip"] : null,
                            field: column["dataprovider"],
                            tooltipField: column["tooltip"] ? column["tooltip"] : null
                        };

                        // set id if defined
                        if(column.id) {
                            colDef.colId = column.id;
                        }

                        // styleClass
                        colDef.headerClass = 'ag-table-header ' + column.headerStyleClass;
                        colDef.cellClass = ['ag-table-cell'];
                        if(column.formatType == 'TEXT') {
                            colDef.cellClass.push('stringType');
                        }
                        if(column.styleClass) {
                            colDef.cellClass = colDef.cellClass.concat(column.styleClass.split(' '));
                        }


                        // column grouping & pivoting
                        colDef.enableRowGroup = column.enableRowGroup;
                        if (column.rowGroupIndex >= 0) colDef.rowGroupIndex = column.rowGroupIndex;

                        colDef.enablePivot = column.enablePivot;
                        if (column.pivotIndex >= 0) colDef.pivotIndex = column.pivotIndex;

                        if(column.aggFunc) colDef.aggFunc = column.aggFunc;
                        if(colDef.aggFunc) colDef.enableValue = true;
                        
                        // tool panel
                        if (column.enableToolPanel === false) colDef.suppressToolPanel = !column.enableToolPanel;

                        // column sizing
                        if (column.width || column.width === 0) colDef.width = column.width;
                        if (column.maxWidth) colDef.maxWidth = column.maxWidth;
                        if (column.minWidth || column.minWidth === 0) colDef.minWidth = column.minWidth;

                        // column resizing https://www.ag-grid.com/javascript-grid-resizing/
                        if (column.enableResize === false) colDef.resizable = column.enableResize;
                        if (column.autoResize === false) colDef.suppressSizeToFit = !column.autoResize;
                        
                        // sorting
                        if (column.enableSort === false) colDef.sortable = false;
                        
                        // visibility
                        if (column.visible === false) colDef.hide = true;
                        
                        if (column.format) {
                            var parsedFormat = column.format;
                            if(column.formatType == 'DATETIME') {
                                var useLocalDateTime = false;
                                try {
                                    var jsonFormat = JSON.parse(column.format);
                                    parsedFormat = jsonFormat.displayFormat;
                                    useLocalDateTime = jsonFormat.useLocalDateTime;
                                }
                                catch(e){}
                                if(useLocalDateTime) {
                                    colDef.valueGetter = function(params) {
                                        var field = params.colDef.field;
                                        if (field && params.data) {
                                            return new Date(params.data[field]);
                                        }
                                        return undefined;				
                                    };
                                }
                            }

                            colDef.keyCreator = createValueFormatter(parsedFormat, column.formatType);
                            colDef.valueFormatter = createValueFormatter(parsedFormat, column.formatType);
                        }

                        if(column.cellStyleClassFunc) {
                            colDef.cellClass = createColumnCallbackFunctionFromString(column.cellStyleClassFunc);
                        } else if(column.footerStyleClass) {
                            var defaultCellClass = colDef.cellClass;
                            var footerCellClass = defaultCellClass.concat(column.footerStyleClass.split(' '));
                            colDef.cellClass = function(params) {
                                return params.node && params.node.rowPinned == 'bottom' ? footerCellClass : defaultCellClass;
                            }
                        }

                        if(column.cellRendererFunc) {
                            colDef.cellRenderer = createColumnCallbackFunctionFromString(column.cellRendererFunc);
                        }
                        else {
                            colDef.cellRenderer = getDefaultCellRenderer(column);
                        }

                        if(column.pivotComparatorFunc) {
                            colDef.pivotComparator = createPivotComparatorFunctionFromString(column.pivotComparatorFunc);
                        }

                        if(column.valueGetterFunc) {
                            colDef.valueGetter = createColumnValueGetterCallbackFunctionFromString(column.valueGetterFunc);
                        }

                        if (column.filterType) {
                            colDef.filter = true;

                            if(column.filterType == 'TEXT') {
                                colDef.filter = 'agTextColumnFilter';
                            }
                            else if(column.filterType == 'NUMBER') {
                                colDef.filter = 'agNumberColumnFilter';
                            }
                            else if(column.filterType == 'DATE') {
                                colDef.filter = 'agDateColumnFilter';
                            }
                            
                            colDef.filterParams = { applyButton: true, clearButton: true, newRowsAction: 'keep', suppressAndOrCondition: false, caseSensitive: false };
                        }

                        colDef.suppressMenu = column.enableRowGroup === false && column.filterType == undefined;

                        if (column.editType) {
                            colDef.editable = column.editType != 'CHECKBOX' ? isColumnEditable : false;

                            if(column.editType == 'TEXTFIELD') {
                                colDef.cellEditor = getTextEditor();
                            }
                            else if(column.editType == 'DATEPICKER') {
                                colDef.cellEditor = getDatePicker();
                            }
                            else if(column.editType == 'FORM') {
                                colDef.cellEditor = getFormEditor();
                                colDef.suppressKeyboardEvent = function(params) {
                                    // grid should do nothing on ENTER and TAB
                                    var gridShouldDoNothing = params.editing && (params.event.keyCode === 9 || params.event.keyCode === 13);
                                    return gridShouldDoNothing;
                                }                                
                            }

                            colDef.onCellValueChanged = onCellValueChanged;
                        }

                        var columnOptions = {};
                        if($injector.has('ngPowerGrid')) {
                            var datasettableDefaultConfig = $services.getServiceScope('ngPowerGrid').model;
                            if(datasettableDefaultConfig.columnOptions) {
                                columnOptions = datasettableDefaultConfig.columnOptions;
                            }
                        }

                        columnOptions = mergeConfig(columnOptions, column.columnDef);

                        if(columnOptions) {
                            var colDefSetByComponent = {};
                            for( var p in COLUMN_PROPERTIES_DEFAULTS) {
                                if(COLUMN_PROPERTIES_DEFAULTS[p]["default"] != column[p]) {
                                    colDefSetByComponent[COLUMN_PROPERTIES_DEFAULTS[p]["colDefProperty"]] = true;
                                }
                            }
                            for (var property in columnOptions) {
                                if (columnOptions.hasOwnProperty(property) && !colDefSetByComponent.hasOwnProperty(property)) {
                                    colDef[property] = columnOptions[property];
                                }
                            }
                        }

                        if(colDef['autoHeight'] && !hasAutoHeightColumn) {
                            hasAutoHeightColumn = true;
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

                function isColumnEditable(args) {
                    // skip pinned (footer) nodes
					if(args.node.rowPinned) return false;
                    if($scope.model.enabled && !$scope.model.readOnly) {
                        if(isEditableFunc) {
                            return isEditableFunc(args);
                        }
                        return true;
                    }
                    else {
                        return false;
                    }
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
                        if ($scope.model.responsiveHeight) {
                            gridDiv.style.height = $scope.model.responsiveHeight + 'px';
                        } else {
                            // when responsive height is 0 or undefined, use 100% of the parent container.
                            gridDiv.style.height = '100%';
                        }
                    }
                }

                function sizeColumnsToFit(eventType) {
                    if($scope.model.visible) {
                        switch ($scope.model.columnsAutoSizing) {
                            case "NONE":
                                break;
                            case "AUTO_SIZE":
                                
                                // calling auto-size upon displayedColumnsChanged runs in an endless loop 
                                var skipEvents = [GRID_EVENT_TYPES.DISPLAYED_COLUMNS_CHANGED];
                                
                                // call auto-size only upon certain events
                                var autoSizeOnEvents = [GRID_EVENT_TYPES.GRID_READY];
                            
                                if (eventType && autoSizeOnEvents.indexOf(eventType) > -1) {
                                    var skipHeader = gridOptions.skipHeaderOnAutoSize == true ? true : false;
                                    gridOptions.columnApi.autoSizeAllColumns(skipHeader);
                                }
                                break;
                            case "SIZE_COLUMNS_TO_FIT":
                            default:
                                gridOptions.api.sizeColumnsToFit();
                        }
                        if(hasAutoHeightColumn) gridOptions.api.resetRowHeights();
                    }
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
                    var items;
                    if(mainMenuItemsConfig && !$.isEmptyObject(mainMenuItemsConfig)) {
                        items = [];
                        for (var key in mainMenuItemsConfig) {
                            if(mainMenuItemsConfig[key]) items.push(key);
                        }
                    }
                    else {
                        items = ['rowGroup', 'rowUnGroup'];
                    }
                    var menuItems = [];
                    params.defaultItems.forEach(function(item) {
                        if (items.indexOf(item) > -1) {
                            menuItems.push(item);
                        }
                    });
                    return menuItems;
                }

                function getContextMenuItems(params) {
                    return contextMenuItems;
                }

                function createColumnCallbackFunctionFromString(functionAsString) {
                    var f = eval(functionAsString);
                    return function(params) {
                        return f(params.rowIndex, params.data, params.colDef.colId != undefined ? params.colDef.colId : params.colDef.field, params.value, params);
                    };                
                }

                function createPivotComparatorFunctionFromString(functionAsString) {
                    var f = eval(functionAsString);
                    return function(valueA, valueB) {
                        return f(valueA, valueB);
                    };                
                }

                function createColumnValueGetterCallbackFunctionFromString(functionAsString) {
                    var f = eval(functionAsString);
                    return function(params) {
                        return f(params.node.rowIndex, params.data, params.colDef.colId != undefined ? params.colDef.colId : params.colDef.field, params);
                    };
                }

                function createAggCustomFunctionFromString(functionAsString) {
                    var f = eval(functionAsString);
                    return function(values) {
                        return f(values);
                    };                
                }

                function createValueFormatter(format, formatType) {
                    return function(params) {
                        if(params.value != undefined) {
                            if(formatType == 'TEXT' && typeof params.value === 'string') {
                                if(format == '|U') {
                                    return params.value.toUpperCase();
                                } else if(format == '|L') {
                                    return params.value.toLowerCase();
                                }
                            }
                            var cellValue = params.value;
                            // if the value is a group-value then it is a string that is already formatted
                            if ((formatType == 'DATETIME' || formatType == 'NUMBER') && (typeof cellValue === 'string' || cellValue instanceof String)) {
                                return cellValue;
                            }
                            var displayFormat = null;
                            if(format) {
                                displayFormat = format.split("|")[0];
                            }
                            return $formatterUtils.format(cellValue,displayFormat,formatType);
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

                var destroyListenerUnreg = $scope.$on('$destroy', function() { // unbind resize on destroy
                    destroyListenerUnreg();
                    delete $scope.model[$sabloConstants.modelChangeNotifier];

                    // release grid resources
                    delete gridOptions.onCellEditingStarted;
                    delete gridOptions.onCellEditingStopped;
                    delete gridOptions.onColumnResized;
                    delete gridOptions.onDisplayedColumnsChanged;
                    delete gridOptions.onGridReady;
                    delete gridOptions.onGridSizeChanged;
                    delete gridOptions.onSortChanged;
                    delete gridOptions.onToolPanelVisibleChanged;

                    gridOptions.api.removeEventListener('rowSelected', onRowSelected);
                    gridOptions.api.removeEventListener('selectionChanged', onSelectionChanged);
                    gridOptions.api.removeEventListener('cellClicked', cellClickHandler);
                    gridOptions.api.removeEventListener('cellDoubleClicked', onCellDoubleClicked);
                    gridOptions.api.removeEventListener('cellContextMenu', onCellContextMenu);
                    gridOptions.api.removeEventListener('displayedColumnsChanged', onDisplayedColumnsChanged);
                    gridOptions.api.removeEventListener('columnRowGroupChanged', onColumnRowGroupChanged);
                    gridOptions.api.removeEventListener('rowGroupOpened', onRowGroupOpened);

                    // discard all pending async calls from aggrid
                    //gridOptions.api.eventService.asyncFunctionsQueue.length = 0;
                    gridOptions.api.destroy();
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
                        var col = params.colDef.field ? getColumn(params.colDef.field) : null;
                        if(col && col.editType == 'CHECKBOX' && params.event.target.tagName == 'I' && isColumnEditable(params)) {
                            var v = parseInt(params.value);
                            if(isNaN(v)) v = 0;
                            params.node.setDataValue(params.column.colId, v ? 0 : 1);
                        }

                        var rowData = params.data || Object.assign(params.node.groupData, params.node.aggData);
                        if ($scope.handlers.onCellClick && rowData) {
                            $scope.handlers.onCellClick(rowData, params.colDef.colId != undefined ? params.colDef.colId : params.colDef.field, params.value, params.event);
                        }
                    }

                    // grid handlers
                    var clickTimer;
                    function cellClickHandler(params) {
                        if($scope.model.enabled) {
							if(params.node.rowPinned) {
								if (params.node.rowPinned == "bottom" && $scope.handlers.onFooterClick) {
									var columnIndex = getColumnIndex(params.column.colId);
									$scope.handlers.onFooterClick(columnIndex, params.event);
								}
							} else {
                                if ($scope.handlers.onCellDoubleClick) {
                                    if (clickTimer) {
                                        clearTimeout(clickTimer);
                                        clickTimer = null;
                                    } else {
                                        clickTimer = setTimeout(function() {
                                                clickTimer = null;
                                                onCellClicked(params);
                                            }, 250);
                                    }
                                } else {
                                    onCellClicked(params);
                                }
                            }
                        }
                    }

                    /**
                     * On Double Click Event
                     *
                     * @private
                     * */
                    function onCellDoubleClicked(params) {
                        if($scope.model.enabled) {
                            // ignore dblclick handler while editing, because it is the
							// default trigger for start editing and/or can be used by the editor
							// like texteditor, for selection
							var currentEditCells = gridOptions.api.getEditingCells();
							if(currentEditCells.length > 0) {
								return;
							}                            
                            var rowData = params.data || Object.assign(params.node.groupData, params.node.aggData);
                            if ($scope.handlers.onCellDoubleClick && rowData) {
                                $scope.handlers.onCellDoubleClick(rowData, params.colDef.colId != undefined ? params.colDef.colId : params.colDef.field, params.value, params.event);
                            }
                        }
                    }
                    
                    function onCellContextMenu(params) {
                        if($scope.model.enabled) {
                            var rowData = params.data || Object.assign(params.node.groupData, params.node.aggData);
                            if ($scope.handlers.onCellRightClick && rowData) {
                                $scope.handlers.onCellRightClick(rowData, params.colDef.colId != undefined ? params.colDef.colId : params.colDef.field, params.value, params.event);
                            }
                        }
                    }

                    function selectionChangeNavigation(params) {
                        if(!$scope.model.enabled) return;
                        var previousCell = params.previousCellPosition;
                        var suggestedNextCell = params.nextCellPosition;
                    
                        var KEY_UP = 38;
                        var KEY_DOWN = 40;
                        var KEY_LEFT = 37;
                        var KEY_RIGHT = 39;
                    
                        switch (params.key) {
                            case KEY_DOWN:
                                var newIndex = previousCell.rowIndex + 1;
                                var nextRow = gridOptions.api.getDisplayedRowAtIndex(newIndex);
                                while(nextRow && (nextRow.group || nextRow.selected)) {
                                    newIndex++;
                                    nextRow = gridOptions.api.getDisplayedRowAtIndex(newIndex);
                                }

                                // set selected cell on next non-group row cells
                                if(nextRow) {
                                    if(!nextRow.id) return null; // row cannot be selected (happens when arrow key is kept pressed, and the row is not yet rendered), skip suggestion
                                    if(!$scope.model.multiSelect) {
                                        nextRow.setSelected(true, true);
                                    }
                                    suggestedNextCell.rowIndex = newIndex;
                                }
                                return suggestedNextCell;
                            case KEY_UP:
                                var newIndex = previousCell.rowIndex - 1;
                                var nextRow = gridOptions.api.getDisplayedRowAtIndex(newIndex);
                                while(nextRow && (nextRow.group || nextRow.selected)) {
                                    newIndex--;
                                    nextRow = gridOptions.api.getDisplayedRowAtIndex(newIndex);
                                }

                                // set selected cell on previous non-group row cells
                                if(nextRow) {
                                    if(!nextRow.id) return null; // row cannot be selected (happens when arrow key is kept pressed, and the row is not yet rendered), skip suggestion
                                    if(!$scope.model.multiSelect) {
                                        nextRow.setSelected(true, true);
                                    }
                                    suggestedNextCell.rowIndex = newIndex;
                                }
                                return suggestedNextCell;
                            case KEY_LEFT:
                            case KEY_RIGHT:
                                return suggestedNextCell;
                            default:
                                throw "this will never happen, navigation is always on of the 4 keys above";
                        }					
                    }

                    function tabSelectionChangeNavigation(params) {
                        if(!$scope.model.enabled) return;
                        var suggestedNextCell = params.nextCellPosition;
                        var isPinnedBottom = suggestedNextCell ? suggestedNextCell.rowPinned == "bottom" : false;

                        // don't change selection if row is pinned to the bottom (footer)
                        if(suggestedNextCell && !isPinnedBottom) {
                            var suggestedNextCellSelected = false;
                            var selectedNodes = gridOptions.api.getSelectedNodes();
                            for(var i = 0; i < selectedNodes.length; i++) {
                                if(suggestedNextCell.rowIndex == selectedNodes[i].rowIndex) {
                                    suggestedNextCellSelected = true;
                                    break;
                                }
                            }

                            if(!suggestedNextCellSelected) {
                                selectionEvent = { type: 'key', event: params.event };
                                gridOptions.api.forEachNode( function(node) {
                                    if (suggestedNextCell.rowIndex === node.rowIndex) {
                                        node.setSelected(true, true);
                                    }
                                });
                            }
                        }

                        if(!suggestedNextCell) {
                            setTimeout(function() {
                                gridDiv.focus();
                            }, 0);
                        }

                        return suggestedNextCell;
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

                function storeColumnsState(skipFireColumnStateChanged) {
                    if($scope.model.visible) {
                        var rowGroupColumns = gridOptions.columnApi.getRowGroupColumns();
                        var svyRowGroupColumnIds = [];
                        for(var i = 0; i < rowGroupColumns.length; i++) {
                            svyRowGroupColumnIds.push(rowGroupColumns[i].colId);
                        }

                        var columnStateOrdered = gridOptions.columnApi.getColumnState();
                        // when in pivot mode, getColumnState does not order the columns in this version of aggrid (in more recent versions it does) -
                        // as a workaround, use aggrid's internal column state sort here
                        if(gridOptions.columnApi.isPivotMode()) {
                            gridOptions.columnApi.columnController.orderColumnStateList(columnStateOrdered);
                        }
                        var columnState = {
                            columnState: columnStateOrdered,
                            rowGroupColumnsState: svyRowGroupColumnIds,
                            isToolPanelShowing: gridOptions.api.isToolPanelShowing(),
                            isSideBarVisible: gridOptions.api.isSideBarVisible(),
                            // filterState: gridOptions.api.getFilterModel(), TODO persist column states
                            sortingState: gridOptions.api.getSortModel()
                        }
                        var newColumnState = JSON.stringify(columnState);
                        
                        if (newColumnState !== $scope.model.columnState) {
                            $scope.model.columnState = newColumnState;
                            $scope.svyServoyapi.apply('columnState');
                            if (skipFireColumnStateChanged !== true && $scope.handlers.onColumnStateChanged) {
                                $scope.handlers.onColumnStateChanged($scope.model.columnState);
                            }
                        }
                    }
                }

                function restoreColumnsState() {
                    if($scope.model.columnState) {
                        var columnStateJSON = null;

                        try {
                            columnStateJSON = JSON.parse($scope.model.columnState);
                        }
                        catch(e) {
                            $log.error(e);
                        }

                        if(columnStateJSON != null) {
                            if(Array.isArray(columnStateJSON.columnState) && columnStateJSON.columnState.length > 0) {
                                gridOptions.columnApi.setColumnState(columnStateJSON.columnState);
                            }

                            if(Array.isArray(columnStateJSON.rowGroupColumnsState) && columnStateJSON.rowGroupColumnsState.length > 0) {
                                gridOptions.columnApi.setRowGroupColumns(columnStateJSON.rowGroupColumnsState);
                            }

                            if(Array.isArray(columnStateJSON.sortingState) && columnStateJSON.sortingState.length > 0) {
                                gridOptions.api.setSortModel(columnStateJSON.sortingState);
                            }

                            gridOptions.api.setSideBarVisible(columnStateJSON.isSideBarVisible);
                        }
                    }
                }

                function groupRowInnerRenderer(params) {
                    var label = '<span class="ag-group-label">' + params.node.key + '</span>';
                    if(params.node.aggData) {
                        var needsSeparator = false;
                        for(var agg in params.node.aggData) {
                            var column = gridOptions.columnApi.getColumn(agg);
                            var columnText = column.aggFunc + '(' + column.colDef.headerName + ')';
                            var value = params.node.aggData[agg];
                            if(column.aggFunc != 'count' && column.colDef.valueFormatter) {
                                value = column.colDef.valueFormatter(value.value != undefined ? value : {'value': value });
                            }
                            if(needsSeparator) {
                                label += '<span class="ag-group-aggregate-separator">,</span>';
                            } else {
                                needsSeparator = true;
                            }
                            label += '<span class="ag-group-aggregate">' + columnText + ':</span><span class="ag-group-aggregate-value">'
                            + value + '</span>';
                        }
                    }
                    return label;
                }

                function getColumn(colId) {
                    if($scope.model.columns) {
                        for (var i = 0; i < $scope.model.columns.length; i++) {
                            if($scope.model.columns[i]["id"] == colId || $scope.model.columns[i]["dataprovider"] == colId) {
                                return $scope.model.columns[i];
                            }
                        }
                    }
                    return null;
                }

                function getColumnIndex(colId) {
                    if($scope.model.columns) {
                        for (var i = 0; i < $scope.model.columns.length; i++) {
                            if($scope.model.columns[i]["id"] == colId || $scope.model.columns[i]["dataprovider"] == colId) {
                                return i;
                            }
                        }
                    }
                    return -1;
                }

                function getColumnFormat(colId) {
                    var columnFormat = null;
                    var column = getColumn(colId);
                    if(column && column.format) {
                        columnFormat = {};
                        columnFormat['type'] = column.formatType;
                        if(column.formatType == 'TEXT' && (column.format == '|U' || column.format == '|L')) {
                            if(column.format == '|U') {
                                columnFormat['uppercase'] = true;
                            } else if(column.format == '|L') {
                                columnFormat['lowercase'] = true;
                            }
                        } else {
                            var displayAndEditFormat = column.format.split("|");
                            columnFormat['display'] = displayAndEditFormat[0];
                            if(displayAndEditFormat.length > 1) {
                                columnFormat['edit'] = displayAndEditFormat[1];
                            }
                        }
                    }
                    return columnFormat;
                }

                function isTableGrouped() {
                    var rowGroupCols = gridOptions.columnApi.getRowGroupColumns();
                    return rowGroupCols && rowGroupCols.length > 0;
                }

                function onRowGroupOpened(event) {
                    var column = event.node;
                    var isExpanded = column.expanded;

                    // get group parent
                    var rowGroupInfo = getNodeGroupInfo(column);
                    var rowGroupCols = rowGroupInfo.rowGroupFields;
                    var groupKeys = rowGroupInfo.rowGroupKeys;
                    
                    // Persist the state of an expanded row
                    if (isExpanded) { // add expanded node to cache
                        addRowExpandedState(groupKeys);
                    } else { // remove expanded node from cache when collapsed
                        removeRowExpandedState(groupKeys);
                    }
                    
                    if ($scope.handlers.onRowGroupOpened) {
                        
                        // return the column indexes
                        var rowGroupColIdxs = [];
                        for (var i = 0; i < rowGroupCols.length; i++) {
                            rowGroupColIdxs.push(getColumnIndex(rowGroupCols[i]));
                        }
                        
                        $scope.handlers.onRowGroupOpened(rowGroupColIdxs, groupKeys, isExpanded);
                    }
                }

                /** 
                 * add expanded node to cache
                 * see onRowGroupOpened
                 * 
                 * @param {Array} groupKeys
                 */
                function addRowExpandedState(groupKeys) {
                    
                    if (!$scope.model._internalExpandedState) {
                        $scope.model._internalExpandedState = new Object();
                    }
                    
                    var node = $scope.model._internalExpandedState;
                    
                    // Persist the state of an expanded row
                    for (var i = 0; i < groupKeys.length; i++) {
                        var key = groupKeys[i];
                        
                        if (!node[key]) {
                            node[key] = new Object();
                        }
                        
                        node = node[key];
                    }

                    $scope.svyServoyapi.apply("_internalExpandedState");
                }
                    
                /** 
                 * remove expanded node state from cache
                 * see onRowGroupOpened
                 * @param {Array} groupKeys
                 * 
                 */
                function removeRowExpandedState(groupKeys) {
                    
                    if (!groupKeys) {
                        return;
                    }
                    
                    if (!groupKeys.length) {
                        return;
                    }
                    
                    // search for the group key node
                    var node = $scope.model._internalExpandedState;
                    for (var i = 0; i < groupKeys.length - 1; i++) {
                        var key = groupKeys[i];
                        node = node[key];
                        
                        if (!node) {
                            return;
                        }
                    }
                    
                    // remove the node
                    delete node[groupKeys[groupKeys.length - 1]];
                    
                    $scope.svyServoyapi.apply("_internalExpandedState");
                }
                    
                /**
                 * Returns the group hierarchy for the given node
                 * @param {Object} node
                 * @return {{
                    * 	rowGroupFields : Array<String>,
                    * 	rowGroupKeys: Array
                    * }}
                    * 
                    * */
                function getNodeGroupInfo(node) {
                    var rowGroupCols = [];
                    //var rowGroupColIdxs = [];
                    var groupKeys = [];
                    
                    var isExpanded = node.expanded;
                    
                    var parentNode = node.parent;
                    while (parentNode && parentNode.level >= 0 && parentNode.group === true) {
                        // is reverse order
                        rowGroupCols.unshift(parentNode.field);
                        groupKeys.unshift(parentNode.key);

                        // next node
                        parentNode = parentNode.parent;
                    }
                    
                    var field = node.field;
                    var key = node.key;
                    
                    rowGroupCols.push(field);
                    groupKeys.push(key);
                    
                    var result = {
                        rowGroupFields: rowGroupCols,
                        rowGroupKeys: groupKeys
                    }
                    return result;
                }

                /**
                 * When Column Group Changes
                 */
                function onColumnRowGroupChanged(event) {
                    var columns = event.columns;
                    var groupFields = [];
                    var levelToRemove = null;
                    
                    for (i = 0; i < columns.length; i++) {
                        // cache order of grouped fields
                        var field = columns[i].colDef.field;
                        groupFields.push(field);
                        
                        // TODO i am sure this run always before the onRowGroupOpen ?
                        // Remove the grouped fields
                        if (state.expanded.fields[i] && state.expanded.fields[i] != field) {
                            if (levelToRemove === null || levelToRemove === undefined) levelToRemove = i;
                        }
                    }
                    
                    // clear expanded node if grouped columns change
                    removeRowExpandedStateAtLevel(levelToRemove);
                    
                    // cache order of grouped fields
                    state.expanded.fields = groupFields;
                }

                function onDisplayedColumnsChanged() {
                    sizeColumnsToFit(GRID_EVENT_TYPES.DISPLAYED_COLUMNS_CHANGED);
                }

                /** 
                 * remove state of expanded nodes from level
                 * see onRowGroupChanged
                 * @param {Number} level
                 * 
                 */
                function removeRowExpandedStateAtLevel(level) {
                    if (level === null || level === undefined)  {
                        return;
                    }
        
                    removeNodeAtLevel($scope.model._internalExpandedState, level);
                    
                    function removeNodeAtLevel(node, lvl) {
                        if (!node) {
                            return;
                        }
                        
                        if (node) {
                            for (var key in node) {
                                if (lvl === 0) {
                                    // remove all keys at this level
                                    delete node[key];
                                } else {
                                    // clear subnodes
                                    removeNodeAtLevel(node[key], lvl - 1);
                                }
                            }	
                        }
                    }
                    
                    $scope.svyServoyapi.apply("_internalExpandedState");
                }


                function applyExpandedState() {
                    var expandedState = $scope.model._internalExpandedState;
                    var groupFields = state.expanded.fields;
                    if (isTableGrouped() && groupFields && expandedState) {
                        gridOptions.api.forEachNode(function(node, index) {
                            var rowGroupInfo = getNodeGroupInfo(node);
                            var rowGroupKeys = rowGroupInfo.rowGroupKeys;
                            
                            // check if node is expanded
                            var isExpanded = false;
                    
                            // check if the node is expanded
                            expandedState = $scope.model._internalExpandedState;
                            
                            for (var j = 0; expandedState && j < rowGroupKeys.length; j++) {
                                expandedState = expandedState[rowGroupKeys[j]];
                                if (!expandedState) {
                                    isExpanded = false;
                                    break;
                                } else {
                                    isExpanded = true;
                                }
                            }

                            node.setExpanded(isExpanded);
                        });
                    }
                }
                /**************************************************************************************************
                 **************************************************************************************************
                *
                *  Cell editors
                *
                **************************************************************************************************
                **************************************************************************************************/

                function getTextEditor() {
                    // function to act as a class
                    function TextEditor() {}
                
                    // gets called once before the renderer is used
                    TextEditor.prototype.init = function(params) {
                        // create the cell
                        this.params = params;
                        this.eInput = document.createElement('input');
                        this.eInput.className = "ag-cell-edit-input";

                        this.initialValue = params.value;

                        var v = this.initialValue;
                        this.format = getColumnFormat(params.column.colId);
                        if(this.format) {
                             if (this.format.maxLength) {
                                this.eInput.setAttribute('maxlength', this.format.maxLength);
                            }
                            if(this.format.edit) {
                                v = $formatterUtils.format(v, this.format.edit, this.format.type);
                            }

                            if (v && this.format.type == "TEXT") {
                                if (this.format.uppercase) v = v.toUpperCase();
                                else if (this.format.lowercase) v = v.toLowerCase();
                            }
                        }
                        this.initialDisplayValue = v;

                        var thisEditor = this;

                        if((config.arrowsUpDownMoveWhenEditing && config.arrowsUpDownMoveWhenEditing != 'NONE') || config.editNextCellOnEnter) {
                            this.keyDownListener = function (event) {
                                var isNavigationLeftRightKey = event.keyCode === 37 || event.keyCode === 39;
                                var isNavigationUpDownEntertKey = event.keyCode === 38 || event.keyCode === 40 || event.keyCode === 13;

                                if (isNavigationLeftRightKey || isNavigationUpDownEntertKey) {

                                    if(isNavigationUpDownEntertKey) {

                                        if(config.editNextCellOnEnter && event.keyCode === 13) {
                                            gridOptions.api.tabToNextCell();
                                        } else if(config.arrowsUpDownMoveWhenEditing && config.arrowsUpDownMoveWhenEditing != 'NONE') {
                                            var newEditingNode = null;
                                            var columnToCheck = thisEditor.params.column;
                                            var mustBeEditable = config.arrowsUpDownMoveWhenEditing == 'NEXTEDITABLECELL'
                                            if( event.keyCode == 38) { // UP
                                                if(thisEditor.params.rowIndex > 0) {
                                                    gridOptions.api.forEachNode( function(node) {
                                                        if (node.rowIndex <= (thisEditor.params.rowIndex - 1) &&
                                                            (!mustBeEditable || columnToCheck.isCellEditable(node))) {
                                                            newEditingNode = node;
                                                        }
                                                    });	
                                                }
                                            }
                                            else if (event.keyCode == 13 || event.keyCode == 40) { // ENTER/DOWN
                                                if( thisEditor.params.rowIndex < gridOptions.api.getModel().getRowCount() - 1) {
                                                    gridOptions.api.forEachNode( function(node) {
                                                        if (node.rowIndex >= (thisEditor.params.rowIndex + 1) &&
                                                            !newEditingNode && (!mustBeEditable || columnToCheck.isCellEditable(node))) {
                                                            newEditingNode = node;
                                                        }
                                                    });	
                                                }
                                            }
                                            gridOptions.api.stopEditing();
                                            if (newEditingNode) {
                                                newEditingNode.setSelected(true, true);
        
                                                gridOptions.api.setFocusedCell(newEditingNode.rowIndex, columnToCheck.colId);
                                                if(columnToCheck.isCellEditable(newEditingNode)) {
                                                    gridOptions.api.startEditingCell({
                                                        rowIndex: newEditingNode.rowIndex,
                                                        colKey: columnToCheck.colId
                                                    });
                                                }
                                            }
                                        }
                                        event.preventDefault();
                                    }
                                    event.stopPropagation();
                                }
                            };
                            this.eInput.addEventListener('keydown', this.keyDownListener);
                        }

                        this.keyPressListener = function (event) {
                            var isNavigationLeftRightKey = event.keyCode === 37 || event.keyCode === 39;
                            var isNavigationUpDownEntertKey = event.keyCode === 38 || event.keyCode === 40 || event.keyCode === 13;
                            
                            if(!(isNavigationLeftRightKey || isNavigationUpDownEntertKey) && $formatterUtils.testForNumbersOnly && thisEditor.format) {
                                return $formatterUtils.testForNumbersOnly(event, null, thisEditor.eInput, false, true, thisEditor.format);
                            }
                            else return true;
                        };
                        $(this.eInput).on('keypress', this.keyPressListener);
                    };
                
                    // gets called once when grid ready to insert the element
                    TextEditor.prototype.getGui = function() {
                        return this.eInput;
                    };
                
                    // focus and select can be done after the gui is attached
                    TextEditor.prototype.afterGuiAttached = function() {
                        this.eInput.value = this.initialDisplayValue;
                        this.eInput.focus();
                        this.eInput.select();
                        if(this.format && this.format.edit && this.format.isMask) {
                            var settings = {};
                            settings['placeholder'] = this.format.placeHolder ? this.format.placeHolder : " ";
                            if (this.format.allowedCharacters)
                                settings['allowedCharacters'] = this.format.allowedCharacters;

                            $(this.eInput).mask(this.format.edit, settings);
                        }
                    };

                    // returns the new value after editing
                    TextEditor.prototype.getValue = function() {
                        var displayValue = this.eInput.value;
                        if(this.format) {
                            if(this.format.edit) {
                                displayValue = $formatterUtils.unformat(displayValue, this.format.edit, this.format.type, this.initialValue);
                            }
                            if (this.format.type == "TEXT" && (this.format.uppercase || this.format.lowercase)) {
                                if (this.format.uppercase) displayValue = displayValue.toUpperCase();
                                else if (this.format.lowercase) displayValue = displayValue.toLowerCase();
                            }
                        }
                        return displayValue;
                    };

                    TextEditor.prototype.destroy = function() {
                        this.eInput.removeEventListener('keydown', this.keyDownListener);
                        $(this.eInput).off('keypress', this.keyPressListener);
                    };

                    return TextEditor;
                }

                function getDatePicker() {
                    // function to act as a class
                    function Datepicker() {}
                
                    // gets called once before the renderer is used
                    Datepicker.prototype.init = function(params) {
                        // create the cell
                        this.params = params;
                        this.eInput = document.createElement('input');
                        this.eInput.className = "ag-cell-edit-input";

                        var options = {
                            widgetParent: $(document.body),
                            useCurrent : false,
                            useStrict : true,
                            showClear : true,
                            ignoreReadonly : true,
                            showTodayButton: true,
                            calendarWeeks: true,
                            showClose: true,
                            icons: {
                                close: 'glyphicon glyphicon-ok'
                            }
                        };

                        var locale = $sabloApplication.getLocale();
                        if (locale.language) {
                            options.locale = locale.language;
                        }
                        
                        var showISOWeeks = $applicationService.getUIProperty('ngCalendarShowISOWeeks');
                        if (showISOWeeks)
                        {
                            options.isoCalendarWeeks = true;
                        }	
                        
                        $(this.eInput).datetimepicker(options);

                        var theDateTimePicker = $(this.eInput).data('DateTimePicker');
                        this.hasMask = false;
                        var column = getColumn(params.column.colId);
                        
                        var displayFormat = 'MM/dd/yyyy hh:mm a';
                        var editFormat = 'MM/dd/yyyy hh:mm a';
                        if(column && column.format) {
                            var parsedFormat = column.format;
                            try {
                                var jsonFormat = JSON.parse(column.format);
                                displayFormat = jsonFormat.displayFormat;
                                parsedFormat = jsonFormat.editFormat ? jsonFormat.editFormat : jsonFormat.displayFormat;
                                this.hasMask = jsonFormat.mask;
                                this.maskPlaceholder = jsonFormat.editOrPlaceholder;
                            }
                            catch(e){}                        
                            editFormat = parsedFormat;

                            var splitedEditFormat = editFormat.split("|");
                            if(splitedEditFormat.length === 4 && splitedEditFormat[3] === 'mask') {
                                displayFormat = splitedEditFormat[0]
                                editFormat = splitedEditFormat[1];
                                this.hasMask = true;
                                this.maskPlaceholder = splitedEditFormat[2];
                            }
                            else if(splitedEditFormat.length > 1) {
                                editFormat = splitedEditFormat[1];
                            }
                        }

                        if (this.hasMask) {
                            this.maskSettings = {};
                            this.maskSettings.placeholder = this.maskPlaceholder ? this.maskPlaceholder : " ";

                            theDateTimePicker.format(moment().toMomentFormatString(displayFormat));
                            this.eInput.value = $filter("formatFilter")(params.value, displayFormat, 'DATETIME');
                            this.maskEditFormat = editFormat;
                        } else {
                            theDateTimePicker.format(moment().toMomentFormatString(editFormat));
                            this.eInput.value = $filter("formatFilter")(params.value, editFormat, 'DATETIME');
                            
                            // set key binds
                            $(this.eInput).keydown(datepickerKeyDown);
                            
                            // key binds handler
                            function datepickerKeyDown(e) {
                                if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
                                    return true;
                                }
                                
                                switch (e.keyCode) {
                                case 89: // y Yesterday
                                    var x = $(e.target).data('DateTimePicker');
                                    x.date(moment().add(-1, 'days'));
                                    e.stopPropagation();
                                        e.preventDefault();
                                    break;
                                case 66: // b Beginning ot the month
                                    var x = $(e.target).data('DateTimePicker');
                                    x.date(moment().startOf('month'));
                                    e.stopPropagation();
                                        e.preventDefault();
                                    break;
                                case 69: // e End of the month
                                    var x = $(e.target).data('DateTimePicker');
                                    x.date(moment().endOf('month'));
                                    e.stopPropagation();
                                    e.preventDefault();
                                    break;
                                case 107: // + Add 1 day
                                    var x = $(e.target).data('DateTimePicker');
                                    if (x.date()) {
                                        x.date(x.date().clone().add(1, 'd'));
                                    }
                                    e.stopPropagation();
                                    e.preventDefault();
                                    break;
                                case 109: // - Subtract 1 day
                                    var x = $(e.target).data('DateTimePicker');
                                    if (x.date()) {
                                        x.date(x.date().clone().subtract(1, 'd'));
                                    }
                                    e.stopPropagation();
                                    e.preventDefault();
                                    break;
                                default:
                                    break;
                                }
                                    
                                return true;
                            };
                        }                    
                    };
                
                    // gets called once when grid ready to insert the element
                    Datepicker.prototype.getGui = function() {
                        return this.eInput;
                    };
                
                    // focus and select can be done after the gui is attached
                    Datepicker.prototype.afterGuiAttached = function() {
                        this.eInput.focus();
                        this.eInput.select();
                        if(this.hasMask) {
                            $(this.eInput).mask(this.maskEditFormat, this.maskSettings);
                            // library doesn't handle well this scenario, forward focus event to make sure mask is set
                            if ($(this.eInput).val() == '') $(this.eInput).trigger("focus.mask");
                        }
                    };

                    // returns the new value after editing
                    Datepicker.prototype.getValue = function() {
                        $(this.eInput).change();
                        var theDateTimePicker = $(this.eInput).data('DateTimePicker');
                        var selectedDate = theDateTimePicker.date();
                        return selectedDate ? selectedDate.toDate() : null;
                    };
                
                    // any cleanup we need to be done here
                    Datepicker.prototype.destroy = function() {
                        var theDateTimePicker = $(this.eInput).data('DateTimePicker');
                        if(theDateTimePicker) theDateTimePicker.destroy();
                    };

                    return Datepicker;
                }
                    

                function getFormEditor() {
                    function FormEditor() {}

                    FormEditor.prototype.init = function(params) {
                        this.params = params;

                        $scope.model._internalFormEditorValue = params.value;
                        if($scope.handlers.onColumnFormEditStarted) {
                            $scope.handlers.onColumnFormEditStarted(
                                params.node.rowIndex, getColumnIndex(params.column.colId), params.value);
                        }

                        this.eGui = document.createElement("div");

                        var column = getColumn(params.column.colId);

                        $scope.ngEditFormUrl = null;
                        $scope.svyServoyapi.formWillShow(column.editForm).then(function successCallback() {
                            $scope.ngEditFormUrl = $windowService.getFormUrl(column.editForm);
                        }, function errorCallback(e) {
                            console.log(e);
                        });

                        $scope.getNGEditFormUrl = function() {
                            return $scope.ngEditFormUrl;
                        };

                        this.eGui.innerHTML = '<div id="nggridformeditor" svyform="' + column.editForm +
                            '" ng-include="getNGEditFormUrl()" style="width:' + (column.editFormSize ? column.editFormSize.width : 300) + 'px; height:' + (column.editFormSize ? column.editFormSize.height : 200) + 'px;"></div>';

                        $compile(this.eGui)($scope);
                    };

                    FormEditor.prototype.getGui = function() {
                        return this.eGui;
                    };

                    FormEditor.prototype.afterGuiAttached = function () {
                        gridOptions.api.setFocusedCell(this.params.node.rowIndex, this.params.column.colId);
                    };

                    FormEditor.prototype.isPopup = function() {
                        return true;
                    };

                    FormEditor.prototype.getValue = function() {
                        return $scope.model._internalFormEditorValue;
                    };

                    FormEditor.prototype.destroy = function() {
                        var column = getColumn(this.params.column.colId);
                        $scope.svyServoyapi.hideForm(column.editForm);						
                    };

                    return FormEditor;
                }

                function getHtmlTooltip() {
                    function HtmlTooltip() {}

                    HtmlTooltip.prototype.init = function(params) {
                        this.eGui = document.createElement("div");
                        this.eGui.style = "position: absolute;"
                        this.eGui.className = "tooltip-inner";

                        // AG-GRID always escapes tooltip values, with no option do disable that,
                        // so we need to unescape here ...
                        this.eGui.innerHTML = params.value ? this.unescape(params.value) : '';

                    };

                    HtmlTooltip.prototype.getGui = function() {
                        return this.eGui;
                    };

                    HtmlTooltip.prototype.unescape = function(s) {
                        var re = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34);/g;
                        var unescaped = {
                          '&amp;': '&',
                          '&#38;': '&',
                          '&lt;': '<',
                          '&#60;': '<',
                          '&gt;': '>',
                          '&#62;': '>',
                          '&apos;': "'",
                          '&#39;': "'",
                          '&quot;': '"',
                          '&#34;': '"'
                        };
                        return s.replace(re, function (m) {
                          return unescaped[m];
                        });
                    }

                    return HtmlTooltip;
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
                        skipGroups: skipGroups,
                        processCellCallback: function(processCellParams) {
                            var columnModel = getColumn(processCellParams.column.colId);
                            if(columnModel && columnModel.exportDisplayValue && processCellParams.column.colDef.valueFormatter) {
                                return processCellParams.column.colDef.valueFormatter({value: processCellParams.value });
                            }
                            else {
                                return processCellParams.value;
                            }
                        }
                    };
                    if(asCSV) {
                        gridOptions.api.exportDataAsCsv(params);
                    }
                    else {
                        gridOptions.api.exportDataAsExcel(params);
                    }
                }
                
                /**
                 *  Sets selected rows
                 * 
                 *  @param Array<Number> rowIndexes (0-based)
                 */
                $scope.api.setSelectedRows = function(rowIndexes) {
                    gridOptions.api.forEachNode( function(node) {
                        node.setSelected(rowIndexes.indexOf(node.rowIndex) !== -1);
                    });
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

                /**
                 * Start cell editing (only works when the table is not in grouping mode).
                 * @param rowindex row index of the editing cell (0-based)
                 * @param columnindex column index in the model of the editing cell (0-based)
                 */
                $scope.api.editCellAt = function(rowindex, columnindex) {
                    if(isTableGrouped()) {
                        $log.warn('editCellAt API is not supported in grouped mode');
                    }
                    else if (rowindex < 0) {
                        $log.warn('editCellAt API, invalid rowindex:' + rowindex);
                    }
                    else if(columnindex < 0 || columnindex > $scope.model.columns.length - 1) {
                        $log.warn('editCellAt API, invalid columnindex:' + columnindex);
                    }
                    else {
                        var column = $scope.model.columns[columnindex];
                        var	colId = column["id"] ? column["id"] : column["dataprovider"];
                        setTimeout(function() {
                            gridOptions.api.startEditingCell({
                                rowIndex: rowindex,
                                colKey: colId
                            });
                        }, 0);
                    }
                }

                /**
                 * If a cell is editing, it stops the editing
                 * @param cancel 'true' to cancel the editing (ie don't accept changes)
                 */
                $scope.api.stopCellEditing = function(cancel) {
                    gridOptions.api.stopEditing(cancel);
                }

                /**
                 * Returns pivot mode state
                 */
                $scope.api.isPivotMode = function() {
                    return gridOptions.columnApi.isPivotMode();
                }

                /**
                 * Move column
                 * @param id column id
                 * @param index new position (0-based)
                 */
                 $scope.api.moveColumn = function(id, index) {
                    gridOptions.columnApi.moveColumn(id, index);
                }

                /**
                 * Sets expanded groups
                 *
                 * @param {Object} groups an object like {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
                 */
                $scope.api.setExpandedGroups = function(groups) {
                    $scope.model._internalExpandedState = groups;
                    $scope.svyServoyapi.apply('_internalExpandedState');
                    if(isGridReady) {
                        applyExpandedState();
                    }
                }

                /**
                 * Scroll viewport to matching row
                 * 
                 * @param rowData rowData with at least on attribute, used to find the viewport row to scroll to
                 */
                $scope.api.scrollToRow = function (rowData) {
                    if(isDataRendering) {
                        scrollToRowAfterDataRendering = rowData;
                    }
                    else {
                        var matchingRows = [];
                        gridOptions.api.forEachNode( function(node) {
                            for (var dp in rowData) {
                                if (!node.data || rowData[dp] != node.data[dp]) {
                                    return;
                                }
                            }
                            matchingRows.push(node.rowIndex)
                        });
                        
                        if (matchingRows.length) {
                            gridOptions.api.ensureIndexVisible(matchingRows[0], 'middle');
                        }
                    }
                }
                
                /**
                 * Auto-sizes all columns based on content.
                 * 
                 */
                $scope.api.autoSizeAllColumns = function () {
                    if (isGridReady && gridOptions) {
                        gridOptions.columnApi.autoSizeAllColumns(false);
                    }
                }
            }
            if($scope.model.visible) {
                initGrid();
            } else {
                var visibleWatch = $scope.$watch("model.visible", function() {
                    if($scope.model.visible) {
                        visibleWatch();
                        initGrid();
                    }
                });
            }
        },
        templateUrl: 'aggrid/datasettable/datasettable.html'
    };
}]).run(function() {
    // this is not part of the open source license, can only be used in combination of the Servoy NG Grids components
    agGrid.LicenseManager.setLicenseKey("CompanyName=Servoy B.V.,LicensedApplication=Servoy,LicenseType=SingleApplication,LicensedConcurrentDeveloperCount=7,LicensedProductionInstancesCount=10000,AssetReference=AG-018380,ExpiryDate=11_October_2022_[v2]_MTY2NTQ0MjgwMDAwMA==a725c314c19f2c87b1f6a2f4836eec3e");
});