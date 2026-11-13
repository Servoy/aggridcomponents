import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { createPowerGridColumns, createPowerGridData } from '../testing/mock-data';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Handler / interaction render tests for PowerGrid against the REAL ag-grid (dependency, not the
 * unit under test). Boots a live grid with dataset rowData, then drives OUR cell handlers,
 * value-changed path, navigation, group bookkeeping and api-backed helpers with live nodes.
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
                [readOnly]="readOnly()"
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
    readOnly = signal<boolean>(false);
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

const waitForData = async (grid: PowerGrid, timeoutMs = 3000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const n = grid.agGrid()!.api.getDisplayedRowAtIndex(0);
        if (n && n.data) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('timed out waiting for row data');
};

describe('PowerGrid - interactive handlers (jsdom render)', () => {
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
        await waitForData(grid);
    }, 30000);

    afterEach(() => {
        try { grid?.destroy(); } catch (e) { /* ignore */ }
        vi.restoreAllMocks();
    });

    function nodeParams(rowIndex: number, field: string) {
        const node = grid.agGrid()!.api.getDisplayedRowAtIndex(rowIndex)!;
        const column: any = { colId: field, getColId: () => field, getColDef: () => ({ field }) };
        return {
            node, data: node.data, value: node.data[field], valueFormatted: String(node.data[field]),
            colDef: { field, colId: field }, column,
            event: { target: { closest: () => null }, type: 'click' },
            rowIndex, api: grid.agGrid()!.api, context: { componentParent: grid }
        };
    }

    it('getDefaultCellRenderer renders a plain cell text node', () => {
        const renderer = grid.getDefaultCellRenderer(grid.getColumn('country'));
        const result = renderer(nodeParams(0, 'country'));
        expect(result.textContent).toBe('France');
    });

    it('getDefaultCellRenderer renders a checkbox for a CHECKBOX column', () => {
        const col = { editType: 'CHECKBOX' };
        const renderer = grid.getDefaultCellRenderer(col);
        const result = renderer({ ...nodeParams(0, 'country'), value: 1 });
        expect(result.tagName).toBe('I');
        expect(result.className).toContain('fa-check-square');
    });

    it('onCellClicked fires the onCellClick handler', () => {
        const onCellClick = vi.fn();
        (grid as any).onCellClick = () => onCellClick;
        grid.onCellClicked(nodeParams(0, 'country'));
        expect(onCellClick).toHaveBeenCalled();
        expect(onCellClick.mock.calls[0][0].country).toBe('France');
    });

    it('cellClickHandler dispatches a single click when there is no double-click handler', () => {
        const onCellClick = vi.fn();
        (grid as any).onCellClick = () => onCellClick;
        (grid as any).onCellDoubleClick = () => null;
        grid.cellClickHandler(nodeParams(0, 'country'));
        expect(onCellClick).toHaveBeenCalled();
    });

    it('onCellValueChanged ignores stale updates for a different invalid cell', () => {
        grid.invalidCellDataIndex = { rowIndex: 9, colKey: 'other' };
        const spy = vi.fn();
        grid.dataChange.subscribe(spy);
        const params = nodeParams(0, 'country');
        grid.onCellValueChanged({ ...params, newValue: 'Spain', oldValue: 'France' });
        expect(spy).not.toHaveBeenCalled();
    });

    it('onCellValueChanged is a no-op when the value is unchanged', () => {
        const onColumnDataChange = vi.fn();
        (grid as any).onColumnDataChange = () => onColumnDataChange;
        const params = nodeParams(0, 'country');
        grid.onCellValueChanged({ ...params, newValue: 'France', oldValue: 'France' });
        expect(onColumnDataChange).not.toHaveBeenCalled();
    });

    it('selectionChangeNavigation suggests the next row on arrow-down', () => {
        const params = {
            event: { keyCode: 40 },
            previousCellPosition: { rowIndex: 0 },
            nextCellPosition: { rowIndex: 0 }
        };
        const result = grid.selectionChangeNavigation(params);
        expect(result.rowIndex).toBe(1);
    });

    it('selectionChangeNavigation returns suggested cell for left/right', () => {
        const params = {
            event: { keyCode: 37 },
            previousCellPosition: { rowIndex: 0 },
            nextCellPosition: { rowIndex: 0, _marker: true }
        };
        expect((grid.selectionChangeNavigation(params) as any)._marker).toBe(true);
    });

    it('moveColumn moves a column via the live api', () => {
        const spy = vi.spyOn(grid.agGrid()!.api, 'moveColumns');
        grid.moveColumn('city', 0);
        expect(spy).toHaveBeenCalledWith(['city'], 0);
    });

    it('scrollToRow ensures the matching row is visible', async () => {
        const spy = vi.spyOn(grid.agGrid()!.api, 'ensureIndexVisible');
        grid.scrollToRow({ country: 'Germany' });
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(spy).toHaveBeenCalled();
    });

    it('setExpandedGroups stores and emits the expanded state', () => {
        const spy = vi.fn();
        grid._internalExpandedStateChange.subscribe(spy);
        grid.setExpandedGroups({ France: {} });
        expect(grid.__internalExpandedState()).toEqual({ France: {} });
        expect(spy).toHaveBeenCalled();
    });

    it('isPivotMode reads from the live grid', () => {
        expect(grid.isPivotMode()).toBe(false);
    });

    it('stopCellEditing calls through to the live api', () => {
        const spy = vi.spyOn(grid.agGrid()!.api, 'stopEditing');
        grid.stopCellEditing(true);
        expect(spy).toHaveBeenCalledWith(true);
    });

    it('autoSizeColumns sizes the non-flex displayed columns', () => {
        const spy = vi.spyOn(grid.agGrid()!.api, 'autoSizeColumns');
        grid.autoSizeColumns(false);
        expect(spy).toHaveBeenCalled();
    });

    it('internalExportToDataset builds a dataset from the live column state', () => {
        const result = grid.internalExportToDataset();
        expect(result).toBeDefined();
    });

    it('svyOnChanges data push updates the live rowData', () => {
        const spy = vi.spyOn(grid.agGrid()!.api, 'setGridOption');
        grid.svyOnChanges({ data: { currentValue: rowData(), previousValue: [] } } as any);
        expect(spy).toHaveBeenCalledWith('rowData', expect.anything());
    });

    it('updateColumnHeader updates and refreshes the header', () => {
        const spy = vi.spyOn(grid.agGrid()!.api, 'refreshHeader');
        grid.updateColumnHeader('id', 'headerName', 'New ID');
        expect(spy).toHaveBeenCalled();
    });

    it('handleColumnFooterText pushes footer data to the pinned bottom row', () => {
        const spy = vi.spyOn(grid.agGrid()!.api, 'setGridOption');
        grid.handleColumnFooterText();
        expect(spy).toHaveBeenCalledWith('pinnedBottomRowData', expect.anything());
    });
});


