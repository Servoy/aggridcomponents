angular.module('aggridGroupingtable', ['webSocketModule', 'servoy', 'aggridenterpriselicensekey']).directive('aggridGroupingtable', ['$sabloApplication', '$sabloConstants', '$log', '$q', '$foundsetTypeConstants', '$filter', '$compile', '$formatterUtils', '$sabloConverters', '$injector', '$services', "$sanitize",
	function($sabloApplication, $sabloConstants, $log, $q, $foundsetTypeConstants, $filter, $compile, $formatterUtils, $sabloConverters, $injector, $services, $sanitize) {
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

					gridOptions.api.purgeEnterpriseCache();
					$scope.dirtyCache = false;
					$log.warn('purge cache');

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
									gridOptions.api.setColumnDefs(getColumnDefs());
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
					groupKeys: []
				}

				// used in HTML template to toggle sync button
				$scope.isGroupView = false;

				// set to true when root foundset is loaded
				var isRootFoundsetLoaded = false;

				// set to true when is rendered
				var isRendered = undefined;

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
				var rowGroupColsDefault = getDefaultRowGroupCols();

				$log.debug(columnDefs);
				$log.debug(sortModelDefault);

				// if aggrid service is present read its defaults
				var toolPanelConfig = null;
				var iconConfig = null;
				var userGridOptions = null
				var localeText = null;
				if($injector.has('groupingtableDefaultConfig')) {
					var groupingtableDefaultConfig = $services.getServiceScope('groupingtableDefaultConfig').model;
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
				}

				var config = $scope.model;
				// console.log(config)
				if(config.toolPanelConfig) {
					toolPanelConfig = config.toolPanelConfig;
				}
				if(config.iconConfig) {
					iconConfig = config.iconConfig;
				}
				if(config.gridOptions) {
					userGridOptions = config.gridOptions; 
				}
				if(config.localeText) {
					localeText = config.localeText;
				}

				var vMenuTabs = ['generalMenuTab'] //, 'filterMenuTab'];
				if(config.showColumnsMenuTab) vMenuTabs.push('columnsMenuTab');
				var gridOptions = {

					debug: false,
					rowModelType: 'enterprise',
					rowGroupPanelShow: 'onlyWhenGrouping', // TODO expose property

					defaultColDef: {
						width: 0,
						suppressFilter: true,
						valueGetter: displayValueGetter,
						valueFormatter: displayValueFormatter,
						menuTabs: vMenuTabs
					},
					columnDefs: columnDefs,
					getMainMenuItems: getMainMenuItems,

					rowHeight: $scope.model.rowHeight,
					// TODO enable it ?					rowClass: $scope.model.rowStyleClass,	// add the class to each row

					suppressContextMenu: false,
					suppressMovableColumns: !config.enableColumnMove,
					enableServerSideSorting: config.enableSorting,
					enableColResize: config.enableColumnResize,
					suppressAutoSize: true,
					autoSizePadding: 25,
					suppressFieldDotNotation: true,

					enableServerSideFilter: true, // TODO implement serverside filtering
					suppressMovingInCss: true,
					suppressColumnMoveAnimation: true,
					suppressAnimationFrame: true,

					rowSelection: $scope.model.myFoundset && ($scope.model.myFoundset.multiSelect === true) ? 'multiple' : 'single',
					rowDeselection: $scope.model.myFoundset && ($scope.model.myFoundset.multiSelect === true),
					suppressRowClickSelection: rowGroupColsDefault.length === 0 ? false : true,
					suppressCellSelection: true, // TODO implement focus lost/gained
					enableRangeSelection: false,

					stopEditingWhenGridLosesFocus: true,
					singleClickEdit: false,
					suppressClickEdit: false,
					enableGroupEdit: false,
					groupUseEntireRow: config.groupUseEntireRow,
					groupMultiAutoColumn: true,
					suppressAggFuncInHeader: true, // TODO support aggregations

					toolPanelSuppressRowGroups: toolPanelConfig ? toolPanelConfig.suppressRowGroups : false,
					toolPanelSuppressValues: true,
					toolPanelSuppressPivots: true,
					toolPanelSuppressPivotMode: true,
	                toolPanelSuppressSideButtons: toolPanelConfig ? toolPanelConfig.suppressSideButtons : false,
	                toolPanelSuppressColumnFilter: toolPanelConfig ? toolPanelConfig.suppressColumnFilter : false,
	                toolPanelSuppressColumnSelectAll: toolPanelConfig ? toolPanelConfig.suppressColumnSelectAll : false,
	                toolPanelSuppressColumnExpandAll: toolPanelConfig ? toolPanelConfig.suppressColumnExpandAll : false,
					
					suppressColumnVirtualisation: false,
					suppressScrollLag: false,
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
						if($scope.handlers.onReady) {
							$scope.handlers.onReady();
						}
						// without timeout the column don't fit automatically
						setTimeout(function() {
							sizeHeaderAndColumnsToFit();
							}, 150);
					},
					onGridSizeChanged: function() {
						sizeHeaderAndColumnsToFit();
					},
					onDisplayedColumnsChanged: function() {
						sizeHeaderAndColumnsToFit();
						storeColumnsState();
					},
	                onColumnEverythingChanged: storeColumnsState,	// do we need that ?, when is it actually triggered ?
//	                onSortChanged: storeColumnsState,			 // TODO shall we store the sortState ?
//	                onFilterChanged: storeColumnsState,			 // TODO enable this once filters are enabled
//	                onColumnVisible: storeColumnsState,			 covered by onDisplayedColumnsChanged
//	                onColumnPinned: storeColumnsState,			 covered by onDisplayedColumnsChanged
					onColumnResized: function() {				 // NOT covered by onDisplayedColumnsChanged
						sizeHeader();
						storeColumnsState();
					},
//	                onColumnRowGroupChanged: storeColumnsState,	 covered by onDisplayedColumnsChanged
//	                onColumnValueChanged: storeColumnsState,
//	                onColumnMoved: storeColumnsState,              covered by onDisplayedColumnsChanged
//	                onColumnGroupOpened: storeColumnsState		 i don't think we need that, it doesn't include the open group in column state
					
					getContextMenuItems: getContextMenuItems,
					// TODO since i can't use getRowNode(id) in enterprise model, is pointeless to get id per node
					//					getRowNodeId: function(data) {
					//						return data._svyRowId;
					//					}
					// TODO localeText: how to provide localeText to the grid ? can the grid be shipped with i18n ?

					navigateToNextCell: selectionChangeNavigation,

					sideBar : {
						toolPanels: [
							{
								id: 'columns',
								labelDefault: 'Columns',
								labelKey: 'columns',
								iconKey: 'columns',
								toolPanel: 'agColumnsToolPanel',
							}
						]
					}
				};
				
				// check if we have filters
				for(var i = 0; i < columnDefs.length; i++) {
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

				// TODO check if test enabled
				//gridOptions.ensureDomOrder = true;

				// rowStyleClassDataprovider
				if ($scope.model.rowStyleClassDataprovider) {
					gridOptions.getRowClass = getRowClass;
				}

				// https://www.ag-grid.com/javascript-grid-icons/#gsc.tab=0
				var icons = new Object();

				// set the icons
				if (iconConfig == null) {
					// set the default icons
					iconConfig = {
						iconGroupExpanded: 'glyphicon glyphicon-minus ag-icon',
						iconGroupContracted: 'glyphicon glyphicon-plus ag-icon',
						iconRefreshData: 'glyphicon glyphicon-refresh'
					};
				}

				// set all custom icons
	            if (iconConfig) {
	                var icons = new Object();
	                
	                for (var iconName in iconConfig) {
	                	if (iconName == "iconRefreshData") continue;
	                	
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
				gridOptions.api.setSortModel(sortModelDefault);

				// register listener for selection changed
				gridOptions.api.addEventListener('selectionChanged', onSelectionChanged);

				// grid handlers
				var clickTimer;
				function cellClickHandler(params) {
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
						onCellClicked(params);
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
				function onSelectionChanged(event) {
					// Don't trigger foundset selection if table is grouping
					if (isTableGrouped()) {
						return;
					}

					var selectedNodes = gridOptions.api.getSelectedNodes();
					if (selectedNodes.length > 0) {
						var foundsetIndexes = new Array();

						for(var i = 0; i < selectedNodes.length; i++) {
							var node = selectedNodes[i];
							if(node) foundsetIndexes.push(node.rowIndex);				
						}
						if(foundsetIndexes.length > 0) {
							foundset.foundset.requestSelectionUpdate(foundsetIndexes).then(
								function(serverRows){
									//success
								},
								function(serverRows){
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

					var row = params.data;
					var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
					if (!foundsetManager) foundsetManager = foundset;
					var foundsetRef = foundsetManager.foundset;
					var newValue = params.newValue;
					if(newValue && newValue.realValue != undefined) {
						newValue = newValue.realValue;
					}
					var oldValue = params.oldValue;
					if(oldValue && oldValue.realValue != undefined) {
						oldValue = oldValue.realValue;
					}

					var col = getColumn(params.colDef.field);
					if(col && col.dataprovider && col.dataprovider.idForFoundset && newValue != oldValue) {
						foundsetRef.updateViewportRecord(row._svyRowId, col.dataprovider.idForFoundset, newValue, oldValue);
						if($scope.handlers.onColumnDataChange) {
							$scope.handlers.onColumnDataChange(
								getFoundsetIndexFromEvent(params),
								getColumnIndex(params.column.colId),
								oldValue,
								newValue
							);
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
					if ($scope.handlers.onCellDoubleClick) {
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
					if ($scope.handlers.onCellRightClick) {
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

				function selectionChangeNavigation(params) {
					var previousCell = params.previousCellDef;
					var suggestedNextCell = params.nextCellDef;
				 
					var KEY_UP = 38;
					var KEY_DOWN = 40;
					var KEY_LEFT = 37;
					var KEY_RIGHT = 39;
				 
					switch (params.key) {
						case KEY_DOWN:
							previousCell = params.previousCellDef;
							// set selected cell on current cell + 1
							gridOptions.api.forEachNode( function(node) {
								if (previousCell.rowIndex + 1 === node.rowIndex) {
									node.setSelected(true, true);
								}
							});
							return suggestedNextCell;
						case KEY_UP:
							previousCell = params.previousCellDef;
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
						}
						$scope.isGroupView = false;

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

				/** @return {Array<RowGroupColType>} */
				function getDefaultRowGroupCols() {
					var rowGroupCols = [];
					for (var i = 0; $scope.model.columns && i < $scope.model.columns.length; i++) {
						var column = $scope.model.columns[i];
						if (column.rowGroupIndex !== null && !isNaN(column.rowGroupIndex) && column.rowGroupIndex > -1) {
							/** @type {RowGroupColType} */
							var rowGroupCol = new Object();
							rowGroupCol.id = getColumnID(column, i);
							rowGroupCol.field = rowGroupCol.id;
							rowGroupCol.displayName = column.headerTitle;
							// rowGroupCols should be well sorted
							var rowGroupIndex = column.rowGroupIndex
							if (rowGroupCols[rowGroupIndex]) { // there is already an item at position rowGroupIndex
								if (rowGroupIndex === rowGroupCols.length - 1) {
									rowGroupCols = rowGroupCols.push(rowGroupCol);
								} else {
									rowGroupCols = rowGroupCols.slice(0, rowGroupIndex + 1).concat([rowGroupCol]).concat(rowGroupCols.slice(rowGroupIndex + 1));
								}
							} else {
								rowGroupCols[rowGroupIndex] = rowGroupCol;
							}
						}
					}
					return rowGroupCols;
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
					var column = getColumn(params.column.colId);

					if (column && column.format) {
						value = formatFilter(value, column.format.display, column.format.type, column.format);
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

				/**
				 * Resize header and all columns so they can fit the horizontal space
				 *  */
				function sizeHeaderAndColumnsToFit() {
					gridOptions.api.sizeColumnsToFit();
					sizeHeader();
				}

				/**
				 * Update header height based on cells content height
				 */
				function sizeHeader() {
					var headerCell = $element.find('.ag-header-cell');
					var paddingTop = headerCell.length ? parseInt(headerCell.css('padding-top'), 10) : 0;
					var paddinBottom = headerCell.length ? parseInt(headerCell.css('padding-bottom'), 10) : 0;
					var headerCellLabels = $element.find('.ag-header-cell-label');
					var minHeight = 25;

					for(var i = 0; i < headerCellLabels.length; i++) {
						minHeight = Math.max(minHeight, headerCellLabels[i].scrollHeight + paddingTop + paddinBottom);
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
						if (rowId.indexOf(";") >= 0) rowId = rowId.substring(0, rowId.indexOf(";") + 1);
						
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
						this.keyDownListener = function (event) {
							var isNavigationLeftRightKey = event.keyCode === 37 || event.keyCode === 39;
							var isNavigationUpDownEntertKey = event.keyCode === 38 || event.keyCode === 40 || event.keyCode === 13;

							if (isNavigationLeftRightKey || isNavigationUpDownEntertKey) {

								if(isNavigationUpDownEntertKey && (thisEditor.editType == 'TEXTFIELD')) {
									var newRowIndex = -1;
									if( event.keyCode == 38) { // UP
										newRowIndex = thisEditor.params.rowIndex - 1;
									}
									else if (event.keyCode == 13 || event.keyCode == 40) { // ENTER/DOWN
										newRowIndex = thisEditor.params.rowIndex + 1;
										if( newRowIndex >= gridOptions.api.getModel().getRowCount()) {
											newRowIndex = -1;
										}
									}
									gridOptions.api.stopEditing();
									if (newRowIndex > -1) {

										gridOptions.api.forEachNode( function(node) {
											if (node.rowIndex === newRowIndex) {
												node.setSelected(true, true);
											}
										});

										gridOptions.api.startEditingCell({
											rowIndex: newRowIndex,
											colKey: thisEditor.params.column.colId
										});
									}
									event.preventDefault();
								}
								event.stopPropagation();
							}
						};
						this.eInput.addEventListener('keydown', this.keyDownListener);

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

						if (this.valuelist) {
							var hasMatchingDisplayValue = false;
							for (var i = 0; i < this.valuelist.length; i++) {
								// compare trimmed values, typeahead will trim the selected value
								if ($.trim(displayValue) === $.trim(this.valuelist[i].displayValue)) {
									hasMatchingDisplayValue = true;
									realValue = this.valuelist[i].realValue;
									break;
								}
							}
							if (!hasMatchingDisplayValue)
							{
								if (this.hasRealValues) 
								{
									// if we still have old value do not set it to null or try to  get it from the list.
									if (this.initialValue != null && this.initialValue !== displayValue)
									{
										// so invalid thing is typed in the list and we are in real/display values, try to search the real value again to set the display value back.
										for (var i = 0; i < this.valuelist.length; i++) {
											// compare trimmed values, typeahead will trim the selected value
											if ($.trim(this.initialValue) === $.trim(this.valuelist[i].displayValue)) {
												realValue = this.valuelist[i].realValue;
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
						$(this.eInput).datetimepicker(options);

						var editFormat = 'MM/dd/yyyy hh:mm a';
						var column = getColumn(params.column.colId);
						if(column && column.format && column.format.edit) {
							editFormat = column.format.edit;
						}
						var theDateTimePicker = $(this.eInput).data('DateTimePicker');
						theDateTimePicker.format(moment().toMomentFormatString(editFormat));
						this.eInput.value = formatFilter(params.value, editFormat, 'DATETIME');
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
									option.value = value.realValue;
									option.text = value.displayValue;
									if (v != null && v.toString() === value.displayValue) {
										option.selected = true;
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
						var realValue = this.eSelect.value;
						return displayValue != realValue ? {displayValue: displayValue, realValue: realValue} : realValue;
					};

					SelectEditor.prototype.destroy = function() {
						this.eSelect.removeEventListener('keydown', this.keyListener);
						this.eSelect.removeEventListener('mousedown', this.mouseListener);
					};

					return SelectEditor;
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
						sortRootGroup = true;
						sortModel = [{ colId: rowGroupCols[0].id, sort: sortModel[0].sort }];
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
							$log.warn(" Use the default foundset sort.. which is ? ");
						}

						// if not sorting on a group column
						if (rowGroupCols.length === groupKeys.length && sortString && sortString != foundsetRefManager.getSortColumns()) { // if is a group column and sort string is different
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
					gridOptions.api.setEnterpriseDatasource(datasource);
				}

				function refreshDatasource() {
					var foundsetServer = new FoundsetServer([]);
					var datasource = new FoundsetDatasource(foundsetServer);
					gridOptions.api.setEnterpriseDatasource(datasource);
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
						if($scope.model.myFoundset.viewPort.size > 0) {
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
						"rowGroupIndex",
						"editType",
						"id"
					];
					for(var i = 0; i < $scope.model.columns.length; i++) {
						for( var j = 0; j < columnKeysToWatch.length; j++) {
							var columnWatch = $scope.$watch("model.columns[" + i + "]['" + columnKeysToWatch[j] + "']",
								function(newValue, oldValue) {
									if(newValue != oldValue) {
										$log.debug('column property changed');
										gridOptions.api.setColumnDefs(getColumnDefs());
									}
								});
							columnWatches.push(columnWatch);
						}
					}
					if(newValue != oldValue) {
						gridOptions.api.setColumnDefs(getColumnDefs());
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
						endIndex = endIndex ? endIndex : thisInstance.foundset.viewPort.rows.length;

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
										$log.error("Load record request id '" + state.waitfor.loadRecords + "' is different from the resolved promise '" + requestId + "'; this should not happen !!!");
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
						childFoundsetPromise = $scope.svyServoyapi.callServerSideApi("getGroupedFoundsetUUID",
							[groupColumns, groupKeys, idForFoundsets, sort, $scope.model.filterModel, hasRowStyleClassDataprovider]);

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
							$log.error("could not delete hashed foundset " + foundsetHash);
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

					if (sortPromise) {
						$log.debug('sort has been requested clientside, no need to update the changeListener');
						return;
					}

					// Floor
					var idRandom = Math.floor(1000 * Math.random());

					if (change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED]) {
						$log.debug(idRandom + ' - 1. Sort');
						var newSort = change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].newValue;
						var oldSort = change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].oldValue;

						// sort changed
						$log.debug("Change Sort Model " + newSort);
	
						/** TODO check with R&D, sortColumns is updated only after the viewPort is update or there could be a concurrency race. When i would know when sort is completed ? */
						if (newSort && oldSort && newSort != oldSort) {
							$log.debug('myFoundset sort changed ' + newSort);
							gridOptions.api.setSortModel(getSortModel());
							gridOptions.api.purgeEnterpriseCache();
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
						updateRows(updates, null, null);
						// i don't need a selection update in case of purge
						return;
					}

					// gridOptions.api.purgeEnterpriseCache();
					if (change[$foundsetTypeConstants.NOTIFY_SELECTED_ROW_INDEXES_CHANGED]) {
						$log.debug(idRandom + ' - 3. Request selection changed');
						selectedRowIndexesChanged();
					}

				}

				function selectedRowIndexesChanged(foundsetManager) {
					// FIXME can't select the record when is not in viewPort. Need to synchornize with viewPort record selection
					$log.debug(' - 2.1 Request selection changes');

					// clear selection
					var selectedNodes = gridOptions.api.getSelectedNodes();
					for (var i = 0; i < selectedNodes.length; i++) {
						selectedNodes[i].setSelected(false);
					}
					// Disable selection when table is grouped
					if (isTableGrouped()) {
						return;
					}

					// CHANGE Seleciton
					if (!foundsetManager) {
						foundsetManager = foundset;
					}

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

							var rowId = foundsetManager.foundset.viewPort.rows[rowIndex]._svyRowId;
							var node = getTableRow(rowId);
							if (node) {
								node.setSelected(true);
							}
						} else {
							// TODO selected record is not in viewPort: how to render it ?
						}
					}
				}

				/**
				 * @param {String} id the _svyRowId of the node, retuns the full row matching the the id
				 *
				 * @return {Object}
				 *  */
				function getTableRow(id) {
					var result;

					gridOptions.api.forEachNode(function(rowNode, index) {
						if (rowNode && rowNode.data && rowNode.data._svyRowId === id) {
							result = rowNode;
						}
					});

					return result;
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
				 *  */
				function updateRows(rowUpdates, oldStartIndex, oldSize) {

					// Don't update automatically if the row are grouped
					if (isTableGrouped()) {
						// register update
						$scope.dirtyCache = true;
						return;
					}
					
					var needPurge = false;
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
						// find editing cells for the updating row, and skip updating them
						var editCells = gridOptions.api.getEditingCells();
						var editingColumnIds = [];
						for(var i = 0; i < editCells.length; i++) {
							if(index == editCells[i].rowIndex) {
								editingColumnIds.push(editCells[i].column.colId);
							}
						}
						gridOptions.api.forEachNode( function(node) {
							if(node.data && row._svyFoundsetUUID == node.data._svyFoundsetUUID && row._svyRowId == node.data._svyRowId) {
								if(editingColumnIds.length) {
									for(var colId in node.data) {
										if(editingColumnIds.indexOf(colId) == -1) {
											node.setDataValue(colId, row[colId]);
										}
									}
								}
								else {
									node.setData(row);
								}
								return;
							}
						});
					} else {
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

				/**
				 * @deprecated
				 * return the row in grid with the given id */
				function getUiGridRow(svyRowId) {
					if ($scope.gridOptions && $scope.gridOptions.data) {
						var data = $scope.gridOptions.data;
						for (var i = 0; i < data.length; i++) {
							if (data[i]._svyRowId === svyRowId) {
								return data[i];
							}
						}
					}
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
					var items = ['rowGroup', 'rowUnGroup'];
					params.defaultItems.forEach(function(item) {
						if (items.indexOf(item) > -1) {
							menuItems.push(item);
						}
					});
					return menuItems;
				}

				/**
				 * Callback used by ag-grid colDef.editable
				 */
				function isColumnEditable(args) {
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
						if (index >= 0) {
							isColumnEditable = foundsetManager.foundset.viewPort.rows[index][args.colDef.field + "_isEditableDataprovider"];
						}
					}

					return isColumnEditable;
				}

				/**
				 * @public
				 * @return {Array<Object>}
				 *  */
				function getColumnDefs() {
					
					//renderer for header tooltip
					var headerRenderer = function(params) {
						var tooltip = ''
						if (params.colDef.header_tooltip.length > 0) {
							tooltip = '<span class="ag-table-header-tooltip">' + params.colDef.header_tooltip + '</span>'
						}
						return tooltip + params.value;
					};

					var cellRenderer = function(params) {
						var col = getColumn(params.colDef.field);
						var value = params.value;
						
						var returnValueFormatted = false;
						if(col.showAs == 'html') {
							value =  value && value.displayValue != undefined ? value.displayValue : value;
						} else if(col.showAs == 'sanitizedHtml') {
							value = $sanitize(value && value.displayValue != undefined ? value.displayValue : value)
						} else if (value && value.contentType && value.contentType.indexOf('image/') == 0 && value.url) {
							value = '<img class="ag-table-image-cell" src="' + value.url + '">';
						} else {
							returnValueFormatted = true;
						}
					
						var styleClassProvider = null;
						if (!isTableGrouped()) {
							var column = getColumn(params.colDef.field);
							if (column && column.styleClassDataprovider) {
								var index = params.rowIndex - foundset.foundset.viewPort.startIndex;
								styleClassProvider = column.styleClassDataprovider[index];
							}
						} else {
								var foundsetManager = getFoundsetManagerByFoundsetUUID(params.data._svyFoundsetUUID);
								var index = foundsetManager.getRowIndex(params.data) - foundsetManager.foundset.viewPort.startIndex;
								if (index >= 0) {
									styleClassProvider = foundsetManager.foundset.viewPort.rows[index][params.colDef.field + "_styleClassDataprovider"];
								} else {
									$log.warn('cannot render styleClassDataprovider for row at index ' + index)
									$log.warn(params.data);
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
							headerName: "" + (column.headerTitle ? column.headerTitle : "") + "",
							field: field,
							header_tooltip: "" + (column.headerTooltip ? column.headerTooltip : "") + "",
							headerCellRenderer: headerRenderer,
							cellRenderer: cellRenderer

						};

						if(column.id) {
							colDef.colId = column.id;
						}

						// styleClass
						colDef.headerClass = 'ag-table-header ' + column.headerStyleClass;
						if (column.styleClassDataprovider) {
							colDef.cellClass = getCellClass;
						} else {
							colDef.cellClass = 'ag-table-cell ' + column.styleClass;
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
	        			if (column.enableResize === false) colDef.suppressResize = !column.enableResize;
	        			if (column.autoResize === false) colDef.suppressSizeToFit = !column.autoResize;
						
						// column sort
						if (column.enableSort === false) colDef.suppressSorting = true;

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

							colDef.onCellValueChanged = function(params) {
								updateFoundsetRecord(params);
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
							
							colDef.filterParams = { applyButton: true, clearButton: true, newRowsAction: 'keep', suppressAndOrCondition: true, caseSensitive: true };
						}

						if(column.columnDef) {
							for (var property in column.columnDef) {
								if (column.columnDef.hasOwnProperty(property)) {
									colDef[property] = column.columnDef[property];
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
						suppressResize: true,
						hide: true
					});

					colDefs.push({
						field: '_svyFoundsetUUID',
						headerName: '_svyFoundsetUUID',
						suppressToolPanel: true,
						suppressMenu: true,
						suppressNavigable: true,
						suppressResize: true,
						hide: true
					});

					return colDefs;
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
							if (!sortColumn) {
								continue;
							} else if (sortColumn.substr(sortColumn.length - 5, 5) === " desc") {

								sortModel.push({
									colId: sortColumn.substring(0, sortColumn.length - 5),
									sort: "desc"
								})
							} else if (sortColumn.substr(sortColumn.length - 4, 4) === " asc") {
								sortModel.push({
									colId: sortColumn.substring(0, sortColumn.length - 4),
									sort: "asc"
								})
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
					var agColumnState = gridOptions.columnApi.getColumnState();

					var rowGroupColumns = getRowGroupColumns();
					var svyRowGroupColumnIds = [];
					for(var i = 0; i < rowGroupColumns.length; i++) {
						svyRowGroupColumnIds.push(rowGroupColumns[i].colId);
					}

					// TODO add filterState once filter is enabled
					// TODO do we need to add sortingState ?
					var columnState = {
						columnState: agColumnState,
						rowGroupColumnsState: svyRowGroupColumnIds
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

						// if columns were added/removed, skip the restore
						var savedColumns = [];
						for(var i = 0; i < columnState.columnState.length; i++) {
							if(columnState.columnState[i].colId.indexOf('_') == 0) {
								continue; // if special column, that starts with '_'
							}
							savedColumns.push(columnState.columnState[i].colId);
						}
						if(savedColumns.length != $scope.model.columns.length) {
							$log.error('Cannot restore columns state, different number of columns in saved state and component');
							return false;
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
								$log.error('Cannot restore columns state, cant find column from state in component columns');
								return false;
							}
						}

						// TODO add filterState once filter is enabled
						// TODO do we need to restore sortingState ?
						gridOptions.columnApi.setColumnState(columnState.columnState);

						if(columnState.rowGroupColumnsState.length > 0) {
							gridOptions.columnApi.setRowGroupColumns(columnState.rowGroupColumnsState);
						}

						return true;
					}
				}


				/***********************************************************************************************************************************
				 ***********************************************************************************************************************************
				 *
				 * Generic methods
				 *
				 ************************************************************************************************************************************
				 ***********************************************************************************************************************************/

				$scope.showEditorHint = function() {
					return (!$scope.model.columns || $scope.model.columns.length == 0) && $scope.svyServoyapi.isInDesigner();
				}

				function isResponsive() {
					// var parent = $element.parent();
					// !parent.hasClass('svy-wrapper');
					return !$scope.$parent.absoluteLayout;
				}

				function setHeight() {
					if (isResponsive()) {
						gridDiv.style.height = $scope.model.responsiveHeight + 'px';
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
				 * Restore columns state to a previously save one, using getColumnState.
				 * If no argument is used, it restores the columns to designe time state.
				 * If the columns from columnState does not match with the columns of the component,
				 * no restore will be done.
				 * 
				 * @param {String} columnState
				 */
				$scope.api.restoreColumnState = function(columnState) {
					if(columnState) {
						$scope.model.columnState = columnState;
						return restoreColumnsState();
					}
					else {
						gridOptions.columnApi.resetColumnState();
						return true;
					}
				}

				/**
				 * Returns the current state of the columns (width, position, grouping state) as a json string
				 * that can be used to restore to this state using restoreColumnState
				 * 
				 * @return {String}
				 */
				$scope.api.getColumnState = function() {
					return $scope.model.columnState;
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
	}]).run(['$aggridenterpriselicensekey', function($aggridenterpriselicensekey) {
	$aggridenterpriselicensekey.setLicenseKey();
}]);