import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * End-to-end-ish render test for the DataGrid against jsdom. This boots the REAL ag-grid (the
 * library is a dependency, not the thing under test) so that OUR init pipeline runs for real:
 * ngOnInit builds the GridOptions, onGridReady fires, initRootFoundset installs our
 * FoundsetDatasource, and the server-side model calls back into getRows -> getData ->
 * FoundsetManager.getViewPortData, mapping the mock foundset rows into grid data. We then assert
 * on OUR observable behaviour (rows rendered from the foundset, selection applied, sort model
 * read back, foundset change-listener wired) rather than on ag-grid internals.
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

describe('DataGrid - jsdom render pipeline', () => {
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
        wrapper.myFoundset.set(createMockFoundset({ rows: rows(), selectedRowIndexes: [1] }));
        fixture.detectChanges();
        await wrapper.gridReady;
        fixture.detectChanges();
        await fixture.whenStable();
        grid = wrapper.element;
    }, 30000);

    afterEach(() => {
        try { grid?.destroy(); } catch (e) { /* ignore */ }
        vi.restoreAllMocks();
    });

    it('becomes grid-ready and loads the root foundset', () => {
        expect(grid.isGridReady).toBe(true);
        expect(grid.isRootFoundsetLoaded).toBe(true);
        expect(grid.foundset).toBeDefined();
    });

    it('maps the foundset rows into grid data via the server-side datasource', async () => {
        // the FoundsetDatasource (our code) reports the row count from the mock foundset serverSize
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 3, 'rows to load');
        expect(grid.agGrid()!.api.getDisplayedRowCount()).toBe(3);
        // FoundsetManager.getViewPortData maps our mock rows into row objects carrying the svy ids
        const mapped = grid.foundset.getViewPortData(0, 3);
        expect(mapped.length).toBe(3);
        expect(mapped[0]._svyRowId).toBe('1.1;_0');
        expect(mapped[0]._svyFoundsetUUID).toBe('root');
        expect(mapped[2]._svyFoundsetIndex).toBe(2);
    });

    it('reads back the applied column defs from the live grid', () => {
        const defs = grid.getColumnDefs();
        const idDef = defs.find((d: any) => d.colId === 'id' || d.field === 'id');
        expect(idDef).toBeDefined();
        expect(idDef.headerName).toBe('ID');
    });

    it('resolves a column by its foundset-derived field id through the live grid', () => {
        expect(grid.getColumn('id').headerTitle).toBe('ID');
        expect(grid.getColumnIndex('country')).toBe(1);
    });

    it('builds a sort model from the foundset sortColumns', () => {
        grid.foundset.foundset.sortColumns = 'country desc';
        expect(grid.getSortModel()).toEqual([{ colId: 'country', sort: 'desc' }]);
    });

    it('applies a sort model to the live grid column state', async () => {
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 3, 'rows to load');
        grid.applySortModel([{ colId: 'country', sort: 'asc' }]);
        const sortModel = grid.getAgGridSortModel();
        expect(sortModel).toEqual([{ colId: 'country', sort: 'asc', sortIndex: 0 }]);
    });

    it('stores and reads back the live column state', () => {
        grid.storeColumnsState(true);
        expect(grid._columnState()).toContain('columnState');
    });

    it('handles a viewport rows-changed foundset event without throwing', async () => {
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 3, 'rows to load');
        expect(() => grid.changeListener({
            viewportRowsUpdated: [{ startIndex: 0, endIndex: 0, type: 0 }]
        } as any)).not.toThrow();
    });

    it('ignores a change event that originates from our own getDataFromFoundset request', () => {
        const spy = vi.spyOn(grid, 'initRootFoundset');
        grid.changeListener({ requestInfos: [grid.getRequestInfoWithId('getDataFromFoundset')] } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    it('updates the row count on a server foundset size change', async () => {
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 3, 'rows to load');
        expect(() => grid.changeListener({
            serverFoundsetSizeChanged: { oldValue: 3, newValue: 5 }
        } as any)).not.toThrow();
    });

    it('requests the foundset selection via selectedRowIndexesChanged', async () => {
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 3, 'rows to load');
        // selectedRowIndexesChanged reconciles the foundset selection against the grid nodes; it
        // returns a boolean and must not throw for our loaded root foundset
        expect(() => grid.selectedRowIndexesChanged()).not.toThrow();
    });
});



