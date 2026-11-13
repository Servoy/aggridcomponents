import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { createPowerGridColumns, createPowerGridData } from '../testing/mock-data';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * jsdom render test for PowerGrid. Boots the REAL ag-grid so OUR init pipeline runs: ngOnInit
 * builds GridOptions from the dataset columns, onGridReady fires, and the client-side rowData
 * (mapped from our mock dataset) is loaded. We assert on OUR behaviour (column defs, data
 * mapping, header/footer data, sizing helpers, selection API) not on ag-grid internals.
 */
@Component({
    template: `
        <div style="width: 600px; height: 300px;">
            <aggrid-datasettable
                [servoyApi]="servoyApi"
                [columns]="columns()"
                [data]="data()"
                [enabled]="true"
                [enableSorting]="true"
                [enableColumnResize]="true"
                [rowHeight]="25"
                [headerHeight]="33"
                [multiSelect]="multiSelect()"
                [responsiveHeight]="300"
                [onReady]="onReadyCallback"
                #element>
            </aggrid-datasettable>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [PowerGrid, FormsModule]
})
class WrapperComponent {
    columns = signal<PowerGridColumn[]>([]);
    data = signal<any>(undefined);
    multiSelect = signal<boolean>(false);
    servoyApi!: ServoyApi;

    private _resolveReady!: () => void;
    readonly gridReady = new Promise<void>(resolve => this._resolveReady = resolve);
    readonly onReadyCallback = () => this._resolveReady();

    @ViewChild('element') element!: PowerGrid;
}

function rowData(): any[] {
    const ds = createPowerGridData();
    return ds.rows.map((row: any[]) => {
        const obj: any = {};
        ds.columnNames.forEach((name: string, idx: number) => obj[name] = row[idx]);
        return obj;
    });
}

const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 3000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('timed out waiting for ' + what);
};

describe('PowerGrid - jsdom render pipeline', () => {
    let fixture: ComponentFixture<WrapperComponent>;
    let wrapper: WrapperComponent;
    let grid: PowerGrid;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, WrapperComponent],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(WrapperComponent);
        wrapper = fixture.componentInstance;
        wrapper.servoyApi = new ServoyApiTesting() as any;
        wrapper.columns.set(createPowerGridColumns());
        wrapper.data.set(rowData());
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

    it('becomes grid-ready', () => {
        expect(grid.isGridReady).toBe(true);
    });

    it('loads the dataset rows into the client-side model', async () => {
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 10, 'rows to load');
        const node0 = grid.agGrid()!.api.getDisplayedRowAtIndex(0);
        expect(node0!.data.id).toBe(1);
        expect(node0!.data.country).toBe('France');
    });

    it('builds column defs from the dataset columns', () => {
        const defs = grid.getColumnDefs();
        expect(defs.length).toBe(3);
        const idDef = defs.find((d: any) => d.colId === 'id' || d.field === 'id');
        // the mock columns set id/dataprovider but use headerText (not headerTitle), so headerName is blank
        expect(idDef.field).toBe('id');
        expect(idDef.colId).toBe('id');
    });

    it('resolves columns by id/dataprovider through the live grid', () => {
        expect(grid.getColumn('country').id).toBe('country');
        expect(grid.getColumnIndex('city')).toBe(2);
    });

    it('reports grouping state from the live grid', () => {
        expect(grid.isTableGrouped()).toBe(false);
    });

    it('reads selected rows from the live grid', async () => {
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 10, 'rows to load');
        // grid defaults to single-select, so only the last requested node ends up selected
        grid.setSelectedRows([2]);
        const selected = grid.getSelectedRows();
        expect(selected.length).toBe(1);
        expect(selected[0].id).toBe(3);
    });
    it('stores the column state after load', () => {
        expect(() => grid.storeColumnsState(true)).not.toThrow();
        expect(grid._columnState()).toContain('columnState');
    });

    it('applies a sort model to the live grid', async () => {
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 10, 'rows to load');
        grid.applySortModel([{ colId: 'country', sort: 'asc' }]);
        const state = grid.agGrid()!.api.getColumnState().find((c: any) => c.colId === 'country');
        expect(state!.sort).toBe('asc');
    });

    it('builds header and footer data keyed by lowercase dataprovider', () => {
        wrapper.columns.set([
            { dataprovider: 'Id', headerText: 'H', footerText: 'F' } as PowerGridColumn
        ]);
        fixture.detectChanges();
        expect(grid.getHeaderData()).toEqual([{ id: 'H' }]);
        expect(grid.getFooterData()).toEqual([{ id: 'F' }]);
    });

    it('exports the live grid data as excel without throwing', async () => {
        await waitFor(() => grid.agGrid()!.api.getDisplayedRowCount() >= 10, 'rows to load');
        const spy = vi.spyOn(grid.agGrid()!.api, 'exportDataAsExcel').mockImplementation(() => undefined as any);
        grid.exportData(undefined, undefined, undefined, undefined, undefined, false);
        expect(spy).toHaveBeenCalled();
    });

    it('auto-sizes all columns without throwing once ready', () => {
        expect(() => grid.autoSizeAllColumns()).not.toThrow();
    });

    it('sizes columns to fit without throwing once ready', () => {
        expect(() => grid.sizeColumnsToFit()).not.toThrow();
    });
});



