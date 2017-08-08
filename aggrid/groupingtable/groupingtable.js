angular.module('aggridGroupingtable', ['servoy']).directive('aggridGroupingtable', ['$log', '$q', function($log, $q) {
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

				$scope.refresh = function(count) {
					gridOptions.api.refreshInfiniteCache();
				}

				$scope.purge = function(count) {
					gridOptions.api.purgeEnterpriseCache();
				}

				// specify the columns
				// var columnDefs = [{ headerName: "Make", field: "make" }, { headerName: "Model", field: "model" }, { headerName: "Price", field: "price" }];

				// specify the data
				// var rowData = [{ make: "Toyota", model: "Celica", price: 35000 }, { make: "Ford", model: "Mondeo", price: 32000 }, { make: "Porsche", model: "Boxter", price: 72000 }];

				//				// let the grid know which columns and what data to use
				//				var gridOptions = {
				//					columnDefs: columnDefs,
				//					rowData: rowData
				//				};

				// lookup the container we want the Grid to use
				//				var eGridDiv = document.querySelector('#myGrid');

				// create the grid passing in the div to use together with the columns & data we want to use
				//				new agGrid.Grid(eGridDiv, gridOptions);

				var CHUNK_SIZE = 15;

				// init the foundset
				var foundset = new FoundSetManager($scope.model.myFoundset, true);
				var groupManager = new GroupManager();
				var columnDefs = getColumnDefs();
				var sortModelDefault = getSortModel();
				// var columnDefs = [{ headerName: "Athlete", field: "athlete" }, { headerName: "Age", field: "age" }, { headerName: "Country", field: "country", rowGroupIndex: 0 }, { headerName: "Year", field: "year" }, { headerName: "Sport", field: "sport" }, { headerName: "Gold", field: "gold" }, { headerName: "Silver", field: "silver" }, { headerName: "Bronze", field: "bronze" }];

				console.log(columnDefs)
				var gridOptions = {
					defaultColDef: {
						width: 100,
						suppressFilter: true
					},
					// rowGroupColumnDef: columnDefs,
					// groupColumnDef : columnDefs,
					// enableSorting: true,
					enableServerSideSorting: true,
					columnDefs: columnDefs,
					enableColResize: true,
					// use the enterprise row model
					rowModelType: 'enterprise',
					// gridOptions.rowModelType = 'infinite';
					// bring back data 50 rows at a time
					// don't show the grouping in a panel at the top
					rowGroupPanelShow: 'always',
					animateRows: true,
					debug: true,

					rowBuffer: 0,
					suppressAggFuncInHeader: true,
					// restrict to 2 server side calls concurrently
					maxConcurrentDatasourceRequests: 2,
					cacheBlockSize: CHUNK_SIZE,
					maxBlocksInCache: 2,
					purgeClosedRowNodes: true,
					onGridReady: function(params) {
						params.api.sizeColumnsToFit();
					}

				};
				// TODO add default sort

				var gridDiv = document.querySelector('#myGrid');
				new agGrid.Grid(gridDiv, gridOptions);

				// listen for sort change
				gridOptions.api.addEventListener('sortChanged', onSortChanged);

				function onSortChanged(a1, a2, a3) {
					// not valuable, look side effect on the foundset
					console.log('sortChanged');
					console.log(a1);
					console.log(a2)
				}

				//				var foundsetServer = new FoundsetServer(rows);
				//				var datasource = new FoundsetDatasource(foundsetServer);
				//				gridOptions.api.setEnterpriseDatasource(datasource);

				$scope.$watch("model.myFoundset", function(newValue, oldValue) {

						$log.warn('myFoundset root changed');

						var foundsetServer = new FoundsetServer([]);
						var datasource = new FoundsetDatasource(foundsetServer);
						gridOptions.api.setEnterpriseDatasource(datasource);

						$scope.model.myFoundset.addChangeListener(changeListener);

					});

				// watch for sort changes and purge the cache
				$scope.$watch("model.myFoundset.sortColumns", function(newValue, oldValue) {
						// sort changed
						/** TODO check with R&D, sortColumns is updated only after the viewPort is update or there could be a concurrency race. When i would know when sort is completed ? */
						if (newValue && oldValue && newValue != oldValue) {
							$log.debug('myFoundset sort changed');
							gridOptions.api.purgeEnterpriseCache();
						} else if (newValue == oldValue && !newValue && !oldValue) {
							$log.warn("this should be happening");
						}

					}, true);

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
						} else { // if is a referenced foundset rows are already available
							// TODO how to resolved duplicates !??!?!?
							data = thisInstance.foundset.viewPort.rows;
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
								r[field] = header.dataprovider[index];
							}
							return r;

						} catch (e) {
							$log.error(e);
							r = null;
						}
						return r;
					}

					var hasMoreRecordsToLoad = function() {
						return thisInstance.foundset.hasMoreRows || thisInstance.foundset.viewPort.size < thisInstance.foundset.serverSize;
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

					var loadExtraRecordsAsync = function(size, dontNotifyYet) {
						return this.foundset.loadExtraRecordsAsync(size, dontNotifyYet);
					}

					var getSortColumns = function() {
						return this.foundset.sortColumns;
					}

					var sort = function(sortString) {
						if (sortString) {
							// TODO check sort
							return this.foundset.sort(sortString);
						}
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

						if (rowGroupCols.length === 1) { // the last group

							if (groupKeys.length === 1) { // is a leaf child

								// get the subtree matching the rowGroupCols
								var columnId = rowGroupCols[0].field;
								var key = groupKeys[0];
								var subTree = tree[columnId];
								if (subTree) { // rowGroup already exists
									var subTreeGroupKey = subTree.nodes[key];

									// create the subtree
									if (!subTreeGroupKey && create) { // keyGroup doesn't exist
										subTreeGroupKey = new Object();
										subTree.nodes[key] = subTreeGroupKey;
									}
									return subTreeGroupKey;
								} else { // rowGroup not found
									if (create) {
										var newTree = {
											nodes: new Object(),
											foundsetUUID: null
										}

										subTree[key] = newTree;
										return newTree;

									} else {
										return null;
									}
								}
							} else { // no group key criteria
								var key = rowGroupCols[0].field;
								var node = tree[key];
								if (!node && create) {
									tree[key] = {
										nodes: { },
										foundsetUUID: null
									};
								}
								return tree[key];
							}

						} else { // is not the last group
							var column = rowGroupCols[0];
							var key = groupKeys.length ? groupKeys[0] : null;
							var columnId = column.field;
							var subTree = tree[columnId];

							if (!subTree) {
								$log.warn("this should not happen")
								return null;
							}

							if (key !== null) {
								subTree = subTree.nodes[key];
							} else {
								$log.warn("this should not happen")
								// do i need it ?
							}

							// check if key ?

							rowGroupCols = rowGroupCols.slice(1);
							groupKeys = groupKeys.slice(1);

							return getTreeNode(subTree, rowGroupCols, groupKeys, create);

						}
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

						if (rowGroupCols.length === groupKeys.length) { // expand a node

							// TODO handle multilevel

							// get the foundset Reference
							var foundsetRef = hashTree.getCachedFoundset(rowGroupCols, groupKeys);
							if (foundsetRef) { // the foundsetReference is already cached
								resultPromise.resolve(foundsetRef);
							} else { // need to get a new foundset reference
								// create the subtree
								// FIXME i will miss information about the root columns. I need an array of matching column, not an index. e.g. [ALFKI, Italy, Roma]

								var searchRow = new Object();
								for (var idx = 0; idx < groupKeys.length; idx++) {
									// find
									var columnId = rowGroupCols[idx].field;
									columnIndex = getColumnIndex(columnId);
									searchRow['col_' + columnIndex] = groupKeys[idx];
								}

								$log.warn(searchRow);

								var promiseLeaf = getHashFoundset(null, searchRow, columnIndex);
								promiseLeaf.then(getHashLeafFoundsetSuccess)
								promiseLeaf.catch(promiseError);
							}

							parentIndex = columnIndex;

							// TODO loop over all data to retrieve the _svyRowId
							// TODO return parentFoundsetHash ? (i need this if is a second level group !!). Retrieving parent foundset i already have the condition on the first level
							//							var promiseLeaf = getHashFoundset(null, searchRow, columnIndex);
							//							promiseLeaf.then(getHashLeafFoundsetSuccess)
							//							promiseLeaf.catch(promiseError);

							/** @return {Object} returns the foundsetRef object */
							function getHashLeafFoundsetSuccess(foundsetRef) {

								if (!foundsetRef) {
									$log.error("why i don't have a foundset ref ?")
									return;
								} else {
									$log.warn(foundsetRef);
								}
								
								hashTree.setCachedFoundset(rowGroupCols, groupKeys, foundsetRef)

								$log.warn('success');
								resultPromise.resolve(foundsetRef);

							}

						} else { // scroll a group

							// if first level return the first foundset with no group criteria, if on second level, foundset will have group criteria
							for (idx = 0; idx < rowGroupCols.length; idx++) {
								// TODO loop over columns
								var columnId = rowGroupCols[idx].field; //
								columnIndex = getColumnIndex(columnId);

								// get the foundset Reference
								var foundsetRef = hashTree.getCachedFoundset(rowGroupCols, groupKeys);
								if (foundsetRef) { // the foundsetReference is already cached
									resultPromise.resolve(foundsetRef);
								} else { // need to get a new foundset reference
									// create the subtree
									// FIXME i will miss information about the root columns. I need an array of matching column, not an index. e.g. [ALFKI, Italy, Roma]
									var promise = getHashFoundset(null, null, parentIndex, columnIndex);
									promise.then(getHashFoundsetSuccess)
									promise.catch(promiseError);
								}

								parentIndex = columnIndex;

								/** @return {Object} returns the foundsetRef object */
								function getHashFoundsetSuccess(foundsetRef) {

									if (!foundsetRef) {
										$log.error("why i don't have a foundset ref ?")
										return;
									} else {
										$log.warn(foundsetRef);
									}

									// cache the foundsetRef
									//hashTree[columnId] = foundsetRef;
									// TODO does it have a UUID ?
									hashTree.setCachedFoundset(rowGroupCols, groupKeys, foundsetRef)

									$log.warn('success');
									resultPromise.resolve(foundsetRef);
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
					 * Returns the foundset from hash
					 * @param {String} parentFoundsetHash
					 * @param {Array<Object>} rowId
					 * @param {Number} parentLevelGroupColumnIndex
					 * @param {Number} [newLevelGroupColumnIndex]
					 *
					 * @return {PromiseType}
					 *  */
					function getHashFoundset(parentFoundsetHash, rowId, parentLevelGroupColumnIndex, newLevelGroupColumnIndex) {
						// TODO do i neet this method for something ?
						return getChildFoundSetHash(parentFoundsetHash, rowId, parentLevelGroupColumnIndex, newLevelGroupColumnIndex)

					}

				}

				/**
				 * Handle ChildFoundsets
				 * Returns the foundset in a promise
				 *
				 * @param {String} parentFoundsetHash
				 * @param {Array<Object>} rowId
				 * @param {Number} parentLevelGroupColumnIndex
				 * @param {Number} [newLevelGroupColumnIndex]
				 *
				 * @return {PromiseType}				 * */
				function getChildFoundSetHash(parentFoundsetHash, rowId, parentLevelGroupColumnIndex, newLevelGroupColumnIndex) {
					var resultDeferred = $q.defer();

					// parentFoundsetHash comes from the foundset referece type property
					// rowId comes from the foundset property type's viewport
					// parentLevelGroupColumnIndex and newLevelGroupColumnIndex are indexes in
					// an array property that holds dataproviders
					var childFoundsetPromise;

					// TODO store it in cache. Requires to be updated each time column array Changes
					var idForFoundsets = [];
					for (var i = 0; i < $scope.model.columns.length; i++) {
						idForFoundsets.push(getColumnID($scope.model.columns[i], i));
					}

					if (newLevelGroupColumnIndex || newLevelGroupColumnIndex === 0) {
						childFoundsetPromise = $scope.svyServoyapi.callServerSideApi("getGroupedChildFoundsetUUID",
							[parentFoundsetHash, rowId, parentLevelGroupColumnIndex, newLevelGroupColumnIndex, idForFoundsets]);
					} else {
						childFoundsetPromise = $scope.svyServoyapi.callServerSideApi("getLeafChildFoundsetUUID",
							[parentFoundsetHash, rowId, parentLevelGroupColumnIndex, idForFoundsets]);
					}

					childFoundsetPromise.then(function(childFoundsetUUID) {
							$log.warn(childFoundsetUUID);
							var childFoundset = getFoundSetByFoundsetUUID(childFoundsetUUID);
							if (!childFoundset) {
								$log.error("why i don't have a childFoundset ?")
							}

							childFoundset.addChangeListener(childChangeListener);
							resultDeferred.resolve(childFoundset)
							// TODO get data
							//mergeData('', childFoundset);
						}, function(e) {
							$log.error(e);
							resultDeferred.reject(e);
							// some error happened
						});

					return resultDeferred.promise;
				}

				function childChangeListener(rowUpdates, oldStartIndex, oldSize) {
					$log.error('LISTENER ')
				}

				/**
				 * Get Foundset by UUID
				 * */
				function getFoundSetByFoundsetUUID(foundsetHash) {
					if ($scope.model.hashedFoundsets)
						for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
							if ($scope.model.hashedFoundsets[i].foundsetUUID == foundsetHash)
								return $scope.model.hashedFoundsets[i].foundset;

						}
					return null;
				}

				/*************************************************************************************
				 *
				 *********************************************************************************/

				function changeListener(rowUpdates, oldStartIndex, oldSize) {
					$log.error("Change listener is called");
					// gridOptions.api.purgeEnterpriseCache();
					updateRows(rowUpdates, oldStartIndex, oldSize);
				}

				/**
				 * Update the uiGrid row with given viewPort index
				 * @param {Array} rowUpdates
				 * @param {Number} [oldStartIndex]
				 * @param {Number} oldSize
				 *
				 *  */
				function updateRows(rowUpdates, oldStartIndex, oldSize) {
					for (var i = 0; i < rowUpdates.length; i++) {
						for (var j = rowUpdates[i].startIndex; j <= rowUpdates[i].endIndex; j++) {
							updateRow(j);
						}
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

				/** return the row in grid with the given id */
				function getUiGridRow(svyRowId) {
					var data = $scope.gridOptions.data;
					for (var i = 0; i < data.length; i++) {
						if (data[i]._svyRowId === svyRowId) {
							return data[i];
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
				 * @public
				 * @return {Array<Object>}
				 *  */
				function getColumnDefs() {

					//create the column definitions from the specified columns in designer
					var colDefs = [{
							field: '_svyRowId',
							headerName: '_svyRowId',
							hide: false
						}];
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
						// FIXME remove hardcoded columnIndex
						//						if (i === 1) {
						//							colDef.rowGroupIndex = 0;
						//						}

						colDef.enableRowGroup = column.enableRowGroup;
						console.log(column.rowGroupIndex)
						if (column.rowGroupIndex || column.rowGroupIndex === 0) colDef.rowGroupIndex = column.rowGroupIndex;

						colDefs.push(colDef);
					}
					return colDefs;
				}

				function getSortModel() {
					var sortColumns = foundset.getSortColumns();
					for (var i = 0; i < sortColumns.length; i++) {
						// TODO parse sortColumns into default sort string
					}
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

				/** Enterprise Model  */
				function FoundsetDatasource(foundsetServer) {
					this.foundsetServer = foundsetServer;
				}

				FoundsetDatasource.prototype.getRows = function(params) {
					console.log('FoundsetDatasource.getRows: params = ', params);

					console.log(params);
					this.foundsetServer.getData(params.request,
						function successCallback(resultForGrid, lastRow) {
							params.successCallback(resultForGrid, lastRow);
						});
				};

				function FoundsetServer(allData) {
					this.allData = allData;
				}

				/**
				 * @param {Object} request
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

					// Handle sorting
					if (sortString && sortString != foundset.getSortColumns()) {
						foundset.sort(foundsetSortModel.sortColumns);
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
						// load record
						if (request.startRow > 0) {

							// it keeps loading always the same data. Why ?
							var promise = foundsetRef.loadExtraRecordsAsync(CHUNK_SIZE, false);
							promise.then(function() {
								var lastRow = foundsetRef.getLastRow();
								result = foundsetRef.getViewPortData(request.startRow, request.endRow);
								callback(result, lastRow);

							}).catch(function(e) {
								$log.error(e);
							});
						} else {
							callback(foundsetRef.getViewPortData(0, request.endRow), foundsetRef.getLastRow());
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