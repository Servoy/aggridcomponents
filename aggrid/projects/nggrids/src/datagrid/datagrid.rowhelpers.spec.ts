import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Extra DataGrid branch coverage against the REAL ag-grid. These exercise OUR per-row helpers that
 * read dataprovider arrays off the column model (tooltip, dnd source, row-drag text), the
 * cellRenderer group-column branch, the valuelist display value getter/formatter and updateRow.
 * ag-grid is a dependency (not under test); the mock foundset supplies the data our datasource serves.
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
    { headerTitle: 'ID', id: 'id', dataprovider: { idForFoundset: 'id' }, width: 100, enableSort: true, visible: true,
      tooltip: ['t0', 't1', 't2'], dndSourceDataprovider: [true, false, true], rowDragText: ['drag0', 'drag1', 'drag2'] } as unknown as DataGridColumn,
    { headerTitle: 'Country', id: 'country', dataprovider: { idForFoundset: 'country' }, width: 150, enableSort: true, visible: true } as unknown as DataGridColumn
]);

const rows = () => ([
    { _svyRowId: '1.1;_0', id: 1, country: 'France' },
    { _svyRowId: '1.2;_1', id: 2, country: 'Germany' },
    { _svyRowId: '1.3;_2', id: 3, country: 'Brazil' }
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

describe('DataGrid - per-row helper branches (jsdom render)', () => {
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

    function node(idx: number) {
        return grid.agGrid()!.api.getDisplayedRowAtIndex(idx)!;
    }

    describe('getTooltip', () => {
        it('reads the per-row tooltip dataprovider for a non-grouped grid', () => {
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            const params = { node: node(1), colDef: { field: 'id' } };
            expect(grid.getTooltip(params)).toBe('t1');
        });

        it('returns empty string for a pinned row', () => {
            const params = { node: { rowPinned: 'bottom' }, colDef: { field: 'id' } };
            expect(grid.getTooltip(params)).toBe('');
        });

        it('returns empty string when the column has no tooltip array', () => {
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            const params = { node: node(0), colDef: { field: 'country' } };
            expect(grid.getTooltip(params)).toBe('');
        });
    });

    describe('onRowDrag', () => {
        it('returns the per-row dnd source flag', () => {
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            expect(grid.onRowDrag({ node: node(0), colDef: { field: 'id' } } as any)).toBe(true);
            expect(grid.onRowDrag({ node: node(1), colDef: { field: 'id' } } as any)).toBe(false);
        });

        it('returns false for a column without a dnd source dataprovider', () => {
            expect(grid.onRowDrag({ node: node(0), colDef: { field: 'country' } } as any)).toBe(false);
        });
    });

    describe('getRowDragText', () => {
        it('reads the per-row drag text', () => {
            const dragItem = { columns: [{ getColDef: () => ({ field: 'id' }) }], rowNode: node(2), defaultTextValue: 'def' };
            expect(grid.getRowDragText(dragItem as any)).toBe('drag2');
        });

        it('falls back to the default text when the column has none', () => {
            const dragItem = { columns: [{ getColDef: () => ({ field: 'country' }) }], rowNode: node(0), defaultTextValue: 'def' };
            expect(grid.getRowDragText(dragItem as any)).toBe('def');
        });
    });

    describe('cellRenderer group column branch', () => {
        it('renders an auto-group column cell without throwing', () => {
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(true);
            (grid as any).doc = document;
            const params = {
                colDef: { colId: 'ag-Grid-AutoColumn-id' },
                column: { colId: 'ag-Grid-AutoColumn-id' },
                node: { group: true, rowPinned: null },
                value: 'FR',
                valueFormatted: 'FR'
            };
            expect(() => grid.cellRenderer(params)).not.toThrow();
        });
    });

    describe('displayValueGetter / displayValueFormatter with a valuelist column', () => {
        beforeEach(() => {
            wrapper.columns.set([
                { headerTitle: 'ID', id: 'id', dataprovider: { idForFoundset: 'id' }, visible: true,
                  valuelist: [{ realValue: 1, displayValue: 'One' }], format: { display: 'x' } } as unknown as DataGridColumn
            ]);
            fixture.detectChanges();
            grid.state.columns = {};
        });

        it('formats a plain value through the grid in the value getter when the column has a valuelist+format', () => {
            vi.spyOn(grid, 'format').mockReturnValue('FMT');
            const params = {
                colDef: { field: 'id' }, column: { colId: 'id' },
                data: { id: 5 }, node: { rowPinned: null }, context: { componentParent: grid }
            };
            expect(grid.displayValueGetter(params)).toBe('FMT');
        });

        it('does not format a valuelist-linked value in the formatter (always text)', () => {
            vi.spyOn(grid, 'format').mockReturnValue('FMT');
            const params = {
                colDef: { field: 'id' }, column: { colId: 'id' },
                data: { id: 5 }, value: 5, node: { rowPinned: null }, context: { componentParent: grid }
            };
            // column has a valuelist, so the formatter leaves the value unformatted
            expect(grid.displayValueFormatter(params)).toBe(5);
        });
    });

    describe('updateRow', () => {
        it('applies a changed row to the live node', () => {
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            const mgr = grid.foundset;
            // change the underlying foundset data so updateRow detects a change
            mgr.foundset.viewPort.rows[0] = { _svyRowId: '1.1;_0', id: 1, country: 'Spain' } as any;
            expect(() => grid.updateRow(0, mgr)).not.toThrow();
        });

        it('warns when there is no row at the given index', () => {
            const spy = vi.fn();
            Object.defineProperty(grid.log, 'warn', { configurable: true, get: () => spy });
            const emptyMgr = { getViewPortData: () => [] } as any;
            grid.updateRow(0, emptyMgr);
            expect(spy).toHaveBeenCalled();
        });
    });
});
