import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for the DataGrid column-state reconciliation helpers, viewport diffing, the ag-grid
 * sort-model reader, record lookup and the state restore flow. ag-grid is mocked through the
 * agGrid() signal; the auto-created fixture grid's onGridReadyBase hook is stubbed.
 */
describe('DataGrid - column state & helpers', () => {
    let fixture: ComponentFixture<DataGrid>;
    let component: DataGrid;
    let api: any;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return { columnid: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as DataGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            getColumnState: vi.fn().mockReturnValue([]),
            getFilterModel: vi.fn().mockReturnValue({}),
            getRowGroupColumns: vi.fn().mockReturnValue([]),
            applyColumnState: vi.fn(),
            setRowGroupColumns: vi.fn(),
            setFilterModel: vi.fn(),
            ...overrides
        };
        return new Proxy(base, { get: (t, p: string) => (p in t ? t[p] : vi.fn()) });
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
        api = fakeApi();
        (component as any).agGrid = () => ({ api });
        vi.spyOn(component as any, 'onGridReadyBase').mockImplementation(() => { /* no-op */ });
        // ngOnInit never runs in these pure-logic specs, so stub the pieces TestBed teardown touches
        (component as any).groupManager = { removeFoundsetRefAtLevel: () => undefined };
    });

    describe('isSameViewportRows', () => {
        it('is true for arrays with the same ids in order', () => {
            const a = [{ _svyRowId: '1' }, { _svyRowId: '2' }];
            const b = [{ _svyRowId: '1' }, { _svyRowId: '2' }];
            expect(component.isSameViewportRows(a, b)).toBe(true);
        });

        it('is false when an id differs', () => {
            const a = [{ _svyRowId: '1' }];
            const b = [{ _svyRowId: '9' }];
            expect(component.isSameViewportRows(a, b)).toBe(false);
        });

        it('is false for differing lengths or empty input', () => {
            expect(component.isSameViewportRows([{ _svyRowId: '1' }], [])).toBe(false);
            expect(component.isSameViewportRows([], [])).toBe(false);
        });
    });

    describe('haveAllColumnsUniqueIds', () => {
        it('is true when every column has a unique id', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a' }), makeColumn({ id: 'b' })]);
            expect(component.haveAllColumnsUniqueIds()).toBe(true);
        });

        it('is false when two columns share an id', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a' }), makeColumn({ id: 'a' })]);
            expect(component.haveAllColumnsUniqueIds()).toBe(false);
        });

        it('derives an id from the dataprovider idForFoundset', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: undefined, dataprovider: { idForFoundset: 'name' } })]);
            expect(component.haveAllColumnsUniqueIds()).toBe(true);
        });

        it('is false when a column has no id/dataprovider', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: undefined })]);
            expect(component.haveAllColumnsUniqueIds()).toBe(false);
        });
    });

    describe('getMissingColumnIdsFromModel / getMissingColumnIdsFromState', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'a', id: 'a' }),
                makeColumn({ columnid: 'b', id: 'b' })
            ]);
            component.state.columns = {};
        });

        it('reports a saved column that is no longer in the model', () => {
            const json = { columnState: [] };
            expect(component.getMissingColumnIdsFromModel(['a', 'gone'], json)).toEqual(['gone']);
        });

        it('reports a model column that is absent from the saved state', () => {
            const json = { columnState: [] };
            expect(component.getMissingColumnIdsFromState(['a'], json)).toEqual(['b']);
        });

        it('finds no mismatch when model and state agree', () => {
            const json = { columnState: [] };
            expect(component.getMissingColumnIdsFromModel(['a', 'b'], json)).toEqual([]);
            expect(component.getMissingColumnIdsFromState(['a', 'b'], json)).toEqual([]);
        });
    });

    describe('getAgGridSortModel', () => {
        it('reads sorted columns in sortIndex order', () => {
            api.getColumnState.mockReturnValue([
                { colId: 'a', sort: 'asc', sortIndex: 1 },
                { colId: 'b', sort: 'desc', sortIndex: 0 },
                { colId: 'c', sort: null, sortIndex: null }
            ]);
            expect(component.getAgGridSortModel()).toEqual([
                { colId: 'b', sort: 'desc', sortIndex: 0 },
                { colId: 'a', sort: 'asc', sortIndex: 1 }
            ]);
        });
    });

    describe('storeColumnsState', () => {
        it('persists a new column state and emits the change', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a' })]);
            api.getColumnState.mockReturnValue([{ colId: 'a' }]);
            const emitSpy = vi.fn();
            component.columnStateChange.subscribe(emitSpy);
            component.storeColumnsState(true);
            expect(emitSpy).toHaveBeenCalled();
            expect(component._columnState()).toContain('"colId":"a"');
        });

        it('does nothing when there are no columns', () => {
            component.storeColumnsState();
            expect(api.getColumnState).not.toHaveBeenCalled();
        });
    });

    describe('getRecord', () => {
        it('returns the record ref resolved from the foundset by row id', () => {
            const rec = { _svyRowId: 'r1' };
            const foundset = { getRecordRefByRowID: vi.fn().mockReturnValue(rec) };
            vi.spyOn(component, 'getFoundSetByFoundsetUUID').mockReturnValue(foundset as any);
            const result = component.getRecord({ data: { _svyFoundsetUUID: 'u', _svyRowId: 'r1' } });
            expect(result).toBe(rec);
            expect(foundset.getRecordRefByRowID).toHaveBeenCalledWith('r1');
        });

        it('returns null when the params have no data', () => {
            expect(component.getRecord({})).toBeNull();
        });
    });

    describe('getDetailItemState', () => {
        it('returns the item unchanged when there is no modelViewport', () => {
            const item = { name: 'x' };
            expect(component.getDetailItemState(item, 0)).toBe(item);
        });

        it('merges the row model from the modelViewport', () => {
            const item = { name: 'x', modelViewport: [{ a: 1 }] };
            const state = component.getDetailItemState(item, 0);
            expect(state.model).toEqual({ a: 1 });
            expect(state.name).toBe('x');
        });

        it('returns falsy items as-is', () => {
            expect(component.getDetailItemState(null, 0)).toBeNull();
        });
    });

    describe('restoreColumnsState', () => {
        it('applies the saved column state, row groups, filters and sort', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a' }), makeColumn({ id: 'b' })]);
            component.state.columns = {};
            const saved = {
                columnState: [{ colId: 'a', sort: 'desc', sortIndex: 0 }, { colId: 'b' }],
                rowGroupColumnsState: ['a'],
                filterModel: { a: { type: 'equals' } }
            };
            (component as any)._columnState.set(JSON.stringify(saved));
            const applySortSpy = vi.spyOn(component, 'applySortModel').mockImplementation(() => {});

            component.restoreColumnsState({ columns: true, filter: true, sort: true });

            expect(api.applyColumnState).toHaveBeenCalled();
            expect(api.setRowGroupColumns).toHaveBeenCalledWith(['a']);
            expect(api.setFilterModel).toHaveBeenCalledWith({ a: { type: 'equals' } });
            expect(applySortSpy).toHaveBeenCalled();
        });

        it('does nothing when there is no saved state', () => {
            (component as any)._columnState.set(undefined);
            component.restoreColumnsState();
            expect(api.applyColumnState).not.toHaveBeenCalled();
        });
    });
});

