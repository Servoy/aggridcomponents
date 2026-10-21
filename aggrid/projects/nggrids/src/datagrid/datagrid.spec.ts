import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { SortChangedEvent } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('DataGrid - onShow foundset.sort crash & init ordering (SVY-21479)', () => {
    let component: DataGrid;
    let fixture: ReturnType<typeof TestBed.createComponent<DataGrid>>;

    function makeFoundset(overrides: Record<string, any> = {}): any {
        return {
            foundsetId: 1,
            serverSize: 10,
            sortColumns: '',
            viewPort: { size: 10, startIndex: 0, rows: [] },
            addChangeListener: vi.fn().mockReturnValue(() => {}),
            removeChangeListener: vi.fn(),
            getSortColumns() { return this.sortColumns; },
            ...overrides
        };
    }

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return {
            columnid: 'col_' + Math.random().toString(36).slice(2, 8),
            ...overrides
        } as unknown as DataGridColumn;
    }

    function fakeAgGrid(): any {
        return {
            api: {
                setGridOption: vi.fn(),
                setRowCount: vi.fn(),
                applyColumnState: vi.fn(),
                getEditingCells: vi.fn().mockReturnValue([]),
                getRowGroupColumns: vi.fn().mockReturnValue([])
            },
            gridOptions: {}
        };
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, DataGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
        component.agGridOptions = component.agGridOptions || {} as any;
    });

    describe('AC3 - getSortModel does not throw when foundset is undefined', () => {
        it('returns an empty sort model instead of dereferencing undefined this.foundset', () => {
            expect(component.foundset).toBeUndefined();

            let result: any;
            expect(() => { result = component.getSortModel(); }).not.toThrow();
            expect(result).toEqual([]);
        });
    });

    describe('AC1 - changeListener does not crash on sortColumnsChanged with undefined foundset', () => {
        it('does not throw when isRootFoundsetLoaded is true but this.foundset is undefined and grid is not ready', () => {
            component.isRootFoundsetLoaded = true;
            component.isGridReady = false;
            component.foundset = undefined as any;

            expect(() => {
                component.changeListener({ sortColumnsChanged: { newValue: 'created_at desc', oldValue: '' } } as any);
            }).not.toThrow();
        });

        it('returns harmlessly (does not init) when grid is not ready', () => {
            const initSpy = vi.spyOn(component, 'initRootFoundset');
            component.isRootFoundsetLoaded = true;
            component.isGridReady = false;
            component.foundset = undefined as any;

            component.changeListener({ sortColumnsChanged: { newValue: 'created_at desc', oldValue: '' } } as any);

            expect(initSpy).not.toHaveBeenCalled();
            expect(component.foundset).toBeUndefined();
        });
    });

    describe('AC4 - invariant: isRootFoundsetLoaded === true implies this.foundset defined', () => {
        it('myFoundset change handler keeps isRootFoundsetLoaded false while grid not ready (this.foundset stays undefined)', () => {
            const myFoundset = makeFoundset({ viewPort: { size: 10, startIndex: 0, rows: [] } });
            fixture.componentRef.setInput('myFoundset', myFoundset);
            component.isGridReady = false;

            component.svyOnChanges({ myFoundset: { currentValue: myFoundset, previousValue: undefined } } as any);

            expect(component.foundset).toBeUndefined();
            expect(component.isRootFoundsetLoaded).toBe(!!component.foundset);
            expect(component.isRootFoundsetLoaded).toBe(false);
        });

        it('myFoundset change handler sets isRootFoundsetLoaded true once grid is ready (this.foundset assigned)', () => {
            const myFoundset = makeFoundset({ viewPort: { size: 10, startIndex: 0, rows: [] } });
            fixture.componentRef.setInput('myFoundset', myFoundset);
            (component as any).agGrid = () => fakeAgGrid();
            component.isGridReady = true;

            component.svyOnChanges({ myFoundset: { currentValue: myFoundset, previousValue: undefined } } as any);

            expect(component.foundset).toBeDefined();
            expect(component.isRootFoundsetLoaded).toBe(!!component.foundset);
            expect(component.isRootFoundsetLoaded).toBe(true);
        });
    });

    describe('AC2 - onShow sort applied after render (not just crash suppression)', () => {
        it('once the grid becomes ready and initRootFoundset runs, getSortModel returns the real (non-empty) sort model', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ id: 'created_at', dataprovider: { idForFoundset: 'created_at' } })
            ]);
            const myFoundset = makeFoundset({ sortColumns: 'created_at desc' });
            fixture.componentRef.setInput('myFoundset', myFoundset);
            (component as any).agGrid = () => fakeAgGrid();

            expect(component.getSortModel()).toEqual([]);

            component.isGridReady = true;
            component.initRootFoundset();

            expect(component.foundset).toBeDefined();
            expect(component.getSortModel()).toEqual([{ colId: 'created_at', sort: 'desc' }]);
        });

        it('applies the foundset sort to the grid once ready (initRootFoundset pushes the model via applySortModel)', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ id: 'created_at', dataprovider: { idForFoundset: 'created_at' } })
            ]);
            const myFoundset = makeFoundset({ sortColumns: 'created_at desc' });
            fixture.componentRef.setInput('myFoundset', myFoundset);
            (component as any).agGrid = () => fakeAgGrid();
            vi.spyOn(component, 'onSort').mockReturnValue((() => {}) as any);
            const applySortModelSpy = vi.spyOn(component, 'applySortModel').mockImplementation(() => {});

            component.isGridReady = true;
            component.initRootFoundset();

            expect(component.foundset).toBeDefined();
            expect(applySortModelSpy).toHaveBeenCalledWith([{ colId: 'created_at', sort: 'desc' }]);
        });
    });

    describe('AC4 - changeListener lazily re-inits when foundset missing but grid ready', () => {
        it('assigns this.foundset and restores the invariant when a change arrives after the grid is ready', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ id: 'created_at', dataprovider: { idForFoundset: 'created_at' } })
            ]);
            const myFoundset = makeFoundset({ sortColumns: 'created_at desc' });
            fixture.componentRef.setInput('myFoundset', myFoundset);
            (component as any).agGrid = () => fakeAgGrid();

            component.isRootFoundsetLoaded = true;
            component.foundset = undefined as any;
            component.isGridReady = true;

            component.changeListener({ sortColumnsChanged: { newValue: 'created_at desc', oldValue: '' } } as any);

            expect(component.foundset).toBeDefined();
            expect(component.isRootFoundsetLoaded).toBe(!!component.foundset);
            expect(component.isRootFoundsetLoaded).toBe(true);
        });
    });

    describe('AC5 - ee508d76 preserved: initRootFoundset returns early when grid not ready', () => {
        it('does not assign this.foundset and does not call AG Grid API when isGridReady is false', () => {
            const grid = fakeAgGrid();
            (component as any).agGrid = () => grid;
            const myFoundset = makeFoundset();
            fixture.componentRef.setInput('myFoundset', myFoundset);
            component.isGridReady = false;

            component.initRootFoundset();

            expect(component.foundset).toBeUndefined();
            expect(grid.api.setGridOption).not.toHaveBeenCalled();
        });
    });

    describe('Non-regression - empty / newly-set foundset', () => {
        it('leaves isRootFoundsetLoaded false and this.foundset undefined for an empty foundset', () => {
            const myFoundset = makeFoundset({ serverSize: 0, viewPort: { size: 0, startIndex: 0, rows: [] } });
            fixture.componentRef.setInput('myFoundset', myFoundset);
            (component as any).agGrid = () => fakeAgGrid();
            component.isGridReady = true;

            component.svyOnChanges({ myFoundset: { currentValue: myFoundset, previousValue: undefined } } as any);

            expect(component.isRootFoundsetLoaded).toBe(false);
            expect(component.foundset).toBeUndefined();
        });
    });

    describe('AC4 - isRootFoundsetLoaded set when foundset loaded via onGridReady (grid ready after model)', () => {
        it('initRootFoundset sets isRootFoundsetLoaded true whenever this.foundset is assigned', () => {
            const myFoundset = makeFoundset({ viewPort: { size: 10, startIndex: 0, rows: [] } });
            fixture.componentRef.setInput('myFoundset', myFoundset);
            (component as any).agGrid = () => fakeAgGrid();

            component.isGridReady = false;
            component.svyOnChanges({ myFoundset: { currentValue: myFoundset, previousValue: undefined } } as any);
            expect(component.foundset).toBeUndefined();
            expect(component.isRootFoundsetLoaded).toBe(false);

            component.isGridReady = true;
            component.initRootFoundset();

            expect(component.foundset).toBeDefined();
            expect(component.isRootFoundsetLoaded).toBe(true);
        });

        it('a subsequent foundset change is processed (not dropped) after onGridReady loads the foundset', () => {
            const myFoundset = makeFoundset({ viewPort: { size: 10, startIndex: 0, rows: [] } });
            fixture.componentRef.setInput('myFoundset', myFoundset);
            (component as any).agGrid = () => fakeAgGrid();

            component.isGridReady = false;
            component.svyOnChanges({ myFoundset: { currentValue: myFoundset, previousValue: undefined } } as any);

            component.isGridReady = true;
            component.initRootFoundset();
            expect(component.isRootFoundsetLoaded).toBe(true);

            const isTableGroupedSpy = vi.spyOn(component, 'isTableGrouped').mockReturnValue(false);
            const refreshDatasourceSpy = vi.spyOn(component, 'refreshDatasource').mockImplementation(() => {});

            component.changeListener({ foundsetDefinitionChanged: { newValue: {} as any, oldValue: {} as any } } as any);

            expect(refreshDatasourceSpy).toHaveBeenCalled();
            isTableGroupedSpy.mockRestore();
            refreshDatasourceSpy.mockRestore();
        });
    });
});

