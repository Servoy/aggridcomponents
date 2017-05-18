angular.module('uigridfilterUigridDataset', ['servoy', 'ui.grid', 'ui.grid.moveColumns', 'ui.grid.pinning', 'ui.grid.resizeColumns', 'ui.grid.grouping', 'ui.grid.selection', 'ngAnimate', 'ngTouch'])
.directive('uigridfilterUigridDataset', ['$log', '$sabloConstants', '$window', 'uiGridConstants', 'uiGridGroupingConstants', function($log, $sabloConstants, $window, uiGridConstants, uiGridGroupingConstants) {
		return {
			restrict: 'E',
			scope: {
				model: '=svyModel',
				api: "=svyApi",
				handlers: "=svyHandlers",
				svyServoyapi: '='
			},
			link: function($scope, $element, $attrs) {
				
				var grouping = {};
				var cellTemplate = '<div class="ui-grid-cell-contents svy-padding-xs" svy-click="grid.appScope.onCellClick(row, col, grid.getCellValue(row, col), $event)" ng-class="grid.appScope.getStyleClass(row, col)" style="white-space:nowrap" tabIndex="-1">{{grid.appScope.formatCell(row, col, grid.getCellValue(row, col))}}</div>';
				
				var createJSEvent;
				/** @type {Array} Column Definition */
				var columnDefs = getColumnDefs();
				
				/****************************
				 * Cell Helpers
				 *****************************/
				$scope.getStyleClass = function (row, col) {
					var columnModel = getColumnModel(col);
					if (columnModel) {
						return columnModel.styleClass;
					} else {
						return null;
					}
				}
				
				$scope.formatCell = function(row, col, value) {
					return value;
				}
				
				$scope.onCellClick = function(row, col, value, event) {
					var columnModel = getColumnModel(col);
					if (columnModel && columnModel.onActionMethodID && columnModel.onActionMethodID.script) {
						
						var index = getRowIndex(row);
						var args = [index, value];
						
						$window.executeInlineScript(columnModel.onActionMethodID.formname, columnModel.onActionMethodID.script, args);
					}
				}
				
				function getColumnModel(col) {
					if ($scope.model.columns) {
						return $scope.model.columns[col.field];
					}
				}
				
				function getColumnName(index) {
					if ($scope.gridOptions.columnDefs && $scope.gridOptions.columnDefs[index]) {
						return $scope.gridOptions.columnDefs[index].name;
					}
				}

				$scope.gridOptions = {

					//cellTemplate : cellTemplate,

					columnDefs: columnDefs,

					// general
					enablePaging: false,
					flatEntityAccess: true,
					fastWatch: true,
					enableGridMenu: false,
					showColumnMenu: false,

					// columns
					enablePinning: false,
					enableSorting: false,
					enableColumnReordering: true,
					enableColumnResizing: true,
					maintainColumnRatios: true,

					// filters
					enableFiltering: $scope.model.allowFiltering ? true : false,
					filterOptions: { filterText: 'Cercalo', useExternalFilter: true },

					// grouping
					groups: [],
					groupsCollapsedByDefault: true,
					groupingNullLabel: "Null",
					groupingShowCounts: true,
					enableGroupHeaderSelection: false,
					treeRowHeaderAlwaysVisible: false,
					showGroupPanel: false,

					showGridFooter: false,
					showColumnFooter: false,

					// selection
					multiSelect: false,
					enableSelectAll: false,
					modifierKeysToMultiSelect: true,
					noUnselect: true,
					enableRowSelection: true,
					enableRowHeaderSelection: false,
					enableHighlighting: false,

					//				exporterMenuPdf: $scope.pdfEnabled,
					//				exporterPdfDefaultStyle: { fontSize: 9 },
					//				exporterPdfTableStyle: { margin: [30, 30, 30, 30] },
					//				exporterPdfTableHeaderStyle: { fontSize: 10, bold: true, italics: true, color: 'red' },
					//				exporterPdfHeader: { text: "My Header", style: 'headerStyle' },
					//				exporterPdfFooter: function(currentPage, pageCount) {
					//					return { text: currentPage.toString() + ' of ' + pageCount.toString(), style: 'footerStyle' };
					//				},
					//				exporterPdfCustomFormatter: function(docDefinition) {
					//					docDefinition.styles.headerStyle = { fontSize: 22, bold: true };
					//					docDefinition.styles.footerStyle = { fontSize: 10, bold: true };
					//					return docDefinition;
					//				},
					//				exporterPdfOrientation: 'landscape',
					//				exporterPdfPageSize: 'LETTER',
					//				exporterPdfMaxGridWidth: 700,
					//				exporterMenuCsv: $scope.csvEnabled,
					//				exporterCsvFilename: 'myFile.csv',
					//				exporterCsvLinkElement: angular.element(document.querySelectorAll(".custom-csv-link-location")),

					excludeProperties: [],
					//					enableColumnMoving : $scope.model.reorderable,
					enableVerticalScrollbar: uiGridConstants.scrollbars.ALWAYS,
					enableHorizontalScrollbar: uiGridConstants.scrollbars.ALWAYS,
					followSourceArray: true,
					useExternalSorting: false,
					//					primaryKey: $foundsetTypeConstants.ROW_ID_COL_KEY, // not currently documented in ngGrid API but is used internally and useful - see ngGrid source code
					//					rowTemplate: 'svy-ui-grid/ui-grid-row',
					//					rowHeight: $scope.rowHeight ? $scope.rowHeight : 20,
					//					showHeader:$scope.model.headerHeight != 0 && !$scope.model.multiLine,
					//					headerRowHeight: $scope.model.multiLine ? 0 : $scope.model.headerHeight,
					//					rowIdentity: function(o) {
					//						return o._svyRowId;
					//					},
					//					rowEquality: function(row1,row2) {
					//						return row1._svyRowId == row2._svyRowId;
					//					},
					// 					infiniteScrollRowsFromEnd: $scope.pageSize
					
					
					onRegisterApi: function(gridApi) {
						$scope.gridApi = gridApi;
						$scope.gridApi.treeBase.expandAll = true;
						$scope.gridApi.selection.on.rowSelectionChanged($scope, updateSelection);						
						//gridApi.selection.on.rowSelectionChangedBatch($scope, updateSelection);
						//
						//					// listener for grouping
						//					
						//					$scope.grid1Api.treeBase.on.rowExpanded($scope, onRowExpanded);
						//					$scope.grid1Api.treeBase.on.rowCollapsed($scope, onRowCollapsed);
						
						$scope.gridApi.grouping.on.groupingChanged($scope, onGroupChanged);
						$scope.gridApi.treeBase.on.rowExpanded($scope, onRowExpanded);

						function updateSelection (row, event) {
																					
							if ($scope.handlers.onRowSelected) {
								
								var index = getRowIndex(row);
								$scope.handlers.onRowSelected(index, row.entity, event);

								
								var newNGGridSelectedItems =  gridApi.selection.getSelectedRows();

								var tmpSelectedRowIdxs = [];
								if (tmpSelectedRowIdxs.length === 0 && newNGGridSelectedItems.length > 0) return;
								// TODO implement multiselection
								for (var idx = 0; idx < newNGGridSelectedItems.length; idx++) {
									//var absRowIdx = rowIdToAbsoluteRowIndex(newNGGridSelectedItems[idx][$foundsetTypeConstants.ROW_ID_COL_KEY]);
									tmpSelectedRowIdxs.push(idx);
								}
								
							}
						}
						
						function onRowExpanded(row) {
							console.log("on row expanded")
							console.log(row)
							var aggregation = row.treeNode.aggregations[row.treeLevel];
							var value = aggregation.groupVal;
							var columnIndex = Number(aggregation.col.field);
							
							if ($scope.handlers.onNodeExpanded) {
								$scope.handlers.onNodeExpanded(columnIndex, value);
							}
						}
						
						function onGroupChanged(col) {
							console.log(col);
							console.log('group changed');
							
							var columnIndex = Number(col.field);

							var isCleared = (col.grouping.groupPriority || col.grouping.groupPriority === 0 ? false : true);
							
							// TODO is it needed ?
							if (isCleared) {
								delete grouping[col.field];
							} else {
								grouping[col.field] = col.grouping;
							}

							if ($scope.handlers.onGroupChanged) {
								console.log('isCleared ' + isCleared + ' - ' + col.grouping.groupPriority)
								$scope.handlers.onGroupChanged(columnIndex, col.grouping.groupPriority, !isCleared);
							}
							console.log(col.grouping);
						}
					}
				};
				
				/**
				 * Create a JSEvent
				 * 
				 * @return {JSEvent}
				 * */
				createJSEvent = function() {
					var element = $element;
					var offset = element.offset();
					var x = offset.left;
					var y = offset.top;

					var event = document.createEvent("MouseEvents");
					event.initMouseEvent("click", false, true, window, 1, x, y, x, y, false, false, false, false, 0, null);
					return event;
				}
				
				function getRowIndex(row) {
					return $scope.gridOptions.data.indexOf(row.entity);
				}
				


				$scope.highlightFilteredHeader = function(row, rowRenderIndex, col, colRenderIndex) {
					if (col.filters[0].term) {
						return 'header-filtered';
					} else {
						return '';
					}
				};

				$scope.toggleFiltering = function() {
					$scope.gridOptions.enableFiltering = !$scope.gridOptions.enableFiltering;
					$scope.grid1Api.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
				};

				$scope.toggleGroupExpanding = function() {
					$scope.grid1Api.treeBase.expandAll ? $scope.grid1Api.treeBase.expandAllRows() : $scope.grid1Api.treeBase.collapseAllRows();
					$scope.grid1Api.treeBase.expandAll = !$scope.grid1Api.treeBase.expandAll;

				};

				$scope.clearGrouping = function() {

					$scope.grid1Api.grouping.clearGrouping();
				}

				function refreshGridData() {
					$scope.gridOptions.data = [];
					if (!$scope.gridOptions.columnDefs.length) {
						$scope.gridOptions.columnDefs = getColumnDefs();
					}
					console.log($scope.gridOptions.columnDefs)
					$scope.gridOptions.data = getDatasetData();
				}

				function getColumnDefs() {
					var result = [];
					if ($scope.model.columns) {	// get columns from model
						var column;
						for (var i = 0; i < $scope.model.columns.length; i++) {
							column = $scope.model.columns[i];
							var columnDef = getDefaultColumnDef(column.headerTitle, i.toString());
							columnDef.visible = column.visible;
							result.push(columnDef);
						}
						
					} else {	// get columns from dataset
						result = getDatasetColumnDefs();
					}
					return result;
				}
				
				function getDatasetColumnDefs() {
					
					//					while ($scope.columnDefs.length > 0) {
					//						$scope.columnDefs.pop();
					//					}
					//
					//columnDefs: [{ name: 'Col1', field: 'orderid1', width: 150, type: 'number' }, { name: 'Col2', field: 'productid1', width: 150 }, { name: 'Col3', field: 'unitprice1', width: 150 }, { name: 'Col4', field: 'quantity1', width: 150 }, { name: 'Col5', field: 'discount1', width: 150 }, { name: 'Col6', field: 'orderid2', width: 150 }, { name: 'Col7', field: 'productid2', width: 150 }, { name: 'Col8', field: 'unitprice2', width: 150 }, { name: 'Col9', field: 'quantity2', width: 150 }, { name: 'Col10', field: 'discount2', width: 150 }, { name: 'Col11', field: 'orderid3', width: 150 }, { name: 'Col12', field: 'productid3', width: 150 }, { name: 'Col13', field: 'unitprice3', width: 150 }, { name: 'Col14', field: 'quantity3', width: 150 }, { name: 'Col15', field: 'discount3', width: 150 }, { name: 'Col16', field: 'orderid4', width: 150 }, { name: 'Col17', field: 'productid4', width: 150 }, { name: 'Col18', field: 'unitprice4', width: 150 }, { name: 'Col19', field: 'quantity4', width: 150 }, { name: 'Col20', field: 'discount4', width: 150 }],
					var columns = [];
					if ($scope.model.dataset && $scope.model.dataset.length) {
						var column = $scope.model.dataset[0];
						columns = [];
						var key
						for (key in column) {
							var columnDef = getDefaultColumnDef(column[key],key);
							columns.push(columnDef);
						}
					}

					$log.debug(columns);
					return columns;					
				}
				
				function getDefaultColumnDef(name, field) {
					return {
						name : name,
						field: field,
						groupingShowGroupingMenu: true,
						groupingShowAggregationMenu: false,
						cellTemplate: cellTemplate
					}
				}

				function getDatasetData() {
					var data = [];
					/** @type {Array} */
					var dataset = $scope.model.dataset;
					if (dataset && dataset.length > 1) {
						data = dataset.slice(1);
						//						for (var i = 1; i < dataset.length; i++) {
						//							data.push(getDatasetRow(i));
						//						}
					}
					$log.debug(data);
					return data;
				}

				function getDatasetRow(index) {
					var datasetRow = $scope.model.dataset[index];
					var row = new Object();
					for (var key in datasetRow) {
						row[key] = datasetRow[key];
					}
					return row;
				}

				$scope.$watch("model.dataset", function(newValue, oldValue) {
						refreshGridData();
					});
				
				/** 
				 * @param {Number} index 0-based;
				 * @return {Boolean}
				 * */
				$scope.api.setSelectedIndex = function(index)  {
					if ($scope.gridOptions.data && $scope.gridOptions.data[index]) {
						var row = $scope.gridApi.grid.getRow($scope.gridOptions.data[index]);
						$scope.gridApi.selection.selectRow(row.entity);
						$scope.gridApi.core.scrollToIfNecessary(row, null);
						return true;
					} else {
						return false
					}
				}
				
				/**
				 * @return {String}
				 *  */
				$scope.api.getGrouping = function () { 
					var groupConfig = $scope.gridApi.grouping.getGrouping();
					console.log(groupConfig);
					return groupConfig;
				}
				
				/**
				 *  */
				$scope.api.clearGrouping = function () { 
					$scope.gridApi.grouping.clearGrouping();
				}
				
				/**
				 * @param {Number} index
				 *  */
				$scope.api.groupColumn = function (index) { 
					$scope.gridApi.grouping.groupColumn(getColumnName(index));
				}
				
				/**
				 * @param {Number} index
				 *  */
				$scope.api.ungroupColumn = function (index) { 
					$scope.gridApi.grouping.ungroupColumn(getColumnName(index));
				}

			},
			templateUrl: 'uigridfilter/uigridDataset/uigridDataset.html'
		};
	}]);