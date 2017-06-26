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

				var CHUNK_SIZE = 50;

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

				function changeListener() {
					$log.error("Change listener is called");
					// gridOptions.api.purgeEnterpriseCache();
				}

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
				 * FoundsetManager
				 * @constructor
				 *
				 * */
				function FoundSetManager(foundsetRef, isRoot) {
					var thisInstance = this;

					this.foundset = foundsetRef;
					this.ghostRow = null;
					this.isRoot = isRoot ? true : false;

					/** return the viewPort data in a new object
					 * @param {Number} [startIndex]
					 * @param {Number} [endIndex]
					 * */
					this.getViewPortData = function(startIndex, endIndex) {
						//if($scope.model.myFoundset.viewPort.size == $scope.model.numRows){
						var data = [];
						startIndex = startIndex ? startIndex : 0;
						endIndex = endIndex ? endIndex : thisInstance.foundset.viewPort.rows.length;

						if (this.isRoot) { // if is the root foundset is should build the rows
							for (var j = startIndex; j < endIndex; j++) {
								data.push(thisInstance.getViewPortRow(j));
							}
						} else { // if is a referenced foundset rows are already available
							// TODO how to resolved duplicates !??!?!?
							data = thisInstance.foundset.viewPort.rows;
							// TODO check limit startIndex/endIndex;
							data.slice(startIndex, endIndex);
						}
						console.log(data);
						return data;
					}

					/** return the row in viewport at the given index */
					this.getViewPortRow = function(index) {
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

					this.hasMoreRecordsToLoad = function() {
						return thisInstance.foundset.hasMoreRows || thisInstance.foundset.viewPort.size < thisInstance.foundset.serverSize;
					}

					this.getLastRow = function() {
						if (this.hasMoreRecordsToLoad()) {
							return -1;
						} else {
							return thisInstance.foundset.serverSize;
						}
					}

					this.foundsetListener = function(rowUpdates, oldStartIndex, oldSize) {
						$log.warn('foundset changed listener ');
						// update all rows
						// TODO fixme, is adding rows
						// updateRows(rowUpdates, oldStartIndex, oldSize);
					}

					this.loadExtraRecordsAsync = function(size, dontNotifyYet) {
						return this.foundset.loadExtraRecordsAsync(size, dontNotifyYet);
					}

					this.getSortColumns = function() {
						return this.foundset.sortColumns;
					}

					this.sort = function(sortString) {
						if (sortString) {
							// TODO check sort
							return this.foundset.sort(sortString);
						}
					}
				}

				/**
				 * @constructor
				 * */
				function GroupManager() {

					var hashTree = new Object();

					this.groupedColumns = [];
					this.groupedValues = new Object();

					//					this.updateGroupColumns = function(rowGroupCols) {
					//
					//						for (var i = 0; i < rowGroupCols.length; i++) {
					//
					//						}
					//
					//					}

					/**
					 * @param {Array} rowGroupCols
					 * @param {Array} groupKeys
					 *
					 * @return {FoundSetManager}
					 * */
					this.getFoundsetData = function(rowGroupCols, groupKeys) {

						var resultPromise = $q.defer();

						if (rowGroupCols.length === 0 && groupKeys.length === 0) { // return root foundset
							return foundset;
						}

						var idx; // the index of the group dept
						var parentIndex; // the index of the parent column
						var columnIndex; // the index of the grouped column
						for (idx = 0; idx < rowGroupCols.length; idx++) {
							// TODO loop over columns
							var columnId = rowGroupCols[idx].field; //
							columnIndex = getColumnIndex(columnId);
							if (hashTree[columnId]) { // i had already retrieved the foundset
								// search in sub tree
								resultPromise.resolve(hashTree[columnId]);
								// TODO how can i get Row ID ? do i need the row ID ?

							} else { // get the serverside foundset
								// create the subtree
								// FIXME i will miss information about the root columns. I need an array of matching column, not an index. e.g. [ALFKI, Italy, Roma]
								var promise = getHashFoundset(null, null, parentIndex, columnIndex);
								promise.then(getHasFoundsetSuccess)
								promise.catch(promiseError);
								
								function getHasFoundsetSuccess(foundsetRef) {

										if (!foundsetRef) {
											$log.error("why i don't have a foundset ref ?")
											return;
										} else {
											$log.warn(foundsetRef);
										}
										// return the foundsetRef
										hashTree[columnId] = foundsetRef;

										// setPreferredViewPortSize and resolve when viewPortSize records are loaded ?
										foundsetRef.setPreferredViewportSize(CHUNK_SIZE);
										//var recordLoaded = foundsetRef.loadRecordsAsync(foundsetRef.viewPort.startIndex, CHUNK_SIZE);
										var recordLoaded = foundsetRef.loadExtraRecordsAsync(CHUNK_SIZE, false);
										recordLoaded.then(recordLoadedSuccess)
										recordLoaded.catch(promiseError);
										
										function recordLoadedSuccess() {
											$log.warn('success');
											resultPromise.resolve(foundsetRef);
										}
										
								}

								
							}

							$log.warn();
							parentIndex = columnIndex;
						}
						
						function promiseError(e) {
							$low.error(e);
							resultPromise.reject(e);
						}

						return resultPromise.promise;
					}

					function getHashFoundset(parentFoundsetHash, rowId, parentLevelGroupColumnIndex, newLevelGroupColumnIndex) {
						return getChildFoundSetHash(parentFoundsetHash, rowId, parentLevelGroupColumnIndex, newLevelGroupColumnIndex)
					}
					

				}

				/**
				 * Handle ChildFoundsets
				 * Returns the foundset in a promise
				 *
				 * @returns {Promise}
				 * */
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

					if (newLevelGroupColumnIndex) {
						childFoundsetPromise = $scope.svyServoyapi.callServerSideApi("getGroupedChildFoundsetUUID",
							[parentFoundsetHash, rowId, parentLevelGroupColumnIndex, newLevelGroupColumnIndex, idForFoundsets]);
					} else {
						childFoundsetPromise = $scope.svyServoyapi.callServerSideApi("getLeafChildFoundsetUUID",
							[parentFoundsetHash, rowId, parentLevelGroupColumnIndex, idForFoundsets]);
					}

					childFoundsetPromise.then(function(childFoundsetUUID) {
							$log.error(childFoundsetUUID);
							var childFoundset = getFoundSetByFoundsetUUID(childFoundsetUUID);
							resultDeferred.resolve(childFoundset)
							// TODO get data
							//mergeData('', childFoundset);
						}, function(e) {
							resultDeferred.reject(e);
							// some error happened
						});

					return resultDeferred.promise;
				}

				/**
				 * Get Foundset by UUID
				 * */
				function getFoundSetByFoundsetUUID(foundsetHash) {
					if ($scope.model.hashedFoundsets)
						for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
							if ($scope.model.hashedFoundsets[i].foundsetUUID == foundsetHash)
								return $scope.model.hashedFoundsets[i].foundset;

							return null;
						}
				}

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
						if (i === 1) {
							colDef.rowGroupIndex = 0;
						}

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

				FoundsetServer.prototype.getData = function(request, callback) {

					console.log(request);

					$log.warn(request);

					// the row group cols, ie teh cols that the user has dragged into the
					// 'group by' zone, eg 'Country' and 'Year'
					var rowGroupCols = request.rowGroupCols;
					// the keys we are looking at. will be empty if looking at top level (either
					// no groups, or looking at top level groups). eg ['United States','2002']
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

					var promise;

					// if not grouping, just return the full set
					if (rowGroupCols.length === 0) {
						console.log('NO GROUP');
						getDataFromFoundset(foundset);
					} else {
						// otherwise if grouping, a few steps...

						// first, if not the top level, take out everything that is not under the group
						// we are looking at.
						//var filteredData = this.filterOutOtherGroups(filteredData, groupKeys, rowGroupCols);

						// if grouping, return the group
						var showingGroups = rowGroupCols.length > groupKeys.length;

						groupManager.getFoundsetData(rowGroupCols, groupKeys).then(function(foundsetRef) {

							var foundsetRefManager = new FoundSetManager(foundsetRef);

							if (showingGroups) {
								// TODO i do i know where i start showing stuff ?

								// TODO
								// expand all groups, get until last group

								// this is called when scrolling
								console.log('showingGroup');
								// result = this.buildGroupsFromData(filteredData, rowGroupCols, groupKeys, valueCols);
								// TODO get foundset grouped by column
								getDataFromFoundset(foundsetRefManager);
							} else {
								//								// this is called when expanding a node
								//								console.log('not showingGroup');
								//								// show all remaining leaf level rows
								//								// result = filteredData;
								//
								//								result = [];
								//								if ($scope.handlers.onNodeExpanded) {
								//
								//									// FIXME wait for node expanded
								//									promise = $scope.handlers.onNodeExpanded(1, groupKeys[groupKeys.length - 1]);
								//									promise.then(function(data) {
								//										for (var i = 0; data && i < data.length; i++) {
								//											var r = new Object();
								//											for (var idx = 0; idx < columnDefs.length; idx++) {
								//												var column = columnDefs[idx];
								//												r[column.field] = data[i][idx];
								//												result.push[r];
								//											}
								//
								//											console.log(result);
								//											// callback(result, true);
								//											return result;
								//										}
								//									});
								//								}
								getDataFromFoundset(foundsetRefManager);

								// TODO wait for result
								return;
							}

						});
					}

					// check if sort has changed

					function getDataFromFoundset(foundsetRef) {
						// load record
						if (request.startRow > 0) {
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