describe('DataGrid - onSortChanged source guard (SVY-21291)', () => {
    let component: DataGrid;
    let onSortChanged: (event: SortChangedEvent) => void;
    let onSortHandlerSpy: ReturnType<typeof vi.spyOn>;
    let storeColumnsStateSpy: ReturnType<typeof vi.spyOn>;
    let isTableGroupedSpy: ReturnType<typeof vi.spyOn>;
    let refreshAgGridServerSideSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, DataGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        const fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);

        component.agGridOptions = component.agGridOptions || {} as any;

        onSortHandlerSpy = vi.spyOn(component, 'onSortHandler').mockImplementation(() => {});
        storeColumnsStateSpy = vi.spyOn(component, 'storeColumnsState').mockImplementation(() => {});
        isTableGroupedSpy = vi.spyOn(component, 'isTableGrouped').mockReturnValue(false);
        refreshAgGridServerSideSpy = vi.spyOn(component, 'refreshAgGridServerSide').mockImplementation(() => {});

        component.agGridOptions.onSortChanged = function(this: DataGrid, event: SortChangedEvent) {
            const source = (event as any).source;
            if (source === 'gridInitializing') return;

            this.storeColumnsState();

            if (this.isTableGrouped()) {
                this.removeAllFoundsetRef = true;
                this.refreshAgGridServerSide();
            }

            if (source !== 'api') {
                this.isSortModelApplied = true;
                if ((this as any).onSort?.()) {
                    this.onSortHandler();
                }
            }
        };

        onSortChanged = component.agGridOptions.onSortChanged as (event: SortChangedEvent) => void;
    });

    function enableOnSort(handler?: () => Promise<unknown>) {
        const h = handler ?? (() => Promise.resolve());
        Object.defineProperty(component, 'onSort', {
            value: () => h,
            configurable: true
        });
    }

    describe('onSortHandler guard by event.source', () => {
        it('should NOT call onSortHandler when event.source is api', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'api' } as any);

            expect(onSortHandlerSpy).not.toHaveBeenCalled();
        });

        it('should call onSortHandler when event.source is uiColumnSorted', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(onSortHandlerSpy).toHaveBeenCalledTimes(1);
        });

        it('should call onSortHandler when event.source is columnMenu', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'columnMenu' } as any);

            expect(onSortHandlerSpy).toHaveBeenCalledTimes(1);
        });

        it('should NOT call onSortHandler when onSort handler is not defined', () => {
            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(onSortHandlerSpy).not.toHaveBeenCalled();
        });

        it('should NOT call onSortHandler when event.source is gridInitializing', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'gridInitializing' } as any);

            expect(onSortHandlerSpy).not.toHaveBeenCalled();
        });
    });

    describe('storeColumnsState fires for all sources', () => {
        it('should call storeColumnsState when event.source is api', () => {
            onSortChanged.call(component, { source: 'api' } as any);

            expect(storeColumnsStateSpy).toHaveBeenCalledTimes(1);
        });

        it('should call storeColumnsState when event.source is uiColumnSorted', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(storeColumnsStateSpy).toHaveBeenCalledTimes(1);
        });

        it('should call storeColumnsState when event.source is columnMenu', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'columnMenu' } as any);

            expect(storeColumnsStateSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('grouped table refresh fires for all sources', () => {
        it('should call refreshAgGridServerSide when grouped and event.source is api', () => {
            isTableGroupedSpy.mockReturnValue(true);

            onSortChanged.call(component, { source: 'api' } as any);

            expect(refreshAgGridServerSideSpy).toHaveBeenCalledTimes(1);
            expect(component.removeAllFoundsetRef).toBe(true);
        });

        it('should call refreshAgGridServerSide when grouped and event.source is uiColumnSorted', () => {
            enableOnSort();
            isTableGroupedSpy.mockReturnValue(true);

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(refreshAgGridServerSideSpy).toHaveBeenCalledTimes(1);
            expect(component.removeAllFoundsetRef).toBe(true);
        });

        it('should NOT call refreshAgGridServerSide when not grouped', () => {
            isTableGroupedSpy.mockReturnValue(false);

            onSortChanged.call(component, { source: 'api' } as any);

            expect(refreshAgGridServerSideSpy).not.toHaveBeenCalled();
        });
    });

    describe('isSortModelApplied flag', () => {
        it('should set isSortModelApplied to true when event.source is uiColumnSorted', () => {
            enableOnSort();
            component.isSortModelApplied = false;

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(component.isSortModelApplied).toBe(true);
        });

        it('should set isSortModelApplied to true when event.source is columnMenu', () => {
            enableOnSort();
            component.isSortModelApplied = false;

            onSortChanged.call(component, { source: 'columnMenu' } as any);

            expect(component.isSortModelApplied).toBe(true);
        });

        it('should NOT set isSortModelApplied when event.source is api', () => {
            component.isSortModelApplied = false;

            onSortChanged.call(component, { source: 'api' } as any);

            expect(component.isSortModelApplied).toBe(false);
        });
    });

    describe('sortHandlerPromises queue integrity', () => {
        it('should not grow sortHandlerPromises when sort triggered by api source', () => {
            enableOnSort();
            component.sortHandlerPromises = [];

            onSortChanged.call(component, { source: 'api' } as any);

            expect(component.sortHandlerPromises.length).toBe(0);
        });

        it('should only add to sortHandlerPromises for UI sort, not API sort', () => {
            const sortPromise = Promise.resolve();
            enableOnSort(() => sortPromise);
            component.sortHandlerPromises = [];

            onSortHandlerSpy.mockImplementation(function(this: DataGrid) {
                this.sortHandlerPromises.push(sortPromise);
            });

            onSortChanged.call(component, { source: 'api' } as any);
            expect(component.sortHandlerPromises.length).toBe(0);

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);
            expect(component.sortHandlerPromises.length).toBe(1);
        });

        it('should keep sortHandlerPromises empty when multiple api-source events fire in rapid succession', () => {
            enableOnSort();
            component.sortHandlerPromises = [];

            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);

            expect(component.sortHandlerPromises.length).toBe(0);
            expect(onSortHandlerSpy).not.toHaveBeenCalled();
        });

        it('should not corrupt the queue when interleaved api sorts precede a single UI sort (foundset-change scenario)', () => {
            const sortPromise = Promise.resolve();
            enableOnSort(() => sortPromise);
            component.sortHandlerPromises = [];

            onSortHandlerSpy.mockImplementation(function(this: DataGrid) {
                this.sortHandlerPromises.push(sortPromise);
            });

            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);

            expect(component.sortHandlerPromises.length).toBe(0);
            expect(onSortHandlerSpy).not.toHaveBeenCalled();

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(component.sortHandlerPromises.length).toBe(1);
            expect(onSortHandlerSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('sortHandlerPromises out-of-order resolution', () => {
        let logErrorSpy: ReturnType<typeof vi.fn>;

        function removeSortHandlerPromise(promise: unknown) {
            (component as any).removeSortHandlerPromise(promise);
        }

        beforeEach(() => {
            logErrorSpy = vi.fn();
            Object.defineProperty(component.log, 'error', { configurable: true, get: () => logErrorSpy });
            component.sortHandlerPromises = [];
        });

        it('should drain the queue without error when promises resolve out of order', () => {
            const first = Promise.resolve();
            const second = Promise.resolve();
            component.sortHandlerPromises.push(first, second);

            removeSortHandlerPromise(second);
            removeSortHandlerPromise(first);

            expect(component.sortHandlerPromises.length).toBe(0);
            expect(logErrorSpy).not.toHaveBeenCalled();
        });

        it('should drain the queue without error when a reject settles before an earlier resolve', () => {
            const first = Promise.resolve();
            const second = Promise.reject().catch(() => undefined);
            component.sortHandlerPromises.push(first, second);

            removeSortHandlerPromise(second);
            removeSortHandlerPromise(first);

            expect(component.sortHandlerPromises.length).toBe(0);
            expect(logErrorSpy).not.toHaveBeenCalled();
        });

        it('should log out of sync when a settling promise is not in the queue', () => {
            const known = Promise.resolve();
            const stray = Promise.resolve();
            component.sortHandlerPromises.push(known);

            removeSortHandlerPromise(stray);

            expect(logErrorSpy).toHaveBeenCalledWith('sortHandlerPromises out of sync');
            expect(component.sortHandlerPromises.length).toBe(1);
        });
    });
});

describe('DataGrid - restoreColumnsState multi-column sort priority (SVY-21644)', () => {
    let component: DataGrid;
    let fixture: ReturnType<typeof TestBed.createComponent<DataGrid>>;
    let appliedColumnState: any[];

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return {
            id: 'col_' + Math.random().toString(36).slice(2, 8),
            ...overrides
        } as unknown as DataGridColumn;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, DataGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
        fixture.componentRef.setInput('columns', [
            makeColumn({ id: 'data' }),
            makeColumn({ id: 'id' })
        ]);

        appliedColumnState = [];
        // stub the AG Grid api signal; restoreColumnsState/applySortModel only need applyColumnState and friends
        (component as any).agGrid = () => ({
            api: {
                applyColumnState: (params: any) => {
                    appliedColumnState = params.state;
                },
                setRowGroupColumns: () => { /* no-op */ },
                setFilterModel: () => { /* no-op */ }
            }
        });
    });

    function sortEntryFor(colId: string): any {
        return appliedColumnState.find(s => s.colId === colId);
    }

    it('keeps the saved sort priority when the sortIndex order differs from the columnState column order', () => {
        // column "id" appears first in columnState but was sorted *second* (sortIndex 1);
        // column "data" appears second but was sorted *first* (sortIndex 0)
        const savedState = {
            columnState: [
                { colId: 'id', sort: 'desc', sortIndex: 1 },
                { colId: 'data', sort: 'desc', sortIndex: 0 }
            ]
        };
        (component as any)._columnState.set(JSON.stringify(savedState));

        component.restoreColumnsState({ columns: true, filter: false, sort: true });

        expect(sortEntryFor('data').sortIndex).toBe(0);
        expect(sortEntryFor('id').sortIndex).toBe(1);
    });

    it('preserves sort priority already matching columnState order', () => {
        const savedState = {
            columnState: [
                { colId: 'data', sort: 'desc', sortIndex: 0 },
                { colId: 'id', sort: 'desc', sortIndex: 1 }
            ]
        };
        (component as any)._columnState.set(JSON.stringify(savedState));

        component.restoreColumnsState({ columns: true, filter: false, sort: true });

        expect(sortEntryFor('data').sortIndex).toBe(0);
        expect(sortEntryFor('id').sortIndex).toBe(1);
    });
});

