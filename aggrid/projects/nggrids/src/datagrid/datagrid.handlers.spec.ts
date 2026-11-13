import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Interactive-handler render tests for DataGrid. The REAL ag-grid is booted (it is a dependency,
 * not the unit under test) so OUR cell/tooltip/renderer/handler code runs against live nodes and
 * a live api. The mock foundset supplies the data our FoundsetDatasource serves. Assertions are
 * on OUR handler side-effects (callbacks invoked, state updated) not on ag-grid internals.
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
    { headerTitle: 'ID', id: 'id', dataprovider: { idForFoundset: 'id' }, width: 100, enableSort: true, visible: true, tooltip: ['tip-a', 'tip-b', 'tip-c'] } as unknown as DataGridColumn,
    { headerTitle: 'Country', id: 'country', dataprovider: { idForFoundset: 'country' }, width: 150, enableSort: true, visible: true, showAs: 'html', styleClassDataprovider: ['hot', '', ''] } as unknown as DataGridColumn
]);

const rows = () => ([
    { _svyRowId: '1.1;_0', id: 1, country: '<b>France</b>' },
    { _svyRowId: '1.2;_1', id: 2, country: 'Germany' },
    { _svyRowId: '1.3;_2', id: 3, country: 'Brazil' }
]);

const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 3000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('timed out waiting for ' + what);
};

describe('DataGrid - interactive handlers (jsdom render)', () => {
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
        // wait until the server-side datasource has actually delivered row DATA (not just a count)
        await waitFor(() => {
            const n = grid.agGrid()!.api.getDisplayedRowAtIndex(0);
            return !!(n && n.data);
        }, 'row data to load');
    }, 30000);

    afterEach(() => {
        try { grid?.destroy(); } catch (e) { /* ignore */ }
        vi.restoreAllMocks();
    });

    function nodeParams(rowIndex: number, field: string) {
        const node = grid.agGrid()!.api.getDisplayedRowAtIndex(rowIndex)!;
        const column: any = { colId: field, getColId: () => field, getColDef: () => ({ field }) };
        return {
            node,
            data: node.data,
            value: node.data[field],
            valueFormatted: String(node.data[field]),
            colDef: { field, colId: field },
            column,
            event: { target: { closest: () => null }, type: 'click' },
            rowIndex,
            api: grid.agGrid()!.api,
            context: { componentParent: grid }
        };
    }

    it('getTooltip reads the per-row tooltip dataprovider', () => {
        const params = nodeParams(0, 'id');
        expect(grid.getTooltip(params)).toBe('tip-a');
    });

    it('getTooltip returns empty for a pinned row', () => {
        const params = nodeParams(0, 'id');
        params.node.rowPinned = 'bottom' as any;
        expect(grid.getTooltip(params)).toBe('');
    });

    it('cellRenderer wraps the cell content in its styleClass div for the first row', () => {
        const params = nodeParams(0, 'country');
        const result = grid.cellRenderer(params);
        // first row has a styleClassDataprovider ("hot"), so the content is wrapped in a div
        expect(result.className).toBe('hot');
    });

    it('cellRenderer returns a value for a plain cell without throwing', () => {
        const params = nodeParams(1, 'id');
        expect(() => grid.cellRenderer(params)).not.toThrow();
    });

    it('getCellClass resolves classes for a live column', () => {
        const cls = grid.getCellClass(nodeParams(0, 'id'));
        expect(cls).toContain('ag-table-cell');
    });

    it('displayValueGetter / displayValueFormatter run against a live node', () => {
        const params = nodeParams(0, 'id');
        // the default value getter/formatter are bound on agGridOptions.defaultColDef
        const getter = grid.agGridOptions.defaultColDef!.valueGetter as any;
        expect(() => getter(params)).not.toThrow();
    });

    it('getFoundsetIndexFromEvent returns the 1-based foundset index', () => {
        expect(grid.getFoundsetIndexFromEvent(nodeParams(1, 'id'))).toBe(2);
    });

    it('cellClickHandler fires the onCellClick handler through the live grid', async () => {
        // call the handler directly with a live node; it dispatches via callServerSideApi
        const spy = vi.spyOn(grid.servoyApi(), 'callServerSideApi').mockResolvedValue(undefined);
        grid.cellClickHandler(nodeParams(0, 'id'));
        await new Promise(resolve => setTimeout(resolve, 400));
        expect(spy).toHaveBeenCalledWith('cellClick', expect.arrayContaining(['click']));
    });

    it('isColumnEditable returns a boolean for a live editable check', () => {
        const params = nodeParams(0, 'id');
        const result = grid.isColumnEditable({ ...params, context: { componentParent: grid } });
        expect(typeof result).toBe('boolean');
    });

    it('scrollToSelection does not throw against the live grid', () => {
        expect(() => grid.scrollToSelectionEx()).not.toThrow();
    });

    it('updateColumnDefs refreshes the live grid columns', () => {
        expect(() => grid.updateColumnDefs()).not.toThrow();
        expect(grid.getColumnDefs().length).toBeGreaterThanOrEqual(2);
    });

    it('refreshDatasource reinstalls the server-side datasource', () => {
        expect(() => grid.refreshDatasource()).not.toThrow();
    });

    it('purge refreshes without throwing', () => {
        expect(() => grid.purgeImpl()).not.toThrow();
    });

    it('getValuelistEx returns null for a column without a valuelist', () => {
        const node = grid.agGrid()!.api.getDisplayedRowAtIndex(0)!;
        // 'id' column has no valuelist configured, so the lookup resolves to null
        expect(grid.getValuelistEx(node.data, 'id')).toBeNull();
    });
});


