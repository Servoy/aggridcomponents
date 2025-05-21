import { GetRowIdParams, ColumnMenuTab, ColumnResizedEvent, ColDef, Column, IRowNode, IAggFunc, DisplayedColumnsChangedEvent } from 'ag-grid-community';
import { ChangeDetectorRef, Component, EventEmitter, Inject, Input, Output, Renderer2, SecurityContext, SimpleChanges } from '@angular/core';
import { BaseCustomObject, FormattingService, ICustomArray } from '@servoy/public';
import { LoggerFactory } from '@servoy/public';
import { ColumnsAutoSizingOn, GRID_EVENT_TYPES, IconConfig, MainMenuItemsConfig, NGGridDirective, ToolPanelConfig } from '../nggrid';
import { DatePicker } from '../editors/datepicker';
import { FormEditor } from '../editors/formeditor';
import { TextEditor } from '../editors/texteditor';
import { DomSanitizer } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { CustomTooltip } from '../datagrid/commons/tooltip';
import { isEqualWith } from 'lodash-es';
import { SelectEditor } from '../editors/selecteditor';
import { TypeaheadEditor } from '../editors/typeaheadeditor';
import { ValuelistFilter } from '../filters/valuelistfilter';
import { RadioFilter } from '../filters/radiofilter';
import { NgbTypeaheadConfig } from '@ng-bootstrap/ng-bootstrap';
import { RegistrationService } from '../datagrid/commons/registration.service';

const TABLE_PROPERTIES_DEFAULTS = {
    rowHeight: { gridOptionsProperty: 'rowHeight', default: 25 },
    headerHeight: { gridOptionsProperty: 'headerHeight', default: 33 },
    multiSelect: { gridOptionsProperty: 'rowSelection', default: false }
};

const COLUMN_PROPERTIES_DEFAULTS = {
    id: { colDefProperty: 'colId', default: null },
    headerTitle: { colDefProperty: 'headerName', default: null },
    headerTooltip: { colDefProperty: 'headerTooltip', default: null },
    headerStyleClass: { colDefProperty: 'headerClass', default: null },
    tooltip: { colDefProperty: 'tooltipField', default: null },
    styleClass: { colDefProperty: 'cellClass', default: null },
    enableRowGroup: { colDefProperty: 'enableRowGroup', default: true },
    rowGroupIndex: { colDefProperty: 'rowGroupIndex', default: -1 },
    enablePivot: { colDefProperty: 'enablePivot', default: false },
    pivotIndex: { colDefProperty: 'pivotIndex', default: -1 },
    aggFunc: { colDefProperty: 'aggFunc', default: '' },
    width: { colDefProperty: 'width', default: 0 },
    enableToolPanel: { colDefProperty: 'suppressToolPanel', default: true },
    maxWidth: { colDefProperty: 'maxWidth', default: null },
    minWidth: { colDefProperty: 'minWidth', default: null },
    visible: { colDefProperty: 'hide', default: true },
    enableResize: { colDefProperty: 'resizable', default: true },
    autoResize: { colDefProperty: 'suppressSizeToFit', default: true },
    enableSort: { colDefProperty: 'sortable', default: true },
    cellStyleClassFunc: { colDefProperty: 'cellClass', default: null },
    cellRendererFunc: { colDefProperty: 'cellRenderer', default: null },
    pivotComparatorFunc: { colDefProperty: 'pivotComparator', default: null },
    valueGetterFunc: { colDefProperty: 'valueGetter', default: null }
};

const COLUMN_KEYS_TO_CHECK_FOR_CHANGES = [
    'headerTitle',
    'headerStyleClass',
    'headerTooltip',
    'footerText',
    'styleClass',
    'visible',
    'excluded',
    'width',
    'minWidth',
    'maxWidth',
    'enableRowGroup',
    'enableSort',
    'enableResize',
    'enableToolPanel',
    'autoResize',
    'editType',
    'id',
    'columnDef'
];

@Component({
    selector: 'aggrid-datasettable',
    templateUrl: './powergrid.html',
    standalone: false
})
export class PowerGrid extends NGGridDirective {

    @Input() columns: PowerGridColumn[];
    @Input() styleClass: string;
    @Input() tabSeq: number;

    @Input() toolPanelConfig: ToolPanelConfig;
    @Input() iconConfig: IconConfig;
    @Input() localeText: any;
    @Input() mainMenuItemsConfig: MainMenuItemsConfig;
    @Input() gridOptions: any;
    @Input() showColumnsMenuTab: any;
    @Input() multiSelect: boolean;
    @Input() checkboxSelection: boolean;
    @Input() enableSorting: boolean;
    @Input() enableColumnResize: boolean;
    @Input() rowHeight: number;
    @Input() headerHeight: number;
    @Input() pivotMode: boolean;
    @Input() useLazyLoading: boolean;
    @Input() data: any;
    @Output() dataChange = new EventEmitter();
    @Input() pks: string[];
    @Input() updateData: any;
    @Input() lastRowIndex: number;
    @Input() readOnly: boolean;
    @Input() enabled: boolean;
    @Input() rowStyleClassFunc: any;
    @Input() isEditableFunc: any;
    @Input() groupStyleClass: any;
    @Input() groupWidth: number;
    @Input() groupMinWidth: number;
    @Input() groupMaxWidth: number;
    @Input() groupRowRendererFunc: any;
    @Input() columnsAutoSizing: string;
    @Output() columnsAutoSizingChange = new EventEmitter();
    @Input() continuousColumnsAutoSizing: boolean;
    @Input() columnsAutoSizingOn: ColumnsAutoSizingOn;

    @Input() _internalColumnState: any;
    @Output() _internalColumnStateChange = new EventEmitter();
    @Input() columnState: any;
    @Output() columnStateChange = new EventEmitter();
    @Input() _internalExpandedState: any;
    @Output() _internalExpandedStateChange = new EventEmitter();

    @Input() _internalResetLazyLoading: any;
    @Output() _internalResetLazyLoadingChange = new EventEmitter();

    @Input() onCellClick: any;
    @Input() onCellDoubleClick: any;
    @Input() onCellRightClick: any;
    @Input() onColumnDataChange: any;
    @Input() onColumnFormEditStarted: any;
    @Input() onLazyLoadingGetRows: any;
    @Input() onRowGroupOpened: any;
    @Input() onRowSelected: any;
    @Input() onReady: any;
    @Input() onColumnStateChanged: any;
    @Input() onFooterClick: any;
    @Input() _internalAggCustomFuncs: AggFuncInfo[];


    agMainMenuItemsConfig: any;
    agContinuousColumnsAutoSizing = false;

    initialColumnsAutoSizing: string;

    /**
     * Store the state of the table. TODO to be persisted
     * */
    state: State = new State();

    contextMenuItems: any = [];

    // set the true when the grid is ready
    isGridReady = false;

    // position of cell with invalid data as reported by the return of onColumnDataChange
    invalidCellDataIndex = { rowIndex: -1, colKey: '' };
    onColumnDataChangePromise: any = null;

    clickTimer: any = null;

    sizeColumnsToFitTimeout = null;


    isColumnsFirstChange = true;
    previousColumns: any[];

    isEditableCallback: any;

    lazyLoadingRemoteDatasource: RemoteDatasource;

    constructor(renderer: Renderer2, cdRef: ChangeDetectorRef, logFactory: LoggerFactory,
        public formattingService: FormattingService, public ngbTypeaheadConfig: NgbTypeaheadConfig,
        private sanitizer: DomSanitizer, @Inject(DOCUMENT) public doc: Document, private registrationService: RegistrationService) {
        super(renderer, cdRef);
        this.ngbTypeaheadConfig.container = 'body';
        this.log = logFactory.getLogger('PowerGrid');
    }

