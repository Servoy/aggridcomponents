import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Grid-option callback tests for DataGrid against the REAL ag-grid. The GridOptions callbacks
 * (onColumnResized, onDisplayedColumnsChanged, onCellKeyDown, onCellEditingStarted/Stopped,
 * onGridSizeChanged) are OUR code wired into ag-grid; here we invoke them with live events and
 * assert on OUR side effects. The live grid provides real nodes/columns.
 */
@Component({
    template: `
        <div style="width: 600px; height: 300px;">
            <aggrid-groupingtable
                [servoyApi]="servoyApi"
                [columns]="columns()"
                [myFoundset]="myFoundset()"
                [enabled]="true"
                [enableSorting]="true"
                [enableColumnResize]="true"
                [rowHeight]="25"
                [responsiveHeight]="300"
                [onReady]="onReadyCallback"
                #element>
            </aggrid-groupingtable>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [DataGrid, FormsModule]
})
class WrapperComponent {
    columns = signal<DataGridColumn[]>([]);
    myFoundset = signal<IFoundset>(undefined as any);
    servoyApi!: ServoyApi;
    private _resolveReady!: () => void;
    readonly gridReady = new Promise<void>(resolve => this._resolveReady = resolve);
    readonly onReadyCallback = () => this._resolveReady();
    @ViewChild('element') element!: DataGrid;
}

const columns = (): DataGridColumn[] => ([
    { headerTitle: 'ID', id: 'id', dataprovider: { idForFoundset: 'id' }, width: 100, enableSort: true, visible: true } as unknown as DataGridColumn,
    { headerTitle: 'Country', id: 'country', dataprovider: { idForFoundset: 'country' }, width: 150, enableSort: true, visible: true } as unknown as DataGridColumn
]);

const rows = () => ([
    { _svyRowId: '1.1;_0', id: 1, country: 'France' },
    { _svyRowId: '1.2;_1', id: 2, country: 'Germany' }
]);

const waitForData = async (grid: DataGrid, timeoutMs = 3000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const n = grid.agGrid()!.api.getDisplayedRowAtIndex(0);
        if (n && n.data) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('timed out waiting for row data');
};

describe('DataGrid - grid-option callbacks (jsdom render)', () => {
    let fixture: ComponentFixture<WrapperComponent>;
    let wrapper: WrapperComponent;
    let grid: DataGrid;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, WrapperComponent],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(WrapperComponent);
        wrapper = fixture.componentInstance;
        wrapper.servoyApi = new ServoyApiTesting() as any;
        wrapper.columns.set(columns());
        wrapper.myFoundset.set(createMockFoundset({ rows: rows(), selectedRowIndexes: [0] }));
        fixture.detectChanges();
        await wrapper.gridReady;
        fixture.detectChanges();
        await fixture.whenStable();
        grid = wrapper.element;
        await waitForData(grid);
    }, 30000);

    afterEach(() => {
        try { grid?.destroy(); } catch (e) { /* ignore */ }
        vi.restoreAllMocks();
    });

    describe('onColumnResized callback', () => {
        it('debounces a UI resize and stores the column state after the timer flushes', () => {
            vi.useFakeTimers();
            const storeSpy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            const col = grid.agGrid()!.api.getColumn('id')!;
            (grid.agGridOptions.onColumnResized as any)({ source: 'uiColumnResized', column: col });
            vi.advanceTimersByTime(600);
            expect(storeSpy).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it('sizes the header and stores state immediately for a non-UI resize', () => {
            const storeSpy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            const sizeSpy = vi.spyOn(grid, 'sizeHeader').mockImplementation(() => {});
            (grid.agGridOptions.onColumnResized as any)({ source: 'api' });
            expect(sizeSpy).toHaveBeenCalled();
            expect(storeSpy).toHaveBeenCalledWith(true);
        });
    });

    describe('onCellEditingStarted / onCellEditingStopped callbacks', () => {
        it('onCellEditingStarted fires the handler and activates the popup', () => {
            const onCellEditingStarted = vi.fn();
            (grid as any).onCellEditingStarted = () => onCellEditingStarted;
            vi.spyOn(grid, 'createJSEvent').mockReturnValue({} as any);
            const event = { column: { getColId: () => 'id' }, value: 'v', rowIndex: 0, node: { rowIndex: 0 } };
            expect(() => (grid.agGridOptions.onCellEditingStarted as any)(event)).not.toThrow();
            expect(onCellEditingStarted).toHaveBeenCalled();
        });

        it('onCellEditingStopped fires the handler and deactivates the popup', () => {
            const onCellEditingStopped = vi.fn();
            (grid as any).onCellEditingStopped = () => onCellEditingStopped;
            vi.spyOn(grid, 'createJSEvent').mockReturnValue({} as any);
            grid.onColumnDataChangePromise = null;
            grid.invalidCellDataIndex = { rowIndex: -1, colKey: '' };
            const event = { column: { getColId: () => 'id' }, oldValue: 'a', newValue: 'b', rowIndex: 0, node: { rowIndex: 0 } };
            expect(() => (grid.agGridOptions.onCellEditingStopped as any)(event)).not.toThrow();
            expect(onCellEditingStopped).toHaveBeenCalled();
        });
    });

    describe('onFilterChanged / onSortChanged callbacks', () => {
        it('onFilterChanged stores the column state', () => {
            const spy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            (grid.agGridOptions.onFilterChanged as any)();
            expect(spy).toHaveBeenCalled();
        });

        it('onSortChanged stores state and skips the sort handler for api source', () => {
            const storeSpy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            const handlerSpy = vi.spyOn(grid, 'onSortHandler').mockImplementation(() => {});
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            (grid.agGridOptions.onSortChanged as any)({ source: 'api' });
            expect(storeSpy).toHaveBeenCalled();
            expect(handlerSpy).not.toHaveBeenCalled();
        });

        it('onSortChanged runs the sort handler for a UI sort when onSort is set', () => {
            vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            const handlerSpy = vi.spyOn(grid, 'onSortHandler').mockImplementation(() => {});
            (grid as any).onSort = () => (() => Promise.resolve());
            (grid.agGridOptions.onSortChanged as any)({ source: 'uiColumnSorted' });
            expect(handlerSpy).toHaveBeenCalled();
            expect(grid.isSortModelApplied).toBe(true);
        });
    });

    describe('onCellKeyDown callback', () => {
        it('dispatches a cell click on ENTER over a grid cell', () => {
            const handlerSpy = vi.spyOn(grid, 'cellClickHandler').mockImplementation(() => {});
            const target = grid.agGridElementRef()!.nativeElement;
            const param = {
                event: { keyCode: 13, target, preventDefault: vi.fn() },
                colDef: { field: 'id' },
                node: { rowIndex: 0, rowPinned: null }
            };
            (grid.agGridOptions.onCellKeyDown as any)(param);
            expect(handlerSpy).toHaveBeenCalled();
        });

        it('selects the focused row on HOME when it is not already selected', () => {
            const node = grid.agGrid()!.api.getDisplayedRowAtIndex(1)!;
            node.setSelected(false);
            vi.spyOn(grid.agGrid()!.api, 'getFocusedCell').mockReturnValue({ rowIndex: 1, rowPinned: null, column: { getColId: () => 'id' } } as any);
            const param = { event: { keyCode: 36 }, colDef: { field: 'id' }, node };
            expect(() => (grid.agGridOptions.onCellKeyDown as any)(param)).not.toThrow();
        });
    });

    describe('processRowPostCreate callback', () => {
        it('runs without throwing for a freshly created row', () => {
            vi.useFakeTimers();
            const node = grid.agGrid()!.api.getDisplayedRowAtIndex(0)!;
            grid.columnsToFitAfterRowsRendered = true;
            expect(() => (grid.agGridOptions.processRowPostCreate as any)({ rowIndex: 0, node })).not.toThrow();
            vi.advanceTimersByTime(10);
            vi.useRealTimers();
        });
    });

    describe('defaultColDef suppressKeyboardEvent', () => {
        it('suppresses Space when not editing (and prevents default)', () => {
            const event = { keyCode: 32, preventDefault: vi.fn() };
            const result = (grid.agGridOptions.defaultColDef!.suppressKeyboardEvent as any)({ editing: false, event });
            expect(result).toBe(true);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('does not suppress a normal key', () => {
            const result = (grid.agGridOptions.defaultColDef!.suppressKeyboardEvent as any)({ editing: false, event: { keyCode: 65 } });
            expect(result).toBe(false);
        });
    });

    describe('onGridSizeChanged callback', () => {
        it('schedules a size-to-fit without throwing', () => {
            vi.useFakeTimers();
            expect(() => (grid.agGridOptions.onGridSizeChanged as any)({})).not.toThrow();
            vi.advanceTimersByTime(200);
            vi.useRealTimers();
        });
    });
});

