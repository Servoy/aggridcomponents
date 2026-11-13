import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { createPowerGridColumns, createPowerGridData } from '../testing/mock-data';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Further PowerGrid method coverage against the REAL ag-grid. Exercises OUR cell-focus handler,
 * context-menu building (with a custom main menu), column-state store/restore, size helpers,
 * export-to-dataset, tab/selection navigation and expanded-state application with live nodes.
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
                [multiSelect]="false"
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

describe('PowerGrid - more methods (jsdom render)', () => {
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

    function focusParams(rowIndex: number, field: string): any {
        return {
            rowIndex,
            column: { colId: field, colDef: { colId: field, field } },
            value: 'v',
            event: null
        };
    }

    describe('onCellFocusedHandler', () => {
        it('fires onCellFocusGained with the resolved row data', () => {
            const onCellFocusGained = vi.fn();
            vi.spyOn(grid, 'onCellFocusGained').mockReturnValue(onCellFocusGained);
            vi.spyOn(grid, 'createJSEvent').mockReturnValue({} as any);
            grid.onCellFocusedHandler(focusParams(0, 'country'));
            expect(onCellFocusGained).toHaveBeenCalled();
            expect(onCellFocusGained.mock.calls[0][0].country).toBe('France');
        });

        it('does nothing when there is no handler', () => {
            vi.spyOn(grid, 'onCellFocusGained').mockReturnValue(null);
            expect(() => grid.onCellFocusedHandler(focusParams(0, 'country'))).not.toThrow();
        });
    });

    describe('getMainMenuItems with a custom main menu', () => {
        it('includes a custom separator from the registration service menu', () => {
            grid.agMainMenuItemsConfig = {};
            vi.spyOn(grid, 'customMainMenu').mockReturnValue({ items: [{ extraProperties: { 'NG-Grids': { isSeparator: true } } }] } as any);
            const params = {
                context: { componentParent: grid },
                column: { getColDef: () => ({ field: 'country' }), getColId: () => 'country' },
                defaultItems: ['rowGroup']
            };
            const items = grid.getMainMenuItems(params);
            expect(items).toContain('separator');
            expect(items).toContain('rowGroup');
        });
    });

    describe('storeColumnsState / restoreColumnsState', () => {
        it('stores a column state when it changes', () => {
            grid._columnState.set('{}');
            grid.storeColumnsState(true);
            expect(grid._columnState()).toContain('columnState');
        });

        it('restores a previously stored column state without throwing', () => {
            grid.storeColumnsState(true);
            expect(() => grid.restoreColumnsState()).not.toThrow();
        });
    });

    describe('svySizeColumnsToFit', () => {
        it('runs for a grid-ready event without throwing', () => {
            expect(() => grid.svySizeColumnsToFit('gridReady')).not.toThrow();
        });
    });

    describe('internalExportToDataset', () => {
        it('exports the header and all rows from the live grid', () => {
            const dataset = grid.internalExportToDataset();
            expect(Array.isArray(dataset)).toBe(true);
            // header row + 10 data rows
            expect(dataset.length).toBe(11);
            // mock columns use headerText (not headerTitle), so colDef.headerName is blank; one entry per visible column
            expect(dataset[0].length).toBe(3);
        });
    });

    describe('tabSelectionChangeNavigation', () => {
        it('returns false when disabled', () => {
            (grid as any).enabled = () => false;
            expect(grid.tabSelectionChangeNavigation({ nextCellPosition: { rowIndex: 0 } })).toBe(false);
        });

        it('returns the suggested next cell and selects its row', () => {
            const params = { nextCellPosition: { rowIndex: 1, rowPinned: null }, event: {} };
            expect(grid.tabSelectionChangeNavigation(params)).toBe(params.nextCellPosition);
        });
    });

    describe('applyExpandedState', () => {
        it('is a safe no-op when the table is not grouped', () => {
            grid.__internalExpandedState.set({ France: {} });
            expect(() => grid.applyExpandedState()).not.toThrow();
        });
    });

    describe('onColumnRowGroupChanged', () => {
        it('caches the grouped fields in the state', () => {
            vi.spyOn(grid.agGrid()!.api, 'getRowGroupColumns').mockReturnValue([
                { colDef: { field: 'country' } } as any
            ]);
            grid.onColumnRowGroupChanged({});
            expect(grid.state.expanded.fields).toContain('country');
        });
    });

    describe('isColumnEditable with live params', () => {
        it('is false for a pinned footer node', () => {
            expect(grid.isColumnEditable({ node: { rowPinned: 'bottom' }, colDef: {} })).toBe(false);
        });
    });
});




