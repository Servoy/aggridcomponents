import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Navigation / selection render tests for DataGrid. The REAL ag-grid is booted so OUR keyboard
 * navigation (navigateToNextCell / tabToNextCell), selection reconciliation and multi-select
 * handling run against live nodes. Assertions are on OUR returned suggestions and the foundset
 * selection requests we issue.
 */
@Component({
    template: `
        <div style="width: 600px; height: 300px;">
            <aggrid-groupingtable
                [servoyApi]="servoyApi"
                [columns]="columns()"
                [myFoundset]="myFoundset()"
                [enabled]="enabled()"
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
    enabled = signal<boolean>(true);
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
    { _svyRowId: '1.2;_1', id: 2, country: 'Germany' },
    { _svyRowId: '1.3;_2', id: 3, country: 'Brazil' },
    { _svyRowId: '1.4;_3', id: 4, country: 'USA' }
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

describe('DataGrid - navigation & selection (jsdom render)', () => {
    let fixture: ComponentFixture<WrapperComponent>;
    let wrapper: WrapperComponent;
    let grid: DataGrid;
    let foundset: IFoundset;

    async function boot(multiSelect = false) {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, WrapperComponent],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(WrapperComponent);
        wrapper = fixture.componentInstance;
        wrapper.servoyApi = new ServoyApiTesting() as any;
        wrapper.columns.set(columns());
        foundset = createMockFoundset({ rows: rows(), selectedRowIndexes: [0], multiSelect });
        wrapper.myFoundset.set(foundset);
        fixture.detectChanges();
        await wrapper.gridReady;
        fixture.detectChanges();
        await fixture.whenStable();
        grid = wrapper.element;
        await waitForData(grid);
    }

    beforeEach(async () => {
        await boot(false);
    }, 30000);

    afterEach(() => {
        try { grid?.destroy(); } catch (e) { /* ignore */ }
        vi.restoreAllMocks();
    });

    describe('keySelectionChangeNavigation', () => {
        it('returns undefined when the grid is disabled', () => {
            (grid as any).enabled = () => false;
            expect(grid.keySelectionChangeNavigation({ event: { keyCode: 40 }, previousCellPosition: { rowIndex: 0 }, nextCellPosition: { rowIndex: 0 } })).toBeUndefined();
        });

        it('suggests the next row down and selects it', () => {
            const params = { event: { keyCode: 40 }, previousCellPosition: { rowIndex: 0 }, nextCellPosition: { rowIndex: 0 } };
            const result = grid.keySelectionChangeNavigation(params);
            expect(result.rowIndex).toBe(1);
        });

        it('suggests the previous row up', () => {
            const params = { event: { keyCode: 38 }, previousCellPosition: { rowIndex: 2 }, nextCellPosition: { rowIndex: 2 } };
            const result = grid.keySelectionChangeNavigation(params);
            expect(result.rowIndex).toBe(1);
        });

        it('passes through left/right navigation unchanged', () => {
            const params = { event: { keyCode: 37 }, previousCellPosition: { rowIndex: 1 }, nextCellPosition: { rowIndex: 1, _m: true } };
            expect((grid.keySelectionChangeNavigation(params) as any)._m).toBe(true);
        });
    });

    describe('tabSelectionChangeNavigation', () => {
        it('returns false when disabled', () => {
            (grid as any).enabled = () => false;
            expect(grid.tabSelectionChangeNavigation({ nextCellPosition: { rowIndex: 0 } })).toBe(false);
        });

        it('selects the suggested next cell row and returns it', () => {
            const params = { nextCellPosition: { rowIndex: 1, rowPinned: null }, event: {} };
            const result = grid.tabSelectionChangeNavigation(params);
            expect(result).toBe(params.nextCellPosition);
        });

        it('returns false when there is no suggested next cell', () => {
            const result = grid.tabSelectionChangeNavigation({ nextCellPosition: null, backwards: false, event: {} });
            expect(result).toBe(false);
        });
    });

    describe('selectedRowIndexesChanged', () => {
        it('reconciles the grid selection against the foundset and returns a boolean', () => {
            const result = grid.selectedRowIndexesChanged();
            expect(typeof result).toBe('boolean');
        });

        it('returns false when the given foundset manager has no foundset', () => {
            expect(grid.selectedRowIndexesChanged({ foundset: null })).toBe(false);
        });
    });

    describe('onSelectionChangedEx single-select', () => {
        it('requests a foundset selection update from a user click', () => {
            const spy = vi.spyOn(foundset, 'requestSelectionUpdate');
            const node = grid.agGrid()!.api.getDisplayedRowAtIndex(2)!;
            node.setSelected(true);
            grid.onSelectionChangedEx({ type: 'click', event: {}, rowIndex: 2 }, { source: 'rowClicked' } as any);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('multi-select foundset', () => {
        it('requests a range selection on a shift-click', () => {
            // flip the already-loaded root foundset to multi-select and mark rows selected in the grid
            grid.foundset.foundset.multiSelect = true;
            (grid.agGridOptions.rowSelection as any).mode = 'multiRow';
            const spy = vi.spyOn(grid.foundset.foundset, 'requestSelectionUpdate');
            for (const idx of [0, 2]) {
                const n = grid.agGrid()!.api.getDisplayedRowAtIndex(idx)!;
                n.setSelected(true);
            }
            grid.onSelectionChangedEx({ type: 'click', event: { shiftKey: true }, rowIndex: 2 }, { source: 'rowClicked' } as any);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('onColumnRowGroupChanged', () => {
        it('records grouped columns in the component state', () => {
            const spy = vi.spyOn(grid.agGrid()!.api, 'getRowGroupColumns').mockReturnValue([
                { colId: 'country', colDef: { field: 'country' } } as any
            ]);
            grid.onColumnRowGroupChanged({});
            expect(grid.state.grouped.columns).toContain('country');
            spy.mockRestore();
        });
    });

    describe('onRowGroupOpenedHandler', () => {
        it('persists the expanded state for an opened group', () => {
            const emitSpy = vi.fn();
            grid._internalExpandedStateChange.subscribe(emitSpy);
            const node = {
                expanded: true,
                field: 'country',
                key: 'France',
                data: { country: 'France' },
                parent: { level: -1, group: false }
            };
            grid.onRowGroupOpenedHandler({ node });
            expect(emitSpy).toHaveBeenCalled();
        });
    });
});