    ngOnInit() {
        super.ngOnInit();
        // if nggrids service is present read its defaults
        let toolPanelConfig = this.registrationService.powergridService.toolPanelConfig ? this.registrationService.powergridService.toolPanelConfig : null;
        let iconConfig = this.registrationService.powergridService.iconConfig ? this.registrationService.powergridService.iconConfig : null;
        let userGridOptions = this.registrationService.powergridService.gridOptions ? this.registrationService.powergridService.gridOptions : null;
        let localeText = this.registrationService.powergridService.localeText ? this.registrationService.powergridService.localeText : null;
        const mainMenuItemsConfig = this.registrationService.powergridService.mainMenuItemsConfig ? this.registrationService.powergridService.mainMenuItemsConfig : null;

        if (this.registrationService.powergridService.continuousColumnsAutoSizing) {
            this.agContinuousColumnsAutoSizing = this.registrationService.powergridService.continuousColumnsAutoSizing;
        }

        this.initialColumnsAutoSizing = this.columnsAutoSizing;

        toolPanelConfig = this.mergeConfig(toolPanelConfig, this.toolPanelConfig);
        iconConfig = this.mergeConfig(iconConfig, this.iconConfig);
        userGridOptions = this.mergeConfig(userGridOptions, this.gridOptions);
        localeText = this.mergeConfig(localeText, this.localeText);
        this.agMainMenuItemsConfig = this.mergeConfig(mainMenuItemsConfig, this.mainMenuItemsConfig);

        if (this.continuousColumnsAutoSizing) {
            this.agContinuousColumnsAutoSizing = this.continuousColumnsAutoSizing;
        }
        
        const vMenuTabs = ['generalMenuTab', 'filterMenuTab'] as ColumnMenuTab[];

        if (this.showColumnsMenuTab) vMenuTabs.push('columnsMenuTab');

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
                            suppressValues: toolPanelConfig ? toolPanelConfig.suppressValues : false,
                            suppressPivots: toolPanelConfig ? toolPanelConfig.suppressPivots : false,
                            suppressPivotMode: toolPanelConfig ? toolPanelConfig.suppressPivotMode : false,
                            suppressSideButtons: toolPanelConfig ? toolPanelConfig.suppressSideButtons : false,
                            suppressFiltersToolPanel: toolPanelConfig ? toolPanelConfig.suppressColumnFilter : false,
                            suppressColumnSelectAll: toolPanelConfig ? toolPanelConfig.suppressColumnSelectAll : false,
                            suppressColumnExpandAll: toolPanelConfig ? toolPanelConfig.suppressColumnExpandAll : false
                        }
                    }
                ]
            };
        }

        const columnDefs = this.getColumnDefs();

        // setup grid options
        this.agGridOptions = {
            context: {
                componentParent: this
            },
            debug: false,
            rowGroupPanelShow: 'always', // TODO expose property

            defaultColDef: {
                //                width: 0,
                filter: false,
                //                    valueFormatter: displayValueFormatter,
                menuTabs: vMenuTabs,
                sortable: this.enableSorting,
                resizable: this.enableColumnResize,
                tooltipComponent: CustomTooltip
            },
            excelStyles: [
                {
                    id: 'stringType',
                    dataType: 'String'
                }
            ],
            columnDefs,
            getMainMenuItems: (params) => this.getMainMenuItems(params),

            rowHeight: this.rowHeight,
            // TODO enable it ?					rowClass: $scope.model.rowStyleClass,	// add the class to each row

            headerHeight: this.headerHeight, // exposed property

            suppressContextMenu: false,
            suppressMovableColumns: false, // TODO persist column order changes
            suppressAutoSize: true,
            autoSizePadding: 25,
            suppressFieldDotNotation: true,

            // suppressMovingInCss: true,
            suppressColumnMoveAnimation: true,
            suppressAnimationFrame: false,

            rowSelection: {
                mode: this.multiSelect === true ? 'multiRow' : 'singleRow',
                enableClickSelection: this.enabled,
                checkboxes: this.enabled && (this.checkboxSelection || this.multiSelect),
                headerCheckbox: false 
            },
			selectionColumnDef: {
				pinned: 'left',
				sortable: false,
				resizable: false,
				suppressHeaderMenuButton: true
			},
            //                suppressRowClickSelection: rowGroupColsDefault.length === 0 ? false : true,
            cellSelection: false,

            stopEditingWhenCellsLoseFocus: true,
            singleClickEdit: true,
            suppressClickEdit: false,
            enableGroupEdit: false,
            // groupUseEntireRow: false,
            // groupMultiAutoColumn: true,

            pivotMode: this.pivotMode,

            animateRows: false,
            enableCellExpressions: true,

            onGridReady: (event) => {
                this.log.debug('gridReady');
                this.isGridReady = true;
                const emptyValue = '_empty';
                if (this._internalColumnState !== emptyValue) {
                    this.columnState = this._internalColumnState;
                    // need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
                    this._internalColumnState = emptyValue;
                    this._internalColumnStateChange.emit(emptyValue);
                }
                if (this.columnState) {
                    this.restoreColumnsState();
                } else {
                    this.storeColumnsState(true);
                }
                this.applyExpandedState();

                if (this.onReady) {
                    this.onReady();
                }
                // without timeout the column don't fit automatically
                this.setTimeout(() => {
                    this.setupHeaderIconStyleClass();
                    this.svySizeColumnsToFit(GRID_EVENT_TYPES.GRID_READY);
                }, 150);
            },
            getContextMenuItems: () => this.contextMenuItems,

            autoGroupColumnDef: {
                //cellRenderer: DatasetTableGroupCellRenderer,
                cellRendererParams: { suppressCount: false },
                headerName: ' ',
                cellClass: this.groupStyleClass
            },
            onGridSizeChanged: () => {
                this.setTimeout(() => {
                    // if not yet destroyed
                    if (this.agGrid.gridOptions.onGridSizeChanged) {
                        this.svySizeColumnsToFit(GRID_EVENT_TYPES.GRID_SIZE_CHANGED);
                    }
                }, 150);
            },
            //                onColumnEverythingChanged: storeColumnsState,	// do we need that ?, when is it actually triggered ?
            onSortChanged: () => this.storeColumnsState(),
            //                onFilterChanged: storeColumnsState,			 disable filter sets for now
            //                onColumnVisible: storeColumnsState,			 covered by onDisplayedColumnsChanged
            //                onColumnPinned: storeColumnsState,			 covered by onDisplayedColumnsChanged
            onColumnResized: (e: ColumnResizedEvent) => {   // NOT covered by onDisplayedColumnsChanged
                if (e.source === 'uiColumnResized') {
                    if (this.sizeColumnsToFitTimeout !== null) {
                        clearTimeout(this.sizeColumnsToFitTimeout);
                    }
                    this.sizeColumnsToFitTimeout = this.setTimeout(() => {
                        this.sizeColumnsToFitTimeout = null;
                        // agGrid.api.sizeColumnsToFit from sizeHeaderAndColumnsToFit uses the width from
                        // the column def instead of the actual width to calculate the layout, so set it
                        // during the call and then reset it at the end

                        let displayedColumns = this.agGrid.api.getAllDisplayedColumns();
                        let suppressSizeToFit: boolean, colDef: ColDef;

                        if (e.column) {
                            //make sure this column is skipped when resizing, so it gets the exact size the user has dragged it to
                            colDef = e.column.getColDef();
                            suppressSizeToFit = colDef.suppressSizeToFit;
                            colDef.suppressSizeToFit = true;
                        }

                        let displayedColDef: ColDef;
                        displayedColumns.forEach((displayedCol: Column) => {
                            displayedColDef = this.agGrid.api.getColumnDef(displayedCol.getColId());
                            displayedColDef.width = displayedCol.getActualWidth();
                            const column = this.getColumn(displayedColDef.field);
                            if(column) column.width = displayedColDef.width;                            
                        });

                        //let the grid resize to fill the viewport based on actual width
                        this.svySizeColumnsToFit(GRID_EVENT_TYPES.COLUMN_RESIZED);

                        if (colDef) {
                            //remove / restore original suppressSizeToFit setting of the column resized
                            if (suppressSizeToFit === undefined) {
                                delete colDef.suppressSizeToFit;
                            } else {
                                colDef.suppressSizeToFit = suppressSizeToFit;
                            }
                        }

                        this.storeColumnsState();
                    }, 500);
                } else {
                    this.sizeHeader();
                    this.storeColumnsState(e.source === 'api');
                }
            },
            onDisplayedColumnsChanged: (e: DisplayedColumnsChangedEvent) => {
                if(this.isGridReady) {
                    if(e.source === 'contextMenu') {
                        let column: any;
                        for (let i = 0; this.columns && i < this.columns.length; i++) {
                            column = this.columns[i];
                            if(column.initialWidth === -1) {
                                delete column.width;
                            } else {
                                column.width = column.initialWidth;
                            }
                        }                
                        this.updateColumnDefs();
                    }
                    this.svySizeColumnsToFit(GRID_EVENT_TYPES.DISPLAYED_COLUMNS_CHANGED);
                    this.storeColumnsState(e.source === 'api');
                }
            },
            //                onColumnRowGroupChanged: storeColumnsState,	 covered by onDisplayedColumnsChanged
            //                onColumnValueChanged: storeColumnsState,
            //                onColumnMoved: storeColumnsState,              covered by onDisplayedColumnsChanged
            //                onColumnGroupOpened: storeColumnsState		 i don't think we need that, it doesn't include the open group in column state

            navigateToNextCell: (params) => this.selectionChangeNavigation(params),
            tabToNextCell: (params) => this.tabSelectionChangeNavigation(params),
            sideBar,
            enableBrowserTooltips: false,
            onToolPanelVisibleChanged: () => {
                this.svySizeColumnsToFit(GRID_EVENT_TYPES.TOOLPANEL_VISIBLE_CHANGE);
            },
            onCellEditingStopped: (event) => {
                // don't allow escape if cell data is invalid
                if (this.onColumnDataChangePromise == null) {
                    const rowIndex = event.rowIndex;
                    const colId = event.column.getColId();
                    if (this.invalidCellDataIndex.rowIndex === rowIndex && this.invalidCellDataIndex.colKey === colId) {
                        this.agGrid.api.startEditingCell({
                            rowIndex,
                            colKey: colId
                        });
                    }
                }
            },
            onCellEditingStarted: (event) => {
                // don't allow editing another cell if we have an invalidCellData
                if (this.invalidCellDataIndex.rowIndex !== -1 && this.invalidCellDataIndex.colKey !== '') {
                    const rowIndex = event.rowIndex;
                    const colId = event.column.getColId();
                    if (this.invalidCellDataIndex.rowIndex !== rowIndex || this.invalidCellDataIndex.colKey !== colId) {
                        this.agGrid.api.stopEditing();
                        this.agGrid.api.startEditingCell({
                            rowIndex: this.invalidCellDataIndex.rowIndex,
                            colKey: this.invalidCellDataIndex.colKey
                        });
                    }
                }
            },
            getRowId: (param: GetRowIdParams) => {
                let rowNodeId = null;
                if (this.pks && this.pks.length > 0) {
                    rowNodeId = '' + param.data[this.pks[0]];
                    for (let i = 1; i < this.pks.length; i++) {
                        rowNodeId += '_' + param.data[this.pks[i]];
                    }
                } else {
                    rowNodeId = JSON.stringify(param.data);
                }
                return rowNodeId;
            },
            resetRowDataOnUpdate: true,
            components: {
                valuelistFilter: ValuelistFilter,
                radioFilter: RadioFilter
            }
        };

        if (this.groupWidth || this.groupWidth === 0) this.agGridOptions.autoGroupColumnDef.width = this.groupWidth;
        if (this.groupMaxWidth) this.agGridOptions.autoGroupColumnDef.maxWidth = this.groupMaxWidth;
        if (this.groupMinWidth || this.groupMinWidth === 0) this.agGridOptions.autoGroupColumnDef.minWidth = this.groupMinWidth;


        // check if we have filters
        for (let i = 0; this.agGridOptions.sideBar && this.agGridOptions.sideBar['toolPanels'] && i < columnDefs.length; i++) {
            if (columnDefs[i].filter) {
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

        if (this.useLazyLoading) {
            this.agGridOptions.rowModelType = 'serverSide';
        } else {
            this.agGridOptions.rowModelType = 'clientSide';
            this.agGridOptions.rowData = this.data;
        }

        if (this.rowStyleClassFunc) {
            const rowStyleClassFunc = this.rowStyleClassFunc;
            this.agGridOptions.getRowClass =
                (params) => {
                    if (params.node.rowPinned) return '';
                    return rowStyleClassFunc(params.rowIndex, (params.data || Object.assign(params.node.groupData, params.node.aggData)), /* TODO CHECK params.event*/ null, params.node.group);
                };
        }

        if (this.isEditableFunc) {
            const isEditableFunc = this.isEditableFunc;
            this.isEditableCallback =
                (params: any) => isEditableFunc(params.node !== undefined ? params.node.rowIndex : params.rowIndex, params.data, params.colDef.colId !== undefined ?
                    params.colDef.colId : params.colDef.field);
        }

        if (this._internalAggCustomFuncs) {
            this.agGridOptions.aggFuncs = this.getAggCustomFuncs();
        }

        const gridFooterData = this.getFooterData();
        if (gridFooterData) {
            this.agGridOptions.pinnedBottomRowData = gridFooterData;
        }

        // set the icons
        if (iconConfig) {
            type FunctionType = () => string;
            const icons: { [key: string]: string | FunctionType } = {};

            for (const iconName in iconConfig) {
                if (iconName === 'iconRefreshData') continue;

                let aggridIcon = iconName.slice(4);
                aggridIcon = aggridIcon[0].toLowerCase() + aggridIcon.slice(1);
                icons[aggridIcon] = this.getIconElement(iconConfig[iconName]);
            }

            // TODO expose property
            //                icons.rowGroupPanel = " "
            //                icons.pivotPanel = " "
            //                icons.valuePanel = " "

            this.agGridOptions.icons = icons;
        }

        this.setHeight();

        // locale text
        if (localeText) {
            this.agGridOptions['localeText'] = localeText;
        }

        // fill user grid options properties
        if (userGridOptions) {
            const gridOptionsSetByComponent = {};
            for (const p in TABLE_PROPERTIES_DEFAULTS) {
                if (TABLE_PROPERTIES_DEFAULTS[p]['default'] !== this[p]) {
                    gridOptionsSetByComponent[TABLE_PROPERTIES_DEFAULTS[p]['gridOptionsProperty']] = true;
                }
            }

            for (const property in userGridOptions) {
                if (userGridOptions.hasOwnProperty(property) && !gridOptionsSetByComponent.hasOwnProperty(property)) {
                    this.agGridOptions[property] = userGridOptions[property];
                }
            }
        }

        if (this.agGridOptions.groupDisplayType === 'groupRows') {
            let groupRowRendererFunc = this.groupRowInnerRenderer;
            if (this.groupRowRendererFunc) {
                groupRowRendererFunc = this.groupRowRendererFunc;
            }
            //this.agGridOptions.groupRowRenderer = DatasetTableGroupCellRenderer;
            this.agGridOptions.groupRowRendererParams = {
                innerRenderer: groupRowRendererFunc
            };
        }

        // handle options that are dependent on gridOptions
        if (this.agGridOptions['enableCharts'] && this.agGridOptions['cellSelection']) {
            this.contextMenuItems.push('chartRange');
        }

        // show warnings
        if (this.styleClass === 'ag-theme-fresh') {
            this.log.warn('ag-theme-fresh is deprecated, see: https://www.ag-grid.com/javascript-grid/themes-v23-migration/');
        }
    }

    private setupHeaderIconStyleClass(): void {
        if(this.columns) {
            for(let i = 0; i < this.columns.length; i++) {
                if(this.columns[i].headerIconStyleClass) {
                    const colId = this.columns[i].id;
                    const columnEl = this.doc.querySelector('[col-id="' + colId + '"]');
                    if(columnEl) {
                        const labelEl = columnEl.querySelector('.ag-header-cell-label');
                        if(labelEl) {
                            labelEl.setAttribute('class', labelEl.getAttribute('class') + ' ' + this.columns[i].headerIconStyleClass);
                        }
                    }
                }
            }
        }
    }

    private getColumnsAutoSizingOn(): unknown {
        if(this.columnsAutoSizingOn) {
            return this.columnsAutoSizingOn;
        } else if(this.registrationService.powergridService.columnsAutoSizingOn) {
            return this.registrationService.powergridService.columnsAutoSizingOn
        }
        return null;
    }

    svyOnInit() {
        super.svyOnInit();

        // TODO:
        // init the grid. If is in designer render a mocked grid
        if (this.servoyApi.isInDesigner()) {
            // $element.addClass("design-mode");
            // var designGridOptions = {
            //     rowModelType: 'clientSide',
            //     columnDefs: columnDefs,
            //     rowHeight: $scope.model.rowHeight,
            //     rowData: []
            // };
            return;
        }

        this.agGridElementRef.nativeElement.addEventListener('contextmenu', (e: any) => {
            e.preventDefault();
        });

        this.agGridElementRef.nativeElement.addEventListener('focus', (e: any) => {
            if (this.agGrid.api) {
                const allDisplayedColumns = this.agGrid.api.getAllDisplayedColumns();
                if (allDisplayedColumns && allDisplayedColumns.length) {
                    const focuseFromEl = e.relatedTarget;
                    if (focuseFromEl && (focuseFromEl.classList.contains('ag-cell') || focuseFromEl.classList.contains('ag-header-cell'))) { // focuse out from the grid
                        this.agGrid.api.clearFocusedCell();
                    } else if (this.agGridOptions.groupDisplayType !== 'groupRows') {
                        const selectedRows = this.agGrid.api.getSelectedNodes();
                        let selectedRowIdx = 0;
                        if(selectedRows && selectedRows.length > 0) {
                            selectedRowIdx = selectedRows[0].rowIndex;
                        } else {
                            this.setSelectedRows([0]);
                        }
                        this.agGrid.api.ensureColumnVisible(allDisplayedColumns[0]);
                        this.agGrid.api.setFocusedCell(selectedRowIdx, allDisplayedColumns[0]);
                    }
                }
            }
        });

        let mainWindowContainer = this.agGridElementRef.nativeElement.closest('.svy-main-window-container');
        if(!mainWindowContainer) {
            mainWindowContainer = this.agGridElementRef.nativeElement.closest('.svy-dialog');
        }
        this.agGrid.api.setGridOption('popupParent', mainWindowContainer ? mainWindowContainer : this.agGridElementRef.nativeElement);
        // register listener for selection changed
        this.agGrid.api.addEventListener('rowSelected', (event: any) => this.onRowSelectedHandler(event));
        this.agGrid.api.addEventListener('cellClicked', (params: any) => this.cellClickHandler(params));
        this.agGrid.api.addEventListener('cellDoubleClicked', (params: any) => this.onCellDoubleClicked(params));
        this.agGrid.api.addEventListener('cellContextMenu', (params: any) => this.onCellContextMenu(params));
        this.agGrid.api.addEventListener('displayedColumnsChanged', () => this.svySizeColumnsToFit(GRID_EVENT_TYPES.DISPLAYED_COLUMNS_CHANGED));

        // listen to group changes
        this.agGrid.api.addEventListener('columnRowGroupChanged', (event: any) => this.onColumnRowGroupChanged(event));

        // listen to group collapsed
        this.agGrid.api.addEventListener('rowGroupOpened', (event: any) => this.onRowGroupOpenedHandler(event));


        if (!this.servoyApi.isInDesigner() && this.useLazyLoading) {
            this.lazyLoadingRemoteDatasource = new RemoteDatasource(this);
            this.agGrid.api.setGridOption('serverSideDatasource', this.lazyLoadingRemoteDatasource);
        }
    }

    svyOnChanges(changes: SimpleChanges) {
        if (changes) {
            for (const property of Object.keys(changes)) {
                const change = changes[property];
                switch (property) {
                    case 'responsiveHeight':
                        this.setHeight();
                        break;
                    case 'data':
                        if (this.agGrid && !this.useLazyLoading) {
                            this.agGrid.api.setGridOption('rowData', this.data)
                            this.applyExpandedState();
                        }
                        break;
                    case 'updateData':
                        if (change.currentValue) {
                            this.agGrid.api.applyTransaction(change.currentValue);
                            this.servoyApi.callServerSideApi('clearUpdateData', []);
                        }
                        break;
                    case 'columns':
                        if (!this.isColumnsFirstChange) {
                            if (!isEqualWith(change.currentValue, change.previousValue) ||
                                (change.currentValue && this.previousColumns && change.currentValue.length !== this.previousColumns.length)) {
                                this.updateColumnDefs();
                            } else {
                                for (let i = 0; i < this.columns.length; i++) {
                                    for (const prop of COLUMN_KEYS_TO_CHECK_FOR_CHANGES) {
                                        const oldPropertyValue = this.previousColumns &&
                                            i < this.previousColumns.length ? this.previousColumns[i][prop] : null;
                                        const newPropertyValue = change.currentValue[i][prop];
                                        if (newPropertyValue !== oldPropertyValue) {
                                            this.log.debug('column property changed');
                                            if (this.isGridReady) {
                                                if (prop !== "headerTooltip" && prop !== 'footerText' && prop !== 'headerTitle' && prop !== 'visible' && prop !== 'width') {
                                                    this.updateColumnDefs();
                                                    if (prop !== 'enableToolPanel' && prop !== 'excluded') {
                                                        this.restoreColumnsState();
                                                    }
                                                }
                                            }

                                            if (prop === 'headerTitle') {
                                                this.handleColumnHeader(i, 'headerName', newPropertyValue);
                                            } else if (prop === 'headerTitle') {
                                                this.handleColumnHeader(i, prop, newPropertyValue);
                                            } else if (prop === 'footerText') {
                                                this.handleColumnFooterText();
                                            } else if (prop === 'visible' || prop === 'width') {
                                                // column id is either the id of the column
                                                const column = this.columns[i];
                                                let colId = column.id;
                                                if (!colId) {
                                                    colId = column['dataprovider'];
                                                }
                                                if (!colId) {
                                                    this.log.warn('cannot update "' + property + '" property on column at position index ' + i);
                                                    return;
                                                }

                                                if (prop === 'visible') {
                                                    this.agGrid.api.setColumnsVisible([colId], newPropertyValue as boolean);
                                                } else {
                                                    const actualWidth = this.agGrid.api.getColumn(colId).getActualWidth();
                                                    if(actualWidth !== newPropertyValue as number) {                                                    
                                                        this.agGrid.api.setColumnWidths([{ key: colId, newWidth:newPropertyValue as number}]);
                                                        this.svySizeColumnsToFit(GRID_EVENT_TYPES.DISPLAYED_COLUMNS_CHANGED);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            this.isColumnsFirstChange = false;
                        }
                        if (change.currentValue) {
                            this.previousColumns = [];
                            for (const column of change.currentValue) {
                                this.previousColumns.push(Object.assign({}, column));
                            }
                        } else {
                            this.previousColumns = null;
                        }
                        break;
                    case '_internalColumnState':
                        if (this.isGridReady && (change.currentValue !== '_empty')) {
                            this.columnState = change.currentValue;
                            this.columnStateChange.emit(this.columnState);
                            // need to clear it, so the watch can be used, if columnState changes, and we want to apply the same _internalColumnState again
                            this._internalColumnState = '_empty';
                            this._internalColumnStateChange.emit(this._internalColumnState);
                            if (this.columnState) {
                                this.restoreColumnsState();
                            } else {
                                this.agGrid.api.resetColumnState();
                            }
                        }
                        break;
                    case '_internalAggCustomFuncs':
                        if (this.agGrid && this._internalAggCustomFuncs) {
                            this.agGrid.api.addAggFuncs(this.getAggCustomFuncs());
                        }
                        break;
                    case 'enabled':
                        if (this.isGridReady) {
                            this.agGridOptions.rowSelection['enableClickSelection'] = change.currentValue;
                            this.agGridOptions.rowSelection['checkboxes'] = change.currentValue && (this.checkboxSelection || this.multiSelect);
                            this.agGrid.api.setGridOption('rowSelection', this.agGridOptions.rowSelection);
                            this.updateColumnDefs();
                        }
                        break;
                    case '_internalResetLazyLoading':
                        if (this.isGridReady && change.currentValue) {
                            this._internalResetLazyLoading = false;
                            this._internalResetLazyLoadingChange.emit(this._internalResetLazyLoading);
                            this.agGrid.api.setGridOption('serverSideDatasource', this.lazyLoadingRemoteDatasource);
                        }
                        break;
                }
            }
        }
        super.svyOnChanges(changes);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        // release grid resources
        this.destroy();
    }

    getColumnDefs() {
        //create the column definitions from the specified columns in designer
        const colDefs = [];
        let colDef: any = {};
        const colGroups = {};
        if (this.columns) {
            for (const column of this.columns) {
                if(column.excluded) continue;
                //create a column definition based on the properties defined at design time
                colDef = {
                    headerName: column['headerTitle'] ? column['headerTitle'] : '',
                    headerTooltip: column['headerTooltip'] ? column['headerTooltip'] : null,
                    field: column['dataprovider'],
                    tooltipField: column['tooltip'] ? column['tooltip'] : null
                };

                // set id if defined
                if (column.id) {
                    colDef.colId = column.id;
                }

                // styleClass
                colDef.headerClass = ['ag-table-header'];
                if (column.headerStyleClass) {
                    colDef.headerClass = colDef.headerClass.concat(column.headerStyleClass.split(' '));
                }
                colDef.cellClass = ['ag-table-cell'];
                if (column.formatType === 'TEXT') {
                    colDef.cellClass.push('stringType');
                }
                if (column.styleClass) {
                    colDef.cellClass = colDef.cellClass.concat(column.styleClass.split(' '));
                }

                // column grouping & pivoting
                colDef.enableRowGroup = this.enabled && column.enableRowGroup;
                if (column.rowGroupIndex >= 0) colDef.rowGroupIndex = column.rowGroupIndex;

                colDef.enablePivot = this.enabled && column.enablePivot;
                if (column.pivotIndex >= 0) colDef.pivotIndex = column.pivotIndex;

                if (column.aggFunc) colDef.aggFunc = column.aggFunc;
                if (colDef.aggFunc) colDef.enableValue = true;

                // tool panel
                if (column.enableToolPanel === false) {
                    colDef.suppressColumnsToolPanel = colDef.suppressFiltersToolPanel = !column.enableToolPanel;
                }

                // column sizing
                if (column.width) {
                    colDef.width = column.width;
                    if(column.initialWidth === undefined) column.initialWidth = column.width;
                } else {
                    column.initialWidth = -1;
                }
                if (column.maxWidth) colDef.maxWidth = column.maxWidth;
                if (column.minWidth || column.minWidth === 0) colDef.minWidth = column.minWidth;

                // column resizing https://www.ag-grid.com/javascript-grid-resizing/
                if (column.enableResize === false) colDef.resizable = column.enableResize;
                if (column.autoResize === false) colDef.suppressSizeToFit = !column.autoResize;
                // sorting
                if (!this.enabled || column.enableSort === false) colDef.sortable = false;
                // visibility
                if (column.visible === false) colDef.hide = true;
                if (column.format) {
                    if (column.formatType === 'DATETIME' && column.format.useLocalDateTime) {
                        colDef.valueGetter = (params: any) => {
                            const field = params.colDef.field;
                            if (field && params.data && params.data[field]) {
                                return new Date(params.data[field]);
                            }
                            return '';
                        };
                    }
                    colDef.valueFormatter = this.createValueFormatter(column.format);
                }

                if (column.cellStyleClassFunc) {
                    colDef.cellClass = this.createColumnCallbackFunctionFromString(column.cellStyleClassFunc);
                } else if (column.footerStyleClass) {
                    const defaultCellClass = colDef.cellClass;
                    const footerCellClass = defaultCellClass.concat(column.footerStyleClass.split(' '));
                    colDef.cellClass = (params: any) => params.node && params.node.rowPinned === 'bottom' ? footerCellClass : defaultCellClass;
                }

                if (column.cellRendererFunc) {
                    colDef.cellRenderer = this.createColumnCallbackFunctionFromString(column.cellRendererFunc);
                } else {
                    colDef.cellRenderer = this.getDefaultCellRenderer(column);
                }

                if (column.pivotComparatorFunc) {
                    colDef.pivotComparator = this.createPivotComparatorCallbackFunctionFromString(column.pivotComparatorFunc);
                }

                if (column.valueGetterFunc) {
                    colDef.valueGetter = this.createColumnValueGetterCallbackFunctionFromString(column.valueGetterFunc);
                }

                if (this.enabled && column.filterType) {
                    colDef.filter = true;
                    colDef.filterParams = { buttons: ['apply', 'clear'], newRowsAction: 'keep', caseSensitive: false };

                    if (column.filterType === 'TEXT') {
                        colDef.filter = 'agTextColumnFilter';
                    } else if (column.filterType === 'NUMBER') {
                        colDef.filter = 'agNumberColumnFilter';
                    } else if (column.filterType === 'DATE') {
                        colDef.filter = 'agDateColumnFilter';
                    } else if (column.filterType === 'VALUELIST') {
                        colDef.filter = 'valuelistFilter';
                        colDef.filterParams['suppressAndOrCondition'] = true;
                        colDef.floatingFilterComponent = 'valuelistFilter';
                        //colDef.floatingFilterComponentParams = { suppressFilterButton : true};
                    } else if (column.filterType === 'RADIO') {
                        colDef.filter = 'radioFilter';
                        colDef.filterParams['suppressAndOrCondition'] = true;
                        colDef.floatingFilterComponent = 'radioFilter';
                        //colDef.floatingFilterComponentParams = { suppressFilterButton : true};
                    }
                }

                if (column.editType) {
                    if (column.editType === 'TEXTFIELD') {
                        colDef.cellEditor = TextEditor;
                    } else if (column.editType === 'DATEPICKER') {
                        colDef.cellEditor = DatePicker;
                        colDef.cellEditorPopupPosition = 'over';
                    } else if (column.editType === 'COMBOBOX') {
                        colDef.cellEditor = SelectEditor;
                    } else if (column.editType === 'TYPEAHEAD') {
                        colDef.cellEditor = TypeaheadEditor;
                    } else if (column.editType === 'FORM') {
                        colDef.cellEditor = FormEditor;
                        colDef.suppressKeyboardEvent = (params: any) => {
                            // grid should do nothing on ENTER and TAB
                            const gridShouldDoNothing = params.editing && (params.event.keyCode === 9 || params.event.keyCode === 13);
                            return gridShouldDoNothing;
                        };
                    }

                    colDef.onCellValueChanged = (param: any) => this.onCellValueChanged(param);
                }

                if (column.dndSourceFunc) {
                    colDef.dndSource = this.createColumnCallbackFunctionFromString(column.dndSourceFunc);
                } else if (column.dndSource) {
                    colDef.dndSource = true;
                }

                if (colDef.dndSource) {
                    colDef.dndSourceOnRowDrag = (params) => {
                        const dragDatas = [];

                        const selectedNodes = this.agGrid.api.getSelectedNodes();
                        const rowDatas = selectedNodes.indexOf(params.rowNode) === -1 ? [params.rowNode] : selectedNodes;
                        rowDatas.forEach(row => {
                            const rowData = row.data || Object.assign(row.groupData, row.aggData);
                            dragDatas.push(rowData);
                        });

                        this.registrationService.powergridService.setDragData(dragDatas);

                        if(this.onDragGetImageFunc) {
                            const dragGhostEl = this.doc.createElement('div') as HTMLElement;
                            dragGhostEl.id = 'nggrids-drag-ghost';
                            dragGhostEl.innerHTML = this.onDragGetImageFunc(this.registrationService.powergridService.getDragData(), params.dragEvent);
                            dragGhostEl.style.position = 'absolute';
                            dragGhostEl.style.top = '-1000px';
                            this.doc.body.appendChild(dragGhostEl);
        
                            params.dragEvent.dataTransfer.setDragImage(dragGhostEl, 0, 0);
                        }                        

                        params.dragEvent.dataTransfer.setData('nggrids/json', JSON.stringify(dragDatas));
                    };
                }

                if (column.valuelist) {
                    const currentValueGetter = colDef.valueGetter;
                    colDef.valueGetter = (params: any) => {
                        let v = currentValueGetter ? currentValueGetter(params) : params.data ? params.data[params.colDef.field] : undefined;
                        for (let index = 0; index < column.valuelist.length; index++) {
                            const element = column.valuelist[index];
                            if (element.realValue == v) {
                                v = element;
                                break;
                            }
                        }
                        return v;
                    }
                }

                let columnOptions = this.registrationService.powergridService.columnOptions ? this.registrationService.powergridService.columnOptions : {};
                columnOptions = this.mergeConfig(columnOptions, column.columnDef);

                if (columnOptions) {
                    if(columnOptions.hasOwnProperty('checkboxSelection')) {
                        this.checkboxSelection = columnOptions['checkboxSelection'];
                        delete columnOptions['checkboxSelection'];
                    }
                    const colDefSetByComponent = {};
                    for (const p in COLUMN_PROPERTIES_DEFAULTS) {
                        if (COLUMN_PROPERTIES_DEFAULTS[p]['default'] !== column[p]) {
                            colDefSetByComponent[COLUMN_PROPERTIES_DEFAULTS[p]['colDefProperty']] = true;
                        }
                    }
                    for (const property in columnOptions) {
                        if (columnOptions.hasOwnProperty(property) && !colDefSetByComponent.hasOwnProperty(property)) {
                            colDef[property] = columnOptions[property];
                        }
                    }
                }

                if(colDef.suppressHeaderMenuButton === undefined) {
                    colDef.suppressHeaderMenuButton = colDef.enableRowGroup === false && colDef.filter === undefined;
                }

                if (column.editType && (colDef['editable'] === undefined || colDef['editable']) === true) {
                    colDef.editable = (params: any) => this.isColumnEditable(params);
                }


                if (column.headerGroup) {
                    if (!colGroups[column.headerGroup]) {
                        colGroups[column.headerGroup] = {};
                        colDefs.push(colGroups[column.headerGroup]);
                        colGroups[column.headerGroup]['headerName'] = column.headerGroup;
                        colGroups[column.headerGroup]['headerClass'] = column.headerGroupStyleClass;
                        colGroups[column.headerGroup]['children'] = [];
                    }
                    colGroups[column.headerGroup]['children'].push(colDef);
                } else {
                    colDefs.push(colDef);
                }
            }
        }
        return colDefs;
    }

    mergeConfig(target: any, source: any) {
        let property: any;

        // clone target to avoid side effects
        let mergeConfig = {};
        if (target) {
            for (property in target) {
                if (target.hasOwnProperty(property)) {
                    mergeConfig[property] = target[property];
                }
            }
        }

        if (source) {
            for (property in source) {
                if (source.hasOwnProperty(property)) {
                    mergeConfig[property] = source[property];
                }
            }
        }
        return mergeConfig;
    }

    getAggCustomFuncs(): { [key: string]: IAggFunc } {
        const aggFuncs = {};
        for (const aggFuncInfo of this._internalAggCustomFuncs) {
            aggFuncs[aggFuncInfo.name] = this.createAggCustomFunctionFromString(aggFuncInfo.aggFunc);
        }
        return aggFuncs;
    }

    hasValuelistResolvedDisplayData() {
        return false;
    }

    getValuelist(params: any): any {
        return this.getColumn(params.column.colId).valuelist;
    }

    getValuelistForFilter(params: any): any {
        return this.agGrid.api ? this.getValuelist(params) : null;
    }

    isColumnEditable(args: any) {
        // skip pinned (footer) nodes
        if (args.node.rowPinned) return false;
        const col = args.colDef.field ? this.getColumn(args.colDef.field) : null;
        if (col && col.editType === 'CHECKBOX' && (!args.event || args.event.target.tagName !== 'I')) {
            return false;
        }
        if (this.enabled && !this.readOnly) {
            if (this.isEditableCallback) {
                return this.isEditableCallback(args);
            }
            return true;
        } else {
            return false;
        }
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
        const powerGrid = params.context.componentParent;
        let items: any;
        if (powerGrid.agMainMenuItemsConfig && Object.keys(powerGrid.agMainMenuItemsConfig).length !== 0) {
            items = [];
            for (const key in powerGrid.agMainMenuItemsConfig) {
                if (powerGrid.agMainMenuItemsConfig.hasOwnProperty(key) && powerGrid.agMainMenuItemsConfig[key]) items.push(key);
            }
        } else {
            items = ['rowGroup', 'rowUnGroup'];
        }
        const menuItems = [];
        params.defaultItems.forEach((item: any) => {
            if (items.indexOf(item) > -1) {
                menuItems.push(item);
            }
        });
        return menuItems;
    }

    restoreColumnsState() {
        if (this.columnState) {
            let columnStateJSON = null;

            try {
                columnStateJSON = JSON.parse(this.columnState);
            } catch (e) {
                this.log.error(e);
            }

            if (columnStateJSON != null) {

                // aggrid moved the sort state to the columns; move it to sortModel to keep backward compatibility
                if(Array.isArray(columnStateJSON.columnState) && columnStateJSON.columnState.length > 0) {
                    for(let i = 0; i < columnStateJSON.columnState.length; i++) {
                        if(columnStateJSON.columnState[i].sort) {
                            if(!columnStateJSON.sortModel) columnStateJSON.sortModel = [];
                            columnStateJSON.sortModel.push( {
                                colId: columnStateJSON.columnState[i].colId,
                                sort: columnStateJSON.columnState[i].sort,
                                index: columnStateJSON.columnState[i].sortIndex
                            });
                            delete columnStateJSON.columnState[i].sort;
                            delete columnStateJSON.columnState[i].sortIndex;
                        }

                        // if flex is null aggrid applyColumnState ignores restoring the width
                        if(columnStateJSON.columnState[i].flex === null) {
                            delete columnStateJSON.columnState[i].flex;
                        }
                    }
                }

                if (Array.isArray(columnStateJSON.columnState) && columnStateJSON.columnState.length > 0) {
                    this.agGrid.api.applyColumnState({ state: columnStateJSON.columnState, applyOrder: true });
                }

                if (Array.isArray(columnStateJSON.rowGroupColumnsState) && columnStateJSON.rowGroupColumnsState.length > 0) {
                    this.agGrid.api.setRowGroupColumns(columnStateJSON.rowGroupColumnsState);
                }

                if (Array.isArray(columnStateJSON.sortModel) && columnStateJSON.sortModel.length > 0) {
                    this.applySortModel(columnStateJSON.sortModel);
                }

                this.agGrid.api.setSideBarVisible(columnStateJSON.isSideBarVisible);
            }
        }
    }

    applyExpandedState() {
        let expandedState = this._internalExpandedState;
        const groupFields = this.state.expanded.fields;
        if (this.isTableGrouped() && groupFields && expandedState) {
            this.agGrid.api.forEachNode((node, index) => {
                const rowGroupInfo = this.getNodeGroupInfo(node);
                const rowGroupKeys = rowGroupInfo.rowGroupKeys;

                // check if node is expanded
                let isExpanded = false;

                // check if the node is expanded
                expandedState = this._internalExpandedState;

                for (let j = 0; expandedState && j < rowGroupKeys.length; j++) {
                    expandedState = expandedState[rowGroupKeys[j]];
                    if (!expandedState) {
                        isExpanded = false;
                        break;
                    } else {
                        isExpanded = true;
                    }
                }

                node.setExpanded(isExpanded);
            });
        }
    }

    isTableGrouped() {
        const rowGroupCols = this.agGrid.api.getRowGroupColumns();
        return rowGroupCols && rowGroupCols.length > 0;
    }

    /**
     * Returns the group hierarchy for the given node
     *
     * @param  node
     *
     * */
    getNodeGroupInfo(node: any): any {
        const rowGroupCols = [];
        const groupKeys = [];

        let parentNode = node.parent;
        while (parentNode && parentNode.level >= 0 && parentNode.group === true) {
            // is reverse order
            rowGroupCols.unshift(parentNode.field);
            groupKeys.unshift(parentNode.key);

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

    svySizeColumnsToFit(eventType?: string) {

        const agColumnsAutoSizingOn = this.getColumnsAutoSizingOn();
        let useColumnsAutoSizing = this.columnsAutoSizing;
        if(this.initialColumnsAutoSizing !== 'NONE' && agColumnsAutoSizingOn) {
            useColumnsAutoSizing = agColumnsAutoSizingOn[eventType] === true ? this.initialColumnsAutoSizing : 'NONE';
        }

        switch (useColumnsAutoSizing) {
            case 'NONE':
                break;
            case 'AUTO_SIZE':
                // calling auto-size upon displayedColumnsChanged runs in an endless loop
                const skipEvents = [GRID_EVENT_TYPES.DISPLAYED_COLUMNS_CHANGED];
                // call auto-size only upon certain events
                const autoSizeOnEvents = [GRID_EVENT_TYPES.GRID_READY];
                if (eventType && autoSizeOnEvents.indexOf(eventType) > -1) {
                    const skipHeader = this.agGridOptions.skipHeaderOnAutoSize === true ? true : false;
                    this.autoSizeColumns(skipHeader);
                }
                break;
            case 'SIZE_COLUMNS_TO_FIT':
            default:
                this.agGrid.api.sizeColumnsToFit();

        }
        if (this.columnsAutoSizing !== 'NONE' && !this.agContinuousColumnsAutoSizing && !agColumnsAutoSizingOn && eventType === GRID_EVENT_TYPES.GRID_READY) {
            this.columnsAutoSizing = 'NONE';
            this.columnsAutoSizingChange.emit('NONE');
        }
    }

    storeColumnsState(skipFireColumnStateChanged?: boolean) {
        const rowGroupColumns = this.agGrid.api.getRowGroupColumns();
        const svyRowGroupColumnIds = [];
        for (const rowGroupColumn of rowGroupColumns) {
            svyRowGroupColumnIds.push(rowGroupColumn.getColId());
        }

        const columnState = {
            columnState: this.agGrid.api.getColumnState(),
            rowGroupColumnsState: svyRowGroupColumnIds,
            isToolPanelShowing: this.agGrid.api.isToolPanelShowing(),
            isSideBarVisible: this.agGrid.api.isSideBarVisible()
            // filterState: gridOptions.api.getFilterModel(), TODO persist column states
        };

        const newColumnState = JSON.stringify(columnState);

        if (newColumnState !== this.columnState) {
            this.columnState = newColumnState;
            this.columnStateChange.emit(newColumnState);
            if (skipFireColumnStateChanged !== true && this.onColumnStateChanged) {
                this.onColumnStateChanged(this.columnState, this.createJSEvent());
            }
        }
    }

    selectionChangeNavigation(params: any) {
        if (!this.enabled) return;
        const previousCell = params.previousCellPosition;
        const suggestedNextCell = params.nextCellPosition;

        const KEY_UP = 38;
        const KEY_DOWN = 40;
        const KEY_LEFT = 37;
        const KEY_RIGHT = 39;

        let newIndex: any;
        let nextRow: any;
        switch (params.event.keyCode) {
            case KEY_DOWN:
                newIndex = previousCell.rowIndex + 1;
                nextRow = this.agGrid.api.getDisplayedRowAtIndex(newIndex);
                while (nextRow && (nextRow.group || nextRow.selected)) {
                    newIndex++;
                    nextRow = this.agGrid.api.getDisplayedRowAtIndex(newIndex);
                }

                // set selected cell on next non-group row cells
                if (nextRow) {
                    if (!nextRow.id) return null; // row cannot be selected (happens when arrow key is kept pressed, and the row is not yet rendered), skip suggestion
                    if (!this.multiSelect) {
                        nextRow.setSelected(true, true);
                    }
                    suggestedNextCell.rowIndex = newIndex;
                }
                return suggestedNextCell;
            case KEY_UP:
                newIndex = previousCell.rowIndex - 1;
                nextRow = this.agGrid.api.getDisplayedRowAtIndex(newIndex);
                while (nextRow && (nextRow.group || nextRow.selected)) {
                    newIndex--;
                    nextRow = this.agGrid.api.getDisplayedRowAtIndex(newIndex);
                }

                // set selected cell on previous non-group row cells
                if (nextRow) {
                    if (!nextRow.id) return null; // row cannot be selected (happens when arrow key is kept pressed, and the row is not yet rendered), skip suggestion
                    if (!this.multiSelect) {
                        nextRow.setSelected(true, true);
                    }
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
        if (!this.enabled) return false;
        const suggestedNextCell = params.nextCellPosition;
        const isPinnedBottom = suggestedNextCell ? suggestedNextCell.rowPinned === 'bottom' : false;

        // don't change selection if row is pinned to the bottom (footer)
        if (suggestedNextCell && !isPinnedBottom) {
            let suggestedNextCellSelected = false;
            const selectedNodes = this.agGrid.api.getSelectedNodes();
            for (const selectedNode of selectedNodes) {
                if (suggestedNextCell.rowIndex === selectedNode.rowIndex) {
                    suggestedNextCellSelected = true;
                    break;
                }
            }

            if (!suggestedNextCellSelected) {
                this.selectionEvent = { type: 'key', event: params.event };
                this.agGrid.api.forEachNode((node) => {
                    if (suggestedNextCell.rowIndex === node.rowIndex) {
                        node.setSelected(true, true);
                    }
                });
            }
        }

        if (!suggestedNextCell) {
            this.setTimeout(() => {
                this.agGridElementRef.nativeElement.focus();
            }, 0);
        }

        return suggestedNextCell ? suggestedNextCell : false;
    }

    getIconElement(iconStyleClass: any): any {
        return '<i class="' + iconStyleClass + '"/>';
    }

    createJSEvent() {
        const element = this.agGridElementRef.nativeElement;
        const x = element.offsetLeft;
        const y = element.offsetTop;

        const event = this.doc.createEvent('MouseEvents');
        event.initMouseEvent('click', false, true, window, 1, x, y, x, y, false, false, false, false, 0, null);
        return event;
    }

    onRowSelectedHandler(event: any) {
        const node = event.node;

        if (this.onRowSelected && node && node.data) {
            // var selectIndex = node.rowIndex + 1; Selected index doesn't make sense for a dataset since the grid may change the dataset internally
            this.onRowSelected(node.data, node.selected, this.createJSEvent());
        }
    }

    onCellClicked(params: any) {
        const col = params.colDef.field ? this.getColumn(params.colDef.field) : null;
        if (col && col.editType === 'CHECKBOX' && params.colDef.editable && this.isColumnEditable(params)) {
            let v = parseInt(params.value, 10);
            if (isNaN(v)) v = 0;
            params.node.setDataValue(params.column.colId, v ? 0 : 1);
        }

        const rowData = params.data || Object.assign(params.node.groupData, params.node.aggData);
        if (this.onCellClick && rowData) {
            this.onCellClick(rowData, params.colDef.colId !== undefined ? params.colDef.colId : params.colDef.field, params.value, params.event, this.getDataTarget(params.event));
        }
    }

    cellClickHandler(params: any) {
        if (this.enabled) {
            if (params.node.rowPinned) {
                if (params.node.rowPinned === 'bottom' && this.onFooterClick) {
                    const columnIndex = this.getColumnIndex(params.column.colId);
                    this.onFooterClick(columnIndex, params.event, this.getDataTarget(params.event));
                }
            } else if (this.onCellDoubleClick) {
                if (this.clickTimer) {
                    clearTimeout(this.clickTimer);
                    this.clickTimer = null;
                } else {
                    this.clickTimer = this.setTimeout(() => {
                        this.clickTimer = null;
                        this.onCellClicked(params);
                    }, 250);
                }
            } else {
                this.onCellClicked(params);
            }
        }
    }

    onCellDoubleClicked(params: any) {
        if (this.enabled) {
            // ignore dblclick handler while editing, because it is the
            // default trigger for start editing and/or can be used by the editor
            // like texteditor, for selection
            const currentEditCells = this.agGrid.api.getEditingCells();
            if (currentEditCells.length > 0) {
                return;
            }
            const rowData = params.data || Object.assign(params.node.groupData, params.node.aggData);
            if (this.onCellDoubleClick && rowData) {
                this.onCellDoubleClick(rowData, params.colDef.colId !== undefined ? params.colDef.colId : params.colDef.field, params.value, params.event, this.getDataTarget(params.event));
            }
        }
    }

    onCellContextMenu(params: any) {
        if (this.enabled) {
            const rowData = params.data || Object.assign(params.node.groupData, params.node.aggData);
            if (this.onCellRightClick && rowData) {
                this.onCellRightClick(rowData, params.colDef.colId !== undefined ? params.colDef.colId : params.colDef.field, params.value, params.event, this.getDataTarget(params.event));
            }
        }
    }

    /**
     * When Column Group Changes
     */
    onColumnRowGroupChanged(event: any) {
        const rowGroupCols = this.agGrid && this.agGrid.api ? this.agGrid.api.getRowGroupColumns() : null;
        const columns: any = rowGroupCols ? rowGroupCols : [];
        const groupFields = [];
        let levelToRemove = null;

        let i = 0;
        for (const column of columns) {
            // cache order of grouped fields
            const field = column.colDef.field;
            groupFields.push(field);

            // TODO i am sure this run always before the onRowGroupOpen ?
            // Remove the grouped fields
            if (this.state.expanded.fields[i] && this.state.expanded.fields[i] !== field) {
                if (levelToRemove === null || levelToRemove === undefined) levelToRemove = i;
            }
            i++;
        }

        // clear expanded node if grouped columns change
        this.removeRowExpandedStateAtLevel(levelToRemove);

        // cache order of grouped fields
        this.state.expanded.fields = groupFields;
    }

    /**
     * remove state of expanded nodes from level
     * see onRowGroupChanged
     *
     * @param level
     *
     */
    removeRowExpandedStateAtLevel(level: any) {
        if (level === null || level === undefined) {
            return;
        }
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

    onRowGroupOpenedHandler(event: any) {
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
    }

    getColumn(colId: any, columnsModel?: any): any {
        if (this.columns) {
            for (const column of this.columns) {
                if (column['id'] === colId || column['dataprovider'] === colId) {
                    return column;
                }
            }
        }
        return null;
    }

    getColumnIndex(colId: any): number {
        if (this.columns) {
            let i = 0;
            for (const column of this.columns) {
                if (column['id'] === colId || column['dataprovider'] === colId) {
                    return i;
                }
                i++;
            }
        }
        return -1;
    }

    getColumnFormat(colId: any): any {
        const column = this.getColumn(colId);
        if (column && column.format) {
            return column.format;
        }
        return null;
    }

    getEditingRowIndex(param: any): number {
        return param.node.rowIndex;
    }

    isInFindMode(): boolean {
        return false;
    }

    /**
     * add expanded node to cache
     * see onRowGroupOpened
     *
     * @param groupKeys
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
     * remove expanded node state from cache
     * see onRowGroupOpened
     *
     * @param groupKeys
     *
     */
    removeRowExpandedState(groupKeys: any) {

        if (!this._internalExpandedState || !groupKeys || !groupKeys.length) {
            return;
        }

        // search for the sub-group node if groupKeys with multiple levels
        let node = this._internalExpandedState;
        for (let i = 0; i < groupKeys.length - 1; i++) {
            let key = groupKeys[i];
            node = node[key];

            if (!node) {
                return;
            }
        }

        // remove the node
        delete node[groupKeys[groupKeys.length - 1]];

        this._internalExpandedStateChange.emit(this._internalExpandedState);
    }

    updateColumnDefs() {
        if (this.agGrid) {
            // need to clear/remove old columns first, else the id for
            // the new columns will have the counter at the end (ex. "myid_1")
            // and that will broke our getColumn()
            this.agGrid.api.setGridOption('columnDefs', [])

            // make sure custom agg functions are added before setting the column defs, as the aggs may already
            // been referenced in the columns
            if (this._internalAggCustomFuncs) {
                this.agGrid.api.addAggFuncs(this.getAggCustomFuncs());
            }
            this.agGrid.api.setGridOption('columnDefs', this.getColumnDefs())
        }
    }

    handleColumnHeader(index: any, property: any, newValue: any) {
        this.log.debug('header column property changed');

        // column id is either the id of the column
        const column = this.columns[index];
        let colId = column.id;
        if (!colId) {
            colId = column['dataprovider'];
        }

        if (!colId) {
            this.log.warn('cannot update header for column at position index ' + index);
            return;
        }
        this.updateColumnHeader(colId, property, newValue);
    }

    updateColumnHeader(id: any, property: any, text: any) {
        // get a reference to the column
        const col = this.agGrid.api.getColumn(id);

        // obtain the column definition from the column
        const colDef = col.getColDef();

        // update the header
        colDef[property] = text;

        // the column is now updated. to reflect the header change, get the grid refresh the header
        this.agGrid.api.refreshHeader();
        this.sizeHeader();
    }

    handleColumnFooterText() {
        this.log.debug('footer text column property changed');
        this.agGrid.api.setGridOption('pinnedBottomRowData', this.getFooterData())

    }

    getFooterData() {
        const result = [];
        let hasFooterData = false;
        const resultData = {};
        for (let i = 0; this.columns && i < this.columns.length; i++) {
            const column = this.columns[i];
            if (column.dataprovider) {
            	if (column.footerText) {
                	resultData[column.dataprovider] = column.footerText;
                	hasFooterData = true;
            	} else {
					resultData[column.dataprovider] = '';
				}
			}
        }
        if (hasFooterData) {
            result.push(resultData);
        }
        return result;
    }

    /**
     * Update header height based on cells content height
     */
    sizeHeader() {
        const headerCell = this.findChildrenNativeElements(this.agGridElementRef.nativeElement, 'ag-header-cell');
        const paddingTop = headerCell.length ? parseInt(this.getCSSProperty(headerCell[0], 'padding-top'), 10) : 0;
        const paddinBottom = headerCell.length ? parseInt(this.getCSSProperty(headerCell[0], 'padding-bottom'), 10) : 0;
        const headerCellLabels = this.findChildrenNativeElements(this.agGridElementRef.nativeElement, 'ag-header-cell-text');
        let minHeight = this.agGridOptions.headerHeight >= 0 ? this.agGridOptions.headerHeight : 25;

        if (minHeight > 0) {
            for (const label of headerCellLabels) {
                let labelScrollHeight = label.scrollWidth ? label.scrollHeight : 0;
                minHeight = Math.max(minHeight, labelScrollHeight + paddingTop + paddinBottom);
            }
        }
        this.agGrid.api.setGridOption('headerHeight', minHeight);
    }

    findChildrenNativeElements(el: any, className: any) {
        const childrenNativeElements: any = [];
        this._findChildrenNativeElements(el, className, childrenNativeElements);
        return childrenNativeElements;
    }

    _findChildrenNativeElements(el: any, className: any, childrenNativeElements: any) {
        const clazz = el.hasAttribute && el.hasAttribute('class') ? el.getAttribute('class') : null;
        if (clazz == null) return;
        const idx = clazz.indexOf(className);
        if (idx !== -1 && ((idx + className.length === clazz.length) || clazz[idx + className.length] === ' ')) {
            childrenNativeElements.push(el);
        }

        for (const childNode of el.childNodes) {
            this._findChildrenNativeElements(childNode, className, childrenNativeElements);
        }
    }

    getCSSProperty(el: any, cssProperty: any) {
        const style = window.getComputedStyle(el);
        return style.getPropertyValue(cssProperty);
    }

    createValueFormatter(format: any): any {
        const _this: PowerGrid = this;
        return (params: any) => {
            if (params.value !== undefined && params.value !== null) {
                let v = params.value;
                if (v.displayValue !== undefined) v = v.displayValue;
                return _this.format(v, format, false);
            }
            return '';
        };
    }

    createColumnCallbackFunctionFromString(func: (rowIndex: number, data: any, colDef: string, value: any, params: any) => string) {
        return (params: any) => func(params.node.rowIndex, params.data, params.colDef.colId !== undefined ? params.colDef.colId : params.colDef.field, params.value, params);
    }

    createPivotComparatorCallbackFunctionFromString(func: (valueA: string, valueB: string) => number) {
        return (valueA: string, valueB: string) => func(valueA, valueB);
    }

    createColumnValueGetterCallbackFunctionFromString(func: (rowIndex: number, data: any, colDef: string, params: any) => string) {
        return (params: any) => func(params.node.rowIndex, params.data, params.colDef.colId !== undefined ? params.colDef.colId : params.colDef.field, params);
    }

    createAggCustomFunctionFromString(func: (values: unknown[]) => number) {
        return (values: any[]) => func(values);
    }

    getDefaultCellRenderer(column: any) {
        return (params: any) => {
            if (column.editType === 'CHECKBOX' && !params.node.group) {
                const checkboxEl = this.doc.createElement('i');
                checkboxEl.className = this.getIconCheckboxEditor(parseInt(params.value, 10));
                return checkboxEl;
            }

            let value = params.value != null ? params.value : '';
            const valueFormatted = params.valueFormatted != null ? params.valueFormatted : value && value.displayValue !== undefined ? value.displayValue : value;

            let returnValueFormatted = false;
            if (column != null && column.showAs === 'html') {
                value = value && value.displayValue !== undefined ? value.displayValue : value;
            } else if (column != null && column.showAs === 'sanitizedHtml') {
                value = this.sanitizer.sanitize(SecurityContext.HTML, value && value.displayValue !== undefined ? value.displayValue : value);
            } else if (value && value.contentType && value.contentType.indexOf('image/') === 0 && value.url) {
                value = '<img class="ag-table-image-cell" src="' + value.url + '">';
            } else {
                returnValueFormatted = true;
            }

            return returnValueFormatted ? this.doc.createTextNode(valueFormatted) : value;
        };
    }

    getIconCheckboxEditor(state: any) {
        const checkboxEditorIconConfig = this.registrationService.powergridService.iconConfig ? this.mergeConfig(this.registrationService.powergridService.iconConfig, this.iconConfig) : this.iconConfig;

        if (state) {
            return checkboxEditorIconConfig && checkboxEditorIconConfig['iconEditorChecked'] && checkboxEditorIconConfig['iconEditorChecked'] !== 'glyphicon glyphicon-check' ?
                checkboxEditorIconConfig['iconEditorChecked'] : 'far fa-check-square';
        } else {
            return checkboxEditorIconConfig && checkboxEditorIconConfig['iconEditorUnchecked'] && checkboxEditorIconConfig['iconEditorUnchecked'] !== 'glyphicon glyphicon-unchecked' ?
                checkboxEditorIconConfig['iconEditorUnchecked'] : 'far fa-square';
        }
    }

    groupRowInnerRenderer(params: any) {
        let label = '<span class="ag-group-label">' + params.node.key + '</span>';
        if (params.node.aggData) {
            let needsSeparator = false;
            for (const agg in params.node.aggData) {
                if (params.node.aggData.hasOwnProperty(agg)) {
                    const column = params.api.getColumn(agg);
                    const columnText = column['aggFunc'] + '(' + column.getColDef().headerName + ')';
                    const value = params.node.aggData[agg];
                    if (column['aggFunc'] !== 'count' && column.getColDef().valueFormatter) {
                        // TODO
                        //value = column.getColDef().valueFormatter(value.value !== undefined ? value : {value });
                    }
                    if (needsSeparator) {
                        label += '<span class="ag-group-aggregate-separator">,</span>';
                    } else {
                        needsSeparator = true;
                    }
                    label += '<span class="ag-group-aggregate">' + columnText + ':</span><span class="ag-group-aggregate-value">'
                        + value + '</span>';
                }
            }
        }
        return label;
    }

    /**
     * Export data to excel format (xlsx)
     *
     * @param fileName
     * @param skipHeader
     * @param columnGroups
     * @param skipFooters
     * @param skipGroups
     * @param asCSV
     */
    exportData(fileName: any, skipHeader: any, columnGroups: any, skipFooters: any, skipGroups: any, asCSV: any) {
        // set defaults
        if (fileName === undefined) {
            fileName = 'export.xlsx';
        }
        if (skipHeader === undefined) {
            skipHeader = false;
        }
        if (columnGroups === undefined) {
            columnGroups = true;
        }
        if (skipFooters === undefined) {
            skipFooters = false;
        }
        if (skipGroups === undefined) {
            skipGroups = false;
        }
        if (asCSV === undefined) {
            asCSV = false;
        }

        const params = {
            fileName,
            skipHeader,
            columnGroups,
            skipFooters,
            skipGroups,
            processCellCallback: (processCellParams: any) => {
                const columnModel = this.getColumn(processCellParams.column.colId);
                if (columnModel && columnModel.exportDisplayValue && processCellParams.column.colDef.valueFormatter) {
                    return processCellParams.column.colDef.valueFormatter({ value: processCellParams.value });
                } else {
                    return processCellParams.value;
                }
            }
        };
        if (asCSV) {
            this.agGrid.api.exportDataAsCsv(params);
        } else {
            this.agGrid.api.exportDataAsExcel(params);
        }
    }

    internalExportToDataset(): any {
        const exportData = [];
        const columnStates = this.agGrid.api.getColumnState();
        if (columnStates && columnStates.length) {
            const header = [];
            columnStates.forEach(columnState => {
                if (!columnState.hide) {
                    header.push(columnState.colId);
                }
            });
            if (header.length) {
                const colInfoCache = {};
                const headerNames = [];
                header.forEach(colId => {
                    colInfoCache[colId] = { columnModel: this.getColumn(colId), colDef: this.agGrid.api.getColumn(colId).getColDef() };
                    headerNames.push(colInfoCache[colId].colDef['headerName']);
                });
                exportData.push(headerNames);
                this.agGrid.api.forEachNodeAfterFilterAndSort((rowNode: IRowNode, index: number) => {
                    const row = [];
                    header.forEach(colId => {
                        const colInfo = colInfoCache[colId];
                        let value = rowNode.group ? rowNode.groupData[colInfo['colDef'].field] : rowNode.data[colInfo['colDef'].field];
                        if (colInfo['columnModel'] && colInfo['columnModel'].exportDisplayValue && colInfo['colDef'].valueFormatter) {
                            value = colInfo['colDef'].valueFormatter({ value });
                        }
                        row.push(value);
                    });
                    exportData.push(row);
                });
            }
        }
        return exportData;
    }

    /**
     *  Sets selected rows
     *
     *  @param Array<Number> rowIndexes (0-based)
     */
    setSelectedRows(rowIndexes: number[]) {
        this.agGrid.api.forEachNode((node) => {
            node.setSelected(rowIndexes.indexOf(node.rowIndex) !== -1);
        });
    }

    /**
     * Gets selected rows data
     */
    getSelectedRows(): any {
        const selectedNodes = this.agGrid.api.getSelectedNodes();
        // TODO return the selected Nodes as JSON;
        const result = [];
        for (const node of selectedNodes) {
            const selectedNode = node.data;
            result.push(selectedNode);
            //result.push({rowIndex:  selectedNodes[i].rowIndex, rowData: selectedNodes[i].data})
        }
        return result;
    }

    /**
     * Start cell editing (only works when the table is not in grouping mode).
     *
     * @param rowindex row index of the editing cell (0-based)
     * @param columnindex column index in the model of the editing cell (0-based)
     */
    editCellAt(rowindex: any, columnindex: any) {
        if (this.isTableGrouped()) {
            this.log.warn('editCellAt API is not supported in grouped mode');
        } else if (rowindex < 0) {
            this.log.warn('editCellAt API, invalid rowindex:' + rowindex);
        } else if (columnindex < 0 || columnindex > this.columns.length - 1) {
            this.log.warn('editCellAt API, invalid columnindex:' + columnindex);
        } else {
            const column = this.columns[columnindex];
            const colId = column['id'] ? column['id'] : column['dataprovider'];
            this.setTimeout(() => {
                this.agGrid.api.startEditingCell({
                    rowIndex: rowindex,
                    colKey: colId
                });
            }, 0);
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
     * Returns pivot mode state
     */
    isPivotMode(): boolean {
        return this.agGrid.api.isPivotMode();
    }

    /**
     * Move column
     *
     * @param id column id
     * @param index new position (0-based)
     */
    moveColumn(id: string, index: number) {
        this.agGrid.api.moveColumns([id], index);
    }

    /**
     * Sets expanded groups
     *
     * @param groups an object like {expandedGroupName1:{}, expandedGroupName2:{expandedSubGroupName2_1:{}, expandedSubGroupName2_2:{}}}
     */
    setExpandedGroups(groups: any) {
        this._internalExpandedState = groups;
        this._internalExpandedStateChange.emit(groups);
        if (this.isGridReady) {
            this.applyExpandedState();
        }
    }

    /**
     * Scroll viewport to matching row
     *
     * @param rowData rowData with at least on attribute, used to find the viewport row to scroll to
     */
    scrollToRow(rowData: any) {
        this.setTimeout(() => {
            const matchingRows = [];
            this.agGrid.api.forEachNode((node) => {
                for (const dp in rowData) {
                    if (!node.data || rowData[dp] !== node.data[dp]) {
                        return;
                    }
                }
                matchingRows.push(node.rowIndex);
            });
            if (matchingRows.length) {
                this.agGrid.api.ensureIndexVisible(matchingRows[0], 'middle');
            }
        }, 0);
    }

    /**
     *   Auto-sizes all columns based on content.
     */
    autoSizeAllColumns() {
        if (this.isGridReady && this.agGridOptions) {
            this.autoSizeColumns(false);
        }
    }

    autoSizeColumns(skipHeader: boolean) {
        const noFlexColumns = [];
        for (const col of this.agGrid.api.getAllDisplayedColumns()) {
            const colDef = col.getColDef();
            if (colDef['flex'] === undefined) {
                noFlexColumns.push(col);
            }
        }
        this.agGrid.api.autoSizeColumns(noFlexColumns, skipHeader);
    }

    /**
     *   Size columns to fit viewport.
     */
    sizeColumnsToFit() {
        if (this.isGridReady && this.agGridOptions) {
            this.agGrid.api.sizeColumnsToFit();
        }
    }

    onCellValueChanged(params: any) {
        const rowIndex = params.node.rowIndex;
        const colId = params.column.colId;

        // if we have an invalid cell data, ignore any updates for other cells
        if ((this.invalidCellDataIndex.rowIndex !== -1 && this.invalidCellDataIndex.rowIndex !== rowIndex)
            || (this.invalidCellDataIndex.colKey !== '' && this.invalidCellDataIndex.colKey !== colId)) {
            return;
        }

        let newValue = params.newValue;
        if (newValue && newValue.realValue !== undefined) {
            newValue = newValue.realValue;
        }
        let oldValue = params.oldValue;
        if (oldValue && oldValue.realValue !== undefined) {
            oldValue = oldValue.realValue;
        }
        let oldValueStr = oldValue;
        if (oldValueStr == null) oldValueStr = '';

        const col = this.getColumn(params.colDef.field);
        // ignore types in compare only for non null values ("200"/200 are equals, but ""/0 is not)
        let isValueChanged = newValue !== oldValueStr || (!newValue && newValue !== oldValueStr);
        if (isValueChanged && newValue instanceof Date && oldValue instanceof Date) {
            isValueChanged = newValue.toISOString() !== oldValue.toISOString();
        }
        if (isValueChanged && !this.useLazyLoading) {
            const dataAsCustomArray = this.data as ICustomArray<any>;
            dataAsCustomArray.getStateHolder().markAllChanged(false);
            this.dataChange.emit(this.data);
        }
        if (col && col['dataprovider'] && (isValueChanged || this.invalidCellDataIndex.rowIndex !== -1)) {
            if (this.onColumnDataChange && isValueChanged) {
                const currentEditCells = this.agGrid.api.getEditingCells();
                this.onColumnDataChangePromise = this.onColumnDataChange(
                    rowIndex,
                    this.getColumnIndex(params.column.colId),
                    oldValue,
                    newValue,
                    this.createJSEvent(),
                    params.data
                );
                this.onColumnDataChangePromise.then((r: any) => {
                    if (r === false) {
                        // if old value was reset, clear invalid state
                        const currentValue = this.agGrid.api.getCellValue({colKey: colId, rowNode: params.node});
                        if (oldValue === currentValue) {
                            this.invalidCellDataIndex.rowIndex = -1;
                            this.invalidCellDataIndex.colKey = '';
                        } else {
                            this.invalidCellDataIndex.rowIndex = rowIndex;
                            this.invalidCellDataIndex.colKey = colId;
                        }
                        const editCells = this.agGrid.api.getEditingCells();
                        if (!editCells.length || (editCells[0].rowIndex !== rowIndex || editCells[0].column.getColId() !== colId)) {
                            this.agGrid.api.stopEditing();
                            this.agGrid.api.startEditingCell({
                                rowIndex,
                                colKey: colId
                            });
                            this.setTimeout(() => {
                                this.agGrid.api.forEachNode((node) => {
                                    if (node.rowIndex === rowIndex) {
                                        node.setSelected(true, true);
                                    }
                                });
                            }, 0);
                        }
                    } else {
                        this.invalidCellDataIndex.rowIndex = -1;
                        this.invalidCellDataIndex.colKey = '';
                        const editCells = this.agGrid.api.getEditingCells();
                        if (editCells.length === 0 && currentEditCells.length !== 0) {
                            this.agGrid.api.startEditingCell({
                                rowIndex: currentEditCells[0].rowIndex,
                                colKey: currentEditCells[0].column.getColId()
                            });
                        }
                    }
                    this.onColumnDataChangePromise = null;
                }).catch((e: any) => {
                    this.log.error(e);
                    this.invalidCellDataIndex.rowIndex = -1;
                    this.invalidCellDataIndex.colKey = '';
                    this.onColumnDataChangePromise = null;
                });
            }
        }
    }

    public getNativeElement(): HTMLDivElement {
        return this.agGridElementRef ? this.agGridElementRef.nativeElement : null;
    }

    applySortModel(sortModel) {
        const columnState = [];
        if (sortModel) {
            sortModel.forEach((item, index) => {
                columnState.push({
                    colId: item.colId,
                    sort: item.sort,
                    sortIndex: index
                });
            });
        }
        this.agGrid.api.applyColumnState({ state: columnState, defaultState: { sort: null } });
    }

    gridDragOver($event) {
        const dragSupported = $event.dataTransfer.types.length && $event.dataTransfer.types[0] === 'nggrids/json';
        if (dragSupported) {
            this.handleDragViewportScroll($event);
            let dragOver: any = false;
            if (this.onDragOverFunc) {
                const overRow = this.getNodeForElement($event.target);
                let overRowData = null;
                if (overRow) {
                    overRowData = overRow.data || Object.assign(overRow.groupData, overRow.aggData);
                }
                dragOver = this.onDragOverFunc(this.registrationService.powergridService.getDragData(), overRowData, $event);
            } else {
                dragOver = true;
            }
            if (dragOver) {
                if(typeof dragOver === 'string') {
                    $event.dataTransfer.dropEffect = dragOver;
                } else {
                    $event.dataTransfer.dropEffect = 'copy';
                }
                $event.preventDefault();
            }
        }
    }

    gridDrop($event) {
        $event.preventDefault();
        this.cancelDragViewportScroll();
        if (this.onDrop) {
            const targetNode = this.getNodeForElement($event.target);
            const jsonData = $event.dataTransfer.getData('nggrids/json');
            const rowDatas = JSON.parse(jsonData);
            const overRowData = targetNode ? (targetNode.data || Object.assign(targetNode.groupData, targetNode.aggData)) : null;
            this.onDrop(rowDatas, overRowData, $event);
        }
    }

    getNodeForElement(element): any {
        const row = element.closest('[row-id]');
        return row ? this.agGrid.api.getRowNode(row.getAttribute('row-id')) : null;
    }
}

class State {
    expanded: ExpandedInfo = new ExpandedInfo();
}

class ExpandedInfo {
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

class RemoteDatasource {

    constructor(private powerGrid: PowerGrid) {
    }

    getRows(params: any) {
        this.powerGrid.data = [];
        this.powerGrid.lastRowIndex = null;
        if (this.powerGrid.onLazyLoadingGetRows) {
            const request = params.request;
            const filterModels = [];
            for (const id in request.filterModel) {
                if (request.filterModel.hasOwnProperty(id)) {
                    filterModels.push({ id, operator: request.filterModel[id].type, value: request.filterModel[id].filter });
                }
            }

            const getRowsPromise = this.powerGrid.onLazyLoadingGetRows(
                request.startRow,
                request.endRow,
                request.rowGroupCols,
                request.valueCols,
                request.pivotCols,
                request.pivotMode,
                request.groupKeys,
                filterModels,
                request.sortModel);
            getRowsPromise.then(() => {
                params.success({ rowData: this.powerGrid.data, rowCount: this.powerGrid.lastRowIndex });
            });
        } else {
	    params.success({ rowData: this.powerGrid.data, rowCount: this.powerGrid.lastRowIndex });
        }
    }
}

// this workaround to remove the () from around the child count is not working anymore, and there does not seem to be another way to do it
// class DatasetTableGroupCellRenderer extends GroupCellRenderer {

//     constructor() {
//         super();
//         this['updateChildCount'] = () => {
//             const allChildrenCount = this['displayedGroup'].allChildrenCount;
//             this['eChildCount'].innerHTML = allChildrenCount >= 0 ? '<span class="ag-group-child-count-prefix"></span>' + allChildrenCount
//                 + '<span class="ag-group-child-count-suffix"></span>' : '';
//         };
//     }
// }

export class PowerGridColumn extends BaseCustomObject {
    headerGroup: string;
    headerGroupStyleClass: string;
    headerTitle: string;
    headerStyleClass: string;
    headerIconStyleClass: string;
    headerTooltip: string;
    footerText: string;
    footerStyleClass: string;
    dataprovider: string;
    tooltip: string;
    styleClass: string;
    visible: boolean;
    excluded: boolean;
    width: number;
    initialWidth: number;
    minWidth: number;
    maxWidth: number;
    enableRowGroup: boolean;
    rowGroupIndex: number;
    enablePivot: boolean;
    pivotIndex: number;
    aggFunc: any;
    aggCustomFunc: any;
    enableSort: boolean;
    enableResize: boolean;
    enableToolPanel: boolean;
    autoResize: boolean;
    cellStyleClassFunc: any;
    cellRendererFunc: any;
    format: any;
    formatType: string;
    editType: string;
    editForm: any;
    editFormSize: any;
    filterType: string;
    id: string;
    columnDef: any;
    showAs: string;
    exportDisplayValue: boolean;
    pivotComparatorFunc: any;
    valueGetterFunc: any;
    dndSource: boolean;
    dndSourceFunc: any;
    valuelist: any
}

export class AggFuncInfo extends BaseCustomObject {
    name: string;
    aggFunc: (values: unknown[]) => number;
}