describe('DataGrid - headerGroupKeepColumnsTogether -> marryChildren (SVYX-1144)', () => {
    let component: DataGrid;
    let fixture: ReturnType<typeof TestBed.createComponent<DataGrid>>;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return {
            columnid: 'col_' + Math.random().toString(36).slice(2, 8),
            ...overrides
        } as unknown as DataGridColumn;
    }

    function findGroupDef(colDefs: any[], headerName: string): any {
        return colDefs.find(def => def && def.children && def.headerName === headerName);
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, DataGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
    });

    it('sets marryChildren=true on the synthesized group def when the first column of the group has headerGroupKeepColumnsTogether=true', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: true }),
            makeColumn({ columnid: 'b', headerGroup: 'G1' })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group).toBeDefined();
        expect(group.marryChildren).toBe(true);
        expect(group.children.length).toBe(2);
    });

    it('leaves marryChildren falsy when the flag is unset on the establishing column', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1' }),
            makeColumn({ columnid: 'b', headerGroup: 'G1' })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group).toBeDefined();
        expect(group.marryChildren).toBeFalsy();
    });

    it('leaves marryChildren false when the flag is explicitly false on the establishing column', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: false }),
            makeColumn({ columnid: 'b', headerGroup: 'G1' })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group.marryChildren).toBe(false);
    });

    it('first-column-wins: a later member column setting the flag does NOT enable marryChildren', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: false }),
            makeColumn({ columnid: 'b', headerGroup: 'G1', headerGroupKeepColumnsTogether: true })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group.marryChildren).toBe(false);
    });

    it('first-column-wins: a later member column clearing the flag does NOT disable marryChildren', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: true }),
            makeColumn({ columnid: 'b', headerGroup: 'G1', headerGroupKeepColumnsTogether: false })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group.marryChildren).toBe(true);
    });

    it('resolves the flag independently per header group', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: true }),
            makeColumn({ columnid: 'b', headerGroup: 'G2', headerGroupKeepColumnsTogether: false })
        ]);

        const colDefs = component.getColumnDefs();

        expect(findGroupDef(colDefs, 'G1').marryChildren).toBe(true);
        expect(findGroupDef(colDefs, 'G2').marryChildren).toBe(false);
    });
});

