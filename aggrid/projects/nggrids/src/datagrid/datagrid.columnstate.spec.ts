import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Column-state restore error-path coverage for DataGrid. ag-grid is mocked via the agGrid()
 * signal; onGridReadyBase is stubbed and groupManager stubbed. We drive OUR restoreColumnsState
 * guards (invalid format, duplicate ids, columns missing from the model) and the
 * innerColumnStateOnError handler, which are not reachable from the happy-path render tests.
 */
describe('DataGrid - column state restore error paths', () => {
    let fixture: ComponentFixture<DataGrid>;
    let component: DataGrid;
    let api: any;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return { columnid: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as DataGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            applyColumnState: vi.fn(),
            setRowGroupColumns: vi.fn(),
            setFilterModel: vi.fn(),
            getColumnState: vi.fn().mockReturnValue([]),
            getFilterModel: vi.fn().mockReturnValue({}),
            getRowGroupColumns: vi.fn().mockReturnValue([]),
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
        (component as any).groupManager = { removeFoundsetRefAtLevel: () => undefined };
        (component as any).agGridElementRef = () => ({ nativeElement: document.createElement('div') });
    });

    describe('restoreColumnsState guards', () => {
        it('errors on an invalid (unparseable) column state format', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', columnid: 'a' })]);
            (component as any)._columnState.set('not-json');
            const errSpy = vi.spyOn(component, 'innerColumnStateOnError').mockImplementation(() => {});
            component.restoreColumnsState({ columns: true, filter: false, sort: false });
            expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('invalid format'));
        });

        it('errors when not all columns have unique ids', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: undefined, columnid: undefined }), makeColumn({ id: undefined, columnid: undefined })]);
            (component as any)._columnState.set(JSON.stringify({ columnState: [{ colId: 'x' }] }));
            const errSpy = vi.spyOn(component, 'innerColumnStateOnError').mockImplementation(() => {});
            component.restoreColumnsState({ columns: true, filter: false, sort: false });
            expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('not all columns have id'));
        });

        it('errors when a saved column no longer exists in the model', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', columnid: 'a' })]);
            component.state.columns = {};
            (component as any)._columnState.set(JSON.stringify({ columnState: [{ colId: 'a' }, { colId: 'gone' }] }));
            const errSpy = vi.spyOn(component, 'innerColumnStateOnError').mockImplementation(() => {});
            component.restoreColumnsState({ columns: true, filter: false, sort: false });
            expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('different columns'), expect.anything(), expect.arrayContaining(['gone']));
        });

        it('does nothing when there is no saved state', () => {
            (component as any)._columnState.set(undefined);
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a' })]);
            component.restoreColumnsState();
            expect(api.applyColumnState).not.toHaveBeenCalled();
        });
    });

    describe('innerColumnStateOnError', () => {
        it('persists the current state and calls the error handler when one is configured', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', columnid: 'a' })]);
            const onError = vi.fn();
            fixture.componentRef.setInput('columnStateOnError', onError);
            vi.spyOn(component, 'storeColumnsState').mockImplementation(() => {});
            vi.spyOn(component, 'createJSEvent').mockReturnValue({} as any);
            const callSpy = vi.spyOn(component.servoyApi(), 'callServerSideApi').mockResolvedValue(undefined as any);
            component.innerColumnStateOnError('boom', ['x'], ['y']);
            expect(callSpy).toHaveBeenCalledWith('columnStateOnErrorHandler', expect.any(Array));
        });

        it('logs to the console when no error handler is configured', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', columnid: 'a' })]);
            fixture.componentRef.setInput('columnStateOnError', undefined);
            vi.spyOn(component, 'storeColumnsState').mockImplementation(() => {});
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            component.innerColumnStateOnError('boom');
            expect(consoleSpy).toHaveBeenCalledWith('boom');
        });
    });

    describe('restoreColumnsState happy path', () => {
        it('applies column state, row groups, filter and sort from a valid saved state', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', columnid: 'a' }), makeColumn({ id: 'b', columnid: 'b' })]);
            component.state.columns = {};
            const saved = {
                columnState: [{ colId: 'a', sort: 'asc', sortIndex: 0 }, { colId: 'b' }],
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
    });
});

