angular.module('aggridGroupingtable', ['webSocketModule', 'servoy']).directive('aggridGroupingtable', ['$sabloApplication', '$sabloConstants', '$log', '$q', '$foundsetTypeConstants', '$filter', '$compile', '$formatterUtils', '$sabloConverters', '$injector', '$services', "$sanitize", '$window', "$applicationService", "$formService", "$windowService",
	function($sabloApplication, $sabloConstants, $log, $q, $foundsetTypeConstants, $filter, $compile, $formatterUtils, $sabloConverters, $injector, $services, $sanitize, $window, $applicationService, $formService, $windowService) {
		return {
			restrict: 'E',
			scope: {
				model: '=svyModel',
				handlers: '=svyHandlers',
				api: '=svyApi',
				svyServoyapi: '='
			},
			controller: function($scope, $element, $attrs) {
				/* 
				 * TODO Column properties not matching dataset component
				 * 
				 * "headerGroup": {"type" : "tagstring"},
				 * "headerGroupStyleClass" : {"type" : "styleclass"},
				 * "enableFilter": {"type": "boolean", "default" : false},
				 * "cellStyleClassFunc": {"type": "string"},
				 * "cellRendererFunc": {"type": "string"},
				 * 
				 * */

				/*
				 * TODO clear nodes when collapsed ? Make it a configuration
				 * TODO Sort on Group by Default, by id doesn't make much sense, when grouping setTableSort to the group
				 * TODO handle runtimeChanges
				 * rowGroupIndex changes
				 * - Change ColDefs in Grid
				 *
				 * */

				/*
				 * TODO optimization
				 *
				 * Fetch Data
				 * Fetch the next chunk of records to obtain a smoother scrolling experience
				 * Allow paramtrization of chunk size (default 50, 25x50 row, fits 1000 px screen);
				 *
				 * Data Broadcasting
				 * Notify refresh data only when grouped columns are changing (needs to know exactly what has changed ot what, can it actually do that ?)
				 *
				 * */

				/*
				 * Test Cases
				 * RowGroupChanged
				 * 1. Expand nodes A->B
				 * 	  Add A group
				 *    Remove the group in the middle
				 *    Expand nodes A->X
				 *    Reset Group as it was before
				 *    Expand same nodes A->B
				 * 2. Expand nodes A->B
				 *    Clear all groups
				 *    Expand same nodes A->B
				 * 3. Expand nodes A->B
				 *    Invert position of Group A with Group B (CRITIC)
				 *    Expand nodes
				 *    Restore original position and expand nodes again
				 *
				 * Sort
				 * 1. Expand nodes, sort on a column, expand nodes again
				 * 2. Sort on Group column (CRITIC/FAIL)
				 *
				 * Databroadcast - No Groups
				 * 1. Update a record value
				 * 2. Navigate to record 51, and update a record with index < 50
				 * 3. Delete a record
				 * 	  Should select the record below, instead it selects 2 records below itself
				 * 4. Add a record and change selection
				 * 5. Add a record and don't change selection
				 *
				 * FAIL
				 * 1. Create record on top and change selection
				 * 	  Change selected record on grid
				 *    Select new record on grid. Record dataproviders are reset to 0 !!
				 *
				 * Databroadcast - Groups
				 * Edit
				 * 1. Edit record at position 10.000 to a value that is not in group.
				 * 		The foundset may not receive any notificaiton because is not in group
				 *
				 *  */

				/**
				 * @typedef{{
				 * 	resolve: Function,
				 *  then: Function,
				 *  reject: Function,
				 *  promise: PromiseType
				 * }}
				 *
				 * @SuppressWarnings(unused)
				 * */
				var PromiseType;

				/**
				 * @typedef{{
				 * 	colId: String,
				 *  sort: String
				 * }}
				 *
				 * @SuppressWarnings(unused)
				 * */
				var SortModelType;

				/**
				 * @typedef{{
				 * aggFunc: String,
				 * displayName: String,
				 * field: String,
				 * id: String
				 * }}
				 *
				 * @SuppressWarnings(unused)
				 * */
				var RowGroupColType;

				/**
				 * @typedef {{
				 * endRow:Number,
				 * filterModel:Object,
				 * groupKeys:Array<String>,
				 * rowGroupCols:Array<RowGroupColType>,
				 * sortModel:Array<SortModelType>,
				 * startRow: Number,
				 * valueCols: Array
				 * }}
				 * @SuppressWarnings(unused)
				 * */
				var AgDataRequestType;

				$scope.purge = function(count) {
					//console.log(gridOptions.api.getInfinitePageState())

					// an hard refresh is necessary to show the groups
					if (isTableGrouped()) {
						groupManager.removeFoundsetRefAtLevel(0);
					}
					// reset root foundset
					foundset.foundset = $scope.model.myFoundset;

					gridOptions.api.purgeServerSideCache();
					$scope.dirtyCache = false;
					isSelectionReady = false;
					// $log.warn('purge cache');

					// TODO expand previously expanded rows
					//
					//					var columns = state.expanded.columns;
					//					for (var field in columns) {
					//						// FIXME there is no ag-grid method to force group expand for a specific key value
					//					}
				}

				/**
				 *
				 * @private
				 * */
				$scope.printCache = function() {
					console.log($scope.model.hashedFoundsets);
					console.log(foundset.foundset.viewPort);
					console.log(gridOptions.api.getCacheBlockState());
				}

				$scope.showEditorHint = function() {
					return (!$scope.model.columns || $scope.model.columns.length == 0) && $scope.svyServoyapi.isInDesigner();
				}

				$scope.getIconRefreshData = function() {
					return $scope.model.iconConfig && $scope.model.iconConfig.iconRefreshData ?
						$scope.model.iconConfig.iconRefreshData : "glyphicon glyphicon-refresh";
				}

				/* Test Root Foundset Cache */
				function test_validateCache() {
					var cacheBlocks = gridOptions.api.getCacheBlockState();
					for (var i in cacheBlocks) {
						var cacheBlock = cacheBlocks[i];
						var startIndex = foundset.foundset.viewPort.startIndex;
						var endIndex = startIndex + foundset.foundset.viewPort.size;
						if (cacheBlock.startRow < startIndex) {
							if (cacheBlock.pageStatus === "loading") {
								$log.debug("... Loading Block " + cacheBlock.startRow + ' - ' + cacheBlock.endRow + ' is < then cached foundset ' + startIndex + ' - ' + endIndex);
							} else {
								$log.warn("Block " + cacheBlock.startRow + ' - ' + cacheBlock.endRow + ' is < then cached foundset ' + startIndex + ' - ' + endIndex);
							}
						}
						if (cacheBlock.startRow > endIndex) {
							if (cacheBlock.pageStatus === "loading") {
								$log.debug("...Loading Block " + cacheBlock.startRow + ' - ' + cacheBlock.endRow + ' is > then cached foundset ' + startIndex + ' - ' + endIndex);
							} else {
								$log.warn("Block " + cacheBlock.startRow + ' - ' + cacheBlock.endRow + ' is > then cached foundset ' + startIndex + ' - ' + endIndex);
							}
						}
						if (cacheBlock.endRow < startIndex) {
							if (cacheBlock.pageStatus === "loading") {
								$log.debug("...Loading Block " + cacheBlock.startRow + ' - ' + cacheBlock.endRow + ' is < then cached foundset ' + startIndex + ' - ' + endIndex);
							} else {
								$log.warn("Block " + cacheBlock.startRow + ' - ' + cacheBlock.endRow + ' is < then cached foundset ' + startIndex + ' - ' + endIndex);
							}
						}
						if (cacheBlock.endRow > endIndex) {
							if (cacheBlock.pageStatus === "loading") {
								$log.debug("...Loading Block " + cacheBlock.startRow + ' - ' + cacheBlock.endRow + ' is > then cached foundset ' + startIndex + ' - ' + endIndex);
							} else {
								$log.warn("Block " + cacheBlock.startRow + ' - ' + cacheBlock.endRow + ' is > then cached foundset ' + startIndex + ' - ' + endIndex);
							}
						}
					}
				}

				/** Listen for changes */
				Object.defineProperty($scope.model, $sabloConstants.modelChangeNotifier, {
						configurable: true,
						value: function(property, value) {
							switch (property) {
							case "responsiveHeight":
								setHeight();
								break;
							case "visible":
								// if the table was never visible
								if (isRendered === false && value === true) {
									// refresh the columnDefs since was null the first time
									updateColumnDefs();
									isRendered = true;
								}
								break;
							}
						}
					});

				// data can already be here, if so call the modelChange function so that it is initialized correctly.
				//				var modelChangFunction = $scope.model[$sabloConstants.modelChangeNotifier];
				//				for (var key in $scope.model) {
				//					modelChangFunction(key,$scope.model[key]);
				//				}

				$scope.reload = function(count) { }
				var CHUNK_SIZE = 50;
				var CACHED_CHUNK_BLOCKS = 2;

				/**
				 * Store the state of the table. TODO to be persisted
				 * */
				var state = {
					waitfor: {
						sort: 0,
						loadRecords: 0
					},
					/** column mapping by field name e.g. state.columns[field] */
					columns: { },
					foundsetManagers: { },
					/** valuelists stored per field */
					valuelists: { },
					expanded: {
						/** The column collapsed */
						columns: { },
						buffer: []
					},
					/** Store the latest column group, as an ordered array of colId  */
					grouped: {
						columns: []
					},
					/** Store the latest rowGroupCols */
					rowGroupCols: [],
					/** Stor the latest groupKeys*/
					groupKeys: [],
					/** Sort state of the root group */
					rootGroupSort: null
				}

				// used in HTML template to toggle sync button
				$scope.isGroupView = false;

				// set to true when root foundset is loaded
				var isRootFoundsetLoaded = false;

				// set to true when is rendered
				var isRendered = undefined;
				
				// set the true when the grid is ready
				var isGridReady = false;
				
				// set to true once the grid is rendered and the selection is set
				var isSelectionReady = false;
				
				// when the grid is not ready yet set the value to the column index for which has been requested focus
				var requestFocusColumnIndex = -1;

				// when the grid is not ready yet set the value to the foundset/column index for which has been edit cell called
				var startEditFoundsetIndex = -1;
				var startEditColumnIndex = -1;

				var scrollToSelectionWhenSelectionReady = false;

				// foundset sort promise
				var sortPromise;

				// formatFilter function
				var formatFilter = $filter("formatFilter");

				// init the root foundset manager
				var foundset = new FoundSetManager($scope.model.myFoundset, 'root', true);
				// the group manager
				var groupManager = new GroupManager();

				var gridDiv = $element.find('.ag-table')[0];
				var columnDefs = getColumnDefs();
				var sortModelDefault = getSortModel();

				$log.debug(columnDefs);
				$log.debug(sortModelDefault);

				// position of cell with invalid data as reported by the return of onColumnDataChange
				var invalidCellDataIndex = { rowIndex: -1, colKey: ''};
				var onColumnDataChangePromise = null;

				// if aggrid service is present read its defaults
				var toolPanelConfig = null;
				var iconConfig = null;
				var userGridOptions = null
				var localeText = null;
				var mainMenuItemsConfig = null;
				var arrowsUpDownMoveWhenEditing = null;
				if($injector.has('ngDataGrid')) {
					var groupingtableDefaultConfig = $services.getServiceScope('ngDataGrid').model;
					if(groupingtableDefaultConfig.toolPanelConfig) {
						toolPanelConfig = groupingtableDefaultConfig.toolPanelConfig;
					}
					if(groupingtableDefaultConfig.iconConfig) {
						iconConfig = groupingtableDefaultConfig.iconConfig;
					}
					if(groupingtableDefaultConfig.gridOptions) {
						userGridOptions = groupingtableDefaultConfig.gridOptions;
					}
					if(groupingtableDefaultConfig.localeText) {
						localeText = groupingtableDefaultConfig.localeText;
					}
					if(groupingtableDefaultConfig.mainMenuItemsConfig) {
						mainMenuItemsConfig = groupingtableDefaultConfig.mainMenuItemsConfig;
					}
					if(groupingtableDefaultConfig.arrowsUpDownMoveWhenEditing) {
						arrowsUpDownMoveWhenEditing = groupingtableDefaultConfig.arrowsUpDownMoveWhenEditing;
					}
				}

				var config = $scope.model;
				// console.log(config)

				function mergeConfig(target, source) {
					var property;
					
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

				toolPanelConfig = mergeConfig(toolPanelConfig, config.toolPanelConfig);
				iconConfig = mergeConfig(iconConfig, config.iconConfig);
				userGridOptions = mergeConfig(userGridOptions, config.gridOptions);
				localeText = mergeConfig(localeText, config.localeText);
				mainMenuItemsConfig = mergeConfig(mainMenuItemsConfig, config.mainMenuItemsConfig);

				if(config.arrowsUpDownMoveWhenEditing) {
					arrowsUpDownMoveWhenEditing = config.arrowsUpDownMoveWhenEditing;
				}

				var vMenuTabs = ['generalMenuTab', 'filterMenuTab'];
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
									suppressValues: true,
									suppressPivots: true,
									suppressPivotMode: true,
									suppressSideButtons: toolPanelConfig ? toolPanelConfig.suppressSideButtons : false,
									suppressColumnFilter: toolPanelConfig ? toolPanelConfig.suppressColumnFilter : false,
									suppressColumnSelectAll: toolPanelConfig ? toolPanelConfig.suppressColumnSelectAll : false,
									suppressColumnExpandAll: toolPanelConfig ? toolPanelConfig.suppressColumnExpandAll : false
								}
							}
						]
					}
				}

				var gridOptions = {

					debug: false,
					rowModelType: 'serverSide',
					rowGroupPanelShow: 'onlyWhenGrouping', // TODO expose property

					defaultColDef: {
						width: 0,
						filter: false,
						valueGetter: displayValueGetter,
						valueFormatter: displayValueFormatter,
						menuTabs: vMenuTabs,
						sortable: config.enableSorting,
						resizable: config.enableColumnResize
					},
					columnDefs: columnDefs,
					getMainMenuItems: getMainMenuItems,

					rowHeight: $scope.model.rowHeight,
					// TODO enable it ?					rowClass: $scope.model.rowStyleClass,	// add the class to each row

					suppressContextMenu: false,
					suppressMovableColumns: !config.enableColumnMove,
					suppressAutoSize: true,
					autoSizePadding: 25,
					suppressFieldDotNotation: true,

					// suppressMovingInCss: true,
					suppressColumnMoveAnimation: true,
					suppressAnimationFrame: true,

					rowSelection: 'multiple',
					rowDeselection: true,
					suppressCellSelection: true, // TODO implement focus lost/gained
					enableRangeSelection: false,

					stopEditingWhenGridLosesFocus: true,
					singleClickEdit: false,
					suppressClickEdit: false,
					enableGroupEdit: false,
					groupUseEntireRow: config.groupUseEntireRow,
					groupMultiAutoColumn: true,
					suppressAggFuncInHeader: true, // TODO support aggregations

					suppressColumnVirtualisation: false,
					suppressScrollOnNewData: true,

					pivotMode: false,
					// use the enterprise row model
					// bring back data 50 rows at a time
					// don't show the grouping in a panel at the top
					animateRows: false,
					enableCellExpressions: true,

					rowBuffer: 0,
					// restrict to 2 server side calls concurrently
					maxConcurrentDatasourceRequests: 2,
					cacheBlockSize: CHUNK_SIZE,
					infiniteInitialRowCount: CHUNK_SIZE, // TODO should be the foundset default (also for grouping ?)
					maxBlocksInCache: CACHED_CHUNK_BLOCKS,
					purgeClosedRowNodes: true,
					onGridReady: function() {
						$log.debug("gridReady");
						isGridReady = true;
						if(isRendered) {
							if($scope.model._internalColumnState !== "_empty") {
								$scope.model.columnState = $scope.model._internalColumnState;
								// need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
								$scope.model._internalColumnState = "_empty";
								$scope.svyServoyapi.apply('_internalColumnState');
							}
							restoreColumnsState();
						}
						gridOptions.onDisplayedColumnsChanged = function() {
							sizeHeaderAndColumnsToFit();
							storeColumnsState();
						};
						if($scope.handlers.onReady) {
							$scope.handlers.onReady();
						}
						// without timeout the column don't fit automatically
						setTimeout(function() {
							sizeHeaderAndColumnsToFit();
							scrollToSelection();
							}, 150);
					},
					onGridSizeChanged: function() {
						setTimeout(function() {
							// if not yet destroyed
							if(gridOptions.onGridSizeChanged) {
								sizeHeaderAndColumnsToFit();
							}
						}, 150);
					},
//	                onColumnEverythingChanged: storeColumnsState,	// do we need that ?, when is it actually triggered ?
					onFilterChanged: storeColumnsState,
					onSortChanged: function() {
						storeColumnsState();
						if(isTableGrouped()) {
							groupManager.removeFoundsetRefAtLevel(0);
							gridOptions.api.purgeServerSideCache();
						}
						if($scope.handlers.onSort) {
							var sortModel = gridOptions.api.getSortModel();
							if(sortModel && sortModel[0]) {
								var sortColumn = getColumnIndex(sortModel[0].colId);
								var sortColumnDirection = sortModel[0].sort;
								$scope.handlers.onSort(sortColumn, sortColumnDirection);
							}
						}
					},
//	                onColumnVisible: storeColumnsState,			 covered by onDisplayedColumnsChanged
//	                onColumnPinned: storeColumnsState,			 covered by onDisplayedColumnsChanged
					onColumnResized: function() {				 // NOT covered by onDisplayedColumnsChanged
						sizeHeader();
						storeColumnsState();
					},
					onColumnVisible: function(event) {
						// workaround for ag-grid issue, when unchecking/checking all columns
						// visibility in the side panel, columns with colDef.hide = true are also made visible
						if(event.visible && event.columns && event.columns.length) {
							var hiddenColumns = [];
							for(var i = 0; i < event.columns.length; i++) {
								// always hide Ghost columns such as _svyRowId and _svyFoundsetUUID
								if(event.columns[i].colDef.hide && (event.columns[i].colDef.suppressToolPanel || event.columns[i].colDef.suppressColumnsToolPanel) && event.columns[i].colDef.suppressMenu) {
									hiddenColumns.push(event.columns[i]);
								}
							}
							gridOptions.columnApi.setColumnsVisible(hiddenColumns, false)
						}
					},
//	                onColumnRowGroupChanged: storeColumnsState,	 covered by onDisplayedColumnsChanged
//	                onColumnValueChanged: storeColumnsState,
//	                onColumnMoved: storeColumnsState,              covered by onDisplayedColumnsChanged
//	                onColumnGroupOpened: storeColumnsState		 i don't think we need that, it doesn't include the open group in column state
					
					getContextMenuItems: getContextMenuItems,
					getRowNodeId: function(data) {
						return data._svyFoundsetUUID + '_' + data._svyFoundsetIndex;
					},
					// TODO localeText: how to provide localeText to the grid ? can the grid be shipped with i18n ?

					navigateToNextCell: keySelectionChangeNavigation,
					tabToNextCell: tabSelectionChangeNavigation,

					sideBar : sideBar,
					popupParent: gridDiv,
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
					},
					enableBrowserTooltips: true,
					onToolPanelVisibleChanged : function(event) {
						sizeHeaderAndColumnsToFit();
					}
				};
				
				// check if we have filters
				for(var i = 0; gridOptions.sideBar && gridOptions.sideBar.toolPanels && i < columnDefs.length; i++) {
					// suppress the side filter if the suppressColumnFilter is set to true
					if (!(toolPanelConfig && toolPanelConfig.suppressColumnFilter == true)) {
						if(columnDefs[i].suppressFilter === false) {
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
				}
				
				var gridFooterData = getFooterData();
				if (gridFooterData) {
					gridOptions.pinnedBottomRowData = gridFooterData;
				}

				// TODO check if test enabled
				//gridOptions.ensureDomOrder = true;

				// rowStyleClassDataprovider
				if ($scope.model.rowStyleClassDataprovider) {
					gridOptions.getRowClass = getRowClass;
				}

				// https://www.ag-grid.com/javascript-grid-icons/#gsc.tab=0
				var icons = new Object();

				// set the icons
				if ($.isEmptyObject(iconConfig)) {
					// set the default icons
					iconConfig = {
						iconGroupExpanded: 'glyphicon glyphicon-minus ag-icon',
						iconGroupContracted: 'glyphicon glyphicon-plus ag-icon'
					};
				}

				// set all custom icons
	            if (iconConfig) {
	                var icons = new Object();
	                
	                for (var iconName in iconConfig) {                	
	                	var aggridIcon = iconName.slice(4);
	                	aggridIcon = aggridIcon[0].toLowerCase() + aggridIcon.slice(1);
	                	icons[aggridIcon] = getIconElement(iconConfig[iconName]);
	                }
	                gridOptions.icons = icons
	            }
				
				// set a fixed height if is in designer
				setHeight();

				// locale text
				if (localeText) {
					gridOptions['localeText'] = localeText; 
				}

				// fill user grid options properties
				if (userGridOptions) {
					for (var property in userGridOptions) {
						if (userGridOptions.hasOwnProperty(property)) {
							gridOptions[property] = userGridOptions[property];
						}
					}
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

					if ($scope.model.visible === false) {
						// rerender next time model.visible will be true
						isRendered = false;
					} else {
						isRendered = true;
					}

				}

				// default selection
				selectedRowIndexesChanged();

				// default sort order
				if(gridOptions.enableServerSideSorting) {
					gridOptions.api.setSortModel(sortModelDefault);
				}

				// register listener for selection changed
				gridOptions.api.addEventListener('selectionChanged', onSelectionChanged);

				// grid handlers
				var clickTimer;
				function cellClickHandler(params) {
					if(params.node.rowPinned) {
						if (params.node.rowPinned == "bottom" && $scope.handlers.onFooterClick) {
							var columnIndex = getColumnIndex(params.column.colId);
							$scope.handlers.onFooterClick(columnIndex, params.event);
						}
					}
					else {
						if($scope.handlers.onCellDoubleClick) {
							if(clickTimer) {
								clearTimeout(clickTimer);
								clickTimer = null;
							}
							else {
								clickTimer = setTimeout(function() {
									clickTimer = null;
									onCellClicked(params);
								}, 250);
							}
						}
						else {
							// Added setTimeOut to enable onColumnDataChangeEvent to go first
							setTimeout(function() {
								onCellClicked(params);
							}, 250);
						}
					}
				}
				gridOptions.api.addEventListener('cellClicked', cellClickHandler);
				gridOptions.api.addEventListener('cellDoubleClicked', onCellDoubleClicked);
				gridOptions.api.addEventListener('cellContextMenu', onCellContextMenu);

				// listen to group changes
				gridOptions.api.addEventListener('columnRowGroupChanged', onColumnRowGroupChanged);

				// listen to group collapsed
				//				gridOptions.api.addEventListener('rowGroupOpened', onRowGroupOpened);

				/**
				 * Grid Event
				 * @private
				 *
				 * */
				var onSelectionChangedTimeout = null;
				var requestSelectionPromises = new Array();
				function onSelectionChanged(event) {
					if(onSelectionChangedTimeout) {
						clearTimeout(onSelectionChangedTimeout);
					}
					onSelectionChangedTimeout = setTimeout(function() {
						onSelectionChangedTimeout = null;
						onSelectionChangedEx();
					}, 250);
				}

				function onSelectionChangedEx() {
					
					// Don't trigger foundset selection if table is grouping
					if (isTableGrouped()) {
						
                        // Trigger event on selection change in grouo mode
                        if ($scope.handlers.onSelectedRowsChanged) {
                            $scope.handlers.onSelectedRowsChanged();
                        }
						
						return;
					}
					
					// set to true once the grid is ready and selection is set
				    isSelectionReady = true;
				
					if(scrollToSelectionWhenSelectionReady) {
						$scope.api.scrollToSelection();
					}

					// rows are rendered, if there was an editCell request, now it is the time to apply it
					if(startEditFoundsetIndex > -1 && startEditColumnIndex > -1) {
						setTimeout(function() {
							$scope.api.editCellAt(startEditFoundsetIndex, startEditColumnIndex);
						}, 200);
					}

				    // when the grid is not ready yet set the value to the column index for which has been requested focus
				    if (requestFocusColumnIndex > -1) {
				    	$scope.api.requestFocus(requestFocusColumnIndex);
				    }

					var selectedNodes = gridOptions.api.getSelectedNodes();
					if (selectedNodes.length > 0) {
						var foundsetIndexes = new Array();

						for(var i = 0; i < selectedNodes.length; i++) {
							var node = selectedNodes[i];
							if(node) foundsetIndexes.push(node.rowIndex);				
						}
						if(foundsetIndexes.length > 0) {
							foundsetIndexes.sort(function(a, b){return a - b});
							// if single select don't send the old selection along with the new one, to the server
							if(!foundset.foundset.multiSelect && foundsetIndexes.length > 1 &&
								foundset.foundset.selectedRowIndexes.length > 0) {
									if(foundset.foundset.selectedRowIndexes[0] == foundsetIndexes[0]) {
										foundsetIndexes = foundsetIndexes.slice(-1);
									} else if(foundset.foundset.selectedRowIndexes[0] == foundsetIndexes[foundsetIndexes.length - 1]) {
										foundsetIndexes = foundsetIndexes.slice(0, 1);
									}
							}
							var requestSelectionPromise = foundset.foundset.requestSelectionUpdate(foundsetIndexes);
							requestSelectionPromises.push(requestSelectionPromise);
							requestSelectionPromise.then(
								function(serverRows){
									if(requestSelectionPromises.shift() != requestSelectionPromise) {
										$log.error('requestSelectionPromises out of sync');
									}
				                    // Trigger event on selection change
				                    if ($scope.handlers.onSelectedRowsChanged) {
				                        $scope.handlers.onSelectedRowsChanged();
				                    }
									
									//success
								},
								function(serverRows){
									if(requestSelectionPromises.shift() != requestSelectionPromise) {
										$log.error('requestSelectionPromises out of sync');
									}
									//canceled 
									if (typeof serverRows === 'string'){
										return;
									}
									//reject
									selectedRowIndexesChanged();
								}
							);
							return;
						}

					}
					$log.debug("table must always have a selected record");
					selectedRowIndexesChanged();

				}
				/**
				 * On ClickEvent
				 *
				 * @private
				 * */
				function onCellClicked(params) {
					$log.debug(params);
					if ($scope.handlers.onCellClick) {
						//						var row = params.data;
						//						var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
						//						if (!foundsetManager) foundsetManager = foundset;
						//						var foundsetRef = foundsetManager.foundset;
						//
						//						var foundsetIndex;
						//						if (isTableGrouped()) {
						//							// TODO search for grouped record in grouped foundset (may not work because of caching issues);
						//							$log.warn('select grouped record not supported yet');
						//							foundsetIndex = foundsetManager.getRowIndex(row);
						//						} else {
						//							foundsetIndex = params.node.rowIndex;
						//						}
						//
						//						var columnIndex = getColumnIndex(params.colDef.field);
						//						var record;
						//						if (foundsetIndex > -1) {
						//							// FIXME cannot resolve the record when grouped, how can i rebuild the record ?
						//							// Can i pass in the array ok pks ? do i know the pks ?
						//							// Can i get the hasmap of columns to get the proper dataProviderID name ?
						//							record = foundsetRef.viewPort.rows[foundsetIndex - foundsetRef.viewPort.startIndex];
						//						}
						//						// no foundset index if record is grouped
						//						if (foundsetManager.isRoot === false) {
						//							foundsetIndex = -1;
						//						}

						var foundsetIndex = getFoundsetIndexFromEvent(params);
						var columnIndex = getColumnIndex(params.column.colId);
						var recordPromise = getFoundsetRecord(params);

						recordPromise.then(function(record) {

							// FIXME with R&D, doesn't translate the record when grouped (because not from root foundset cache).
							// How to retrieve the record ? Via Mapping or via PK ?
							$scope.handlers.onCellClick(foundsetIndex, columnIndex, record, params.event);
						}).catch(function(e) {
							$log.error(e);
							$scope.handlers.onCellClick(foundsetIndex, columnIndex, null, params.event);
						});

					}
				}

				/**
				 * @return {Number}
				 * */
				function getFoundsetIndexFromEvent(params) {
					var foundsetIndex;
					if (isTableGrouped()) {
						$log.warn('select grouped record not supported yet');
						foundsetIndex = -1;
						// TODO use serverside API getRecordIndex
					} else {
						foundsetIndex = params.node.rowIndex + 1;
					}
					return foundsetIndex;
				}

				/**
				 * @return {PromiseType}
				 * */
				function getFoundsetRecord(params) {
					/** @type {PromiseType} */
					var promiseResult = $q.defer();
					var row = params.data;
					var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
					if (!foundsetManager) foundsetManager = foundset;
					var foundsetRef = foundsetManager.foundset;
					var foundsetUUID = foundsetManager.foundsetUUID;

					// if is a root resolve immediately
					if (foundsetManager.isRoot) {
						foundsetUUID = null;

						//						var foundsetIndex = getFoundsetIndexFromEvent(params);
						//						var record = foundsetRef.viewPort.rows[foundsetIndex - foundsetRef.viewPort.startIndex];
						//						promiseResult.resolve(record);
					}
					//else {
					$scope.svyServoyapi.callServerSideApi("getFoundsetRecord",
						[foundsetUUID, row._svyRowId]).then(function(record) {
						$log.debug(record);
						promiseResult.resolve(record);
					}).catch(function(e) {
						$log.error(e);
						promiseResult.resolve(null);
					});
					//}
					return promiseResult.promise;
				}

				function updateFoundsetRecord(params) {
					var rowIndex = params.node.rowIndex;
					var colId = params.column.colId;

					// if we have an invalid cell data, ignore any updates for other cells
					if((invalidCellDataIndex.rowIndex != -1 && invalidCellDataIndex.rowIndex != rowIndex)
						|| (invalidCellDataIndex.colKey != '' && invalidCellDataIndex.colKey != colId)) {
						return;
					}

					var row = params.data;
					var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
					if (!foundsetManager) foundsetManager = foundset;
					var foundsetRef = foundsetManager.foundset;
					var newValue = params.newValue;
					if(newValue && newValue.realValue !== undefined) {
						newValue = newValue.realValue;
					}
					var oldValue = params.oldValue;
					if(oldValue && oldValue.realValue !== undefined) {
						oldValue = oldValue.realValue;
					}
					var oldValueStr = oldValue;
					if(oldValueStr == null) oldValueStr = "";

					var col = getColumn(params.colDef.field);
					if(col && col.dataprovider && col.dataprovider.idForFoundset && (newValue != oldValueStr || invalidCellDataIndex.rowIndex != -1)) {
						if(newValue != oldValueStr) {
							foundsetRef.updateViewportRecord(row._svyRowId, col.dataprovider.idForFoundset, newValue, oldValue);
						}
						if($scope.handlers.onColumnDataChange && newValue != oldValueStr) {
							var currentEditCells = gridOptions.api.getEditingCells();
							onColumnDataChangePromise = $scope.handlers.onColumnDataChange(
								getFoundsetIndexFromEvent(params),
								getColumnIndex(params.column.colId),
								oldValue,
								newValue,
								createJSEvent()
							);
							onColumnDataChangePromise.then(function(r) {
								if(r == false) {
									// if old value was reset, clear invalid state
									var currentValue = gridOptions.api.getValue(colId, params.node);
									if(currentValue && currentValue.realValue !== undefined) {
										currentValue = currentValue.realValue;
									}
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

				/**
				 * On Double Click Event
				 *
				 * @private
				 * */
				function onCellDoubleClicked(params) {
					$log.debug(params);
					if ($scope.handlers.onCellDoubleClick && !params.node.rowPinned) {
						//						var row = params.data;
						//						var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
						//						if (!foundsetManager) foundsetManager = foundset;
						//						var foundsetRef = foundsetManager.foundset;
						//						var foundsetIndex;
						//						if (isTableGrouped()) {
						//							// TODO search for grouped record in grouped foundset (may not work because of caching issues);
						//							$log.warn('select grouped record not supported yet');
						//							foundsetIndex = foundsetManager.getRowIndex(row);
						//						} else {
						//							foundsetIndex = params.node.rowIndex;
						//						}
						//
						//						var columnIndex = getColumnIndex(params.colDef.field);
						//						var record;
						//						if (foundsetIndex > -1) {
						//							// FIXME cannot resolve the record when grouped, how can i rebuild the record ?
						//							// Can i pass in the array ok pks ? do i know the pks ?
						//							// Can i get the hasmap of columns to get the proper dataProviderID name ?
						//							record = foundsetRef.viewPort.rows[foundsetIndex - foundsetRef.viewPort.startIndex];
						//						}
						//
						//						// no foundset index if record is grouped
						//						if (foundsetManager.isRoot === false) {
						//							foundsetIndex = -1;
						//						}
						//						$scope.handlers.onCellDoubleClick(foundsetIndex, columnIndex, record, params.event);

						var foundsetIndex = getFoundsetIndexFromEvent(params);
						var columnIndex = getColumnIndex(params.column.colId);
						var recordPromise = getFoundsetRecord(params);

						recordPromise.then(function(record) {

							// FIXME with R&D, doesn't translate the record when grouped (because not from root foundset cache).
							// How to retrieve the record ? Via Mapping or via PK ?
							$scope.handlers.onCellDoubleClick(foundsetIndex, columnIndex, record, params.event);
						}).catch(function(e) {
							$log.error(e);
							$scope.handlers.onCellDoubleClick(foundsetIndex, columnIndex, null, params.event);
						});

					}
				}

				/**
				 * On Right Click event
				 *
				 * @private
				 * */
				function onCellContextMenu(params) {
					$log.debug(params);
					if ($scope.handlers.onCellRightClick && !params.node.rowPinned) {
						//						var row = params.data;
						//						var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
						//						if (!foundsetManager) foundsetManager = foundset;
						//						var foundsetRef = foundsetManager.foundset;
						//						var foundsetIndex;
						//						if (isTableGrouped()) {
						//							// TODO search for grouped record in grouped foundset (may not work because of caching issues);
						//							$log.warn('select grouped record not supported yet');
						//							foundsetIndex = foundsetManager.getRowIndex(row);
						//						} else {
						//							foundsetIndex = params.node.rowIndex;
						//						}
						//
						//						var columnIndex = getColumnIndex(params.colDef.field);
						//						var record;
						//						if (foundsetIndex > -1) {
						//							record = foundsetRef.viewPort.rows[foundsetIndex - foundsetRef.viewPort.startIndex];
						//						}
						//
						//						// no foundset index if record is grouped
						//						if (foundsetManager.isRoot === false) {
						//							foundsetIndex = -1;
						//						}
						//						$scope.handlers.onCellRightClick(foundsetIndex, columnIndex, record, params.event);

						var foundsetIndex = getFoundsetIndexFromEvent(params);
						var columnIndex = getColumnIndex(params.column.colId);
						var recordPromise = getFoundsetRecord(params);

						recordPromise.then(function(record) {

							// FIXME with R&D, doesn't translate the record when grouped (because not from root foundset cache).
							// How to retrieve the record ? Via Mapping or via PK ?
							$scope.handlers.onCellRightClick(foundsetIndex, columnIndex, record, params.event);
						}).catch(function(e) {
							$log.error(e);
							$scope.handlers.onCellRightClick(foundsetIndex, columnIndex, null, params.event);
						});

					}
				}
				
				/**
				 * Context menu callback
				 *  */
				function getContextMenuItems(params) {
					// hide any context menu
					return [];
				}

				function keySelectionChangeNavigation(params) {
					var previousCell = params.previousCellPosition;
					var suggestedNextCell = params.nextCellPosition;
				 
					var KEY_UP = 38;
					var KEY_DOWN = 40;
					var KEY_LEFT = 37;
					var KEY_RIGHT = 39;
				 
					switch (params.key) {
						case KEY_DOWN:
							// set selected cell on current cell + 1
							gridOptions.api.forEachNode( function(node) {
								if (previousCell.rowIndex + 1 === node.rowIndex) {
									node.setSelected(true, true);
								}
							});
							return suggestedNextCell;
						case KEY_UP:
							// set selected cell on current cell - 1
							gridOptions.api.forEachNode( function(node) {
								if (previousCell.rowIndex - 1 === node.rowIndex) {
									node.setSelected(true, true);
								}
							});
							return suggestedNextCell;
						case KEY_LEFT:
						case KEY_RIGHT:
							return suggestedNextCell;
						default:
							throw "this will never happen, navigation is always on of the 4 keys above";
					}					
				}

				function tabSelectionChangeNavigation(params) {
					var suggestedNextCell = params.nextCellPosition;

					if(suggestedNextCell) {
						var suggestedNextCellSelected = false;
						var selectedNodes = gridOptions.api.getSelectedNodes();
						for(var i = 0; i < selectedNodes.length; i++) {
							if(suggestedNextCell.rowIndex == selectedNodes[i].rowIndex) {
								suggestedNextCellSelected = true;
								break;
							}
						}

						if(!suggestedNextCellSelected) {
							gridOptions.api.forEachNode( function(node) {
								if (suggestedNextCell.rowIndex === node.rowIndex) {
									node.setSelected(true, true);
								}
							});
						}
					}

					return suggestedNextCell;
				}

				/**
				 * When Column Group Changes
				 * @private
				 * */
				function onColumnRowGroupChanged(event) {
					// return;
					var rowGroupCols = event.columns;
					// FIXME why does give an error,  i don't uderstand
					var i;
					var column;
					$log.debug(event);

					// store in columns the change
					if (!rowGroupCols || rowGroupCols.length === 0) {
						if($scope.isGroupView) {
							// clear filter
							gridOptions.api.setFilterModel(null);
							gridOptions.api.deselectAll();
						}
						$scope.isGroupView = false;
						state.rootGroupSort = null;

						// TODO clear group when changed
						//groupManager.clearAll();
						groupManager.removeFoundsetRefAtLevel(0);

						// clear all columns
						for (i = 0; i < $scope.model.columns.length; i++) {
							column = $scope.model.columns[i];
							if (column.hasOwnProperty('rowGroupIndex')) {
								column.rowGroupIndex = -1;
							}
						}

					} else {
						if(!$scope.isGroupView) {
							// clear filter
							gridOptions.api.setFilterModel(null);
							gridOptions.api.deselectAll();
						}
						$scope.isGroupView = true;

						var groupedFields = [];

						// set new rowGroupIndex
						for (i = 0; i < rowGroupCols.length; i++) {
							var rowGroupCol = rowGroupCols[i];
							var field = rowGroupCol.colDef.field;
							groupedFields.push(field);
							column = getColumn(field);
							column.rowGroupIndex = i;
						}

						// reset all other columns;
						for (i = 0; i < $scope.model.columns.length; i++) {
							column = $scope.model.columns[i];
							if (groupedFields.indexOf(getColumnID(column, i)) === -1) {
								if (column.hasOwnProperty('rowGroupIndex')) {
									column.rowGroupIndex = -1;
								}
							}

						}

						// clear HashTreeCache if column group state changed
						for (i = 0; state.grouped.columns && i < state.grouped.columns.length; i++) {
							// if the column has been removed or order of columns has been changed
							if (i >= event.columns.length || state.grouped.columns[i] != event.columns[i].colId) {
								//	if (i === 0) {
								// FIXME does it breaks it, why does it happen ? concurrency issue ?
								//	groupManager.clearAll();
								// FIXME this is a workadound, i don't why does it fail when i change a root level (same issue of sort and expand/collapse)
								//		groupManager.clearAll();
								//	} else {
								// Clear Column X and all it's child
								// NOTE: level are at deep 2 (1 column + 1 key)
								var level = Math.max(0, (i * 2) - 1);
								groupManager.removeFoundsetRefAtLevel(level);
								//	}
								break;
							}
						}
						// TODO remove logs
						$log.debug($scope.model.hashedFoundsets);
						$log.debug(state.foundsetManagers);

					}

					// persist grouped columns state
					setStateGroupedColumns(event.columns);

					// resize the columns
					setTimeout(function() {
						sizeHeaderAndColumnsToFit();
					}, 50);
					
					// scroll to the selected row when switching from Group to plain view.
					// without timeout the column don't fit automatically
					setTimeout(function() {
						scrollToSelection();
					}, 150);

				}

				/**
				 * Suppress or enable row slection
				 * @param {Boolean} enabled
				 * @private
				 * */
				function enableRowSelection(enabled) {
					if (enabled) {
						// enable selection
						gridOptions.suppressRowClickSelection = false;
						selectedRowIndexesChanged(foundset);
					} else {
						// disable selection
						gridOptions.suppressRowClickSelection = true;
						var selectedNodes = gridOptions.api.getSelectedNodes();
						for (i = 0; i < selectedNodes.length; i++) {
							selectedNodes[i].setSelected(false);
						}
					}
				}

				/**
				 * Grid Event
				 * @deprecated
				 * @private
				 * */
				function onRowGroupOpened(event) {
					$log.debug(event);
					// TODO remove foundset from memory when a group is closed

					var column = event.node;
					var field = column.field;
					var key = column.key;
					var groupIndex = column.level;
					var isExpanded = column.expanded;

					// TODO doesn't make sense if i can't make a particoular row to open via API
					// Persist the state of an expanded row
					var expandedState = state.expanded;
					if (isExpanded) { // add expanded node to cache
						if (!expandedState.columns[field]) {
							expandedState.columns[field] = new Object();
						}
						var node = expandedState.columns[field];
						node[key] = groupIndex;
					} else { // remove expanded node from cache when collapsed
						if (expandedState.columns[field]) {
							delete expandedState.columns[field][key];
						}
					}

					// TODO expose model property to control perfomance
					if (isExpanded === false && $scope.model.perfomanceClearCacheStateOnCollapse === true) {
						// FIXME remove foundset based on values
						groupManager.removeChildFoundsetRef(column.data._svyFoundsetUUID, column.field, column.data[field]);
					}
					// TODO remove logs
					//					console.log($scope.model.hashedFoundsets);
					//					console.log(state.foundsetManagers);

					//var foundsetManager = getFoundsetManagerByFoundsetUUID(column.data._svyFoundsetUUID);
					//foundsetManager.destroy();

				}

				var NULL_VALUE = {displayValue: '', realValue: null};

				/**
				 * Returns the formatted value
				 * Compute value format and column valuelist
				 * @private
				 *
				 * @return {Object}
				 *  */
				function displayValueFormatter(params) {
					var field = params.colDef.field;
					if (!params.data) {
						return undefined;
					}
					var value = params.data[field];
					if (value && value.displayValue != undefined) {
						value = value.displayValue;
					}
					// skip format for pinned rows (footer), they are always text
					if(!params.node.rowPinned) {
						var column = getColumn(params.column.colId);

						if (column && column.format ) {
							value = formatFilter(value, column.format.display, column.format.type, column.format);
						}
					}

					if (value == null && params.value == NULL_VALUE) {
						value = '';
					}

					return value;
				}
				
				function displayValueGetter(params) {
					var field = params.colDef.field;
					if (field && params.data) {
						var value = params.data[field];

						if (value == null) {
							value = NULL_VALUE; // need to use an object for null, else grouping won't work in ag grid
						}
						return value;
					}

					return undefined;				
				}

				/**`
				 * Resize header and all columns so they can fit the horizontal space
				 *  */
				function sizeHeaderAndColumnsToFit() {
					if($scope.model.visible) {
						gridOptions.api.sizeColumnsToFit();
						sizeHeader();
					}
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

				/**
				 * Return the icon element with the given font icon class
				 *
				 * @return {String} <i class="iconStyleClass"/>
				 *  */
				function getIconElement(iconStyleClass) {
					return '<i class="' + iconStyleClass + '"/>';
				}

				/**************************************************************************************************
				 **************************************************************************************************
				 *
				 *  Cell editors
				 *
				 **************************************************************************************************
				 **************************************************************************************************/

				function getValuelist(params, asCodeString) {
					return getValuelistEx(params.node.data, params.column.colId, asCodeString)
				}

				function getValuelistEx(row, colId, asCodeString) {
					var column;
					var foundsetRows;

					var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
					// if not root, it should use the column/foundsetRows from the hashed map
					if (foundsetManager.isRoot) {
						column = getColumn(colId);
						foundsetRows = $scope.model.myFoundset.viewPort.rows;
					} else if ($scope.model.hashedFoundsets) {
						for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
							if ($scope.model.hashedFoundsets[i].foundsetUUID == foundsetManager.foundsetUUID) {
								column = getColumn(colId, $scope.model.hashedFoundsets[i].columns);
								foundsetRows = foundsetManager.foundset.viewPort.rows;
								break;
							}
						}
					}
					if(!column || !foundsetRows) {
						$log.error('Cannot find column/foundset to read the valuelist.');
						return null;
					}

					// if it's a foundset linked prop (starting with Servoy 8.3.2) or not (prior to 8.3.2)
					if (column.valuelist && column.valuelist[$sabloConverters.INTERNAL_IMPL]
							&& angular.isDefined(column.valuelist[$sabloConverters.INTERNAL_IMPL]["recordLinked"])) {
						// _svyRowId: "5.10643;_0"
						var rowId = row[$foundsetTypeConstants.ROW_ID_COL_KEY];
						
						if (column.valuelist.length == 0 && foundsetRows.length > 0) {
							// this if is just for backwards compatilility editing comboboxes with valuelists with Servoy < 8.3.3 (there the foundset-linked-in-spec valuelists in custom objects
							// would not be able to reference their foundset from client-side JS => for valuelists that were not actually linked
							// client side valuelist.js would simulate a viewport that has as many items as the foundset rows containing really the same valuelist object
							// and this did not work until the fix of SVY-12718 (valuelist.js was not able to find foundset from the same custom object) => valuelist viewport
							// was length 0; this whole if can be removed once groupingtable's package will require Servoy >= 8.3.3
							
							// fall back to what was done previously - use root valuelist and foundset to resolve stuff (which will probably work except for related valuelists)
							column = getColumn(colId);
							foundsetRows = $scope.model.myFoundset.viewPort.rows;
						}
						
						var idxInFoundsetViewport = -1;
						for (var idx in foundsetRows)
							if (foundsetRows[idx][$foundsetTypeConstants.ROW_ID_COL_KEY].indexOf(rowId) == 0) {
								idxInFoundsetViewport = idx;
								break;
							}
						
						if (idxInFoundsetViewport >= 0 && idxInFoundsetViewport < column.valuelist.length) return asCodeString ? ".valuelist[" + idxInFoundsetViewport + "]" : column.valuelist[idxInFoundsetViewport];
						else if (!column.valuelist[$sabloConverters.INTERNAL_IMPL]["recordLinked"] && column.valuelist.length > 0) return asCodeString ? ".valuelist[0]" : column.valuelist[0];
						else {
							$log.error('Cannot find the valuelist entry for the row that was clicked.');
							return null;
						}
					}
					else return asCodeString ? ".valuelist" : column.valuelist;
				}

				function getTextEditor() {
					// function to act as a class
					function TextEditor() {}
				
					// gets called once before the renderer is used
					TextEditor.prototype.init = function(params) {
						// create the cell
						this.params = params;
						this.editType = params.svyEditType;
						this.eInput = document.createElement('input');
						this.eInput.className = "ag-cell-edit-input";

						var column = getColumn(params.column.colId);
						if(this.editType == 'TYPEAHEAD') {
							this.eInput.className = "ag-table-typeahed-editor-input";
							if(params.column.actualWidth) {
								this.eInput.style.width = params.column.actualWidth + 'px';
							}
							var columnIndex = getColumnIndex(params.column.colId);
							
							var getVLAsCode = getValuelist(params, true);
							this.eInput.setAttribute("uib-typeahead", "value.displayValue | formatFilter:model.columns[" + columnIndex + "].format.display:model.columns[" + columnIndex + "].format.type for value in " + (getVLAsCode == null ? "null" : "model.columns[" + columnIndex + "]" + getVLAsCode + ".filterList($viewValue)"));
							this.eInput.setAttribute("typeahead-wait-ms", "300");
							this.eInput.setAttribute("typeahead-min-length", "0");
							this.eInput.setAttribute("typeahead-append-to-body", "true");
							this.eInput.setAttribute("ng-model", "typeaheadEditorValue");

							$compile(this.eInput)($scope);
							$scope.$digest();

							var vl = getValuelist(params);
							if (vl) {
								var valuelistValuesPromise = vl.filterList("");
								var thisEditor = this;
								valuelistValuesPromise.then(function(valuelistValues) {
									thisEditor.valuelist = valuelistValues;
									var hasRealValues = false;
									for (var i = 0; i < thisEditor.valuelist.length; i++) {
										var item = thisEditor.valuelist[i];
										if (item.realValue != item.displayValue) {
											hasRealValues = true;
											break;
										}
									}
									thisEditor.hasRealValues = hasRealValues;	
									// make sure initial value has the "realValue" set, so when oncolumndatachange is called
									// the previous value has the "realValue"
									if(hasRealValues && params.value && (params.value["realValue"] == undefined)) {
										var rv = params.value;
										var rvFound = false;
										for (var i = 0; i < thisEditor.valuelist.length; i++) {
											var item = thisEditor.valuelist[i];
											if (item.displayValue == params.value) {
												rv = item.realValue;
												rvFound = true;
												break;
											}
										}
										// it could be the valuelist does not have all the entries on the client
										// try to get the entry using a filter call to the server
										if(!rvFound) {
											vl = getValuelist(params);
											vl.filterList(params.value).then(function(valuelistWithInitialValue) {
												for (var i = 0; i < valuelistWithInitialValue.length; i++) {
													if (valuelistWithInitialValue[i].displayValue == params.value) {
														rv = valuelistWithInitialValue[i].realValue;
														break;
													}
												}
												params.node["data"][params.column.colDef["field"]] = {realValue: rv, displayValue: params.value};		
											})
										}
										else {
											params.node["data"][params.column.colDef["field"]] = {realValue: rv, displayValue: params.value};
										}
									} 
								});
							}
						}

						this.initialValue = params.value;
						if(this.initialValue && this.initialValue.displayValue != undefined) {
							this.initialValue = this.initialValue.displayValue;
						}
						var v = this.initialValue;
						if(column && column.format) {
							this.format = column.format;
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

						if(arrowsUpDownMoveWhenEditing && arrowsUpDownMoveWhenEditing != 'NONE') {
							this.keyDownListener = function (event) {
								var isNavigationLeftRightKey = event.keyCode === 37 || event.keyCode === 39;
								var isNavigationUpDownEntertKey = event.keyCode === 38 || event.keyCode === 40 || event.keyCode === 13;

								if (isNavigationLeftRightKey || isNavigationUpDownEntertKey) {

									if(isNavigationUpDownEntertKey && (thisEditor.editType == 'TEXTFIELD')) {
										var newEditingNode = null;
										var columnToCheck = thisEditor.params.column;
										var mustBeEditable = arrowsUpDownMoveWhenEditing == 'NEXTEDITABLECELL'
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

											if(columnToCheck.isCellEditable(newEditingNode)) {
												gridOptions.api.startEditingCell({
													rowIndex: newEditingNode.rowIndex,
													colKey: columnToCheck.colId
												});
											}
											else {
												gridOptions.api.setFocusedCell(newEditingNode.rowIndex, columnToCheck.colId);
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
						if(this.editType == 'TEXTFIELD') {
							this.eInput.select();
						}
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
						if(this.editType == 'TYPEAHEAD') {
							var ariaId = $(this.eInput).attr('aria-owns');
							var activeItem = $('#' + ariaId).find("li.active");
							if(activeItem.length) {
								var activeAnchor = activeItem.find('a');
								if(activeAnchor.is(":hover")) {
									displayValue = activeAnchor.text();
								}
							}
						}
						if(this.format) {
							if(this.format.edit) {
								displayValue = $formatterUtils.unformat(displayValue, this.format.edit, this.format.type, this.initialValue);
							}
							if (this.format.type == "TEXT" && (this.format.uppercase || this.format.lowercase)) {
								if (this.format.uppercase) displayValue = displayValue.toUpperCase();
								else if (this.format.lowercase) displayValue = displayValue.toLowerCase();
							}
						}
						var realValue = displayValue;

						if(this.editType == 'TYPEAHEAD') {
							var vl = getValuelist(this.params);
							if (vl) {

								var findDisplayValue = function(vl, displayValue) {
									if(vl) {
										for (var i = 0; i < vl.length; i++) {
											// compare trimmed values, typeahead will trim the selected value
											if ($.trim(displayValue) === $.trim(vl[i].displayValue)) {
												return { hasMatchingDisplayValue: true, realValue: vl[i].realValue };
											}
										}
									}
									return null;
								}

								var hasMatchingDisplayValue = false;
								var fDisplayValue = findDisplayValue(vl, displayValue);
								if(fDisplayValue == null) {
									// try to find it also on this.valuelist, that is filtered with "" to get all entries
									vl = this.valuelist;
									fDisplayValue = findDisplayValue(vl, displayValue);
								}
								if(fDisplayValue != null) {
									hasMatchingDisplayValue = fDisplayValue['hasMatchingDisplayValue'];
									realValue = fDisplayValue['realValue'];
								}

								if (!hasMatchingDisplayValue)
								{
									if (this.hasRealValues) 
									{
										// if we still have old value do not set it to null or try to  get it from the list.
										if (this.initialValue != null && this.initialValue !== displayValue)
										{
											// so invalid thing is typed in the list and we are in real/display values, try to search the real value again to set the display value back.
											for (var i = 0; i < vl.length; i++) {
												// compare trimmed values, typeahead will trim the selected value
												if ($.trim(this.initialValue) === $.trim(vl[i].displayValue)) {
													realValue = vl[i].realValue;
													break;
												}
											}
										}	
										// if the dataproviderid was null and we are in real|display then reset the value to ""
										else if(this.initialValue == null) {
											displayValue = realValue = "";
										}
									}
								}	
							}
						}

						return {displayValue: displayValue, realValue: realValue};
					};

					TextEditor.prototype.destroy = function() {
						this.eInput.removeEventListener('keydown', this.keyDownListener);
						$(this.eInput).off('keypress', this.keyPressListener);
						if(this.editType == 'TYPEAHEAD') {
							var ariaId = $(this.eInput).attr('aria-owns');
							$('#' + ariaId).remove();
						}
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

						var editFormat = 'MM/dd/yyyy hh:mm a';
						var column = getColumn(params.column.colId);
						if(column && column.format && column.format.edit) {
							editFormat = column.format.edit;
						}
						var theDateTimePicker = $(this.eInput).data('DateTimePicker');
						theDateTimePicker.format(moment().toMomentFormatString(editFormat));
						this.eInput.value = formatFilter(params.value, editFormat, 'DATETIME');
						
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
						
					};
				
					// gets called once when grid ready to insert the element
					Datepicker.prototype.getGui = function() {
						return this.eInput;
					};
				
					// focus and select can be done after the gui is attached
					Datepicker.prototype.afterGuiAttached = function() {
						this.eInput.focus();
						this.eInput.select();
					};

					// returns the new value after editing
					Datepicker.prototype.getValue = function() {
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
				

				function getSelectEditor() {
					function SelectEditor() {
						this.eGui = document.createElement("div");
						this.eGui.className = 'ag-cell-edit-input';
						this.eGui.innerHTML = '<select class="ag-cell-edit-input"/>';
						this.eSelect = this.eGui.querySelector('select');
					}

					SelectEditor.prototype.init = function(params) {
						this.params = params;
						var vl = getValuelist(params);
						if (vl) {
							var row = params.node.data;
							var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
							if (!foundsetManager) foundsetManager = foundset;
							var foundsetRef = foundsetManager.foundset;
							var recRef = foundsetRef.getRecordRefByRowID(row._svyRowId);
							var valuelistValuesPromise = vl.filterList("");
							var selectEl = this.eSelect;
							var v = params.value;
							if(v && v.displayValue != undefined) {
								v = v.displayValue;
							}
							valuelistValuesPromise.then(function(valuelistValues) {
								valuelistValues.forEach(function (value) {
									var option = document.createElement('option');
									option.value = value.realValue == null ? '_SERVOY_NULL' : value.realValue;
									option.text = value.displayValue;
									if (v != null && v.toString() === value.displayValue) {
										option.selected = true;
										if(value.realValue != undefined && params.value["realValue"] == undefined) {
											params.node["data"][params.column.colDef["field"]] = {realValue: value.realValue, displayValue: v};
										}
									}
									selectEl.appendChild(option);
								});

							});
						}

						this.keyListener = function (event) {
							var isNavigationKey = event.keyCode === 38 || event.keyCode === 40;
							if (isNavigationKey) {
								event.stopPropagation();
							}
						};
						this.eSelect.addEventListener('keydown', this.keyListener);

						this.mouseListener = function (event) {
							event.stopPropagation();
						};
						this.eSelect.addEventListener('mousedown', this.mouseListener);
					}

					// gets called once when grid ready to insert the element
					SelectEditor.prototype.getGui = function() {
						return this.eGui;
					};

					SelectEditor.prototype.afterGuiAttached = function () {
						this.eSelect.focus();
					};

					SelectEditor.prototype.getValue = function () {
						var displayValue = this.eSelect.options[this.eSelect.selectedIndex ].text;
						var realValue = this.eSelect.value == '_SERVOY_NULL' ? null : this.eSelect.value;
						return displayValue != realValue ? {displayValue: displayValue, realValue: realValue} : realValue;
					};

					SelectEditor.prototype.destroy = function() {
						this.eSelect.removeEventListener('keydown', this.keyListener);
						this.eSelect.removeEventListener('mousedown', this.mouseListener);
					};

					return SelectEditor;
				}

				function getFormEditor() {
					function FormEditor() {}

					FormEditor.prototype.init = function(params) {
						this.params = params;

						$scope.model._internalFormEditorValue = params.value;
						if($scope.handlers.onColumnFormEditStarted) {
							$scope.handlers.onColumnFormEditStarted(
								getFoundsetIndexFromEvent(params), getColumnIndex(params.column.colId), params.value);
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

						$scope.loadSize = function() {
							$sabloApplication.getFormState(column.editForm).then(function(formState){
								var css = {};
								css["width"] = formState.properties.designSize.width + "px";
								css["height"] = formState.properties.designSize.height + "px";
								$('#ngformeditor').css(css);
							})
						};

						this.eGui.innerHTML = '<div id=\'ngformeditor\' svyform="' + column.editForm + '" ng-include="getNGEditFormUrl()" onload="loadSize()"></div>';
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

				/**************************************************************************************************
				 **************************************************************************************************
				 *
				 *  Enterprise Model
				 *
				 **************************************************************************************************
				 **************************************************************************************************/

				function FoundsetDatasource(foundsetServer) {
					this.foundsetServer = foundsetServer;
				}

				FoundsetDatasource.prototype.getRows = function(params) {
					$log.debug('FoundsetDatasource.getRows: params = ', params);

					// the row group cols, ie the cols that the user has dragged into the 'group by' zone, eg 'Country' and 'Customerid'
					var rowGroupCols = params.request.rowGroupCols
					// the keys we are looking at. will be empty if looking at top level (either no groups, or looking at top level groups). eg ['United States','2002']
					var groupKeys = params.request.groupKeys;

					// resolve valuelist display values to real values
					var filterPromises = [];

					for (var i = 0; i < groupKeys.length; i++) {
						if (groupKeys[i] == NULL_VALUE) {
							groupKeys[i] = null;	// reset to real null, so we use the right value for grouping
						}
						else {
							var vl = getValuelistEx(params.parentNode.data, rowGroupCols[i]['id'], false);
							if(vl) {
								filterPromises.push(vl.filterList(groupKeys[i]));
								var idx = i;
								filterPromises[filterPromises.length - 1].then(function(valuelistValues) {
									if(valuelistValues && valuelistValues.length) {
										if(valuelistValues[0] && valuelistValues[0].realValue != undefined) {
											groupKeys[idx] = valuelistValues[0].realValue;
										}
									}
								});
							}
						}
					}

					var thisFoundsetDatasource = this;
					$q.all(filterPromises).then(function() {
						thisFoundsetDatasource.foundsetServer.getData(params.request, groupKeys,
							function successCallback(resultForGrid, lastRow) {
								params.successCallback(resultForGrid, lastRow);
								selectedRowIndexesChanged();
							});
					}, function(reason) {
						$log.error('Can not get realValues for groupKeys ' + reason);
					});
				};

				function FoundsetServer(allData) {
					this.allData = allData;
				}

				/**
				 * @param {AgDataRequestType} request
				 * @param {Array} groupKeys
				 * @param {Function} callback callback(data, isLastRow)
				 * @protected
				 * */
				FoundsetServer.prototype.getData = function(request, groupKeys, callback) {

					$log.debug(request);

					// the row group cols, ie the cols that the user has dragged into the 'group by' zone, eg 'Country' and 'Customerid'
					var rowGroupCols = request.rowGroupCols

					// if going aggregation, contains the value columns, eg ['gold','silver','bronze']
					var valueCols = request.valueCols;

					// rowGroupCols cannot be 2 level deeper than groupKeys
					// rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);

					var allPromises = [];

					var filterModel = gridOptions.api.getFilterModel();
					// create filter model with column indexes that we can send to the server
					var updatedFilterModel = {};
					for(var c in filterModel) {
						var columnIndex = getColumnIndex(c);
						if(columnIndex != -1) {
							updatedFilterModel[columnIndex] = filterModel[c];
						}
					}
					var sUpdatedFilterModel = JSON.stringify(updatedFilterModel);
					// if filter is changed, apply it on the root foundset, and clear the foundset cache if grouped
					if (sUpdatedFilterModel != $scope.model.filterModel && !(sUpdatedFilterModel == "{}" && $scope.model.filterModel == undefined)) {
						$scope.model.filterModel = sUpdatedFilterModel;
						var filterMyFoundsetArg = [];
						filterMyFoundsetArg.push(sUpdatedFilterModel);

						if(rowGroupCols.length) {
							groupManager.removeFoundsetRefAtLevel(0);
							filterMyFoundsetArg.push("{}");
						}
						else {
							filterMyFoundsetArg.push(sUpdatedFilterModel);
						}
						allPromises.push($scope.svyServoyapi.callServerSideApi("filterMyFoundset", filterMyFoundsetArg));
					}

					var sortModel = request.sortModel;

					var result;
					var sortRootGroup = false;

					// if clicking sort on the grouping column
					if (rowGroupCols.length > 0 && sortModel[0] &&
						(sortModel[0].colId === ("ag-Grid-AutoColumn-" + rowGroupCols[0].id) || sortModel[0].colId === rowGroupCols[0].id)) {
						// replace colFd with the id of the grouped column						
						sortModel = [{ colId: rowGroupCols[0].field, sort: sortModel[0].sort }];
						if(!state.rootGroupSort  || state.rootGroupSort.colId != sortModel[0].colId || state.rootGroupSort.sort != sortModel[0].sort) {
							sortRootGroup = true;
						}
					}
					var foundsetSortModel = getFoundsetSortModel(sortModel);
					var sortString = foundsetSortModel.sortString;

					$log.debug("Group " + (rowGroupCols[0] ? rowGroupCols[0].displayName : '/') + ' + ' + (groupKeys[0] ? groupKeys[0] : '/') + ' # ' + request.startRow + ' # ' + request.endRow);

					// init state of grouped columns. Is normally done by onRowColumnsChanged but is not triggered if rowGroupIndex is set at design time
					// FIXME should handle runtime changes to model.columns. It does not at the moment
					if (!state.grouped.columns.length) {
						for (var i = 0; i < rowGroupCols.length; i++) {
							state.grouped.columns.push(rowGroupCols[i].field);
						}
						// is in group view first time the form is shown ?
						$scope.isGroupView = rowGroupCols.length > 0;
					}

					// Sort on the foundset Group
					if (sortRootGroup) { // no sort need to be applied
						// Should change the foundset with a different sort order
						allPromises.push(groupManager.createOrReplaceFoundsetRef(rowGroupCols, groupKeys, sortModel[0].sort));
					} else {
						// get the foundset reference
						allPromises.push(groupManager.getFoundsetRef(rowGroupCols, groupKeys));
					}
					$q.all(allPromises).then(getFoundsetRefSuccess).catch(getFoundsetRefError);

					/**
					 * GetFoundserRef Promise Callback
					 *
					 * @param {String} foundsetUUID
					 * @protected
					 *  */
					function getFoundsetRefSuccess(args) {

						var foundsetUUID = args[args.length - 1];

						// TODO search in state first ?
						// The foundsetUUID exists in the
						// foundsetHashmap
						// groupManager (UUID)
						// group, in the foundsetHashmap and in the state ?
						var foundsetRefManager = getFoundsetManagerByFoundsetUUID(foundsetUUID);

						if (sortString === "") {
							// TODO restore a default sort order when sort is removed
							// $log.warn(" Use the default foundset sort.. which is ? ");
						}

						if(sortRootGroup) {
							state.rootGroupSort = sortModel[0];
						}

						var currentGridSort = getFoundsetSortModel(gridOptions.api.getSortModel());
						var foundsetSort = foundsetRefManager.getSortColumns();
						// if not sorting on a group column
						if (!$scope.handlers.onSort && rowGroupCols.length === groupKeys.length && sortString != foundsetSort
							&& currentGridSort.sortString != foundsetSort) { // if is a group column and sort string is different
							$log.debug('CHANGE SORT REQUEST');
							foundsetSortModel = getFoundsetSortModel(sortModel)
							sortPromise = foundsetRefManager.sort(foundsetSortModel.sortColumns);
							sortPromise.then(function() {
								getDataFromFoundset(foundsetRefManager);
								// give time to the foundset change listener to know it was a client side requested sort
								setTimeout(function() {
									sortPromise = null;
								}, 0);
							}).catch(function(e) {
								sortPromise = null
							});

						} else {
							getDataFromFoundset(foundsetRefManager);
						}
					}

					/**
					 * GetDataFromFoundset Promise Callback
					 *
					 * @param {FoundsetManager} foundsetRef the foundsetManager object
					 * @protected
					 *  */
					function getDataFromFoundset(foundsetManager) {
						// test cache blocks
						//if (!isTableGrouped()) test_validateCache();

						// load record if endRow is not in viewPort
						var startIndex = foundsetManager.foundset.viewPort.startIndex; // start index of view port (0-based)
						var viewPortSize = foundsetManager.foundset.viewPort.size; // viewport size
						var endIndex = startIndex + viewPortSize; // end index of the view port (0-based)

						// index in the cached viewPort (0-based);
						var viewPortStartIndex = request.startRow - startIndex;
						var viewPortEndIndex = request.endRow - startIndex;

						if (request.startRow < startIndex || (request.endRow > endIndex && foundsetManager.getLastRowIndex() === -1)) {

							var errorTimeout = setTimeout(function() {
									$log.error('Could not load records for foundset ' + foundsetManager.foundsetUUID + ' Start ' + request.startRow + ' End ' + request.endRow);
								}, 10000); // TODO set timeout

							var requestViewPortStartIndex;
							// keep the previous chunk in cache
							if (request.startRow >= CHUNK_SIZE && request.endRow >= endIndex) {
								requestViewPortStartIndex = request.startRow - CHUNK_SIZE;
							} else {
								requestViewPortStartIndex = request.startRow;
							}

							var requestViewPortEndIndex = request.endRow - requestViewPortStartIndex;
							var size = request.endRow - request.startRow;

							$log.debug('Load async ' + requestViewPortStartIndex + ' - ' + requestViewPortEndIndex + ' with size ' + size);
							var promise = foundsetManager.loadExtraRecordsAsync(requestViewPortStartIndex, size, false);
							promise.then(function() {

								// load complete
								if (errorTimeout) {
									clearTimeout(errorTimeout);
								}

								// get the index of the last row
								var lastRowIndex = foundsetManager.getLastRowIndex();

								// update viewPortStatIndex
								viewPortStartIndex = request.startRow - foundsetManager.foundset.viewPort.startIndex;
								viewPortEndIndex = request.endRow - foundsetManager.foundset.viewPort.startIndex;

								$log.debug('Get View Port ' + viewPortStartIndex + ' - ' + viewPortEndIndex + ' on ' + foundsetManager.foundset.viewPort.startIndex + ' with size ' + foundsetManager.foundset.viewPort.size);

								result = foundsetManager.getViewPortData(viewPortStartIndex, viewPortEndIndex);
								callback(result, lastRowIndex);

							}).catch(getFoundsetRefError);
						} else {
							callback(foundsetManager.getViewPortData(viewPortStartIndex, viewPortEndIndex), foundsetManager.getLastRowIndex());
						}
					}

					function getFoundsetRefError(e) {
						$log.error(e);
						gridOptions.columnApi.setRowGroupColumns([]);
					}
				}; // End getData

				function initRootFoundset() {

					foundset = new FoundSetManager($scope.model.myFoundset, 'root', true);

					var foundsetServer = new FoundsetServer([]);
					var datasource = new FoundsetDatasource(foundsetServer);
					gridOptions.api.setServerSideDatasource(datasource);
					isSelectionReady = false;
				}

				function refreshDatasource() {
					var foundsetServer = new FoundsetServer([]);
					var datasource = new FoundsetDatasource(foundsetServer);
					gridOptions.api.setServerSideDatasource(datasource);
					isSelectionReady = false;
				}

				/**************************************************************************************************
				 **************************************************************************************************
				 *
				 *  Watches
				 *
				 **************************************************************************************************
				 **************************************************************************************************/

				$scope.$watch("model.myFoundset", function(newValue, oldValue) {

						$log.debug('myFoundset root changed');
						if(isTableGrouped()) {
							$scope.purge();
						}
						var isChangedToEmpty = newValue && oldValue && newValue.serverSize == 0 && oldValue.serverSize > 0;
						if($scope.model.myFoundset.viewPort.size > 0 || isChangedToEmpty) {
							// browser refresh
							isRootFoundsetLoaded = true;
							initRootFoundset();
						}
						else {
							// newly set foundset
							isRootFoundsetLoaded = false;
						}
						// TODO ASK R&D should i remove and add the previous listener ?
						$scope.model.myFoundset.removeChangeListener(changeListener);
						$scope.model.myFoundset.addChangeListener(changeListener);

					});
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
								var columnWatch = $scope.$watch("model.columns[" + i + "]['" + columnKeysToWatch[j] + "']",
								function(newValue, oldValue) {
									if(newValue != oldValue) {
										$log.debug('column property changed');
										updateColumnDefs();
									}
								});
								columnWatches.push(columnWatch);
							}
						}
						// watch the column header title
						for (var i = 0; i < $scope.model.columns.length; i++) {
							watchColumnHeaderTitle(i);
							watchColumnFooterText(i);
						}
					
						
						if(newValue != oldValue) {
							updateColumnDefs();
						}
					}
				});
				
				/**
				 * 
				 * @private 
				 *  */
				function watchColumnHeaderTitle(index) {
					var columnWatch = $scope.$watch("model.columns[" + index + "]['headerTitle']",
						function(newValue, oldValue) {
							if(newValue != oldValue) {
								$log.debug('header title column property changed');
								
								// column id is either the id of the column
								var column = $scope.model.columns[index];
								var colId = column.id;
								if (!colId) {	// or column is retrieved by getColumnID !?
									colId = getColumnID(column, index);
								}
								
								if (!colId) {
									$log.warn("cannot update header title for column at position index " + index);
									return;
								}
								updateColumnHeaderTitle(colId, newValue);
							}
					});
				}
				
				function watchColumnFooterText(index) {
					var columnWatch = $scope.$watch("model.columns[" + index + "]['footerText']",
						function(newValue, oldValue) {
							if(newValue != oldValue) {
								$log.debug('footer text column property changed');
								gridOptions.api.setPinnedBottomRowData(getFooterData());
							}
					});
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

				/**************************************************************************************************
				 **************************************************************************************************
				 *
				 *  Foundset Managment
				 *
				 **************************************************************************************************
				 **************************************************************************************************/

				/**
				 * Handle viewPort, row, sort, isLastRow of a foundsetReference object
				 *
				 * FoundsetManager
				 * @constructor
				 *
				 * */
				function FoundSetManager(foundsetRef, foundsetUUID, isRoot) {
					var thisInstance = this;

					// properties
					this.foundset = foundsetRef;
					this.isRoot = isRoot ? true : false;
					this.foundsetUUID = foundsetUUID;

					// methods
					this.getViewPortData;
					this.getViewPortRow;
					this.hasMoreRecordsToLoad;
					this.isLastRow;
					this.getLastRowIndex;
					this.loadExtraRecordsAsync;
					this.getSortColumns;
					this.sort;
					this.getRowIndex;

					/** return the viewPort data in a new object
					 * @param {Number} [startIndex]
					 * @param {Number} [endIndex]
					 * */
					var getViewPortData = function(startIndex, endIndex) {
						var result = [];
						startIndex = startIndex ? startIndex : 0;
						endIndex = endIndex && (endIndex < thisInstance.foundset.viewPort.rows.length) ? endIndex : thisInstance.foundset.viewPort.rows.length;

						// index cannot exceed ServerSize
						startIndex = Math.min(startIndex, thisInstance.foundset.serverSize);
						endIndex = Math.min(endIndex, thisInstance.foundset.serverSize);

						var columnsModel;
						if (this.isRoot) {
							columnsModel = $scope.model.columns;
						} else if ($scope.model.hashedFoundsets) {
							for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
								if ($scope.model.hashedFoundsets[i].foundsetUUID == this.foundsetUUID) {
									columnsModel = $scope.model.hashedFoundsets[i].columns;
									break;
								}
							}
						}

						for (var j = startIndex; j < endIndex; j++) {
							var row = thisInstance.getViewPortRow(j, columnsModel);
							if (row) result.push(row);
						}

						return result;
					}

					/** return the row in viewport at the given index */
					var getViewPortRow = function(index, columnsModel) {
						var r;
						try {
							r = new Object();
							// push the id so the rows can be merged
							var viewPortRow = this.foundset.viewPort.rows[index];
							if (!viewPortRow) {
								$log.error("Cannot find row " + index + ' in foundset ' + this.foundsetUUID + ' size ' + this.foundset.viewPort.size + ' startIndex ' + this.foundset.viewPort.startIndex);
								return null;
							}

							r._svyRowId = viewPortRow._svyRowId;
							r._svyFoundsetUUID = this.foundsetUUID;
							r._svyFoundsetIndex = this.foundset.viewPort.startIndex + index;

							var columns = columnsModel ? columnsModel : $scope.model.columns;

							// push each dataprovider
							for (var i = 0; i < columns.length; i++) {
								var header = columns[i];
								var field = getColumnID(header, i);

								var value = header.dataprovider ? header.dataprovider[index] : null;
								r[field] = value;
							}
							return r;

						} catch (e) {
							$log.error(e);
							r = null;
						}
						return r;
					}

					var hasMoreRecordsToLoad = function() {
						return thisInstance.foundset.hasMoreRows || (thisInstance.foundset.viewPort.startIndex + thisInstance.foundset.viewPort.size) < thisInstance.foundset.serverSize;
						//						return thisInstance.foundset.hasMoreRows || thisInstance.foundset.viewPort.size < thisInstance.foundset.serverSize;
					}

					var getLastRowIndex = function() {
						if (this.hasMoreRecordsToLoad()) {
							return -1;
						} else {
							return thisInstance.foundset.serverSize;
						}
					}

					var loadExtraRecordsAsync = function(startIndex, size, dontNotifyYet) {
						// TODO use loadExtraRecordsAsync to keep cache small
						size = (size * CACHED_CHUNK_BLOCKS) + size;
						if (thisInstance.hasMoreRecordsToLoad() === false) {
							size = this.foundset.serverSize - startIndex;
						}
						if (size < 0) {
							$log.error('Load size should not be negative: startIndex ' + startIndex + ' server size ' + this.foundset.serverSize);
							size = 0;
						}

						// Wait for response
						var isRootFoundset = thisInstance.isRoot;
						var requestId = 1 + Math.random();
						state.waitfor.loadRecords = isRootFoundset ? requestId : 0; // we use state.waitfor.loadRecords only in the root foundset change listener
						// TODO can it handle multiple requests ?
						var promise = this.foundset.loadRecordsAsync(startIndex, size);
						//var promise = this.foundset.loadExtraRecordsAsync(size);
						promise.finally(function(e) {
							// foundset change listener that checks for 'state.waitfor.loadRecords' is executed later,
							// as last step when the response is processed, so postpone clearing the flag
							if(isRootFoundset) {
								setTimeout(function() {
									if (state.waitfor.loadRecords !== requestId) {
										// FIXME if this happen reduce parallel async requests to 1
										$log.warn("Load record request id '" + state.waitfor.loadRecords + "' is different from the resolved promise '" + requestId + "'; this should not happen !!!");
									}		
									state.waitfor.loadRecords = 0;							
								}, 0);
							}
						});

						return promise;
					}

					var getSortColumns = function() {
						return thisInstance.foundset ? thisInstance.foundset.sortColumns : null;
					}

					var sort = function(sortString) {
						if (sortString) {
							// TODO check sort
							return thisInstance.foundset.sort(sortString);
						}
					}

					/**
					 * @return {Number} return the foundset index of the given row in viewPort (includes the startIndex diff)
					 *  */
					this.getRowIndex = function(row) {
						var id = row._svyRowId;
						var viewPortRows = this.foundset.viewPort.rows;
						for (var i = 0; i < viewPortRows.length; i++) {
							if (viewPortRows[i]._svyRowId === id) {
								return i + this.foundset.viewPort.startIndex;
							}
						}
						return -1;
					}

					var foundsetListener = function(change) {
						$log.debug('child foundset changed listener ' + thisInstance.foundset);

						if (change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED]) {
							var newSort = change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].newValue;
							var oldSort = change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].oldValue;

							// sort changed
							$log.debug("Change Group Sort Model " + newSort);
							return;
						}

						// gridOptions.api.purgeEnterpriseCache();
						if (change[$foundsetTypeConstants.NOTIFY_SELECTED_ROW_INDEXES_CHANGED]) {
							selectedRowIndexesChanged(thisInstance);
						}

						if (change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED]) {
							var updates = change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED].updates;
							$log.debug(updates)
							updateRows(updates, null, null);
						}

					}

					this.destroy = function() {
						$log.debug('destroy ' + this.foundsetUUID);

						// remove the listener
						this.foundset.removeChangeListener(foundsetListener);

						// persistently remove the foundset from other cached objects (model.hashedFoundsets, state.foundsetManager);
						removeFoundSetByFoundsetUUID(this.foundsetUUID);
					}

					if (!this.isRoot) {
						// add the change listener to the component
						this.foundset.addChangeListener(foundsetListener);
					}

					// methods
					this.getViewPortData = getViewPortData;
					this.getViewPortRow = getViewPortRow;
					this.hasMoreRecordsToLoad = hasMoreRecordsToLoad;
					this.getLastRowIndex = getLastRowIndex;
					this.loadExtraRecordsAsync = loadExtraRecordsAsync;
					this.getSortColumns = getSortColumns;
					this.sort = sort;

				}

				/**
				 * @constructor
				 *
				 * @public
				 * @param {String} id
				 *  */
				function GroupNode(id) {
					this.id = id;
					this.nodes = new Object();
					this.foundsetUUID = undefined;

					var thisInstance = this;

					/**
					 * @public
					 * @param {Function} callback execute function for each subnode. Arguments GroupNode
					 *  */
					this.forEach = function(callback) {
						for (var key in this.nodes) {
							callback.call(this, this.nodes[key]);
						}
					}

					/**
					 * @public
					 * @return {Boolean} returns true if the callback ever returns true
					 * @param {Function} callback execute function for each subnode until returns true. Arguments GroupNode
					 *  */
					this.forEachUntilSuccess = function(callback) {
						for (var key in this.nodes) {
							if (callback.call(this, this.nodes[key]) === true) {
								return true;
							}
						}
						// return true only if there are no subnodes ?
						return false;
					}

					/**
					 * @public
					 * @return {Boolean} returns true if the callback ever returns true
					 *  */
					this.hasNodes = function() {
						for (var key in this.nodes) {
							return true;
						}
						return false;
					}

					/**
					 * @public
					 * @remove the node
					 * */
					this.destroy = function() {

						$log.debug('--Destroy ' + this.foundsetUUID + ' - id : ' + this.id);
						// destroy all it's sub nodes
						this.removeAllSubNodes();

						// do nothing if the foundset doesn't exist
						if (this.foundsetUUID && this.foundsetUUID !== 'root') {
							// TODO should this method access the foundsetManager ? is not a good encapsulation
							//		if (this.onDestroy) {
							//			this.onDestroy.call(this, [this.id, this.foundsetUUID]);
							//		}
							var foundsetManager = getFoundsetManagerByFoundsetUUID(this.foundsetUUID);
							foundsetManager.destroy();
						}
					}

					this.removeAllSubNodes = function() {
						this.forEach(function(subNode) {
							subNode.destroy();
						});
						this.nodes = [];
					}
				}

				// TODO to be completed, use the GroupHashCache to persist foundset UUID for rowGroupCols/groupKeys combinations
				/**
				 * This object is used to keep track of cached foundset depending on rowGroupCol and groupKeys criteria.
				 * Any time a foundset is retrieved is persisted in this object.
				 *
				 * Question: can i use an hash instead of a tree structure ? e.g hash of columnName:keyValue,columnName:keyValue..
				 *
				 * TODO is not stateful (lost once is refreshed) while the foundset are statefull, potentially can create memory leaks (too many foundset for the same criteria retrieved)
				 * TODO desist foundset from memory. Remove foundset
				 * 		Clear ALL
				 * 		Clear Node
				 * 		Clear ALL subnodes
				 * */
				function GroupHashCache() {

					var rootGroupNode = new GroupNode('root');

					// methods
					this.getCachedFoundset;
					this.setCachedFoundset;
					this.clearAll;
					this.removeCachedFoundset;
					this.removeCachedFoundsetAtLevel;
					this.removeChildFoundsets;

					// TODO rename in foundsetUUID
					this.getCachedFoundset = function(rowGroupCols, groupKeys) {
						var node = getTreeNode(rootGroupNode, rowGroupCols, groupKeys);
						return node ? node.foundsetUUID : null;
					}

					this.setCachedFoundset = function(rowGroupCols, groupKeys, foundsetUUID) {
						var tree = getTreeNode(rootGroupNode, rowGroupCols, groupKeys, true);
						tree.foundsetUUID = foundsetUUID;
					}

					/**
					 * @param {String} foundsetUUID
					 * Remove the node */
					this.removeCachedFoundset = function(foundsetUUID) {
						return removeFoundset(rootGroupNode, foundsetUUID);
					}

					/**
					 * @param {Number} level
					 * Remove the node */
					this.removeCachedFoundsetAtLevel = function(level) {
						return removeFoundsetAtLevel(rootGroupNode, level);
					}

					/**
					 * @param {String} foundsetUUID
					 * @param {String} [field]
					 * @param {String} [value]
					 * Remove all it's child node */
					this.removeChildFoundset = function(foundsetUUID, field, value) {
						return removeChildFoundsets(rootGroupNode, foundsetUUID, field, value);
					}

					/** @deprecated
					 * Use removeFoundsetRefAtLevel(0) instead
					 *  */
					this.clearAll = function() {

						rootGroupNode.forEach(function(node) {
							if (node.foundsetUUID) {
								removeFoundset(rootGroupNode, node.foundsetUUID);
							} else {
								// TODO is it this possible
								$log.error('There is a root node without a foundset UUID, it should not happen');
							}

						});
						if ($scope.model.hashedFoundsets.length > 0) {
							$log.error("Clear All was not successful, please debug");
						}
					}

					/**
					 * @param {GroupNode} tree
					 * @param {String} foundsetUUID
					 * @return Boolean
					 *  */
					function removeFoundset(tree, foundsetUUID) {
						if (!tree) {
							return true;
						}

						if (!foundsetUUID) {
							return true;
						}

						// remove the node
						var parentNode = getParentGroupNode(tree, foundsetUUID);
						var node = getGroupNodeByFoundsetUUID(parentNode, foundsetUUID);
						if (parentNode && node) {
							node.destroy();
							// TODO should be moved inside the destroy method ?, each time should ask for each parent
							delete parentNode.nodes[node.id];
							return true;
						} else {
							return false;
						}
					}

					/**
					 * @param {GroupNode} tree
					 * @param {Number} level
					 * @return {Boolean}
					 *  */
					function removeFoundsetAtLevel(tree, level) {
						if (!tree) {
							return true;
						}

						if (isNaN(level) || level === null) {
							return true;
						}

						var success = true;

						tree.forEach(function(node) {

							// remove the foundset and all it's child nodes if foundsetUUID or level === 0
							if (level === 0) {
								var id = node.id;
								node.destroy();
								delete tree.nodes[id];
								return true;
							} else {
								success = node.forEach(function(subNode) {
									return removeFoundsetAtLevel(node, level - 1)
								}) && success;
								return success;
							}
						});
						return success;
					}

					/**
					 * @param {GroupNode} tree
					 * @param {String} foundsetUUID
					 * @param {String} [field]
					 * @param {String} [value]
					 *  */
					function removeChildFoundsets(tree, foundsetUUID, field, value) {

						if (foundsetUUID) {
							// remove all child nodes
							var node = getGroupNodeByFoundsetUUID(tree, foundsetUUID);
							if (node) {
								node.removeAllSubNodes();
								return true;
							} else {
								return false;
							}
						} else {

							// TODO Refactor this part of code
							var success = true;
							tree.forEach(function(node) {
								if (node.foundsetUUID === foundsetUUID) {
									// delete all subnodes
									success = true;
									node.forEach(function(subNode) {
										var childFoundsetUUID = subNode.foundsetUUID;
										var foundsetRef = getFoundsetManagerByFoundsetUUID(childFoundsetUUID);
										// FIXME this solution is horrible, can break if rows.length === 0 or...
										// A better solution is to retrieve the proper childFoundsetUUID by rowGroupCols/groupKeys
										if (foundsetRef && ( (field === null || field === undefined) || (field !== null && field !== undefined && foundsetRef.foundset.viewPort.rows[0] && foundsetRef.foundset.viewPort.rows[0][field] == value))) {
											success = (removeFoundset(node, childFoundsetUUID) && success);
										} else {
											$log.debug('ignore the child foundset');
										}
									});
								} else if (node.hasNodes()) { // search in subnodes
									success = success && node.forEachUntilSuccess(function(subNode) {
										return removeChildFoundsets(node, foundsetUUID)
									});
								}
							});
						}
					}

					/**
					 * @param {GroupNode} tree
					 * @param {Array} rowGroupCols
					 * @param {Array} groupKeys
					 * @param {Boolean} [create]
					 *
					 * @return {GroupNode}
					 *
					 * */
					function getTreeNode(tree, rowGroupCols, groupKeys, create) {

						var result = null;

						if (rowGroupCols.length > groupKeys.length + 1) {
							//							$log.warn('discard row groups ' + (rowGroupCols.length - groupKeys.length));
							rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);
						}

						/*
						 * {
						 * 	columnId {
						 * 		foundsetUUID: uuid
						 * 		nodes: {
						 * 			keyValue : {
						 * 				foundsetUUID : uuid
						 * 				nodes : {
						 * 					subColumnId { ... }
						 * 				}
						 * 			},
						 * 			keyValue2 : { ... }
						 * 		}
						 * 	  }
						 * }
						 *
						 *
						 * */

						if (!tree || !tree.nodes) {
							return null;
						}

						// the column id e.g. customerid, shipcity
						var columnId = rowGroupCols[0].field;

						// the tree for the given column
						var colTree = tree.nodes[columnId];

						// create the tree node if does not exist
						if (!colTree && create) {
							colTree = new GroupNode(columnId);
							tree.nodes[columnId] = colTree;
						} else if (!colTree) { // or return null
							return null;
						}

						if (rowGroupCols.length === 1) { // the last group

							if (groupKeys.length === 0) { // is a leaf child
								result = colTree;
							} else if (groupKeys.length === 1) { // is a leaf child

								// get the subtree matching the rowGroupCols
								var key = groupKeys[0];
								var keyTree = colTree.nodes[key];

								// create the key tree node if does not exist
								if (!keyTree && create) {
									keyTree = new GroupNode(key);
									colTree.nodes[key] = keyTree;
								} else if (!keyTree) { // or return null
									return null;
								}

								result = keyTree;

							} else { // no group key criteria
								$log.warn("this should not happen");
							}

						} else if (rowGroupCols.length > 1) { // is not the last group
							var key = groupKeys.length ? groupKeys[0] : null;

							if (!colTree) {
								$log.warn("this should not happen")
								return null;
							}

							var subTree = colTree;

							if (key !== null) {
								var keyTree = colTree.nodes[key];

								// create the key tree node if does not exist
								if (!keyTree && create) {
									keyTree = new GroupNode(key);
									colTree.nodes[key] = keyTree;
								} else if (!keyTree) {
									return null;
								}

								subTree = keyTree;

							} else {
								// if is not the last group, should always have a key criteria
								$log.warn("this should not happen")
							}

							rowGroupCols = rowGroupCols.slice(1);
							groupKeys = groupKeys.slice(1);

							result = getTreeNode(subTree, rowGroupCols, groupKeys, create);

						} else {
							$log.warn("No group criteria, should not happen");
						}

						return result;
					}

					/**
					 * @param {GroupNode} tree
					 * @param {String} foundsetUUID
					 * @return {GroupNode}
					 *
					 * */
					function getGroupNodeByFoundsetUUID(tree, foundsetUUID) {
						if (!tree) {
							return null;
						}

						if (!foundsetUUID) {
							return null;
						}

						var resultNode = null;
						tree.forEachUntilSuccess(function(node) {
							if (node.foundsetUUID === foundsetUUID) {
								resultNode = node;
								return true;
							} else if (node.hasNodes()) { // search in subnodes
								return node.forEachUntilSuccess(function(subNode) {
									resultNode = getGroupNodeByFoundsetUUID(node, foundsetUUID);
									if (resultNode) { // if has found the result
										return true;
									} else { // keep searching
										return false;
									}
								});
							} else { // didn't find the node in all it's childs
								return false;
							}
						});
						return resultNode;
					}

					/**
					 * @param {GroupNode} tree
					 * @param {String} foundsetUUID
					 * @return {GroupNode}
					 *
					 * */
					function getParentGroupNode(tree, foundsetUUID) {
						if (!tree) {
							return null;
						}

						if (!foundsetUUID) {
							return null;
						}

						var parentNode = null;
						tree.forEachUntilSuccess(function(node) {
							// found in the child
							if (parentNode) { // already found the tree
								return true;
							}
							if (node.foundsetUUID === foundsetUUID) {
								parentNode = tree;
								return true;
							} else if (node.hasNodes()) { // search in subnodes
								node.forEachUntilSuccess(function(subNode) {
									parentNode = getParentGroupNode(node, foundsetUUID);
									if (parentNode) { // break the for each if has found the result
										return true;
									} else { // keep searching
										return false;
									}
								});
							} else if (parentNode) {
								return true;
							} else { // didn't find the node in all it's childs
								return false;
							}
						});
						return parentNode;
					}

					/**
					 * @param {GroupNode} tree
					 * @param {String} foundsetUUID
					 * @return {Array<GroupNode>}
					 *
					 * @deprecated
					 *
					 * */
					function getTreeNodePath(tree, foundsetUUID) {
						if (!tree) {
							return null;
						}

						if (!foundsetUUID) {
							return null;
						}

						var path = [];

						var resultNode = null;
						tree.forEachUntilSuccess(function(node) {
							if (node.foundsetUUID === foundsetUUID) {
								path.push(node);
								return true;
							} else if (node.hasNodes()) { // search in subnodes
								var isInSubNodes = node.forEachUntilSuccess(function(subNode) {
									var subPath = getTreeNodePath(node, foundsetUUID);
									if (resultNode) { // if has found the result
										return true;
									} else { // keep searching
										return false;
									}
								});

								if (isInSubNodes) {
									path.concat(subPath);
								}

							} else { // didn't find the node in all it's childs
								return false;
							}
						});

						return path;
					}

					// enable testMethods
					/**
					 * @param {String} foundsetUUID
					 * */
					this.getGroupNodeByFoundsetUUID = function(foundsetUUID) {
						return getGroupNodeByFoundsetUUID(rootGroupNode, foundsetUUID);
					};

					/**
					 * @param {String} foundsetUUID
					 * */
					this.getParentGroupNode = function(foundsetUUID) {
						return getParentGroupNode(rootGroupNode, foundsetUUID);
					};

					/**
					 * @param {String} foundsetUUID
					 * @deprecated
					 * */
					this.getTreeNodePath = function(foundsetUUID) {
						return getTreeNodePath(rootGroupNode, foundsetUUID);
					};

				}
				//End constructor GroupHashCache

				/**
				 * @constructor
				 * */
				function GroupManager() {

					var hashTree = new GroupHashCache();

					// properties
					this.groupedColumns = [];
					this.groupedValues = new Object();

					// methods
					this.getCachedFoundsetUUID;
					this.getFoundsetRef;
					this.updateFoundsetRefs;
					this.removeFoundsetRef;
					this.removeChildFoundsetRef;
					this.createOrReplaceFoundsetRef;
					this.clearAll;

					//					this.updateGroupColumns = function(rowGroupCols) {
					//
					//						for (var i = 0; i < rowGroupCols.length; i++) {
					//
					//						}
					//
					//					}

					/**
					 * Returns the foundset with the given grouping criteria is already exists in cache
					 *
					 * @param {Array} rowGroupCols
					 * @param {Array} groupKeys
					 * @param {String} [sort] desc or asc. Default asc
					 *
					 * @return {String} returns the UUID of the foundset if exists in cache
					 * */
					this.getCachedFoundsetUUID = function(rowGroupCols, groupKeys) {
						return hashTree.getCachedFoundset(rowGroupCols, groupKeys);
					}

					/**
					 * Returns the foundset with the given grouping criteria
					 *
					 * @param {Array} rowGroupCols
					 * @param {Array} groupKeys
					 * @param {String} [sort] desc or asc. Default asc
					 *
					 * @return {PromiseType} returns a promise
					 * */
					this.getFoundsetRef = function(rowGroupCols, groupKeys, sort) {

						// create a promise
						/** @type {PromiseType} */
						var resultPromise = $q.defer();

						// return the root foundset if no grouping criteria
						if (rowGroupCols.length === 0 && groupKeys.length === 0) { // no group return root foundset
							resultPromise.resolve('root');
							return resultPromise.promise;
						}

						var idx; // the index of the group dept
						var columnIndex; // the index of the grouped column

						// ignore rowGroupColumns which are still collapsed (don't have a matchig key)
						rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);

						// possibilities

						// is a root group CustomerID

						// is a second level group CustomerID, ShipCity

						// is a third level group CustomerID, ShipCity, ShipCountry

						// recursevely load hashFoundset. this is done so the whole tree is generated without holes in the structure. Do i actually need to get a foundset for it ? Probably no, can i simulate it ?

						var groupLevels = rowGroupCols.length;

						// create groups starting from index 0
						getRowColumnHashFoundset(0);

						function getRowColumnHashFoundset(index) {

							var groupCols = rowGroupCols.slice(0, index + 1);
							var keys = groupKeys.slice(0, index + 1);

							$log.debug(groupCols);
							$log.debug(keys);

							// get a foundset for each grouped level, resolve promise when got to the last level

							// TODO loop over columns
							var columnId = groupCols[groupCols.length - 1].field; //
							columnIndex = getColumnIndex(columnId);

							// get the foundset Reference
							var foundsetHash = hashTree.getCachedFoundset(groupCols, keys);
							if (foundsetHash) { // the foundsetReference is already cached
								if (index === rowGroupCols.length - 1) { // resolve when last rowColumn foundset has been loaded
									resultPromise.resolve(foundsetHash);
								} else {
									// FIXME do i need to get multiple hashed foundsets ? probably not
									getRowColumnHashFoundset(index + 1); // load the foundset for the next group
								}

							} else { // need to get a new foundset reference
								// create the subtree

								// FIXME i will miss information about the root columns. I need an array of matching column, not an index. e.g. [ALFKI, Italy, Roma]

								// get the index of each grouped column
								var groupColumnIndexes = [];
								for (var idx = 0; idx < groupCols.length; idx++) {
									var columnId = rowGroupCols[idx].field;
									columnIndex = getColumnIndex(columnId);
									groupColumnIndexes.push(columnIndex);
								}

								if (index === groupLevels - 1) { // if is the last level, ask for the foundset hash
									var promise = getHashFoundset(groupColumnIndexes, keys, sort);
									promise.then(getHashFoundsetSuccess);
									promise.catch(promiseError);
								} else { // set null inner foundset
									hashTree.setCachedFoundset(groupCols, keys, null);
									getRowColumnHashFoundset(index + 1);
								}
							}

							/** @return {Object} returns the foundsetRef object */
							function getHashFoundsetSuccess(foundsetUUID) {

								if (!foundsetUUID) {
									$log.error("why i don't have a foundset ref ?")
									return;
								} else {
									$log.debug('Get hashed foundset success ' + foundsetUUID);
								}

								// the hash of the parent foundset
								// var foundsetUUID = childFoundset.foundsetUUID;
								// var foundsetRef = childFoundset.foundsetRef;

								// cache the foundsetRef
								hashTree.setCachedFoundset(groupCols, keys, foundsetUUID);

								$log.debug('success ' + foundsetUUID);

								if (index === rowGroupCols.length - 1) { // resolve when last rowColumn foundset has been loaded
									resultPromise.resolve(foundsetUUID);
								} else {
									getRowColumnHashFoundset(index + 1); // load the foundset for the next group
								}
							}

						}

						function promiseError(e) {
							// propagate the error
							resultPromise.reject(e);
						}

						return resultPromise.promise;
					}

					/**
					 * Handle ChildFoundsets
					 * Returns the foundset in a promise
					 * @param {Array<Number>} groupColumns index of all grouped columns
					 * @param {Array} groupKeys value for each grouped column
					 * @param {String} [sort]
					 *
					 * @return {PromiseType}
					 *  */
					function getHashFoundset(groupColumns, groupKeys, sort) {

						var resultDeferred = $q.defer();

						var childFoundsetPromise;

						// TODO store it in cache. Requires to be updated each time column array Changes
						var idForFoundsets = [];
						for (var i = 0; i < $scope.model.columns.length; i++) {
							idForFoundsets.push(getColumnID($scope.model.columns[i], i));
						}

						var hasRowStyleClassDataprovider = $scope.model.rowStyleClassDataprovider ? true : false;

						var sortColumn;
						var sortColumnDirection;
						var sortModel = gridOptions.api.getSortModel();
						if(sortModel && sortModel[0]) {
							sortColumn = getColumnIndex(sortModel[0].colId);
							sortColumnDirection = sortModel[0].sort;
						}

						childFoundsetPromise = $scope.svyServoyapi.callServerSideApi("getGroupedFoundsetUUID",
							[groupColumns, groupKeys, idForFoundsets, sort, $scope.model.filterModel, hasRowStyleClassDataprovider, sortColumn, sortColumnDirection]);

						childFoundsetPromise.then(function(childFoundsetUUID) {
								$log.debug(childFoundsetUUID);
								if (!childFoundsetUUID) {
									$log.error("why i don't have a childFoundset ?");
									resultDeferred.reject("can't retrieve the child foundset");
								}

								// FIXME add listener somewhere else
								//childFoundset.addChangeListener(childChangeListener);
								resultDeferred.resolve(childFoundsetUUID);
							}, function(e) {
								// propagate the error
								resultDeferred.reject(e);
							});

						return resultDeferred.promise;
					}

					this.updateFoundsetRefs = function(rowGroupCols) {
						// TODO update all foundset refs
						// results in closing all nodes and refresh all foundsets
						this.clearAll();
						return this.getFoundsetRef([rowGroupCols[0].colDef], []);
					}

					/**
					 * Creates a new foundset reference with the given group criterias.
					 * If a foundset reference with the given references already exists, will be overriden
					 *
					 * */
					this.createOrReplaceFoundsetRef = function(groupColumns, groupKeys, sort) {
						var foundsetHash = hashTree.getCachedFoundset(groupColumns, groupKeys)
						if (foundsetHash) {
							this.removeFoundsetRef(foundsetHash);

						}
						return this.getFoundsetRef(groupColumns, groupKeys, sort);
					}
					/**
					 * @private
					 * Should this method be used ?
					 *  */
					this.removeFoundsetRef = function(foundsetUUID) {
						return hashTree.removeCachedFoundset(foundsetUUID);
					}

					/**
					 * @param {Number} level
					 *
					 *  */
					this.removeFoundsetRefAtLevel = function(level) {
						return hashTree.removeCachedFoundsetAtLevel(level);
					}

					/**
					 * @param {String} foundsetUUID
					 * @param {String} [field] if given delete only the child having field equal to value
					 * @param {Object} [value] if given delete only the child having field equal to value
					 *
					 * */
					this.removeChildFoundsetRef = function(foundsetUUID, field, value) {
						return hashTree.removeChildFoundset(foundsetUUID, field, value);
					}

					this.clearAll = function() {
						hashTree.clearAll();
					}

				}

				/**
				 * @public
				 * Get Foundset in hashMap by UUID
				 * */
				function getFoundSetByFoundsetUUID(foundsetHash) {
					// TODO return something else here ?
					if (foundsetHash === 'root') return $scope.model.myFoundset;
					if ($scope.model.hashedFoundsets) {
						for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
							if ($scope.model.hashedFoundsets[i].foundsetUUID == foundsetHash)
								return $scope.model.hashedFoundsets[i].foundset;

						}
					}
					return null;
				}

				/**
				 * Returns the foundset manager for the given hash
				 * @return {FoundSetManager}
				 * @public
				 *  */
				function getFoundsetManagerByFoundsetUUID(foundsetHash) {
					if (!foundsetHash) return null;

					if (foundsetHash === 'root') return foundset;

					if (state.foundsetManagers[foundsetHash]) {
						// double check if foundset hashmap still exists
						if (!getFoundSetByFoundsetUUID(foundsetHash)) {
							$log.error('This should not happen: could not verify foundset exists in foundsetHashmap ' + foundsetHash);
							return null;
						}
						return state.foundsetManagers[foundsetHash];
					} else {
						var foundsetRef = getFoundSetByFoundsetUUID(foundsetHash);
						var foundsetManager = new FoundSetManager(foundsetRef, foundsetHash, false);
						state.foundsetManagers[foundsetHash] = foundsetManager;
						return foundsetManager;
					}
				}

				/**
				 * remove the given foundset hash from the model hashmap.
				 * User to clear the memory
				 * @public
				 *  */
				function removeFoundSetByFoundsetUUID(foundsetHash) {

					if (foundsetHash === 'root') {
						$log.error('Trying to remove root foundset');
						return false;
					}

					// remove the hashedFoundsets
					$scope.svyServoyapi.callServerSideApi("removeGroupedFoundsetUUID", [foundsetHash]).then(function(removed) {
						if (removed) {
							delete state.foundsetManagers[foundsetHash];
						} else {
							$log.warn("could not delete hashed foundset " + foundsetHash);
						}
					}).catch(function(e) {
						$log.error(e);
					});

				}

				/**
				 * TODO rename grouped columns into stateGroupedColumns
				 *
				 * @type {Array}
				 * */
				function setStateGroupedColumns(columns) {
					// cache order of grouped columns
					state.grouped.columns = [];
					for (i = 0; i < columns.length; i++) {
						state.grouped.columns.push(columns[i].colId);
					}
				}

				/*************************************************************************************
				 *************************************************************************************
				 *
				 * Global Table Methods
				 *
				 *************************************************************************************
				 *************************************************************************************/

				/** Listener for the root foundset */
				function changeListener(change) {
					$log.debug("Root change listener is called " + state.waitfor.loadRecords);
					$log.debug(change);

					if(!isRootFoundsetLoaded) {
						if(change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROWS_COMPLETELY_CHANGED]) {
							isRootFoundsetLoaded = true;
							initRootFoundset();
						}
						return;
					}

					// Floor
					var idRandom = Math.floor(1000 * Math.random());

					if (change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED]) {
						$log.debug(idRandom + ' - 1. Sort');

						if (sortPromise && (JSON.stringify(gridOptions.api.getSortModel()) == JSON.stringify(getSortModel()))) {

							$log.debug('sort has been requested clientside, no need to update the changeListener');
							return;
						}

						var newSort = change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].newValue;
						var oldSort = change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].oldValue;

						// sort changed
						$log.debug("Change Sort Model " + newSort);
	
						/** TODO check with R&D, sortColumns is updated only after the viewPort is update or there could be a concurrency race. When i would know when sort is completed ? */
						if (newSort != oldSort) {
							$log.debug('myFoundset sort changed ' + newSort);
							// could be already set when clicking sort on header and there is an onsort handler, so skip reseting it, to avoid a new onsort call
							if((JSON.stringify(gridOptions.api.getSortModel()) != JSON.stringify(getSortModel()))) {
								gridOptions.api.setSortModel(getSortModel());
							}
							gridOptions.api.purgeServerSideCache();
							isSelectionReady = false;
						} else if (newSort == oldSort && !newSort && !oldSort) {
							$log.warn("this should not be happening");
						}
						// do nothing else after a sort ?
						// sort should skip purge
						return;
					}

					// if viewPort changes and startIndex does not change is the result of a sort or of a loadRecords
					if (change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROWS_COMPLETELY_CHANGED] && !state.waitfor.loadRecords) {
						$log.debug(idRandom + ' - 2. Change foundset serverside');
						$log.debug("Foundset changed serverside ");

						if (isTableGrouped()) {
							// Foundset state is changed server side, shall refresh all groups to match new query criteria
							var promise = groupManager.updateFoundsetRefs(getRowGroupColumns());
							promise.then(function() {
								$log.debug('refreshing datasource with success');
								refreshDatasource();
							});
							promise.catch(function(e) {
								$log.error(e);
								initRootFoundset();
							});
						} else {
							refreshDatasource();
						}
						return;
					} else {
						$log.debug("wait for loadRecords request " + state.waitfor.loadRecords);
					}

					if (change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED]) {
						$log.debug(idRandom + ' - 4. Notify viewport row update');
						var updates = change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED].updates;
						if(updateRows(updates, null, null)) {
							// i don't need a selection update in case of purge
							return;
						}
					}

					// gridOptions.api.purgeEnterpriseCache();
					if (change[$foundsetTypeConstants.NOTIFY_SELECTED_ROW_INDEXES_CHANGED] && !requestSelectionPromises.length) {
						$log.debug(idRandom + ' - 3. Request selection changed');
						selectedRowIndexesChanged();
					}

				}

				function selectedRowIndexesChanged(foundsetManager) {
					// FIXME can't select the record when is not in viewPort. Need to synchornize with viewPort record selection
					$log.debug(' - 2.1 Request selection changes');

					// Disable selection when table is grouped
					if (isTableGrouped()) {
						return;
					}

					// old selection
					var oldSelectedNodes = gridOptions.api.getSelectedNodes();

					// CHANGE Seleciton
					if (!foundsetManager) {
						foundsetManager = foundset;
					}

					var selectedNodes = new Array();
					for(var i = 0; i < foundsetManager.foundset.selectedRowIndexes.length; i++) {

						var rowIndex = foundsetManager.foundset.selectedRowIndexes[i] - foundsetManager.foundset.viewPort.startIndex;
						// find rowid
						if (rowIndex > -1 && foundsetManager.foundset.viewPort.rows[rowIndex]) {
							//rowIndex >= foundsetManager.foundset.viewPort.startIndex && rowIndex <= foundsetManager.foundset.viewPort.size + foundsetManager.foundset.viewPort.startIndex) {
							if (!foundsetManager.foundset.viewPort.rows[rowIndex]) {
								$log.error('how is possible there is no rowIndex ' + rowIndex + ' on viewPort size ' + foundsetManager.foundset.viewPort.rows.length);
								// TODO deselect node
								continue;
							}

							var node = gridOptions.api.getRowNode(foundsetManager.foundsetUUID + "_" + foundsetManager.foundset.selectedRowIndexes[i]);
							if (node) {
								selectedNodes.push(node);
							}
						} else {
							// TODO selected record is not in viewPort: how to render it ?
						}
					}

					for (var i = 0; i < oldSelectedNodes.length; i++) {
						if(selectedNodes.indexOf(oldSelectedNodes[i]) == -1) {
							oldSelectedNodes[i].setSelected(false);
						}
					}

					for (var i = 0; i < selectedNodes.length; i++) {
						if(oldSelectedNodes.indexOf(selectedNodes[i]) == -1) {
							selectedNodes[i].setSelected(true);
						}
					}
				}

				function scrollToSelection(foundsetManager)
				{
					// don't do anything if table is grouped.
					if (isTableGrouped()) {
						return;
					}
					
					if (!foundsetManager) {
						foundsetManager = foundset;
					}

					if(foundsetManager.foundset.selectedRowIndexes.length) {
						var model = gridOptions.api.getModel();
						if(model.rootNode.childrenCache) {
							// virtual row count must be multiple of CHUNK_SIZE (limitation/bug of aggrid)
							var offset = foundsetManager.foundset.selectedRowIndexes[0] % CHUNK_SIZE
							var virtualRowCount = foundsetManager.foundset.selectedRowIndexes[0] + (CHUNK_SIZE - offset);

							if(virtualRowCount > model.rootNode.childrenCache.getVirtualRowCount() &&
								virtualRowCount <= foundsetManager.foundset.serverSize) {
								model.rootNode.childrenCache.setVirtualRowCount(virtualRowCount);
							}
						}
						gridOptions.api.ensureIndexVisible(foundsetManager.foundset.selectedRowIndexes[0]);
					}
				}

				/**
				 * Returns true if table is grouping
				 * @return {Boolean}
				 *  */
				function isTableGrouped() {
					var rowGroupCols = getRowGroupColumns();
					return rowGroupCols && rowGroupCols.length > 0;
				}

				/**
				 * Returns table's rowGroupColumns
				 * @return {Boolean}
				 *  */
				function getRowGroupColumns() {
					var rowGroupCols = gridOptions.columnApi.getRowGroupColumns();
					return rowGroupCols;
				}

				/**
				 * Update the uiGrid row with given viewPort index
				 * @param {Array<{startIndex: Number, endIndex: Number, type: Number}>} rowUpdates
				 * @param {Number} [oldStartIndex]
				 * @param {Number} oldSize
				 *
				 * return {Boolean} whatever a purge ($scope.purge();) was done due to update
				 *  */
				function updateRows(rowUpdates, oldStartIndex, oldSize) {
					var needPurge = false;

					// Don't update automatically if the row are grouped
					if (isTableGrouped()) {
						// register update
						$scope.dirtyCache = true;
						return needPurge;
					}
					
					for (var i = 0; i < rowUpdates.length; i++) {
						var rowUpdate = rowUpdates[i];
						switch (rowUpdate.type) {
						case $foundsetTypeConstants.ROWS_CHANGED:
							for (var j = rowUpdate.startIndex; j <= rowUpdate.endIndex; j++) {
								updateRow(j);
							}
							break;
						case $foundsetTypeConstants.ROWS_INSERTED:
						case $foundsetTypeConstants.ROWS_DELETED:
							needPurge = true;
							break;
						default:
							break;
						}
						// TODO can update single rows ?
					}

					if(needPurge) {
						$scope.purge();
					}
					return needPurge;
				}

				/**
				 * Update the uiGrid row with given viewPort index
				 * @param {Number} index
				 * @param {Object} [foundsetObj]
				 *
				 *  */
				function updateRow(index, foundsetObj) {
					var row;
					if (!foundsetObj) {
						row = foundset.getViewPortRow(index);
					} else {
						row = getClientViewPortRow(foundsetObj, index); // TODO get it from viewportObj
					}

					if (row) {
						var rowFoundsetIndex = foundset.foundset.viewPort.startIndex + index;
						var node = gridOptions.api.getRowNode(row._svyFoundsetUUID + "_" + rowFoundsetIndex);
						if(node) {
							// check if row is really changed
							var isRowChanged = false;
							for(var rowItemKey in row) {
								var currentRowItemValue = node.data[rowItemKey];
								if(currentRowItemValue && (currentRowItemValue.displayValue != undefined)) {
									currentRowItemValue = currentRowItemValue.displayValue;
								}
								if(row[rowItemKey] !== currentRowItemValue) {
									isRowChanged = true;
									break;
								}
							}

							// find the columns with styleClassDataprovider
							var styleClassDPColumns = [];
							var allDisplayedColumns = gridOptions.columnApi.getAllDisplayedColumns();

							for (i = 0; i < allDisplayedColumns.length; i++) {
								var column = allDisplayedColumns[i];
								var columnModel = getColumn(column.colDef.field)
								if (columnModel && columnModel.styleClassDataprovider) {
									styleClassDPColumns.push(column);
								}
							}

							if(isRowChanged || styleClassDPColumns.length) {
								// find first editing cell for the updating row
								var editCells = gridOptions.api.getEditingCells();
								var editingColumnId = null;
								for(var i = 0; i < editCells.length; i++) {
									if(index == editCells[i].rowIndex) {
										editingColumnId = editCells[i].column.colId;
										break;
									}
								}

								// stop editing to allow setting the new data
								if(editingColumnId) {
									gridOptions.api.stopEditing(false);
								}

								if(isRowChanged) {
									node.setData(row);
								}

								if(styleClassDPColumns.length) {
									var refreshParam = {
										rowNodes: [node],
										columns: styleClassDPColumns,
										force: true
									};
									gridOptions.api.refreshCells(refreshParam);
								}

								// restart the editing
								if(editingColumnId) {
									gridOptions.api.startEditingCell({rowIndex: index, colKey: editingColumnId});
								}
							}
						}
						else {
							$log.warn("could not find row at index " + index);	
						}
					}
					else {
						$log.warn("could not update row at index " + index);
					}
				}

				/** return the row of the given foundsetObj at given index */
				function getClientViewPortRow(foundsetObj, index) {
					var row;
					if (foundsetObj.viewPort.rows) {
						row = foundsetObj.viewPort.rows[index];
					}
					return row;
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

				/**
				 * Callback used by ag-grid colDef.tooltip
				 */
				function getTooltip(args) {
					var tooltip = "";
					// skip pinned (footer) nodes
					if(!args.node.rowPinned) {
						if (!isTableGrouped()) {
							var column = getColumn(args.colDef.field);
							if (column && column.tooltip) {
								var index = args.node.rowIndex - foundset.foundset.viewPort.startIndex;
								tooltip = column.tooltip[index];
							}
						}
						else {
							var foundsetManager = getFoundsetManagerByFoundsetUUID(args.data._svyFoundsetUUID);
							var index = foundsetManager.getRowIndex(args.data) - foundsetManager.foundset.viewPort.startIndex;
							if (index >= 0 && foundsetManager.foundset.viewPort.rows[index][args.colDef.field + "_tooltip"] != undefined) {
								tooltip = foundsetManager.foundset.viewPort.rows[index][args.colDef.field + "_tooltip"];
							}
						}
					}
					return tooltip;
				}

				/**
				 * Callback used by ag-grid colDef.editable
				 */
				function isColumnEditable(args) {

					// skip pinned (footer) nodes
					if(args.node.rowPinned) return false;

					// if read-only and no r-o columns
					if($scope.model.readOnly && !$scope.model.readOnlyColumnIds) return false;

					var rowGroupCols = getRowGroupColumns();
					for (var i = 0; i < rowGroupCols.length; i++) {
						if (args.colDef.field == rowGroupCols[i].colDef.field) {
							return false;	// don't allow editing columns used for grouping
						}
					}

					var isColumnEditable = true;
					if (!isTableGrouped()) {
						var column = getColumn(args.colDef.field);
						if (column && column.isEditableDataprovider) {
							var index = args.node.rowIndex - foundset.foundset.viewPort.startIndex;
							isColumnEditable = column.isEditableDataprovider[index];
						}
					}
					else {
						var foundsetManager = getFoundsetManagerByFoundsetUUID(args.data._svyFoundsetUUID);
						var index = foundsetManager.getRowIndex(args.data) - foundsetManager.foundset.viewPort.startIndex;
						if (index >= 0 && foundsetManager.foundset.viewPort.rows[index][args.colDef.field + "_isEditableDataprovider"] != undefined) {
							isColumnEditable = foundsetManager.foundset.viewPort.rows[index][args.colDef.field + "_isEditableDataprovider"];
						}
					}

					// if editable check the r-o state from the runtime map
					if(isColumnEditable && $scope.model.readOnlyColumnIds && args.colDef.colId && $scope.model.readOnlyColumnIds['_' + args.colDef.colId] != undefined) {
						return !$scope.model.readOnlyColumnIds['_' + args.colDef.colId];
					}

					return isColumnEditable && !$scope.model.readOnly;
				}
				
				function getFooterData() {
					var result = [];
					var hasFooterData = false;
					var resultData = {}
					for (var i = 0; $scope.model.columns && i < $scope.model.columns.length; i++) {
						var column = $scope.model.columns[i];
						if (column.footerText) {
							var	colId = getColumnID(column, i);
							if (colId) {
								resultData[colId] = column.footerText;
								hasFooterData = true;
							}
							
						}
					}
					if (hasFooterData) {
						result.push(resultData)
					}
					return result;
				}

				/**
				 * @public
				 * @return {Array<Object>}
				 *  */
				function getColumnDefs() {
					
					var cellRenderer = function(params) {
						var isGroupColumn = false;
						var colId = null;
						if(params.colDef.field == undefined) {
							isGroupColumn = true;
							if(params.colDef.colId.indexOf("ag-Grid-AutoColumn-") == 0) {
								colId = params.colDef.colId.substring("ag-Grid-AutoColumn-".length);
							}
						}
						else {
							colId = params.colDef.field;
						}

						var col = colId != null ? getColumn(colId) : null;
						var value = params.value;
						
						var returnValueFormatted = false;
						if(col != null && col.showAs == 'html') {
							value =  value && value.displayValue != undefined ? value.displayValue : value;
						} else if(col != null && col.showAs == 'sanitizedHtml') {
							value = $sanitize(value && value.displayValue != undefined ? value.displayValue : value)
						} else if (value && value.contentType && value.contentType.indexOf('image/') == 0 && value.url) {
							value = '<img class="ag-table-image-cell" src="' + value.url + '">';
						} else {
							returnValueFormatted = true;
						}
					
						if(value instanceof Date) returnValueFormatted = true;

						var styleClassProvider = null;
						if(!isGroupColumn) {
							if(!params.node.rowPinned) {
								if (!isTableGrouped()) {
									var column = getColumn(params.colDef.field);
									if (column && column.styleClassDataprovider) {
										var index = params.rowIndex - foundset.foundset.viewPort.startIndex;
										styleClassProvider = column.styleClassDataprovider[index];
									}
								} else if (params.data && params.data._svyFoundsetUUID) {
										var foundsetManager = getFoundsetManagerByFoundsetUUID(params.data._svyFoundsetUUID);
										var index = foundsetManager.getRowIndex(params.data) - foundsetManager.foundset.viewPort.startIndex;
										if (index >= 0) {
											styleClassProvider = foundsetManager.foundset.viewPort.rows[index][params.colDef.field + "_styleClassDataprovider"];
										} else {
											$log.warn('cannot render styleClassDataprovider for row at index ' + index)
											$log.warn(params.data);
										}
								}
							} else if(col.footerStyleClass && params.node.rowPinned == "bottom") { // footer
								styleClassProvider = col.footerStyleClass;
							}
						}
							
						if(styleClassProvider) {
							var divContainer = document.createElement("div");
							divContainer.className = styleClassProvider;
							divContainer.innerHTML = returnValueFormatted ? params.valueFormatted : value;
							return divContainer;
						}
						else {
							return returnValueFormatted ? document.createTextNode(params.valueFormatted) : value;
						}
					}

					//create the column definitions from the specified columns in designer
					var colDefs = [];
					var colDef = { };
					var column;
					for (var i = 0; $scope.model.columns && i < $scope.model.columns.length; i++) {
						column = $scope.model.columns[i];

						var field = getColumnID(column, i);
						//create a column definition based on the properties defined at design time
						colDef = {
							headerName: column.headerTitle ? column.headerTitle : "",
							field: field,
							headerTooltip: column.headerTooltip ? column.headerTooltip : null,
							cellRenderer: cellRenderer
						};

						if(column.id) {
							colDef.colId = column.id;
						}

						// styleClass
						colDef.headerClass = 'ag-table-header' + (column.headerStyleClass ? ' ' + column.headerStyleClass : '');
						if (column.styleClassDataprovider) {
							colDef.cellClass = getCellClass;
						} else {
							colDef.cellClass = 'ag-table-cell' + (column.styleClass ? ' ' + column.styleClass : '');
						}

						// column grouping
						colDef.enableRowGroup = column.enableRowGroup;
						if (column.rowGroupIndex >= 0) colDef.rowGroupIndex = column.rowGroupIndex;
						if (column.width || column.width === 0) colDef.width = column.width;
	        			
	                    // tool panel
	                    if (column.enableToolPanel === false) colDef.suppressToolPanel = !column.enableToolPanel;
						
						// column sizing
						if (column.maxWidth) colDef.maxWidth = column.maxWidth;
						if (column.minWidth || column.minWidth === 0) colDef.minWidth = column.minWidth;
						if (column.visible === false) colDef.hide = true;
						
	                    // column resizing https://www.ag-grid.com/javascript-grid-resizing/
	        			if (column.enableResize === false) colDef.resizable = false;
	        			if (column.autoResize === false) colDef.suppressSizeToFit = !column.autoResize;
						
						// column sort
						if (column.enableSort === false) colDef.sortable = false;

						// define the columnMenuTabs
//						var colMenuTabs = [];
//						// TODO shall always allow the column generalMenuTab, so it can have pinning auto-resize etc !?
//						if (column.enableRowGroup) colMenuTabs.push('generalMenuTab');
//						if (column.filterType) colMenuTabs.push('filterMenuTab');				
//						column.menuTabs = colMenuTabs;
						
						if (column.editType) {
							colDef.editable = isColumnEditable;

							if(column.editType == 'TEXTFIELD' || column.editType == 'TYPEAHEAD') {
								colDef.cellEditor = getTextEditor();
								colDef.cellEditorParams = {
							  		svyEditType: column.editType
								}
							}
							else if(column.editType == 'DATEPICKER') {
								colDef.cellEditor = getDatePicker();
							}
							else if(column.editType == 'COMBOBOX') {
								colDef.cellEditor = getSelectEditor();
							}
							else if(column.editType == 'FORM') {
								colDef.cellEditor = getFormEditor();
							}

							colDef.onCellValueChanged = function(params) {
								// in case value change is triggered by clicking into another cell
								// we need a timeout so the new cell will enter edit mode (updateFoundsetRecord needs
								// to know the new editing cell, so it can restore its editing state after update)
								setTimeout(function() {
									updateFoundsetRecord(params);
								}, 200);
							}
						}

						if (column.filterType) {
							colDef.suppressFilter = false;

							if(column.filterType == 'TEXT') {
								colDef.filter = 'agTextColumnFilter';
							}
							else if(column.filterType == 'NUMBER') {
								colDef.filter = 'agNumberColumnFilter';
							}
							else if(column.filterType == 'DATE') {
								colDef.filter = 'agDateColumnFilter';
							}
							
							colDef.filterParams = { applyButton: true, clearButton: true, newRowsAction: 'keep', suppressAndOrCondition: true, caseSensitive: false };
						}

						if(true) {
							colDef.tooltipValueGetter = getTooltip;
						}

						var columnOptions = {};
						if($injector.has('ngDataGrid')) {
							var groupingtableDefaultConfig = $services.getServiceScope('ngDataGrid').model;
							if(groupingtableDefaultConfig.columnOptions) {
								columnOptions = groupingtableDefaultConfig.columnOptions;
							}
						}

						columnOptions = mergeConfig(columnOptions, column.columnDef);

						if(columnOptions) {
							for (var property in columnOptions) {
								if (columnOptions.hasOwnProperty(property)) {
									colDef[property] = columnOptions[property];
								}
							}
						}

						colDefs.push(colDef);
					}

					// TODO svyRowId should not be visible. I need the id for the selection
					colDefs.push({
						field: '_svyRowId',
						headerName: '_svyRowId',
						suppressToolPanel: true,
						suppressMenu: true,
						suppressNavigable: true,
						resizable: false,
						hide: true
					});

					colDefs.push({
						field: '_svyFoundsetUUID',
						headerName: '_svyFoundsetUUID',
						suppressToolPanel: true,
						suppressMenu: true,
						suppressNavigable: true,
						resizable: false,
						hide: true
					});

					return colDefs;
				}

				function updateColumnDefs() {
					// need to clear/remove old columns first, else the id for
					// the new columns will have the counter at the end (ex. "myid_1")
					// and that will broke our getColumn()
					gridOptions.api.setColumnDefs([]);

					gridOptions.api.setColumnDefs(getColumnDefs());
					// selColumnDefs should redraw the grid, but it stopped doing so from v19.1.2
					$scope.purge();	
				}
				
				function updateColumnHeaderTitle(id, text) {					
					// get a reference to the column
					var col = gridOptions.columnApi.getColumn(id);

					// obtain the column definition from the column
					var colDef = col.getColDef();

					// update the header name
					colDef.headerName = text;

					// the column is now updated. to reflect the header change, get the grid refresh the header
					gridOptions.api.refreshHeader();
				}

				// FIXME styleClass Dataprovider on groups

				function getRowClass(params) {

					var rowIndex = params.node.rowIndex;
					var styleClassProvider;

					// make sure we remove non ag- classes, we consider those added by rowStyleClassDataprovider
					var rowElement = $element.find("[row-index='" + params.rowIndex + "']"); 
					if(rowElement.length) {
						var classes = rowElement.attr("class").split(/\s+/);
						for(var j = 0; j < classes.length; j++) {
							if(classes[j].indexOf("ag-") != 0) {
								rowElement.removeClass(classes[j]);
							}
						}
					}

					// TODO can i get rowStyleClassDataprovider from grouped foundset ?
					if (!isTableGrouped()) {
						var index = rowIndex - foundset.foundset.viewPort.startIndex;
						// TODO get proper foundset
						styleClassProvider = $scope.model.rowStyleClassDataprovider[index];
					} else if (params.node.group === false) {

						var rowGroupCols = [];
						var groupKeys = [];

						var parentNode = params.node.parent;
						var childRowIndex = rowIndex - Math.max(parentNode.rowIndex + 1, 0);
						while (parentNode && parentNode.level >= 0 && parentNode.group === true) {

							// check if all fields are fine
							if (!parentNode.field && !parentNode.data) {
								$log.warn("cannot resolve rowStyleClassDataprovider for row at rowIndex " + rowIndex);
								// exit
								return styleClassProvider;
							}

							// is reverse order
							rowGroupCols.unshift({field: parentNode.field, id: parentNode.field});
							groupKeys.unshift(parentNode.data[parentNode.field]);

							// next node
							parentNode = parentNode.parent;
						}

						// having groupKeys and rowGroupCols i can get the foundset.

						var foundsetUUID = groupManager.getCachedFoundsetUUID(rowGroupCols, groupKeys)
						// got the hash, problem is that is async.
						var foundsetManager = getFoundsetManagerByFoundsetUUID(foundsetUUID);
						if (foundsetManager && foundsetManager.foundset.viewPort.rows[0]['__rowStyleClassDataprovider']) {
							var index = childRowIndex - foundsetManager.foundset.viewPort.startIndex;
							if (index >= 0 && index < foundsetManager.foundset.viewPort.size) {
								styleClassProvider = foundsetManager.foundset.viewPort.rows[index]['__rowStyleClassDataprovider'];
							} else {
								$log.warn('cannot render rowStyleClassDataprovider for row at index ' + index)
								$log.warn(params.data);
							}
						} else {
							$log.debug("Something went wrong for foundset hash " + foundsetUUID)
						}
					}
					return styleClassProvider;
				}

				function getCellClass(params) {
					var column = getColumn(params.colDef.field);

					var cellClass = 'ag-table-cell';
					if(column.styleClass) cellClass += ' ' + column.styleClass;

					return cellClass;
				}

				/**
				 * TODO parametrize foundset or add it into foundsetManager object
				 * Returns the sort model for the root foundset
				 *
				 * @return {SortModelType}
				 * */
				function getSortModel() {
					var sortModel = [];
					var sortColumns = foundset.getSortColumns();
					if (sortColumns) {
						sortColumns = sortColumns.split(",");
						for (var i = 0; i < sortColumns.length; i++) {
							// TODO parse sortColumns into default sort string
							/** @type {String} */
							var sortColumn = sortColumns[i];
							var idForFoundset;
							var sortDirection;
							if (!sortColumn) {
								continue;
							} else if (sortColumn.substr(sortColumn.length - 5, 5) === " desc") {
								var idForFoundset = sortColumn.substring(0, sortColumn.length - 5);
								sortDirection = "desc";
							} else if (sortColumn.substr(sortColumn.length - 4, 4) === " asc") {
								idForFoundset = sortColumn.substring(0, sortColumn.length - 4),
								sortDirection = "asc";
							}
							
							// add it into the sort model
							if (idForFoundset && sortDirection) {
								var agColIds = getColIDs(idForFoundset);
								
								for (var j = 0; j < agColIds.length; j++) {
									sortModel.push({
										colId: agColIds[j],
										sort: sortDirection
									});
								}
							}
						}
					}
					return sortModel;
				}

				/**
				 * @param {String} field
				 * @param {String|Number|Boolean} value
				 * @param {Object} column
				 * @deprecated
				 *
				 * @return {String}
				 * */
				function getValuelistValue(field, value, column) {
					var valuelist = column.valuelist;
					if (valuelist) {
						for (i = 0; i < valuelist.length; i++) {
							if (value === valuelist[i].realValue) {
								return valuelist[i].displayValue;
							}
						}

						// else do the query
						// what should i do once the result is returned ???
						return valuelist.getDisplayValue(value);

					}

					return value;
				}

				/**
				 * Returns the column identifier
				 * @param {Object} column
				 * @param {Number} idx
				 *
				 * @return {String}
				 *
				 * @private
				 * */
				function getColumnID(column, idx) {					
					if (column.dataprovider) {
						return column.dataprovider.idForFoundset + ':' + idx;
					} else {
						return "col_" + idx;
					}
				}

				/**
				 * Returns the column with the given fieldName
				 * @param {String} field
				 * @return {Object}
				 * */
				function getColumn(field, columnsModel) {
					var fieldToCompare = field;
					var fieldIdx = 0;
					if (field.indexOf('_') > 0) { // has index
						var fieldParts = field.split('_');
						if('col' != fieldParts[0] && !isNaN(fieldParts[1])) {
							fieldToCompare = fieldParts[0];
							fieldIdx = parseInt(fieldParts[1]);
						}
					}
					if (!columnsModel && state.columns[field]) { // check if is already cached
						return state.columns[field];
					} else {
						var columns = columnsModel ? columnsModel : $scope.model.columns;
						for (var i = 0; i < columns.length; i++) {
							var column = columns[i];
							if (column.id === fieldToCompare || getColumnID(column, i) === fieldToCompare) {
								if(fieldIdx < 1) {
									// cache it in hashmap for quick retrieval
									if(!columnsModel) state.columns[field] = column;
									return columns[i];
								}
								fieldIdx--;
							}
						}
					}
				}

				/**
				 * Returns the column with the given fieldName
				 * @param {String} field
				 * @return {Number}
				 * */
				function getColumnIndex(field) {
					var fieldToCompare = field;
					var fieldIdx = 0;
					if (field.indexOf('_') > 0) { // has index
						var fieldParts = field.split('_');
						if('col' != fieldParts[0] && !isNaN(fieldParts[1])) {
							fieldToCompare = fieldParts[0];
							fieldIdx = parseInt(fieldParts[1]);
						}
					}
					var columns = $scope.model.columns;
					for (var i = 0; i < columns.length; i++) {
						var column = columns[i];
						if (column.id === fieldToCompare || getColumnID(column, i) == fieldToCompare) {
							if(fieldIdx < 1) {
								return i;
							}
							fieldIdx--;
						}
					}
					return -1;
				}
				
				
				/**
				 * @param {String} idsForFoundset
				 * Finds all the columns with the given idForFoundset
				 *
				 * @return {Array<String>}
				 *
				 * @private
				 * */
				function getColIDs(idsForFoundset) {
					
					var result = [];
					if (!idsForFoundset) {
						return [];
					}
					
					for (var i = 0; i < $scope.model.columns.length; i++) {
						var column = $scope.model.columns[i];
						if (column.dataprovider && column.dataprovider.idForFoundset === idsForFoundset) {
							if (column.id) {
								// Use the colId if is set
								result.push(column.id);
							} else {
								// Use the field if colId is not available
								result.push(getColumnID(column, i));
							}
						}
					}
					return result;
				}

				/**
				 * @type {SortModelType}
				 *
				 * Returns the sortString and sortColumns array for the given sortModel
				 *
				 * @return {{sortString: String, sortColumns: Array<{name:String, direction:String}>}}
				 * */
				function getFoundsetSortModel(sortModel) {
					var sortString;
					var sortColumns = [];
					if (sortModel) {
						sortString = '';
						for (var i = 0; i < sortModel.length; i++) {
							var sortModelCol = sortModel[i];
							var column = getColumn(sortModelCol.colId);
							if (column) {
								var columnName = column.dataprovider.idForFoundset;
								var direction = sortModelCol.sort;
								if (i > 0) sortString += ',';
								sortString += columnName + ' ' + direction + '';
								sortColumns.push({ name: columnName, direction: direction });
							}
						}
						sortString = sortString.trim();
					}

					return {
						sortString: sortString,
						sortColumns: sortColumns
					};
				}

				function storeColumnsState() {
					if(isRendered) {
						var agColumnState = gridOptions.columnApi.getColumnState();

						var rowGroupColumns = getRowGroupColumns();
						var svyRowGroupColumnIds = [];
						for(var i = 0; i < rowGroupColumns.length; i++) {
							svyRowGroupColumnIds.push(rowGroupColumns[i].colId);
						}

						var filterModel = gridOptions.api.getFilterModel();
						var sortModel = gridOptions.api.getSortModel();

						var columnState = {
							columnState: agColumnState,
							rowGroupColumnsState: svyRowGroupColumnIds,
							filterModel: filterModel,
							sortModel: sortModel
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
						
						var restoreColumns = $scope.model.restoreStates == undefined || $scope.model.restoreStates.columns == undefined || $scope.model.restoreStates.columns;

						if(restoreColumns && $scope.model.columnStateOnError) {
							// can't parse columnState
							if(columnStateJSON == null || !Array.isArray(columnStateJSON.columnState)) {
								$window.executeInlineScript(
									$scope.model.columnStateOnError.formname,
									$scope.model.columnStateOnError.script,
									['Cannot restore columns state, invalid format']);
								return;
							}

							// if columns were added/removed, skip the restore
							var savedColumns = [];
							for(var i = 0; i < columnStateJSON.columnState.length; i++) {
								if(columnStateJSON.columnState[i].colId.indexOf('_') == 0) {
									continue; // if special column, that starts with '_'
								}
								savedColumns.push(columnStateJSON.columnState[i].colId);
							}
							if(savedColumns.length != $scope.model.columns.length) {
									$window.executeInlineScript(
										$scope.model.columnStateOnError.formname,
										$scope.model.columnStateOnError.script,
										['Cannot restore columns state, different number of columns in saved state and component']);
									return;
							}
	
							for(var i = 0; i < savedColumns.length; i++) {
								var columnExist = false;
								var fieldToCompare = savedColumns[i];
								var fieldIdx = 0;
								if (fieldToCompare.indexOf('_') > 0) { // has index
									var fieldParts = fieldToCompare.split('_');
									if(!isNaN(fieldParts[1])) {
										fieldToCompare = fieldParts[0];
										fieldIdx = parseInt(fieldParts[1]);
									}
								}
								for(var j = 0; j < $scope.model.columns.length; j++) {
									if(($scope.model.columns[j].id && fieldToCompare == $scope.model.columns[j].id) ||
									($scope.model.columns[j].dataprovider && fieldToCompare == getColumnID($scope.model.columns[j], j))) {
											if(fieldIdx < 1) {
												columnExist = true;
												break;
											}
											fieldIdx--;
									}
								}
								if(!columnExist) {
									$window.executeInlineScript(
										$scope.model.columnStateOnError.formname,
										$scope.model.columnStateOnError.script,
										['Cannot restore columns state, cant find column from state in component columns']);
									return;
								}
							}
						}

						if(columnStateJSON != null) {
							if(restoreColumns && Array.isArray(columnStateJSON.columnState) && columnStateJSON.columnState.length > 0) {
								gridOptions.columnApi.setColumnState(columnStateJSON.columnState);
							}

							if(restoreColumns && Array.isArray(columnStateJSON.rowGroupColumnsState) && columnStateJSON.rowGroupColumnsState.length > 0) {
								gridOptions.columnApi.setRowGroupColumns(columnStateJSON.rowGroupColumnsState);
							}

							if($scope.model.restoreStates && $scope.model.restoreStates.filter && $.isPlainObject(columnStateJSON.filterModel)) {
								gridOptions.api.setFilterModel(columnStateJSON.filterModel);
							}

							if($scope.model.restoreStates && $scope.model.restoreStates.sort && Array.isArray(columnStateJSON.sortModel)) {
								gridOptions.api.setSortModel(columnStateJSON.sortModel);
							}
						}
					}
				}


				/***********************************************************************************************************************************
				 ***********************************************************************************************************************************
				 *
				 * Generic methods
				 *
				 ************************************************************************************************************************************
				 ***********************************************************************************************************************************/

				function isResponsive() {
					// var parent = $element.parent();
					// !parent.hasClass('svy-wrapper');
					return !$scope.$parent.absoluteLayout;
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

				/**
				 * @private
				 * Check if objects are deep equal
				 * */
				function areObjectEqual(o1, o2) {
					if (o1 instanceof Array) {
						if (o1.lenght != o2.length) {
							return false;
						} else {
							for (var i = 0; i < o1.length; i++) {
								areObjectEqual(o1, o2);
							}
						}

					} else if (o1 instanceof String) {
						return o1 === o2;
					} else if (o1 instanceof Number) {
						return o1 === o2;
					} else if (o1 instanceof Date) {
						return o1 === o2;
					} else if (o1 instanceof Boolean) {
						return o1 === o2;
					} else if (o1 instanceof Function) {
						$log.warn('skip function debug');
					} else if (o1 === null) {
						return o2 === null;
					} else if (o1 === undefined) {
						return o2 === undefined;
					} else {
						for (var prop in o1) {
							if (o1[prop] !== o2[prop]) {
								return false;
							}
						}
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

				/***********************************************************************************************************************************
				 ***********************************************************************************************************************************
				 *
				 * API methods
				 *
				 ************************************************************************************************************************************
				 ***********************************************************************************************************************************/

				/**
				 * Notify the component about a data change. Makes the component aware of a data change that requires a refresh data.
				 * Call this method when you are aware of a relevant data change in the foundset which may affect data grouping (e.g. group node created or removed).
				 * The component will alert the user of the data change and will suggest the user to perform a refresh.
				 * <br/>
				 * Please note that it’s not necessary to notify the table component is the component is not visible;
				 * the component will always present the latest data when rendered again.
				 *
				 * @public
				 * */
				$scope.api.notifyDataChange = function() {
					$scope.dirtyCache = true;
				}

				/**
				 * Force a full refresh of the data.
				 * <br/>
				 * <br/>
				 * <b>WARNING !</b> be aware that calling this API results in bad user experience since all group nodes will be collapsed instantaneously.
				 *
				 * @public
				 * */
				$scope.api.refreshData = function() {
					$scope.purge();
				}

				/**
				 * Returns the selected rows when in grouping mode
				 */
				$scope.api.getGroupedSelection = function() {
					var groupedSelection = null;
					if(isTableGrouped()) {
						groupedSelection = new Array();
						var selectedNodes = gridOptions.api.getSelectedNodes();
						for(var i = 0; i < selectedNodes.length; i++) {
							var node = selectedNodes[i];
							if(node) {
								groupedSelection.push({ foundsetId: node.data._svyFoundsetUUID, _svyRowId: node.data._svyRowId });
							}
						}
					}
					return groupedSelection;
				}

				/**
				 * Start cell editing (only works when the table is not in grouping mode).
				 * @param foundsetindex foundset row index of the editing cell (1-based)
				 * @param columnindex column index in the model of the editing cell (0-based)
				 */
				$scope.api.editCellAt = function(foundsetindex, columnindex) {
					if(isTableGrouped()) {
						$log.warn('editCellAt API is not supported in grouped mode');
					}
					else if (foundsetindex < 1) {
						$log.warn('editCellAt API, invalid foundsetindex:' + foundsetindex);
					}
					else if(columnindex < 0 || columnindex > $scope.model.columns.length - 1) {
						$log.warn('editCellAt API, invalid columnindex:' + columnindex);
					}
					else {

						// if is not ready to edit, wait for the row to be rendered
						if(isSelectionReady) {
							var column = $scope.model.columns[columnindex];
							var	colId = column.id ? column.id : getColumnID(column, columnindex);
							setTimeout(function() {
								gridOptions.api.startEditingCell({
									rowIndex: foundsetindex - 1,
									colKey: colId
								});
							}, 0);

							// reset the edit cell coordinates
							startEditFoundsetIndex = -1;
							startEditColumnIndex = -1;
						}
						else {
							startEditFoundsetIndex = foundsetindex;
							startEditColumnIndex = columnindex;
						}
					}
				}
				
				/**
				 * Request focus on the given column
				 * @param columnindex column index in the model of the editing cell (0-based)
				 */
				$scope.api.requestFocus = function(columnindex) {
					if(isTableGrouped()) {
						requestFocusColumnIndex = -1;
						$log.warn('requestFocus API is not supported in grouped mode');
					} else if(columnindex < 0 || columnindex > $scope.model.columns.length - 1) {
						requestFocusColumnIndex = -1;
						$log.warn('requestFocus API, invalid columnindex:' + columnindex);
					} else {
						
						// if is not ready to request focus, wait for the row to be rendered
						if (isSelectionReady) {
							if ($scope.model.myFoundset && $scope.model.myFoundset.viewPort.size && $scope.model.myFoundset.selectedRowIndexes.length ) {								
								var column = $scope.model.columns[columnindex];
								var rowIndex = $scope.model.myFoundset.selectedRowIndexes[0];
								var	colId = column.id ? column.id : getColumnID(column, columnindex);
								gridOptions.api.setFocusedCell(rowIndex, colId, null);
								
								// reset the request focus column index
								requestFocusColumnIndex = -1;
							}
						} else {
							requestFocusColumnIndex = columnindex;
						}
					}
				}

				/**
				 * Scroll to the selected row
				 */				
				$scope.api.scrollToSelection = function() {
					if(isSelectionReady) {
						scrollToSelection();
						scrollToSelectionWhenSelectionReady = false;
					}
					else {
						scrollToSelectionWhenSelectionReady = true;
					}
				}

				/**
				 * If a cell is editing, it stops the editing
				 * @param cancel 'true' to cancel the editing (ie don't accept changes)
				 */
				$scope.api.stopCellEditing = function(cancel) {
					gridOptions.api.stopEditing(cancel);
				}

				// FIXME how to force re-fit when table is shown for the first time

				// bind resize event
				//				$(window).on('resize', onWindowResize);

				var destroyListenerUnreg = $scope.$on('$destroy', function() { // unbind resize on destroy
						//						$(window).off('resize', onWindowResize);

						// clear all foundsets
						groupManager.removeFoundsetRefAtLevel(0);
						$scope.model.myFoundset.removeChangeListener(changeListener);

						// remove model change notifier
						destroyListenerUnreg();
						delete $scope.model[$sabloConstants.modelChangeNotifier];

						// release grid resources
						delete gridOptions.onGridSizeChanged;
						gridOptions.api.destroy();

					});

				/** @deprecated  */
				function onWindowResize() { // resize
					// var width = $element.parent().width();
					// var height = $element.parent().height();
					setTimeout(function() {
							//sizeColumnsToFit();
						}, 150);
					// resize element using height and width
				}

				/**************************************************************************************************************************************************************************************************
				 **************************************************************************************************************************************************************************************************
				 *
				 * MOCK SERVER METHODS
				 *
				 **************************************************************************************************************************************************************************************************
				 **************************************************************************************************************************************************************************************************/

				/*
				 FoundsetServer.prototype.sortList = function(data, sortModel) {
				 $log.warn('Sort List' + sortModel)

				 console.log(data)
				 // TODO sort foundset

				 var sortPresent = sortModel && sortModel.length > 0;
				 if (!sortPresent) {
				 return data;
				 }
				 // do an in memory sort of the data, across all the fields
				 var resultOfSort = data.slice();
				 resultOfSort.sort(function(a, b) {
				 for (var k = 0; k < sortModel.length; k++) {
				 var sortColModel = sortModel[k];
				 var valueA = a[sortColModel.colId];
				 var valueB = b[sortColModel.colId];
				 // this filter didn't find a difference, move onto the next one
				 if (valueA == valueB) {
				 continue;
				 }
				 var sortDirection = sortColModel.sort === 'asc' ? 1 : -1;
				 if (valueA > valueB) {
				 return sortDirection;
				 } else {
				 return sortDirection * -1;
				 }
				 }
				 // no filters found a difference
				 return 0;
				 });
				 return resultOfSort;
				 };

				 FoundsetServer.prototype.filterList = function(data, filterModel) {
				 $log.warn('Filter List' + filterModel)

				 var filterPresent = filterModel && Object.keys(filterModel).length > 0;
				 if (!filterPresent) {
				 return data;
				 }

				 var resultOfFilter = [];
				 for (var i = 0; i < data.length; i++) {
				 var item = data[i];

				 if (filterModel.age) {
				 var age = item.age;
				 var allowedAge = parseInt(filterModel.age.filter);
				 if (filterModel.age.type == 'equals') {
				 if (age !== allowedAge) {
				 continue;
				 }
				 } else if (filterModel.age.type == 'lessThan') {
				 if (age >= allowedAge) {
				 continue;
				 }
				 } else {
				 if (age <= allowedAge) {
				 continue;
				 }
				 }
				 }

				 if (filterModel.year) {
				 if (filterModel.year.indexOf(item.year.toString()) < 0) {
				 // year didn't match, so skip this record
				 continue;
				 }
				 }

				 if (filterModel.country) {
				 if (filterModel.country.indexOf(item.country) < 0) {
				 continue;
				 }
				 }

				 resultOfFilter.push(item);
				 }

				 return resultOfFilter;
				 };

				 FoundsetServer.prototype.buildGroupsFromData = function(filteredData, rowGroupCols, groupKeys, valueCols) {
				 $log.warn('buildGroupsFromData' + rowGroupCols);

				 var rowGroupCol = rowGroupCols[groupKeys.length];
				 var field = rowGroupCol.field;
				 var mappedValues = this.groupBy(filteredData, field);
				 var listOfKeys = Object.keys(mappedValues);
				 var groups = [];
				 listOfKeys.forEach(function(key) {
				 var groupItem = { };
				 groupItem[field] = key;

				 valueCols.forEach(function(valueCol) {
				 var field = valueCol.field;

				 // the aggregation we do depends on which agg func the user picked
				 switch (valueCol.aggFunc) {
				 case 'sum':
				 var sum = 0;
				 mappedValues[key].forEach(function(childItem) {
				 var value = childItem[field];
				 sum += value;
				 });
				 groupItem[field] = sum;
				 break;
				 case 'min':
				 var min = null;
				 mappedValues[key].forEach(function(childItem) {
				 var value = childItem[field];
				 if (min === null || min > value) {
				 min = value;
				 }
				 });
				 groupItem[field] = min;
				 break;
				 case 'max':
				 var max = null;
				 mappedValues[key].forEach(function(childItem) {
				 var value = childItem[field];
				 if (max === null || max < value) {
				 max = value;
				 }
				 });
				 groupItem[field] = max;
				 break;
				 case 'random':
				 groupItem[field] = Math.random(); // just make up a number
				 break;
				 default:
				 $log.warn('unrecognised aggregation function: ' + valueCol.aggFunc);
				 break;
				 }

				 });

				 groups.push(groupItem)
				 });
				 return groups;
				 };

				 // if user is down some group levels, we take everything else out. eg
				 // if user has opened the two groups United States and 2002, we filter
				 // out everything that is not equal to United States and 2002.
				 FoundsetServer.prototype.filterOutOtherGroups = function(originalData, groupKeys, rowGroupCols) {

				 $log.warn('filterOutOtherGroups ' + rowGroupCols);

				 var filteredData = originalData;
				 var that = this;

				 // if we are inside a group, then filter out everything that is not
				 // part of this group
				 groupKeys.forEach(function(groupKey, index) {
				 var rowGroupCol = rowGroupCols[index];
				 var field = rowGroupCol.field;

				 filteredData = that.filter(filteredData, function(item) {
				 return item[field] == groupKey;
				 });
				 });

				 return filteredData;
				 };

				 // simple implementation of lodash groupBy
				 FoundsetServer.prototype.groupBy = function(data, field) {
				 $log.warn('group by ' + field);

				 var result = { };
				 data.forEach(function(item) {
				 var key = item[field];
				 var listForThisKey = result[key];
				 if (!listForThisKey) {
				 listForThisKey = [];
				 result[key] = listForThisKey;
				 }
				 listForThisKey.push(item);
				 });
				 return result;
				 };

				 // simple implementation of lodash filter
				 FoundsetServer.prototype.filter = function(data, callback) {

				 $log.warn('filter ' + data);

				 var result = [];
				 data.forEach(function(item) {
				 if (callback(item)) {
				 result.push(item);
				 }
				 });
				 return result;
				 };

				 */

				/**************************************************************************************************************************************************************************************************
				 **************************************************************************************************************************************************************************************************
				 *
				 * TABLE EXAMPLE
				 *
				 **************************************************************************************************************************************************************************************************
				 **************************************************************************************************************************************************************************************************/

				/*
				 function FoundsetServer(allData) {
				 this.initData(allData);
				 }

				 FoundsetServer.prototype.initData = function(allData) {
				 var topLevelCountryGroups = [];
				 var bottomLevelCountryDetails = { }; // will be a map of [country name => records]

				 allData.forEach(function(dataItem) {
				 // get country this item is for
				 var customerid = dataItem.customerid;

				 // get the top level group for this country
				 var childrenThisCountry = bottomLevelCountryDetails[customerid];
				 var groupThisCountry = this.find(topLevelCountryGroups, { customerid: customerid });
				 if (!childrenThisCountry) {
				 // no group exists yet, so create it
				 childrenThisCountry = [];
				 bottomLevelCountryDetails[customerid] = childrenThisCountry;

				 // add a group to the top level
				 groupThisCountry = { customerid: customerid, count: 0 };
				 topLevelCountryGroups.push(groupThisCountry);
				 }

				 // add this record to the county group
				 childrenThisCountry.push(dataItem);

				 // increment the group sums
				 groupThisCountry.count++;
				 });

				 this.topLevelCountryGroups = topLevelCountryGroups;
				 this.bottomLevelCountryDetails = bottomLevelCountryDetails;

				 this.topLevelCountryGroups.sort(function(a, b) {
				 return a.country < b.customerid ? -1 : 1;
				 });
				 };

				 FoundsetServer.prototype.sortList = function(data, sortModel) {
				 var sortPresent = sortModel && sortModel.length > 0;
				 if (!sortPresent) {
				 return data;
				 }
				 // do an in memory sort of the data, across all the fields
				 var resultOfSort = data.slice();
				 resultOfSort.sort(function(a, b) {
				 for (var k = 0; k < sortModel.length; k++) {
				 var sortColModel = sortModel[k];
				 var valueA = a[sortColModel.colId];
				 var valueB = b[sortColModel.colId];
				 // this filter didn't find a difference, move onto the next one
				 if (valueA == valueB) {
				 continue;
				 }
				 var sortDirection = sortColModel.sort === 'asc' ? 1 : -1;
				 if (valueA > valueB) {
				 return sortDirection;
				 } else {
				 return sortDirection * -1;
				 }
				 }
				 // no filters found a difference
				 return 0;
				 });
				 return resultOfSort;
				 };

				 // when looking for the top list, always return back the full list of countries
				 FoundsetServer.prototype.getTopLevelCountryList = function(callback, request) {

				 var lastRow = this.getLastRowResult(this.topLevelCountryGroups, request);
				 var rowData = this.getBlockFromResult(this.topLevelCountryGroups, request);

				 // put the response into a timeout, so it looks like an async call from a server
				 setTimeout(function() {
				 callback(rowData, lastRow);
				 }, 1000);
				 };

				 FoundsetServer.prototype.getCountryDetails = function(callback, country, request) {

				 var countryDetails = this.bottomLevelCountryDetails[country];

				 var countryDetailsSorted = this.sortList(countryDetails, request.sortModel);

				 var lastRow = this.getLastRowResult(countryDetailsSorted, request);
				 var rowData = this.getBlockFromResult(countryDetailsSorted, request);

				 // put the response into a timeout, so it looks like an async call from a server
				 setTimeout(function() {
				 callback(rowData, lastRow);
				 }, 1000);
				 };

				 FoundsetServer.prototype.getBlockFromResult = function(data, request) {
				 return data.slice(request.startRow, request.endRow);
				 };

				 FoundsetServer.prototype.getLastRowResult = function(result, request) {
				 // we mimic finding the last row. if the request exceeds the length of the
				 // list, then we assume the last row is found. this would be similar to hitting
				 // a database, where we have gone past the last row.
				 var lastRowFound = (result.length <= request.endRow);
				 var lastRow = lastRowFound ? result.length : null;
				 return lastRow;
				 };/*

				 /********************************************
				 *  Sample Table
				 *
				 *  ***************************************/

				/*
				 return;
				 var columnDefsSample = [{ headerName: "Athlete", field: "athlete" }, { headerName: "Age", field: "age" }, { headerName: "Country", field: "country", rowGroupIndex: 0 }, { headerName: "Year", field: "year" }, { headerName: "Sport", field: "sport" }, { headerName: "Gold", field: "gold" }, { headerName: "Silver", field: "silver" }, { headerName: "Bronze", field: "bronze" }];

				 var gridOptionsSample = {
				 defaultColDef: {
				 width: 100,
				 suppressFilter: true
				 },
				 enableSorting: true,
				 columnDefs: columnDefsSample,
				 enableColResize: true,
				 // use the enterprise row model
				 rowModelType: 'enterprise',
				 // gridOptions.rowModelType = 'infinite';
				 // bring back data 50 rows at a time
				 cacheBlockSize: 50,
				 // don't show the grouping in a panel at the top
				 rowGroupPanelShow: 'never',
				 animateRows: true,
				 debug: true
				 };

				 var gridDivSample = document.querySelector('#myGrid2');
				 new agGrid.Grid(gridDivSample, gridOptionsSample);

				 // do http request to get our sample data - not using any framework to keep the example self contained.
				 // you will probably use a framework like JQuery, Angular or something else to do your HTTP calls.
				 agGrid.simpleHttpRequest({ url: '/olympicWinners.json' }).then(function(rows) {
				 var fakeServer = new FakeServer(rows);
				 var datasource = new EnterpriseDatasource(fakeServer);
				 gridOptions.api.setEnterpriseDatasource(datasource);
				 }
				 );

				 function EnterpriseDatasource(fakeServer) {
				 this.fakeServer = fakeServer;
				 }

				 EnterpriseDatasource.prototype.getRows = function(params) {
				 console.log('EnterpriseDatasource.getRows: params = ', params);

				 var request = params.request;

				 // if we are on the top level, then group keys will be [],
				 // if we are on the second level, then group keys will be like ['United States']
				 var groupKeys = request.groupKeys;
				 var doingTopLevel = groupKeys.length === 0;

				 if (doingTopLevel) {
				 this.fakeServer.getTopLevelCountryList(successCallback, request);
				 } else {
				 var country = request.groupKeys[0];
				 this.fakeServer.getCountryDetails(successCallback, country, request);
				 }

				 function successCallback(resultForGrid, lastRow) {
				 params.successCallback(resultForGrid, lastRow);
				 }
				 };

				 function FakeServer(allData) {
				 this.initData(allData);
				 }

				 FakeServer.prototype.initData = function(allData) {
				 var topLevelCountryGroups = [];
				 var bottomLevelCountryDetails = { }; // will be a map of [country name => records]

				 allData.forEach(function(dataItem) {
				 // get country this item is for
				 var country = dataItem.country;

				 // get the top level group for this country
				 var childrenThisCountry = bottomLevelCountryDetails[country];
				 var groupThisCountry = this.find(topLevelCountryGroups, { country: country });
				 if (!childrenThisCountry) {
				 // no group exists yet, so create it
				 childrenThisCountry = [];
				 bottomLevelCountryDetails[country] = childrenThisCountry;

				 // add a group to the top level
				 groupThisCountry = { country: country, gold: 0, silver: 0, bronze: 0 };
				 topLevelCountryGroups.push(groupThisCountry);
				 }

				 // add this record to the county group
				 childrenThisCountry.push(dataItem);

				 // increment the group sums
				 groupThisCountry.gold += dataItem.gold;
				 groupThisCountry.silver += dataItem.silver;
				 groupThisCountry.bronze += dataItem.bronze;
				 });

				 this.topLevelCountryGroups = topLevelCountryGroups;
				 this.bottomLevelCountryDetails = bottomLevelCountryDetails;

				 this.topLevelCountryGroups.sort(function(a, b) {
				 return a.country < b.country ? -1 : 1;
				 });
				 };

				 FakeServer.prototype.sortList = function(data, sortModel) {
				 var sortPresent = sortModel && sortModel.length > 0;
				 if (!sortPresent) {
				 return data;
				 }
				 // do an in memory sort of the data, across all the fields
				 var resultOfSort = data.slice();
				 resultOfSort.sort(function(a, b) {
				 for (var k = 0; k < sortModel.length; k++) {
				 var sortColModel = sortModel[k];
				 var valueA = a[sortColModel.colId];
				 var valueB = b[sortColModel.colId];
				 // this filter didn't find a difference, move onto the next one
				 if (valueA == valueB) {
				 continue;
				 }
				 var sortDirection = sortColModel.sort === 'asc' ? 1 : -1;
				 if (valueA > valueB) {
				 return sortDirection;
				 } else {
				 return sortDirection * -1;
				 }
				 }
				 // no filters found a difference
				 return 0;
				 });
				 return resultOfSort;
				 };

				 // when looking for the top list, always return back the full list of countries
				 FakeServer.prototype.getTopLevelCountryList = function(callback, request) {

				 var lastRow = this.getLastRowResult(this.topLevelCountryGroups, request);
				 var rowData = this.getBlockFromResult(this.topLevelCountryGroups, request);

				 // put the response into a timeout, so it looks like an async call from a server
				 setTimeout(function() {
				 callback(rowData, lastRow);
				 }, 1000);
				 };

				 FakeServer.prototype.getCountryDetails = function(callback, country, request) {

				 var countryDetails = this.bottomLevelCountryDetails[country];

				 var countryDetailsSorted = this.sortList(countryDetails, request.sortModel);

				 var lastRow = this.getLastRowResult(countryDetailsSorted, request);
				 var rowData = this.getBlockFromResult(countryDetailsSorted, request);

				 // put the response into a timeout, so it looks like an async call from a server
				 setTimeout(function() {
				 callback(rowData, lastRow);
				 }, 1000);
				 };

				 FakeServer.prototype.getBlockFromResult = function(data, request) {
				 return data.slice(request.startRow, request.endRow);
				 };

				 FakeServer.prototype.getLastRowResult = function(result, request) {
				 // we mimic finding the last row. if the request exceeds the length of the
				 // list, then we assume the last row is found. this would be similar to hitting
				 // a database, where we have gone past the last row.
				 var lastRowFound = (result.length <= request.endRow);
				 var lastRow = lastRowFound ? result.length : null;
				 return lastRow;
				 };

				 */
			},
			templateUrl: 'aggrid/groupingtable/groupingtable.html'
		};
	}]).run(function() {
		// this is not part of the open source license, can only be used in combination of the Servoy NG Grids components
		agGrid.LicenseManager.setLicenseKey("Servoy_B.V_Servoy_7Devs_200Deployment_11_October_2020__MTYwMjM3MDgwMDAwMA==26d908e26f73b44683ba7a5dfdd00755");
});