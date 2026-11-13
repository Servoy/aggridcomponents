import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Public-API render tests for DataGrid. Boots the REAL ag-grid (dependency) so OUR API methods
 * run against a live grid/foundset. Assertions target OUR behaviour (validation warnings,
 * api delegation, selection/focus requests, column-index lookups, state round-trips).
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

const waitForData = async (grid: DataGrid, timeoutMs = 3000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const n = grid.agGrid()!.api.getDisplayedRowAtIndex(0);
        if (n && n.data) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('timed out waiting for row data');
};

describe('DataGrid - public API (jsdom render)', () => {
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

    describe('getColumnIndex / internalGetColumnIndex', () => {
        it('returns the index for a known column', () => {
            expect(grid.getColumnIndex('country')).toBe(1);
        });

        it('returns -1 for an unknown column', () => {
            expect(grid.getColumnIndex('nope')).toBe(-1);
        });
    });

    describe('internalGetColumnState', () => {
        it('stores and returns the current column state', () => {
            const state = grid.internalGetColumnState();
            expect(state).toContain('columnState');
        });
    });

    describe('editCellAt validation', () => {
        it('warns on an invalid foundsetindex', () => {
            const spy = vi.fn();
            Object.defineProperty(grid.log, 'warn', { configurable: true, get: () => spy });
            grid.editCellAt(0, 0);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('invalid foundsetindex'));
        });

        it('warns on an invalid columnindex', () => {
            const spy = vi.fn();
            Object.defineProperty(grid.log, 'warn', { configurable: true, get: () => spy });
            grid.editCellAt(1, 99);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('invalid columnindex'));
        });
    });

    describe('requestFocus', () => {
        it('defaults a non-numeric column index to 0 and does not throw', () => {
            expect(() => grid.requestFocus('abc')).not.toThrow();
        });

        it('warns and records -1 for an out-of-range index', () => {
            const spy = vi.fn();
            Object.defineProperty(grid.log, 'warn', { configurable: true, get: () => spy });
            grid.requestFocus(99);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('invalid columnindex'));
            expect(grid.requestFocusColumnIndex).toBe(-1);
        });
    });

    describe('moveColumn / toolpanel / sort api', () => {
        it('moveColumn delegates to the live api', () => {
            const spy = vi.spyOn(grid.agGrid()!.api, 'moveColumns');
            grid.moveColumn('country', 0);
            expect(spy).toHaveBeenCalledWith(['country'], 0);
        });

        it('showToolPanel opens and closes the live tool panel', () => {
            const open = vi.spyOn(grid.agGrid()!.api, 'openToolPanel');
            const close = vi.spyOn(grid.agGrid()!.api, 'closeToolPanel');
            grid.showToolPanel(true);
            grid.showToolPanel(false);
            expect(open).toHaveBeenCalledWith('columns');
            expect(close).toHaveBeenCalled();
        });

        it('stopCellEditing delegates to the live api', () => {
            const spy = vi.spyOn(grid.agGrid()!.api, 'stopEditing');
            grid.stopCellEditing(true);
            expect(spy).toHaveBeenCalledWith(true);
        });

        it('getAgGridSortModel reads applied sorts from the live column state', () => {
            grid.applySortModel([{ colId: 'country', sort: 'asc' }]);
            expect(grid.getAgGridSortModel()).toEqual([{ colId: 'country', sort: 'asc', sortIndex: 0 }]);
        });
    });

    describe('notifyDataChange / refreshData', () => {
        it('notifyDataChange marks the cache dirty', () => {
            grid.notifyDataChange();
            expect(grid.dirtyCache).toBe(true);
        });

        it('refreshData triggers a purge without throwing', () => {
            expect(() => grid.refreshData()).not.toThrow();
        });
    });

    describe('setExpandedGroups', () => {
        it('stores the expanded state and emits it', () => {
            const spy = vi.fn();
            grid._internalExpandedStateChange.subscribe(spy);
            grid.setExpandedGroups({ France: {} });
            expect(grid.__internalExpandedState()).toEqual({ France: {} });
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('scrollToSelection', () => {
        it('scrolls immediately when the selection is ready', () => {
            grid.isRenderedAndSelectionReady = true;
            const spy = vi.spyOn(grid, 'scrollToSelectionEx').mockImplementation(() => {});
            grid.scrollToSelection();
            expect(spy).toHaveBeenCalled();
        });

        it('defers the scroll when the selection is not ready', () => {
            grid.isRenderedAndSelectionReady = false;
            grid.scrollToSelection();
            expect(grid.scrollToSelectionWhenSelectionReady).toBe(true);
        });
    });

    describe('getFoundsetManagerByFoundsetUUID', () => {
        it('returns the root foundset manager for the root hash', () => {
            expect(grid.getFoundsetManagerByFoundsetUUID('root')).toBe(grid.foundset);
        });
    });

    describe('getRequestInfoWithId', () => {
        it('suffixes the request info with the markup id', () => {
            const info = grid.getRequestInfoWithId('getDataFromFoundset');
            expect(info.startsWith('getDataFromFoundset-')).toBe(true);
        });
    });

    describe('getColumnFormat', () => {
        it('returns null for a column without a format', () => {
            expect(grid.getColumnFormat('id')).toBeNull();
        });
    });
});

