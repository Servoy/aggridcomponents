import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { createPowerGridColumns, createPowerGridData } from '../testing/mock-data';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * PowerGrid GridOptions callback tests against the REAL ag-grid. onColumnResized,
 * onDisplayedColumnsChanged, onSortChanged/onFilterChanged, onGridSizeChanged and the row-class /
 * lazy-loading RemoteDatasource are OUR code; we invoke them with live events.
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

describe('PowerGrid - grid-option callbacks (jsdom render)', () => {
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

    describe('onColumnResized', () => {
        it('debounces a UI resize and sizes columns + stores state on flush', () => {
            vi.useFakeTimers();
            const storeSpy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            const sizeSpy = vi.spyOn(grid, 'svySizeColumnsToFit').mockImplementation(() => {});
            const col = grid.agGrid()!.api.getColumn('id')!;
            (grid.agGridOptions.onColumnResized as any)({ source: 'uiColumnResized', column: col });
            vi.advanceTimersByTime(600);
            expect(sizeSpy).toHaveBeenCalled();
            expect(storeSpy).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it('sizes header and stores state for a non-UI resize', () => {
            const storeSpy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            const sizeSpy = vi.spyOn(grid, 'sizeHeader').mockImplementation(() => {});
            (grid.agGridOptions.onColumnResized as any)({ source: 'api' });
            expect(sizeSpy).toHaveBeenCalled();
            expect(storeSpy).toHaveBeenCalledWith(true);
        });
    });

    describe('onDisplayedColumnsChanged', () => {
        it('sizes columns and stores state once ready', () => {
            const storeSpy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            const sizeSpy = vi.spyOn(grid, 'svySizeColumnsToFit').mockImplementation(() => {});
            (grid.agGridOptions.onDisplayedColumnsChanged as any)({ source: 'uiColumnMoved' });
            expect(sizeSpy).toHaveBeenCalled();
            expect(storeSpy).toHaveBeenCalled();
        });

        it('rebuilds column defs for a contextMenu-sourced change', () => {
            const updateSpy = vi.spyOn(grid, 'updateColumnDefs').mockImplementation(() => {});
            vi.spyOn(grid, 'svySizeColumnsToFit').mockImplementation(() => {});
            vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            (grid.agGridOptions.onDisplayedColumnsChanged as any)({ source: 'contextMenu' });
            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('onSortChanged / onFilterChanged', () => {
        it('onSortChanged stores the column state', () => {
            const spy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            (grid.agGridOptions.onSortChanged as any)();
            expect(spy).toHaveBeenCalled();
        });

        it('onFilterChanged stores the column state', () => {
            const spy = vi.spyOn(grid, 'storeColumnsState').mockImplementation(() => {});
            (grid.agGridOptions.onFilterChanged as any)();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('onGridSizeChanged', () => {
        it('schedules a size-to-fit without throwing', () => {
            vi.useFakeTimers();
            expect(() => (grid.agGridOptions.onGridSizeChanged as any)({})).not.toThrow();
            vi.advanceTimersByTime(200);
            vi.useRealTimers();
        });
    });

    describe('getRowId', () => {
        it('generates a row id from the data via JSON when no pks are set', () => {
            const id = (grid.agGridOptions.getRowId as any)({ data: { id: 1, country: 'France' } });
            expect(typeof id).toBe('string');
            expect(id).toContain('France');
        });
    });

    describe('getContextMenuItems', () => {
        it('returns the configured context menu items', () => {
            grid.contextMenuItems = ['copy'];
            expect((grid.agGridOptions.getContextMenuItems as any)()).toEqual(['copy']);
        });
    });

    describe('onCellEditingStarted / onCellEditingStopped', () => {
        it('onCellEditingStarted activates the popup without throwing', () => {
            grid.invalidCellDataIndex = { rowIndex: -1, colKey: '' };
            expect(() => (grid.agGridOptions.onCellEditingStarted as any)({ column: { getColId: () => 'id' }, rowIndex: 0 })).not.toThrow();
        });

        it('onCellEditingStopped deactivates the popup without throwing', () => {
            grid.onColumnDataChangePromise = null;
            grid.invalidCellDataIndex = { rowIndex: -1, colKey: '' };
            expect(() => (grid.agGridOptions.onCellEditingStopped as any)({ column: { getColId: () => 'id' }, rowIndex: 0 })).not.toThrow();
        });
    });
});

