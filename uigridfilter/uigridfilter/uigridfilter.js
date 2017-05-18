angular.module('uigridfilterUigridfilter', ['servoy', 'foundset_manager', 'ui.grid', 'ui.grid.moveColumns', 'ui.grid.pinning', 'ui.grid.resizeColumns', 'ui.grid.grouping', 'ui.grid.selection', 'ngAnimate', 'ngTouch']).directive('uigridfilterUigridfilter', ['foundset_manager', function(foundset_manager) {
		return {
			restrict: 'E',
			scope: {
				model: '=svyModel',
				api: "=svyApi",
				handlers: "=svyHandlers",
				svyServoyapi: '='
			},
			controller: function($scope, $element, $attrs, $log, $sabloConstants, uiGridConstants, uiGridGroupingConstants) {
				/*
				 * Sync selected record.
				 *
				 * TODO's
				 * 1. Get distinct first group
				 * 	1.1 Get distinct second group
				 * 2. Paging first group (Load More)
				 * 	2.1 Paging second group (Load More)
				 *
				 * Change position of ghost row when adding new rows
				 *
				 *
				 * 3 Grouping
				 * 	3.1 Second Group
				 * 	3.2 Group on Relation
				 * 4 Sorting
				 * 5 Filtering
				 * 6 Styling
				 * 		Conditionally color columns
				 * 		Conditionally color rows
				 * 		Conditionally color cells
				 *
				 * 7 Formatting
				 * 8 Valuelist (yes/no) ?
				 *
				 * 9 Header
				 * 	tagstring
				 * 	icon
				 * 	resizing
				 * 	re-ordering
				 *
				 * Handlers
				 * onClick
				 * 	Column Header
				 * 	Cell
				 * onGroupColumn
				 * onFilterCOlumn
				 *
				 * Api
				 * expand selected record
				 *
				 * -----------------------------
				 * Refresh updated values in grid
				 * Optimize client-side memory
				 *
				 *
				 * */

				console.log(foundset_manager);

				var rootLevel;

				var currentColumnLength;
				Object.defineProperty($scope.model, $sabloConstants.modelChangeNotifier, {
						configurable: true,
						value: function(property, value) {
							switch (property) {
							case "columns":
								break;
								var differentColumns = currentColumnLength != $scope.model.columns.length;
								var valueChanged = differentColumns;
								currentColumnLength = $scope.model.columns.length
								if (!valueChanged) {
									console.log("not value changed " + value)
									console.log(value);
								}

								if (valueChanged) {
									console.log("value changed " + value)
									if ($scope.model.columns && $scope.model.columns.length > 0) {
										console.log(value);
									}
								}
								// if the columns didn't change completely then test for the style class
								//if (!differentColumns) updateColumnStyleClass();
								break;
							}
						}
					});

				var destroyListenerUnreg = $scope.$on("$destroy", function() {
						$scope.model.foundset.removeChangeListener(rootLevel.foundsetListener);
						destroyListenerUnreg();
						delete $scope.model[$sabloConstants.modelChangeNotifier];
					});
				// data can already be here, if so call the modelChange function so
				// that it is initialized correctly.
				var modelChangFunction = $scope.model[$sabloConstants.modelChangeNotifier];
				for (var key in $scope.model) {
					modelChangFunction(key, $scope.model[key]);
				}

				function GroupLevel(groupName, level) {

					this.groupName = groupName;
					this.level = level;
				}

				function RootLevel() {
					var thisInstance = this;

					this.foundset = $scope.model.myFoundset;
					this.ghostRow = null;

					/** return the viewPort data in a new object */
					this.getViewPortData = function() {
						//if($scope.model.myFoundset.viewPort.size == $scope.model.numRows){
						var data = [];
						for (var j = 0; j < thisInstance.foundset.viewPort.rows.length; j++) {
							data.push(thisInstance.getViewPortRow(j));
						}
						
						// update the ghost row
						var ghostRow = thisInstance.getGhostRow();
						data.push(ghostRow);
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
								r[header.dp] = header.dataprovider[index];
							}
							return r;

						} catch (e) {
							$log.error(e);
							r = null;
						}
						return r;
					}
					
					this.getGhostRow = function() {
						if (thisInstance.hasMoreRecordsToLoad()) {
							var ghostRow;
							if (thisInstance.ghostRow) {	// update ghostRow fields
								ghostRow = thisInstance.ghostRow;
							} else {
								ghostRow = new Object();
								
								// create the ghost row
								ghostRow._svyRowId = "ghost-root";
								for (var i = 0; i < $scope.model.columns.length; i++) {
									var column = $scope.model.columns[i];
									ghostRow[column.dp] = ""; //column.dataprovider[column.dataprovider.length - 1];
								}
								ghostRow.ghost = true;
								
								// update object
								ghosts[ghostRow._svyRowId] = thisInstance.foundset;
								thisInstance.ghostRow = ghostRow;
							}
							return ghostRow;
						} else {
							
							// update object
							delete ghosts[ghostRow._svyRowId];
							return null;
						}
					}
					
					this.hasMoreRecordsToLoad = function () {
						return thisInstance.foundset.hasMoreRows || thisInstance.foundset.viewPort.size < thisInstance.foundset.serverSize;
					}
					
					this.updateGhostRow = function () {
						if (thisInstance.hasMoreRecordsToLoad()) {
							if (!thisInstance.ghostRow) {
								// add the ghost row
								var row = thisInstance.getGhostRow();
								addUiGridRow(row);
							} else {
								// update the ghost row position
								var row = deleteUiGridRow(thisInstance.ghostRow._svyRowId);
								addUiGridRow(row);
							}
						} else {
							if (thisInstance.ghostRow) {
								// delete the ghostRow
								deleteUiGridRow(thisInstance.ghostRow._svyRowId);
								delete ghosts[thisInstance.ghostRow._svyRowId];
								thisInstance.ghostRow = null;
							} else {
								// do nothing
							}
						}
						// find the ghostRow and move it at the end
					}

					this.foundsetListener = function(rowUpdates, oldStartIndex, oldSize) {
						// update all rows
						// TODO fixme, is adding rows
						updateRows(rowUpdates, oldStartIndex, oldSize);
						thisInstance.updateGhostRow();
					}

				}
				
				rootLevel = new RootLevel();
				
				function deleteUiGridRow(svyRowId) {
					var data = $scope.gridOptions.data;
					for (var i = 0; i < data.length; i++) {
						if (data[i]._svyRowId === svyRowId) {
							return data.splice(i, 1)[0];
						}
					}
				}
				
				function addUiGridRow(row) {
					var data = $scope.gridOptions.data;
					data.push(row);
				}
				
				function updateUiGridRow(svyRowId, row) {
					// TODO 
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

				/** return the index of the row in grid with the given id */
				function getUiGridRowIndex(svyRowId) {
					var data = $scope.gridOptions.data;
					for (var i = 0; i < data.length; i++) {
						if (data[i]._svyRowId === svyRowId) {
							return i;
						}
					}
					return null;
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
				 * Merge the rows in the given foundset into the grid data.
				 * @param {Array} data
				 * @param {Object} foundsetObj
				 * @param {String} dataproviderName
				 * */
				function mergeData(data, foundsetObj, dataproviderName) {
					var parsedId = new Object();

					// data already shown
					var newData = data.map(function(row) {
						parsedId[getSvyRowId(row._svyRowId)] = 1;
					});

					// merge new data
					foundsetObj.viewPort.rows.filter(function(row) {
						if (!parsedId[getSvyRowId(row._svyRowId)]) {
							parsedId[getSvyRowId(row._svyRowId)] = 1;
							newData.push(row);
							data.push(row);
							return true;
						} else {
							console.log("ID is already in")
							return false;
						}
					});

					if (foundsetObj.hasMoreRows || foundsetObj.viewPort.size < foundsetObj.serverSize) {
						var ghostRow = createGhostRow(foundsetObj, dataproviderName);
						newData.push(ghostRow)
						data.push(ghostRow);
					}

					/** @param {String} svyRowId */
					function getSvyRowId(svyRowId) {
						var idx = svyRowId.lastIndexOf(";");
						return svyRowId.substring(0, idx);
					}

					return newData;
				}

				function createGhostRow(foundsetObj, dataproviderName) {
					var row = foundsetObj.viewPort.rows[foundsetObj.viewPort.size - 1];
					var ghostRow = new Object();
					for (var prop in row) {
						ghostRow[prop] = row[prop];
					}
					ghostRow.ghost = "Load more...";
					if (dataproviderName) {
						ghostRow._svyRowId = "ghost-" + dataproviderName;
					} else {
						ghostRow._svyRowId = "ghost-root"
					}
					ghosts[ghostRow._svyRowId] = foundsetObj;

					return ghostRow;
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
					// TODO update ghostRow
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
						row = rootLevel.getViewPortRow(index);
					} else {
						row = getClientViewPortRow(foundsetObj, index); // TODO get it from viewportObj
					}

					if (row) {
						var uiRow = getUiGridRow(row._svyRowId);

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

				function updateNumRows() {
					$scope.numRowsFoundset = $scope.gridOptions.data.length;
				}

				$scope.$watch('model.myFoundset.viewPort.size', function(newValue, oldValue) {
						console.log('viewport size changed from ' + oldValue + ' to ' + newValue)
						if (false && hasGrouping()) {
							$scope.numRowsFoundset = -1;
						} else {
							$scope.numRowsFoundset = Math.min($scope.model.myFoundset.serverSize, 70);
						}
						$scope.viewPortSize = $scope.model.myFoundset.viewPort.size;

						if ($scope.numRowsFoundset > -1) {

							if (newValue > oldValue && $scope.viewPortSize < $scope.numRowsFoundset) {
								//if ($scope.model.myFoundset.viewPort.size != $scope.model.numRows) {
								// 	$scope.model.myFoundset.loadExtraRecordsAsync(200);
								//}
							}
						} else {
							if ($scope.model.myFoundset.hasMoreRows) {
								// TODO check how to go to last page
								//	$scope.model.myFoundset.loadExtraRecordsAsync(400);
							}
						}
						updateNumRows();
					});

				//live update of data if the values in rows change
				//				$scope.$watchCollection('model.myFoundset.viewPort.rows', function(newValue, oldValue) {
				//						//if($scope.model.myFoundset.viewPort.size == $scope.model.numRows){
				//						var data = getViewPortData();
				//
				//						$scope.gridOptions.data = data;//$scope.model.myFoundset.viewPort.rows;
				//						console.log($scope.model.myFoundset)
				//						console.log("row data changed");
				//						console.log($scope.model.columns)
				//						//}
				//					});

				$scope.$watch('model.myFoundset.viewPort.rows', function(newValue, oldValue) {
						// full viewport update (it changed by reference); start over with renderedSize
						console.log("row data changed");

						refreshGridData();
						$scope.model.myFoundset.addChangeListener(rootLevel.foundsetListener);
						
						// generateTemplate();
					});
				
				$scope.$watch('model.myFoundset.viewPort', function(newValue, oldValue) { 
					console.log("viewport changed")
				});
				
				function refreshGridData() {
					var data = rootLevel.getViewPortData();

					console.log($scope.model.myFoundset);
					$scope.gridOptions.data = data;//$scope.model.myFoundset.viewPort.rows;
					updateNumRows();
				}

				function hasGrouping() {
					return false;
					var count = 0;
					for (var field in $scope.grouping) {
						count++;
					}
					return count > 0;
				}

				//			},
				//
				//			controller: function($scope, $element, $attrs, uiGridConstants, uiGridGroupingConstants) {
				//selected rows that are sent back to the form
				$scope.selectedRows = new Object();
				//object containing the PKs of the foundset, used when a row is selected
				$scope.PKs = [];

				$scope.grouping = new Object();

				//initial state of csv and pdf exporting
				$scope.csvEnabled = false;
				$scope.pdfEnabled = false;

				var foundsetChangeWatches = new Object();
				var ghosts = new Object();

				//highlight header when filtering is active, change style in main.css class header-filtered
				$scope.highlightFilteredHeader = function(row, rowRenderIndex, col, colRenderIndex) {
					if (col.filters[0].term) {
						return 'header-filtered';
					} else {
						return '';
					}
				};

				//grid options initial setup
				$scope.gridOptions = {
				    rowTemplate: rowTemplate(),
					enablePinning: false,
					enableSorting: false,
					enableFiltering: false,
					enableColumnResizing: true,
					enableGridMenu: true,
					groupingShowCounts: false,
					enableGroupHeaderSelection: true,
					groupingNullLabel: "Null",
					flatEntityAccess: true,
					fastWatch: true,
					treeRowHeaderAlwaysVisible: false,
					showGridFooter: true,
					showColumnFooter: true,
					enableSelectAll: false,
					multiSelect : false,
					modifierKeysToMultiSelect: false,
					noUnselect: true,
					enableRowSelection: true, 
					enableRowHeaderSelection: false,

//					exporterMenuPdf: $scope.pdfEnabled,
//					exporterPdfDefaultStyle: { fontSize: 9 },
//					exporterPdfTableStyle: { margin: [30, 30, 30, 30] },
//					exporterPdfTableHeaderStyle: { fontSize: 10, bold: true, italics: true, color: 'red' },
//					exporterPdfHeader: { text: "My Header", style: 'headerStyle' },
//					exporterPdfFooter: function(currentPage, pageCount) {
//						return { text: currentPage.toString() + ' of ' + pageCount.toString(), style: 'footerStyle' };
//					},
//					exporterPdfCustomFormatter: function(docDefinition) {
//						docDefinition.styles.headerStyle = { fontSize: 22, bold: true };
//						docDefinition.styles.footerStyle = { fontSize: 10, bold: true };
//						return docDefinition;
//					},
//					exporterPdfOrientation: 'landscape',
//					exporterPdfPageSize: 'LETTER',
//					exporterPdfMaxGridWidth: 700,
//					exporterMenuCsv: $scope.csvEnabled,
//					exporterCsvFilename: 'myFile.csv',
//					exporterCsvLinkElement: angular.element(document.querySelectorAll(".custom-csv-link-location")),
					onRegisterApi: function(gridApi) {
						$scope.grid1Api = gridApi;
						$scope.grid1Api.treeBase.expandAll = true;
						$scope.grid1Api.selection.on.rowSelectionChanged($scope, $scope.rowSelectionChanged);

						// listener for grouping
						$scope.grid1Api.grouping.on.groupingChanged($scope, onGroupChanged);
						$scope.grid1Api.treeBase.on.rowExpanded($scope, onRowExpanded);
						$scope.grid1Api.treeBase.on.rowCollapsed($scope, onRowCollapsed);

					}
				};
				
				function rowTemplate() {
					return '<div>'
						+ '  <div ng-if="row.entity.ghost" class="ghost" ng-click="grid.appScope.rowSelectionChanged(row)"><span class="glyphicon glyphicon-repeat"></span> Load more...</div>'
						+ '  <div ng-if="!row.entity.ghost" ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.colDef.name" class="ui-grid-cell" ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader }"  ui-grid-cell></div>' 
						+ '</div>';
				}
				
				$scope.rowSelectionChanged = function(row) {
					var key = '';
					if (row.entity.ghost) {
						// TODO load next items

						
						var foundsetObj = ghosts[row.entity._svyRowId];
						if (row.entity._svyRowId !== "ghost-root") deleteUiGridRow(row.entity._svyRowId);
						
						foundsetObj.loadExtraRecordsAsync(70).then(function(result) {
							console.log("Something happened");
							console.log(result);
						}).catch(function(e) {
							console.log(e);
						});
					} else {

						for (var j = 0; j < $scope.PKs.length; j++) {
							key += row.entity[$scope.PKs[j]];
						}
						if ($scope.selectedRows.hasOwnProperty(key)) {
							delete $scope.selectedRows[key];
							if ($scope.handlers.onActionMethodID) {
								$scope.handlers.onActionMethodID($scope.selectedRows);
							}	
						} else {
							var rowData = { };
							for (var k = 0; k < $scope.PKs.length; k++) {
								rowData[$scope.PKs[k]] = row.entity[$scope.PKs[k]];
							}
							$scope.selectedRows[key] = rowData;
							$scope.handlers.onActionMethodID($scope.selectedRows);
						}
					}
				}


				function onGroupChanged(col) {
					console.log(col);
					console.log('group changed');

					var isCleared = (col.grouping || col.grouping === 0 ? false : true);
					if (isCleared) {
						delete $scope.grouping[col.field];
					} else {
						$scope.grouping[col.field] = col.grouping;
					}

					if ($scope.handlers.onGroupChanged) {
						console.log(isCleared)
						$scope.handlers.onGroupChanged(col.field, !isCleared);
					}
					console.log(col.grouping);
				}

				function onRowExpanded(row) {
					console.log("on row expanded")
					console.log(row)

					var aggregation = row.treeNode.aggregations[row.treeLevel];
					var value = aggregation.groupVal;
					var dataproviderName = aggregation.col.field;

					if ($scope.handlers.onNodeExpanded) {
						$scope.handlers.onNodeExpanded(dataproviderName, value);
					}

					// TODO call foundset manager

					var column = getColumn(dataproviderName);
					var sort;
					var level;
					var foundsetNReation = column.relationname;

					if (foundsetNReation) {

						foundset_manager.getRelatedFoundSetHash($scope.model.root.foundsethash,
							getRowId(dataproviderName, value),
							foundsetNReation).then(addRelatedFoundSetCallback(foundsetNReation, value, sort, level));
					}

				}

				function onRowCollapsed(row) {
					console.log("on row collapsed")
					console.log(row)

					var aggregation = row.treeNode.aggregations[row.treeLevel];
					var value = aggregation.groupVal;
					var dataproviderName = aggregation.col.field;

					if ($scope.handlers.onNodeExpanded) {
						$scope.handlers.onNodeExpanded(dataproviderName, value);
					}

					// TODO call foundset manager

					var column = getColumn(dataproviderName);
					var foundsetNReation = column.relationname;

					//var group = $scope.model.groupings[0];
					var sort;
					var level;

					if (foundsetNReation) {
						foundset_manager.getRelatedFoundSetHash($scope.model.root.foundsethash,
							getRowId(dataproviderName, value),
							foundsetNReation).then(removeRelatedFoundSetCallback(foundsetNReation, dataproviderName, sort, level));
					}
				}

				function addRelatedFoundSetCallback(foundsetNRelation, dataproviderName, sort, level) {

					return function(rfoundsetinfo) {
						if (rfoundsetinfo) {
							var dataproviders = getDataproviders(rfoundsetinfo.foundsetdatasource, rfoundsetinfo.foundsetpk);
							foundset_manager.getFoundSet(rfoundsetinfo.foundsethash,
								dataproviders, sort, foundsetNRelation).then(function(rfoundset) {
								console.log(rfoundset);
								if (foundsetChangeWatches[rfoundsetinfo.foundsethash] === undefined) {
									foundsetChangeWatches[rfoundsetinfo.foundsethash] = rfoundset.addChangeListener(clientFoundsetListener);
								}

								mergeData($scope.gridOptions.data, rfoundset, dataproviderName);
								updateNumRows();

								// client listener
								function clientFoundsetListener(rowUpdates) {
									for (var i = 0; i < rowUpdates.length; i++) {
										for (var j = rowUpdates[i].startIndex; j <= rowUpdates[i].endIndex; j++) {
											updateRow(j, rfoundset);
											// check for ghost row
										}
									}
									
									if (rfoundset.hasMoreRows || rfoundset.viewPort.size < rfoundset.serverSize) {
										var ghostRow = createGhostRow(rfoundset, dataproviderName);
										addUiGridRow(ghostRow);
									}
								}

							});
						} else {
							$scope.pendingChildrenRequests = $scope.pendingChildrenRequests - 1;
						}
					}

				}

				function removeRelatedFoundSetCallback(foundsetNRelation, dataproviderName, sort, level) {

					return function(rfoundsetinfo) {
						if (rfoundsetinfo) {
							// TODO delete foundset listener
							delete foundsetChangeWatches[rfoundsetinfo.foundsethash];
							// foundset_manager.removeFoundSetFromCache(rfoundsetinfo.foundsethash);
							// TODO remove it from the table ?
						} else {
							$scope.pendingChildrenRequests = $scope.pendingChildrenRequests - 1;
						}
						// TODO delete ghost row
					}

				}

				/**Returns the id of the given
				 * @param {String} field
				 * @param {String} value
				 * */
				function getRowId(field, value) {

					var data = $scope.gridOptions.data;
					for (var i = 0; i < data.length; i++) {
						if (data[i][field] === value) {
							return data[i]._svyRowId;
						}
					}
					return null

					//					var header = getColumn(field);
					//					if (header) {
					//						var dps = header.dataprovider;
					//						var index = -1;
					//						for (var i = 0; i < dps.length; i++) {
					//							if (dps[i] == value) {
					//								index = i;
					//								break;
					//							}
					//						}
					//						if (index > -1) {
					//							return $scope.model.myFoundset.viewPort.rows[index]._svyRowId;
					//						} else {
					//							return null;
					//						}
					//					}
				}

				/** Return the column with the given dataproviderName
				 * @param {String} field */
				function getColumn(field) {
					for (var i = 0; i < $scope.model.columns.length; i++) {
						if ($scope.model.columns[i].dp === field) {
							return $scope.model.columns[i];
						}
					}
					return null;
				}

				/** Return the dataprovider object used by foundset_manager */
				function getDataproviders(datasource, pk) {
					var item = { }
					for (var i = 0; i < $scope.model.columns.length; i++) {
						var dpName = $scope.model.columns[i].dp
						item[dpName] = dpName
					}
					return item;
				}

				//				function mergeData(foundsetObj) {
				//					if ($scope.gridOptions.data) {
				//						$scope.gridOptions.data = $scope.gridOptions.data.concat(foundsetObj.viewPort.rows);
				//					}
				//				}

				function refresh() { }

				//show/hide filtering
				$scope.toggleFiltering = function() {
					$scope.gridOptions.enableFiltering = !$scope.gridOptions.enableFiltering;
					$scope.grid1Api.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
				};

				//expand or collapse all the groups
				$scope.toggleGroupExpanding = function() {
					$scope.grid1Api.treeBase.expandAll ? $scope.grid1Api.treeBase.expandAllRows() : $scope.grid1Api.treeBase.collapseAllRows();
					$scope.grid1Api.treeBase.expandAll = !$scope.grid1Api.treeBase.expandAll;

				};

				//clear all the grouping on the grid
				$scope.clearGrouping = function() {
					$scope.grid1Api.grouping.clearGrouping();
				}

				//whenever the pdf checkbox is clicked, enable or disable the csv export menu options
				$scope.$watch('pdfEnabled', function() {
						//if pdf exporting is enabled, enable the pdf export options
						if ($scope.pdfEnabled) {
							$scope.gridOptions.exporterMenuPdf = true;
						}
						//otherwise remove the pdf options from the grid menu
						else {
							$scope.gridOptions.exporterMenuPdf = false;
						}
					});

				//whenever the csv checkbox is clicked, enable or disable the csv export menu options
				$scope.$watch('csvEnabled', function() {
						//if csv exporting is enabled, enable the csv export options
						if ($scope.csvEnabled) {
							$scope.gridOptions.exporterMenuCsv = true;
						}
						//otherwise remove the csv options from the grid menu
						else {
							$scope.gridOptions.exporterMenuCsv = false;
						}
					});

				//help variable to just display how the rows are loaded in the foundset on client side
				$scope.viewPortSize = $scope.model.myFoundset.viewPort.size;

				//wait till the foundset is available on client side
				$scope.$watch('model.myFoundset', function() {
						// $scope.model.myFoundset.setPreferredViewportSize($scope.model.numRows);
						// $scope.model.myFoundset.loadExtraRecordsAsync(200);

						//create the column definitions from the specified columns in designer
						var colDefs = [];
						var colDef = { };
						var header;
						var aggregationType;
						for (var i = 0; i < $scope.model.columns.length; i++) {
							header = $scope.model.columns[i];

							//determine the aggregate type for that column
							switch (header["footerAggregate"]) {
							case 0:
								aggregationType = uiGridConstants.aggregationTypes.count;
								break;
							case 1:
								aggregationType = uiGridConstants.aggregationTypes.sum;
								break;
							case 2:
								aggregationType = uiGridConstants.aggregationTypes.min;
								break;
							case 3:
								aggregationType = uiGridConstants.aggregationTypes.max;
								break;
							case 4:
								aggregationType = uiGridConstants.aggregationTypes.avg;
								break;
							default:
								break;
							}

							//see if the column is a primary key
							if (header["isPK"]) {
								$scope.PKs.push(header["dp"]);
							}

							//create a column definition based on the properties defined at design time
							colDef = {
								name: "" + header["headerTitle"] + "",
								field: "" + header["dp"] + "",
								groupingShowGroupingMenu: true,
								groupingShowAggregationMenu: false,
								aggregationType: aggregationType,
								headerCellClass: $scope.highlightFilteredHeader,
								visible: header["visible"]//,
//								cellClass: function(grid, row, col, rowRenderIndex, colRenderIndex) {
//									if (grid.getCellValue(row, col) == true) {
//										return 'ghost';
//									}
//									return '';
//								}
							};
							colDefs.push(colDef);
							console.log(header["visible"]);
						}
						colDefs.push({
							name: "ghost",
							field: "ghost",
							visible: false
//							cellClass: function(grid, row, col, rowRenderIndex, colRenderIndex) {
//								if (grid.getCellValue(row, col) == true) {
//									return 'ghost';
//								}
//								return '';
//							}
						})

						console.log($scope.PKs);
						console.log(colDefs)
						$scope.gridOptions.columnDefs = colDefs;
					});

			},
			templateUrl: 'uigridfilter/uigridfilter/uigridfilter.html'
		};
	}])