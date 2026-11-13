import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Cell-event dispatch coverage for DataGrid against the REAL ag-grid. OUR onCellClicked /
 * onCellDoubleClickedEx / onCellContextMenu / onSortHandler assemble the server 'cellClick' calls
 * and sort handler promises; we drive them with live nodes and assert on the stubbed
 * callServerSideApi / onSort side effects (ag-grid is a dependency, not under test).
 */
@Component({
    template: `
        <div style="width: 600px; height: 300px;">
            <aggrid-groupingtable
                [servoyApi]="servoyApi"
                [columns]="columns()"
                [myFoundset]="myFoundset()"
                [enabled]="true"
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

describe('DataGrid - cell event dispatch (jsdom render)', () => {
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
        if (grid) (grid as any).destroyed = true;
        vi.restoreAllMocks();
    });

    function clickParams(idx = 0) {
        const node = grid.agGrid()!.api.getDisplayedRowAtIndex(idx)!;
        return {
            node, data: node.data, colDef: { field: 'id', colId: 'id' }, column: { colId: 'id' },
            value: node.data.id, event: { target: { closest: () => null }, type: 'click' }
        };
    }

    describe('onCellClicked', () => {
        it('dispatches a cellClick server call immediately when no timeout is given', () => {
            const spy = vi.spyOn(grid.servoyApi(), 'callServerSideApi').mockResolvedValue(undefined as any);
            grid.onCellClicked(clickParams(0) as any, {} as any);
            expect(spy).toHaveBeenCalledWith('cellClick', expect.arrayContaining(['click']));
        });

        it('defers the cellClick server call when a timeout is given', () => {
            vi.useFakeTimers();
            const spy = vi.spyOn(grid.servoyApi(), 'callServerSideApi').mockResolvedValue(undefined as any);
            grid.onCellClicked(clickParams(0) as any, {} as any, 100);
            expect(spy).not.toHaveBeenCalled();
            vi.advanceTimersByTime(100);
            expect(spy).toHaveBeenCalled();
            vi.useRealTimers();
        });
    });

    describe('onCellDoubleClickedEx', () => {
        it('dispatches a doubleClick server call for a non-pinned row', () => {
            const spy = vi.spyOn(grid.servoyApi(), 'callServerSideApi').mockResolvedValue(undefined as any);
            grid.onCellDoubleClickedEx(clickParams(0) as any, {} as any);
            expect(spy).toHaveBeenCalledWith('cellClick', expect.arrayContaining(['doubleClick']));
        });

        it('does nothing for a pinned row', () => {
            const spy = vi.spyOn(grid.servoyApi(), 'callServerSideApi').mockResolvedValue(undefined as any);
            const params = clickParams(0) as any;
            params.node = { rowPinned: 'bottom' };
            grid.onCellDoubleClickedEx(params, {} as any);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('onCellContextMenu', () => {
        it('selects the row and dispatches a rightClick server call (deferred)', () => {
            vi.useFakeTimers();
            vi.spyOn((grid as any).servoyService, 'createJSEvent').mockReturnValue({} as any);
            const spy = vi.spyOn(grid.servoyApi(), 'callServerSideApi').mockResolvedValue(undefined as any);
            const node = grid.agGrid()!.api.getDisplayedRowAtIndex(1)!;
            node.setSelected(false);
            const params = {
                node, data: node.data, colDef: { field: 'id', colId: 'id' }, column: { colId: 'id' },
                value: 2, event: { target: { closest: () => null }, type: 'contextmenu' }
            };
            grid.onCellContextMenu(params as any);
            vi.advanceTimersByTime(400);
            expect(spy).toHaveBeenCalledWith('cellClick', expect.arrayContaining(['rightClick']));
            vi.useRealTimers();
        });
    });

    describe('onSortHandler', () => {
        it('refreshes the datasource, calls onSort and queues a sort handler promise', async () => {
            const sortPromise = Promise.resolve([]);
            (grid as any).onSort = () => vi.fn().mockReturnValue(sortPromise);
            vi.spyOn(grid, 'refreshDatasource').mockImplementation(() => {});
            vi.spyOn(grid, 'getAgGridSortModel').mockReturnValue([{ colId: 'id', sort: 'asc', sortIndex: 0 }] as any);
            grid.sortHandlerPromises = [];
            grid.onSortHandler();
            expect(grid.sortHandlerPromises.length).toBe(1);
            await sortPromise;
            await Promise.resolve();
            // once resolved, the promise is removed from the queue
            expect(grid.sortHandlerPromises.length).toBe(0);
        });
    });

    describe('onCellFocusedHandler', () => {
        it('fires onCellFocusGained with the foundset index, column index and record', () => {
            const onCellFocusGained = vi.fn();
            (grid as any).onCellFocusGained = () => onCellFocusGained;
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            vi.spyOn(grid, 'getRecord').mockReturnValue({ _svyRowId: '1.1;_0' } as any);
            grid.onCellFocusedHandler({ rowIndex: 0, column: { colId: 'id' }, value: 1, event: {} });
            expect(onCellFocusGained).toHaveBeenCalled();
            expect(onCellFocusGained.mock.calls[0][0]).toBe(1); // foundsetIndex = rowIndex + 1
            expect(onCellFocusGained.mock.calls[0][1]).toBe(0); // column index
        });
    });
});

