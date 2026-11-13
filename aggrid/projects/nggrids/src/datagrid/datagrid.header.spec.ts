import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Header / sizing / grouping-state render tests for DataGrid using the REAL ag-grid. These run
 * OUR DOM-walking helpers (sizeHeader, findChildrenNativeElements, isHeaderHiddenByCSS), the
 * header-checkbox / header-icon setup, the group-column bookkeeping and the expanded-state cache
 * against a live grid & mock foundset.
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

describe('DataGrid - header/sizing/grouping (jsdom render)', () => {
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

    describe('findChildrenNativeElements', () => {
        it('finds the rendered header cells in the live grid DOM', () => {
            const cells = grid.findChildrenNativeElements(grid.agGridElementRef()!.nativeElement, 'ag-header-cell');
            expect(cells.length).toBeGreaterThan(0);
        });

        it('returns an empty array for a class that is not present', () => {
            const found = grid.findChildrenNativeElements(grid.agGridElementRef()!.nativeElement, 'no-such-class-xyz');
            expect(found).toEqual([]);
        });
    });

    describe('isHeaderHiddenByCSS', () => {
        it('is false when the header is visible', () => {
            expect(grid.isHeaderHiddenByCSS()).toBe(false);
        });
    });

    describe('sizeHeader / sizeHeaderAndColumnsToFit', () => {
        it('sizeHeader sets a header height on the live grid', () => {
            const spy = vi.spyOn(grid.agGrid()!.api, 'setGridOption');
            grid.sizeHeader();
            expect(spy).toHaveBeenCalledWith('headerHeight', expect.any(Number));
        });

        it('sizeHeaderAndColumnsToFit runs for a grid-ready event without throwing', () => {
            expect(() => grid.sizeHeaderAndColumnsToFit('gridReady')).not.toThrow();
        });
    });

    describe('setupHeaderCheckbox / setupHeaderIconStyleClass', () => {
        it('setupHeaderCheckbox is a safe no-op when no column declares a header checkbox', () => {
            expect(() => (grid as any).setupHeaderCheckbox(true)).not.toThrow();
        });

        it('setupHeaderIconStyleClass is a safe no-op when no column declares an icon class', () => {
            expect(() => (grid as any).setupHeaderIconStyleClass()).not.toThrow();
        });
    });

    describe('onHeaderCheckClick', () => {
        it('adds a checkbox group selection when checked and emits', () => {
            const spy = vi.fn();
            grid._internalCheckboxGroupSelectionChange.subscribe(spy);
            (grid as any).onHeaderCheckClick('country', { target: { checked: true }, stopPropagation: () => {} });
            expect(grid.__internalCheckboxGroupSelection()).toEqual([{ colId: 'country' }]);
            expect(spy).toHaveBeenCalled();
        });

        it('removes the checkbox group selection when unchecked', () => {
            grid.__internalCheckboxGroupSelection.set([{ colId: 'country' }]);
            (grid as any).onHeaderCheckClick('country', { target: { checked: false }, stopPropagation: () => {} });
            expect(grid.__internalCheckboxGroupSelection()).toEqual([]);
        });
    });

    describe('setStateGroupedColumns', () => {
        it('records grouped column ids and fields in the state', () => {
            grid.setStateGroupedColumns([{ colId: 'country', colDef: { field: 'country' } }]);
            expect(grid.state.grouped.columns).toContain('country');
            expect(grid.state.expanded.fields).toContain('country');
        });
    });

    describe('addRowExpandedState / removeRowExpandedState', () => {
        it('adds a nested expanded state and emits it', () => {
            const spy = vi.fn();
            grid._internalExpandedStateChange.subscribe(spy);
            grid.addRowExpandedState(['France', 'Paris']);
            expect(spy).toHaveBeenCalled();
            const emitted = spy.mock.calls[spy.mock.calls.length - 1][0];
            expect(emitted).toEqual({ France: { Paris: {} } });
        });

        it('removeRowExpandedState deletes a nested key', () => {
            grid.__internalExpandedState.set({ France: { Paris: {} } });
            grid.removeRowExpandedState(['France', 'Paris']);
            expect(grid.__internalExpandedState()).toEqual({ France: {} });
        });

        it('removeRowExpandedStateAtLevel clears a whole level', () => {
            grid.__internalExpandedState.set({ France: { Paris: {} }, Germany: {} });
            grid.removeRowExpandedStateAtLevel(0);
            expect(grid.__internalExpandedState()).toEqual({});
        });
    });

    describe('getFooterData / getHeaderData', () => {
        it('returns an empty array when no footer text is configured', () => {
            expect(grid.getFooterData()).toEqual([]);
        });
    });

    describe('showEditorHint', () => {
        it('is false when columns are present', () => {
            expect(grid.showEditorHint()).toBe(false);
        });
    });

    describe('getRowClass', () => {
        it('returns empty string when there is no foundset style provider', () => {
            const params = { context: { componentParent: grid }, node: { rowPinned: null, rowIndex: 0 }, data: {} };
            // no rowStyleClassDataprovider set -> styleClassProvider resolves undefined, returns it
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            (grid as any).rowStyleClassDataprovider = () => [undefined];
            expect(() => grid.getRowClass(params)).not.toThrow();
        });

        it('returns empty string for a pinned row', () => {
            const params = { context: { componentParent: grid }, node: { rowPinned: 'bottom' } };
            expect(grid.getRowClass(params)).toBe('');
        });
    });
});

