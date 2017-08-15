angular.module('aggridGroupingtable', ['servoy']).directive('aggridGroupingtable', ['$log', '$q', '$foundsetTypeConstants', '$filter',
	function($log, $q, $foundsetTypeConstants, $filter) {
		return {
			restrict: 'E',
			scope: {
				model: '=svyModel',
				handlers: '=svyHandlers',
				api: '=svyApi',
				svyServoyapi: '='
			},
			controller: function($scope, $element, $attrs) {
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
				 * @typedef {{
				 * endRow:Number,
				 * filterModel:Object,
				 * groupKeys:Array,
				 * rowGroupCols:Array,
				 * sortModel:Array,
				 * startRow: Number,
				 * valueCols: Array
				 * }}
				 *
				 * */
				var AgDataRequestType;

				$scope.refresh = function(count) {
					gridOptions.api.sizeColumnsToFit()
					//	gridOptions.api.doLayout();
					//	gridOptions.api.refreshInfiniteCache();
				}

				$scope.purge = function(count) {
					gridOptions.api.purgeEnterpriseCache();
					$scope.dirtyCache = false;

					// TODO keep status cache

					var columns = state.expanded.columns;
					for (var field in columns) {
						// FIXME there is no ag-grid method to force group expand for a specific key value
					}
				}

				var CHUNK_SIZE = 15;

				/**
				 * Store the state of the table. TODO to be persisted
				 * */
				var state = {
					/** valuelists stored per field */
					valuelists: { },
					expanded: {
						/** The column collapsed */
						columns: { },
						buffer: []
					},
					grouped: {
						columns: { }
					}
				}

				// formatFilter function
				var formatFilter = $filter("formatFilter");

				// init the root foundset manager
				var foundset = new FoundSetManager($scope.model.myFoundset, true);
				// the group manager
				var groupManager = new GroupManager();

				var columnDefs = getColumnDefs();
				var sortModelDefault = getSortModel();

				$log.debug(columnDefs);
				$log.debug(sortModelDefault);
				var gridOptions = {

					debug: false,
					rowModelType: 'enterprise',
					rowGroupPanelShow: 'onlyWhenGrouping', // TODO expose property

					defaultColDef: {
						width: 0,
						suppressFilter: true,
						valueFormatter: displayValueFormatter
					},

					rowHeight: $scope.model.rowHeight, // TODO expose property
					// TODO enable it ?					rowClass: $scope.model.rowStyleClass,	// add the class to each row

					// rowGroupColumnDef: columnDefs,
					// groupColumnDef : columnDefs,
					// enableSorting: false,
					enableServerSideSorting: true,
					columnDefs: columnDefs,
					enableColResize: true,
					suppressAutoSize: false,
					autoSizePadding: 25,
					suppressFieldDotNotation: true,

					enableServerSideFilter: false, // TODO implement serverside filtering

					rowSelection: 'single',
					suppressRowClickSelection: false,
					suppressCellSelection: true, // TODO implement focus lost/gained
					enableRangeSelection: false,

					stopEditingWhenGridLosesFocus: true,
					singleClickEdit: true,
					suppressClickEdit: false,
					enableGroupEdit: false,
					groupUseEntireRow: false,
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
					// gridOptions.rowModelType = 'infinite';
					// bring back data 50 rows at a time
					// don't show the grouping in a panel at the top
					animateRows: true,
					enableCellExpressions: true,

					rowBuffer: 0,
					// restrict to 2 server side calls concurrently
					maxConcurrentDatasourceRequests: 2,
					cacheBlockSize: CHUNK_SIZE,
					paginationInitialRowCount: CHUNK_SIZE, // TODO should be the foundset default (also for grouping ?)
					maxBlocksInCache: 2,
					purgeClosedRowNodes: true,
					onGridReady: function(params) {
						params.api.sizeColumnsToFit();
					},
					// TODO since i can't use getRowNode(id) in enterprise model, is pointeless to get id per node
					//					getRowNodeId: function(data) {
					//						return data._svyRowId;
					//					}
					// TODO localeText: how to provide localeText to the grid ? can the grid be shipped with i18n ?

				};

				// init the grid
				var gridDiv = $element.find('.ag-grouping')[0];
				new agGrid.Grid(gridDiv, gridOptions);
				// FIXME set columns to fit when table resizes
				gridOptions.api.sizeColumnsToFit();

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
				gridOptions.api.addEventListener('rowGroupOpened', onRowGroupOpened);

				// TODO rowStyleClassDataprovider
				if ($scope.model.rowStyleClassProvider) {
					gridOptions.getRowClass = function(params) {

						if (params.node.rowIndex) {
							return '';
						}
						// TODO return styleClass provider for row index
					}
				}

				function onSelectionChanged(event) {
					var selectedNodes = gridOptions.api.getSelectedNodes();
					console.log(selectedNodes);
					if (selectedNodes.length > 1) {
						// TODO enable multi selection
						$log.warn("Multiselection is not enabled yet")
					}
					var node = selectedNodes[0];
					if (node) {
						var rowIndex = foundset.getRowIndex(node.data);
						if (rowIndex > 1) {
							foundset.foundset.requestSelectionUpdate([rowIndex]);
						}
					} else {
						// this state is possible when the selected record is not in the visible viewPort
					}
				}
				
				function onCellClicked(params) {
					$log.error(params);
					if ($scope.handlers.onCellClick) {
						var row = params.data;
						var foundsetIndex = foundset.getRowIndex(row);
						var columnIndex = getColumnIndex(params.colDef.field);
						var record;
						if (foundsetIndex > -1) {
							record = foundset.foundset.viewPort.rows[foundsetIndex - foundset.foundset.viewPort.startIndex];
						}
						$scope.handlers.onCellClick(foundsetIndex, columnIndex, record, params.event);
					}
				}

				function onCellDoubleClicked(params) {
					$log.error(params);
					if ($scope.handlers.onCellDoubleClick) {
						var row = params.data;
						var foundsetIndex = foundset.getRowIndex(row);
						var columnIndex = getColumnIndex(params.colDef.field);
						var record;
						if (foundsetIndex > -1) {
							record = foundset.foundset.viewPort.rows[foundsetIndex - foundset.foundset.viewPort.startIndex];
						}
						$scope.handlers.onCellDoubleClick(foundsetIndex, columnIndex, record, params.event);					}
				}
				
				function onCellContextMenu(params) {
					$log.error(params);
					if ($scope.handlers.onCellRightClick) {
						var row = params.data;
						var foundsetIndex = foundset.getRowIndex(row);
						var columnIndex = getColumnIndex(params.colDef.field);
						var record;
						if (foundsetIndex > -1) {
							record = foundset.foundset.viewPort.rows[foundsetIndex - foundset.foundset.viewPort.startIndex];
						}
						$scope.handlers.onCellRightClick(foundsetIndex, columnIndex, record, params.event);					}
				}
				
				function onColumnRowGroupChanged(event) {
					$log.warn(event);
				}

				function onRowGroupOpened(event) {
					$log.warn(event);
					// TODO remove foundset from memory when a group is closed

					return;
					var column = event.node;
					var field = column.field;
					var key = column.key;
					var groupIndex = column.level;
					var isExpanded = column.expanded;

					// TODO if ungroup remove a full row group.
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

				}

				function displayValueFormatter(params) {
					var field = params.colDef.field;
					var value = params.data[field];
					var column = getColumn(field);

					if (column) {
						value = getValuelistValue(field, value, column);

						// FIXME this doesn't work, try to use value getter
						// if returns a promise
						if (value.then instanceof Function) {

							value.then(getDisplayValueSuccess, getDisplayValueFailure);

							//							var waitForValue = setTimeout(function () {
							//								value = params.data[field];
							//								wait = false;
							//							}, 1000);

							// FIXME how to get displayValue when not in client-side ?
							// TODO the display setter is called each time, should prevent this top happen.
							// TODO issue should be addressed during getData ?

							var result;
							var wait = true;
							function getDisplayValueSuccess(data) {
								if ($log.debugEnabled) $log.debug('ag-groupingtable: realValue: ' + value + ' displayValue: ' + data);
								$log.warn('displayValue ' + data);
								value = data;
								//								if (waitForValue) {
								//									waitForValue.clearTimeout();
								//								}
								wait = false;
								return result;
							}

							function getDisplayValueFailure(e) {
								//								if (waitForValue) {
								//									waitForValue.clearInterval();
								//								}
								$log.error(e);
							}
							value = params.data[field];

							//							while(wait) {
							//								// do nothing until promise resolved
							//							}

						} else {

						}

						if (column.format) {
							value = formatFilter(value, column.format.display, column.format.type);
						}
					}

					return value;
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

					console.log(request);

					$log.warn(request);

					// the row group cols, ie the cols that the user has dragged into the 'group by' zone, eg 'Country' and 'Customerid'
					var rowGroupCols = request.rowGroupCols;
					// the keys we are looking at. will be empty if looking at top level (either no groups, or looking at top level groups). eg ['United States','2002']
					var groupKeys = request.groupKeys;
					// if going aggregation, contains the value columns, eg ['gold','silver','bronze']
					var valueCols = request.valueCols;

					var filterModel = request.filterModel;
					var sortModel = request.sortModel;

					var result;

					var foundsetSortModel = getFoundsetSortModel(sortModel);
					var sortString = foundsetSortModel.sortString;

					$log.warn("Group " + (rowGroupCols[0] ? rowGroupCols[0].displayName : '/') + ' + ' + (groupKeys[0] ? groupKeys[0] : '/') + ' # ' + request.startRow + ' # ' + request.endRow);

					// TODO disable sorting if table is grouped
					// Handle sorting, skip if grouping
					if (rowGroupCols.length > 0) {
						// TODO remove sort icon
					} else if (sortString && sortString != foundset.getSortColumns()) {
						$log.error('CHANGE IN SORT HAPPENED');

						// FIXME this is a workaround for issue SVY-11456
						sortColumnsPromise = $q.defer();

						/** Change the foundset's sort column  */
						foundset.sort(foundsetSortModel.sortColumns);

						sortColumnsPromise.promise.then(function() {
							$log.error("yes the promise is resolved");
							sortColumnsPromise = null;
							callback(foundset.getViewPortData(request.startRow, request.endRow), foundset.getLastRow());
						});

						/** Sort has changed, exit since the sort will refresh the viewPort. Cache will be purged as soon sortColumn change status */
						return;
					}

					// check grouping
					$log.debug('grouping');
					console.log(rowGroupCols);
					console.log(groupKeys);

					// if not grouping, just return the full set
					if (rowGroupCols.length === 0) {
						$log.warn('NO GROUP');
						getDataFromFoundset(foundset);
					} else {
						// otherwise if grouping, a few steps...

						// first, if not the top level, take out everything that is not under the group
						// we are looking at.
						//var filteredData = this.filterOutOtherGroups(filteredData, groupKeys, rowGroupCols);

						// get the foundset reference
						groupManager.getFoundsetRef(rowGroupCols, groupKeys).then(function(foundsetRef) {

							var foundsetRefManager = new FoundSetManager(foundsetRef);
							getDataFromFoundset(foundsetRefManager);

						}).catch(function(e) {
							$log.error(e);
						});
					}

					// check if sort has changed

					function getDataFromFoundset(foundsetRef) {
						// load record if endRow is not in viewPort
						if (request.endRow > foundsetRef.foundset.viewPort.size) {

							// it keeps loading always the same data. Why ?
							var promise = foundsetRef.loadExtraRecordsAsync(request.startRow, request.endRow - request.startRow, false);
							promise.then(function() {
								var lastRow = foundsetRef.getLastRow();
								result = foundsetRef.getViewPortData(request.startRow, request.endRow);
								// TODO use viewPort 0
								//								result = foundsetRef.getViewPortData(0, request.endRow - request.startRow);

								callback(result, lastRow);

							}).catch(function(e) {
								$log.error(e);
							});
						} else {
							callback(foundsetRef.getViewPortData(request.startRow, request.endRow), foundsetRef.getLastRow());
						}
					}

					return;

					var filteredData = this.filterList(this.allData, filterModel);
					// sort data if needed
					result = this.sortList(result, sortModel);
					// we mimic finding the last row. if the request exceeds the length of the
					// list, then we assume the last row is found. this would be similar to hitting
					// a database, where we have gone past the last row.
					var lastRowFound = (result.length <= request.endRow);
					var lastRow = lastRowFound ? result.length : null;
					// only return back the rows that the user asked for
					var result = result.slice(request.startRow, request.endRow);

				};

				/**************************************************************************************************
				 **************************************************************************************************
				 *
				 *  Watches
				 *
				 **************************************************************************************************
				 **************************************************************************************************/

				$scope.$watch("model.myFoundset", function(newValue, oldValue) {

						$log.error('myFoundset root changed');

						var foundsetServer = new FoundsetServer([]);
						var datasource = new FoundsetDatasource(foundsetServer);
						gridOptions.api.setEnterpriseDatasource(datasource);

						$scope.model.myFoundset.addChangeListener(changeListener);

					});

				var sortColumnsPromise;

				// watch for sort changes and purge the cache
				$scope.$watch("model.myFoundset.sortColumns", function(newValue, oldValue) {

						// sort changed
						$log.debug("Change Sort Model " + newValue);

						// FIXME this is a workaround for issue SVY-11456
						if (sortColumnsPromise) {
							sortColumnsPromise.resolve(true);
							return;
						}

						/** TODO check with R&D, sortColumns is updated only after the viewPort is update or there could be a concurrency race. When i would know when sort is completed ? */
						if (newValue && oldValue && newValue != oldValue) {
							$log.debug('myFoundset sort changed');
							gridOptions.api.setSortModel(getSortModel());
							gridOptions.api.purgeEnterpriseCache();
						} else if (newValue == oldValue && !newValue && !oldValue) {
							$log.warn("this should not be happening");
						}

					}, true);

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
				function FoundSetManager(foundsetRef, isRoot) {
					var thisInstance = this;

					// properties
					this.foundset = foundsetRef;
					this.isRoot = isRoot ? true : false;

					// methods
					this.getViewPortData;
					this.getViewPortRow;
					this.hasMoreRecordsToLoad;
					this.getLastRow;
					this.foundsetListener;
					this.loadExtraRecordsAsync;
					this.getSortColumns;
					this.sort;
					this.getRowIndex;

					/** return the viewPort data in a new object
					 * @param {Number} [startIndex]
					 * @param {Number} [endIndex]
					 * */
					var getViewPortData = function(startIndex, endIndex) {
						//if($scope.model.myFoundset.viewPort.size == $scope.model.numRows){
						var data = [];
						var result = [];
						startIndex = startIndex ? startIndex : 0;
						endIndex = endIndex ? endIndex : thisInstance.foundset.viewPort.rows.length;

						// index cannot exceed ServerSize
						startIndex = Math.min(startIndex, thisInstance.foundset.serverSize);
						endIndex = Math.min(endIndex, thisInstance.foundset.serverSize);

						if (this.isRoot) { // if is the root foundset is should build the rows
							for (var j = startIndex; j < endIndex; j++) {
								data.push(thisInstance.getViewPortRow(j));
							}
							result = data;
						} else { // if is a referenced foundset rows are already available
							// TODO how to resolved duplicates !??!?!?
							data = thisInstance.foundset.viewPort.rows;

							// TODO apply filter&valuelists&columnFormat

							// TODO check limit startIndex/endIndex;
							result = data.slice(startIndex, endIndex);
						}
						$log.warn('Next line is the result data to be loaded in table')
						console.log(result);
						return result;
					}

					/** return the row in viewport at the given index */
					var getViewPortRow = function(index) {
						var r;
						try {
							r = new Object();
							// push the id so the rows can be merged
							r._svyRowId = thisInstance.foundset.viewPort.rows[index]._svyRowId;

							// push each dataprovider
							for (var i = 0; i < $scope.model.columns.length; i++) {
								var header = $scope.model.columns[i];
								var field = getColumnID(header, i);

								var value = header.dataprovider[index];
								// TODO check if has valuelist
								//								value = getValuelistValue(field,value,header);
								//
								//								// FIXME this doesn't work, try to use value getter
								//								// if returns a promise
								//								if (value.then instanceof Function) {
								//
								//									value.then(getDisplayValueSuccess, getDisplayValueFailure);
								//
								//									function getDisplayValueSuccess(data) {
								//										if ($log.debugEnabled) $log.debug('ag-groupingtable: realValue: ' + value + ' displayValue: ' +  data);
								//										$log.warn('displayValue ' + data);
								//										r[field] = data;
								//									}
								//
								//									function getDisplayValueFailure(e) {
								//										$log.error(e);
								//									}
								//
								//									// restore field value
								//									value = header.dataprovider[index];
								//								} else {
								//
								//								}
								//
								//								if (header.format) {
								//									value = formatFilter(value, header.format.display, header.format.type);
								//								}
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

					var getLastRow = function() {
						if (this.hasMoreRecordsToLoad()) {
							return -1;
						} else {
							return thisInstance.foundset.serverSize;
						}
					}

					var foundsetListener = function(rowUpdates, oldStartIndex, oldSize) {
						$log.warn('foundset changed listener ');
						// update all rows
						// TODO fixme, is adding rows
						// updateRows(rowUpdates, oldStartIndex, oldSize);
					}

					var loadExtraRecordsAsync = function(startIndex, size, dontNotifyYet) {
						// TODO use loadRecordsAsync to keep cache small
						//	return this.foundset.loadRecordsAsync(startIndex, size, dontNotifyYet);

						return this.foundset.loadExtraRecordsAsync(size, dontNotifyYet);
					}

					var getSortColumns = function() {
						return thisInstance.foundset.sortColumns;
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

					// methods
					this.getViewPortData = getViewPortData;
					this.getViewPortRow = getViewPortRow;
					this.hasMoreRecordsToLoad = hasMoreRecordsToLoad;
					this.getLastRow = getLastRow;
					this.foundsetListener = foundsetListener;
					this.loadExtraRecordsAsync = loadExtraRecordsAsync;
					this.getSortColumns = getSortColumns;
					this.sort = sort;

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

					// private properties
					var hashTree = new Object(); // the foundsetRef mapping

					// methods
					this.getCachedFoundset;
					this.setCachedFoundset;

					this.getCachedFoundset = function(rowGroupCols, groupKeys) {

						var tree = hashTree;
						var node = getTreeNode(tree, rowGroupCols, groupKeys);
						return node ? node.foundsetUUID : null;

						//						for (var colIdx = 0; colIdx < rowGroupCols.length; colIdx++) {
						//							var columnId = rowGroupCols[colIdx].field;
						//							if (colIdx === groupKeys.length -2 ) {	// last node is not a leaf
						//								parentTree = parentTree[columnId];
						//							} else {	//
						//								if (parentTree[columnId]) {
						//									parentTree = parentTree[columnId].nodes;
						//								} else {
						//									return null;
						//								}
						//							}
						//						}
						//
						//						if (parentTree) {
						//							return parentTree.foundsetUUID;
						//						}
						//
					}

					this.setCachedFoundset = function(rowGroupCols, groupKeys, foundsetUUID) {
						var tree = getTreeNode(hashTree, rowGroupCols, groupKeys, true);
						tree.foundsetUUID = foundsetUUID;
					}

					/**
					 * @param {Object} tree
					 * @param {Array} rowGroupCols
					 * @param {Array} groupKeys
					 * @param {Boolean} [create]
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

						if (!tree) {
							return null;
						}

						// the column id e.g. customerid, shipcity
						var columnId = rowGroupCols[0].field;

						// the tree for the given column
						var colTree = tree[columnId];

						// create the tree node if does not exist
						if (!colTree && create) {
							colTree = {
								nodes: { },
								foundsetUUID: null
							};
							tree[columnId] = colTree;
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
									keyTree = {
										foundsetUUID: null,
										nodes: new Object()
									}
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
									keyTree = {
										foundsetUUID: null,
										nodes: new Object()
									}
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

							result = getTreeNode(subTree.nodes, rowGroupCols, groupKeys, create);

						} else {
							$log.warn("No group criteria, should not happen");
						}

						return result;
					}

				}

				/**
				 *
				 *
				 * @constructor
				 * */
				function GroupManager() {

					var hashTree = new GroupHashCache();

					// properties
					this.groupedColumns = [];
					this.groupedValues = new Object();

					// methods
					this.getFoundsetRef;

					//					this.updateGroupColumns = function(rowGroupCols) {
					//
					//						for (var i = 0; i < rowGroupCols.length; i++) {
					//
					//						}
					//
					//					}

					/**
					 * Returns the foundset with the given grouping criteria
					 *
					 * @param {Array} rowGroupCols
					 * @param {Array} groupKeys
					 *
					 * @return {PromiseType} returns a promise
					 * */
					this.getFoundsetRef = function(rowGroupCols, groupKeys) {

						// create a promise
						/** @type {PromiseType} */
						var resultPromise = $q.defer();

						// return the root foundset if no grouping criteria
						if (rowGroupCols.length === 0 && groupKeys.length === 0) { // no group return root foundset
							return resultPromise.resolve(foundset);
						}

						var idx; // the index of the group dept
						var parentIndex; // the index of the parent column
						var columnIndex; // the index of the grouped column

						// ignore rowGroupColumns which are still collapsed (don't have a matchig key)
						rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);

						// possibilities

						// is a root group CustomerID

						// is a second level group CustomerID, ShipCity

						// is a third level group CustomerID, ShipCity, ShipCountry

						var parentUUID = null;

						// recursevely load hashFoundset
						getRowColumnHashFoundset(0);

						function getRowColumnHashFoundset(index) {

							var groupCols = rowGroupCols.slice(0, index + 1);
							var keys = groupKeys.slice(0, index + 1);

							$log.warn(groupCols)
							$log.warn(keys);

							// get a foundset for each grouped level
							// resolve promise when got to the last level

							// TODO loop over columns
							var columnId = groupCols[groupCols.length - 1].field; //
							columnIndex = getColumnIndex(columnId);

							// get the foundset Reference
							var foundsetHash = hashTree.getCachedFoundset(groupCols, keys);
							if (foundsetHash) { // the foundsetReference is already cached
								if (index === rowGroupCols.length - 1) { // resolve when last rowColumn foundset has been loaded
									var foundsetRef = getFoundSetByFoundsetUUID(foundsetHash);
									resultPromise.resolve(foundsetRef);
								} else {
									parentUUID = foundsetHash;
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

								var promise = getHashFoundset(groupColumnIndexes, keys);
								promise.then(getHashFoundsetSuccess)
								promise.catch(promiseError);
							}

							// update the parent index
							parentIndex = columnIndex;

							/** @return {Object} returns the foundsetRef object */
							function getHashFoundsetSuccess(childFoundset) {

								if (!childFoundset) {
									$log.error("why i don't have a foundset ref ?")
									return;
								} else {
									$log.warn(foundsetRef);
								}

								// the hash of the parent foundset
								var foundsetUUID = childFoundset.foundsetUUID;
								var foundsetRef = childFoundset.foundsetRef;

								// for the next child
								parentUUID = foundsetUUID;

								// cache the foundsetRef
								hashTree.setCachedFoundset(groupCols, keys, foundsetUUID);

								$log.warn('success ' + foundsetUUID);

								if (index === rowGroupCols.length - 1) { // resolve when last rowColumn foundset has been loaded
									resultPromise.resolve(foundsetRef);
								} else {
									getRowColumnHashFoundset(index + 1); // load the foundset for the next group
								}
							}

						}

						function promiseError(e) {
							$log.error(e);
							resultPromise.reject(e);
						}

						return resultPromise.promise;
					}

					/**
					 * Handle ChildFoundsets
					 * Returns the foundset in a promise
					 * @param {Array<Number>} groupColumns index of all grouped columns
					 * @param {Array} groupKeys value for each grouped column
					 *
					 * @return {PromiseType}
					 *  */
					function getHashFoundset(groupColumns, groupKeys) {

						var resultDeferred = $q.defer();

						var childFoundsetPromise;

						// TODO store it in cache. Requires to be updated each time column array Changes
						var idForFoundsets = [];
						for (var i = 0; i < $scope.model.columns.length; i++) {
							idForFoundsets.push(getColumnID($scope.model.columns[i], i));
						}

						childFoundsetPromise = $scope.svyServoyapi.callServerSideApi("getGroupedFoundsetUUID",
							[groupColumns, groupKeys, idForFoundsets]);

						childFoundsetPromise.then(function(childFoundsetUUID) {
								$log.warn(childFoundsetUUID);
								var childFoundset = getFoundSetByFoundsetUUID(childFoundsetUUID);
								if (!childFoundset) {
									$log.error("why i don't have a childFoundset ?")
								}

								childFoundset.addChangeListener(childChangeListener);
								resultDeferred.resolve({ foundsetRef: childFoundset, foundsetUUID: childFoundsetUUID });
								// TODO get data
								//mergeData('', childFoundset);
							}, function(e) {
								$log.error(e);
								resultDeferred.reject(e);
								// some error happened
							});

						return resultDeferred.promise;
					}

				}

				/**
				 * Get Foundset by UUID
				 * */
				function getFoundSetByFoundsetUUID(foundsetHash) {
					if ($scope.model.hashedFoundsets) {
						for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
							if ($scope.model.hashedFoundsets[i].foundsetUUID == foundsetHash)
								return $scope.model.hashedFoundsets[i].foundset;

						}
					}
					return null;
				}

				/*************************************************************************************
				 *************************************************************************************
				 *
				 * Global Methods
				 *
				 *************************************************************************************
				 *************************************************************************************/

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

				/** Listener of a group foundset
				 *  TODO remove changeListener when removing a foundset
				 * */
				function childChangeListener(change) {
					// TODO keylistener per group, will force the purge of a single group, not all of them
					if (change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED]) {
						var updates = change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED].updates;
						updateRows(updates, null, null);
					}
				}

				/** Listener for the root foundset */
				function changeListener(change) {
					$log.error("Change listener is called");
					// gridOptions.api.purgeEnterpriseCache();
					if (change[$foundsetTypeConstants.NOTIFY_SELECTED_ROW_INDEXES_CHANGED]) {
						selectedRowIndexesChanged();
					}

					if (change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED]) {
						var updates = change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED].updates;
						updateRows(updates, null, null);
					}
				}

				function selectedRowIndexesChanged() {
					// FIXME can't select the record when is not in viewPort. Need to synchornize with viewPort record selection

					// CHANGE Seleciton
					// TODO implement multiselect
					var rowIndex = foundset.foundset.selectedRowIndexes[0] - foundset.foundset.viewPort.startIndex;

					// find rowid
					if (rowIndex > -1 && rowIndex >= foundset.foundset.viewPort.startIndex && rowIndex <= foundset.foundset.viewPort.size + foundset.foundset.viewPort.startIndex) {
						var rowId = foundset.foundset.viewPort.rows[rowIndex]._svyRowId;
						var node = getTableRow(rowId);
						if (node) {
							node.setSelected(true, true);
						}
					} else {
						// TODO selected record is not in viewPort: how to render it ?
						// deselect existing node
						var selectedNodes = gridOptions.api.getSelectedNodes();
						console.log(selectedNodes);
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
				 * Update the uiGrid row with given viewPort index
				 * @param {Array<{startIndex: Number, endIndex: Number, type: Number}>} rowUpdates
				 * @param {Number} [oldStartIndex]
				 * @param {Number} oldSize
				 *
				 *  */
				function updateRows(rowUpdates, oldStartIndex, oldSize) {

					// Don't update automatically if the row are grouped
					var rowGroupCols = gridOptions.columnApi.getRowGroupColumns();
					if (rowGroupCols.length > 0) {
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

				/**
				 * @public
				 * @return {Array<Object>}
				 *  */
				function getColumnDefs() {

					//create the column definitions from the specified columns in designer
					var colDefs = [];
					var colDef = { };
					var column;
					for (var i = 0; i < $scope.model.columns.length; i++) {
						column = $scope.model.columns[i];

						var field = getColumnID(column, i);
						//create a column definition based on the properties defined at design time
						colDef = {
							headerName: "" + column["headerTitle"] + "",
							field: field
						};

						colDef.enableRowGroup = column.enableRowGroup;
						if (column.rowGroupIndex || column.rowGroupIndex === 0) colDef.rowGroupIndex = column.rowGroupIndex;
						if (column.width || column.width === 0) colDef.width = column.width;

						colDefs.push(colDef);
					}

					// TODO svyRowId should not be visible. I need the id for the selection
					colDefs.push({
						field: '_svyRowId',
						headerName: '_svyRowId',
						suppressMenu: true,
						suppressNavigable: true,
						suppressResize: true,
						hide: true
					});

					return colDefs;
				}

				function getSortModel() {
					var sortModel = [];
					var sortColumns = foundset.getSortColumns();
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
					return sortModel;
				}

				/**
				 * @param {String} field
				 * @param {String|Number|Boolean} value
				 * @param {Object} column
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
					// TODO search into the valuelist object

					//					var valuelistsState = state.valuelists;
					//					var valuelist = valuelistState[field];
					//					if (valuelist]) {	// search in cache
					//
					//						// may need to ask the valuelist value
					//					} else {	// search in valuelist
					//
					//
					//					}
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
					var columnDefsPvt = gridOptions.columnDefs;
					for (var i = 0; i < columnDefsPvt.length; i++) {
						var column = columnDefsPvt[i];
						if (column.field == field) {
							return $scope.model.columns[i];
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
							var columnName = column.dataprovider.idForFoundset;
							var direction = sortModelCol.sort;
							if (i > 0) sortString += ',';
							sortString += columnName + ' ' + direction + '';
							sortColumns.push({ name: columnName, direction: direction });

						}
						sortString = sortString.trim();
					}

					return {
						sortString: sortString,
						sortColumns: sortColumns
					};
				}
				
				// FIXME how to force re-fit when table is shown for the first time
				
				// bind resize event
				$(window).on('resize', onWindowResize);

				var destroyListenerUnreg = $scope.$on('$destroy', function() { // unbind resize on destroy
						$(window).off('resize', onWindowResize);
					});

				function onWindowResize() { // resize
					// var width = $element.parent().width();
					// var height = $element.parent().height();
					setTimeout(function() {
							gridOptions.api.sizeColumnsToFit();
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
				 console.warn('unrecognised aggregation function: ' + valueCol.aggFunc);
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

	agGrid.LicenseManager.setLicenseKey("ag-Grid_Evaluation_License_Not_for_Production_100Devs2_August_2017__MTUwMTYyODQwMDAwMA==f340cff658f8e3245fee29659b49a674");

});