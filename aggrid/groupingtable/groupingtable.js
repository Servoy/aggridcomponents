angular.module('aggridGroupingtable', ['webSocketModule', 'servoy']).directive('aggridGroupingtable', ['$sabloApplication', '$sabloConstants', '$log', '$q', '$foundsetTypeConstants', '$filter', '$compile', '$formatterUtils', '$sabloConverters', '$injector', '$services', "$sanitize", '$window', "$applicationService",
	function($sabloApplication, $sabloConstants, $log, $q, $foundsetTypeConstants, $filter, $compile, $formatterUtils, $sabloConverters, $injector, $services, $sanitize, $window, $applicationService) {
		// Constants: can't use const keyword, not supported in IE 9 & 10
		var ROOT_FOUNDSET_ID = 'root'; // TODO should just use Servoy's assigned id's, but since GroupManager is instantiated even when there's no foundset: maybe instantiate a new GroupManager once myfoundset is set, passing it's value as argument?
		var NULL_DISPLAY_VALUE = Object.freeze({
			displayValue: '',
			realValue: null
		});
		var CHUNK_SIZE = 50;
		var CACHED_CHUNK_BLOCKS = 2;
		var MD5 = new agGrid.MD5(); // need ability to generate idForFoundset MD5 hashes if only the lazydataprovider property is set on a colum
		
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
				 * Helper function similar to $scope.apply(...), but for model properties that aren't tied to a dataprovider
				 * 
				 * When using $scope.apply(...) for such properties, an INFO entry is written in the server log:
				 * 'apply called on a property that is not bound to a dataprovider: .....'
				 * 
				 * @param {string} propertyName
				 */
				function applyModelProperty(propertyName) {
					var args = {
						formname: $scope.$parent.formname,
						beanname: $attrs.name,
						changes: {}
					}
					
					args.changes[propertyName] = $scope.model[propertyName]
					
					$sabloApplication.callService('formService', 'dataPush', args, true)
				}
				
				// hack: clear all hashed foundsets left over from previous show of form containing the grid, as they aren't reused atm
				//       and the $scope.$on('$destroy', function() { ... logic fails to clean them up,
				//       because by the time the $destroy event occurs, the UI is already hidden, thus the call to the server to remove foundsets fail
				//       See https://support.servoy.com/browse/SVY-13804 for a FR to have a better solution
				$scope.model.hashedFoundsets.forEach(function(foundset, idx) {
					removeFoundSetByFoundsetUUID(foundset.foundsetUUID)
				})
				
				/* 
				 * TODO Column properties not matching dataset component
				 * 
				 * "headerGroup": {"type" : "tagstring"},
				 * "headerGroupStyleClass" : {"type" : "styleclass"},
				 * "enableFilter": {"type": "boolean", "default" : false},
				 * "cellStyleClassFunc": {"type": "string"},
				 * "cellRendererFunc": {"type": "string"},
				 */

				/*
				 * TODO clear nodes when collapsed ? Make it a configuration
				 * TODO Sort on Group by Default, by id doesn't make much sense, when grouping setTableSort to the group
				 * TODO handle runtimeChanges
				 * rowGroupIndex changes
				 * - Change ColDefs in Grid
				 */

				/*
				 * TODO optimization
				 *
				 * Fetch Data
				 * Fetch the next chunk of records to obtain a smoother scrolling experience
				 * Allow paramtrization of chunk size (default 50, 25x50 row, fits 1000 px screen);
				 *
				 * Data Broadcasting
				 * Notify refresh data only when grouped columns are changing (needs to know exactly what has changed ot what, can it actually do that ?)
				 */

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
				 */

				/**
				 * @typedef{{
				 * 	resolve: Function,
				 *  then: Function,
				 *  reject: Function,
				 *  promise: PromiseType
				 * }}
				 *
				 * @SuppressWarnings(unused)
				 */
				var PromiseType;

				/**
				 * @typedef{{
				 * 	colId: String,
				 *  sort: String
				 * }}
				 *
				 * @SuppressWarnings(unused)
				 */
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
				 */
				var RowGroupColType;

				/**
				 * @typedef {{
				 *	endRow: number,
				 *	filterModel: Object,
				 *	groupKeys: Array<string>,
				 *	rowGroupCols: Array<RowGroupColType>,
				 *	sortModel: Array<SortModelType>,
				 *	startRow: number,
				 *	valueCols: Array
				 * @SuppressWarnings(unused)
				 */
				var AgDataRequestType;

				$scope.dirtyCache = false; // used in HTML template to determine whether to render a refresh button

				/**
				 * Removes all clientside cached foundsets, except the root foundset
				 * and tells AG Grid to purge all cached data
				 */
				$scope.purge = function() {
					// an hard refresh is necessary to show the groups
					if ($scope.isGroupView) {
						groupManager.removeGroupsAtLevel(0);
					}
					
					gridOptions.api.purgeServerSideCache();
					
					$scope.dirtyCache = false;
				}

				/**
				 * @private
				 */
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

				// TODO wrap all the controller init code in a IIFE, so it can be collapses, for readability
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
				
				// Store the state of the table
				// TODO eliminate all that is not used or should be persisted serverside and then rename to clientSideState or something
				var state = {
					waitfor: {
						sort: 0,
						loadRecords: 0
					},
					/** column mapping by field name e.g. state.columns[field] */
					columns: { },
					foundsetManagers: { },
					/** valuelists stored per field */
					valuelists: { }, // NOT USED?
					/** 
					 * Store the colIds of the current group columns
					 */
					rowGroupColIds: [],
					/** Stor the latest groupKeys*/
					groupKeys: [], // NOT USED?
					/** Sort state of the root group */
					rootGroupSort: null // NOT USED?
				}

				// Disabling the keeping of the persisted state when reshowing the component for now, untill API is ready to control selection, grouping and expanded state
				//if (!$scope.model.state) {
					// TODO move this state into GroupNode/FoundsetManager
					// TODO clear properly when rowGroups change
					// TODO maybe not require empty children objects? How much extra checking is needed in code?
					$scope.model.state = {
						pks: []
					};
					
					applyModelProperty('state')
				//}
				
				// used in HTML template to toggle sync button
				$scope.isGroupView = false;

				// set to true when is rendered
				var isRendered = undefined;

				// foundset sort promise
				var sortPromise;

				// formatFilter function
				var formatFilter = $filter("formatFilter");
				
				// the group manager
				var groupManager = new GroupManager(); // Should maybe be instantiated only when myfoundset gets set, passing myfoundset as rootNode

				var gridDiv = $element.find('.ag-table')[0];
				var columnDefs = getColumnDefs();

				$log.debug(columnDefs);

				// position of cell with invalid data as reported by the return of onColumnDataChange
				var invalidCellDataIndex = { 
					rowIndex: -1,
					colKey: ''
				};
				var onColumnDataChangePromise = null;

				// if aggrid service is present read its defaults
				var toolPanelConfig = null;
				var iconConfig = null;
				var userGridOptions = null
				var localeText = null;
				
				if ($injector.has('ngDataGrid')) {
					var groupingtableDefaultConfig = $services.getServiceScope('ngDataGrid').model;
					
					if (groupingtableDefaultConfig.toolPanelConfig) {
						toolPanelConfig = groupingtableDefaultConfig.toolPanelConfig;
					}
					if (groupingtableDefaultConfig.iconConfig) {
						iconConfig = groupingtableDefaultConfig.iconConfig;
					}
					if (groupingtableDefaultConfig.gridOptions) {
						userGridOptions = groupingtableDefaultConfig.gridOptions;
					}
					if (groupingtableDefaultConfig.localeText) {
						localeText = groupingtableDefaultConfig.localeText;
					}
				}

				var config = $scope.model;
				// console.log(config)

				function mergeConfig(target, source) {
					var mergeConfig = target;
					if (source) {
						if (mergeConfig) {
							for (var property in source) {
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

				var vMenuTabs = ['generalMenuTab', 'filterMenuTab'];
				if (config.showColumnsMenuTab) vMenuTabs.push('columnsMenuTab');
				
				var isGridReady = false;

				var gridOptions = {
					debug: false,
					rowModelType: 'serverSide',
					rowGroupPanelShow: 'onlyWhenGrouping', // TODO expose property

					defaultColDef: {
						width: 0,
						filter: false, // TODO implement serverside filtering
						valueGetter: displayValueGetter,
						valueFormatter: displayValueFormatter,
						menuTabs: vMenuTabs,
						sorting: config.enableSorting,
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
//					suppressColumnMoveAnimation: true,
//					suppressAnimationFrame: true,

					rowSelection: $scope.model.myFoundset && $scope.model.myFoundset.multiSelect ? 'multiple' : 'single',
					rowDeselection: true,
					suppressCellSelection: true, // TODO implement focus lost/gained
					enableRangeSelection: false,
					processCellForClipboard: function(params) {
						return params.value == NULL_DISPLAY_VALUE ? null : params.value;
					},

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

						if ($scope.model._internalColumnState !== "_empty") {
							$scope.model.columnState = $scope.model._internalColumnState;
							// need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
							$scope.model._internalColumnState = "_empty";
							applyModelProperty('_internalColumnState')
						}

						restoreColumnsState();

						// Call the serverside onReady callback
						if ($scope.handlers.onReady) {
							$scope.handlers.onReady();
						}

						onGroupingChange(gridOptions.columnApi.getRowGroupColumns());

						// without timeout the column don't fit automatically
						setTimeout(function() {
							sizeHeaderAndColumnsToFit();
							scrollToSelection();
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
					getRowNodeId: function(data) {
						return data._svyFoundsetUUID + '_' + data._svyRowId; // CHECKME I had this working with just return data._svyRowId;
					},
					// TODO localeText: how to provide localeText to the grid ? can the grid be shipped with i18n ?

					navigateToNextCell: selectionChangeNavigation,

					sideBar: toolPanelConfig && toolPanelConfig.suppressSideButtons === true ? false : {
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
					},
					popupParent: gridDiv,
					onCellEditingStopped : function(event) {
						// don't allow escape if cell data is invalid
						if (onColumnDataChangePromise == null) {
							var rowIndex = event.rowIndex;
							var colId = event.column.colId;
							if (invalidCellDataIndex.rowIndex == rowIndex  && invalidCellDataIndex.colKey == colId) {
								gridOptions.api.startEditingCell({
									rowIndex: rowIndex,
									colKey: colId
								});
							}
						}
					},
					onCellEditingStarted : function(event) {
						// don't allow editing another cell if we have an invalidCellData
						if (invalidCellDataIndex.rowIndex != -1 && invalidCellDataIndex.colKey != '') {
							var rowIndex = event.rowIndex;
							var colId = event.column.colId;
							if (invalidCellDataIndex.rowIndex != rowIndex  || invalidCellDataIndex.colKey != colId) {
								gridOptions.api.stopEditing();
								gridOptions.api.startEditingCell({
									rowIndex: invalidCellDataIndex.rowIndex,
									colKey: invalidCellDataIndex.colKey
								});
							}
						}
					}
				};
				
				//Loop through all columnsDefs and init certain things
				for (var i = 0; i < columnDefs.length; i++) {
					var column = columnDefs[i];
					
					// check if we have filters, suppress the side filter if the suppressColumnFilter is set to true
					if (gridOptions.sideBar && gridOptions.sideBar.toolPanels && !(toolPanelConfig && toolPanelConfig.suppressColumnFilter == true)) {
						if (column.suppressFilter === false) {
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
					
					if (column.rowGroupIndex > -1 || column.rowGroup) {
						$scope.isGroupView = true
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
				gridOptions.icons = {};

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
	            for (var iconName in iconConfig) {
	               	if (iconName == "iconRefreshData") continue;
	               	
	               	var aggridIcon = iconName.slice(4);
	               	aggridIcon = aggridIcon[0].toLowerCase() + aggridIcon.slice(1);
	               	gridOptions.icons[aggridIcon] = getIconElement(iconConfig[iconName]);
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

				var foundset;

				// if in designer render a mocked grid
				if ($scope.svyServoyapi.isInDesigner()) {
					var designGridOptions = {
						rowModelType: 'clientSide',
						columnDefs: columnDefs,
						rowHeight: $scope.model.rowHeight,
						rowData: []
					};

					// init the grid
					new agGrid.Grid(gridDiv, designGridOptions);
					return;
				}

				// init the grid
				new agGrid.Grid(gridDiv, gridOptions);

				// rerender next time model.visible will be true
				isRendered = $scope.model.visible

				/**
				 * Programatically sets the selected state of all direct direct children of the provided group row node
				 * only if the group row is either selected or deselected (so ignoring mixed state)
				 * 
				 * Setting the selected state on the direct children will trigger the appropriate selection-related events
				 * which will take care of propagating the selected state to nested descendants
				 * 
				 * @param {Object} node
				 */
				function selectChildNodes(node) {
					if (!node.group) return
					
					var selectedState = node.selected
					
					// TODO this should set/clear state in groupState
					
					if (typeof selectedState === 'boolean') { // selectedState is undefined if there are both selected and unselected children
						var model = gridOptions.api.getModel()
						var row = model.getRow(node.rowIndex + 1); // get the first row after the current node's row
						
						while (row && !( row.group && row.level <= node.level )) { // loop through all (nested) childRows
							if (row.level === node.level + 1 && selectedState !== row.isSelected()) {
								row.setSelected(selectedState) // triggers the selection-related events, which in turn trigger the process for the next level of group rows (if any)
							}
							
							row = model.getRow(row.rowIndex + 1)
						}						
					}
				}
				
				// TODO encapsulate utility functions below in groupState class or something
				/**
				 * Gets a string array containing the group values/keys from root to the provided node
				 */
				function getGroupPath(node) {
					var groupKeys = [];
					var groupNode = node.group ? node : node.parent;
					
					while (groupNode.level !== -1) {
						groupKeys.push(groupNode.key);
						groupNode = groupNode.parent;
					}
					
					return groupKeys.reverse();
				}
				
				/**
				 * Gets the persisted group state
				 * 
				 * @param {node|string[]} nodeOrKeys 
				 * @param {boolean=} force whether to force creation of missing group state objects
				 */
				function getGroupPersistState(nodeOrKeys, force) {
					var groupState = $scope.model.state;
					var groupKeys = Array.isArray(nodeOrKeys) ? nodeOrKeys : getGroupPath(nodeOrKeys);
					
					groupKeys.forEach(function(entry, index) {
						if (entry === NULL_DISPLAY_VALUE) {
							groupKeys[index] = 'GRID_NULL_DISPLAY_VALUE';
						}
					});
					
					for (var index = 0; groupState && index < groupKeys.length; index++) {
						if (groupState.children && groupState.children.hasOwnProperty(groupKeys[index])) {
							groupState = groupState.children[groupKeys[index]];
						} else if (force) {
							if (!groupState.children) {
								groupState.children = {}
							}
							groupState = groupState.children[groupKeys[index]] = Object.create({parent: groupState}); // CHECKME Object.create IE9 safe?
							groupState.children = {}
						} else {
							groupState = null;
						}
					}
					
					return groupState;
				}
				
				/**
				 * Bubbles the result of a rowSelection event up through the parent groups up to the root node
				 * so all parent groups have the proper selection state if somethign changes in the selectionState of any of its decendants
				 */
				function setGroupSelectedState(parent) {
					if (!parent || !parent.group || parent.level === -1) {
						return;
					}
					
					// Set the proper selected state on the parent group row if any
					var model = gridOptions.api.getModel()
					var row = model.getRow(parent.rowIndex + 1); // get the first row after the current node's row
					var selectedState = row.isSelected();
					
					// TODO recursively decent into children that are groups to find selections in there: if group rows aren't expanded, check groupState
					//		
					// FIXME this wont take into account lazy loading, should check selectedState instead
					// loop through all subsequent rows untill either the last row, the next sibling or the selected node or until the desired state is clear
					while (row && !(row.group && row.level <= parent.level) && selectedState !== undefined) { 
						if (row.level === parent.level + 1 && selectedState !== row.isSelected()) {
							selectedState = undefined;
							break;
						}
						
						row = model.getRow(row.rowIndex + 1)
					}
					
					parent.selectThisNode(selectedState);
				}
				
				/**
				 * returns the desired selected state for a node based on:
				 * ~~~ if parent is selected: true
				 * - if leaf row:
				 * 		- if row pk in groupState: true
				 * - if group row:
				 * 		- if group marked as selected in groupState: true
				 * 		- if all children selected: true
				 * 		- if no children are (partially) selected: false
				 * 		- else: partially selected
				 * - else false
				 */
				function getDesiredNodeSelectedState(node) {
					var groupState = getGroupPersistState(node);
					
					if (!groupState) {
						return false;
					}
					
					if (node.group) {
						return forEachChild(groupState);
					} else if (groupState.pks && groupState.pks.indexOf(/(?!\d+|root)\_\d+.(\d+);\_\d+/.exec(node.id)[1]) !== -1) { // leafNode marked as selected in groupState
						return true;
					}
					
					return false;
				}
				
				function forEachChild(groupState) {
					if (groupState.selected || (groupState.pks && groupState.pks.length)) {
						return true;
					}
					
					var selected = null;
					var keys = Object.keys(groupState.children); // CHECKME is there a loop over object properties that we can use instead of extracting the keys first? To improve performance
					
					for (var i = 0; i < keys.length; i++) {
						var childSelection = forEachChild(groupState.children[keys[i]]);
						
						if (selected === null) {
							selected = childSelection;
						} else if (selected === childSelection) {
							continue;
						} else {
							return undefined;
						}
					}
					
					return false;
				}
				
				/**
				 * Event handler for rowSelected event
				 * 
				 * Takes care of:
				 * - properly selecting all (already loaded) childNodes of a group row if the group row's selected state is true or false (ignoring undefined, which means mixed state)
				 * - properly setting the selected state of all parent group rows
				 * - persisting selected state
				 * 
				 * Only operates when grid is in group mode
				 */
				gridOptions.api.addEventListener('rowSelected', function (event) {
					//console.log('rowSelected', event)
					
					if (!$scope.isGroupView && !$scope.model.disconnectedSelection) return // if the table is not grouped, there's not selection state bubbling/cascading to be taken care of
					
					var node = event.node;
					
					// set the selected state of all (loaded) childNodes (if any). Will only do something if the selected row is a group row
					selectChildNodes(node); // CHECKME inline this function?
					
					// Set the proper selected state on the parent group row if any
					setGroupSelectedState(node.parent);
					
					// persist selected state, only for the current node: parent logic will trigger through async rowSelected events on the parent a bit later
					var groupState = getGroupPersistState(node, true)
					
					if (node.group) {
						if (node.selected === true && (!node.parent || !node.parent.selected)) { // Only persisting selected state if the selection is not inherited // CHECKME should probably then also clear 'selected' on descendants when parent is selected
							groupState.selected = true;
						} else {
							delete groupState.selected;
						}
					} else if (!$scope.isGroupView || (groupState.parent && groupState.parent.selected !== node.isSelected())) {
						// FIXME groupState ends up with nodes containing both selected: true and a pks array with values, should instead be either/or, bot both
						if (!groupState.pks) {
							groupState.pks = [];
						}
						
						var pk = /(?!\d+|root)\_\d+.(\d+);\_\d+/.exec(node.id)[1]; // TODO extract this regex logic into utility function
						if (node.isSelected()) {
							groupState.pks.push(pk);
						} else {
							groupState.pks.splice(groupState.pks.indexOf(pk), 1);

							if (!groupState.pks.length) {
								delete groupState.selected;
							}
						}
					}
					applyModelProperty('state')
				});

				// register listener for selection changed
				gridOptions.api.addEventListener('selectionChanged', onSelectionChanged);

				// grid handlers
				var clickTimer;
				function cellClickHandler(params) {
					//console.log('cellClicked', params)
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
				
				// TODO inline the event handlers as anonymous functions in the addEventHandler code
				gridOptions.api.addEventListener('cellClicked', cellClickHandler);
				gridOptions.api.addEventListener('cellDoubleClicked', onCellDoubleClicked);
				gridOptions.api.addEventListener('cellContextMenu', onCellContextMenu);

				/**
				 * Event handler for grouping changes, ie. when a change occurs to the columns by which the grid is grouped
				 * 
				 * Takes care of:
				 * - persist on which columns the grid is grouped
				 * - remove obsolete foundsets
				 * - sets the $scope.isGroupView flag
				 * - cleans up obsolete expanded/collapsed persist state 
				 * - (optional) makes the columns by which the grid was previously grouped visible again, see setting ... // TODO finish
				 * 
				 * CHECKME what is happening with filtering in here?
				 */
				gridOptions.api.addEventListener('columnRowGroupChanged', function (event) {
					$log.debug(event);
					
					onGroupingChange(event.columns)
				});
				
				gridOptions.api.addEventListener('columnVisible', function (event) {
					var colIdx = newGetColumnIndex(event.column);
					
					var designCol;
					
					// CHECKME can this happen in other places as well where we use newGetColumnIndex(event.column)? If so, encapsulate into function
					if (colIdx === -1 && event.column.colDef.field) { // a virtual column, like an auto group column. Try to find designColumn with the same field value
						colIdx = getColumnIndexByField(event.column.colDef.field)
					}
					
					designCol = $scope.model.columns[colIdx];

					if (designCol && designCol.lazydataprovider && event.visible !== !!designCol.dataprovider) {
						$scope.svyServoyapi.callServerSideApi('loadDataForColumns', [[colIdx], event.visible])
							.then(function(retValue) {
								/*
								 * Force AG Grid to drop its internal cache and request new data
								 * as the data it'll request are already cached in the browser, it shouldn't hit the server at all
								 */
								event.api.purgeServerSideCache();
							});
					}
				});
	         
				/**
				 * Event handler for when the grouping changes
				 * 
				 * Takes care of things like:
				 * - loading data for newly made visible columns (if using lazydataprovider)
				 * - toggling the visibility of the column whos dataprovider is also used dataprovider for the autoGroupColumn
				 * - setting the $scope.isGroupView accordingly
				 * - removing no longer needed foundsets for groups & leafs
				 */
				function onGroupingChange(rowGroupCols) {
					var wasUngrouped = false;
					var forceLoadIndexes = [];
					var colIdsToMakeVisible = [];
					var autoColumnGroupField = gridOptions.autoGroupColumnDef ? gridOptions.autoGroupColumnDef.field : null;
					var allColumns = gridOptions.columnApi.getAllColumns()

					var i;
					var designColumn;
					var colId;
	
					if (!rowGroupCols.length) { // Grid not grouped anymore
						if ($scope.isGroupView) { // but was grouped before
							// clear filter
							gridOptions.api.setFilterModel(null); // WHY?

							$scope.isGroupView = false;

							// Remove all obsolete group foundsets
							groupManager.removeGroupsAtLevel(0);

							// clear list of colIds on which previously grouped
							state.rowGroupColIds.length = 0
							
							// Clear all expanded/collapsed persist state
							$scope.model.state.children = {}
						} else { // grid wasn't grouped before, so must be initial show
							wasUngrouped = true;
						}

						state.rootGroupSort = null; // CHECKME move into IF clause above? Not exactly sure what this is doing anyway...

						// Making sure the proper columns have visibility and data is loaded for all visible columns
						for (i = 0; i < $scope.model.columns.length; i++) {
							designColumn = $scope.model.columns[i];
							colId = allColumns[i].colId;

							if (column.hasOwnProperty('rowGroupIndex')) {
								column.rowGroupIndex = -1;
							}

							// if a field was used for the autoGroupColumnDef, make sure a column using the same field is made visible again after ungroup
							if (autoColumnGroupField && designColumn.columnDef && designColumn.columnDef.field === autoColumnGroupField) {
								colIdsToMakeVisible.push(colId);
							}

							// Force data load for columns with lazydataproviders
							if (allColumns[i].visible && !designColumn.dataprovider && designColumn.lazydataprovider) {
								forceLoadIndexes.push(i);
							}
						}

						// make sure the data for all (to be) visible columns is loaded, if not already loaded
						if (forceLoadIndexes.length) {
							$scope.svyServoyapi.callServerSideApi('loadDataForColumns', [forceLoadIndexes, true]);
						}

						// make hidden columns visible
						colIdsToMakeVisible.forEach(function(colId) {
							gridOptions.columnApi.setColumnVisible(colId, true);
						});
					} else {
						if (!$scope.isGroupView) { // grid wasn't grouped before, but is now
							// clear filter
							gridOptions.api.setFilterModel(null);
							
							wasUngrouped = true;
							
							// CHECKME should the selection on the root foundset not be cleared, as that one isn't being used now anymore
							//		   or should the selection it had be persisted to group mode?
							//		   Also: shouldn't the root foundset be cleared (or records), as to prevent devs still looking at it while the grid is in groupMode and the rootfoundset is not being used anymore?
							//		   If clearing the root fs of records: need to think about what happens when switching back to non-grouped mode
							
							//		   At the moment, if you have a selection in non-group mode and switch to grouped mode, there is nothign selected in group mode.
							//		   if you remove the groups and thus end up in non-group mode, the old selection is still in place
							//		   Haven't tested it, but most likely any changes in filtering is not synces between the two either...
						}
						
						$scope.isGroupView = true;

						var oldGroupedColIds = state.rowGroupColIds;
						state.rowGroupColIds = rowGroupCols.map(function(col) { // save the colIds of the current group columns
							return col.colId;
						});
						
						for (i = 0; i < $scope.model.columns.length; i++) {
							designColumn = $scope.model.columns[i];
							colId = allColumns[i].colId;

							var isGroupedBy = state.rowGroupColIds.indexOf(colId) !== -1;
							var wasGroupedBy = oldGroupedColIds.indexOf(colId) !== -1;
							var hideBecauseFieldSharedWithAutoColumnGroup = false
							var newGroupIndex = state.rowGroupColIds.indexOf(colId);

							var newVisibility;
							
							designColumn.rowGroupIndex = newGroupIndex; // persist

							if (autoColumnGroupField && designColumn.columnDef) {
								hideBecauseFieldSharedWithAutoColumnGroup = designColumn.columnDef.field === autoColumnGroupField && wasUngrouped;
							}

							if (wasGroupedBy) {
								newVisibility = true;
							}

							if (isGroupedBy || hideBecauseFieldSharedWithAutoColumnGroup) {
								newVisibility = false;
							}

							if (wasGroupedBy || isGroupedBy || hideBecauseFieldSharedWithAutoColumnGroup) { // TODO expose behavior as option
								gridOptions.columnApi.setColumnVisible(colId, newVisibility)
							}
						}

						// Compare old and new grouping and remove all cached groups (and children) for the level where a difference is found
						for (i = 0; i < oldGroupedColIds.length; i++) {
							if (oldGroupedColIds[i] !== state.rowGroupColIds[i]) { 
								groupManager.removeGroupsAtLevel(i); // clean up obsolete foundsets

								// TODO clean up collapse/expand persist state from the right level downwards
								break;
							}
						}
					}

					// After change in grouping, all watch function to enable/disable checkboxSelection
					if ($scope.model.checkboxSelection) {
						modelCheckboxSelectionWatch($scope.model.checkboxSelection, !$scope.model.checkboxSelection);
					}

					applyModelProperty('state');
	
					// resize the columns
					setTimeout(function() {
						sizeHeaderAndColumnsToFit();
					}, 50);

					// scroll to the selected row when switching from Group to plain view.  // CHECKME seems to not only do it when switching to plain view
					// without timeout the column don't fit automatically
					setTimeout(function() {
						scrollToSelection();
					}, 150);
				}

				/**
				 * Event handler for the event fired when groups are collapsed or expanded
				 * 
				 * while event is called 'rowGroupOpened' it also fires when closing a group
				 * 
				 * By the time this event fires for a collapse, the childre are already removed.
				 * So, in order to .....
				 */
				gridOptions.api.addEventListener('rowGroupOpened', function(event) {
					$log.debug(event);
					
					var node = event.node;
					var state = getGroupPersistState(node, true)
					
					if (node.expanded) {
						state.expanded = true;
					} else {
						var keys = Object.keys(state.children);
						var preserveState = false;
						
						for (var i = 0; i < keys.length; i++) {
							if (state.children.expanded) {
								preserveState = true;
								break;
							}
						}
						
						if (preserveState) {
							state.expanded = false;
						} else {
							delete state.expanded;
						}
					}
				
					applyModelProperty('state')
					
					// CHECKME this is old code that was already commented out. What to do with it? Ideally, the fs is removed after a delay and when the total # of fs's reaches a threshold
//					// TODO remove foundset from memory when a group is closed
//					// TODO expose model property to control perfomance
//					if (isExpanded === false && $scope.model.perfomanceClearCacheStateOnCollapse === true) {
//						// FIXME remove foundset based on values
//						groupManager.removeChildFoundsetRef(column.data._svyFoundsetUUID, column.field, column.data[field]);
//					}
//
//					//var foundsetManager = getFoundsetManagerByFoundsetUUID(column.data._svyFoundsetUUID);
//					//foundsetManager.destroy();

				});

				/**
				 * Event handler for selection changes.
				 * 
				 * @private
				 */
				function onSelectionChanged(event) {
					//console.log('selectionChanged', event, gridOptions.api.getSelectedNodes());
					
					// selection in grouped mode is tracked differently, via the rowSelected event
					if ($scope.isGroupView || $scope.model.disconnectedSelection) {
						//console.log(JSON.stringify($scope.model.state, function(key, value) {return key === 'parent' ? undefined : value}))

                        // Trigger event on selection change in group mode
                        if ($scope.handlers.onSelectedRowsChanged) {
                            $scope.handlers.onSelectedRowsChanged();
                        }

						return
					}

					var selectedNodes = gridOptions.api.getSelectedNodes();
					
					if (selectedNodes.length) { // CHECKME can length ever be zero?
						var foundsetIndexes = [];

						for (var i = 0; i < selectedNodes.length; i++) {
							var node = selectedNodes[i];
							if (node) foundsetIndexes.push(node.rowIndex);				
						}
						
						if (foundsetIndexes.length > 0) {
							foundset.foundset.requestSelectionUpdate(foundsetIndexes)
								.then(
									function (serverRows) {}, // success
									function (serverRows) { // canceled
										if (typeof serverRows === 'string'){
											return;
										}
										//reject
										selectedRowIndexesChanged();
									}
								);
							return;
						}
					} else { // handle last node deselection, which AG Grid allows through rowDeselection
						// TODO handle: as foundsets always have at least one row selected, guess the only thing to do is log a warning and 
					}
					
					$log.debug("table must always have a selected record");
					selectedRowIndexesChanged(); // CHECKME seems suboptimal, as it might get executed twice
				}
				
				/**
				 * On ClickEvent
				 *
				 * @private
				 */
				function onCellClicked(params) {
					$log.debug(params);
					
					// Tried toggling group row selection here, which works, but would miss support for ctrl/shift multi/range select + restrictions AG Grid has based on other config/features would have to be duplicated
//					if (params.node.group) {
//						params.node.selectThisNode(params.node.isSelected() ? false : true)
//					}
					
					if ($scope.handlers.onCellClick) {
						//						var row = params.data;
						//						var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
						//						if (!foundsetManager) foundsetManager = foundset;
						//						var foundsetRef = foundsetManager.foundset;
						//
						//						var foundsetIndex;
						//						if ($scope.isGroupView) {
						//							// TODO search for grouped record in grouped foundset (may not work because of caching issues);
						//							$log.warn('select grouped record not supported yet');
						//							foundsetIndex = foundsetManager.getRowIndex(row);
						//						} else {
						//							foundsetIndex = params.node.rowIndex;
						//						}
						//
						//						var columnIndex = newGetColumnIndex(params.column);
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
						var columnIndex = newGetColumnIndex(params.column);
						var recordPromise = getFoundsetRecord(params);

						recordPromise.
							then(function(record) {
								// FIXME with R&D, doesn't translate the record when grouped (because not from root foundset cache).
								// How to retrieve the record ? Via Mapping or via PK ?
								$scope.handlers.onCellClick(foundsetIndex, columnIndex, record, params.event);
							})
							.catch(function(e) {
								$log.error(e);
								$scope.handlers.onCellClick(foundsetIndex, columnIndex, null, params.event);
							});
					}
				}

				/**
				 * @return {Number}
				 */
				function getFoundsetIndexFromEvent(params) {
					var foundsetIndex;
					if ($scope.isGroupView) {
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
				 */
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
					$scope.svyServoyapi.callServerSideApi("getFoundsetRecord", [foundsetUUID, row._svyRowId])
						.then(function(record) {
							$log.debug(record);
							promiseResult.resolve(record);
						})
						.catch(function(e) {
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
					if ((invalidCellDataIndex.rowIndex != -1 && invalidCellDataIndex.rowIndex != rowIndex)
						|| (invalidCellDataIndex.colKey != '' && invalidCellDataIndex.colKey != colId)) {
						return;
					}

					var row = params.data;
					var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
					
					if (!foundsetManager) {
						foundsetManager = foundset;
					}
					
					var foundsetRef = foundsetManager.foundset;
					var newValue = params.newValue;
					
					if (newValue && newValue.realValue !== undefined) {
						newValue = newValue.realValue;
					}
					
					var oldValue = params.oldValue;
					
					if (oldValue && oldValue.realValue !== undefined) {
						oldValue = oldValue.realValue;
					}

					// TODO move this out and see where else it should be used
					function getField(column) {
						var field = column.colDef.field;

						return field.indexOf(':') === -1 ? field : field.split(':')[0]
					}

					var field = getField(params.column);

					if (field && (newValue != oldValue || invalidCellDataIndex.rowIndex != -1)) {
						if (newValue != oldValue) {
							foundsetRef.updateViewportRecord(row._svyRowId, field, newValue, oldValue);
						}
						
						if ($scope.handlers.onColumnDataChange && newValue != oldValue) {
							var currentEditCells = gridOptions.api.getEditingCells();
							
							onColumnDataChangePromise = $scope.handlers.onColumnDataChange(
								getFoundsetIndexFromEvent(params),
								newGetColumnIndex(params.column),
								oldValue,
								newValue
							);
							
							onColumnDataChangePromise
								.then(function(r) {
									if (r == false) {
										// if old value was reset, clear invalid state
										var currentValue = gridOptions.api.getValue(colId, params.node);

										if (currentValue && currentValue.realValue !== undefined) {
											currentValue = currentValue.realValue;
										}

										if (oldValue === currentValue) {
											invalidCellDataIndex.rowIndex = -1;
											invalidCellDataIndex.colKey = '';
										} else {
											invalidCellDataIndex.rowIndex = rowIndex;
											invalidCellDataIndex.colKey = colId;
										}

										var editCells = gridOptions.api.getEditingCells();

										if (!editCells.length || (editCells[0].rowIndex != rowIndex || editCells[0].column.colId != colId)) {
											gridOptions.api.stopEditing();
											gridOptions.api.startEditingCell({
												rowIndex: rowIndex,
												colKey: colId
											});
											setTimeout(function() {
												// CHECKME can probably be done through the rowId instead of a loop?
												gridOptions.api.forEachNode( function(node) {
													if (node.rowIndex === rowIndex) {
														node.setSelected(true, true);
													}
												});
											}, 0);
										}
									} else {
										invalidCellDataIndex.rowIndex = -1;
										invalidCellDataIndex.colKey = '';

										var editCells = gridOptions.api.getEditingCells();

										if (editCells.length == 0 && currentEditCells.length != 0) {
											gridOptions.api.startEditingCell({
												rowIndex: currentEditCells[0].rowIndex,
												colKey: currentEditCells[0].column
											});
										}
									}
									onColumnDataChangePromise = null;
								})
								.catch(function(e) {
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
				 */
				function onCellDoubleClicked(params) {
					$log.debug(params);
					if ($scope.handlers.onCellDoubleClick) {
						//						var row = params.data;
						//						var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
						//						if (!foundsetManager) foundsetManager = foundset;
						//						var foundsetRef = foundsetManager.foundset;
						//						var foundsetIndex;
						//						if ($scope.isGroupView) {
						//							// TODO search for grouped record in grouped foundset (may not work because of caching issues);
						//							$log.warn('select grouped record not supported yet');
						//							foundsetIndex = foundsetManager.getRowIndex(row);
						//						} else {
						//							foundsetIndex = params.node.rowIndex;
						//						}
						//
						//						var columnIndex = newGetColumnIndex(params.column);
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
						var columnIndex = newGetColumnIndex(params.column);
						var recordPromise = getFoundsetRecord(params);

						recordPromise
							.then(function(record) {
								// FIXME with R&D, doesn't translate the record when grouped (because not from root foundset cache).
								// How to retrieve the record ? Via Mapping or via PK ?
								$scope.handlers.onCellDoubleClick(foundsetIndex, columnIndex, record, params.event);
							})
							.catch(function(e) {
								$log.error(e);
								$scope.handlers.onCellDoubleClick(foundsetIndex, columnIndex, null, params.event);
							});
					}
				}

				/**
				 * On Right Click event
				 *
				 * @private
				 */
				function onCellContextMenu(params) {
					$log.debug(params);
					if ($scope.handlers.onCellRightClick) {
						//						var row = params.data;
						//						var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
						//						if (!foundsetManager) foundsetManager = foundset;
						//						var foundsetRef = foundsetManager.foundset;
						//						var foundsetIndex;
						//						if ($scope.isGroupView) {
						//							// TODO search for grouped record in grouped foundset (may not work because of caching issues);
						//							$log.warn('select grouped record not supported yet');
						//							foundsetIndex = foundsetManager.getRowIndex(row);
						//						} else {
						//							foundsetIndex = params.node.rowIndex;
						//						}
						//
						//						var columnIndex = newGetColumnIndex(params.column);
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
						var columnIndex = newGetColumnIndex(params.column);
						var recordPromise = getFoundsetRecord(params);

						recordPromise
							.then(function(record) {
								// FIXME with R&D, doesn't translate the record when grouped (because not from root foundset cache).
								// How to retrieve the record ? Via Mapping or via PK ?
								$scope.handlers.onCellRightClick(foundsetIndex, columnIndex, record, params.event);
							})
							.catch(function(e) {
								$log.error(e);
								$scope.handlers.onCellRightClick(foundsetIndex, columnIndex, null, params.event);
							});
					}
				}
				
				/**
				 * Context menu callback
				 */
				function getContextMenuItems(params) {
					// hide any context menu
					return [];
				}

				// CHECKME does this handling match nav in ACtionButton/More Menu
				// CHECKME impact on selectionModel?
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
				 * Returns the formatted value
				 * Compute value format and column valuelist
				 * @private
				 *
				 * @return {Object}
				 */
				function displayValueFormatter(params) {
					var field = params.colDef.field;
					var column;

					if (!params.data) {
						return undefined;
					}

					var value = params.data[field];

					if (value && value.displayValue != undefined) {
						value = value.displayValue;
					}

					column = $scope.model.columns[newGetColumnIndex(params.column)];

					if (column && column.format) {
						value = formatFilter(value, column.format.display, column.format.type, column.format);
					}

					if (value == null && params.value === NULL_DISPLAY_VALUE) {
						value = '';
					}

					return value;
				}

				/**
				 * Callback used by AG Grid to ask for the actual data
				 * 
				 * AG Grid doesn't care about how we expose each bit of data for a row in the result returned from the .getRows(...) implementation
				 * it uses this function to get the correct value
				 */
				function displayValueGetter(params) {
					if (params.colDef.field && params.data) {
						var value = params.data[params.colDef.field];

						return value == null ? NULL_DISPLAY_VALUE : value; // need to use an object for null values else grouping won't work in ag grid
					}

					return undefined;				
				}

				/**
				 * Resize header and all columns so they can fit the horizontal space
				 */
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
					var headerCellLabels = $element.find('.ag-header-cell-text');
					var minHeight = (gridOptions && gridOptions.headerHeight) ? gridOptions.headerHeight : 25;

					for (var i = 0; i < headerCellLabels.length; i++) {
						minHeight = Math.max(minHeight, headerCellLabels[i].scrollHeight + paddingTop + paddinBottom);
					}
					gridOptions.api.setHeaderHeight(minHeight);
				}

				/**
				 * Return the icon element with the given font icon class
				 *
				 * @return {String} <i class="iconStyleClass"/>
				 */
				function getIconElement(iconStyleClass) {
					return '<i class="' + iconStyleClass + '"/>';
				}

				// **************************** Cell editors **************************** //
				function getValuelist(params, asCodeString) {
					return getValuelistEx(params.node.data, params.column.colId, asCodeString)
				}

				function getValuelistEx(row, colId, asCodeString) {
					var foundsetManager = getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
					
					var column;
					var foundsetRows;

					// if not root, it should use the column/foundsetRows from the hashed map
					if (foundsetManager.isRoot) {
						column = $scope.model.columns[newGetColumnIndex(colId)];
						foundsetRows = $scope.model.myFoundset.viewPort.rows;
					} else {
						for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) {
							if ($scope.model.hashedFoundsets[i].foundsetUUID == foundsetManager.foundsetUUID) {
								if ($scope.model.hashedFoundsets[i].length === $scope.model.columnState.length) { // leaf foundsets
									column = $scope.model.hashedFoundsets[i].columns[newGetColumnIndex(colId)];
								} else { // group foundset
									/*
									 * Jumping through some hoops to get the correct column:
									 * 
									 * For Group columns we only send over the columns that are relevant for the group foundset
									 * hence, we cannot match based on index
									 * instead, we find the design column based on the colId
									 * and then compare the generated field value for the design column with the columns defined for the group foundset
									 */
									var targetField = getFieldValueForColumn(newGetColumnIndex(colId))
									
									for (var j = 0; j < $scope.model.hashedFoundsets[i].columns.length; j++) {
										if (getFieldValueForColumn(j, $scope.model.hashedFoundsets[i].columns) === targetField) { // FIXME the : + idx appended will be wrong...
											column = $scope.model.hashedFoundsets[i].columns[j];
											break;
										}
									}	
								}
								
								foundsetRows = foundsetManager.foundset.viewPort.rows;
								break;
							}
						}
					}

					if (!column || !foundsetRows) {
						$log.error('Cannot find column/foundset to read the valuelist.');
						return null;
					}

					// if it's a foundset linked prop (starting with Servoy 8.3.2) or not (prior to 8.3.2)
					if (column.valuelist && column.valuelist[$sabloConverters.INTERNAL_IMPL]
							&& angular.isDefined(column.valuelist[$sabloConverters.INTERNAL_IMPL]["recordLinked"])) {
						// _svyRowId: "5.10643;_0"
						var rowId = row[$foundsetTypeConstants.ROW_ID_COL_KEY].split(';')[0]
						
						if (column.valuelist.length == 0 && foundsetRows.length > 0) {
							// this if is just for backwards compatibility editing comboboxes with valuelists with Servoy < 8.3.3 (there the foundset-linked-in-spec valuelists in custom objects
							// would not be able to reference their foundset from client-side JS => for valuelists that were not actually linked
							// client side valuelist.js would simulate a viewport that has as many items as the foundset rows containing really the same valuelist object
							// and this did not work until the fix of SVY-12718 (valuelist.js was not able to find foundset from the same custom object) => valuelist viewport
							// was length 0; this whole if can be removed once groupingtable's package will require Servoy >= 8.3.3
							
							// fall back to what was done previously - use root valuelist and foundset to resolve stuff (which will probably work except for related valuelists)
							column = $scope.model.columns[newGetColumnIndex(colId)];
							foundsetRows = $scope.model.myFoundset.viewPort.rows;
						}
						
						var idxInFoundsetViewport = -1;
						for (var idx in foundsetRows) {
							if (foundsetRows[idx][$foundsetTypeConstants.ROW_ID_COL_KEY].indexOf(rowId) == 0) {
								idxInFoundsetViewport = idx;
								break;
							}
						}
						
						if (idxInFoundsetViewport >= 0 && idxInFoundsetViewport < column.valuelist.length) {
							return asCodeString ? ".valuelist[" + idxInFoundsetViewport + "]" : column.valuelist[idxInFoundsetViewport];
						} else if (!column.valuelist[$sabloConverters.INTERNAL_IMPL]["recordLinked"] && column.valuelist.length > 0) {
							return asCodeString ? ".valuelist[0]" : column.valuelist[0];
						}

						$log.error('Cannot find the valuelist entry for the row that was clicked.');
						return null;
					}
					
					return asCodeString ? ".valuelist" : column.valuelist;
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

						var colIdx = newGetColumnIndex(params.column);
						var column = $scope.model.columns[colIdx];
						
						if (this.editType == 'TYPEAHEAD') {
							this.eInput.className = "ag-table-typeahed-editor-input";
							if (params.column.actualWidth) {
								this.eInput.style.width = params.column.actualWidth + 'px';
							}
							
							var getVLAsCode = getValuelist(params, true);
							this.eInput.setAttribute("uib-typeahead", "value.displayValue | formatFilter:model.columns[" + colIdx + "].format.display:model.columns[" + colIdx + "].format.type for value in " + (getVLAsCode == null ? "null" : "model.columns[" + colIdx + "]" + getVLAsCode + ".filterList($viewValue)"));
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
								valuelistValuesPromise
									.then(function(valuelistValues) {
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
						if (this.initialValue && this.initialValue.displayValue != undefined) {
							this.initialValue = this.initialValue.displayValue;
						}
						var v = this.initialValue;
						if (column && column.format) {
							this.format = column.format;
							if (this.format.maxLength) {
								this.eInput.setAttribute('maxlength', this.format.maxLength);
							}
							if (this.format.edit) {
								v = $formatterUtils.format(v, this.format.edit, this.format.type);
							}

							if (v && this.format.type == "TEXT") {
								if (this.format.uppercase) {
									v = v.toUpperCase();
								} else if (this.format.lowercase) {
									v = v.toLowerCase();
								}
							}
						}
						this.initialDisplayValue = v;

						var thisEditor = this;
						// CHECKME duplication with other keyboard nav code?
						this.keyDownListener = function (event) {
							var isNavigationLeftRightKey = event.keyCode === 37 || event.keyCode === 39;
							var isNavigationUpDownEntertKey = event.keyCode === 38 || event.keyCode === 40 || event.keyCode === 13;

							if (isNavigationLeftRightKey || isNavigationUpDownEntertKey) {

								if (isNavigationUpDownEntertKey && (thisEditor.editType == 'TEXTFIELD')) {
									var newRowIndex = -1;
									if ( event.keyCode == 38) { // UP
										newRowIndex = thisEditor.params.rowIndex - 1;
									} else if (event.keyCode == 13 || event.keyCode == 40) { // ENTER/DOWN
										newRowIndex = thisEditor.params.rowIndex + 1;
										if ( newRowIndex >= gridOptions.api.getModel().getRowCount()) {
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
											colKey: thisEditor.params.column
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
							
							if (!(isNavigationLeftRightKey || isNavigationUpDownEntertKey) && $formatterUtils.testForNumbersOnly && thisEditor.format) {
								return $formatterUtils.testForNumbersOnly(event, null, thisEditor.eInput, false, true, thisEditor.format);
							}
							
							return true;
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
						if (this.editType == 'TEXTFIELD') {
							this.eInput.select();
						}
						if (this.format && this.format.edit && this.format.isMask) {
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
						if (this.editType == 'TYPEAHEAD') {
							var ariaId = $(this.eInput).attr('aria-owns');
							var activeItem = $('#' + ariaId).find("li.active");
							if (activeItem.length) {
								var activeAnchor = activeItem.find('a');
								if (activeAnchor.is(":hover")) {
									displayValue = activeAnchor.text();
								}
							}
						}
						if (this.format) {
							if (this.format.edit) {
								displayValue = $formatterUtils.unformat(displayValue, this.format.edit, this.format.type, this.initialValue);
							}
							if (this.format.type == "TEXT" && (this.format.uppercase || this.format.lowercase)) {
								if (this.format.uppercase) {
									displayValue = displayValue.toUpperCase();
								} else if (this.format.lowercase) {
									displayValue = displayValue.toLowerCase();
								}
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
									} else if (this.initialValue == null) { // if the dataproviderid was null and we are in real|display then reset the value to ""
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
						if (this.editType == 'TYPEAHEAD') {
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
						var column = $scopes.model.columns[newGetColumnIndex(params.column)]
						if (column && column.format && column.format.edit) {
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
						if (theDateTimePicker) theDateTimePicker.destroy();
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
							
							if (v && v.displayValue != undefined) {
								v = v.displayValue;
							}
							valuelistValuesPromise
								.then(function(valuelistValues) {
									valuelistValues.forEach(function (value) {
										var option = document.createElement('option');
										option.value = value.realValue == null ? '_SERVOY_NULL' : value.realValue;
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
						var realValue = this.eSelect.value == '_SERVOY_NULL' ? null : this.eSelect.value;
						return displayValue != realValue ? {displayValue: displayValue, realValue: realValue} : realValue;
					};

					SelectEditor.prototype.destroy = function() {
						this.eSelect.removeEventListener('keydown', this.keyListener);
						this.eSelect.removeEventListener('mousedown', this.mouseListener);
					};

					return SelectEditor;
				}

				// **************************** Enterprise Model **************************** //
				/**
				 * Implements the IServerSideDatasource interface of AG Grids Serverside Row Model
				 * 
				 * @see https://www.ag-grid.com/javascript-grid-server-side-model/
				 */
				function FoundSetDatasource() {
					this.server = new FoundSetServer();
				}

				/**
				 * getRows from IServerSideDatasource interface
				 * 
				 * delegates to FoundSetServer.getData to actually return the data, as the data might already be available in a foundset client-side
				 * 
				 * After getData returns the rows, getRows passes them to the AG Grid and then does post processing, to handle selection, group expand/collapse etc
				 */
				FoundSetDatasource.prototype.getRows = function(params) {
					$log.debug('FoundSetDatasource.getRows: params = ', params);

					var dataSource = this;
					var rowGroupCols = params.request.rowGroupCols; // the row group cols, ie the cols that the user has dragged into the 'group by' zone, eg 'Country' and 'Customerid'
					var groupKeys = params.request.groupKeys; // the keys we are looking at. will be empty if looking at top level (either no groups, or looking at top level groups). eg ['United States','2002']
					var valueListLookupPromises = [];

					// resolve valuelist display values for the groups to real values
					for (var i = 0; i < groupKeys.length; i++) {
						if (groupKeys[i] === NULL_DISPLAY_VALUE) {
							groupKeys[i] = null;	// reset to real null, so we use the right value for grouping
						} else {
							var vl = getValuelistEx(params.parentNode.data, rowGroupCols[i]['id'], false);

							if (vl) {
								var idx = i;
								
								valueListLookupPromises.push(vl.filterList(groupKeys[i])); // CHECKME/FIXME This bombs out when the column has a valueList that is based on a unstored calculation (same goes for all other usage of filterList in teh codebase)
								
								valueListLookupPromises[valueListLookupPromises.length - 1]
									.then(function(valuelistValues) {
										if (valuelistValues && valuelistValues.length) {
											if (valuelistValues[0] && valuelistValues[0].realValue != undefined) {
												groupKeys[idx] = valuelistValues[0].realValue;
											}
										}
									});
							}
						}
					}

					// Once all valueListLookupPromises are resolved, call getData to actually get the data for the requested rows
					$q
						.all(valueListLookupPromises)
						.then(function() {
							dataSource.server.getData(params.request, groupKeys, function (resultForGrid, lastRow) {
								var model = gridOptions.api.getModel();

								// CHECKME if resultForGrid.length == 0 and the fetch is for group children, maybe refresh the group row's foundset, as apparently there's a group w/o children?
								//		   should be implemented only after making sure the joins based on related dataproviders are added using the proper outer join, otherwise resultForGrid.length == 0 might be a false negative
								//		   and should make sure that the refresh doesn't cause expanded or selection state to get lost
								params.successCallback(resultForGrid, lastRow); // passing back the requested rows to AG Grid, by calling the successCallback they provided in the getRows call

								selectedRowIndexesChanged();

								// special handling when in group mode to mimic AG Grid features that aren't enabled when using the serverside rowmodel
								if ($scope.isGroupView) {
									var groupState = getGroupPersistState(groupKeys);
									
									// TODO move code below to GroupManager
									
									// Expanded/collapsed state handling
									expandCollapse: if (typeof gridOptions.groupDefaultExpanded === 'number' && params.request.rowGroupCols.length && (gridOptions.groupDefaultExpanded === -1 || gridOptions.groupDefaultExpanded > groupKeys.length)) { // emulate groupDefaultExpanded setting
										for (var index = 0; index < resultForGrid.length; index++) {
											var node = model.getRowNode(resultForGrid[index]._svyFoundsetUUID + '_' + resultForGrid[index]._svyRowId)
											node.setExpanded(true);
										}
									} else if (groupKeys.length < params.request.rowGroupCols.length && groupState && groupState.children) { // Apply desired expanded state
										var nodeValuesToExpand = Object.keys(groupState.children).reduce(function(accumulator, currentValue) {
											if (groupState.children[currentValue].expanded === true) {
												accumulator.push(currentValue);
											}
											return accumulator
										}, [])
										
										if (nodeValuesToExpand.length) {
											var field = params.request.rowGroupCols[groupKeys.length].field
											
											for (var index = 0; nodeValuesToExpand.length && index < resultForGrid.length; index++) { // CHECKME Maybe use a binary search impl. instead of sequential looping? see https://stackoverflow.com/questions/10264239/fastest-way-to-determine-if-an-element-is-in-a-sorted-array
												var nodeToExpandIndex = nodeValuesToExpand.indexOf(resultForGrid[index][field]);
												
												if (nodeToExpandIndex !== -1) {
													var node = model.getRowNode(resultForGrid[index]._svyFoundsetUUID + '_' + resultForGrid[index]._svyRowId)
													
													if (!node) continue; // On browser refresh its sometimes null?!?!? Need to investigate it, but just ignoring it for now. Maybe some thing is happening twice, because in the end the grid renders properly...

													node.setExpanded(true);

													nodeValuesToExpand.splice(nodeToExpandIndex, 1);
												}
											}
										}
									}
								}

								//TODO the selection restore code below probably should be done conditionally on the root foundset based on the selection handling is disconnected from the servoy foundset selection model								
								// restore selection
								var parentSelected = params.parentNode.group && params.parentNode.selected;

								// TODO combine the loop through resultForGrid here with the one(s) for expanded state and optimize early break if all expands and selections are done already
								for (var i = 0; i < resultForGrid.length; i++) {
									var row = resultForGrid[i];
									var node = model.getRowNode(row._svyFoundsetUUID + '_' + row._svyRowId)

									if (!node) continue; // somehow its sometimes null....

									var desiredSelectionState = parentSelected || getDesiredNodeSelectedState(node);

									//if (node.selected !== selectedState) { // can happen already has the proper selection state when collapsing previously collapsed nodes with selected children
										node.selectThisNode(desiredSelectionState); // CHECKME should it check whether the node is selectable?
										// TODO clear pks in relevant groupState
										// CHECKME maybe check if the child keys stored in groupState still exist and if not delete?
									//}
								}
							});
						})
						.catch(function(reason) {
							$log.error('Can not get realValues for groupKeys ' + reason);
						});
				};

				function FoundSetServer() {}

				/**
				 * looks for an existing Foundset and otherwise gets a new Foundset
				 * then makes sure the requested record indexes are loaded into the viewport of the FoundSet
				 * then returns the data for the requested rows
				 * 
				 * @protected
				 * 
				 * @param {AgDataRequestType} request
				 * @param {Array} groupKeys
				 * @param {Function} callback callback(data, isLastRow)
				 */
				FoundSetServer.prototype.getData = function(request, groupKeys, callback) {
					$log.debug(request);

					var rowGroupCols = request.rowGroupCols; // the row group cols, i.e. the cols that the user has dragged into the 'group by' zone, eg 'Country' and 'Customerid'
					var valueCols = request.valueCols; // if going aggregation, contains the value columns, eg ['gold','silver','bronze']
					var allPromises = [];
					var filterModel = gridOptions.api.getFilterModel();
					var updatedFilterModel = {};
					
					var sUpdatedFilterModel;
					
					// create filter model with column indexes that we can send to the server
					// CHECKME not sure why this logic is here, why not use to 'filterChanged' event on the grid to handle changes? It does fires before getRows gets called
					for (var field in filterModel) { // filterModel exposes the current filters by field value, so not colId!!
						var columnIndex = getColumnIndexByField(field); // PB
						
						if (columnIndex != -1) {
							updatedFilterModel[columnIndex] = filterModel[field];
						}
					}
					sUpdatedFilterModel = JSON.stringify(updatedFilterModel);
					
					// if filter is changed, apply it on the root foundset, and clear the foundset cache if grouped
					if (sUpdatedFilterModel != $scope.model.filterModel && !(sUpdatedFilterModel == "{}" && $scope.model.filterModel == undefined)) {
						$scope.model.filterModel = sUpdatedFilterModel;
						var filterMyFoundsetArg = [];
						filterMyFoundsetArg.push(sUpdatedFilterModel);

						if (rowGroupCols.length) {
							groupManager.removeGroupsAtLevel(0);
							filterMyFoundsetArg.push("{}");
						} else {
							filterMyFoundsetArg.push(sUpdatedFilterModel);
						}
						allPromises.push($scope.svyServoyapi.callServerSideApi("filterMyFoundset", filterMyFoundsetArg));
					}

					var sortModel = request.sortModel;
					var sortRootGroup = false;

					// if clicking sort on the grouping column
					if (rowGroupCols.length > 0 &&
						sortModel[0] &&
						(
							sortModel[0].colId === ("ag-Grid-AutoColumn-" + rowGroupCols[0].id) ||
							sortModel[0].colId === rowGroupCols[0].id
						)
					   ) {
						// replace colId with the id of the grouped column						
						sortModel = [{
							colId: rowGroupCols[0].field,
							sort: sortModel[0].sort
						}];
						
						if (!state.rootGroupSort  ||
							state.rootGroupSort.colId != sortModel[0].colId ||
							state.rootGroupSort.sort != sortModel[0].sort
						   ) {
							sortRootGroup = true;
							state.rootGroupSort = sortModel[0];
						}
					}
					
					var foundsetSortModel = convertToFoundSetSortModel(sortModel);
					var sortString = foundsetSortModel.sortString;

					$log.debug("Group " + (rowGroupCols[0] ? rowGroupCols[0].displayName : '/') + ' + ' + (groupKeys[0] ? groupKeys[0] : '/') + ' # ' + request.startRow + ' # ' + request.endRow);

					// Sort on the foundset Group
					if (sortRootGroup) { // no sort need to be applied
						// Should change the foundset with a different sort order
						allPromises.push(groupManager.createOrReplaceFoundsetRef(rowGroupCols, groupKeys, sortModel[0].sort));
					} else {
						// get the foundset reference
						allPromises.push(groupManager.getFoundSetUUID(rowGroupCols, groupKeys));
					}

					$q
						.all(allPromises)
						.then(function (args) {
							var foundsetUUID = args[args.length - 1];

							// TODO search in state first ?
							// The foundsetUUID exists in the foundsetHashmap groupManager (UUID) group, in the foundsetHashmap and in the state?
							var foundsetRefManager = getFoundsetManagerByFoundsetUUID(foundsetUUID);

							if (sortString === "") {
								// TODO restore a default sort order when sort is removed
								// $log.warn(" Use the default foundset sort.. which is ? ");
							}

							// if not sorting on a group column
							if (rowGroupCols.length === groupKeys.length && sortString && sortString != foundsetRefManager.getSortColumns()) { // if is a group column and sort string is different
								$log.debug('CHANGE SORT REQUEST');
								foundsetSortModel = convertToFoundSetSortModel(sortModel)
								sortPromise = foundsetRefManager.sort(foundsetSortModel.sortColumns);
								sortPromise
									.then(function() {
										getDataFromFoundset(foundsetRefManager);
										
										// give time to the foundset change listener to know it was a client side requested sort
										setTimeout(function() {
											sortPromise = null;
										}, 0);
									})
									.catch(function(e) {
										sortPromise = null
									});
							} else {
								getDataFromFoundset(foundsetRefManager);
							}
						})
						.catch(handleUnexpectedError);

					/**
					 * getDataFromFoundset Promise Callback
					 *
					 * @protected
					 * 
					 * @param {FoundsetManager} foundsetRef the foundsetManager object
					 */
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
							if (request.startRow >= gridOptions.cacheBlockSize && request.endRow >= endIndex) {
								requestViewPortStartIndex = request.startRow - gridOptions.cacheBlockSize;
							} else {
								requestViewPortStartIndex = request.startRow;
							}

							var requestViewPortEndIndex = request.endRow - requestViewPortStartIndex;
							var size = request.endRow - request.startRow;

							$log.debug('Load async ' + requestViewPortStartIndex + ' - ' + requestViewPortEndIndex + ' with size ' + size);
							foundsetManager
								.loadExtraRecordsAsync(requestViewPortStartIndex, size, false)
								.then(function() {
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

									var result = foundsetManager.getViewPortData(viewPortStartIndex, viewPortEndIndex);
									callback(result, lastRowIndex);
	
								})
								.catch(handleUnexpectedError);
						} else {
							callback(foundsetManager.getViewPortData(viewPortStartIndex, viewPortEndIndex), foundsetManager.getLastRowIndex());
						}
					}

					function handleUnexpectedError(e) {
						$log.error(e);
						gridOptions.columnApi.setRowGroupColumns([]);
					}
				}; // End getData

				function initRootFoundset() {
					foundset = new FoundSetManager($scope.model.myFoundset, ROOT_FOUNDSET_ID);

					// default selection
					selectedRowIndexesChanged();

					// default sort order
					gridOptions.api.setSortModel(getRootFoundSetSortModel());

//					gridOptions.api.purgeServerSideCache();

//					$scope.dirtyCache = false;
				}

				// **************************** Watches **************************** //
				$scope.$watch("model.myFoundset", function(newValue, oldValue) {
					$log.debug('myFoundset root changed');
					
					// Don't do something like the line below: Angular always calls a watch once after registering it 
					//    in the case that the grid is reshown (in a dialog for example), oldValue might equal newValue
					//    but the logic below still needs to execute
					//if (newValue === oldValue) return;

					if (oldValue) {
						oldValue.removeChangeListener(changeListener);
					}
					
					$scope.model.myFoundset.addChangeListener(changeListener);
					
// CHALLENGE initRoot triggers AG Grid to start fetching stuff due to setting sortModel,
//   but purge below will again. How to prevent?
//   Cannot make it conditional if oldValue === newValue, because that happens when initializing the component on consequtive shows

//					if (oldValue !== newValue || !foundset) {
//						initRootFoundset();
//						
//						if ($scope.isGroupView) { // CHECKME maybe only do this when the grid has already been rendered? But wouldn't $scope.isGroupView return false already in such case?
//							//$scope.purge();
//						}
//					}

					if (foundset) {
						// TODO raise a bug for this
						// This happens when teh grid is shown consequtive times in the same dialog
						if (oldValue !== newValue && oldValue.foundsetId === newValue.foundsetId) {
							foundset.foundset = newValue
						} else if ($scope.isGroupView) { // CHECKME maybe only do this when the grid has already been rendered? But wouldn't $scope.isGroupView return false already in such case?
							groupManager.removeGroupsAtLevel(0);
						}
					}
					
					initRootFoundset();
				});
				
				gridOptions.api.setServerSideDatasource(new FoundSetDatasource());

				/**
				 * sets the visibility of the checkbox on the first column, based on model.checkboxSelection property
				 * 
				 * @param {boolean} newValue
				 * @param {boolean} oldValue
				 */
				function modelCheckboxSelectionWatch(newValue, oldValue) {
					// watches always fire at least once when registered and when that happens the old and new values are equal.
					if (newValue === oldValue && newValue === false) {
						return;
					}
					
					var firstColumn = gridOptions.columnApi.getAllDisplayedColumns()[0];
					
					if (!firstColumn) return;
					
					if (firstColumn.colId === 'ag-Grid-AutoColumn') {
						if (!firstColumn.colDef.cellRendererParams) {
							firstColumn.colDef.cellRendererParams = {};
						}
						
						firstColumn.colDef.cellRendererParams.checkbox = newValue;
					} else {
						firstColumn.colDef.checkboxSelection = newValue;
					}
					
					gridOptions.api.redrawRows()
				}
				
				$scope.$watch("model.checkboxSelection", modelCheckboxSelectionWatch);
				
				var columnWatches = [];
				
				$scope.$watchCollection("model.columns", function(newValue, oldValue) {
					$log.debug('columns changed');
					for (var i = 0; i < columnWatches.length; i++) {
						columnWatches[i]();
					}
					columnWatches.length = 0;
					
					if (!newValue) return;
					
					var columnKeysToWatch = [
						"headerStyleClass",
						"headerTooltip",
						"styleClass",
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
					
					for (var i = 0; i < $scope.model.columns.length; i++) {
						for (var j = 0; j < columnKeysToWatch.length; j++) {
							var columnWatch = $scope.$watch("model.columns[" + i + "]['" + columnKeysToWatch[j] + "']",
							function(newValue, oldValue) {
								if (newValue != oldValue) {
									$log.debug('column property changed');
									updateColumnDefs();
								}
							});
							columnWatches.push(columnWatch);
						}
						
						// watch visibility
						watchColumnVisible(i)
						
						// CHECKME the watches for tileHeader and footerText aren't added to columnWatches. Is that correct?
						// watch titleHeader
						watchColumnHeaderTitle(i);
						watchColumnFooterText(i);
					}

					if (newValue != oldValue) {
						updateColumnDefs();
					}
				});

				function watchColumnVisible(i) {
					columnWatches.push($scope.$watch("model.columns[" + i + "].visible", function(newValue, oldValue) {
						if (typeof newValue !== 'boolean') {
							return;
						}
						
						var column = gridOptions.columnApi.getAllColumns()[i];
						
						if (column && column.hide === newValue) {
							gridOptions.columnApi.setColumnVisible(column, newValue);
						}
					}));
				}

				/**
				 * @private 
				 */
				function watchColumnHeaderTitle(index) {
					$scope.$watch("model.columns[" + i + "].headerTitle", function(newValue, oldValue) {
						if (newValue != oldValue) {
							$log.debug('header title column property changed');
							
							var col = gridOptions.columnApi.getAllColumns()[i];
							if (!col) {
								$log.warn("cannot update header title for column at position index " + i);
								return;
							}
							
							updateColumnHeaderTitle(col, newValue);
						}
					});
				}
				
				function watchColumnFooterText(index) {
					var columnWatch = $scope.$watch("model.columns[" + index + "]['footerText']",
						function(newValue, oldValue) {
							if (newValue != oldValue) {
								$log.debug('footer text column property changed');
								gridOptions.api.setPinnedBottomRowData(getFooterData());
							}
					});
				}

				$scope.$watch("model._internalColumnState", function(newValue, oldValue) {
					if (isGridReady && newValue !== "_empty") {
						$scope.model.columnState = newValue;
						// need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
						$scope.model._internalColumnState = "_empty";
						applyModelProperty('_internalColumnState')
						
						if ($scope.model.columnState) {
							restoreColumnsState();
							//TODO may be better find other way then force to update state when _internalColumnState changed
							//also check if restoreColumnsState passed
							// the problem exist only when called from server sideb $scope.api.restoreColumnState = function(columnState, onError) {.. from onReady  
							// may be set on model global flag(in spec) and init it inside $scope.api.restoreColumnState
							storeColumnsState(true)
						} else {
							gridOptions.columnApi.resetColumnState();
						}
					}
				});				

				// **************************** Foundset Managment **************************** //
				/**
				 * Wrapper around the clientside representation of Servoy FoundSet 
				 * 
				 * Handle viewPort, row, sort, isLastRow of a foundsetReference object
				 *
				 * @constructor
				 *
				 * TODO maybe rename to GroupFoundSet? Because this is not a manager of foundsets, but a wrapper around a single foundset
				 */
				function FoundSetManager(foundsetRef, foundsetUUID) {
					var thisInstance = this;
					var awaitingSortChangeBlocker;

					// properties
					this.foundset = foundsetRef;
					this.isRoot = foundsetUUID === ROOT_FOUNDSET_ID
					this.foundsetUUID = foundsetUUID;

					/** return the viewPort data in a new object
					 * @param {Number} [startIndex]
					 * @param {Number} [endIndex]
					 */
					this.getViewPortData = function(startIndex, endIndex) {
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
							for (var i = 0; i < $scope.model.hashedFoundsets.length; i++) { // TODO should make this into a utility function
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
					this.getViewPortRow = function(index, columnsModel) {
						var row;
						try {
							row = {};
							// push the id so the rows can be merged
							var viewPortRow = this.foundset.viewPort.rows[index];
							if (!viewPortRow) {
								$log.error("Cannot find row " + index + ' in foundset ' + this.foundsetUUID + ' size ' + this.foundset.viewPort.size + ' startIndex ' + this.foundset.viewPort.startIndex);
								return null;
							}

							row._svyRowId = viewPortRow._svyRowId;
							row._svyFoundsetUUID = this.foundsetUUID;

							var columns = columnsModel ? columnsModel : $scope.model.columns;

							// push each dataprovider
							for (var i = 0; i < columns.length; i++) {
								if (Array.isArray(columns[i].dataprovider)) {
									row[getFieldValueForColumn(i, columns)] = columns[i].dataprovider[index];
								}
							}
							
							return row;
						} catch (e) {
							$log.error(e);
						}
						return null;
					}

					this.hasMoreRecordsToLoad = function() {
						return thisInstance.foundset.hasMoreRows || (thisInstance.foundset.viewPort.startIndex + thisInstance.foundset.viewPort.size) < thisInstance.foundset.serverSize;
						//						return thisInstance.foundset.hasMoreRows || thisInstance.foundset.viewPort.size < thisInstance.foundset.serverSize;
					}

					this.getLastRowIndex = function() {
						if (this.hasMoreRecordsToLoad()) {
							return -1;
						} else {
							return thisInstance.foundset.serverSize;
						}
					}

					this.loadExtraRecordsAsync = function(startIndex, size, dontNotifyYet) {
						// TODO use loadExtraRecordsAsync to keep cache small
						size = (size * gridOptions.maxBlocksInCache) + size;

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

						//var promise = this.foundset.loadExtraRecordsAsync(size);
						// TODO can it handle multiple requests ?
						var promise = this.foundset.loadRecordsAsync(startIndex, size);
						promise.finally(function(e) {
							// foundset change listener that checks for 'state.waitfor.loadRecords' is executed later,
							// as last step when the response is processed, so postpone clearing the flag
							if (isRootFoundset) {
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

					this.getSortColumns = function() {
						return thisInstance.foundset ? thisInstance.foundset.sortColumns : null;
					}

					this.sort = function(sortString) {
						if (sortString) {
							// TODO check sort
							return thisInstance.foundset.sort(sortString);
						}
					}

					/**
					 * @return {Number} return the foundset index of the given row in viewPort (includes the startIndex diff)
					 */
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

						// CHECKME arent sorts (or any change basically) on these FSes always triggered from the client?
						if (awaitingSortChangeBlocker || change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED]) {
							if (change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED]) {
								if (awaitingSortChangeBlocker) { // FIXME just put in this IF to prevent it erroring out if awaitingSortChangeBlocker is null. No idea what that does though...
									awaitingSortChangeBlocker.resolve(); // FIXME awaitingSortChangeBlocker might be null!!!
								}
								
								$log.debug('Change Group Sort Model ' + change[$foundsetTypeConstants.NOTIFY_SORT_COLUMNS_CHANGED].newValue);
							}

							return;
						}

						if (change[$foundsetTypeConstants.NOTIFY_SELECTED_ROW_INDEXES_CHANGED]) { // CHECKME is the foundste selection model used at all?
							selectedRowIndexesChanged(thisInstance);
						}

						if (change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED]) {
							var updates = change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED].updates;
							$log.debug(updates)
							updateRows(updates);
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
				}

				/**
				 * @constructor
				 *
				 * @public
				 * 
				 * @param {String} id
				 */
				function GroupNode(id) {
					this.id = id;
					this.nodes = {};
					this.foundsetUUID = undefined;

					var thisInstance = this;

					/**
					 * Calls the callback sequentially for each childNode
					 * @public
					 * 
					 * @param {Function} callback execute function for each subnode. Arguments GroupNode
					 */
					this.forEach = function(callback) {
						for (var key in this.nodes) {
							callback.call(this, this.nodes[key]);
						}
					}

					/**
					 * @public
					 * 
					 * @param {Function} callback execute function for each subnode until returns true. Arguments GroupNode
					 * 
					 * @return {Boolean} returns true if the callback ever returns true
					 */
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
					 * 
					 * @return {Boolean} returns true if the callback ever returns true
					 */
					this.hasNodes = function() {
						return Object.keys(this.nodes).length > 0;
					}

					/**
					 * @public
					 * @remove the node
					 */
					this.destroy = function() {

						$log.debug('--Destroy ' + this.foundsetUUID + ' - id : ' + this.id);
						// destroy all it's sub nodes
						this.removeAllSubNodes();

						// do nothing if the foundset doesn't exist
						if (this.foundsetUUID && this.foundsetUUID !== ROOT_FOUNDSET_ID) {
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
						this.nodes = {};
					}
				}

				/**
				 * Used by GroupManager to cache and track foundsets by rowGroupCol and groupKeys criteria.
				 * Any time a foundset is retrieved is persisted in this object.
				 *
				 * @constructor
				 * 
				 * Question: can i use an hash instead of a tree structure ? e.g hash of columnName:keyValue,columnName:keyValue..
				 *
				 * TODO is not stateful (lost once is refreshed) while the foundset are statefull, potentially can create memory leaks (too many foundset for the same criteria retrieved)
				 * TODO desist foundset from memory. Remove foundset
				 * 		Clear ALL
				 * 		Clear Node
				 * 		Clear ALL subnodes
				 */
				function GroupHashCache() {

					var rootGroupNode = new GroupNode(ROOT_FOUNDSET_ID);

					// **************************** public methods **************************** //
					/**
					 * @public 
					 * 
					 * @return {GroupNode}
					 */
					this.getTreeNode = function(rowGroupCols, groupKeys) {
						return getTreeNode(rootGroupNode, rowGroupCols, groupKeys);
					}
					
					/**
					 * @public
					 */
					this.getCachedFoundSetUUID = function(rowGroupCols, groupKeys) {
						var node = getTreeNode(rootGroupNode, rowGroupCols, groupKeys);
						return node ? node.foundsetUUID : null;
					}

					/**
					 * @public
					 * 
					 * @return {GroupNode}
					 */
					this.setCachedFoundset = function(rowGroupCols, groupKeys, foundsetUUID) {
						var tree = getTreeNode(rootGroupNode, rowGroupCols, groupKeys, true);
						tree.foundsetUUID = foundsetUUID;
						
						return tree;
					}

					/**
					 * Remove the node
					 * 
					 * @public
					 * 
					 * @param {String} foundsetUUID
					 */
					this.removeCachedFoundset = function(foundsetUUID) {
						return removeFoundset(rootGroupNode, foundsetUUID);
					}

					/**
					 * Remove the node 
					 * 
					 * @public
					 * 
					 * @param {Number} level
					 */
					this.removeCachedFoundsetAtLevel = function(level) {
						return removeFoundsetAtLevel(rootGroupNode, level);
					}

					/**
					 * Remove all it's child node
					 * 
					 * @public
					 * 
					 * @param {String} foundsetUUID
					 * @param {String} [field]
					 * @param {String} [value]
					 */
					this.removeChildFoundset = function(foundsetUUID, field, value) {
						return removeChildFoundsets(rootGroupNode, foundsetUUID, field, value);
					}

					// **************************** internal methods **************************** //
					/**
					 * @param {GroupNode} tree
					 * @param {String} foundsetUUID
					 * @return Boolean
					 */
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
					 */
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
					 */
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
					 */
					function getTreeNode(tree, rowGroupCols, groupKeys, create) {
						var result = null;

						if (rowGroupCols.length > groupKeys.length + 1) {
							// $log.warn('discard row groups ' + (rowGroupCols.length - groupKeys.length));
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
						 */

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
								$log.warn("No group criteria, this should not happen");
							}
						} else if (rowGroupCols.length > 1) { // is not the last group
							var key = groupKeys[0];

							if (!colTree) {
								$log.warn("No colTree, this should not happen")
								return null;
							}

							var subTree = colTree;

							if (key !== undefined) {
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
								$log.warn("Not the last group, but also no criteria. This should not happen")
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
					 */
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
					 */
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

					// enable testMethods
					/**
					 * @param {String} foundsetUUID
					 */
					this.getGroupNodeByFoundsetUUID = function(foundsetUUID) {
						return getGroupNodeByFoundsetUUID(rootGroupNode, foundsetUUID);
					};

					/**
					 * @param {String} foundsetUUID
					 */
					this.getParentGroupNode = function(foundsetUUID) {
						return getParentGroupNode(rootGroupNode, foundsetUUID);
					};
				}

				/**
				 * Singleton class to manage grouping for the serverside row model implemented with Servoy FoundSets
				 * 
				 * @constructor
				 * 
				 * TODO pass root foundset as argument and use Servoys unitue id for each foundset as the root identifier
				 * TODO allow passing additional (persisted) state to the GroupManager
				 * TODO instantiate a new GroupManager everytime myfroundset is set
				 * TODO store all state related to groups inside GroupManager and let GroupManager persist what needs persiting to the server
				 */
				function GroupManager() { //Rename to Serverside Rowmodel Group Manager?
					var hashTree = new GroupHashCache();

					// **************************** public methods **************************** //
					/**
					 * Returns the UUID of the foundset for the given grouping criteria
					 * 
					 * Does NOT load a new Foundset form the server if no FoundSet is already cached for the given criteria
					 *
					 * This can be used for synchronous grid callbacks that need to fetch stuff from the already loaded & cached foundsets
					 *
					 * @public
					 *
					 * @param {Array} rowGroupCols
					 * @param {Array} groupKeys
					 *
					 * @return {String} returns the UUID of the foundset if exists in cache
					 */
					this.getCachedFoundSetUUID = function(rowGroupCols, groupKeys) {
						return hashTree.getCachedFoundSetUUID(rowGroupCols, groupKeys);
					}

					/**
					 * Returns the UUID of the foundset for the given grouping criteria
					 * 
					 * Fetches a new Foundset from the server if there's no cached Foundset yet for the given criteria
					 *
					 * @public
					 *
					 * @param {Array} rowGroupCols
					 * @param {Array} groupKeys
					 * @param {string} [sort] desc or asc. Default asc
					 *
					 * @return {PromiseType} returns a promise
					 */
					this.getFoundSetUUID = function(rowGroupCols, groupKeys, sort) {
						function getRowColumnHashFoundset(index) {
							function continueOrResolve(foundsetUUID) {
								if (index === rowGroupCols.length - 1) { // resolve when last rowColumn foundset has been loaded
									resultPromise.resolve(foundsetUUID);
								} else {
									getRowColumnHashFoundset(index + 1); // load the foundset for the next group
								}
							}
							
							var groupCols = rowGroupCols.slice(0, index + 1);
							// to prevent proper retrieval of already cached foundsets, only continue with the relevant keys for the current index
							var keys = rowGroupCols.length === groupKeys.length && index === rowGroupCols.length - 1 ? groupKeys : groupKeys.slice(0, index);
							
							$log.debug(groupCols);
							$log.debug(keys);

							// get cached GroupNode, if exists
							var node = hashTree.getTreeNode(groupCols, keys);
							
							if (node && node.foundsetUUID) { // the foundset is already cached
								continueOrResolve(node.foundsetUUID)
							} else if (node && node.promise) { // the foundset is in the process of being cached
								node.promise.then(continueOrResolve)
							} else { // the foundset not yet cached, so request a new one from the server
								// get the index of each grouped column
								var groupColumnIndexes = [];
								
								for (var idx = 0; idx < groupCols.length; idx++) {
									groupColumnIndexes.push(newGetColumnIndex(rowGroupCols[idx]));
								}

								var node = hashTree.setCachedFoundset(groupCols, keys, null);
								node.promise = getNewFoundSetFromServer(groupColumnIndexes, keys, sort);
								
								node.promise
									.then(function(foundsetUUID) {
										$log.debug('Get hashed foundset success ' + foundsetUUID);

										// cache the foundsetRef
										node.foundsetUUID = foundsetUUID

										continueOrResolve(foundsetUUID)
									})
									.catch(function(error) {
										resultPromise.reject(error);
									});
							}
						}
						
						/** @type {PromiseType} */
						var resultPromise = $q.defer();

						// return the root foundset if no grouping criteria
						if (!rowGroupCols.length && !groupKeys.length) { // no group return root foundset
							resultPromise.resolve(ROOT_FOUNDSET_ID);
							return resultPromise.promise;
						}

						// ignore rowGroupColumns which are still collapsed (don't have a matchig key)
						rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);

						// Starting from the root foundset recursively get all foundsets for the current path, loading new foundsets from the server if required foundsets aren't yet cached
						getRowColumnHashFoundset(0);

						return resultPromise.promise;
					}

					/**
					 * Forces all (group and leaf) Foundsets to be reload with a query freshly derived from the root foundset
					 * 
					 * @public
					 */
					this.updateFoundsetRefs = function(rowGroupCols) {
						// TODO update all foundset refs instead of clearing all and getting new foundsets
						// results in closing all nodes and refresh all foundsets
						this.removeGroupsAtLevel(0);
						return this.getFoundSetUUID([rowGroupCols[0].colDef], []);
					}

					/**
					 * Creates a new foundset reference with the given group criterias.
					 * If a foundset reference with the given references already exists, will be overriden
					 *
					 * @public
					 */
					this.createOrReplaceFoundsetRef = function(groupColumns, groupKeys, sort) {
						var foundsetUUID = hashTree.getCachedFoundSetUUID(groupColumns, groupKeys);
						
						if (foundsetUUID) {
							this.removeFoundsetRef(foundsetUUID);
						}
						
						return this.getFoundSetUUID(groupColumns, groupKeys, sort);
					}

					/**
					 * @public
					 * 
					 * @param {number} level
					 */
					this.removeGroupsAtLevel = function(level) {
						return hashTree.removeCachedFoundsetAtLevel(level);
					}
					
					/**
					 * NOTE currently not used, but could be used to purge foundsets for collapsed groups
					 * 
					 * @public
					 * 
					 * @param {String} foundsetUUID
					 * @param {String} [field] if given delete only the child having field equal to value
					 * @param {Object} [value] if given delete only the child having field equal to value
					 */
					this.removeChildFoundsetRef = function(foundsetUUID, field, value) {
						return hashTree.removeChildFoundset(foundsetUUID, field, value);
					}
					
					// **************************** private methods **************************** //
					/**
					 * Calls the server to instantiate a new FoundSet for the provided group criteria
					 * 
					 * @private
					 * 
					 * @param {Array<Number>} groupColumns index of all grouped columns
					 * @param {Array} groupKeys value for each grouped column
					 * @param {String} [sort]
					 *
					 * @return {PromiseType} promise that resolves with the UUID of the newly created FoundSet
					 */
					function getNewFoundSetFromServer(groupColumns, groupKeys, sort) {
						var resultDeferred = $q.defer();
						var idsForFoundset = [];
						var visibleColumns = groupColumns.length === groupKeys.length ? gridOptions.columnApi.getAllDisplayedColumns() : []; // For leaf foundsets the server needs to know for which columns to set the dataprovider property if a lazydataprovider property is provided
						var args = [
							groupColumns,
							groupKeys,
							idsForFoundset,
							sort,
							$scope.model.filterModel,
							$scope.model.rowStyleClassDataprovider ? true : false,
							visibleColumns.map(function(column) {
								return column.colDef.field;
							}),
						];

						var i;

						// TODO store it in cache. Requires to be updated each time column array Changes
						for (i = 0; i < $scope.model.columns.length; i++) {
							idsForFoundset.push(getFieldValueForColumn(i));
						}

						$scope.svyServoyapi.callServerSideApi("getGroupedFoundsetUUID", args)
							.then(function(childFoundsetUUID) {
								$log.debug(childFoundsetUUID);
								
								if (!childFoundsetUUID) {
									$log.error("why i don't have a childFoundset ?");
									resultDeferred.reject("can't retrieve the child foundset");
								}

								// FIXME add listener somewhere else
								//childFoundset.addChangeListener(childChangeListener);
								resultDeferred.resolve(childFoundsetUUID);
							})
							.catch(function(e) {
								// propagate the error
								resultDeferred.reject(e);
							});

						return resultDeferred.promise;
					}
					
					/**
					 * @private
					 * Should this method be used ?
					 */
					this.removeFoundsetRef = function(foundsetUUID) {
						return hashTree.removeCachedFoundset(foundsetUUID);
					}
				}

				/**
				 * Get Foundset in hashMap by UUID
				 *
				 * @public
				 */
				function getFoundSetByFoundsetUUID(foundsetHash) {
					// TODO return something else here ?
					if (foundsetHash === ROOT_FOUNDSET_ID) return $scope.model.myFoundset;
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
				 * 
				 * @public
				 * 
				 * @return {FoundSetManager}
				 */
				function getFoundsetManagerByFoundsetUUID(foundsetHash) {
					if (!foundsetHash) return null;

					if (foundsetHash === ROOT_FOUNDSET_ID) return foundset;

					if (state.foundsetManagers[foundsetHash]) {
						// double check if foundset hashmap still exists
						if (!getFoundSetByFoundsetUUID(foundsetHash)) {
							$log.error('This should not happen: could not verify foundset exists in foundsetHashmap ' + foundsetHash);
							return null;
						}
						return state.foundsetManagers[foundsetHash];
					} else {
						var foundsetRef = getFoundSetByFoundsetUUID(foundsetHash);
						if (!foundsetRef) {
							$log.error('How can this happen?!?!?:  ' + foundsetHash);
							return null
						}
						var foundsetManager = new FoundSetManager(foundsetRef, foundsetHash);
						state.foundsetManagers[foundsetHash] = foundsetManager;
						return foundsetManager;
					}
				}

				/**
				 * remove the given foundset hash from the model hashmap (to clear the memory)
				 * 
				 * @public
				 */
				function removeFoundSetByFoundsetUUID(foundsetUUID) {
					if (foundsetUUID === ROOT_FOUNDSET_ID) {
						$log.error('Trying to remove root foundset');
					}

					// remove the hashedFoundsets
					$scope.svyServoyapi.callServerSideApi("removeGroupedFoundsetUUID", [foundsetUUID])
						.then(function(removed) {
							switch (removed) {
								case true:
									delete state.foundsetManagers[foundsetUUID];
									break;
								case false:
									$log.warn("could not delete hashed foundset " + foundsetUUID);
									break;
								case null:
									// This happens for example when the form the grid is on isn't showing anymore
							}
						})
						.catch(function(e) {
							$log.error(e);
						});
				}

				// **************************** Global Table Methods **************************** //
				/** Listener for the root foundset */
				function changeListener(change) {
					$log.debug("Root change listener is called " + state.waitfor.loadRecords);
					$log.debug(change);

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
	
						// TODO check with R&D, sortColumns is updated only after the viewPort is update or there could be a concurrency race. When i would know when sort is completed ?
						if (newSort && oldSort && newSort != oldSort) {
							$log.debug('myFoundset sort changed ' + newSort);
							gridOptions.api.setSortModel(getRootFoundSetSortModel());
							gridOptions.api.purgeServerSideCache();
						} else if (newSort == oldSort && !newSort && !oldSort) {
							$log.warn("this should not be happening");
						}
						// do nothing else after a sort ?
						// sort should skip purge
						return;
					}
			
					if (change[$foundsetTypeConstants.NOTIFY_MULTI_SELECT_CHANGED]) { // CHECKME only supported as of Servoy 2019.03
						var multiSelect = change[$foundsetTypeConstants.NOTIFY_MULTI_SELECT_CHANGED].newValue
						
						gridOptions.rowSelection = multiSelect ? 'multiple' : 'single'
						//console.log('gridOptions.rowSelection set: ' + gridOptions.rowSelection)
						gridOptions.api.redrawRows();
					}

					// if viewPort changes and startIndex does not change is the result of a sort or of a loadRecords
					if (change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROWS_COMPLETELY_CHANGED] && !state.waitfor.loadRecords) {
						$log.debug(idRandom + ' - 2. Change foundset serverside');
						$log.debug("Foundset changed serverside ");

						// CHECKME what if not grouped? Shouldn't a refresh happen in that case?
						if ($scope.isGroupView) {
							// Foundset state is changed server side, shall refresh all groups to match new query criteria

							//groupManager.updateFoundsetRefs(gridOptions.columnApi.getRowGroupColumns())
							//	.then(function() {
									$log.debug('refreshing datasource with success');
									gridOptions.api.purgeServerSideCache();
							//	})
							//	.catch(function(e) {
							//		$log.error(e);
							//		initRootFoundset();
							//	});
						}
						return;
					} else {
						$log.debug("wait for loadRecords request " + state.waitfor.loadRecords);
					}

					if (change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED]) {
						$log.debug(idRandom + ' - 4. Notify viewport row update');
						var updates = change[$foundsetTypeConstants.NOTIFY_VIEW_PORT_ROW_UPDATES_RECEIVED].updates;
						
						if (updateRows(updates)) {
							// i don't need a selection update in case of purge
							return;
						}
					}

					// gridOptions.api.purgeEnterpriseCache();
					if (change[$foundsetTypeConstants.NOTIFY_SELECTED_ROW_INDEXES_CHANGED]) {
						$log.debug(idRandom + ' - 3. Request selection changed');
						selectedRowIndexesChanged();
					}
				}

				/**
				 * Clears the current selection in the grid for the provided foundset and applies the (new) selection based on the selectedIndexes of the foundset
				 * 
				 * @param {FoundsetManager} foundsetManager default: root foundset
				 */
				function selectedRowIndexesChanged(foundsetManager) {
					// FIXME can't select the record when is not in viewPort. Need to synchronize with viewPort record selection
					$log.debug(' - 2.1 Request selection changes');

					// Disable selection when table is grouped
					if ($scope.isGroupView || $scope.model.disconnectedSelection) {
						return;
					}

					// clear selection
					var selectedNodes = gridOptions.api.getSelectedNodes();
					for (var i = 0; i < selectedNodes.length; i++) {
						selectedNodes[i].setSelected(false);
					}

					// CHANGE Seleciton
					if (!foundsetManager) {
						foundsetManager = foundset;
					}

					for (var i = 0; i < foundsetManager.foundset.selectedRowIndexes.length; i++) {
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
							var node = gridOptions.api.getRowNode(foundsetManager.foundsetUUID + '_' + rowId);
							
							if (node) {
								node.setSelected(true);
							}
						} else {
							// TODO selected record is not in viewPort: how to render it ?
						}
					}
				}

				function scrollToSelection(foundsetManager) {
					// don't do anything if table is grouped.
					if ($scope.isGroupView) {
						return;
					}
					
					if (!foundsetManager) {
						foundsetManager = foundset;
					}

					if (foundsetManager.foundset.selectedRowIndexes.length) {
						var model = gridOptions.api.getModel();
						if (model.rootNode.childrenCache) {
							// virtual row count must be multiple of gridOptions.cacheBlockSize (limitation/bug of aggrid)
							var offset = foundsetManager.foundset.selectedRowIndexes[0] % gridOptions.cacheBlockSize
							var virtualRowCount = foundsetManager.foundset.selectedRowIndexes[0] + (gridOptions.cacheBlockSize - offset);

							if (virtualRowCount <= foundsetManager.foundset.serverSize) {
								model.rootNode.childrenCache.setVirtualRowCount(virtualRowCount);
							}
						}
						gridOptions.api.ensureIndexVisible(foundsetManager.foundset.selectedRowIndexes[0]);
					}
				}

				/**
				 * Update the uiGrid row with given viewPort index
				 * @param {Array<{startIndex: Number, endIndex: Number, type: Number}>} rowUpdates
				 *
				 * return {Boolean} whatever a purge ($scope.purge();) was done due to update
				 */
				function updateRows(rowUpdates) {
					var needPurge = false;

					// Don't update automatically if the row are grouped
					if ($scope.isGroupView) {
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

					if (needPurge) {
						$scope.purge();
					}
					return needPurge;
				}

				/**
				 * Update the uiGrid row with given viewPort index
				 * @param {Number} index
				 * @param {Object} [foundsetObj]
				 */
				function updateRow(index, foundsetObj) {
					// FIXME this function is never called with a value for the foundsetObj param. 
					var row = !foundsetObj ? foundset.getViewPortRow(index) : getClientViewPortRow(foundsetObj, index);

					if (row) {
						// find first editing cell for the updating row
						var editCells = gridOptions.api.getEditingCells();
						var editingColumn;
						
						for (var i = 0; i < editCells.length; i++) {
							if (index == editCells[i].rowIndex) {
								editingColumn = editCells[i].column;
								break;
							}
						}

						var node = gridOptions.api.getRowNode(row._svyFoundsetUUID + '_' + row._svyRowId);
						if (node) {
							// stop editing to allow setting the new data
							if (editingColumn) {
								gridOptions.api.stopEditing(false);
							}
							node.setData(row);

							// refresh cells with styleClassDataprovider
							var styleClassDPColumns = [];
							var allDisplayedColumns = gridOptions.columnApi.getAllDisplayedColumns();

							for (i = 0; i < allDisplayedColumns.length; i++) {
								var column = allDisplayedColumns[i];
								
								var designColumn = $scope.model.columns[newGetColumnIndex(column)];

								if (designColumn && designColumn.styleClassDataprovider) {
									styleClassDPColumns.push(column);
								}
							}
							if (styleClassDPColumns.length) {
								gridOptions.api.refreshCells({
									rowNodes: [node],
									columns: styleClassDPColumns,
									force: true
								});
							}

							// restart the editing
							if (editingColumn) {
								gridOptions.api.startEditingCell({rowIndex: index, colKey: editingColumn});
							}
						} else {
							$log.warn("could not find row at index " + index);	
						}
					} else {
						$log.warn("could not update row at index " + index);
					}
				}

				/** return the row of the given foundsetObj at given index */
				function getClientViewPortRow(foundsetObj, index) {
					return foundsetObj.viewPort.rows ? foundsetObj.viewPort.rows[index] : undefined;
				}

				function getMainMenuItems(params) { // TODO make configurable
					// default items
					//					pinSubMenu: Submenu for pinning. Always shown.
					//					valueAggSubMenu: Submenu for value aggregation. Always shown.
					//					autoSizeThis: Auto-size the current column. Always shown.
					//					autoSizeAll: Auto-size all columns. Always shown.
					//					rowGroup: Group by this column. Only shown if column is not grouped.
					//					rowUnGroup: Un-group by this column. Only shown if column is grouped.
					//					resetColumns: Reset column details. Always shown.
					//					expandAll: Expand all groups. Only shown if grouping by at least one column. //CHECKME
					//					contractAll: Contract all groups. Only shown if grouping by at least one column.
					//					toolPanel: Show the tool panel.
					var menuItems = [];
					params.defaultItems.forEach(function(item) {
						if ($scope.model.generalColumnMenuTabOptions[item]) {
							menuItems.push(item);
						}
					});
					return menuItems;
				}

				/**
				 * Callback used by ag-grid colDef.editable
				 */
				function isColumnEditable(params) {
					var rowGroupCols = gridOptions.columnApi.getRowGroupColumns();
					
					// CHECKME this seems to prevent editing, because if would change the group the row belongs to
					//		could potentially be supported though
					for (var i = 0; i < rowGroupCols.length; i++) {
						// CHECKME think this needs to strip the ':" + idx part before compare, otherwise the field is still editable, but through a different column on the same dataprovider
						if (params.colDef.field == rowGroupCols[i].colDef.field) {
							return false;	// don't allow editing columns used for grouping
						}
					}

					var isColumnEditable = true; // CHECKME think this should be false by default
					
					if (!$scope.isGroupView) {
						var colIdx = newGetColumnIndex(params.column);
						var designColumn = $scope.model.columns[colIdx];
						
						if (designColumn && designColumn.isEditableDataprovider) {
							var rowIndex = params.node.rowIndex - foundset.foundset.viewPort.startIndex;
							isColumnEditable = designColumn.isEditableDataprovider[rowIndex];
						}
					} else {
						var foundsetManager = getFoundsetManagerByFoundsetUUID(params.data._svyFoundsetUUID);
						var rowIndex = foundsetManager.getRowIndex(params.data) - foundsetManager.foundset.viewPort.startIndex;
						
						if (rowIndex >= 0) {
							isColumnEditable = foundsetManager.foundset.viewPort.rows[rowIndex][params.colDef.field + "_isEditableDataprovider"]; // CHECKME probable need to strip the : + idx part here
						}
					}

					return isColumnEditable;
				}
				
				function getFooterData() {
					var result = [];
					var hasFooterData = false;
					var resultData = {};
					
					var i;
					var column;
					var colId
					
					for (i = 0; $scope.model.columns && i < $scope.model.columns.length; i++) {
						column = $scope.model.columns[i];
						
						if (column.footerText) {
							col = gridOptions.columnApi.getAllColumns()[i];
							
							if (col) {
								resultData[col.colId] = column.footerText;
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
				 * Converts the contents of $scope.model.columns to the columnDef representation that the AG Grid expects
				 * 
				 * @public
				 * 
				 * @return {Array<Object>}
				 */
				function getColumnDefs() {	
					var cellRenderer = function(params) {
						var isGroupColumn = params.column.colId.indexOf(agGrid.Constants.GROUP_AUTO_COLUMN_ID) === 0;
						var colId = params.column.colId;
						var value = params.value;
						var returnValueFormatted = false;
						var col = $scope.model.columns[newGetColumnIndex(params.column)];
						
						var styleClass;

						if (col && col.showAs == 'html') {
							value =  value && value.displayValue != undefined ? value.displayValue : value;
						} else if (col && col.showAs == 'sanitizedHtml') {
							value = $sanitize(value && value.displayValue != undefined ? value.displayValue : value)
						} else if (value && value.contentType && value.contentType.indexOf('image/') == 0 && value.url) {
							value = '<img class="ag-table-image-cell" src="' + value.url + '">';
						} else {
							returnValueFormatted = true;
						}
					
						if (value instanceof Date) returnValueFormatted = true;

						// CHECKME this code seems a bit of a duplicate with .getRowClass()
						if (!isGroupColumn && col && col.styleClassDataprovider) {
							if (!$scope.isGroupView) {
								var index = params.rowIndex - foundset.foundset.viewPort.startIndex;
								styleClass = col.styleClassDataprovider[index];
							} else if (params.data && params.data._svyFoundsetUUID) { // params.data might be empty for group rows whos children have been deleted since the group rows query was fired
								/*
								 * it can happen that the AGGrid is trying to render data, while hashed foundset is already removed
								 * 
								 * For example when the user clicks the grid header to sort and then quickly scrolls down
								 * or due to an incoming COMPLETE_VIEWPORT_CHANGED
								 * 
								 * FIXME see if hashedFoundSets could only be removed after the new fs is made available and AG Grid is told to purge its cache?
								 * CHECKME maybe need to use purgeServerSideCache(route), see https://www.ag-grid.com/javascript-grid-server-side-model-grouping/#purging-groups
								 */
								var foundsetManager = getFoundsetManagerByFoundsetUUID(params.data._svyFoundsetUUID);
								
								if (!foundsetManager) { 
									$log.debug('Foundset with id ' + params.data._svyFoundsetUUID + ' doesnt exist (anymore)')
								} else {
									var index = foundsetManager.getRowIndex(params.data) - foundsetManager.foundset.viewPort.startIndex;
									
									if (index !== -1) {
										styleClass = foundsetManager.foundset.viewPort.rows[index][colId + "_styleClassDataprovider"];
									} else {
										$log.warn('cannot render styleClassDataprovider for row at index ' + index)
										$log.warn(params.data);
									}
								}
							}
						}
							
						if (styleClass) {
							var divContainer = document.createElement("div");
							divContainer.className = styleClass;
							divContainer.innerHTML = returnValueFormatted ? params.valueFormatted : value;
							return divContainer;
						}
						
						return returnValueFormatted ? document.createTextNode(params.valueFormatted) : value;
					}

					//create the column definitions from the specified columns in designer
					var colDefs = [];
					var forceLoadIndexes = [];
					$scope.isGroupView = false

					var colDef;
					var column;
					
					for (var i = 0; $scope.model.columns && i < $scope.model.columns.length; i++) {
						column = $scope.model.columns[i];

						// create a column definition based on the properties defined at design time
						colDef = {
							headerName: column.headerTitle || '',
							field: getFieldValueForColumn(i), // Maybe track user-provided duplicates and log warnings?
							headerTooltip: column.headerTooltip || '',
							cellRenderer: cellRenderer
						};

						colDef.colId = column.id; // Maybe track user-provided duplicates and log warnings?

						// styleClass
						colDef.headerClass = 'ag-table-header' + (column.headerStyleClass ? ' ' + column.headerStyleClass : '');
						colDef.cellClass = 'ag-table-cell' + (column.styleClass ? ' ' + column.styleClass : '');

						// column grouping
						colDef.enableRowGroup = column.enableRowGroup;
						if (column.rowGroupIndex >= 0) {
							colDef.rowGroupIndex = column.rowGroupIndex;
							$scope.isGroupView = true
						}

						if (column.width || column.width === 0) colDef.width = column.width;
	        			
	                    // tool panel
	                    if (column.enableToolPanel === false) colDef.suppressToolPanel = !column.enableToolPanel;
						
						// column sizing
						if (column.maxWidth) colDef.maxWidth = column.maxWidth;
						if (column.minWidth || column.minWidth === 0) colDef.minWidth = column.minWidth;
						if (column.visible === false) colDef.hide = true;
						
	                    // column resizing https://www.ag-grid.com/javascript-grid-resizing/
	        			if (column.enableResize === false) colDef.resizable = column.enableResize;
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

							if (column.editType == 'TEXTFIELD' || column.editType == 'TYPEAHEAD') {
								colDef.cellEditor = getTextEditor();
								colDef.cellEditorParams = {
							  		svyEditType: column.editType
								}
							} else if (column.editType == 'DATEPICKER') {
								colDef.cellEditor = getDatePicker();
							} else if (column.editType == 'COMBOBOX') {
								colDef.cellEditor = getSelectEditor();
							}

							colDef.onCellValueChanged = function(params) {
								updateFoundsetRecord(params);
							}
						}

						if (column.filterType) {
							if (column.filterType == 'TEXT') {
								colDef.filter = 'agTextColumnFilter';
							} else if (column.filterType == 'NUMBER') {
								colDef.filter = 'agNumberColumnFilter';
							} else if (column.filterType == 'DATE') {
								colDef.filter = 'agDateColumnFilter';
							}
							
							colDef.filterParams = {
								applyButton: true,
								clearButton: true,
								newRowsAction: 'keep',
								suppressAndOrCondition: true,
								caseSensitive: false
							};
						}

						if (column.columnDef) {
							for (var property in column.columnDef) {
								if (column.columnDef.hasOwnProperty(property)) {
									colDef[property] = column.columnDef[property];
									
									if (property === 'headerCheckboxSelection' && colDef[property]) {
										// TODO force the checkbox to be visible and wire up onChange behavior
									}
								}
							}
						}
						
						// Track for which columns the data needs to be forced to load. 
						// 		As this code runs inside the loop in which this code runs determines whether the grid is grouped,
						//		the checking whether to skip force-loading the data if the grid is grouped happens outside of the loop
						if (column.lazydataprovider && !column.dataprovider && !colDef.hide) {
							forceLoadIndexes.push(i);
						}

						colDefs.push(colDef);
					}
					
					// make sure data is loaded for the visible columns IF not in grouping mode
					//   no data needs to be loaded into the root foundset if in grouping mode, cause the foundset/data wouldn't be used
					//   especially related data can carry a significant performance overhead, so we'd want to avoid loading that data
					if (!$scope.isGroupView && forceLoadIndexes.length) {
						$scope.svyServoyapi.callServerSideApi('loadDataForColumns', [forceLoadIndexes, true]);
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
					// and that will break our getDesignColumn()
					gridOptions.api.setColumnDefs([]);

					gridOptions.api.setColumnDefs(getColumnDefs());
					// selColumnDefs should redraw the grid, but it stopped doing so from v19.1.2
					// CHECKME had this commented out before
					//$scope.purge();	
				}
				
				function updateColumnHeaderTitle(col, text) {					
					// update the header name on the column definition
					col.getColDef().headerName = text;

					// the column is now updated. to reflect the header change, get the grid refresh the header
					gridOptions.api.refreshHeader();
				}

				/**
				 * Callback for the grid to get the row's styleclass when the rowStyleClassDataprovider property is set
				 * 
				 * TODO support styling group rows
				 */
				function getRowClass(params) {

					var rowIndex = params.node.rowIndex;
					var rowStyleClass;

					// make sure we remove non ag- classes, we consider those added by rowStyleClassDataprovider
					var rowElement = $element.find("[row-index='" + params.rowIndex + "']"); 
					if (rowElement.length) {
						var classes = rowElement.attr("class").split(/\s+/);
						for (var j = 0; j < classes.length; j++) {
							if (classes[j].indexOf("ag-") != 0) {
								rowElement.removeClass(classes[j]);
							}
						}
					}

					// TODO can i get rowStyleClassDataprovider from grouped foundset ?
					if (!$scope.isGroupView) {
						var index = rowIndex - foundset.foundset.viewPort.startIndex;
						// TODO get proper foundset
						rowStyleClass = $scope.model.rowStyleClassDataprovider[index];
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
								return rowStyleClass;
							}

							// is reverse order
							rowGroupCols.unshift({field: parentNode.field, id: parentNode.field});
							groupKeys.unshift(parentNode.data[parentNode.field]);

							// next node
							parentNode = parentNode.parent;
						}

						// having groupKeys and rowGroupCols i can get the foundset.

						var foundsetUUID = groupManager.getCachedFoundSetUUID(rowGroupCols, groupKeys)
						
						// got the hash, problem is that is async.
						var foundsetManager = getFoundsetManagerByFoundsetUUID(foundsetUUID);
						if (foundsetManager && foundsetManager.foundset.viewPort.rows[0]['__rowStyleClassDataprovider']) {
							var index = childRowIndex - foundsetManager.foundset.viewPort.startIndex;
							if (index >= 0 && index < foundsetManager.foundset.viewPort.size) {
								rowStyleClass = foundsetManager.foundset.viewPort.rows[index]['__rowStyleClassDataprovider'];
							} else {
								$log.warn('cannot render rowStyleClassDataprovider for row at index ' + index)
								$log.warn(params.data);
							}
						} else {
							$log.debug("Something went wrong for foundset hash " + foundsetUUID)
						}
					}
					
					return rowStyleClass;
				}

				// TODO move closer to convertToFoundSetSortModel
				/**
				 * Returns the sort model for the root foundset
				 *
				 * @return {SortModelType}
				 */
				function getRootFoundSetSortModel() {
					var sortModel = [];
					var sortColumns = foundset.getSortColumns();
					
					var sortColumn;
					var dataproviderIdForFoundset;
					var sortDirection;
					var parts;
					
					if (sortColumns) {
						sortColumns = sortColumns.split(",");
						
						for (var i = 0; i < sortColumns.length; i++) {
							sortColumn = sortColumns[i];
							
							
							if (!sortColumn) {
								continue;
							} 
							
							parts = sortColumn.split(' ')
							dataproviderIdForFoundset = parts[0];
							sortDirection = parts[1];
							
							// add it into the sort model
							if (dataproviderIdForFoundset && sortDirection) {
								var agColIds = getColIDs(dataproviderIdForFoundset);
								
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
				 * The field value can be optionally set on a designColumn through the columnDef object. 
				 * 
				 * This is needed for example when wanting to display the value of a certain column as value in an auto group column on leaf rows.
				 * 
				 * The field value is also the property by which the AG Grid gets values from the the row objects we provide them (see displayValueGetter and getViewPortRow)
				 * 
				 * The getColumnDefs function, which transforms the designcolumns ($scope.model.columns) into columDefs suitable for the AG Grid,
				 * uses this function to always set a field value, either the optionally provided value or a value derived from the (lazy)dataprovider property
				 */
				function getFieldValueForColumn(colIdx, columns) {
					var column = (columns || $scope.model.columns)[colIdx]

					if (column) {
						/*
						 * "':' + colIdx" gets appended to get unique values, if multiple columns share the same dataprovider, but have different data, because one might have a ValueList
						 * 		Fixes SVY-12553: duplicate dataproviders, one with ValueList attached
						 * 
						 * When the developer set column.columnDef.field manually, we do not append "':' + colIdx", because that would invalidate 
						 */
						if (column.columnDef && column.columnDef.field) { // allow devs to specify the field through columnDef, as some AG Grid features require passing the field identifier, like the displaying leaf data on autoGroupColumn
							return column.columnDef.field;
						} else if (column.dataprovider) {
							return column.dataprovider.idForFoundset// + ':' + colIdx;
						} else if (column.lazydataprovider) {
							return MD5.md5(column.lazydataprovider)// + ':' + colIdx;
						}
					}
					
					return null;
				}

				/**
				 * Returns the 'field' value for an AG Grid column based on the design column object from $scope.model.columns
				 * 
				 * The 'field' property on the colDef on the AG Grid side is set ALWAYS using this function
				 * 
				 * Note that the colId property of an AG Grid column inherits the value of its 'field' property IF the colId is not explicitly set
				 * Within this component the colId on the AG Grid column is set to the id property of the design column, if specified
				 * 
				 * Hence the colId and field value on an AG Grid column might not be the same!!!
				 *
				 * @private
				 * 
				 * @param {number} designColumnIndex the index of the column within $scope.model.columns
				 * @param {Array=} columns non-root design columns array
				 *
				 * @return {string}
				 */
				function getColumnFieldValue(designColumnIndex, columns) {
					var column = (columns || $scope.model.columns)[designColumnIndex]

					if (column.columnDef && column.columnDef.field) { // allow devs to specify the field through columnDef, as some AG Grid features require passing the field identifier, like the displaying leaf data on autoGroupColumn
						return column.columnDef.field;
					} else if (column.dataprovider) {
						return column.dataprovider.idForFoundset //+ ':' + designColumnIndex; // Appending ':' + designColumnIndex fixes SVY-12553: duplicate dataproviders, one with ValueList attached
					} else if (column.lazydataprovider) {
						return MD5.md5(column.lazydataprovider) //+ ':' + designColumnIndex;
					}
					
					return "col_" + designColumnIndex;
				}

				/**
				 * Returns the column with the given fieldName
				 * 
				 * @param {String} field
				 * 
				 * @return {Object}
				 */
//				function getDesignColumn(colId, columns) {
//					if (!columns && state.columns[colId]) { // check if is already cached
//						return state.columns[colId];
//					}
//
//					var column = (columns || $scope.model.columns)[getColumnIndex(colId, columns)]
//
//					// cache it in hashmap for quick retrieval
//					if (column && !columns) {
//						state.columns[colId] = column;
//					}
//
//					return column;
//				}
				
				/**
				 * Returns the column with the given fieldName
				 * @param {String} field
				 * @return {Number}
				 */
				function newGetColumnIndex(identifier) {
					var col;

					if (typeof identifier === 'string') {
						col = gridOptions.columnApi.getColumn(identifier);
					} else if (identifier instanceof agGrid.Column) {
						col = identifier;
					} else if (identifier && identifier.id) { // Inside getRows/getData, AG Grid doesn't pass full aggrid.Column instances, but plain, stringifyable JavaScript Value Object, see ColumnVO on https://www.ag-grid.com/javascript-grid-server-side-model/ 
						col = gridOptions.columnApi.getColumn(identifier.id);
					}

					return col ? gridOptions.columnApi.getAllColumns().indexOf(col) : -1;
				}
				
				function getColumnIndexByField(field) {
					var columns = gridOptions.columnApi.getAllColumns();
					
					for (var i = 0; i < columns.length; i++) {
						if (columns[i].field === field) {
							return i
						}
					}
					
					return -1;
				}
				

				/**
				 * Returns the index of the design column for the provided AG Grid colId
				 *
				 * @param {string} colId
				 * @param {Array=} columns columns for non-root foundset Default: $scope.model.columns. Relevant only when needing access to the dataprovider or valueList of the column
				 * 
				 * @return {number}
				 */
//				function getColumnIndex(colId, columns) {
//					var idToCompare = colId;
//					var columnIdx = 0;
//					var cols = columns || $scope.model.columns;
//					
//					var idParts;
//					var i;
//					var column;
//					
//					// TODO better logic
//					if (colId.indexOf('col_') > 0) { // has index // CHECKME shouldn't it be === 0?
//						idParts = colId.split('_');
//						
//						if ('col' !== idParts[0] && !isNaN(idParts[1])) { // CHECKME strange logic, shouldn't it be 'col'===?
//							idToCompare = idParts[0];
//							idIdx = parseInt(idParts[1]);
//						}
//					}
//					
//					for (var i = 0; i < cols.length; i++) {
//						column = cols[i];
//						
//						if (column.id === idToCompare || getColumnFieldValue(i, cols) === idToCompare) {
//							if (columnIdx < 1) {
//								return i;
//							}
//							columnIdx--;
//						}
//					}
//					return -1;
//				}
						
				/**
				 * Returns the AG Grid colId values for all design columns that have a dataprovider with the provided dataproviderIdForFoundset
				 * 
				 * There could be multiple columns displaying the same dataproviderId
				 * 
				 * @private
				 *
				 * @param {string} dataproviderIdForFoundset
				 *
				 * @return {Array<string>}
				 */
				function getColIDs(dataproviderIdForFoundset) {
					var result = [];
					
					var column;
					var i;
					
					if (!dataproviderIdForFoundset) {
						return result;
					}
					
					for (i = 0; i < $scope.model.columns.length; i++) {
						column = $scope.model.columns[i];
						
						if (column.dataprovider && column.dataprovider.idForFoundset === dataproviderIdForFoundset) {
							// colId on the AG Grid side is set to column.id if provided, otherwise defaults to the .field property, which is always set to getColumnFieldValue(i)
							result.push(column.id || getColumnFieldValue(i))
						}
					}
					return result;
				}

				/**
				 * Converts the provided AG Grid-style sortModel object to a FoundSet-style sortModel object
				 * 
				 * @param {SortModelType} agSortModel
				 *
				 * @return {{
				 * 	sortString: string,
				 * 	sortColumns: Array<{name:string, direction: string}>
				 * }}
				 */
				function convertToFoundSetSortModel(agSortModel) {
					var sortColumns = [];
					
					var sortString;
					var i;
					var sortModelCol;
					var column;
					
					if (agSortModel) {
						sortString = '';

						for (i = 0; i < agSortModel.length; i++) {
							sortModelCol = agSortModel[i];
							column = $scope.model.columns[newGetColumnIndex(sortModelCol.colId)];

							if (!column) {
								continue
							}

							if (i !== 0) {
								sortString += ',';
							}
							
							// generating our own MD5 has of the lazydataprovider: cause the dataprovider property is not set, the idForFoundset value isn't available
							var idForFoundset = column.dataprovider ? column.dataprovider.idForFoundset : MD5.md5(column.lazydataprovider);
							
							sortString += idForFoundset + ' ' + sortModelCol.sort + '';

							sortColumns.push({
								name: idForFoundset,
								direction: sortModelCol.sort
							});
						}

						sortString = sortString.trim();
					}

					return {
						sortString: sortString,
						sortColumns: sortColumns
					}
				}

				function storeColumnsState(forceToSave) {
					var agColumnState = gridOptions.columnApi.getColumnState();
					var rowGroupColumns = gridOptions.columnApi.getRowGroupColumns();
					var svyRowGroupColumnIds = [];
					
					for (var i = 0; i < rowGroupColumns.length; i++) {
						svyRowGroupColumnIds.push(rowGroupColumns[i].colId);
					}
					// TODO add filterState once filter is enabled
					// TODO do we need to add sortingState ?
					var columnState = {
						columnState: agColumnState,
						rowGroupColumnsState: svyRowGroupColumnIds
					}
	                var newColumnState = JSON.stringify(columnState);					
					//TODO column state not updated when we restore state form onReady
					// with removing this condition or sending forceToSave flag every thing working as expected. Paul advised
	               if (newColumnState !== $scope.model.columnState || forceToSave) {
						$scope.model.columnState = newColumnState;
						applyModelProperty('columnState')
						
						if ($scope.handlers.onColumnStateChanged) {
							$scope.handlers.onColumnStateChanged($scope.model.columnState);
						}
	               }
				}
	
				function restoreColumnsState() {
					if (!$scope.model.columnState) {
						return
					}
					
					var columnStateJSON = null;

					try {
						columnStateJSON = JSON.parse($scope.model.columnState);
					} catch(e) {
						$log.error(e);
					}
					
					if ($scope.model.columnStateOnError) {
						// can't parse columnState
						if (columnStateJSON == null || !Array.isArray(columnStateJSON.columnState)) {
							$window.executeInlineScript(
								$scope.model.columnStateOnError.formname,
								$scope.model.columnStateOnError.script,
								['Cannot restore columns state, invalid format']);
							return;
						}

						// if columns were added/removed, skip the restore
						var savedColumns = [];
						for (var i = 0; i < columnStateJSON.columnState.length; i++) {
							if (columnStateJSON.columnState[i].colId.indexOf('_') == 0) {
								continue; // if special column, that starts with '_'
							}
							savedColumns.push(columnStateJSON.columnState[i].colId);
						}
						
						if (savedColumns.length != $scope.model.columns.length) {
							$window.executeInlineScript(
								$scope.model.columnStateOnError.formname,
								$scope.model.columnStateOnError.script,
								['Cannot restore columns state, different number of columns in saved state and component']);
							return;
						}

						for (var i = 0; i < savedColumns.length; i++) {
							var columnExist = false;
							var fieldToCompare = savedColumns[i];
							var fieldIdx = 0;
							
							if (fieldToCompare.indexOf('_') > 0) { // has index
								var fieldParts = fieldToCompare.split('_');
								if (!isNaN(fieldParts[1])) {
									fieldToCompare = fieldParts[0];
									fieldIdx = parseInt(fieldParts[1]);
								}
							}
							
							for (var j = 0; j < $scope.model.columns.length; j++) {
								if (($scope.model.columns[j].id && fieldToCompare == $scope.model.columns[j].id) ||
								($scope.model.columns[j].dataprovider && fieldToCompare == getColumnFieldValue(j))) { // PB
										if (fieldIdx < 1) {
											columnExist = true;
											break;
										}
										fieldIdx--;
								}
							}
							
							if (!columnExist) {
								$window.executeInlineScript(
									$scope.model.columnStateOnError.formname,
									$scope.model.columnStateOnError.script,
									['Cannot restore columns state, cant find column from state in component columns']);
								return;
							}
						}
					}

					if (columnStateJSON != null) {
						if (Array.isArray(columnStateJSON.columnState) && columnStateJSON.columnState.length > 0) {
							gridOptions.columnApi.setColumnState(columnStateJSON.columnState);
						}

						if (Array.isArray(columnStateJSON.rowGroupColumnsState) && columnStateJSON.rowGroupColumnsState.length > 0) {
							gridOptions.columnApi.setRowGroupColumns(columnStateJSON.rowGroupColumnsState);
						}
					}
				}

				// **************************** Generic methods **************************** //
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
				 */
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
				 */
				function createJSEvent() {
					var element = $element;
					var offset = element.offset();
					var x = offset.left;
					var y = offset.top;

					var event = document.createEvent("MouseEvents");
					event.initMouseEvent("click", false, true, window, 1, x, y, x, y, false, false, false, false, 0, null);
					return event;
				}

				// **************************** API methods start **************************** //
				/**
				 * Notify the component about a data change. Makes the component aware of a data change that requires a refresh data.
				 * Call this method when you are aware of a relevant data change in the foundset which may affect data grouping (e.g. group node created or removed).
				 * The component will alert the user of the data change and will suggest the user to perform a refresh.
				 * <br/>
				 * Please note that it’s not necessary to notify the table component is the component is not visible;
				 * the component will always present the latest data when rendered again.
				 *
				 * @public
				 */
				$scope.api.notifyDataChange = function() {
					$scope.dirtyCache = true;
				}

				/**
				 * Force a full refresh of the data<br/>
				 * <br/>
				 * <b>WARNING !</b> be aware that calling this API results in bad user experience since all group nodes will be collapsed instantaneously.
				 *
				 * @public
				 */
				$scope.api.refreshData = function() {
					$scope.purge();
				}

				$scope.api.ensureVisible = function() {
					// TODO expose and properly implement
					//gridOptions.api.ensureNodeVisible(comparator, 'middle')
				}
				
				// ------------ APIs related to grouping ------------ //
				/**
				 * This functionality is shaky due to lazy loading
				 * TODO maybe add param to add to groupedState even if no match was found?
				 * TODO maybe add option to force loading and scroll into view?
				 * TODO maybe overload with ...position::int to expand based on index instead of value?
				 * 
				 * @param {string[]} groupKeys
				 * @param {boolean} ensureVisible
				 */
				$scope.api.expandGroup = function(groupKeys, ensureVisible) { // TODO use ensureVisible, maybe make serverside api accept a recordas param? Can deduct group(s) from record
					// TODO needs other/better impl...
					// 		due to lazy loading, you can only kick off expanding the first level
					//		so the rest of the expansion needs to happen through $scope.state.expanded
					//		so how to return whether it was succesfull or not? It's async... guess we cannot
					//							
					var groupedColumns = gridOptions.columnApi.getRowGroupColumns();
					var BREAK = 'breakLoop'
					
					if (!groupedColumns.length) {
						return false;
					}
					
					var level = 0;
					
					try {
						gridOptions.api.forEachNode(function(node) {
							if (node.group && node.level === level && node.key === path[level]) {
								level++;
								
								if (!node.expanded) {
									node.setExpanded(true);
									
									// The call to node.setExpanded(true) above will go and fetch data
									// only when the nodes are loaded can the expand continue
									// TODO Now go into waiting
									throw BREAK;
								} else if (level === path.length) {
									throw BREAK;
								}
							}
						});
					} catch (e) {
						// AG Grids forEach doesn't allow breaking out of the loop: https://github.com/ag-grid/ag-grid-enterprise/issues/157
						if (e !== BREAK) throw e;
					}
					 
					// TODO scoll into view?
					//return expanded;
				}
				
				$scope.api.expandAll = function() {
					// TODO needs better implementation...
					//		how to do this? Don't know what to set in $scope.state.expanded beforehand, so that we cannot use
					//		setting -1 for defaultGRoupLevel is misusing that setting
					//		and the whole thing is async offcourse
					
					if (gridOptions.columnApi.getRowGroupColumns().length) {
						// gridOptions.api.expandAll() doesn't work with ServerSide RowModel
						
						gridOptions.api.forEachNode(function(node) {
							if (node.group) {
								node.setExpanded(true);
							}
						});
						
						return true;
					}
					
					return false;
				};
				
				$scope.api.collapseGroup = function(groupKeys, collapseChildren) {
					if (gridOptions.columnApi.getRowGroupColumns().length) {
						
					}
				
					return false;
				};

				$scope.api.collapseAll = function() {
					if (gridOptions.columnApi.getRowGroupColumns().length) {
						// gridOptions.api.collapseAll() doesn't work with ServerSide RowModel
						
						// CHECKME does iterating forward and closing nodes work?
						// CHECKME does  AG Grid internally keep expanded state on nodes/rows that are "purged" at some point?
						gridOptions.api.forEachNode(function(node) {
							if (node.group) {
								node.setExpanded(false);
							}
						});
						
						return true;
					}
					
					return false;
				};
				
				/**
				 * As selection isn't lost when nodes get collapsed,
				 * this method allows opening all groups that have selections
				 */
				$scope.api.expandAllGroupsWithSelections = function() {
					// TODO implement: challenging, as expand is async and the nodes to expand might not exist in the data anymore... How to detect that?
				}
				
				// Need to see if these are needed and if so, if not better implemented serverside
//				$scope.api.getGroupedState = function() {
//					return [];
//				}
//				
//				// TODO maybe add param to lazy set the state, as in: update the internal state, but not find the nodes and expand then in the UI
//				$scope.api.setGroupedState = function(paths) {
//					return [];
//				}
				
				/**
				 * Returns the selected rows when in grouping mode
				 * 
				 * Legacy implementation from before the introduction of getSelectedRecordFoundSet
				 * 
				 * @deprecated use getSelectedRecordFoundSet instead
				 */
				$scope.api.getGroupedSelection = function() {
					var groupedSelection = null;
					
					if ($scope.isGroupView) {
						groupedSelection = [];
						
						var selectedNodes = gridOptions.api.getSelectedNodes();
						
						for (var i = 0; i < selectedNodes.length; i++) {
							var node = selectedNodes[i];
							
							if (node) {
								groupedSelection.push({ foundsetId: node.data._svyFoundsetUUID, _svyRowId: node.data._svyRowId });
							}
						}
					}
					return groupedSelection;
				}

				$scope.api.setSelection = function(selectionState) {
					if (!selectionState) {
						gridOptions.api.deselectAll();
					} else {
						// TODO iterate through combi of groupState and provided selectionState to apply the desired selection
					}
				}
				
				//CHECKME maybe add a get selection (serverside only?)
				
				$scope.api.selectGroup = function(groupKeys, state, ensureVisible) {
					
				}
				
				$scope.api.getRowGroupColumns = function() {
					// TODO implement and expose
					// CHECKME maybe better implemented serverside, by pushing the value > server when it changes? Needed there anyway
				}
				
				/**
				 * Sets the current grouping
				 * 
				 * @param {Array<string>} colKeys
				 * 
				 * Note: could also be done by fiddling with the rowGroup or rowGroupIndex properties of the columns in the columns property,
				 * but this is easier for runtime manipulation
				 */
				$scope.api.setRowGroupColumns = function(colKeys) {
					// TODO implement and expose
				}
				
				/**
				 * Start cell editing (only works when the table is not in grouping mode).
				 * @param foundsetindex foundset row index of the editing cell (1-based)
				 * @param columnindex column index in the model of the editing cell (0-based)
				 */
				$scope.api.editCellAt = function(foundsetindex, columnindex) {
					if ($scope.isGroupView) {
						$log.warn('editCellAt API is not supported in grouped mode');
					} else if (foundsetindex < 1) {
						$log.warn('editCellAt API, invalid foundsetindex:' + foundsetindex);
					} else if (columnindex < 0 || columnindex > $scope.model.columns.length - 1) {
						$log.warn('editCellAt API, invalid columnindex:' + columnindex);
					} else {
						gridOptions.api.startEditingCell({
							rowIndex: foundsetindex - 1,
							colKey: gridOptions.columnApi.getAllColumns()[columnIndex]
						});
					}
				}

				// **************************** Lifecycle handling **************************** //
				var destroyListenerUnreg = $scope.$on('$destroy', function() {
					// clear all foundsets
					groupManager.removeGroupsAtLevel(0);
					$scope.model.myFoundset.removeChangeListener(changeListener);

					// remove model change notifier
					destroyListenerUnreg();
					delete $scope.model[$sabloConstants.modelChangeNotifier];

					// release grid resources
					gridOptions.api.destroy();
				});
			},
			templateUrl: 'aggrid/groupingtable/groupingtable.html'
		};
	}]).run(function() {
		// this is not part of the open source license, can only be used in combination of the Servoy NG Grids components
		agGrid.LicenseManager.setLicenseKey("Servoy_B.V._Servoy_7Devs_1OEM_22_August_2019__MTU2NjQyODQwMDAwMA==6c490d5c7f432e256493c8ca91624202");
});