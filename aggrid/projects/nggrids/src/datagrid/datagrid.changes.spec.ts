import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn, NULL_VALUE } from './datagrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * svyOnChanges / value-getter / formatter tests for DataGrid. ag-grid is mocked via the agGrid()
 * signal; the fixture grid's onGridReadyBase is stubbed so the auto-created grid never touches a
 * live api during these logic tests. We drive OUR change-dispatch branches and the default
 * valueGetter/valueFormatter column functions.
 */
describe('DataGrid - svyOnChanges & value functions', () => {
    let fixture: ComponentFixture<DataGrid>;
    let component: DataGrid;
    let api: any;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return { columnid: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as DataGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            setGridOption: vi.fn(),
            setRowCount: vi.fn(),
            setColumnsVisible: vi.fn(),
            setColumnWidths: vi.fn(),
            getColumn: vi.fn().mockReturnValue({ getActualWidth: () => 100 }),
            getRowGroupColumns: vi.fn().mockReturnValue([]),
            getEditingCells: vi.fn().mockReturnValue([]),
            applyColumnState: vi.fn(),
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

    describe('svyOnChanges - responsiveHeight', () => {
        it('calls setHeight', () => {
            const spy = vi.spyOn(component, 'setHeight').mockImplementation(() => {});
            component.svyOnChanges({ responsiveHeight: { currentValue: 100, previousValue: 0, firstChange: false } } as any);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('svyOnChanges - visible first render', () => {
        it('updates column defs the first time the table becomes visible', () => {
            (component as any).isRendered = false;
            const spy = vi.spyOn(component, 'updateColumnDefs').mockImplementation(() => {});
            component.svyOnChanges({ visible: { currentValue: true, previousValue: false, firstChange: false } } as any);
            expect(spy).toHaveBeenCalled();
            expect((component as any).isRendered).toBe(true);
        });
    });

    describe('svyOnChanges - myFoundset cleared', () => {
        it('refreshes the datasource and detaches the listener when the foundset is removed', () => {
            const removeListener = vi.fn();
            (component as any).removeChangeListenerFunction = removeListener;
            fixture.componentRef.setInput('myFoundset', undefined);
            const refreshSpy = vi.spyOn(component, 'refreshDatasource').mockImplementation(() => {});
            component.svyOnChanges({ myFoundset: { currentValue: undefined, previousValue: { foundsetId: 1 }, firstChange: false } } as any);
            expect(removeListener).toHaveBeenCalled();
            expect(refreshSpy).toHaveBeenCalled();
        });
    });

    describe('svyOnChanges - internal signal syncs', () => {
        it('syncs columnState into the private signal', () => {
            fixture.componentRef.setInput('columnState', '{"columnState":[]}');
            component.svyOnChanges({ columnState: { currentValue: '{"columnState":[]}', previousValue: undefined, firstChange: false } } as any);
            expect(component._columnState()).toBe('{"columnState":[]}');
        });

        it('syncs checkboxSelection into the private signal', () => {
            fixture.componentRef.setInput('checkboxSelection', true);
            component.svyOnChanges({ checkboxSelection: { currentValue: true, previousValue: false, firstChange: false } } as any);
            expect(component._checkboxSelection()).toBe(true);
        });
    });

    describe('displayValueGetter', () => {
        function getterParams(field: string, value: any, rowPinned: any = null): any {
            return {
                colDef: { field },
                column: { colId: field },
                data: { [field]: value },
                node: { rowPinned },
                context: { componentParent: component }
            };
        }

        it('returns empty string when there is no data', () => {
            expect(component.displayValueGetter({ colDef: { field: 'a' }, data: null } as any)).toBe('');
        });

        it('returns NULL_VALUE for a null cell on a normal row (so grouping works)', () => {
            expect(component.displayValueGetter(getterParams('a', null))).toBe(NULL_VALUE);
        });

        it('returns real null for a null cell on a pinned row', () => {
            expect(component.displayValueGetter(getterParams('a', null, 'bottom'))).toBeNull();
        });

        it('returns the raw value when present', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
            component.state.columns = {};
            expect(component.displayValueGetter(getterParams('a', 'hello'))).toBe('hello');
        });
    });

    describe('displayValueFormatter', () => {
        function fmtParams(field: string, value: any, rowPinned: any = null): any {
            return {
                colDef: { field },
                column: { colId: field },
                data: { [field]: value },
                value,
                node: { rowPinned },
                context: { componentParent: component }
            };
        }

        it('returns empty string with no data', () => {
            expect(component.displayValueFormatter({ colDef: { field: 'a' }, data: null } as any)).toBe('');
        });

        it('unwraps a displayValue object', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
            component.state.columns = {};
            expect(component.displayValueFormatter(fmtParams('a', { displayValue: 'shown', realValue: 1 }))).toBe('shown');
        });

        it('formats a value through the grid when the column has a format and no valuelist', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a', format: { display: 'x' } })]);
            component.state.columns = {};
            vi.spyOn(component, 'format').mockReturnValue('FMT');
            expect(component.displayValueFormatter(fmtParams('a', 'raw'))).toBe('FMT');
        });
    });

    describe('getColumnFormat', () => {
        it('returns null for a column without a format', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
            component.state.columns = {};
            expect(component.getColumnFormat('a')).toBeNull();
        });
    });

    describe('getIconElement', () => {
        it('wraps the icon style class', () => {
            expect(component.getIconElement('fa fa-x')).toBe('<i class="fa fa-x"/>');
        });
    });

    describe('getCheckboxEditorToggleValue edge cases', () => {
        it('toggles y/n short forms', () => {
            expect(component.getCheckboxEditorToggleValue('y')).toBe('n');
            expect(component.getCheckboxEditorToggleValue('n')).toBe('y');
        });

        it('warns and returns null for an untoggleable value', () => {
            const spy = vi.fn();
            Object.defineProperty(component.log, 'warn', { configurable: true, get: () => spy });
            expect(component.getCheckboxEditorToggleValue('weird')).toBeNull();
            expect(spy).toHaveBeenCalled();
        });
    });
});

