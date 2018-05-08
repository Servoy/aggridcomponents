angular.module('aggridGroupingtable', ['servoy', 'aggridenterpriselicensekey']).directive('aggridGroupingtable', ['$sabloApplication', '$sabloConstants', '$log', '$q', '$foundsetTypeConstants', '$filter', '$compile',
	function($sabloApplication, $sabloConstants, $log, $q, $foundsetTypeConstants, $filter, $compile) {
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

				var config = $scope.model;
				// console.log(config)

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
					suppressMovableColumns: true, // TODO persist column order changes
					enableServerSideSorting: config.enableSorting,
					enableColResize: config.enableColumnResize,
					suppressAutoSize: true,
					autoSizePadding: 25,
					suppressFieldDotNotation: true,

					enableServerSideFilter: false, // TODO implement serverside filtering
					suppressMovingInCss: true,
					suppressColumnMoveAnimation: true,
					suppressAnimationFrame: true,

					rowSelection: 'single',
					rowDeselection: false,
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

					//					toolPanelSuppressRowGroups: false,
					toolPanelSuppressValues: true,
					toolPanelSuppressPivots: true,
					toolPanelSuppressPivotMode: true,

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
						// without timeout the column don't fit automatically
						setTimeout(function() {
								sizeColumnsToFit();
							}, 150);
					},
					onGridSizeChanged: function() {
						sizeColumnsToFit();
					},
					onDisplayedColumnsChanged: function() {
						sizeColumnsToFit();
					},
					onColumnEverythingChanged: storeColumnsState,
					onColumnVisible: storeColumnsState,
					onColumnPinned: storeColumnsState,
					onColumnResized: storeColumnsState,
					onColumnRowGroupChanged: storeColumnsState,
					onColumnValueChanged: storeColumnsState,
					onColumnMoved: storeColumnsState,
					onColumnGroupOpened: storeColumnsState,
					getContextMenuItems: getContextMenuItems
					// TODO since i can't use getRowNode(id) in enterprise model, is pointeless to get id per node
					//					getRowNodeId: function(data) {
					//						return data._svyRowId;
					//					}
					// TODO localeText: how to provide localeText to the grid ? can the grid be shipped with i18n ?

				};
				

				// TODO check if test enabled
				//gridOptions.ensureDomOrder = true;

				// rowStyleClassDataprovider
				if ($scope.model.rowStyleClassDataprovider) {
					gridOptions.getRowClass = getRowClass;
				}

				// https://www.ag-grid.com/javascript-grid-icons/#gsc.tab=0
				var icons = new Object();

				// set the icons
				var iconConfig = $scope.model;
				if (iconConfig.iconGroupExpanded) icons.groupExpanded = getIconElement(iconConfig.iconGroupExpanded);
				if (iconConfig.iconGroupContracted) icons.groupContracted = getIconElement(iconConfig.iconGroupContracted);
				if (iconConfig.iconSortAscending) icons.sortAscending = getIconElement(iconConfig.iconSortAscending);
				if (iconConfig.iconSortDescending) icons.sortDescending = getIconElement(iconConfig.iconSortDescending);
				if (iconConfig.iconSortUnSort) icons.sortUnSort = getIconElement(iconConfig.iconSortUnSort);

				gridOptions.icons = icons;

				// set a fixed height if is in designer
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
				gridOptions.api.addEventListener('cellClicked', onCellClicked);
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

					// FIXME this works only if node is available on the root foundset
					// TODO what to do if the record is selected from a child foundset ?
					var selectedNodes = gridOptions.api.getSelectedNodes();
					if (selectedNodes.length > 1) {
						// TODO enable multi selection
						$log.warn("Multiselection is not enabled yet")
					}
					var node = selectedNodes[0];
					if (node) {
						var row = node.data;
						// search for id in foundset. It Fails because of cache issues
						var foundsetIndex;
						if (isTableGrouped()) {
							// TODO search for grouped record in grouped foundset (may not work because of caching issues);
							$log.warn('select grouped record not supported yet')
						} else {
							foundsetIndex = node.rowIndex;
						}
						var record;
						if (foundsetIndex > -1) {
							foundset.foundset.requestSelectionUpdate([foundsetIndex]);
							record = foundset.foundset.viewPort.rows[foundsetIndex - foundset.foundset.viewPort.startIndex];

							// onRecordSelected handler
							if ($scope.handlers.onRecordSelected) {
								// FIXME cannot resolve the record when grouped, how can i rebuild the record ?
								// Can i pass in the array ok pks ? do i know the pks ?
								// Can i get the hasmap of columns to get the proper dataProviderID name ?
								$scope.handlers.onRecordSelected(foundsetIndex + 1, record, createJSEvent());
							}
						} else {
							$log.warn('could not find record ' + row._svyRowId);
						}

					} else {
						// This is a workaround to prevent record deselection when the space key is pressed
						// this state is possible when the selected record is not in the visible viewPort
						$log.debug("table must always have a selected record");
						selectedRowIndexesChanged();
					}
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
						var columnIndex = getColumnIndex(params.colDef.field);
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
					foundsetRef.updateViewportRecord(row._svyRowId, params.column.colId, params.newValue, params.oldValue);
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
						var columnIndex = getColumnIndex(params.colDef.field);
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
						var columnIndex = getColumnIndex(params.colDef.field);
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

					// enable or disable the selection
					enableRowSelection(!rowGroupCols || rowGroupCols.length === 0);

					// store in columns the change
					if (!rowGroupCols || rowGroupCols.length === 0) {
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
							sizeColumnsToFit();
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

				var NULL_VALUE = new Object();

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
					var column = getColumn(field);

					if (column) {
						if (column.format) {
							value = formatFilter(value, column.format.display, column.format.type);
						}
					}

					if (value == null && params.value == NULL_VALUE) {
						value = '';
					} else if (value && value.contentType && value.contentType.indexOf('image/') == 0 && value.url) {
						value = '<img class="ag-table-image-cell" src="' + value.url + '">';
					}

					return value;
				}

				function displayValueGetter(params) {
					var field = params.colDef.field;
					if (!params.data) {
						return undefined;
					}
					var value = params.data[field];

					if (value == null) {
						value = NULL_VALUE; // need to use an object for null, else grouping won't work in ag grid
					}

					return value;					
				}

				/**
				 * Resize all columns so they can fit the horizontal space
				 *  */
				function sizeColumnsToFit() {
					gridOptions.api.sizeColumnsToFit();
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

				 function getDatePicker() {
					// function to act as a class
					function Datepicker() {}
				
					// gets called once before the renderer is used
					Datepicker.prototype.init = function(params) {
						// create the cell
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

						var v;
						var editFormat = 'MM/dd/yyyy hh:mm aa';
						if(params.useFormatter) {
							v = { colDef: params.column.colDef, data: {} };
							v.data[params.column.colDef.field] = params.value;
							v = params.useFormatter(v);
							var field = params.column.colDef.field;
							var column = getColumn(field);
							if(column && column.format && column.format.edit) {
								editFormat = column.format.edit;
							}
						}
						else {
							v = formatFilter(params.value, editFormat, 'DATETIME');
						}

						//var dateFormat = moment().toMomentFormatString(editFormat);
						var theDateTimePicker = $(this.eInput).data('DateTimePicker');
						//theDateTimePicker.format(dateFormat);
						this.eInput.value = v;
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
						return theDateTimePicker.date().toDate();
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
						var col = getColumn(params.column.colDef.field);
						if(col.valuelist) {
							var row = params.node.data;
							var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
							if (!foundsetManager) foundsetManager = foundset;
							var foundsetRef = foundsetManager.foundset;
							var recRef = foundsetRef.getRecordRefByRowID(row._svyRowId);
							var valuelistValuesPromise = col.valuelist.filterList("");
							var selectEl = this.eSelect;
							valuelistValuesPromise.then(function(valuelistValues) {
								valuelistValues.forEach(function (value) {
									var option = document.createElement('option');
									option.value = value.realValue;
									option.text = value.displayValue;
									if (params.value != null && params.value.toString() === value.displayValue) {
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
						return this.eSelect.value;
					};

					SelectEditor.prototype.destroy = function() {
						this.eSelect.removeEventListener('keydown', this.keyListener);
						this.eSelect.removeEventListener('mousedown', this.mouseListener);
					};

					return SelectEditor;
				}

				function getTypeaheadEditor() {
					function TypeaheadEditor() {}

					TypeaheadEditor.prototype.init = function(params) {
						var columnIndex = getColumnIndex(params.column.colDef.field);
						this.eInput = document.createElement('input');
						this.eInput.setAttribute("uib-typeahead", "value.displayValue for value in model.columns[" + columnIndex + "].valuelist.filterList($viewValue)");
						this.eInput.setAttribute("typeahead-wait-ms", "300");
						this.eInput.setAttribute("typeahead-min-length", "0");
						this.eInput.setAttribute("typeahead-append-to-body", "true");
						this.eInput.setAttribute("ng-model", "typeaheadEditorValue");
						this.initialValue = params.value;

						$compile(this.eInput)($scope);
						$scope.$digest();

					}

					TypeaheadEditor.prototype.getGui = function() {
						return this.eInput;
					};

					TypeaheadEditor.prototype.afterGuiAttached = function() {
						this.eInput.value = this.initialValue;
						this.eInput.focus();
					};

					TypeaheadEditor.prototype.getValue = function() {
						return this.eInput.value;
					};

					TypeaheadEditor.prototype.isPopup = function() {
						return true;
					};

					return TypeaheadEditor;
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
					this.foundsetServer.getData(params.request,
						function successCallback(resultForGrid, lastRow) {
							params.successCallback(resultForGrid, lastRow);
							selectedRowIndexesChanged();
						});
				};

				function FoundsetServer(allData) {
					this.allData = allData;
				}

				/**
				 * @param {AgDataRequestType} request
				 * @param {Function} callback callback(data, isLastRow)
				 * @protected
				 * */
				FoundsetServer.prototype.getData = function(request, callback) {

					$log.debug(request);

					// the row group cols, ie the cols that the user has dragged into the 'group by' zone, eg 'Country' and 'Customerid'
					var rowGroupCols = request.rowGroupCols
					// the keys we are looking at. will be empty if looking at top level (either no groups, or looking at top level groups). eg ['United States','2002']
					var groupKeys = request.groupKeys;
					for (var i = 0; i < groupKeys.length; i++) {
						if (groupKeys[i] == NULL_VALUE) {
							groupKeys[i] = null;	// reset to real null, so we use the right value for grouping
						}
					}
					// if going aggregation, contains the value columns, eg ['gold','silver','bronze']
					var valueCols = request.valueCols;

					// rowGroupCols cannot be 2 level deeper than groupKeys
					// rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);

					var filterModel = request.filterModel;
					var sortModel = request.sortModel;

					var result;
					var sortRootGroup = false;

					// if clicking sort on the grouping column
					if (rowGroupCols.length > 0 && sortModel[0] && (sortModel[0].colId === "ag-Grid-AutoColumn" || sortModel[0].colId === rowGroupCols[0].field)) {
						// replace colFd with the id of the grouped column
						sortRootGroup = true;
						sortModel = [{ colId: rowGroupCols[0].field, sort: sortModel[0].sort }];
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
						groupManager.createOrReplaceFoundsetRef(rowGroupCols, groupKeys, sortModel[0].sort).then(getFoundsetRefSuccess).catch(getFoundsetRefError);
					} else {
						// get the foundset reference
						groupManager.getFoundsetRef(rowGroupCols, groupKeys).then(getFoundsetRefSuccess).catch(getFoundsetRefError);
					}

					/**
					 * GetFoundserRef Promise Callback
					 *
					 * @param {String} foundsetUUID
					 * @protected
					 *  */
					function getFoundsetRefSuccess(foundsetUUID) {

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
								$log.error("sort column promise resolved");
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

						initRootFoundset();

						// TODO ASK R&D should i remove and add the previous listener ?
						$scope.model.myFoundset.removeChangeListener(changeListener);
						$scope.model.myFoundset.addChangeListener(changeListener);

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
						var data = [];
						var result = [];
						startIndex = startIndex ? startIndex : 0;
						endIndex = endIndex ? endIndex : thisInstance.foundset.viewPort.rows.length;

						// index cannot exceed ServerSize
						startIndex = Math.min(startIndex, thisInstance.foundset.serverSize);
						endIndex = Math.min(endIndex, thisInstance.foundset.serverSize);

						if (this.isRoot) { // if is the root foundset is should build the rows
							for (var j = startIndex; j < endIndex; j++) {
								var row = thisInstance.getViewPortRow(j);
								if (row) data.push(row);
							}
							result = data;
						} else { // if is a referenced foundset rows are already available
							// TODO is it possible to have duplicates ?
							data = thisInstance.foundset.viewPort.rows;

							// TODO apply filter&valuelists&columnFormat

							// TODO check limit startIndex/endIndex;
							// TODO how can i add the foundset UUID to these ?
							result = data.slice(startIndex, endIndex);

							// TODO could be done directly server side ?
							result.forEach(function(item) {
								item._svyFoundsetUUID = thisInstance.foundsetUUID;
							});
						}
						return result;
					}

					/** return the row in viewport at the given index */
					var getViewPortRow = function(index) {
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

							// push each dataprovider
							for (var i = 0; i < $scope.model.columns.length; i++) {
								var header = $scope.model.columns[i];
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
						var requestId = 1 + Math.random();
						state.waitfor.loadRecords = requestId;
						// TODO can it handle multiple requests ?
						var promise = this.foundset.loadRecordsAsync(startIndex, size);
						promise.finally(function(e) {
							if (state.waitfor.loadRecords !== requestId) {
								// FIXME if this happen reduce parallel async requests to 1
								$log.error("Load record request id '" + state.waitfor.loadRecords + "' is different from the resolved promise '" + requestId + "'; this should not happen !!!");
							}

							state.waitfor.loadRecords = 0;
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
							[groupColumns, groupKeys, idForFoundsets, sort, hasRowStyleClassDataprovider]);

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
						return this.getFoundsetRef([rowGroupCols[0]], []);
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

					// Floor
					var idRandom = Math.floor(1000 * Math.random());

					if (change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED]) {
						$log.debug(idRandom + ' - 1. Sort');
						var newSort = change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].newValue;
						var oldSort = change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].oldValue;

						// sort changed
						$log.debug("Change Sort Model " + newSort);

						if (sortPromise) {
							$log.debug('sort has been requested clientside, no need to update the changeListener');
							return;
						}

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

					// Disable selection when table is grouped
					if (isTableGrouped()) {
						var selectedNodes = gridOptions.api.getSelectedNodes();
						for (var i = 0; i < selectedNodes.length; i++) {
							selectedNodes[i].setSelected(false);
						}
						return;
					}

					// CHANGE Seleciton
					// TODO implement multiselect
					if (!foundsetManager) {
						foundsetManager = foundset;
					}

					var rowIndex = foundsetManager.foundset.selectedRowIndexes[0] - foundsetManager.foundset.viewPort.startIndex;

					// find rowid
					if (rowIndex > -1 && foundsetManager.foundset.viewPort.rows[rowIndex]) {
						//rowIndex >= foundsetManager.foundset.viewPort.startIndex && rowIndex <= foundsetManager.foundset.viewPort.size + foundsetManager.foundset.viewPort.startIndex) {
						if (!foundsetManager.foundset.viewPort.rows[rowIndex]) {
							$log.error('how is possible there is no rowIndex ' + rowIndex + ' on viewPort size ' + foundsetManager.foundset.viewPort.rows.length);
							// TODO deselect node
							return;
						}

						var rowId = foundsetManager.foundset.viewPort.rows[rowIndex]._svyRowId;
						var node = getTableRow(rowId);
						if (node) {
							node.setSelected(true, true);
						}
					} else {
						// TODO selected record is not in viewPort: how to render it ?
						// deselect existing node
						var selectedNodes = gridOptions.api.getSelectedNodes();
						$log.debug(selectedNodes);
						if (selectedNodes.length > 1) {
							// TODO enable multi selection
							$log.warn("Multiselection is not enabled yet")
						}
						var node = selectedNodes[0];
						if (node) {
							node.setSelected(false);
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

					for (var i = 0; i < rowUpdates.length; i++) {
						var rowUpdate = rowUpdates[i];
						switch (rowUpdate.type) {
						case $foundsetTypeConstants.ROWS_CHANGED:
							//							for (var j = rowUpdate.startIndex; j <= rowUpdate.endIndex; j++) {
							//								updateRow(j);
							//							}
							break;
						case $foundsetTypeConstants.ROWS_INSERTED:
							break;
						case $foundsetTypeConstants.ROWS_DELETED:
							break;
						default:
							break;
						}
						// TODO can update single rows ?
					}
					$scope.purge();
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
						var uiRow = getAgGridRow(row._svyRowId);

						// update the row
						if (uiRow) {
							for (var prop in row) {
								if (uiRow[prop] != row[prop]) {
									uiRow[prop] = row[prop];
								}
							}
						} else {
							$scope.gridOptions.data.push(row);
						}
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
					for(var i = 0; i < rowGroupCols.length; i++) {
						if(args.colDef.field == rowGroupCols[i].colDef.field) {
							return false;	// don't allow editing columns used for grouping
						}
					}
					return true;
				}

				/**
				 * @public
				 * @return {Array<Object>}
				 *  */
				function getColumnDefs() {

					//create the column definitions from the specified columns in designer
					var colDefs = [];
					var colDef = { };
					var column;
					for (var i = 0; $scope.model.columns && i < $scope.model.columns.length; i++) {
						column = $scope.model.columns[i];

						var field = getColumnID(column, i);
						//create a column definition based on the properties defined at design time
						colDef = {
							headerName: "" + (column["headerTitle"] ? column["headerTitle"] : "") + "",
							field: field
						};

						// styleClass
						colDef.headerClass = 'ag-table-header ' + column.headerStyleClass;
						if (column.styleClassDataprovider) {
							colDef.cellClass = getCellClass;
						} else {
							colDef.cellClass = 'ag-table-cell ' + column.styleClass;
						}

						colDef.enableRowGroup = column.enableRowGroup;
						if (column.rowGroupIndex >= 0) colDef.rowGroupIndex = column.rowGroupIndex;
						if (column.width || column.width === 0) colDef.width = column.width;
						// TODO add minWidth and maxWidth to column.spec
						if (column.maxWidth) colDef.maxWidth = column.maxWidth;
						if (column.minWidth || column.minWidth === 0) colDef.minWidth = column.minWidth;
						if (column.visible === false) colDef.hide = true;
						if (column.enableSort === false) colDef.suppressSorting = true;

						if (column.editType != 'NONE') {
							colDef.editable = isColumnEditable;

							if(column.editType == 'TEXTFIELD') {
								colDef.cellEditor = 'agTextCellEditor';
							}
							else if(column.editType == 'DATEPICKER') {
								colDef.cellEditor = getDatePicker();
							}
							else if(column.editType == 'COMBOBOX') {
								colDef.cellEditor = getSelectEditor();
							}
							else if(column.editType == 'TYPEAHEAD') {
								colDef.cellEditor = getTypeaheadEditor();
							}
							// colDef.cellEditorParams = {
							//  	useFormatter: editValueFormatter
							// }
							colDef.onCellValueChanged = function(params) {
								updateFoundsetRecord(params);
							}
						}

						colDef.lockVisible = true;

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
					var styleClassProvider;

					// TODO can i get styleClassDataprovider from grouped foundset ?
					// var foundsetManager = getFoundsetManagerByFoundsetUUID(params.data._svyFoundsetUUID);

					// TODO get direct access to column is quicker than array scanning
					var column = getColumn(params.colDef.field);
					if (!isTableGrouped()) {
						if (column) {

							// TODO get value from the proper foundset
							var index = params.rowIndex - foundset.foundset.viewPort.startIndex;
							styleClassProvider = column.styleClassDataprovider[index];
						}
					} else {
						var foundsetManager = getFoundsetManagerByFoundsetUUID(params.data._svyFoundsetUUID);
						if (column) {
							var index = foundsetManager.getRowIndex(params.data) - foundsetManager.foundset.viewPort.startIndex;
							if (index >= 0) {
								styleClassProvider = foundsetManager.foundset.viewPort.rows[index][column.dataprovider.idForFoundset + "_styleClassDataprovider"];
							} else {
								$log.warn('cannot render styleClassDataprovider for row at index ' + index)
								$log.warn(params.data);
							}
						}
					}
					return 'ag-table-cell ' + column.styleClass + ' ' + styleClassProvider;
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
						return column.dataprovider.idForFoundset;
					} else {
						return "col_" + idx;
					}
				}

				/**
				 * Returns the column with the given fieldName
				 * @param {String} field
				 * @return {Object}
				 * */
				function getColumn(field) {
					if (state.columns[field]) { // check if is already cached
						return state.columns[field];
					} else {
						var columns = $scope.model.columns;
						for (var i = 0; i < columns.length; i++) {
							var column = columns[i];
							if (getColumnID(column, i) === field) {
								// cache it in hashmap for quick retrieval
								state.columns[field] = column;
								return $scope.model.columns[i];
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
					var columns = $scope.model.columns;
					for (var i = 0; i < columns.length; i++) {
						var column = columns[i];
						if (getColumnID(column, i) == field) {
							return i;
						}
					}
					return -1;
				}

				/**
				 * Returns the column identifier
				 * @return {String}
				 *  */
				function getColumnIDByIdForDataprovider(idForFoundset) {
					var columns = $scope.model.columns;
					for (var i = 0; i < columns.length; i++) {
						var column = columns[i];
						if (column.dataprovider && column.dataprovider.idForFoundset == idForFoundset) {
							var columnDef = columnDefs[i];
							return getColumnID(column, i);
						}
					}
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
					var svyColumnState = [];
					for(var i = 0; i < agColumnState.length; i++) {
						var columnStateItem = agColumnState[i];
						for(var j = 0; j < $scope.model.columns.length; j++) {
							var columnItem = $scope.model.columns[j];
							if(columnItem.dataprovider.idForFoundset == columnStateItem.colId) {
								columnStateItem.colId = '' + j;
								break;
							}
						}
						svyColumnState.push(columnStateItem);
					} 

					var rowGroupColumns = getRowGroupColumns();
					var svyRowGroupColumnIds = [];
					for(var i = 0; i < rowGroupColumns.length; i++) {
						var rowGroupColumnItem = rowGroupColumns[i];
						for(var j = 0; j < $scope.model.columns.length; j++) {
							var columnItem = $scope.model.columns[j];
							if(columnItem.dataprovider.idForFoundset == rowGroupColumnItem.colId) {
								svyRowGroupColumnIds.push('' + j);
								break;
							}
						}
					}

					var columnState = {
						columnState: svyColumnState,
						rowGroupColumnsState: svyRowGroupColumnIds
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
						var agColumnState = [];
						for(var i = 0; i < columnState.columnState.length; i++) {
							var svyColumnItem = columnState.columnState[i];
							if(!isNaN(svyColumnItem.colId)) {
								var idx = parseInt(svyColumnItem.colId);
								if(idx < $scope.model.columns.length) {
									svyColumnItem.colId = $scope.model.columns[idx].dataprovider.idForFoundset;
								}
							}
							agColumnState.push(svyColumnItem);
						}

						gridOptions.columnApi.setColumnState(agColumnState);

						var rowGroupColumnsIds = [];
						for(var i = 0; i < columnState.rowGroupColumnsState.length; i++) {
							var rowGroupColumnId = columnState.rowGroupColumnsState[i];
							var idx = parseInt(rowGroupColumnId);
							if(idx < $scope.model.columns.length) {
								rowGroupColumnsIds.push($scope.model.columns[idx].dataprovider.idForFoundset)
							}
						}
						if(rowGroupColumnsIds.length > 0) {
							gridOptions.columnApi.setRowGroupColumns(rowGroupColumnsIds);
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

				$scope.api.restoreColumnState = function(columnState) {
					if(columnState) {
						$scope.model.columnState = columnState;
						restoreColumnsState();
					}
					else {
						gridOptions.columnApi.resetColumnState();
					}
				}

				$scope.api.getColumnState = function() {
					return $scope.model.columnState;
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