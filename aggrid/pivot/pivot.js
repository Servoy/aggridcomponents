angular.module('aggridPivot', ['servoy']).directive('aggridPivot', function($log) {
		return {
			restrict: 'E',
			scope: {
				model: '=svyModel'
			},
			link: function($scope, $element, $attrs) {

				var CHUNK_SIZE = 200;

				// init the foundset
				var foundset = new FoundSetManager($scope.model.myFoundset, true);
				var columnDefs = getColumnDefs();

				var modelData = [];

				var gridOptions = {
					// set rowData to null or undefined to show loading panel by default
					pivotMode: true,
					pivotPanelShow: 'always',
					showToolPanel: true,
					pivotTotals: true,
					enableColResize: true,
					columnDefs: columnDefs,
					floatingFilter: false,
					enableSorting: true,
					enableFilter: true,
					rowData: modelData,
					suppressMovableColumns: true,

					groupMultiAutoColumn: false,
					groupIncludeFooter: true,

					groupDefaultExpanded: true
				};

				var gridDiv = document.querySelector('#myGrid');
				new agGrid.Grid(gridDiv, gridOptions);

				//			columnPivotModeChanged	The pivot mode flag was changed
				//			columnRowGroupChanged	A row group column was added, removed or order changed.
				//			columnPivotChanged	A pivot column was added, removed or order changed.
				//			gridColumnsChanged	The list of grid columns has changed.
				//			displayedColumnsChanged	The list of displayed columns has changed, can result from columns open / close, column move, pivot, group, etc

				gridOptions.api.addEventListener('columnPivotModeChanged', function(columnPivotModeChanged) {
						$log.warn('columnPivotModeChanged');
						$log.warn(columnPivotModeChanged);
					})

				gridOptions.api.addEventListener('columnRowGroupChanged', function(ColumnChangeEvent) {
						$log.warn('columnRowGroupChanged');
						$log.warn(ColumnChangeEvent);
					})

				gridOptions.api.addEventListener('columnPivotChanged', function(columnPivotChanged) {
						$log.warn('columnPivotChanged');
						$log.warn(columnPivotChanged);
					})

				gridOptions.api.addEventListener('gridColumnsChanged', function(gridColumnsChanged) {
						$log.warn('gridColumnsChanged');
						$log.warn(gridColumnsChanged);
					})

				// GENERIC EVENT
				gridOptions.api.addEventListener('displayedColumnsChanged', function(ColumnChangeEvent) {
						$log.warn('displayedColumnsChanged');
						$log.warn(ColumnChangeEvent);

						console.log(gridOptions.columnApi);

						var rowGroupColumns = gridOptions.columnApi.getRowGroupColumns();
						var pivotColumns = gridOptions.columnApi.getPivotColumns();
						var valueColumns = gridOptions.columnApi.getValueColumns();

						$log.warn(rowGroupColumns);
						$log.warn(pivotColumns);
						$log.warn(valueColumns);

						//var secondaryCol = gridOptions.columnApi.getSecondaryPivotColumn(pivotColumns[0].colId, valueColumns[0].colId);

						///$log.warn(secondaryCol);

					})

				gridOptions.api.addEventListener('rowGroupOpened', function(rowGroupOpened) {
						$log.warn('rowGroupOpened');
						$log.warn(rowGroupOpened);

						//	$scope.addRows();
						// TODO push more rows
					})

				$scope.clearData = function() {
					gridOptions.api.setRowData([]);
				}

				$scope.addRows = function() {
					var rows = modelData;
					var row = { }
					var columnId;

					var today = new Date();

					var customerid = getColumnID($scope.model.columns[0], 0);
					var productid = getColumnID($scope.model.columns[1], 1);
					var quantity = getColumnID($scope.model.columns[2], 2);
					var price = getColumnID($scope.model.columns[3], 3);
					var odate = getColumnID($scope.model.columns[4], 4);

					row._svyRowId = '1x';
					row[customerid] = 'ALFKI'
					row[productid] = 'Mozzarella di Giovanni'
					row[quantity] = '10'
					row[price] = '10'
					row[odate] = today;

					rows.push(row);

					row = { }
					row._svyRowId = '2x';
					row[customerid] = 'ANTON'
					row[productid] = 'Mozzarella di Giovanni'
					row[quantity] = '20'
					row[price] = '20'
					row[odate] = today;

					rows.push(row);

					gridOptions.api.updateRowData({ add: rows })
				}

				gridOptions.api.addEventListener('columnValueChanged', function(columnValueChanged) {
						$log.warn('columnValueChanged');
						$log.warn(columnValueChanged);

					})

				$scope.$watch("model.myFoundset", function(newValue, oldValue) {

						$log.warn('myFoundset root changed');

						//var foundsetServer = new FoundsetServer([]);
						//var datasource = new FoundsetDatasource(foundsetServer);
						//gridOptions.api.setEnterpriseDatasource(datasource);

						//$scope.model.myFoundset.addChangeListener(changeListener);

						setGridData();
					});

				function setGridData() {
					var data = foundset.getViewPortData()
					console.log(data)
					gridOptions.api.setRowData(data);
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
							hide: false,
							width: 0,
							openByDefault: true
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
							//	enablePivot :  column["enablePivot"],
							//	enableRowGroup : column["enableRowGroup"],
							//	enableValue : column["enableValue"]

						};
						if (column["pivot"]) colDef.pivot = column["pivot"];
						if (column["enablePivot"]) colDef.enablePivot = column["enablePivot"];
						if (column["enableRowGroup"]) colDef.enableRowGroup = column["enableRowGroup"];
						if (column["rowGroup"]) colDef.rowGroup = column["rowGroup"];
						if (column["aggFunc"]) colDef.aggFunc = column["aggFunc"];
						if (column["enableValue"]) colDef.enableValue = column["enableValue"];
						if (column["width"]) {

							//colDef.width = column["width"];
							colDef.maxWidth = column["width"]*2;
						}
						colDefs.push(colDef);
					}

					console.log(colDefs)
					return colDefs;
				}

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
						modelData = data;
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

			},
			templateUrl: 'aggrid/pivot/pivot.html'
		};
	})