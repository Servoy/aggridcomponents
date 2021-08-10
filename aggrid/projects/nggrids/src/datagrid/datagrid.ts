import { GridOptions } from '@ag-grid-community/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, EventEmitter, Inject, Input, Output, Renderer2, SecurityContext, SimpleChanges } from '@angular/core';
import { Component, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { LoggerFactory, LoggerService, ChangeType, IFoundset, FoundsetChangeEvent, Deferred, FormattingService, ServoyPublicService } from '@servoy/public';
import { DatagridService } from './datagrid.service';
import { DatePicker } from '../editors/datepicker';
import { FormEditor } from '../editors/formeditor';
import { SelectEditor } from '../editors/selecteditor';
import { TextEditor } from '../editors/texteditor';
import { TypeaheadEditor } from '../editors/typeaheadeditor';
import { RadioFilter } from './filters/radiofilter';
import { ValuelistFilter } from './filters/valuelistfilter';
import { NGGridDirective } from '../nggrid';
import { DOCUMENT } from '@angular/common';
import { BlankLoadingCellRendrer } from './renderers/blankloadingcellrenderer';

const TABLE_PROPERTIES_DEFAULTS = {
    rowHeight: { gridOptionsProperty: 'rowHeight', default: 25 },
    groupUseEntireRow: { gridOptionsProperty: 'groupUseEntireRow', default: true },
    enableColumnMove: { gridOptionsProperty: 'suppressMovableColumns', default: true }
};

const COLUMN_PROPERTIES_DEFAULTS = {
    headerTitle: { colDefProperty: 'headerName', default: null },
    headerTooltip: { colDefProperty: 'headerTooltip', default: null },
    id: { colDefProperty: 'colId', default: null },
    styleClassDataprovider: { colDefProperty: 'cellClass', default: null },
    styleClass: { colDefProperty: 'cellClass', default: null },
    rowGroupIndex: { colDefProperty: 'rowGroupIndex', default: -1 },
    width: { colDefProperty: 'width', default: 0 },
    enableToolPanel: { colDefProperty: 'suppressToolPanel', default: true },
    maxWidth: { colDefProperty: 'maxWidth', default: null },
    minWidth: { colDefProperty: 'minWidth', default: null },
    visible: { colDefProperty: 'hide', default: true },
    enableResize: { colDefProperty: 'resizable', default: true },
    autoResize: { colDefProperty: 'suppressSizeToFit', default: true },
    enableSort: { colDefProperty: 'sortable', default: true }
};


const CHUNK_SIZE = 50;
const CACHED_CHUNK_BLOCKS = 2;

const NULL_VALUE = {displayValue: '', realValue: null};

const COLUMN_KEYS_TO_CHECK_FOR_CHANGES = [
    'headerTitle',
    'headerStyleClass',
    'headerTooltip',
    'footerText',
    'styleClass',
    'visible',
    'width',
    'minWidth',
    'maxWidth',
    'enableRowGroup',
    'enableSort',
    'enableResize',
    'enableToolPanel',
    'autoResize',
    'editType',
    'id'
];

@Component({
    selector: 'aggrid-groupingtable',
    templateUrl: './datagrid.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataGrid extends NGGridDirective {

    @ViewChild('element', { read: ElementRef }) agGridElementRef: ElementRef;

    @Input() myFoundset: IFoundset;
    @Input() columns: any[];
    @Input() readOnly: boolean;
    @Input() readOnlyColumnIds: any;
    @Input() hashedFoundsets: any;
    @Input() filterModel: any;
    @Input() rowStyleClassDataprovider: any;
    @Input() _internalExpandedState: any;
    @Output() _internalExpandedStateChange = new EventEmitter();
    @Input() _internalAutoSizeState: any;
    @Output() _internalAutoSizeStateChange = new EventEmitter();
    @Input() enableSorting: boolean;
    @Input() enableColumnResize: boolean;
    @Input() enableColumnMove: boolean;
    @Input() rowHeight: number;
    @Input() groupUseEntireRow: boolean;
    @Input() showGroupCount: boolean;
    @Input() styleClass: string;
    @Input() responsiveHeight: number;

    @Input() toolPanelConfig: any;
    @Input() iconConfig: any;
    @Input() localeText: any;
    @Input() mainMenuItemsConfig: any;
    @Input() gridOptions: any;
    @Input() showColumnsMenuTab: any;
    @Input() showLoadingIndicator: boolean;

    @Input() columnState: any;
    @Output() columnStateChange = new EventEmitter();
    @Input() _internalColumnState: any;
    @Output() _internalColumnStateChange = new EventEmitter();
    @Input() columnStateOnError: any;
    @Input() restoreStates: any;

    @Input() onCellClick: any;
    @Input() onCellDoubleClick: any;
    @Input() onCellRightClick: any;
    @Input() onColumnDataChange: any;
    @Input() onColumnStateChanged: any;
    @Input() onFooterClick: any;
    @Input() onReady: any;
    @Input() onRowGroupOpened: any;
    @Input() onSelectedRowsChanged: any;
    @Input() onSort: any;
    @Input() tooltipTextRefreshData: any;
    // used in HTML template to toggle sync button
    @Output() isGroupView = false;

    log: LoggerService;
    agGridOptions: GridOptions;
    foundset: FoundsetManager;
    groupManager: GroupManager;

    // when the grid is not ready yet set the value to the foundset/column index for which has been edit cell called
    editCellAtTimeout = null;
    startEditFoundsetIndex = -1;
    startEditColumnIndex = -1;

    /**
     * Store the state of the table. TODO to be persisted
     * */
    state: State = new State();

    dirtyCache: boolean;

    // set to true once the grid is rendered and the selection is set
    isSelectionReady = false;

    // set to true during data request from ag grid, from request-start until all data is loaded
    isDataLoading = false;

    scrollToSelectionWhenSelectionReady = false;

    // set to true, if columns needs to be fit after rows are rendered - set to true when purge is called (all rows are rendered)
    columnsToFitAfterRowsRendered = false;

    // flag used to set removing all foundset just before getting data tp display; it is set when doing sort while grouped
    removeAllFoundsetRef = false;

    // foundset sort promise
    sortPromise: any;
    sortHandlerPromises = new Array();
    sortHandlerTimeout: any;

    // if row autoHeight, we need to do a refresh after first time data are displayed, to allow ag grid to re-calculate the heights
    isRefreshNeededForAutoHeight = false;

    onSelectionChangedTimeout: any = null;
    requestSelectionPromises = new Array();


    agMainMenuItemsConfig: any;
    agArrowsUpDownMoveWhenEditing: any;
    agEditNextCellOnEnter = false;

    // position of cell with invalid data as reported by the return of onColumnDataChange
    invalidCellDataIndex = { rowIndex: -1, colKey: ''};
    onColumnDataChangePromise: any = null;

    contextMenuItems: any = [];

    postFocusCell: any; // hold informations (rowIndex, colKey) about row/cell that need to be selected/focused after they are created

    // set to true when root foundset is loaded
    isRootFoundsetLoaded = false;

    // set to true when is rendered
    isRendered: any = undefined;

    // set the true when the grid is ready
    isGridReady = false;

    isColumnModelChangedBeforeGridReady = false;

    // when the grid is not ready yet set the value to the column index for which has been requested focus
    requestFocusColumnIndex = -1;

    clickTimer: any;

    // root foundset change listener remover
    removeChangeListenerFunction: any = null;

    // id of the root foundset needed when the foundset is changed as there is no way to get the previous foundset id then to check for change
    myFoundsetId: any;

    constructor(renderer: Renderer2, cdRef: ChangeDetectorRef, logFactory: LoggerFactory,
        private servoyService: ServoyPublicService, public formattingService: FormattingService,
        private datagridService: DatagridService, private sanitizer: DomSanitizer, @Inject(DOCUMENT) private doc: Document) {
        super(renderer, cdRef);
        this.log = logFactory.getLogger('DataGrid');
    }

    ngOnInit() {
        super.ngOnInit();
        // if nggrids service is present read its defaults
        let toolPanelConfig = this.datagridService.toolPanelConfig ? this.datagridService.toolPanelConfig : null;
        let iconConfig = this.datagridService.iconConfig ? this.datagridService.iconConfig : null;
        let userGridOptions = this.datagridService.gridOptions ? this.datagridService.gridOptions : null;
        let localeText = this.datagridService.localeText ? this.datagridService.localeText : null;
        const mainMenuItemsConfig = this.datagridService.mainMenuItemsConfig ? this.datagridService.mainMenuItemsConfig : null;

        if(this.datagridService.arrowsUpDownMoveWhenEditing) {
            this.agArrowsUpDownMoveWhenEditing = this.datagridService.arrowsUpDownMoveWhenEditing;
        }
        if(this.datagridService.editNextCellOnEnter) {
            this.agEditNextCellOnEnter = this.datagridService.editNextCellOnEnter;
        }

        toolPanelConfig = this.mergeConfig(toolPanelConfig, this.toolPanelConfig);
        iconConfig = this.mergeConfig(iconConfig, this.iconConfig);
        userGridOptions = this.mergeConfig(userGridOptions, this.gridOptions);
        localeText = this.mergeConfig(localeText, this.localeText);
        this.agMainMenuItemsConfig = this.mergeConfig(mainMenuItemsConfig, this.mainMenuItemsConfig);

        if(this.arrowsUpDownMoveWhenEditing) {
            this.agArrowsUpDownMoveWhenEditing = this.arrowsUpDownMoveWhenEditing;
        }
        if(this.editNextCellOnEnter) {
            this.agEditNextCellOnEnter = this.editNextCellOnEnter;
        }        

        const vMenuTabs = ['generalMenuTab', 'filterMenuTab'];
        if(this.showColumnsMenuTab) vMenuTabs.push('columnsMenuTab');

        let sideBar: any;
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
            };
        }

        const columnDefs = this.getColumnDefs();
        let maxBlocksInCache = CACHED_CHUNK_BLOCKS;

        // if row autoHeight, we need to do a refresh after first time data are displayed, to allow ag grid to re-calculate the heights
        let isRefreshNeededForAutoHeight = false;
        // if there is 'autoHeight' = true in any column, infinite cache needs to be disabled (ag grid lib requirement)
        for(const columnDef of columnDefs) {
            if(columnDef['autoHeight']) {
                maxBlocksInCache = -1;
                isRefreshNeededForAutoHeight = true;
                break;
            }
        }

        // setup grid options
        this.agGridOptions = {
            context: {
                componentParent: this
            },
            debug: false,
            rowModelType: 'serverSide',
            serverSideStoreType: 'partial',
            rowGroupPanelShow: 'onlyWhenGrouping', // TODO expose property,
            onGridReady: () => {
                this.log.debug('gridReady');
                this.isGridReady = true;
                if(this.isRendered) {
                    const emptyValue = '_empty';
                    if(this._internalColumnState !== emptyValue) {
                        this.columnState = this._internalColumnState;
                        this.columnStateChange.emit(this._internalColumnState);
                        // need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
                        this._internalColumnState = emptyValue;
                        this._internalColumnStateChange.emit(emptyValue);
                    }
                    this.restoreColumnsState();
                }
                this.agGridOptions.onDisplayedColumnsChanged = ()=> {
                    this.sizeHeaderAndColumnsToFit();
                    this.storeColumnsState();
                };
                if(this.onReady) {
                    this.onReady();
                }

                if(this.isColumnModelChangedBeforeGridReady) {
                    this.updateColumnDefs();
                } else {
                    // without timeout the column don't fit automatically
                    setTimeout(() =>{
                        this.sizeHeaderAndColumnsToFit();
                        this.scrollToSelectionEx();
                        }, 150);
                }
            },
            defaultColDef: {
                filter: false,
                menuTabs: vMenuTabs,
                valueGetter: this.displayValueGetter,
                valueFormatter: this.displayValueFormatter,
                sortable: this.enableSorting,
                resizable: this.enableColumnResize
            },
            columnDefs,

            stopEditingWhenGridLosesFocus: true,
            suppressAnimationFrame: true,
            animateRows: false,
            suppressColumnMoveAnimation: true,

            suppressContextMenu: false,
            suppressMovableColumns: !this.enableColumnMove,
            suppressAutoSize: true,
            autoSizePadding: 25,
            suppressFieldDotNotation: true,

            sideBar,
            getMainMenuItems: this.getMainMenuItems,
            rowHeight: this.rowHeight,

            rowSelection: this.myFoundset && (this.myFoundset.multiSelect === true) ? 'multiple' : 'single',
            suppressCellSelection: true,
            enableRangeSelection: false,

            singleClickEdit: false,
            suppressClickEdit: false,
            enableGroupEdit: false,
            groupUseEntireRow: this.groupUseEntireRow,
            groupMultiAutoColumn: true,
            suppressAggFuncInHeader: true, // TODO support aggregations

            suppressColumnVirtualisation: false,
            suppressScrollOnNewData: true,

            pivotMode: false,
            enableCellExpressions: true,

            rowBuffer: 0,
            // restrict to 2 server side calls concurrently
            maxConcurrentDatasourceRequests: 2,
            cacheBlockSize: CHUNK_SIZE,
            infiniteInitialRowCount: CHUNK_SIZE, // TODO should be the foundset default (also for grouping ?)
            maxBlocksInCache,
            purgeClosedRowNodes: true,
            enableBrowserTooltips: true,
            getRowNodeId: (data) =>  data._svyFoundsetUUID + '_' + data._svyFoundsetIndex,
            onGridSizeChanged: () => {
                setTimeout(() => {
                    // if not yet destroyed
                    if(this.agGrid.gridOptions.onGridSizeChanged) {
                        this.sizeHeaderAndColumnsToFit();
                    }
                }, 150);
            },
            onCellEditingStopped: (event) => {
                // don't allow escape if cell data is invalid
                if(this.onColumnDataChangePromise == null) {
                    const rowIndex = event.rowIndex;
                    const colId = event.column.getColId();
                    if(this.invalidCellDataIndex.rowIndex === rowIndex  && this.invalidCellDataIndex.colKey === colId) {
                        this.agGrid.api.startEditingCell({
                            rowIndex,
                            colKey: colId
                        });
                    }
                }
            },
            onCellEditingStarted: (event) => {
                // don't allow editing another cell if we have an invalidCellData
                if(this.invalidCellDataIndex.rowIndex !== -1 && this.invalidCellDataIndex.colKey !== '') {
                    const rowIndex = event.rowIndex;
                    const colId = event.column.getColId();
                    if(this.invalidCellDataIndex.rowIndex !== rowIndex  || this.invalidCellDataIndex.colKey !== colId) {
                        this.agGrid.api.stopEditing();
                        this.agGrid.api.startEditingCell({
                            rowIndex: this.invalidCellDataIndex.rowIndex,
                            colKey: this.invalidCellDataIndex.colKey
                        });
                    }
                }
            },
            onFilterChanged: () => {
             this.storeColumnsState();
            },
            onSortChanged: () => {
                this.storeColumnsState();
                if(this.isTableGrouped()) {
                    this.removeAllFoundsetRef = true;
                    this.agGrid.api.refreshServerSideStore({purge: true});
                }
                if(this.onSort) {
                    if(this.sortHandlerTimeout) {
                        clearTimeout(this.sortHandlerTimeout);
                    }
                    this.sortHandlerTimeout = setTimeout(() =>{
                        this.sortHandlerTimeout = null;
                        this.onSortHandler();
                    }, 250);
                }
            },
            onColumnResized: () => {
                this.sizeHeader();
                this.storeColumnsState();
            },
            onColumnVisible: (event) => {
                // workaround for ag-grid issue, when unchecking/checking all columns
                // visibility in the side panel, columns with colDef.hide = true are also made visible
                if(event.visible && event.columns && event.columns.length) {
                    const hiddenColumns = [];
                    for(const column of event.columns) {
                        // always hide Ghost columns such as _svyRowId and _svyFoundsetUUID
                        if(column.getColDef().hide && (column.getColDef().suppressColumnsToolPanel) && column.getColDef().suppressMenu) {
                            hiddenColumns.push(column);
                        }
                    }
                    this.agGridOptions.columnApi.setColumnsVisible(hiddenColumns, false);
                }
            },
            getContextMenuItems: () => this.contextMenuItems,
            navigateToNextCell: (params) => this.keySelectionChangeNavigation(params),
            tabToNextCell: (params) => this.tabSelectionChangeNavigation(params),
            onToolPanelVisibleChanged: () => {
                this.sizeHeaderAndColumnsToFit();
            },
            onCellKeyDown: (param: any) => {
                switch(param.event.keyCode) {
                    case 33: // PGUP
                    case 34: // PGDOWN
                    case 35: // END
                    case 36: // HOME
                        const focusedCell = this.agGrid.api.getFocusedCell();
                        if(focusedCell && !focusedCell.rowPinned && focusedCell.rowIndex != null) {
                            const focusedRow = this.agGrid.api.getDisplayedRowAtIndex(focusedCell.rowIndex);
                            if(focusedRow && !focusedRow.isSelected()) {
                                if(focusedRow.id) { // row is already created
                                    this.selectionEvent = { type: 'key' };
                                    focusedRow.setSelected(true, true);
                                } else {
                                    // row is not yet created, postpone selection & focus
                                    this.postFocusCell = { rowIndex: focusedCell.rowIndex, colKey: focusedCell.column.getColId() };
                                }
                            }
                        }
                }
            },
            processRowPostCreate: (params) => {
                if(this.postFocusCell && this.postFocusCell.rowIndex === params.rowIndex) {
                    const rowIndex = this.postFocusCell.rowIndex;
                    const colKey = this.postFocusCell.colKey;
                    const focusedRow = params.node;
                    this.postFocusCell = null;;
                    // need a timeout 0 because we can't call grid api during row creation
                    setTimeout(() => {
                        this.agGrid.api.clearFocusedCell(); // start clean, this will force setting the focus on the postFocusCell
                        this.selectionEvent = { type: 'key' };
                        focusedRow.setSelected(true, true);
                        this.agGrid.api.setFocusedCell(rowIndex, colKey);
                    }, 0);
                }
                if(this.columnsToFitAfterRowsRendered) {
                    this.columnsToFitAfterRowsRendered = false;
                    setTimeout(()  =>{
                        this.sizeHeaderAndColumnsToFit();
                    }, 0);
                }
            }
        } as GridOptions;

        if(this.showGroupCount) {
            this.agGridOptions.getChildCount = (row) => {
                if(this.showGroupCount && row && (row['svycount'] !== undefined)) {
                    return row['svycount'];
                }
                return undefined;
            };
        }

        // check if we have filters
        for(let i = 0; this.agGridOptions.sideBar && this.agGridOptions.sideBar['toolPanels'] && i < columnDefs.length; i++) {
            // suppress the side filter if the suppressColumnFilter is set to true
            if (!(toolPanelConfig && toolPanelConfig.suppressColumnFilter === true)) {
                if(columnDefs[i].filter) {
                    this.agGridOptions.sideBar['toolPanels'].push({
                        id: 'filters',
                        labelDefault: 'Filters',
                        labelKey: 'filters',
                        iconKey: 'filter',
                        toolPanel: 'agFiltersToolPanel',
                    });
                    break;
                }
            }
        }

        const gridFooterData = this.getFooterData();
        if (gridFooterData) {
            this.agGridOptions.pinnedBottomRowData = gridFooterData;
        }

        // rowStyleClassDataprovider
        if (this.rowStyleClassDataprovider) {
            this.agGridOptions.getRowClass = this.getRowClass;
        }

        if (!this.showLoadingIndicator) {
            this.agGridOptions.loadingCellRendererFramework = BlankLoadingCellRendrer;
        }

        // set all custom icons
        if (iconConfig) {
            const icons = new Object();

            for (const iconName of Object.keys(iconConfig)) {
                let aggridIcon = iconName.slice(4);
                aggridIcon = aggridIcon[0].toLowerCase() + aggridIcon.slice(1);
                icons[aggridIcon] = this.getIconElement(iconConfig[iconName]);
            }
            this.agGridOptions.icons = icons;
        }

        // set a fixed height if is in designer
        this.setHeight();

        // locale text
        if (localeText) {
            this.agGridOptions['localeText'] = localeText;
        }

        // fill user grid options properties
        if (userGridOptions) {
            const gridOptionsSetByComponent = {};
            for( const p in TABLE_PROPERTIES_DEFAULTS) {
                if(TABLE_PROPERTIES_DEFAULTS[p]['default'] !== this[p]) {
                    gridOptionsSetByComponent[TABLE_PROPERTIES_DEFAULTS[p]['gridOptionsProperty']] = true;
                }
            }

            for (const property in userGridOptions) {
                if (userGridOptions.hasOwnProperty(property) && !gridOptionsSetByComponent.hasOwnProperty(property)) {
                    this.agGridOptions[property] = userGridOptions[property];
                }
            }
        }

        // handle options that are dependent on gridOptions
        if(this.agGridOptions['enableCharts'] && this.agGridOptions['enableRangeSelection']) {
            this.contextMenuItems.push('chartRange');
        }

        // the group manager
        this.groupManager = new GroupManager(this);

        // show warnings
        if(this.styleClass === 'ag-theme-fresh') {
            this.log.warn('ag-theme-fresh is deprecated, see: https://www.ag-grid.com/javascript-grid/themes-v23-migration/');
        }
    }

    svyOnInit() {
        super.svyOnInit();
        // TODO:
        if (this.servoyApi.isInDesigner()) {
            // $element.addClass("design-mode");
            // var designGridOptions = {
            //     rowModelType: 'clientSide',
            //     columnDefs: columnDefs,
            //     rowHeight: $scope.model.rowHeight,
            //     rowData: []
            // };

            // // init the grid
            // new agGrid.Grid(gridDiv, designGridOptions);
            return;
        } else {
            this.isRendered = true;
        }
        this.agGridOptions['popupParent'] = this.agGridElementRef.nativeElement;

        this.agGridElementRef.nativeElement.addEventListener('click', (e: any) => {
            if(e.target.parentNode && e.target.parentNode.classList &&
                e.target.parentNode.classList.contains('ag-selection-checkbox')) {
                let t = e.target.parentNode;
                while(t && !t.hasAttribute('row-index')) t = t.parentNode;
                if(t) {
                    const rowIndex = t.getAttribute('row-index');
                    this.selectionEvent = { type: 'click' , event: {ctrlKey: true, shiftKey: e.shiftKey}, rowIndex: parseInt(rowIndex, 10)};
                }
            }
        });

        // init the root foundset manager
        this.initRootFoundset();

        // default selection
        this.selectedRowIndexesChanged();

        // default sort order
        if(this.agGridOptions['enableServerSideSorting']) {
            this.agGrid.api.setSortModel(this.getSortModel());
        }

        // register listener for selection changed
        this.agGrid.api.addEventListener('selectionChanged', () => {
         this.onSelectionChanged();
        });

        this.agGrid.api.addEventListener('cellClicked', (params: any) => {
         this.cellClickHandler(params);
        });
        this.agGrid.api.addEventListener('cellDoubleClicked', (params: any) => {
         this.onCellDoubleClicked(params);
        });
        this.agGrid.api.addEventListener('cellContextMenu', (params: any) => {
         this.onCellContextMenu(params);
        });

        // // listen to group changes
        this.agGrid.api.addEventListener('columnRowGroupChanged', (params: any) => {
         this.onColumnRowGroupChanged(params);
        });

        // listen to group collapsed
        this.agGrid.api.addEventListener('rowGroupOpened', (params: any) => {
         this.onRowGroupOpenedHandler(params);
        });
    }

    svyOnChanges(changes: SimpleChanges) {
        if (changes) {
            for (const property of Object.keys(changes)) {
                const change = changes[property];
                switch (property) {
                    case 'responsiveHeight':
                        this.setHeight();
                        break;
                    case 'visible':
                        // if the table was never visible
                        if (this.isRendered === false && change.currentValue === true) {
                            // refresh the columnDefs since was null the first time
                            this.updateColumnDefs();
                            this.isRendered = true;
                        }
                        break;
                    case 'myFoundset':
						this.log.debug('myFoundset root changed');
                        if(!this.myFoundset) {
							this.log.debug('myFoundset not set, ignore model change');
							return;
						}
						if(this.isTableGrouped()) {
							this.purge();
						}
                        if(change.currentValue && this.myFoundsetId && change.currentValue.foundsetId !== this.myFoundsetId) {
                            this.filterModel = null;
                        }
                        this.myFoundsetId = change.currentValue.foundsetId;
						const isChangedToEmpty = change.currentValue && change.previousValue && change.previousValue.serverSize === 0 && change.previousValue.serverSize > 0;
						if(this.myFoundset.viewPort.size > 0 || isChangedToEmpty) {
							// browser refresh
                            this.isRootFoundsetLoaded = true;
                            this.initRootFoundset();
						} else {
							// newly set foundset
							this.isRootFoundsetLoaded = false;
						}
                        // TODO ASK R&D should i remove and add the previous listener ?
                        if(this.removeChangeListenerFunction) this.removeChangeListenerFunction();
                        this.myFoundset.removeChangeListener(this.changeListener);
						this.removeChangeListenerFunction = this.myFoundset.addChangeListener((ch) => {
                         this.changeListener(ch);
                        });
                        break;
                    case 'columns':
                        if(!change.firstChange) {
                            // need a better way to detect if columns array are changed
                            if(change.currentValue !== change.previousValue) {
                                this.updateColumnDefs();
                            } else {
                                for(let i = 0; i < this.columns.length; i++) {
                                    for(const prop of COLUMN_KEYS_TO_CHECK_FOR_CHANGES) {
                                        const oldPropertyValue = change.previousValue[i][prop];
                                        const newPropertyValue = change.currentValue[i][prop];
                                        if(newPropertyValue !== oldPropertyValue) {
                                            this.log.debug('column property changed');
                                            if(this.isGridReady) {
                                                if(prop !== 'footerText') {
                                                    this.updateColumnDefs();
                                                }
                                                if(prop !== 'visible' && prop !== 'width') {
                                                    this.restoreColumnsState();
                                                }
                                            } else {
                                                this.isColumnModelChangedBeforeGridReady = true;
                                            }

                                            if(prop === 'headerTitle') {
                                                this.handleColumnHeaderTitle(i, newPropertyValue);
                                            } else if (prop === 'footerText') {
                                                this.handleColumnFooterText();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    case '_internalColumnState':
                        if(this.isGridReady && (change.currentValue !== '_empty')) {
                            this.columnState = change.currentValue;
                            this.columnStateChange.emit(this.columnState);
                            // need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
                            this._internalColumnState = '_empty';
                            this._internalColumnStateChange.emit(this._internalColumnState);
                            if(this.columnState) {
                                this.restoreColumnsState();
                            } else {
                                this.agGrid.columnApi.resetColumnState();
                            }
                        }
                        break;
                    case '_internalAutoSizeState':
                        if(this.isGridReady && (change.currentValue === true)) {
                            // need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalAutoSizeState again
                            this._internalAutoSizeState = false;
                            this._internalAutoSizeStateChange.emit(this._internalAutoSizeState);
                            this.agGridOptions.columnApi.autoSizeAllColumns(false);
                        }
                        break;
                }
            }
        }
        super.svyOnChanges(changes);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        // clear all foundsets
        this.groupManager.removeFoundsetRefAtLevel(0);
        if(this.removeChangeListenerFunction) this.removeChangeListenerFunction();

        // release grid resources
        this.agGrid.api.destroy();
    }

    displayValueGetter(params: any) {
        const field = params.colDef.field;
        if (field && params.data) {
            let value = params.data[field];

            if (value == null) {
                value = NULL_VALUE; // need to use an object for null, else grouping won't work in ag grid
            }
            return value;
        }

        return undefined;
    }

    displayValueFormatter(params: any): string {
        const field = params.colDef.field;
        if (!params.data) {
            return undefined;
        }
        let value = params.data[field];
        if (value && value.displayValue !== undefined) {
            value = value.displayValue;
        }
        // skip format for pinned rows (footer), they are always text
        if(!params.node.rowPinned) {
            const dataGrid = params.context.componentParent;
            const column = dataGrid.getColumn(params.column.colId);

            if (column && column.format ) {
                value = dataGrid.formattingService.format(value, column.format, false);
            }
        }

        if (value == null && params.value === NULL_VALUE) {
            value = '';
        }

        return value;
    }

    /**`
     * Resize header and all columns so they can fit the horizontal space
     *  */
    sizeHeaderAndColumnsToFit() {
        this.agGrid.api.sizeColumnsToFit();
        this.sizeHeader();
    }

    /**
     * Update header height based on cells content height
     */
    sizeHeader() {
        const headerCell =  this.findChildrenNativeElements(this.agGridElementRef.nativeElement, 'ag-header-cell');
        const paddingTop = headerCell.length ? parseInt(this.getCSSProperty(headerCell[0], 'padding-top'), 10) : 0;
        const paddinBottom = headerCell.length ? parseInt(this.getCSSProperty(headerCell[0], 'padding-bottom'), 10) : 0;
        const headerCellLabels =  this.findChildrenNativeElements(this.agGridElementRef.nativeElement, 'ag-header-cell-text');
        let minHeight = this.agGridOptions.headerHeight >= 0 ? this.agGridOptions.headerHeight : 25;

        if(minHeight > 0) {
            for(const label of headerCellLabels) {
                minHeight = Math.max(minHeight, label.scrollHeight + paddingTop + paddinBottom);
            }
        }
        this.agGrid.api.setHeaderHeight(minHeight);
    }

    findChildrenNativeElements(el: any, className: any) {
        const childrenNativeElements: any = [];
        this._findChildrenNativeElements(el, className, childrenNativeElements);
        return childrenNativeElements;
    }

    _findChildrenNativeElements(el: any, className: any, childrenNativeElements: any) {
        const clazz = el.hasAttribute && el.hasAttribute('class') ? el.getAttribute('class') : null;
        if(clazz == null) return;
        const idx = clazz.indexOf(className);
        if(idx !== -1 && ((idx + className.length === clazz.length) || clazz[idx + className.length] === ' ')) {
            childrenNativeElements.push(el);
        }

        for(const childNode of el.childNodes) {
            this._findChildrenNativeElements(childNode, className, childrenNativeElements);
        }
    }

    getCSSProperty(el: any, cssProperty: any) {
        const style = window.getComputedStyle(el);
        return style.getPropertyValue(cssProperty);
    }

    initRootFoundset() {

        this.foundset = new FoundsetManager(this, this.myFoundset, 'root', true);

        const foundsetServer = new FoundsetServer(this, []);
        const datasource = new FoundsetDatasource(this, foundsetServer);
        if(this.myFoundset) this.agGrid.api.setServerSideDatasource(datasource);
        this.isSelectionReady = false;
    }

    refreshDatasource() {
        const currentEditCells = this.agGrid.api.getEditingCells();
        if(currentEditCells.length !== 0) {
            this.startEditFoundsetIndex = currentEditCells[0].rowIndex + 1;
            this.startEditColumnIndex = this.getColumnIndex(currentEditCells[0].column.getColId());
        }
        const foundsetServer = new FoundsetServer(this, []);
        const datasource = new FoundsetDatasource(this, foundsetServer);
        this.agGrid.api.setServerSideDatasource(datasource);
        this.isSelectionReady = false;
        this.scrollToSelectionWhenSelectionReady = true;
    }

    getMainMenuItems(params: any) {
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
        const dataGrid = params.context.componentParent;
        let items: any;
        if(dataGrid.agMainMenuItemsConfig && Object.keys(dataGrid.agMainMenuItemsConfig).length !== 0) {
            items = [];
            for (const key in dataGrid.agMainMenuItemsConfig) {
                if(dataGrid.agMainMenuItemsConfig[key]) items.push(key);
            }
        } else {
            items = ['rowGroup', 'rowUnGroup'];
        }
        const menuItems: any = [];
        params.defaultItems.forEach((item: any) => {
            if (items.indexOf(item) > -1) {
                menuItems.push(item);
            }
        });
        return menuItems;
    }

    getColumnDefs() {
        //create the column definitions from the specified columns in designer
        const colDefs = [];
        let colDef: any = { };
        const colGroups = { };
        let column: any;
        for (let i = 0; this.columns && i < this.columns.length; i++) {
            column = this.columns[i];

            const field = this.getColumnID(column, i);
            //create a column definition based on the properties defined at design time
            colDef = {
                headerName: column.headerTitle ? column.headerTitle : '',
                field,
                headerTooltip: column.headerTooltip ? column.headerTooltip : null,
                cellRenderer: (params: any) => this.cellRenderer(params)
            };

            if(column.id) {
                colDef.colId = column.id;
            }

            // styleClass
            colDef.headerClass = 'ag-table-header' + (column.headerStyleClass ? ' ' + column.headerStyleClass : '');
            if (column.styleClassDataprovider) {
                colDef.cellClass = this.getCellClass;
            } else {
                colDef.cellClass = 'ag-table-cell' + (column.styleClass ? ' ' + column.styleClass : '');
            }

            // column grouping
            colDef.enableRowGroup = column.enableRowGroup;
            if (column.rowGroupIndex >= 0) colDef.rowGroupIndex = column.rowGroupIndex;
            if (column.width) colDef.width = column.width;

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

            if (column.editType) {
                colDef.editable = column.editType !== 'CHECKBOX' ? this.isColumnEditable : false;

                if(column.editType === 'TEXTFIELD') {
                    colDef.cellEditorFramework = TextEditor;
                } else if(column.editType === 'TYPEAHEAD') {
                    colDef.cellEditorFramework = TypeaheadEditor;
                } else if(column.editType === 'DATEPICKER') {
                    colDef.cellEditorFramework = DatePicker;
                } else if(column.editType === 'COMBOBOX') {
                    colDef.cellEditorFramework = SelectEditor;
                } else if(column.editType === 'FORM') {
                    colDef.cellEditorFramework = FormEditor;
                }

                // const _this = this;
                // colDef.onCellValueChanged = function(params) {
                //     var focused = this.doc.activeElement;
                //     // in case value change is triggered by clicking into another cell
                //     // we need a timeout so the new cell will enter edit mode (updateFoundsetRecord needs
                //     // to know the new editing cell, so it can restore its editing state after update)
                //     if(focused && ($(gridDiv).has($(focused)).length)) {
                //         setTimeout(function() {
                //             _this.updateFoundsetRecord(params);
                //         }, 200);
                //     }
                //     else {
                //         _this.updateFoundsetRecord(params);
                //     }
                // }
                colDef.onCellValueChanged = this.updateFoundsetRecord;
            }

            if (column.filterType) {
                colDef.filterParams = { applyButton: true, clearButton: true, newRowsAction: 'keep', suppressAndOrCondition: true, caseSensitive: false };

                if(column.filterType === 'TEXT') {
                    colDef.filter = 'agTextColumnFilter';
                } else if(column.filterType === 'NUMBER') {
                    colDef.filter = 'agNumberColumnFilter';
                } else if(column.filterType === 'DATE') {
                    colDef.filter = 'agDateColumnFilter';
                } else if(column.filterType === 'VALUELIST') {
                    colDef.filterFramework = ValuelistFilter;
                } else if(column.filterType === 'RADIO') {
                    colDef.filterFramework = RadioFilter;
                }
            }

            colDef.tooltipValueGetter = (args: any) => this.getTooltip(args);


            let columnOptions = this.datagridService.columnOptions ? this.datagridService.columnOptions : {};
            columnOptions = this.mergeConfig(columnOptions, column.columnDef);

            if(columnOptions) {
                const colDefSetByComponent = {};
                for( const p in COLUMN_PROPERTIES_DEFAULTS) {
                    if(COLUMN_PROPERTIES_DEFAULTS[p]['default'] !== column[p]) {
                        colDefSetByComponent[COLUMN_PROPERTIES_DEFAULTS[p]['colDefProperty']] = true;
                    }
                }
                for (const property in columnOptions) {
                    if (columnOptions.hasOwnProperty(property) && !colDefSetByComponent.hasOwnProperty(property)) {
                        colDef[property] = columnOptions[property];
                    }
                }
            }

            if(column.headerGroup) {
                if(!colGroups[column.headerGroup]) {
                    colGroups[column.headerGroup] = {};
                    colGroups[column.headerGroup]['headerClass'] = column.headerGroupStyleClass;
                    colGroups[column.headerGroup]['children'] = [];

                }
                colGroups[column.headerGroup]['children'].push(colDef);
            } else {
                colDefs.push(colDef);
            }
        }

        for(const groupName in colGroups) {
            if(colGroups.hasOwnProperty(groupName)) {
                const group: any = {};
                group.headerName = groupName;
                group.headerClass = colGroups[groupName]['headerClass'];
                group.children = colGroups[groupName]['children'];
                colDefs.push(group);
            }
        }

        // TODO svyRowId should not be visible. I need the id for the selection
        colDefs.push({
            field: '_svyRowId',
            headerName: '_svyRowId',
            suppressColumnsToolPanel: true,
            suppressMenu: true,
            suppressNavigable: true,
            resizable: false,
            hide: true
        });

        colDefs.push({
            field: '_svyFoundsetUUID',
            headerName: '_svyFoundsetUUID',
            suppressColumnsToolPanel: true,
            suppressMenu: true,
            suppressNavigable: true,
            resizable: false,
            hide: true
        });

        return colDefs;
    }

    /**
     * Returns the column identifier
     *
     * @param column
     * @param idx
     *
     * @return
     *
     * @private
     */
    getColumnID(column: any, idx: any) {
        if (column.dataprovider) {
            return column.dataprovider.idForFoundset + ':' + idx;
        } else {
            return 'col_' + idx;
        }
    }

    /**
     * Returns the column with the given fieldName
     *
     * @param field
     * @return
     *
     */
    getColumn(field: any, columnsModel?: any): any {
        if (!columnsModel && this.state.columns[field]) { // check if is already cached
            return this.state.columns[field];
        } else {
            const columns = columnsModel ? columnsModel : this.columns;
            for (let i = 0; i < columns.length; i++) {
                const column = columns[i];
                if (column.id === field || this.getColumnID(column, i) === field) {
                    // cache it in hashmap for quick retrieval
                    if(!columnsModel) this.state.columns[field] = column;
                    return column;
                }
            }
        }
        return null;
    }

    /**
     * @param idsForFoundset
     * Finds all the columns with the given idForFoundset
     *
     * @return
     *
     * @private
     */
    getColIDs(idsForFoundset: any) {

        const result = [];
        if (!idsForFoundset) {
            return [];
        }

        for (let i = 0; i < this.columns.length; i++) {
            const column = this.columns[i];
            if (column.dataprovider && column.dataprovider.idForFoundset === idsForFoundset) {
                if (column.id) {
                    // Use the colId if is set
                    result.push(column.id);
                } else {
                    // Use the field if colId is not available
                    result.push(this.getColumnID(column, i));
                }
            }
        }
        return result;
    }

    getEditingRowIndex(param: any): number {
        return this.getFoundsetIndexFromEvent(param);
    }

    stripUnsortableColumns(sortString: any) {
        if (sortString) {
            let newSortString = '';
            const sortColumns = sortString.split(',');
            for (const sortColumn of sortColumns) {
                let idForFoundset: any;
                let sortDirection: any;
                if (!sortColumn) {
                    continue;
                } else if (sortColumn.substr(sortColumn.length - 5, 5) === ' desc') {
                    idForFoundset = sortColumn.substring(0, sortColumn.length - 5);
                    sortDirection = 'desc';
                } else if (sortColumn.substr(sortColumn.length - 4, 4) === ' asc') {
                    idForFoundset = sortColumn.substring(0, sortColumn.length - 4);
                    sortDirection = 'asc';
                }

                let isSortable = false;
                if (idForFoundset && sortDirection) {
                    const agColIds = this.getColIDs(idForFoundset);
                    for (const agColId of agColIds) {
                        isSortable = isSortable || this.getColumn(agColId).enableSort;
                        if(isSortable) break;
                    }
                }
                if(isSortable) {
                    if(newSortString) newSortString += ',';
                    newSortString += idForFoundset + ' ' + sortDirection;
                }
            }
            return newSortString;
        } else return sortString;
    }

    /**
     * Returns true if table is grouping
     *
     * @return
     *
     */
    isTableGrouped() {
        const rowGroupCols = this.getRowGroupColumns();
        return rowGroupCols.length > 0;
    }

    /**
     * Returns table's rowGroupColumns
     * */
    getRowGroupColumns(): any {
        const rowGroupCols = this.agGridOptions.columnApi ? this.agGridOptions.columnApi.getRowGroupColumns() : null;
        return rowGroupCols ? rowGroupCols : [];
    }

    /**
     * Returns the group hierarchy for the given node
     *
     * @private
     * @param node
     * @return
     *
     *
     */
    getNodeGroupInfo(node: any) {
        const rowGroupCols = [];
        //var rowGroupColIdxs = [];
        const groupKeys = [];

        let parentNode = node.parent;
        while (parentNode && parentNode.level >= 0 && parentNode.group === true) {
            // check if all fields are fine
            if (!parentNode.field && !parentNode.data) {
                this.log.warn('cannot resolve group nodes ');
                // exit
                return null;
            }

            // is reverse order
            rowGroupCols.unshift(parentNode.field);
            //rowGroupColIdxs.unshift(getColumnIndex(parentNode.field))
            groupKeys.unshift(parentNode.data[parentNode.field]);

            // next node
            parentNode = parentNode.parent;
        }

        const field = node.field;
        const key = node.key;

        rowGroupCols.push(field);
        groupKeys.push(key);

        const result = {
            rowGroupFields: rowGroupCols,
            rowGroupKeys: groupKeys
        };
        return result;
    }

    mergeConfig(target: any, source: any) {
        let property: any;

        // clone target to avoid side effects
        let mergeConfig = {};
        for (property in target) {
            if(target.hasOwnProperty(property)) {
                mergeConfig[property] = target[property];
            }
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

    getCellClass(params: any) {
        const dataGrid = params.context.componentParent;
        const column = dataGrid.getColumn(params.colDef.field);

        let cellClass = 'ag-table-cell';
        if(column.styleClass) cellClass += ' ' + column.styleClass;

        return cellClass;
    }

    /**
     * Callback used by ag-grid colDef.tooltip
     */
    getTooltip(args: any) {
        let tooltip = '';
        // skip pinned (footer) nodes
        if(!args.node.rowPinned) {
            if (!this.isTableGrouped()) {
                const column = this.getColumn(args.colDef.field);
                if (column && column.tooltip) {
                    const index = args.node.rowIndex - this.foundset.foundset.viewPort.startIndex;
                    tooltip = column.tooltip[index];
                }
            } else {
                const foundsetManager = this.getFoundsetManagerByFoundsetUUID(args.data._svyFoundsetUUID);
                const index = foundsetManager.getRowIndex(args.data) - foundsetManager.foundset.viewPort.startIndex;
                if (index >= 0 && foundsetManager.foundset.viewPort.rows[index][args.colDef.field + '_tooltip'] !== undefined) {
                    tooltip = foundsetManager.foundset.viewPort.rows[index][args.colDef.field + '_tooltip'];
                }
            }
        }
        return tooltip;
    }

    cellRenderer(params: any) {
        let isGroupColumn = false;
        let colId = null;
        if(params.colDef.field === undefined) {
            isGroupColumn = true;
            if(params.colDef.colId.indexOf('ag-Grid-AutoColumn-') === 0) {
                colId = params.colDef.colId.substring('ag-Grid-AutoColumn-'.length);
            }
        } else {
            colId = params.colDef.field;
        }

        const col = colId != null ? this.getColumn(colId) : null;
        let value = params.value;

        let returnValueFormatted = false;
        let checkboxEl = null;

        if(col && col.editType === 'CHECKBOX' && !params.node.group) {
            checkboxEl = this.doc.createElement('i');
            checkboxEl.className = this.getIconCheckboxEditor(parseInt(value, 10));
        } else {
            if(col != null && col.showAs === 'html') {
                value =  value && value.displayValue !== undefined ? value.displayValue : value;
            } else if(col != null && col.showAs === 'sanitizedHtml') {
                value = this.sanitizer.sanitize(SecurityContext.HTML, value && value.displayValue !== undefined ? value.displayValue : value);
            } else if (value && value.contentType && value.contentType.indexOf('image/') === 0 && value.url) {
                value = '<img class="ag-table-image-cell" src="' + value.url + '">';
            } else {
                returnValueFormatted = true;
            }

            if(value instanceof Date) returnValueFormatted = true;
        }

        let styleClassProvider = null;
        if(!isGroupColumn) {
            if(!params.node.rowPinned) {
                if (!this.isTableGrouped()) {
                    const column = this.getColumn(params.colDef.field);
                    if (column && column.styleClassDataprovider) {
                        const index = params.rowIndex - this.foundset.foundset.viewPort.startIndex;
                        styleClassProvider = column.styleClassDataprovider[index];
                    }
                } else if (params.data && params.data._svyFoundsetUUID) {
                        const foundsetManager = this.getFoundsetManagerByFoundsetUUID(params.data._svyFoundsetUUID);
                        const index = foundsetManager.getRowIndex(params.data) - foundsetManager.foundset.viewPort.startIndex;
                        if (index >= 0) {
                            styleClassProvider = foundsetManager.foundset.viewPort.rows[index][params.colDef.field + '_styleClassDataprovider'];
                        } else {
                            this.log.warn('cannot render styleClassDataprovider for row at index ' + index);
                            this.log.warn(params.data);
                        }
                }
            } else if(col.footerStyleClass && params.node.rowPinned === 'bottom') { // footer
                styleClassProvider = col.footerStyleClass;
            }
        }

        if(styleClassProvider) {
            const divContainer = this.doc.createElement('div');
            divContainer.className = styleClassProvider;
            if(checkboxEl) {
                divContainer.appendChild(checkboxEl);
            } else {
                divContainer.innerHTML = returnValueFormatted ? params.valueFormatted : value;
            }

            return divContainer;
        } else {
            if(checkboxEl) {
                return checkboxEl;
            } else {
                return returnValueFormatted ? this.doc.createTextNode(params.valueFormatted) : value;
            }
        }
    }

    selectedRowIndexesChanged(foundsetManager?: any): boolean {
        // FIXME can't select the record when is not in viewPort. Need to synchornize with viewPort record selection
        this.log.debug(' - 2.1 Request selection changes');

        // Disable selection when table is grouped
        if (this.isTableGrouped()) {
            return  false;;
        }

        let isSelectedRowIndexesChanged = false;
        // old selection
        const oldSelectedNodes = this.agGrid.api.getSelectedNodes();

        // CHANGE Seleciton
        if (!foundsetManager) {
            foundsetManager = this.foundset;
        }

        if (!foundsetManager.foundset) {
            return false;
        }

        const selectedNodes = new Array();
        for(const selectedRowIndex of foundsetManager.foundset.selectedRowIndexes) {

            const rowIndex = selectedRowIndex - foundsetManager.foundset.viewPort.startIndex;
            // find rowid
            if (rowIndex > -1 && foundsetManager.foundset.viewPort.rows[rowIndex]) {
                //rowIndex >= foundsetManager.foundset.viewPort.startIndex && rowIndex <= foundsetManager.foundset.viewPort.size + foundsetManager.foundset.viewPort.startIndex) {
                if (!foundsetManager.foundset.viewPort.rows[rowIndex]) {
                    this.log.error('how is possible there is no rowIndex ' + rowIndex + ' on viewPort size ' + foundsetManager.foundset.viewPort.rows.length);
                    // TODO deselect node
                    continue;
                }

                const node = this.agGrid.api.getRowNode(foundsetManager.foundsetUUID + '_' + selectedRowIndex);
                if (node) {
                    selectedNodes.push(node);
                }
            } else {
                // TODO selected record is not in viewPort: how to render it ?
            }
        }

        for (const oldSelectedNode of oldSelectedNodes) {
            if(selectedNodes.indexOf(oldSelectedNode) === -1) {
                this.selectionEvent = null;
                oldSelectedNode.setSelected(false);
                isSelectedRowIndexesChanged = true;
            }
        }

        for (const selectedNode of selectedNodes) {
            if(oldSelectedNodes.indexOf(selectedNode) === -1) {
                this.selectionEvent = null;
                selectedNode.setSelected(true);
                isSelectedRowIndexesChanged = true;
            }
        }

        return isSelectedRowIndexesChanged;
    }

    /**
     * Update the uiGrid row with given viewPort index
     *
     * @param rowUpdates
     * @param foundsetManager
     *
     * return {Boolean} whatever a purge ($scope.purge();) was done due to update
     *
     */
    updateRows(rowUpdates: any, foundsetManager: any) {
        let needPurge = false;

        const rowUpdatesSorted = rowUpdates.sort((a: any, b: any) => b.type - a.type);

        for (const rowUpdate of rowUpdatesSorted) {
            switch (rowUpdate.type) {
                case ChangeType.ROWS_CHANGED:
                    for (let j = rowUpdate.startIndex; j <= rowUpdate.endIndex; j++) {
                        this.updateRow(j, foundsetManager);
                    }
                    break;
                case ChangeType.ROWS_INSERTED:
                case ChangeType.ROWS_DELETED:
                    needPurge = true;
                    break;
                default:
                    break;
            }
            if(needPurge) break;
            // TODO can update single rows ?
        }

        if(needPurge) {
            this.purge();
        }
        return needPurge;
    }

    /**
     * Update the uiGrid row with given viewPort index
     *
     * @param index
     *
     *
     */
    updateRow(index: any, foundsetManager: any) {
        const rows = foundsetManager.getViewPortData(index, index + 1);
        const row = rows.length > 0 ? rows[0] : null;
        if (row) {
            const rowFoundsetIndex = foundsetManager.foundset.viewPort.startIndex + index;
            const node = this.agGrid.api.getRowNode(row._svyFoundsetUUID + '_' + rowFoundsetIndex);
            if(node) {
                // check if row is really changed
                let isRowChanged = false;
                for(const rowItemKey in row) {
                    if(row.hasOwnProperty(rowItemKey)) {
                        let currentRowItemValue = node.data[rowItemKey];
                        if(currentRowItemValue && (currentRowItemValue.displayValue !== undefined)) {
                            currentRowItemValue = currentRowItemValue.displayValue;
                        }
                        if(row[rowItemKey] !== currentRowItemValue) {
                            isRowChanged = true;
                            break;
                        }
                    }
                }

                // find the columns with styleClassDataprovider
                const styleClassDPColumns = [];
                const allDisplayedColumns = this.agGrid.columnApi.getAllDisplayedColumns();

                for (const column of allDisplayedColumns) {
                    let columnModel = null;
                    if (foundsetManager.isRoot) {
                        columnModel = this.getColumn(column.getColDef().field);
                    } else if (this.hashedFoundsets) {
                        for (const hashedFoundset of this.hashedFoundsets) {
                            if (hashedFoundset.foundsetUUID === foundsetManager.foundsetUUID) {
                                columnModel = this.getColumn(column.getColDef().field, hashedFoundset.columns);
                                break;
                            }
                        }
                    }
                    if (columnModel && columnModel.styleClassDataprovider && columnModel.styleClassDataprovider[index] !== undefined) {
                        styleClassDPColumns.push(column);
                    }
                }

                if(isRowChanged || styleClassDPColumns.length) {
                    // find first editing cell for the updating row
                    const editCells = this.agGrid.api.getEditingCells();
                    let editingColumnId = null;
                    for(const editCell of editCells) {
                        if(index === editCell.rowIndex) {
                            editingColumnId = editCell.column.getColId();
                            break;
                        }
                    }

                    // stop editing to allow setting the new data
                    if(isRowChanged && editingColumnId) {
                        this.agGrid.api.stopEditing(true);
                    }

                    if(isRowChanged) {
                        node.setData(row);
                    }

                    if(styleClassDPColumns.length) {
                        const refreshParam = {
                            rowNodes: [node],
                            columns: styleClassDPColumns,
                            force: true
                        };
                        this.agGrid.api.refreshCells(refreshParam);
                    }

                    // restart the editing
                    if(isRowChanged && editingColumnId) {
                        this.agGrid.api.startEditingCell({rowIndex: index, colKey: editingColumnId});
                    }
                }
            } else {
                this.log.warn('could not find row at index ' + index);
            }
        } else {
            this.log.warn('could not update row at index ' + index);
        }
    }

    updateFoundsetRecord(params: any) {
        const _this = params.context.componentParent;
        const rowIndex = params.node.rowIndex;
        const colId = params.column.colId;

        // if we have an invalid cell data, ignore any updates for other cells
        if((_this.invalidCellDataIndex.rowIndex !== -1 && _this.invalidCellDataIndex.rowIndex !== rowIndex)
            || (_this.invalidCellDataIndex.colKey !== '' && _this.invalidCellDataIndex.colKey !== colId)) {
            return;
        }

        const row = params.data;
        let foundsetManager = _this.getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
        if (!foundsetManager) foundsetManager = _this.foundset;
        const foundsetRef = foundsetManager.foundset;
        let newValue = params.newValue;
        if(newValue && newValue.realValue !== undefined) {
            newValue = newValue.realValue;
        }
        let oldValue = params.oldValue;
        if(oldValue && oldValue.realValue !== undefined) {
            oldValue = oldValue.realValue;
        }
        let oldValueStr = oldValue;
        if(oldValueStr == null) oldValueStr = '';

        const col = _this.getColumn(params.colDef.field);
        // ignore types in compare only for non null values ("200"/200 are equals, but ""/0 is not)
        let isValueChanged = newValue !== oldValueStr || (!newValue && newValue !== oldValueStr);
        if(isValueChanged && newValue instanceof Date && oldValue instanceof Date) {
            isValueChanged = newValue.toISOString() !== oldValue.toISOString();
        }
        if(col && col.dataprovider && col.dataprovider.idForFoundset && (isValueChanged || _this.invalidCellDataIndex.rowIndex !== -1)) {
            if(isValueChanged) {
                foundsetRef.updateViewportRecord(row._svyRowId, col.dataprovider.idForFoundset, newValue, oldValue);
                if(_this.onColumnDataChange) {
                    const currentEditCells =  _this.agGrid.api.getEditingCells();
                    _this.onColumnDataChangePromise = _this.onColumnDataChange(
                        _this.getFoundsetIndexFromEvent(params),
                        _this.getColumnIndex(params.column.colId),
                        oldValue,
                        newValue,
                        _this.createJSEvent(),
                        _this.getRecord(params)
                    );
                    _this.onColumnDataChangePromise.then((r: any) => {
                        if(r === false) {
                            // if old value was reset, clear invalid state
                            let currentValue = _this.agGrid.api.getValue(colId, params.node);
                            if(currentValue && currentValue.realValue !== undefined) {
                                currentValue = currentValue.realValue;
                            }
                            if(oldValue === currentValue) {
                                _this.invalidCellDataIndex.rowIndex = -1;
                                _this.invalidCellDataIndex.colKey = '';
                            } else {
                                _this.invalidCellDataIndex.rowIndex = rowIndex;
                                _this.invalidCellDataIndex.colKey = colId;
                            }
                            const editCells = _this.agGrid.api.getEditingCells();
                            if(_this.isSelectionReady && (!editCells.length || (editCells[0].rowIndex !== rowIndex || editCells[0].column.colId !== colId))) {
                                _this.agGrid.api.stopEditing();
                                _this.agGrid.api.startEditingCell({
                                    rowIndex,
                                    colKey: colId
                                });
                                setTimeout(() => {
                                    _this.selectionEvent = null;
                                    _this.agGrid.api.forEachNode( (node: any) => {
                                        if (node.rowIndex === rowIndex) {
                                            node.setSelected(true, true);
                                        }
                                    });
                                }, 0);
                            }
                        } else {
                            _this.invalidCellDataIndex.rowIndex = -1;
                            _this.invalidCellDataIndex.colKey = '';
                            const editCells = _this.agGrid.api.getEditingCells();
                            if(_this.isSelectionReady && editCells.length === 0 && currentEditCells.length !== 0) {
                                _this.agGrid.api.startEditingCell({
                                    rowIndex: currentEditCells[0].rowIndex,
                                    colKey: currentEditCells[0].column.colId
                                });
                            }
                        }
                        _this.onColumnDataChangePromise = null;
                    }).catch(function(e: any) {
                        this.log.error(e);
                        this.invalidCellDataIndex.rowIndex = -1;
                        this.invalidCellDataIndex.colKey = '';
                        _this.onColumnDataChangePromise = null;
                    });
                }
            }
        }
    }

    /**
     * remove the given foundset hash from the model hashmap.
     * User to clear the memory
     *
     * @public
     *  */
    removeFoundSetByFoundsetUUID(foundsetHash: any) {

        if (foundsetHash === 'root') {
            this.log.error('Trying to remove root foundset');
            return false;
        }

        // remove the hashedFoundsets
        this.servoyApi.callServerSideApi('removeGroupedFoundsetUUID', [foundsetHash]).then((removed) => {
            if (removed) {
                delete this.state.foundsetManagers[foundsetHash];
            } else {
                this.log.warn('could not delete hashed foundset ' + foundsetHash);
            }
        }).catch((e) => {
            this.log.error(e);
        });
        
        return true;

    }

    /**
     * @public
     * Get Foundset in hashMap by UUID
     * */
    getFoundSetByFoundsetUUID(foundsetHash: any) {
        // TODO return something else here ?
        if (foundsetHash === 'root') return this.myFoundset;
        if (this.hashedFoundsets) {
            for (const hashedFoundset of this.hashedFoundsets) {
                if (hashedFoundset.foundsetUUID === foundsetHash)
                    return hashedFoundset.foundset;

            }
        }
        return null;
    }

    /**
     * Returns the foundset manager for the given hash
     *
     * @return
     * @public
     */
    getFoundsetManagerByFoundsetUUID(foundsetHash: any) {
        if (!foundsetHash) return null;

        if (foundsetHash === 'root') return this.foundset;

        if (this.state.foundsetManagers[foundsetHash]) {
            // double check if foundset hashmap still exists
            if (!this.getFoundSetByFoundsetUUID(foundsetHash)) {
                this.log.error('This should not happen: could not verify foundset exists in foundsetHashmap ' + foundsetHash);
                return null;
            }
            return this.state.foundsetManagers[foundsetHash];
        } else {
            const foundsetRef = this.getFoundSetByFoundsetUUID(foundsetHash);
            const foundsetManager = new FoundsetManager(this, foundsetRef, foundsetHash, false);
            this.state.foundsetManagers[foundsetHash] = foundsetManager;
            return foundsetManager;
        }
    }

    /**
     * @type {SortModelType}
     * Returns the sortString and sortColumns array for the given sortModel
     *
     * @return
     *
     */
    getFoundsetSortModel(sortModel: any) {
        let sortString: any;
        const sortColumns = [];
        if (sortModel) {
            sortString = '';
            const addedColumnNames = [];
            for (let i = 0; i < sortModel.length; i++) {
                const sortModelCol = sortModel[i];
                const column = this.getColumn(sortModelCol.colId);
                if (column) {
                    const columnName = column.dataprovider.idForFoundset;
                    if(addedColumnNames.indexOf(columnName) === -1) {
                        addedColumnNames.push(columnName);
                        const direction = sortModelCol.sort;
                        if (i > 0) sortString += ',';
                        sortString += columnName + ' ' + direction + '';
                        sortColumns.push({ name: columnName, direction });
                    }
                }
            }
            sortString = sortString.trim();
        }

        return {
            sortString,
            sortColumns
        };
    }

    getFoundsetIndexFromEvent(params: any): number {
        let foundsetIndex: any;
        if (this.isTableGrouped()) {
            this.log.warn('select grouped record not supported yet');
            foundsetIndex = -1;
            // TODO use serverside API getRecordIndex
        } else {
            foundsetIndex = params.node.rowIndex + 1;
        }
        return foundsetIndex;
    }

    /**
     * TODO parametrize foundset or add it into foundsetManager object
     * Returns the sort model for the root foundset
     *
     * @return
     *
     */
    getSortModel() {
        const sortModel = [];
        let sortColumns: any = this.foundset.getSortColumns();
        if (sortColumns) {
            sortColumns = sortColumns.split(',');
            for (const sortColumn of sortColumns) {
                // TODO parse sortColumns into default sort string
                /** @type {String} */
                let idForFoundset: any;
                let sortDirection: any;
                if (!sortColumn) {
                    continue;
                } else if (sortColumn.substr(sortColumn.length - 5, 5) === ' desc') {
                    idForFoundset = sortColumn.substring(0, sortColumn.length - 5);
                    sortDirection = 'desc';
                } else if (sortColumn.substr(sortColumn.length - 4, 4) === ' asc') {
                    idForFoundset = sortColumn.substring(0, sortColumn.length - 4);
                    sortDirection = 'asc';
                }

                // add it into the sort model
                if (idForFoundset && sortDirection) {
                    const agColIds = this.getColIDs(idForFoundset);

                    for (const agColId of agColIds) {
                        sortModel.push({
                            colId: agColId,
                            sort: sortDirection
                        });
                    }
                }
            }
        }
        return sortModel;
    }

    purge() {
        if(this.onSelectionChangedTimeout) {
            setTimeout(() => {
                this.purgeImpl();
            }, 250);
        } else {
            this.purgeImpl();
        }
    }

    purgeImpl() {
        //console.log(gridOptions.api.getInfinitePageState())

        // an hard refresh is necessary to show the groups
        if (this.isTableGrouped()) {
            this.groupManager.removeFoundsetRefAtLevel(0);
        }
        // reset root foundset
        this.foundset.foundset = this.myFoundset;

        const currentEditCells = this.agGrid.api.getEditingCells();
        if(currentEditCells.length !== 0) {
            this.startEditFoundsetIndex = currentEditCells[0].rowIndex + 1;
            this.startEditColumnIndex = this.getColumnIndex(currentEditCells[0].column.getColId());
        }

        this.agGrid.api.refreshServerSideStore({purge: true});
        this.dirtyCache = false;
        this.isSelectionReady = false;
        this.scrollToSelectionWhenSelectionReady = true;
        this.columnsToFitAfterRowsRendered = true;
        // $log.warn('purge cache');

        // TODO expand previously expanded rows
        //
        //					var columns = state.expanded.columns;
        //					for (var field in columns) {
        //						// FIXME there is no ag-grid method to force group expand for a specific key value
        //					}
    }

    getValuelist(params: any): any {
        return this.getValuelistEx(params.node.data, params.column.colId);
    }

    getValuelistEx(row: any, colId: any): any {
        let column: any;
        let foundsetRows: any;

        const foundsetManager = this.getFoundsetManagerByFoundsetUUID(row._svyFoundsetUUID);
        // if not root, it should use the column/foundsetRows from the hashed map
        if (foundsetManager.isRoot) {
            column = this.getColumn(colId);
            foundsetRows = this.myFoundset.viewPort.rows;
        } else if (this.hashedFoundsets) {
            for (const hashedFoundset of this.hashedFoundsets) {
                if (hashedFoundset.foundsetUUID === foundsetManager.foundsetUUID) {
                    column = this.getColumn(colId, hashedFoundset.columns);
                    foundsetRows = foundsetManager.foundset.viewPort.rows;
                    break;
                }
            }
        }
        if(!column || !foundsetRows) {
            this.log.error('Cannot find column/foundset to read the valuelist.');
            return null;
        }

        // if it's a foundset linked prop (starting with Servoy 8.3.2) or not (prior to 8.3.2)
        if (column.valuelist && column.valuelist.state
                && column.valuelist.state['recordLinked'] !== undefined) {
            // _svyRowId: "5.10643;_0"
            const rowId = row['_svyRowId'];

            if (column.valuelist.length === 0 && foundsetRows.length > 0) {
                // this if is just for backwards compatilility editing comboboxes with valuelists with Servoy < 8.3.3 (there the foundset-linked-in-spec valuelists in custom objects
                // would not be able to reference their foundset from client-side JS => for valuelists that were not actually linked
                // client side valuelist.js would simulate a viewport that has as many items as the foundset rows containing really the same valuelist object
                // and this did not work until the fix of SVY-12718 (valuelist.js was not able to find foundset from the same custom object) => valuelist viewport
                // was length 0; this whole if can be removed once groupingtable's package will require Servoy >= 8.3.3

                // fall back to what was done previously - use root valuelist and foundset to resolve stuff (which will probably work except for related valuelists)
                column = this.getColumn(colId);
                foundsetRows = this.myFoundset.viewPort.rows;
            }

            let idxInFoundsetViewport: any = -1;
            for (const idx in foundsetRows)
                if (foundsetRows[idx]['_svyRowId'].indexOf(rowId) === 0) {
                    idxInFoundsetViewport = idx;
                    break;
                }

            if (idxInFoundsetViewport >= 0 && idxInFoundsetViewport < column.valuelist.length) return column.valuelist[idxInFoundsetViewport];
            else if (!column.valuelist.state['recordLinked'] && column.valuelist.length > 0) return column.valuelist[0];
            else {
                this.log.error('Cannot find the valuelist entry for the row that was clicked.');
                return null;
            }
        } else return column.valuelist;
    }

    /**
     * Callback used by ag-grid colDef.editable
     */
    isColumnEditable(args: any) {

        const _this = args.context.componentParent;
        // skip pinned (footer) nodes
        if(args.node.rowPinned) return false;

        // if read-only and no r-o columns
        if(_this.readOnly && !_this.readOnlyColumnIds) return false;

        const rowGroupCols = _this.getRowGroupColumns();
        for (const rowGroupCol of rowGroupCols) {
            if (args.colDef.field === rowGroupCol.colDef.field) {
                return false;	// don't allow editing columns used for grouping
            }
        }

        let isColumnEditable = true;
        if (!_this.isTableGrouped()) {
            const column = _this.getColumn(args.colDef.field);
            if (column && column.isEditableDataprovider) {
                const index = args.node.rowIndex - _this.foundset.foundset.viewPort.startIndex;
                isColumnEditable = column.isEditableDataprovider[index];
            }
        } else {
            const foundsetManager = _this.getFoundsetManagerByFoundsetUUID(args.data._svyFoundsetUUID);
            const index = foundsetManager.getRowIndex(args.data) - foundsetManager.foundset.viewPort.startIndex;
            if (index >= 0 && foundsetManager.foundset.viewPort.rows[index][args.colDef.field + '_isEditableDataprovider'] !== undefined) {
                isColumnEditable = foundsetManager.foundset.viewPort.rows[index][args.colDef.field + '_isEditableDataprovider'];
            }
        }

        // if editable check the r-o state from the runtime map
        if(isColumnEditable && _this.readOnlyColumnIds && args.colDef.colId && _this.readOnlyColumnIds['_' + args.colDef.colId] !== undefined) {
            return !_this.readOnlyColumnIds['_' + args.colDef.colId];
        }

        return isColumnEditable && !_this.readOnly;
    }

    editCellAtWithTimeout(foundsetindex: any, columnindex: any) {
        if(this.editCellAtTimeout) {
            clearTimeout(this.editCellAtTimeout);
        }
        this.editCellAtTimeout = setTimeout(() => {
            this.editCellAtTimeout = null;
            this.editCellAt(this.startEditFoundsetIndex, this.startEditColumnIndex);
        }, 200);
    }

    /**
     * Create a JSEvent
     *
     * @return
     *
     */
    createJSEvent() {
        const element = this.agGridElementRef.nativeElement;
        const x = element.offsetLeft;
        const y = element.offsetTop;

        const event = this.doc.createEvent('MouseEvents');
        event.initMouseEvent('click', false, true, window, 1, x, y, x, y, false, false, false, false, 0, null);
        return event;
    }

    storeColumnsState() {
        const agColumnState = this.agGrid.columnApi.getColumnState();

        const rowGroupColumns = this.getRowGroupColumns();
        const svyRowGroupColumnIds = [];
        for(const rowGroupCol of rowGroupColumns) {
            svyRowGroupColumnIds.push(rowGroupCol.colId);
        }

        const filterModel = this.agGrid.api.getFilterModel();
        const sortModel = this.getAgGridSortModel();

        const columnState = {
            columnState: agColumnState,
            rowGroupColumnsState: svyRowGroupColumnIds,
            filterModel,
            sortModel
        };
        const newColumnState = JSON.stringify(columnState);

        if (newColumnState !== this.columnState) {
            this.columnState = newColumnState;
            this.columnStateChange.emit(newColumnState);
            if (this.onColumnStateChanged) {
                this.onColumnStateChanged(this.columnState);
            }
        }
    }

    restoreColumnsState() {
        if(this.columnState && this.agGrid.api && this.agGrid.columnApi) { // if there is columnState and grid not yet destroyed
            let columnStateJSON = null;

            try {
                columnStateJSON = JSON.parse(this.columnState);
            } catch(e) {
                this.log.error(e);
            }

            const restoreColumns = this.restoreStates === undefined || this.restoreStates.columns === undefined || this.restoreStates.columns;

            if (restoreColumns) {
                // can't parse columnState
                if(columnStateJSON == null || !Array.isArray(columnStateJSON.columnState)) {
                    if(restoreColumns) this.innerColumnStateOnError('Cannot restore columns state, invalid format');
                    return;
                }

                // if columns were added/removed, skip the restore
                const savedColumns = [];
                for(const columnState of columnStateJSON.columnState) {
                    if(columnState.colId.indexOf('_') === 0) {
                        continue; // if special column, that starts with '_'
                    }
                    savedColumns.push(columnState.colId);
                }
                if(savedColumns.length !== this.columns.length) {
                        if(restoreColumns) this.innerColumnStateOnError('Cannot restore columns state, different number of columns in saved state and component');
                        return;
                }

                if(!this.haveAllColumnsUniqueIds()) {
                    if(restoreColumns) this.innerColumnStateOnError('Cannot restore columns state, not all columns have id or dataprovider set.');
                    return;
                }

                for(const fieldToCompare of savedColumns) {
                    let columnExist = false;

                    for (let j = 0; j < this.columns.length; j++) {
                        // TODO shall i simply check if column exists using gridOptions.columnApi.getColumn(fieldToCompare) instead ?

                        // check if fieldToCompare has a matching column id
                        if (this.columns[j].id && fieldToCompare === this.columns[j].id) {
                            columnExist = true;
                        } else if (fieldToCompare === this.getColumnID(this.columns[j], j)) {
                            // if no column id check if column has matching column identifier

                            // if a column id has been later set. Update the columnState
                            if (this.columns[j].id) {

                                for (const columnState of columnStateJSON.columnState) {
                                    // find the column in columnState
                                    if (columnState.colId === fieldToCompare) {
                                        columnState.colId = this.columns[j].id;
                                        break;
                                    }
                                }
                            }
                            columnExist = true;
                        }
                    }
                    if(!columnExist) {
                        if(restoreColumns) this.innerColumnStateOnError('Cannot restore columns state, cant find column from state in component columns');
                        return;
                    }
                }
            }

            if(columnStateJSON != null) {
                if(restoreColumns && Array.isArray(columnStateJSON.columnState) && columnStateJSON.columnState.length > 0) {
                    this.agGrid.columnApi.setColumnState(columnStateJSON.columnState);
                }

                if(restoreColumns && Array.isArray(columnStateJSON.rowGroupColumnsState) && columnStateJSON.rowGroupColumnsState.length > 0) {
                    this.agGrid.columnApi.setRowGroupColumns(columnStateJSON.rowGroupColumnsState);
                }

                if(restoreColumns && this.isPlainObject(columnStateJSON.filterModel)) {
                    this.agGrid.api.setFilterModel(columnStateJSON.filterModel);
                }

                if(this.restoreStates && this.restoreStates.sort && Array.isArray(columnStateJSON.sortModel)) {
                    this.agGrid.api.setSortModel(columnStateJSON.sortModel);
                }
            }
        }
    }

    innerColumnStateOnError(errorMsg: any) {
        if (this.columnStateOnError) {
            // can't parse columnState
            this.servoyService.executeInlineScript(
                this.columnStateOnError.formname,
                this.columnStateOnError.script,
                [errorMsg]);
        } else {
            console.error(errorMsg);
        }
    }

    haveAllColumnsUniqueIds() {
        const ids = [];
        for (let j = 0; j < this.columns.length; j++) {
            const id = this.columns[j].id !== undefined ? this.columns[j].id :
                (this.columns[j].dataprovider !== undefined ? this.columns[j].dataprovider.idForFoundset :
                    (this.columns[j].styleClassDataprovider !== undefined ? this.columns[j].styleClassDataprovider.idForFoundset : null));
            if(id == null || ids.indexOf(id) !== -1) {
                console.error('Column at index ' + j + ' in the model, does not have unique id/dataprovider/styleClassDataprovider');
                return false;
            }
            ids.push(id);

        }
        return true;
    }

    isPlainObject(input: any) {
        return null !== input &&
          typeof input === 'object' &&
          Object.getPrototypeOf(input).isPrototypeOf(Object);
    }

    keySelectionChangeNavigation(params: any) {
        const previousCell = params.previousCellPosition;
        const suggestedNextCell = params.nextCellPosition;
        const isPinnedBottom = previousCell ? previousCell.rowPinned === 'bottom' : false;
        // Test isPinnedTop

        const KEY_UP = 38;
        const KEY_DOWN = 40;
        const KEY_LEFT = 37;
        const KEY_RIGHT = 39;

        let newIndex: any; let nextRow: any;

        switch (params.key) {
            case KEY_DOWN:
                newIndex = previousCell.rowIndex + 1;
                nextRow = this.agGrid.api.getDisplayedRowAtIndex(newIndex);
                while(nextRow && (nextRow.group || nextRow.isSelected())) {
                    newIndex++;
                    nextRow = this.agGrid.api.getDisplayedRowAtIndex(newIndex);
                }

                // set selected cell on next non-group row cells
                if(nextRow && suggestedNextCell && !isPinnedBottom) {  	// don't change selection if row is pinned to the bottom (footer)
                    this.selectionEvent = { type: 'key', event: params.event };
                    this.agGrid.api.forEachNode( (node) => {
                        if (newIndex === node.rowIndex) {
                            node.setSelected(true, true);
                        }
                    });
                    suggestedNextCell.rowIndex = newIndex;
                }
                return suggestedNextCell;
            case KEY_UP:
                newIndex = previousCell.rowIndex - 1;
                nextRow = this.agGrid.api.getDisplayedRowAtIndex(newIndex);
                while(nextRow && (nextRow.group || nextRow.selected)) {
                    newIndex--;
                    nextRow = this.agGrid.api.getDisplayedRowAtIndex(newIndex);
                }

                // set selected cell on previous non-group row cells
                if(nextRow && suggestedNextCell) {
                    this.selectionEvent = { type: 'key', event: params.event };
                    this.agGrid.api.forEachNode( (node) => {
                        if (newIndex === node.rowIndex) {
                            node.setSelected(true, true);
                        }
                    });
                    suggestedNextCell.rowIndex = newIndex;
                }
                return suggestedNextCell;
            case KEY_LEFT:
            case KEY_RIGHT:
                return suggestedNextCell;
            default:
                throw new Error('this will never happen, navigation is always on of the 4 keys above');
        }
    }

    tabSelectionChangeNavigation(params: any) {
        const suggestedNextCell = params.nextCellPosition;
        const isPinnedBottom = suggestedNextCell ? suggestedNextCell.rowPinned === 'bottom' : false;

        // don't change selection if row is pinned to the bottom (footer)
        if(suggestedNextCell && !isPinnedBottom) {
            let suggestedNextCellSelected = false;
            const selectedNodes = this.agGrid.api.getSelectedNodes();
            for(const selectedNode of selectedNodes) {
                if(suggestedNextCell.rowIndex === selectedNode.rowIndex) {
                    suggestedNextCellSelected = true;
                    break;
                }
            }

            if(!suggestedNextCellSelected) {
                this.selectionEvent = { type: 'key', event: params.event };
                this.agGrid.api.forEachNode( (node) => {
                    if (suggestedNextCell.rowIndex === node.rowIndex) {
                        node.setSelected(true, true);
                    }
                });
            }
        }

        return suggestedNextCell;
    }

    onSortHandler() {
        const sortModel = this.getAgGridSortModel();
        if(sortModel) {
            const sortColumns = [];
            const sortColumnDirections = [];

            for(const i in sortModel) {
                if(sortModel.hasOwnProperty(i)) {
                    sortColumns.push(this.getColumnIndex(sortModel[i].colId));
                    sortColumnDirections.push(sortModel[i].sort);
                }
            }

            const sortHandlerPromise = this.onSort(sortColumns, sortColumnDirections);
            this.sortHandlerPromises.push(sortHandlerPromise);
            sortHandlerPromise.then(
                () => {
                    // success
                    if(this.sortHandlerPromises.shift() !== sortHandlerPromise) {
                        this.log.error('sortHandlerPromises out of sync');
                    }
                },
                () => {
                    // fail
                    if(this.sortHandlerPromises.shift() !== sortHandlerPromise) {
                        this.log.error('sortHandlerPromises out of sync');
                    }
                }
            );
        }
    }

    updateColumnDefs() {
        // need to clear/remove old columns first, else the id for
        // the new columns will have the counter at the end (ex. "myid_1")
        // and that will broke our getColumn()
        this.agGrid.api.setColumnDefs([]);

        this.agGrid.api.setColumnDefs(this.getColumnDefs());
        // selColumnDefs should redraw the grid, but it stopped doing so from v19.1.2
        this.purge();
    }

    scrollToSelectionEx(foundsetManager?: any) {
        // don't do anything if table is grouped.
        if (this.isTableGrouped()) {
            return;
        }

        if (!foundsetManager) {
            foundsetManager = this.foundset;
        }

        if (!foundsetManager.foundset) {
            return;
        }

        if(foundsetManager.foundset.selectedRowIndexes.length) {
            const model: any = this.agGrid.api.getModel();
            // 'model.rootNode.childrenCache' removed in recent ag-grid
            // if(model.rootNode.childrenCache) {
            //     // virtual row count must be multiple of CHUNK_SIZE (limitation/bug of aggrid)
            //     const offset = foundsetManager.foundset.selectedRowIndexes[0] % CHUNK_SIZE;
            //     const virtualRowCount = foundsetManager.foundset.selectedRowIndexes[0] + (CHUNK_SIZE - offset);

            //     if(virtualRowCount > model.rootNode.childrenCache.getVirtualRowCount()) {
            //         const newVirtualRowCount = Math.min(virtualRowCount, foundsetManager.foundset.serverSize);
            //         const maxRowFound = newVirtualRowCount === foundsetManager.foundset.serverSize;
            //         model.rootNode.childrenCache.setVirtualRowCount(newVirtualRowCount, maxRowFound);
            //     }
            // }
            this.agGrid.api.ensureIndexVisible(foundsetManager.foundset.selectedRowIndexes[0]);
        }
    }

    /**
     * Return the icon element with the given font icon class
     *
     * @return <i class="iconStyleClass"/>
     */
    getIconElement(iconStyleClass: any): string {
        return '<i class="' + iconStyleClass + '"/>';
    }

    setHeight() {
        if (this.agGridElementRef && !this.servoyApi.isInAbsoluteLayout()) {
            if (this.responsiveHeight) {
                this.agGridElementRef.nativeElement.style.height = this.responsiveHeight + 'px';
            } else {
                // when responsive height is 0 or undefined, use 100% of the parent container.
                this.agGridElementRef.nativeElement.style.height = '100%';
            }
        }
    }

    getFooterData() {
        const result = [];
        let hasFooterData = false;
        const resultData = {};
        for (let i = 0; this.columns && i < this.columns.length; i++) {
            const column = this.columns[i];
            if (column.footerText) {
                const	colId = this.getColumnID(column, i);
                if (colId) {
                    resultData[colId] = column.footerText;
                    hasFooterData = true;
                }

            }
        }
        if (hasFooterData) {
            result.push(resultData);
        }
        return result;
    }

    getRowClass(params: any) {

        const _this = params.context.componentParent;
        // skip pinned (footer) nodes
        if(params.node.rowPinned) return '';

        const rowIndex = params.node.rowIndex;
        let styleClassProvider: any;

        // TODO:
        // make sure we remove non ag- classes, we consider those added by rowStyleClassDataprovider
        // const rowElement = $element.find("[row-index='" + params.rowIndex + "']");
        // if(rowElement.length) {
        //     const classes = rowElement.attr("class").split(/\s+/);
        //     for(let j = 0; j < classes.length; j++) {
        //         if(classes[j].indexOf("ag-") != 0) {
        //             rowElement.removeClass(classes[j]);
        //         }
        //     }
        // }

        // TODO can i get rowStyleClassDataprovider from grouped foundset ?
        if (!_this.isTableGrouped()) {
            const index = rowIndex - _this.foundset.foundset.viewPort.startIndex;
            // TODO get proper foundset
            styleClassProvider = _this.rowStyleClassDataprovider[index];
        } else if (params.node.group === false) {

            const rowGroupCols = [];
            const groupKeys = [];

            let parentNode = params.node.parent;
            const childRowIndex = rowIndex - Math.max(parentNode.rowIndex + 1, 0);
            while (parentNode && parentNode.level >= 0 && parentNode.group === true) {

                // check if all fields are fine
                if (!parentNode.field && !parentNode.data) {
                    _this.log.warn('cannot resolve rowStyleClassDataprovider for row at rowIndex ' + rowIndex);
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

            const foundsetUUID = _this.groupManager.getCachedFoundsetUUID(rowGroupCols, groupKeys);
            // got the hash, problem is that is async.
            const foundsetManager = _this.getFoundsetManagerByFoundsetUUID(foundsetUUID);
            if (foundsetManager && foundsetManager.foundset.viewPort.rows[0]['__rowStyleClassDataprovider']) {
                const index = childRowIndex - foundsetManager.foundset.viewPort.startIndex;
                if (index >= 0 && index < foundsetManager.foundset.viewPort.size) {
                    styleClassProvider = foundsetManager.foundset.viewPort.rows[index]['__rowStyleClassDataprovider'];
                } else {
                    _this.log.warn('cannot render rowStyleClassDataprovider for row at index ' + index);
                    _this.log.warn(params.data);
                }
            } else {
                _this.log.debug('Something went wrong for foundset hash ' + foundsetUUID);
            }
        }
        return styleClassProvider;
    }

    showEditorHint() {
        return (!this.columns || this.columns.length === 0) && this.servoyApi.isInDesigner();
    }

    getIconRefreshData() {
        let iconConfig = this.datagridService.iconConfig ? this.datagridService.iconConfig : null;
        iconConfig = this.mergeConfig(iconConfig, this.iconConfig);
        const refreshEditorIconConfig = this.iconConfig ? this.iconConfig : null;
        
        return refreshEditorIconConfig && refreshEditorIconConfig.iconRefreshData &&  refreshEditorIconConfig.iconRefreshData !== 'glyphicon glyphicon-refresh' ?
            this.iconConfig.iconRefreshData : 'fa fa-sync';
    }

    getIconCheckboxEditor(state: any) {
        let iconConfig = this.datagridService.iconConfig ? this.datagridService.iconConfig : null;
        iconConfig = this.mergeConfig(iconConfig, this.iconConfig);
        const checkboxEditorIconConfig = this.iconConfig ? iconConfig : this.iconConfig;

        if(state) {
            return checkboxEditorIconConfig && checkboxEditorIconConfig.iconEditorChecked && checkboxEditorIconConfig.iconEditorChecked !== 'glyphicon glyphicon-check' ?
            checkboxEditorIconConfig.iconEditorChecked : 'far fa-check-square';
        } else {
            return checkboxEditorIconConfig && checkboxEditorIconConfig.iconEditorUnchecked && checkboxEditorIconConfig.iconEditorUnchecked !== 'glyphicon glyphicon-unchecked' ?
            checkboxEditorIconConfig.iconEditorUnchecked : 'far fa-square';
        }
    }

    handleColumnHeaderTitle(index: any, newValue: any) {
        this.log.debug('header title column property changed');

        // column id is either the id of the column
        const column = this.columns[index];
        let colId = column.id;
        if (!colId) {	// or column is retrieved by getColumnID !?
            colId = this.getColumnID(column, index);
        }

        if (!colId) {
            this.log.warn('cannot update header title for column at position index ' + index);
            return;
        }
        this.updateColumnHeaderTitle(colId, newValue);
    }

    handleColumnFooterText() {
        this.log.debug('footer text column property changed');
        this.agGrid.api.setPinnedBottomRowData(this.getFooterData());
    }

    updateColumnHeaderTitle(id: any, text: any) {
        // get a reference to the column
        const col = this.agGrid.columnApi.getColumn(id);

        // obtain the column definition from the column
        const colDef = col.getColDef();

        // update the header name
        colDef.headerName = text;

        // the column is now updated. to reflect the header change, get the grid refresh the header
        this.agGrid.api.refreshHeader();
    }

    onSelectionChanged() {
        if(this.onSelectionChangedTimeout) {
            clearTimeout(this.onSelectionChangedTimeout);
        }
        this.onSelectionChangedTimeout = setTimeout(() => {
            this.onSelectionChangedTimeout = null;
            this.onSelectionChangedEx();
        }, 250);
    }

    onSelectionChangedEx() {
        // Don't trigger foundset selection if table is grouping
        if (this.isTableGrouped()) {

            // Trigger event on selection change in grouo mode
            if (this.onSelectedRowsChanged) {
                this.onSelectedRowsChanged();
            }

            return;
        }

        // set to true once the grid is ready and selection is set
        this.isSelectionReady = true;

        // rows are rendered, if there was an editCell request, now it is the time to apply it
        if(this.startEditFoundsetIndex > -1 && this.startEditColumnIndex > -1) {
            this.editCellAtWithTimeout(this.startEditFoundsetIndex, this.startEditColumnIndex);
        }

        // when the grid is not ready yet set the value to the column index for which has been requested focus
        if (this.requestFocusColumnIndex > -1) {
            this.requestFocus(this.requestFocusColumnIndex);
        }

        if(this.selectionEvent) {
            let foundsetIndexes: any;
            if(this.foundset.foundset.multiSelect && this.selectionEvent.type === 'click' && this.selectionEvent.event &&
                (this.selectionEvent.event.ctrlKey || this.selectionEvent.event.shiftKey)) {
                foundsetIndexes = this.foundset.foundset.selectedRowIndexes.slice();

                if(this.selectionEvent.event.shiftKey) { // shifkey, select range of rows in multiselect
                    const firstRow = foundsetIndexes[0];
                    const lastRow = foundsetIndexes.length > 1 ? foundsetIndexes[foundsetIndexes.length - 1] : firstRow;

                    let fillStart: any; let fillEnd: any;
                    if(this.selectionEvent.rowIndex < firstRow) {
                        fillStart = this.selectionEvent.rowIndex;
                        fillEnd = firstRow - 1;

                    } else if(this.selectionEvent.rowIndex < lastRow) {
                        fillStart = this.selectionEvent.rowIndex;
                        fillEnd = lastRow - 1;

                    } else {
                        fillStart = lastRow + 1;
                        fillEnd = this.selectionEvent.rowIndex;
                    }
                    for(let i = fillStart; i <= fillEnd; i++) {
                        if(foundsetIndexes.indexOf(i) === -1) {
                            foundsetIndexes.push(i);
                        }
                    }

                    this.agGrid.api.forEachNode( (node) => {
                        if (foundsetIndexes.indexOf(node.rowIndex) !== -1) {
                            node.setSelected(true);
                        }
                    });
                } else {	// ctrlKey pressed, include row in multiselect

                    const selectionIndex = foundsetIndexes.indexOf(this.selectionEvent.rowIndex);
                    if(selectionIndex === -1) foundsetIndexes.push(this.selectionEvent.rowIndex);
                    else foundsetIndexes.splice(selectionIndex, 1);
                }
            } else {
                foundsetIndexes = new Array();
                const selectedNodes = this.agGrid.api.getSelectedNodes();
                for(const node of selectedNodes) {
                    if(node && foundsetIndexes.indexOf(node.rowIndex) === -1) foundsetIndexes.push(node.rowIndex);
                }
            }

            if(foundsetIndexes.length > 0) {
                foundsetIndexes.sort((a: any, b: any) => a - b);
                // if single select don't send the old selection along with the new one, to the server
                if(!this.foundset.foundset.multiSelect && foundsetIndexes.length > 1 &&
                    this.foundset.foundset.selectedRowIndexes.length > 0) {
                        if(this.foundset.foundset.selectedRowIndexes[0] === foundsetIndexes[0]) {
                            foundsetIndexes = foundsetIndexes.slice(-1);
                        } else if(this.foundset.foundset.selectedRowIndexes[0] === foundsetIndexes[foundsetIndexes.length - 1]) {
                            foundsetIndexes = foundsetIndexes.slice(0, 1);
                        }
                }
                const requestSelectionPromise = this.foundset.foundset.requestSelectionUpdate(foundsetIndexes);
                this.requestSelectionPromises.push(requestSelectionPromise);
                requestSelectionPromise.then(
                    () => {
                        if(this.requestSelectionPromises.shift() !== requestSelectionPromise) {
                            this.log.error('requestSelectionPromises out of sync');
                        }
                        if(this.scrollToSelectionWhenSelectionReady) {
                            this.scrollToSelection();
                        }
                        // Trigger event on selection change
                        if (this.onSelectedRowsChanged) {
                            this.onSelectedRowsChanged();
                        }

                        //success
                    },
                    (serverRows) => {
                        if(this.requestSelectionPromises.shift() !== requestSelectionPromise) {
                            this.log.error('requestSelectionPromises out of sync');
                        }
                        //canceled
                        if (typeof serverRows === 'string'){
                            return;
                        }
                        //reject
                        this.selectedRowIndexesChanged();
                        if(this.scrollToSelectionWhenSelectionReady) {
                            this.scrollToSelection();
                        }
                    }
                );
                return;
            }
        }
        this.log.debug('table must always have a selected record');
        this.selectedRowIndexesChanged();
        if(this.scrollToSelectionWhenSelectionReady || this.postFocusCell) {
            this.scrollToSelection();
        }

    }

    cellClickHandler(params: any) {
        this.selectionEvent = { type: 'click', event: params.event, rowIndex: params.node.rowIndex };
        if(params.node.rowPinned) {
            if (params.node.rowPinned === 'bottom' && this.onFooterClick) {
                const columnIndex = this.getColumnIndex(params.column.colId);
                this.onFooterClick(columnIndex, params.event);
            }
        } else {
            if(this.onCellDoubleClick) {
                if(this.clickTimer) {
                    clearTimeout(this.clickTimer);
                    this.clickTimer = null;
                } else {
                    this.clickTimer = setTimeout(() => {
                        this.clickTimer = null;
                        this.onCellClicked(params);
                    }, 350);
                }
            } else {
                // Added setTimeOut to enable onColumnDataChangeEvent to go first; must be over 250, so selection is sent first
                setTimeout(() => {
                    this.onCellClicked(params);
                }, 350);
            }
        }
    }

    onCellClicked(params: any) {
        this.log.debug(params);
        const col = params.colDef.field ? this.getColumn(params.colDef.field) : null;
        if(col && col.editType === 'CHECKBOX' && params.event.target.tagName === 'I' && this.isColumnEditable(params)) {
            let v = parseInt(params.value, 10);
            if(isNaN(v)) v = 0;
            params.node.setDataValue(params.column.colId, v ? 0 : 1);
        }
        if (this.onCellClick) {
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

            this.onCellClick(this.getFoundsetIndexFromEvent(params), this.getColumnIndex(params.column.colId), this.getRecord(params), params.event);
        }
    }

    onCellDoubleClicked(params: any) {
        // need timeout because the selection is also in a 250ms timeout
        setTimeout(() => {
            this.onCellDoubleClickedEx(params);
        }, 250);
    }

    onCellDoubleClickedEx(params: any) {
        this.log.debug(params);
        if (this.onCellDoubleClick && !params.node.rowPinned) {
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

            this.onCellDoubleClick(this.getFoundsetIndexFromEvent(params), this.getColumnIndex(params.column.colId), this.getRecord(params), params.event);
        }
    }

    onCellContextMenu(params: any) {
        this.log.debug(params);
        if (this.onCellRightClick && !params.node.rowPinned) {
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

            this.onCellRightClick(this.getFoundsetIndexFromEvent(params), this.getColumnIndex(params.column.colId), this.getRecord(params), params.event);
        }
    }

    onColumnRowGroupChanged(event: any) {
        // return;
        const rowGroupCols = event.columns;
        // FIXME why does give an error,  i don't uderstand
        let i: any;
        let column: any;
        this.log.debug(event);

        // store in columns the change
        if (!rowGroupCols || rowGroupCols.length === 0) {
            if(this.isGroupView) {
                // clear filter
                this.agGrid.api.setFilterModel(null);
                this.agGrid.api.deselectAll();
            }
            this.isGroupView = false;
            this.state.rootGroupSort = null;

            // TODO clear group when changed
            //groupManager.clearAll();
            this.groupManager.removeFoundsetRefAtLevel(0);

            // clear all columns
            for (i = 0; i < this.columns.length; i++) {
                column = this.columns[i];
                if (column.hasOwnProperty('rowGroupIndex')) {
                    column.rowGroupIndex = -1;
                }
            }

        } else {
            if(!this.isGroupView) {
                // clear filter
                this.agGrid.api.setFilterModel(null);
                this.agGrid.api.deselectAll();
            }
            this.isGroupView = true;

            const groupedFields = [];

            // set new rowGroupIndex
            for (i = 0; i < rowGroupCols.length; i++) {
                const rowGroupCol = rowGroupCols[i];
                const field = rowGroupCol.colDef.field;
                groupedFields.push(field);
                column = this.getColumn(field);
                column.rowGroupIndex = i;
            }

            // reset all other columns;
            for (i = 0; i < this.columns.length; i++) {
                column = this.columns[i];
                if (groupedFields.indexOf(this.getColumnID(column, i)) === -1) {
                    if (column.hasOwnProperty('rowGroupIndex')) {
                        column.rowGroupIndex = -1;
                    }
                }

            }

            // clear HashTreeCache if column group state changed
            for (i = 0; this.state.grouped.columns && i < this.state.grouped.columns.length; i++) {
                // if the column has been removed or order of columns has been changed
                if (i >= event.columns.length || this.state.grouped.columns[i] !== event.columns[i].colId) {
                    //	if (i === 0) {
                    // FIXME does it breaks it, why does it happen ? concurrency issue ?
                    //	groupManager.clearAll();
                    // FIXME this is a workadound, i don't why does it fail when i change a root level (same issue of sort and expand/collapse)
                    //		groupManager.clearAll();
                    //	} else {
                    // Clear Column X and all it's child
                    // NOTE: level are at deep 2 (1 column + 1 key)
                    const level = Math.max(0, (i * 2) - 1);
                    this.groupManager.removeFoundsetRefAtLevel(level);
                    //	}
                    break;
                }
            }
            // TODO remove logs
            this.log.debug(this.hashedFoundsets);
            this.log.debug(this.state.foundsetManagers);

        }

        // persist grouped columns state
        this.setStateGroupedColumns(event.columns);

        // resize the columns
        setTimeout(() => {
            this.sizeHeaderAndColumnsToFit();
        }, 50);

        // scroll to the selected row when switching from Group to plain view.
        // without timeout the column don't fit automatically
        setTimeout(() => {
            this.scrollToSelection();
        }, 150);

    }

    onRowGroupOpenedHandler(event: any) {
        // $log.debug(event.node);
        // TODO remove foundset from memory when a group is closed

        const column = event.node;
        const isExpanded = column.expanded;

        // get group parent
        const rowGroupInfo = this.getNodeGroupInfo(column);
        const rowGroupCols = rowGroupInfo.rowGroupFields;
        const groupKeys = rowGroupInfo.rowGroupKeys;

        // Persist the state of an expanded row
        if (isExpanded) { // add expanded node to cache
            this.addRowExpandedState(groupKeys);
        } else { // remove expanded node from cache when collapsed
            this.removeRowExpandedState(groupKeys);
        }

        if (this.onRowGroupOpened) {

            // return the column indexes
            const rowGroupColIdxs = [];
            for (const rowGroupCol of rowGroupCols) {
                rowGroupColIdxs.push(this.getColumnIndex(rowGroupCol));
            }

            this.onRowGroupOpened(rowGroupColIdxs, groupKeys, isExpanded);
        }

        return;
        // TODO why was this commented ?

        // TODO expose model property to control perfomance
//					if (isExpanded === false && $scope.model.perfomanceClearCacheStateOnCollapse === true) {
//						// FIXME remove foundset based on values
//						groupManager.removeChildFoundsetRef(column.data._svyFoundsetUUID, column.field, column.data[field]);
//					}
        // TODO remove logs
        //					console.log($scope.model.hashedFoundsets);
        //					console.log(state.foundsetManagers);

        //var foundsetManager = getFoundsetManagerByFoundsetUUID(column.data._svyFoundsetUUID);
        //foundsetManager.destroy();

    }

    getRecord(params: any) {
        if(params.data) {
            const foundsetId = params.data['_svyFoundsetUUID'] === 'root' ? this.foundset.foundset['foundsetId']: params.data['_svyFoundsetUUID'];
            const jsonRecord = {_svyRowId : params.data['_svyRowId'], foundsetId };
            return jsonRecord;
        }
        return null;
    }

    /**
     * TODO rename grouped columns into stateGroupedColumns
     *
     * @type {Array}
     * */
    setStateGroupedColumns(columns: any) {

        // cache order of grouped columns
        this.state.grouped.columns = [];
        const groupFields = [];
        let levelToRemove = null;

        for (let i = 0; i < columns.length; i++) {
            this.state.grouped.columns.push(columns[i].colId);

            // cache order of grouped fields
            const field = columns[i].colDef.field;
            groupFields.push(field);

            // TODO i am sure this run always before the onRowGroupOpen ?
            // Remove the grouped fields
            if (this.state.expanded.fields[i] && this.state.expanded.fields[i] !== field) {
                if (levelToRemove === null || levelToRemove === undefined) levelToRemove = i;
            }
        }

        // clear expanded node if grouped columns change
        this.removeRowExpandedStateAtLevel(levelToRemove);

        // TODO shall i use the state.grouped.fields instead ?
        // cache order of grouped fields
        this.state.expanded.fields = groupFields;
    }

    /**
     *
     * add expanded node to cache
     * see onRowGroupOpened
     *
     * @param groupKeys
     *
     * @private
     */
    addRowExpandedState(groupKeys: any) {

        if (!this._internalExpandedState) {
            this._internalExpandedState = new Object();
        }

        let node = this._internalExpandedState;

        // Persist the state of an expanded row
        for (const key of groupKeys) {
            if (!node[key]) {
                node[key] = new Object();
            }

            node = node[key];
        }

        this._internalExpandedStateChange.emit(this._internalExpandedState);
    }

    /**
     *
     * remove expanded node state from cache
     * see onRowGroupOpened
     *
     * @param groupKeys
     *
     * @private
     */
    removeRowExpandedState(groupKeys: any) {

        if (!groupKeys) {
            return;
        }

        if (!groupKeys.length) {
            return;
        }

        // search for the group key node
        let node = this._internalExpandedState;
        for (let i = 0; i < groupKeys.length - 1; i++) {
            const key = groupKeys[i];
            node = node[key];

            if (!node) {
                return;
            }
        }

        // remove the node
        delete node[groupKeys[groupKeys.length - 1]];

        this._internalExpandedStateChange.emit(this._internalExpandedState);
    }

    /**
     *
     * remove state of expanded nodes from level
     * see onRowGroupChanged
     *
     * @param level
     *
     * @private
     */
    removeRowExpandedStateAtLevel(level: any) {
        if (level === null || level === undefined)  {
            return;
        }

        console.log('clear expanded state at level ' + level);

        this.removeNodeAtLevel(this._internalExpandedState, level);

        this._internalExpandedStateChange.emit(this._internalExpandedState);
    }

    removeNodeAtLevel(node: any, lvl: any) {
        if (!node) {
            return;
        }

        if (node) {
            for (const key in node) {
                if (lvl === 0) {
                    // remove all keys at this level
                    delete node[key];
                } else {
                    // clear subnodes
                    this.removeNodeAtLevel(node[key], lvl - 1);
                }
            }
        }
    }

    /** Listener for the root foundset */
    changeListener(changeEvent: FoundsetChangeEvent) {
        this.log.debug('Root change listener is called ' + this.state.waitFor.loadRecords);
        this.log.debug(changeEvent);

        if(!this.isRootFoundsetLoaded) {
            if(changeEvent.viewportRowsCompletelyChanged || changeEvent.fullValueChanged) {
                this.isRootFoundsetLoaded = true;
                this.initRootFoundset();
            }
            return;
        }

        // Floor
        const idRandom = Math.floor(1000 * Math.random());

        if(changeEvent.multiSelectChanged) {
            this.agGridOptions.rowSelection =  changeEvent.multiSelectChanged.newValue ? 'multiple' : 'single';
        }

        if (changeEvent.sortColumnsChanged) {
            this.log.debug(idRandom + ' - 1. Sort');

            if (this.sortPromise && (JSON.stringify(this.getAgGridSortModel()) === JSON.stringify(this.getSortModel()))) {

                this.log.debug('sort has been requested clientside, no need to update the changeListener');
                return;
            }

            const newSort = changeEvent.sortColumnsChanged.newValue;
            const oldSort = changeEvent.sortColumnsChanged.oldValue;

            // sort changed
            this.log.debug('Change Sort Model ' + newSort);

            /** TODO check with R&D, sortColumns is updated only after the viewPort is update or there could be a concurrency race. When i would know when sort is completed ? */
            if (newSort !== oldSort) {
                this.log.debug('myFoundset sort changed ' + newSort);
                // could be already set when clicking sort on header and there is an onsort handler, so skip reseting it, to avoid a new onsort call
                if(this.sortHandlerPromises.length === 0) {
                    this.agGrid.api.setSortModel(this.getSortModel());
                } else {
                    this.agGrid.api.refreshServerSideStore({purge: true});
                }
                this.isSelectionReady = false;
                this.scrollToSelectionWhenSelectionReady = true;
            } else if (newSort === oldSort && !newSort && !oldSort) {
                this.log.warn('this should not be happening');
            }
            // do nothing else after a sort ?
            // sort should skip purge
            return;
        }

        // if viewPort changes and startIndex does not change is the result of a sort or of a loadRecords
        if ((changeEvent.viewportRowsCompletelyChanged || changeEvent.fullValueChanged) && !this.state.waitFor.loadRecords) {
            this.log.debug(idRandom + ' - 2. Change foundset serverside');
            this.log.debug('Foundset changed serverside ');

            if (this.isTableGrouped()) {
                // Foundset state is changed server side, shall refresh all groups to match new query criteria
                const promise = this.groupManager.updateFoundsetRefs(this.getRowGroupColumns());
                promise.then(() => {
                    this.log.debug('refreshing datasource with success');
                    this.refreshDatasource();
                });
                promise.catch((e) => {
                    this.log.error(e);
                    this.initRootFoundset();
                });
            } else {
                this.refreshDatasource();
            }
            return;
        } else {
            this.log.debug('wait for loadRecords request ' + this.state.waitFor.loadRecords);
        }

        if (changeEvent.viewportRowsUpdated) {
            this.log.debug(idRandom + ' - 4. Notify viewport row update');
            const updates = changeEvent.viewportRowsUpdated;
            if(this.updateRows(updates, this.foundset)) {
                // i don't need a selection update in case of purge
                return;
            }
        }

        // gridOptions.api.purgeEnterpriseCache();
        if (changeEvent.selectedRowIndexesChanged && !this.requestSelectionPromises.length) {
            this.log.debug(idRandom + ' - 3. Request selection changed');
            this.selectedRowIndexesChanged();
            this.scrollToSelection();
        }

    }

    /***********************************************************************************************************************************
     ***********************************************************************************************************************************
    *
    * API methods
    *
    ************************************************************************************************************************************
    ***********************************************************************************************************************************/

    /**
     * Return the column index for the given column id.
     * Can be used in combination with getColumnState to retrieve the column index for the column state with colId in the columnState object.
     *
     * @param colId
     *
     * @return
     * @example <pre>
     * // get the state
     * var state = elements.table.getColumnState();
     * // parse the state of each column
     * var columnsState = JSON.parse(state).columnState;
     *
     * for (var index = 0; index < columnsState.length; index++) {
     *
     *   // skip column hidden by the user
     *   if (!columnsState[index].hide) {
     *
     * 	  // get the column using the colId of the columnState
     * 	  var columnIndex = elements.table.getColumnIndex(columnsState[index].colId);
     * 		if (columnIndex > -1) {
     * 		  var column = elements.table.getColumn(columnIndex);
     * 		  // do something with column
     * 		}
     * 	}
     * }
     * </pre>
     * @public
     */
    getColumnIndex(field: any): number {
        let fieldToCompare = field;
        let fieldIdx = 0;
        if (field.indexOf('_') > 0) { // has index
            const fieldParts = field.split('_');
            if('col' !== fieldParts[0] && !isNaN(fieldParts[1])) {
                fieldToCompare = fieldParts[0];
                fieldIdx = parseInt(fieldParts[1], 10);
            }
        }

        for (let i = 0; i < this.columns.length; i++) {
            const column = this.columns[i];
            if (column.id === fieldToCompare || this.getColumnID(column, i) === fieldToCompare) {
                if(fieldIdx < 1) {
                    return i;
                }
                fieldIdx--;
            }
        }
        return -1;
    }

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
    notifyDataChange() {
        this.dirtyCache = true;
    }

    /**
     * Force a full refresh of the data.
     * <br/>
     * <br/>
     * <b>WARNING !</b> be aware that calling this API results in bad user experience since all group nodes will be collapsed instantaneously.
     *
     * @public
     * */
    refreshData() {
        this.purge();
    }

    /**
     * Returns the selected rows when in grouping mode
     */
    getGroupedSelection() {
        let groupedSelection = null;
        if(this.isTableGrouped()) {
            groupedSelection = new Array();
            const selectedNodes = this.agGrid.api.getSelectedNodes();
            for(const node of selectedNodes) {
                if(node) {
                    groupedSelection.push({ foundsetId: node.data._svyFoundsetUUID, _svyRowId: node.data._svyRowId });
                }
            }
        }
        return groupedSelection;
    }

    /**
     * Start cell editing (only works when the table is not in grouping mode).
     *
     * @param foundsetindex foundset row index of the editing cell (1-based)
     * @param columnindex column index in the model of the editing cell (0-based)
     */
    editCellAt = function(foundsetindex: any, columnindex: any) {
        if(this.isTableGrouped()) {
            this.log.warn('editCellAt API is not supported in grouped mode');
        } else if (foundsetindex < 1) {
            this.log.warn('editCellAt API, invalid foundsetindex:' + foundsetindex);
        } else if(columnindex < 0 || columnindex > this.columns.length - 1) {
            this.log.warn('editCellAt API, invalid columnindex:' + columnindex);
        } else {

            // if is not ready to edit, wait for the row to be rendered
            if(this.isSelectionReady && !this.isDataLoading) {
                const column = this.columns[columnindex];
                const colId = column.id ? column.id : this.getColumnID(column, columnindex);
                setTimeout(() => {
                    this.agGrid.api.startEditingCell({
                        rowIndex: foundsetindex - 1,
                        colKey: colId
                    });
                }, 0);

                // reset the edit cell coordinates
                this.startEditFoundsetIndex = -1;
                this.startEditColumnIndex = -1;
            } else {
                this.startEditFoundsetIndex = foundsetindex;
                this.startEditColumnIndex = columnindex;
            }
        }
    };

    /**
     * Request focus on the given column
     *
     * @param columnindex column index in the model of the editing cell (0-based)
     */
    requestFocus(columnindex: any) {
        if(this.isTableGrouped()) {
            this.requestFocusColumnIndex = -1;
            this.log.warn('requestFocus API is not supported in grouped mode');
        } else if(columnindex < 0 || columnindex > this.columns.length - 1) {
            this.requestFocusColumnIndex = -1;
            this.log.warn('requestFocus API, invalid columnindex:' + columnindex);
        } else {

            // if is not ready to request focus, wait for the row to be rendered
            if (this.isSelectionReady) {
                if (this.myFoundset && this.myFoundset.viewPort.size && this.myFoundset.selectedRowIndexes.length ) {
                    const column = this.columns[columnindex];
                    const rowIndex = this.myFoundset.selectedRowIndexes[0];
                    const	colId = column.id ? column.id : this.getColumnID(column, columnindex);
                    this.agGrid.api.setFocusedCell(rowIndex, colId, null);

                    // reset the request focus column index
                    this.requestFocusColumnIndex = -1;
                }
            } else {
                this.requestFocusColumnIndex = columnindex;
            }
        }
    }

    /**
     * Scroll to the selected row
     */
    scrollToSelection() {
        if(this.isSelectionReady) {
            this.scrollToSelectionEx();
            this.scrollToSelectionWhenSelectionReady = false;
        } else {
            this.scrollToSelectionWhenSelectionReady = true;
        }
    }

    /**
     * If a cell is editing, it stops the editing
     *
     * @param cancel 'true' to cancel the editing (ie don't accept changes)
     */
    stopCellEditing(cancel: any) {
        this.agGrid.api.stopEditing(cancel);
    }

    /**
     * Sets expanded groups
     *
     * @param groups an object like {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
     */
    setExpandedGroups(groups: any) {
        this._internalExpandedState = groups;
        this._internalExpandedStateChange.emit(this._internalExpandedState);
        if(this.isGridReady && this.isTableGrouped()) {
            this.purge();
        }
    }

    /**
     * Show or hide the ToolPanel
     *
     * @param show
     */
    showToolPanel(show: any) {
        if (show) {
            this.agGrid.api.openToolPanel('columns');
        } else {
            this.agGrid.api.closeToolPanel();
        }
    }

    /**
     * Returns true if the ToolPanel is showing
     *
     * @return
     */
    isToolPanelShowing() {
        return this.agGrid.api.getOpenedToolPanel();
    }

    getAgGridSortModel() {
        const agGridSortModel = [];
        const columnsState = this.agGrid.columnApi.getColumnState();
        for(const columnState of columnsState) {
            if(columnState['sort'] != null) {
                agGridSortModel.push({colId: columnState['colId'], sort: columnState['sort']});
            }
        }
        return agGridSortModel;
    }

    public getNativeElement(): HTMLDivElement {
        return this.agGridElementRef ? this.agGridElementRef.nativeElement : null;
    }

    /**
     * sub classes can return a different native child then the default main element.
     * used currently only for horizontal aligment
     */
    public getNativeChild(): any {
        return this.agGridElementRef.nativeElement;
    }
}

class State {
    waitFor: WaitForInfo = new WaitForInfo();
    /** column mapping by field name e.g. state.columns[field] */
    columns = {};
    foundsetManagers = {};
    /** valuelists stored per field */
    valuelists = {};
    expanded: ExpandedInfo = new ExpandedInfo();
    /** Store the latest column group, as an ordered array of colId  */
    grouped: GroupedInfo = new GroupedInfo();
    /** Store the latest rowGroupCols */
    rowGroupCols: any = [];
    /** Stor the latest groupKeys*/
    groupKeys: any = [];
    /** Sort state of the root group */
    rootGroupSort: any = null;
}

class WaitForInfo {
    sort = 0;
    loadRecords = 0;
}

class ExpandedInfo {
    /** The column collapsed
     *
     * @deprecated */
    columns = {};
    /** the group fields in order
     * This is a re-duntant info. I can obtain it via:
     *
     * var groupedColumns = gridOptions.columnApi.getRowGroupColumns();
     * var groupFields = [];
     * for (var j = 0; j < groupedColumns.length; j++) {
     *	    groupFields.push(groupedColumns[j].colDef.field);
     * }
     *  */
    fields: any = [];
}

class GroupedInfo {
    columns: any = [];
}

/**
 * Handle viewPort, row, sort, isLastRow of a foundsetReference object
 */
class FoundsetManager {

    private removeListenerFunction: any;

    constructor(public dataGrid: DataGrid, public foundset: IFoundset, public foundsetUUID: string, public isRoot: boolean) {
        if (!isRoot) {
            // add the change listener to the component
            const _this = this;
            this.removeListenerFunction = foundset.addChangeListener((change: FoundsetChangeEvent) => {
                dataGrid.log.debug('child foundset changed listener ' + foundset);

                if (change.sortColumnsChanged) {
                    const newSort = change.sortColumnsChanged.newValue;

                    // sort changed
                    dataGrid.log.debug('Change Group Sort Model ' + newSort);
                    return;
                }

                if (change.sortColumnsChanged) {
                    dataGrid.selectedRowIndexesChanged(_this);
                }

                if (change.viewportRowsUpdated) {
                    const updates = change.viewportRowsUpdated;
                    dataGrid.log.debug(updates);
                    dataGrid.updateRows(updates, _this);
                }

            });
        }
    }

    /**
     *  return the viewPort data in a new object
     *
     * @param [startIndex]
     * @param [endIndex]
     *
     */
    getViewPortData(startIndex: number, endIndex: number) {
        const result = [];
        startIndex = startIndex ? startIndex : 0;
        endIndex = endIndex && (endIndex < this.foundset.viewPort.rows.length) ? endIndex : this.foundset.viewPort.rows.length;

        // index cannot exceed ServerSize
        startIndex = Math.min(startIndex, this.foundset.serverSize);
        endIndex = Math.min(endIndex, this.foundset.serverSize);

        let columnsModel: any;
        if (this.isRoot) {
            columnsModel = this.dataGrid.columns;
        } else if (this.dataGrid.hashedFoundsets) {
            for (const hashedFoundset of this.dataGrid.hashedFoundsets) {
                if (hashedFoundset.foundsetUUID === this.foundsetUUID) {
                    columnsModel = hashedFoundset.columns;
                    break;
                }
            }
        }

        for (let j = startIndex; j < endIndex; j++) {
            const row = this.getViewPortRow(j, columnsModel);
            if (row) result.push(row);
        }

        return result;
    }

    /** return the row in viewport at the given index */
    getViewPortRow(index: number, columnsModel: any) {
        let r: any;
        try {
            r = new Object();
            // push the id so the rows can be merged
            const viewPortRow = this.foundset.viewPort.rows[index];
            if (!viewPortRow) {
                this.dataGrid.log.error('Cannot find row ' + index + ' in foundset ' + this.foundsetUUID + ' size ' + this.foundset.viewPort.size + ' startIndex ' + this.foundset.viewPort.startIndex);
                return null;
            }

            r._svyRowId = viewPortRow._svyRowId;
            r._svyFoundsetUUID = this.foundsetUUID;
            r._svyFoundsetIndex = this.foundset.viewPort.startIndex + index;

            const columns = columnsModel ? columnsModel : this.dataGrid.columns;

            // push each dataprovider
            for (let i = 0; i < columns.length; i++) {
                const header = columns[i];
                const field = header.id === 'svycount' ? header.id : this.dataGrid.getColumnID(header, i);

                const value = header.dataprovider ? header.dataprovider[index] : null;
                r[field] = value;
            }
            return r;

        } catch (e) {
            this.dataGrid.log.error(e);
            r = null;
        }
        return r;
    }

    hasMoreRecordsToLoad() {
        return this.foundset.hasMoreRows || (this.foundset.viewPort.startIndex + this.foundset.viewPort.size) < this.foundset.serverSize;
    }

    getLastRowIndex() {
        if (this.hasMoreRecordsToLoad()) {
            return -1;
        } else {
            return this.foundset.serverSize;
        }
    }

    loadExtraRecordsAsync(startIndex: number, size: number) {
        // TODO use loadExtraRecordsAsync to keep cache small
        size = (size * CACHED_CHUNK_BLOCKS) + size;
        if (this.hasMoreRecordsToLoad() === false) {
            size = this.foundset.serverSize - startIndex;
        }
        if (size < 0) {
            this.dataGrid.log.error('Load size should not be negative: startIndex ' + startIndex + ' server size ' + this.foundset.serverSize);
            size = 0;
        }

        // Wait for response
        const isRootFoundset = this.isRoot;
        const requestId = 1 + Math.random();
        this.dataGrid.state.waitFor.loadRecords = isRootFoundset ? requestId : 0; // we use state.waitfor.loadRecords only in the root foundset change listener
        // TODO can it handle multiple requests ?
        const promise = this.foundset.loadRecordsAsync(startIndex, size);
        promise.finally(() => {
            // foundset change listener that checks for 'state.waitfor.loadRecords' is executed later,
            // as last step when the response is processed, so postpone clearing the flag
            if(isRootFoundset) {
                setTimeout(() => {
                    if (this.dataGrid.state.waitFor.loadRecords !== requestId) {
                        // FIXME if this happen reduce parallel async requests to 1
                        this.dataGrid.log.warn('Load record request id \'' +
                        this.dataGrid.state.waitFor.loadRecords +
                        '\' is different from the resolved promise \'' + requestId + '\'; this should not happen !!!');
                    }
                    this.dataGrid.state.waitFor.loadRecords = 0;
                }, 0);
            }
        });

        return promise;
    }

    getSortColumns() {
        return this.foundset ? this.foundset.sortColumns : null;
    }

    sort(sortString: any) {
        if (sortString) {
            // TODO check sort
            return this.foundset.sort(sortString);
        }
        return null;
    }

    /**
     * @return return the foundset index of the given row in viewPort (includes the startIndex diff)
     *
     */
    getRowIndex(row: any) {
        const id = row._svyRowId;
        const viewPortRows = this.foundset.viewPort.rows;
        for (let i = 0; i < viewPortRows.length; i++) {
            if (viewPortRows[i]._svyRowId === id) {
                return i + this.foundset.viewPort.startIndex;
            }
        }
        return -1;
    }

    destroy() {
        this.dataGrid.log.debug('destroy ' + this.foundsetUUID);

        // remove the listener
        this.removeListenerFunction();

        // persistently remove the foundset from other cached objects (model.hashedFoundsets, state.foundsetManager);
        this.dataGrid.removeFoundSetByFoundsetUUID(this.foundsetUUID);
    }
}

class FoundsetServer {

    constructor(public dataGrid: DataGrid, public allData: any) {
    }

    /**
     * @param request
     * @param groupKeys
     * @param callback callback(data, isLastRow)
     * @protected
     */
    getData(request: any, groupKeys: any, callback: any) {

        this.dataGrid.log.debug(request);

        // the row group cols, ie the cols that the user has dragged into the 'group by' zone, eg 'Country' and 'Customerid'
        const rowGroupCols = request.rowGroupCols;

        // if going aggregation, contains the value columns, eg ['gold','silver','bronze']
        //const valueCols = request.valueCols;

        // rowGroupCols cannot be 2 level deeper than groupKeys
        // rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);

        const allPromises = [];

        const filterModel = this.dataGrid.agGrid.api.getFilterModel();
        // create filter model with column indexes that we can send to the server
        const updatedFilterModel = {};
        for(const c in filterModel) {
            if(filterModel.hasOwnProperty(c)) {
                const columnIndex = this.dataGrid.getColumnIndex(c);
                if(columnIndex !== -1) {
                    updatedFilterModel[columnIndex] = filterModel[c];
                }
            }
        }
        const sUpdatedFilterModel = JSON.stringify(updatedFilterModel);
        // if filter is changed, apply it on the root foundset, and clear the foundset cache if grouped
        if (sUpdatedFilterModel !== this.dataGrid.filterModel && !(sUpdatedFilterModel === '{}' && this.dataGrid.filterModel === undefined)) {
            this.dataGrid.filterModel = sUpdatedFilterModel;
            const filterMyFoundsetArg = [];
            filterMyFoundsetArg.push(sUpdatedFilterModel);

            if(rowGroupCols.length) {
                this.dataGrid.groupManager.removeFoundsetRefAtLevel(0);
                filterMyFoundsetArg.push('{}');
            } else {
                filterMyFoundsetArg.push(sUpdatedFilterModel);
            }
            allPromises.push(this.dataGrid.servoyApi.callServerSideApi('filterMyFoundset', filterMyFoundsetArg));
        }

        let sortModel =  this.dataGrid.getAgGridSortModel();
        let sortRootGroup = false;

        // if clicking sort on the grouping column
        if (rowGroupCols.length > 0 && sortModel[0] &&
            (sortModel[0].colId === ('ag-Grid-AutoColumn-' + rowGroupCols[0].id) || sortModel[0].colId === rowGroupCols[0].id)) {
            // replace colFd with the id of the grouped column
            sortModel = [{ colId: rowGroupCols[0].field, sort: sortModel[0].sort }];
            if(!this.dataGrid.state.rootGroupSort  || this.dataGrid.state.rootGroupSort.colId !== sortModel[0].colId || this.dataGrid.state.rootGroupSort.sort !== sortModel[0].sort) {
                sortRootGroup = true;
            }
        }
        const foundsetSortModel = this.dataGrid.getFoundsetSortModel(sortModel);
        const sortString = foundsetSortModel.sortString;

        this.dataGrid.log.debug('Group ' + (rowGroupCols[0] ? rowGroupCols[0].displayName : '/') + ' + ' + (groupKeys[0] ? groupKeys[0] : '/') + ' # ' + request.startRow + ' # ' + request.endRow);

        // init state of grouped columns. Is normally done by onRowColumnsChanged but is not triggered if rowGroupIndex is set at design time
        // FIXME should handle runtime changes to model.columns. It does not at the moment
        if (!this.dataGrid.state.grouped.columns.length) {
            for (const rowGroupCol of rowGroupCols) {
                this.dataGrid.state.grouped.columns.push(rowGroupCol.field);
            }
            // is in group view first time the form is shown ?
            this.dataGrid.isGroupView = rowGroupCols.length > 0;
        }

        // Sort on the foundset Group
        if (sortRootGroup) { // no sort need to be applied
            // Should change the foundset with a different sort order
            allPromises.push(this.dataGrid.groupManager.createOrReplaceFoundsetRef(rowGroupCols, groupKeys, sortModel[0].sort));
        } else {
            // get the foundset reference
            allPromises.push(this.dataGrid.groupManager.getFoundsetRef(rowGroupCols, groupKeys));
        }
        Promise.all(allPromises).then((args) => this.getFoundsetRefSuccess(args, request, callback, sortModel, foundsetSortModel, sortString, sortRootGroup)).catch((e) => this.getFoundsetRefError(e));
    } // End getData

    /**
     * GetFoundserRef Promise Callback
     *
     * @param foundsetUUID
     * @protected
     */
    getFoundsetRefSuccess(args: any, request: any, callback: any, sortModel: any, foundsetSortModel: any, sortString: any, sortRootGroup: any) {

        const foundsetUUID = args[args.length - 1];

        // TODO search in state first ?
        // The foundsetUUID exists in the
        // foundsetHashmap
        // groupManager (UUID)
        // group, in the foundsetHashmap and in the state ?
        const foundsetRefManager = this.dataGrid.getFoundsetManagerByFoundsetUUID(foundsetUUID);

        if (sortString === '') {
            // TODO restore a default sort order when sort is removed
            // $log.warn(" Use the default foundset sort.. which is ? ");
        }

        if(sortRootGroup) {
            this.dataGrid.state.rootGroupSort = sortModel[0];
        }

        const currentGridSort = this.dataGrid.getFoundsetSortModel(this.dataGrid.getAgGridSortModel());
        const foundsetSort = this.dataGrid.stripUnsortableColumns(this.dataGrid.foundset.getSortColumns());
        const isSortChanged = !this.dataGrid.onSort && foundsetRefManager.isRoot && sortString !== foundsetSort && currentGridSort.sortString !== foundsetSort;

        if(isSortChanged) {
            this.dataGrid.log.debug('CHANGE SORT REQUEST');
            let isColumnSortable = false;
            // check sort columns in both the reques and model, because it is disable in the grid, it will be only in the model
            const sortColumns = sortModel.concat(this.dataGrid.getSortModel());
            for(const sortCol of sortColumns) {
                const col = this.dataGrid.agGridOptions.columnApi.getColumn(sortCol.colId);
                if(col && col.getColDef().sortable) {
                    isColumnSortable = true;
                    break;
                }
            }

            if(isColumnSortable) {
                // send sort request if header is clicked; skip if is is not from UI (isSelectionReady == false) or if it from a sort handler or a group column sort
                if(this.dataGrid.isSelectionReady || sortString) {
                    foundsetSortModel = this.dataGrid.getFoundsetSortModel(sortModel);
                    this.dataGrid.sortPromise = foundsetRefManager.sort(foundsetSortModel.sortColumns);
                    this.dataGrid.sortPromise.then(() => {
                        this.getDataFromFoundset(foundsetRefManager, request, callback);
                        // give time to the foundset change listener to know it was a client side requested sort
                        setTimeout(() => {
                            this.dataGrid.sortPromise = null;
                        }, 0);
                    }).catch(() => {
                        this.dataGrid.sortPromise = null;
                    });
                } else { // set the grid sorting if foundset sort changed from the grid initialization (like doing foundset sort on form's onShow)
                    this.dataGrid.agGrid.api.setSortModel(this.dataGrid.getSortModel());
                    this.dataGrid.agGrid.api.refreshServerSideStore({purge: true});
                }
            } else {
                this.getDataFromFoundset(foundsetRefManager, request, callback);
            }
        } else {
            this.getDataFromFoundset(foundsetRefManager, request, callback);
        }
    }

    /**
     * GetDataFromFoundset Promise Callback
     *
     * @param foundsetRef the foundsetManager object
     * @protected
     */
    getDataFromFoundset(foundsetManager: FoundsetManager, request: any, callback: any) {
        // test cache blocks
        //if (!isTableGrouped()) test_validateCache();

        // load record if endRow is not in viewPort
        const startIndex = foundsetManager.foundset.viewPort.startIndex; // start index of view port (0-based)
        const viewPortSize = foundsetManager.foundset.viewPort.size; // viewport size
        const endIndex = startIndex + viewPortSize; // end index of the view port (0-based)

        // index in the cached viewPort (0-based);
        let viewPortStartIndex = request.startRow - startIndex;
        let viewPortEndIndex = request.endRow - startIndex;

        if (request.startRow < startIndex || (request.endRow > endIndex && foundsetManager.getLastRowIndex() === -1)) {

            const errorTimeout = setTimeout(() => {
                    this.dataGrid.log.error('Could not load records for foundset ' + foundsetManager.foundsetUUID + ' Start ' + request.startRow + ' End ' + request.endRow);
                }, 10000); // TODO set timeout

            let requestViewPortStartIndex: any;
            // keep the previous chunk in cache
            if (request.startRow >= CHUNK_SIZE && request.endRow >= endIndex) {
                requestViewPortStartIndex = request.startRow - CHUNK_SIZE;
            } else {
                requestViewPortStartIndex = request.startRow;
            }

            const requestViewPortEndIndex = request.endRow - requestViewPortStartIndex;
            const size = request.endRow - request.startRow;

            this.dataGrid.log.debug('Load async ' + requestViewPortStartIndex + ' - ' + requestViewPortEndIndex + ' with size ' + size);
            const promise = foundsetManager.loadExtraRecordsAsync(requestViewPortStartIndex, size);
            promise.then(() => {

                // load complete
                if (errorTimeout) {
                    clearTimeout(errorTimeout);
                }

                // get the index of the last row
                const lastRowIndex = foundsetManager.getLastRowIndex();

                // update viewPortStatIndex
                viewPortStartIndex = request.startRow - foundsetManager.foundset.viewPort.startIndex;
                viewPortEndIndex = request.endRow - foundsetManager.foundset.viewPort.startIndex;

                this.dataGrid.log.debug('Get View Port ' + viewPortStartIndex + ' - ' + viewPortEndIndex + ' on ' +
                    foundsetManager.foundset.viewPort.startIndex + ' with size ' + foundsetManager.foundset.viewPort.size);

                const result = foundsetManager.getViewPortData(viewPortStartIndex, viewPortEndIndex);
                callback(result, lastRowIndex);

                // TODO data is ready here ?

            }).catch((e) => this.getFoundsetRefError(e));
        } else {
            callback(foundsetManager.getViewPortData(viewPortStartIndex, viewPortEndIndex), foundsetManager.getLastRowIndex());
        }
    }

    getFoundsetRefError(e: any) {
        this.dataGrid.log.error(e);
        this.dataGrid.isDataLoading = false;
        this.dataGrid.agGridOptions.columnApi.setRowGroupColumns([]);
    }
}

class FoundsetDatasource {

    constructor(public dataGrid: DataGrid, public foundsetServer: any) {
    }

    getRows(params: any) {
        this.dataGrid.log.debug('FoundsetDatasource.getRows: params = ', params);

        this.dataGrid.isDataLoading = true;

        // the row group cols, ie the cols that the user has dragged into the 'group by' zone, eg 'Country' and 'Customerid'
        const rowGroupCols = params.request.rowGroupCols;
        // the keys we are looking at. will be empty if looking at top level (either no groups, or looking at top level groups). eg ['United States','2002']
        const groupKeys = params.request.groupKeys;

        // resolve valuelist display values to real values
        const filterPromises = [];

        let removeAllFoundsetRefPostponed = false;
        const _this = this;
        for (let i = 0; i < groupKeys.length; i++) {
            if (groupKeys[i] === NULL_VALUE) {
                groupKeys[i] = null;	// reset to real null, so we use the right value for grouping
            } else {
                const vl = this.dataGrid.getValuelistEx(params.parentNode.data, rowGroupCols[i]['id']);
                if(vl) {
                    const filterDeferred = new Deferred();
                    filterPromises.push(filterDeferred.promise);
                    const idx = i;
                    vl.filterList(groupKeys[i]).subscribe((valuelistValues: any) => {
                        this.handleFilterCallback(groupKeys, idx, valuelistValues);
                        if(_this.dataGrid.removeAllFoundsetRef) {
                            _this.dataGrid.groupManager.removeFoundsetRefAtLevel(0);
                        }
                        filterDeferred.resolve(true);
                    });
                    removeAllFoundsetRefPostponed = true;
                }
            }
        }

        if(this.dataGrid.removeAllFoundsetRef && !removeAllFoundsetRefPostponed) {
            this.dataGrid.groupManager.removeFoundsetRefAtLevel(0);
        }

        const allPromisses = this.dataGrid.sortHandlerPromises.concat(filterPromises);
        Promise.all(allPromisses).then(() => {
            _this.dataGrid.removeAllFoundsetRef = false;
            _this.foundsetServer.getData(params.request, groupKeys,
                function successCallback(resultForGrid: any, lastRow: any) {
                    params.successCallback(resultForGrid, lastRow);

                    // if row autoHeight is on, we need to refresh first time the data are loaded, that means,
                    // the first block has the state == "loaded"
                    if(_this.dataGrid.isRefreshNeededForAutoHeight) {
                        const model = this.dataGrid.agGrid.api.getModel();
                        if(model.rootNode.childrenCache) {
                            const sortedBlockIds = model.rootNode.childrenCache.getBlockIdsSorted();
                            if(sortedBlockIds.length) {
                                const firstBlock = model.rootNode.childrenCache.getBlock(sortedBlockIds[0]);
                                if(firstBlock.state === 'loaded') {
                                    _this.dataGrid.isRefreshNeededForAutoHeight = false;
                                    setTimeout(() => {
                                        _this.dataGrid.purgeImpl();
                                    }, 150);
                                    return;
                                }
                            }
                        }
                    }

                    _this.dataGrid.isDataLoading = false;
                    // if selection did not changed, mark the selection ready
                    if(!_this.dataGrid.selectedRowIndexesChanged()) {
                        _this.dataGrid.isSelectionReady = true;
                    }
                    // rows are rendered, if there was an editCell request, now it is the time to apply it
                    if(_this.dataGrid.startEditFoundsetIndex > -1 && _this.dataGrid.startEditColumnIndex > -1) {
                        _this.dataGrid.editCellAtWithTimeout(_this.dataGrid.startEditFoundsetIndex, _this.dataGrid.startEditColumnIndex);
                    }


                    // Preserve Group State
                    // https://www.ag-grid.com/javascript-grid-server-side-model-grouping/#preserving-group-state

                    let expandedState = _this.dataGrid._internalExpandedState;
                    const groupFields = _this.dataGrid.state.expanded.fields;

                    if (resultForGrid && resultForGrid.length && _this.dataGrid.isTableGrouped() && groupFields && expandedState) {

                        // get the fs manager for the group
                        //var foundsetRefManager = getFoundsetManagerByFoundsetUUID(resultForGrid[0]._svyFoundsetUUID);

                        // to preserve group state we expand any previously expanded groups for this block
                        for (const row of resultForGrid) {
                            try {

                                // get group levels, in order
//											var groupedColumns = gridOptions.columnApi.getRowGroupColumns();
//											var groupFields = [];
//											for (var j = 0; j < groupedColumns.length; j++) {
//												groupFields.push(groupedColumns[j].colDef.field);
//											}


                                // TODO do i need to retrieve the node before to know if column is expanded or not ?
                                const node = _this.dataGrid.agGrid.api.getRowNode(row._svyFoundsetUUID + '_' + row._svyFoundsetIndex);
                                if (!node) break;

                                const rowGroupInfo = _this.dataGrid.getNodeGroupInfo(node);
                                //const rowGroupFields = rowGroupInfo.rowGroupFields;
                                const rowGroupKeys = rowGroupInfo.rowGroupKeys;

                                // check if node is expanded
                                let isExpanded: any;


                                // check if the expanded columns matches the expanded columns in cache
//											for (var j = 0; j < rowGroupFields.length; j++) {
//												if (rowGroupFields[j] != groupFields[j]) {
//													isExpanded = false;
//													break;
//												}
//											}
//											if (isExpanded === false) {
//												break;
//											}

                                // check if the node is expanded
                                expandedState = _this.dataGrid._internalExpandedState;

                                for (let j = 0; expandedState && j < rowGroupKeys.length; j++) {
                                    expandedState = expandedState[rowGroupKeys[j]];
                                    if (!expandedState) {
                                        isExpanded = false;
                                        break;
                                    } else {
                                        isExpanded = true;
                                    }
                                }

                                // expand the node
                                if (isExpanded) {
                                    node.setExpanded(true);
                                }

                            } catch (e) {
                                console.log(e);
                            }
                        }
                    }
                });
        }, (reason) => {
            _this.dataGrid.log.error('Can not get realValues for groupKeys ' + reason);
        });
    }

    handleFilterCallback(groupKeys: any, idx: any, valuelistValues: any) {
        if(valuelistValues) {
            for (const valuelistValue of valuelistValues) {
                if (valuelistValue.displayValue === groupKeys[idx] && valuelistValue.realValue !== undefined) {
                    groupKeys[idx] = valuelistValue.realValue;
                    break;
                }
            }
        }
    }
}

class GroupManager {

    hashTree: GroupHashCache;

    groupedColumns: any = [];
    groupedValues = new Object();

    constructor(public dataGrid: DataGrid) {
        this.hashTree = new GroupHashCache(this.dataGrid);
    }

    /**
     * Returns the foundset with the given grouping criteria is already exists in cache
     *
     * @param rowGroupCols
     * @param groupKeys
     * @param [sort] desc or asc. Default asc
     *
     * @return returns the UUID of the foundset if exists in cache
     *
     */
    getCachedFoundsetUUID(rowGroupCols: any, groupKeys: any) {
        return this.hashTree.getCachedFoundset(rowGroupCols, groupKeys);
    }

    /**
     * Returns the foundset with the given grouping criteria
     *
     * @param rowGroupCols
     * @param groupKeys
     * @param [sort] desc or asc. Default asc
     *
     * @return returns a promise
     *
     */
    getFoundsetRef(rowGroupCols: any, groupKeys: any, sort?: any) {

        // create a promise
        const resultPromise = new Deferred();

        // return the root foundset if no grouping criteria
        if (rowGroupCols.length === 0 && groupKeys.length === 0) { // no group return root foundset
            resultPromise.resolve('root');
            return resultPromise.promise;
        }

        // ignore rowGroupColumns which are still collapsed (don't have a matchig key)
        rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);

        // possibilities

        // is a root group CustomerID

        // is a second level group CustomerID, ShipCity

        // is a third level group CustomerID, ShipCity, ShipCountry

        // recursevely load hashFoundset. this is done so the whole tree is generated without holes in the structure. Do i actually need to get a foundset for it ? Probably no, can i simulate it ?

        // create groups starting from index 0
        this.getRowColumnHashFoundset(0, rowGroupCols, groupKeys, sort, resultPromise);

        return resultPromise.promise;
    }

    getRowColumnHashFoundset(index: any, rowGroupCols: any, groupKeys: any, sort: any, resultPromise: any) {

        const groupCols = rowGroupCols.slice(0, index + 1);
        const keys = groupKeys.slice(0, index + 1);

        this.dataGrid.log.debug(groupCols);
        this.dataGrid.log.debug(keys);

        // get a foundset for each grouped level, resolve promise when got to the last level

        // TODO loop over columns
        let columnId = groupCols[groupCols.length - 1].field; //
        let columnIndex = this.dataGrid.getColumnIndex(columnId);

        // get the foundset Reference
        const foundsetHash = this.hashTree.getCachedFoundset(groupCols, keys);
        if (foundsetHash) { // the foundsetReference is already cached
            if (index === rowGroupCols.length - 1) { // resolve when last rowColumn foundset has been loaded
                resultPromise.resolve(foundsetHash);
            } else {
                // FIXME do i need to get multiple hashed foundsets ? probably not
                this.getRowColumnHashFoundset(index + 1, rowGroupCols, groupKeys, sort, resultPromise); // load the foundset for the next group
            }

        } else { // need to get a new foundset reference
            // create the subtree

            // FIXME i will miss information about the root columns. I need an array of matching column, not an index. e.g. [ALFKI, Italy, Roma]

            // get the index of each grouped column
            const groupColumnIndexes = [];
            for (let idx = 0; idx < groupCols.length; idx++) {
                columnId = rowGroupCols[idx].field;
                columnIndex = this.dataGrid.getColumnIndex(columnId);
                groupColumnIndexes.push(columnIndex);
            }

            const groupLevels = rowGroupCols.length;
            if (index === groupLevels - 1) { // if is the last level, ask for the foundset hash
                const promise = this.getHashFoundset(groupColumnIndexes, keys, sort);
                promise.then((foundsetUUID) => this.getHashFoundsetSuccess(foundsetUUID, groupCols, keys, rowGroupCols, groupKeys, sort, index, resultPromise));
                promise.catch((e) => this.promiseError(e, resultPromise));
            } else { // set null inner foundset
                this.hashTree.setCachedFoundset(groupCols, keys, null);
                this.getRowColumnHashFoundset(index + 1, rowGroupCols, groupKeys, sort, resultPromise);
            }
        }
    }

    /**
     * @return returns the foundsetRef object
     */
    getHashFoundsetSuccess(foundsetUUID: any, groupCols: any, keys: any, rowGroupCols: any, groupKeys: any, sort: any, index: any, resultPromise: any) {

        if (!foundsetUUID) {
            this.dataGrid.log.error('why i don\'t have a foundset ref ?');
            return;
        } else {
            this.dataGrid.log.debug('Get hashed foundset success ' + foundsetUUID);
        }

        // the hash of the parent foundset
        // var foundsetUUID = childFoundset.foundsetUUID;
        // var foundsetRef = childFoundset.foundsetRef;

        // cache the foundsetRef
        this.hashTree.setCachedFoundset(groupCols, keys, foundsetUUID);

        this.dataGrid.log.debug('success ' + foundsetUUID);

        if (index === rowGroupCols.length - 1) { // resolve when last rowColumn foundset has been loaded
            resultPromise.resolve(foundsetUUID);
        } else {
            this.getRowColumnHashFoundset(index + 1, rowGroupCols, groupKeys, sort, resultPromise); // load the foundset for the next group
        }
    }

    promiseError(e: any, resultPromise: any) {
        // propagate the error
        resultPromise.reject(e);
    }

    /**
     * Handle ChildFoundsets
     * Returns the foundset in a promise
     *
     * @param groupColumns index of all grouped columns
     * @param groupKeys value for each grouped column
     * @param [sort]
     *
     * @return
     *
     */
    getHashFoundset(groupColumns: any, groupKeys: any, sort: any) {

        const resultDeferred = new Deferred();

        // TODO store it in cache. Requires to be updated each time column array Changes
        const idForFoundsets = [];
        for (let i = 0; i < this.dataGrid.columns.length; i++) {
            idForFoundsets.push(this.dataGrid.getColumnID(this.dataGrid.columns[i], i));
        }

        const hasRowStyleClassDataprovider = this.dataGrid.rowStyleClassDataprovider ? true : false;

        let sortColumn: any;
        let sortColumnDirection: any;
        const sortModel = this.dataGrid.getAgGridSortModel();
        if(sortModel && sortModel[0]) {
            sortColumn = this.dataGrid.getColumnIndex(sortModel[0].colId);
            sortColumnDirection = sortModel[0].sort;
        }

        const childFoundsetPromise = this.dataGrid.servoyApi.callServerSideApi('getGroupedFoundsetUUID',
            [groupColumns, groupKeys, idForFoundsets, sort, this.dataGrid.filterModel, hasRowStyleClassDataprovider, sortColumn, sortColumnDirection]);

        childFoundsetPromise.then((childFoundsetUUID) => {
            this.dataGrid.log.debug(childFoundsetUUID);
                if (!childFoundsetUUID) {
                    this.dataGrid.log.error('why i don\'t have a childFoundset ?');
                    resultDeferred.reject('can\'t retrieve the child foundset');
                }

                // FIXME add listener somewhere else
                //childFoundset.addChangeListener(childChangeListener);
                resultDeferred.resolve(childFoundsetUUID);
            }, (e) => {
                // propagate the error
                resultDeferred.reject(e);
            });

        return resultDeferred.promise;
    }

    updateFoundsetRefs(rowGroupCols: any) {
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
    createOrReplaceFoundsetRef(groupColumns: any, groupKeys: any, sort: any) {
        const foundsetHash = this.hashTree.getCachedFoundset(groupColumns, groupKeys);
        if (foundsetHash) {
            this.removeFoundsetRef(foundsetHash);

        }
        return this.getFoundsetRef(groupColumns, groupKeys, sort);
    }
    /**
     * @private
     * Should this method be used ?
     *  */
    removeFoundsetRef(foundsetUUID: any) {
        return this.hashTree.removeCachedFoundset(foundsetUUID);
    }

    /**
     * @param level
     *
     *
     */
    removeFoundsetRefAtLevel(level: any) {
        return this.hashTree.removeCachedFoundsetAtLevel(level);
    }

    /**
     * @param foundsetUUID
     * @param [field] if given delete only the child having field equal to value
     * @param [value] if given delete only the child having field equal to value
     *
     *
     */
    removeChildFoundsetRef(foundsetUUID: any, field: any, value: any) {
        return this.hashTree.removeChildFoundset(foundsetUUID, field, value);
    }

    clearAll() {
        this.hashTree.clearAll();
    }
}

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
class GroupHashCache {

    rootGroupNode: GroupNode;

    constructor(public dataGrid: DataGrid) {
        this.rootGroupNode = new GroupNode(this.dataGrid, 'root');
    }

    getCachedFoundset(rowGroupCols: any, groupKeys: any) {
        const node = this.getTreeNode(this.rootGroupNode, rowGroupCols, groupKeys);
        return node ? node.foundsetUUID : null;
    }

    setCachedFoundset(rowGroupCols: any, groupKeys: any, foundsetUUID: any) {
        const tree = this.getTreeNode(this.rootGroupNode, rowGroupCols, groupKeys, true);
        tree.foundsetUUID = foundsetUUID;
    }

    /**
     * @param foundsetUUID
     * Remove the node
     */
    removeCachedFoundset(foundsetUUID: any) {
        return this.removeFoundset(this.rootGroupNode, foundsetUUID);
    }

    /**
     * @param level
     * Remove the node
     */
    removeCachedFoundsetAtLevel(level: any) {
        return this.removeFoundsetAtLevel(this.rootGroupNode, level);
    }

    /**
     * @param foundsetUUID
     * @param [field]
     * @param [value]
     * Remove all it's child node
     */
    removeChildFoundset(foundsetUUID: any, field: any, value: any) {
        return this.removeChildFoundsets(this.rootGroupNode, foundsetUUID, field, value);
    }

    /** @deprecated
     * Use removeFoundsetRefAtLevel(0) instead
     *  */
    clearAll() {

        this.rootGroupNode.forEach((node: any) => {
            if (node.foundsetUUID) {
                this.removeFoundset(this.rootGroupNode, node.foundsetUUID);
            } else {
                // TODO is it this possible
                this.dataGrid.log.error('There is a root node without a foundset UUID, it should not happen');
            }

        });
        if (this.dataGrid.hashedFoundsets.length > 0) {
            this.dataGrid.log.error('Clear All was not successful, please debug');
        }
    }

    /**
     * @param tree
     * @param foundsetUUID
     * @return Boolean
     *
     */
    removeFoundset(tree: any, foundsetUUID: any) {
        if (!tree) {
            return true;
        }

        if (!foundsetUUID) {
            return true;
        }

        // remove the node
        const parentNode = this.getParentGroupNode(tree, foundsetUUID);
        const node = this.getGroupNodeByFoundsetUUID(parentNode, foundsetUUID);
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
     * @param tree
     * @param level
     * @return
     *
     */
    removeFoundsetAtLevel(tree: any, level: any) {
        if (!tree) {
            return true;
        }

        if (isNaN(level) || level === null) {
            return true;
        }

        let success = true;

        tree.forEach((node: any) => {

            // remove the foundset and all it's child nodes if foundsetUUID or level === 0
            if (level === 0) {
                const id = node.id;
                node.destroy();
                delete tree.nodes[id];
                return true;
            } else {
                success = node.forEach(() => this.removeFoundsetAtLevel(node, level - 1)) && success;
                return success;
            }
        });
        return success;
    }

    /**
     * @param tree
     * @param foundsetUUID
     * @param [field]
     * @param [value]
     *
     */
    removeChildFoundsets(tree: any, foundsetUUID: any, field?: any, value?: any) {

        if (foundsetUUID) {
            // remove all child nodes
            const node = this.getGroupNodeByFoundsetUUID(tree, foundsetUUID);
            if (node) {
                node.removeAllSubNodes();
                return true;
            } else {
                return false;
            }
        } else {

            // TODO Refactor this part of code
            let success = true;
            tree.forEach((node: any) => {
                if (node.foundsetUUID === foundsetUUID) {
                    // delete all subnodes
                    success = true;
                    node.forEach((subNode: any) => {
                        const childFoundsetUUID = subNode.foundsetUUID;
                        const foundsetRef = this.dataGrid.getFoundsetManagerByFoundsetUUID(childFoundsetUUID);
                        // FIXME this solution is horrible, can break if rows.length === 0 or...
                        // A better solution is to retrieve the proper childFoundsetUUID by rowGroupCols/groupKeys
                        if (foundsetRef && ( (field === null || field === undefined) || (field !== null && field !== undefined &&
                             foundsetRef.foundset.viewPort.rows[0] && foundsetRef.foundset.viewPort.rows[0][field] === value))) {
                            success = (this.removeFoundset(node, childFoundsetUUID) && success);
                        } else {
                            this.dataGrid.log.debug('ignore the child foundset');
                        }
                    });
                } else if (node.hasNodes()) { // search in subnodes
                    success = success && node.forEachUntilSuccess(() => this.removeChildFoundsets(node, foundsetUUID));
                }
            });
            return success;
        }
    }

    /**
     * @param tree
     * @param rowGroupCols
     * @param groupKeys
     * @param [create]
     *
     * @return
     *
     *
     */
    getTreeNode(tree: any, rowGroupCols: any, groupKeys: any, create?: any): any {

        let result = null;

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
        const columnId = rowGroupCols[0].field;

        // the tree for the given column
        let colTree = tree.nodes[columnId];

        // create the tree node if does not exist
        if (!colTree && create) {
            colTree = new GroupNode(this.dataGrid, columnId);
            tree.nodes[columnId] = colTree;
        } else if (!colTree) { // or return null
            return null;
        }

        if (rowGroupCols.length === 1) { // the last group

            if (groupKeys.length === 0) { // is a leaf child
                result = colTree;
            } else if (groupKeys.length === 1) { // is a leaf child

                // get the subtree matching the rowGroupCols
                const key = groupKeys[0];
                let keyTree = colTree.nodes[key];

                // create the key tree node if does not exist
                if (!keyTree && create) {
                    keyTree = new GroupNode(this.dataGrid, key);
                    colTree.nodes[key] = keyTree;
                } else if (!keyTree) { // or return null
                    return null;
                }

                result = keyTree;

            } else { // no group key criteria
                this.dataGrid.log.warn('this should not happen');
            }

        } else if (rowGroupCols.length > 1) { // is not the last group
            const key = groupKeys.length ? groupKeys[0] : null;

            if (!colTree) {
                this.dataGrid.log.warn('this should not happen');
                return null;
            }

            let subTree = colTree;

            if (key !== null) {
                let keyTree = colTree.nodes[key];

                // create the key tree node if does not exist
                if (!keyTree && create) {
                    keyTree = new GroupNode(this.dataGrid, key);
                    colTree.nodes[key] = keyTree;
                } else if (!keyTree) {
                    return null;
                }

                subTree = keyTree;

            } else {
                // if is not the last group, should always have a key criteria
                this.dataGrid.log.warn('this should not happen');
            }

            rowGroupCols = rowGroupCols.slice(1);
            groupKeys = groupKeys.slice(1);

            result = this.getTreeNode(subTree, rowGroupCols, groupKeys, create);

        } else {
            this.dataGrid.log.warn('No group criteria, should not happen');
        }

        return result;
    }

    /**
     * @param tree
     * @param foundsetUUID
     * @return
     *
     *
     */
    getGroupNodeByFoundsetUUID(tree: GroupNode, foundsetUUID: string): GroupNode {
        if (!tree) {
            return null;
        }

        if (!foundsetUUID) {
            return null;
        }

        let resultNode = null;
        tree.forEachUntilSuccess((node: any)=> {
            if (node.foundsetUUID === foundsetUUID) {
                resultNode = node;
                return true;
            } else if (node.hasNodes()) { // search in subnodes
                return node.forEachUntilSuccess(()=> {
                    resultNode = this.getGroupNodeByFoundsetUUID(node, foundsetUUID);
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
     * @param tree
     * @param foundsetUUID
     * @return
     *
     *
     */
    getParentGroupNode(tree: any, foundsetUUID: any): any {
        if (!tree) {
            return null;
        }

        if (!foundsetUUID) {
            return null;
        }

        let parentNode: any = null;
        tree.forEachUntilSuccess((node: any) => {
            // found in the child
            if (parentNode) { // already found the tree
                return true;
            }
            if (node.foundsetUUID === foundsetUUID) {
                parentNode = tree;
                return true;
            } else if (node.hasNodes()) { // search in subnodes
                node.forEachUntilSuccess(()=>  {
                    parentNode = this.getParentGroupNode(node, foundsetUUID);
                    if (parentNode) { // break the for each if has found the result
                        return true;
                    } else { // keep searching
                        return false;
                    }
                });
                return (parentNode != null);
            } else if (parentNode) {
                return true;
            } else { // didn't find the node in all it's childs
                return false;
            }
        });
        return parentNode;
    }

    /**
     * @param tree
     * @param foundsetUUID
     * @return
     *
     * @deprecated
     */
    getTreeNodePath(tree: any, foundsetUUID: any) {
        if (!tree) {
            return null;
        }

        if (!foundsetUUID) {
            return null;
        }

        const path: any = [];

        const resultNode: any = null;
        tree.forEachUntilSuccess((node: any) => {
            if (node.foundsetUUID === foundsetUUID) {
                path.push(node);
                return true;
            } else if (node.hasNodes()) { // search in subnodes
                let subPath: any;
                const isInSubNodes = node.forEachUntilSuccess(() => {
                    subPath = this.getTreeNodePath(node, foundsetUUID);
                    if (resultNode) { // if has found the result
                        return true;
                    } else { // keep searching
                        return false;
                    }
                });

                if (isInSubNodes) {
                    path.concat(subPath);
                }
                return isInSubNodes;

            } else { // didn't find the node in all it's childs
                return false;
            }
        });

        return path;
    }
}

class GroupNode {

    nodes = new Object();
    foundsetUUID: any = undefined;

    constructor(public dataGrid: DataGrid, public id: string) {
    }

    /**
     * @public
     * @param callback execute function for each subnode. Arguments GroupNode
     *
     */
    forEach(callback: any) {
        for (const key of Object.keys(this.nodes)) {
            callback.call(this, this.nodes[key]);
        }
    }

    /**
     * @public
     * @return returns true if the callback ever returns true
     * @param callback execute function for each subnode until returns true. Arguments GroupNode
     *
     */
    forEachUntilSuccess(callback: any) {
        for (const key of Object.keys(this.nodes)) {
            if (callback.call(this, this.nodes[key]) === true) {
                return true;
            }
        }
        // return true only if there are no subnodes ?
        return false;
    }

    /**
     * @public
     * @return returns true if the callback ever returns true
     *
     */
    hasNodes() {
        return Object.keys(this.nodes).length > 0;
    }

    /**
     * @public
     * @remove the node
     * */
    destroy() {

        this.dataGrid.log.debug('--Destroy ' + this.foundsetUUID + ' - id : ' + this.id);
        // destroy all it's sub nodes
        this.removeAllSubNodes();

        // do nothing if the foundset doesn't exist
        if (this.foundsetUUID && this.foundsetUUID !== 'root') {
            // TODO should this method access the foundsetManager ? is not a good encapsulation
            //		if (this.onDestroy) {
            //			this.onDestroy.call(this, [this.id, this.foundsetUUID]);
            //		}
            const foundsetManager = this.dataGrid.getFoundsetManagerByFoundsetUUID(this.foundsetUUID);
            foundsetManager.destroy();
        }
    }

    removeAllSubNodes() {
        this.forEach((subNode: any) => {
            subNode.destroy();
        });
        this.nodes = [];
    }
}