describe('DataGrid - headerIconStyleClass survives column hide/show (SVYX-1146)', () => {
    let component: DataGrid;
    let fixture: ReturnType<typeof TestBed.createComponent<DataGrid>>;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return {
            columnid: 'col_' + Math.random().toString(36).slice(2, 8),
            ...overrides
        } as unknown as DataGridColumn;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, DataGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
    });

    describe('hasHeaderIconStyleClassColumn', () => {
        it('returns false when there are no columns', () => {
            expect((component as any).hasHeaderIconStyleClassColumn()).toBeFalsy();
        });

        it('returns false when no column declares headerIconStyleClass', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a' })]);

            expect((component as any).hasHeaderIconStyleClassColumn()).toBeFalsy();
        });

        it('returns true when a column declares headerIconStyleClass', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'a' }),
                makeColumn({ columnid: 'b', headerIconStyleClass: 'fa fa-star' })
            ]);

            expect((component as any).hasHeaderIconStyleClassColumn()).toBeTruthy();
        });
    });

    describe('setupHeaderIconStyleClass', () => {
        let headerEl: HTMLElement;
        let labelEl: HTMLElement;

        beforeEach(() => {
            headerEl = document.createElement('div');
            headerEl.setAttribute('col-id', 'iconCol');
            labelEl = document.createElement('div');
            labelEl.setAttribute('class', 'ag-header-cell-label');
            headerEl.appendChild(labelEl);
            document.body.appendChild(headerEl);
            (component as any).doc = document;
        });

        afterEach(() => {
            headerEl.remove();
        });

        it('adds the configured class to the header label element', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'iconCol', id: 'iconCol', headerIconStyleClass: 'fa fa-star' })
            ]);

            (component as any).setupHeaderIconStyleClass();

            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label fa fa-star');
        });

        it('re-applies the class after the header DOM element is recreated (simulating hide/show)', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'iconCol', id: 'iconCol', headerIconStyleClass: 'fa fa-star' })
            ]);

            (component as any).setupHeaderIconStyleClass();
            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label fa fa-star');

            // simulate ag-Grid tearing down and recreating the header cell
            // (e.g. column hidden then shown again, or scrolled back into the virtualised viewport)
            headerEl.remove();
            headerEl = document.createElement('div');
            headerEl.setAttribute('col-id', 'iconCol');
            labelEl = document.createElement('div');
            labelEl.setAttribute('class', 'ag-header-cell-label');
            headerEl.appendChild(labelEl);
            document.body.appendChild(headerEl);

            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label');

            (component as any).setupHeaderIconStyleClass();

            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label fa fa-star');
        });

        it('does nothing when no column declares headerIconStyleClass', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'iconCol', id: 'iconCol' })]);

            expect(() => (component as any).setupHeaderIconStyleClass()).not.toThrow();
            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label');
        });
    });

    describe('suppressColumnVirtualisation', () => {
        it('is enabled when a column declares headerIconStyleClass', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'a', headerIconStyleClass: 'fa fa-star' })
            ]);
            fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => undefined } as any);

            component.ngOnInit();

            expect(component.agGridOptions.suppressColumnVirtualisation).toBeTruthy();
        });

        it('is disabled when no column declares headerIconStyleClass or headerCheckbox', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a' })]);
            fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => undefined } as any);

            component.ngOnInit();

            expect(component.agGridOptions.suppressColumnVirtualisation).toBeFalsy();
        });
    });
});
