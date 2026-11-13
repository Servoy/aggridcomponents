import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Logic-focused tests for PowerGrid. ag-grid is mocked via a fake api object returned from the
 * agGrid() signal; we never instantiate a real grid. Every assertion targets OUR code: column
 * lookup, value formatting, cell renderers, menu building, group bookkeeping, click dispatch,
 * sort model application and the export cell callback.
 */
describe('PowerGrid - logic', () => {
    let fixture: ComponentFixture<PowerGrid>;
    let component: PowerGrid;
    let api: any;

    function makeColumn(overrides: Partial<PowerGridColumn> = {}): PowerGridColumn {
        return { dataprovider: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as PowerGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            getRowGroupColumns: vi.fn().mockReturnValue([]),
            getEditingCells: vi.fn().mockReturnValue([]),
            applyColumnState: vi.fn(),
            setRowGroupColumns: vi.fn(),
            setSideBarVisible: vi.fn(),
            setFilterModel: vi.fn(),
            getColumn: vi.fn(),
            exportDataAsCsv: vi.fn(),
            exportDataAsExcel: vi.fn(),
            setGridOption: vi.fn(),
            ...overrides
        };
        // any method not explicitly mocked (e.g. async calls from the real grid's onGridReady) is a safe no-op
        return new Proxy(base, { get: (t, p: string) => (p in t ? t[p] : vi.fn()) });
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, PowerGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(PowerGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
        api = fakeApi();
        (component as any).agGrid = () => ({ api });
        // the fixture's real grid fires onGridReady asynchronously; neutralise the base hook so
        // its popup/observer setup (which needs a live DOM api) does not throw during these logic tests
        vi.spyOn(component as any, 'onGridReadyBase').mockImplementation(() => { /* no-op */ });
        // ngOnInit never runs here; make destroy a no-op so TestBed teardown can't throw
        (component as any).destroy = () => undefined;
    });

    describe('getColumn / getColumnIndex', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ id: 'first', dataprovider: 'FirstDP' }),
                makeColumn({ id: 'second', dataprovider: 'SecondDP' })
            ]);
        });

        it('finds a column by its id', () => {
            expect(component.getColumn('second').id).toBe('second');
        });

        it('finds a column by its lowercased dataprovider', () => {
            expect(component.getColumn('firstdp').id).toBe('first');
        });

        it('returns null for an unknown column', () => {
            expect(component.getColumn('nope')).toBeNull();
        });

        it('returns the index of a column by id', () => {
            expect(component.getColumnIndex('second')).toBe(1);
        });

        it('returns -1 for an unknown column index', () => {
            expect(component.getColumnIndex('nope')).toBe(-1);
        });
    });

    describe('getColumnFormat', () => {
        it('returns the column format when present', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c', format: { display: 'x' } })]);
            expect(component.getColumnFormat('c')).toEqual({ display: 'x' });
        });

        it('returns null when the column has no format', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c' })]);
            expect(component.getColumnFormat('c')).toBeNull();
        });
    });

    describe('abstract overrides', () => {
        it('getEditingRowIndex returns the node rowIndex', () => {
            expect(component.getEditingRowIndex({ node: { rowIndex: 4 } })).toBe(4);
        });

        it('isInFindMode is always false', () => {
            expect(component.isInFindMode()).toBe(false);
        });

        it('hasValuelistResolvedDisplayData is always false', () => {
            expect(component.hasValuelistResolvedDisplayData()).toBe(false);
        });

        it('getValuelist reads the valuelist off the matched column', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c', valuelist: ['vl'] as any })]);
            expect(component.getValuelist({ column: { colId: 'c' } })).toEqual(['vl']);
        });

        it('getValuelistForFilter returns null when the grid api is not ready', () => {
            (component as any).agGrid = () => undefined;
            expect(component.getValuelistForFilter({ column: { colId: 'c' } })).toBeNull();
        });

        it('getValuelistForFilter returns the valuelist when the grid api is ready', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c', valuelist: ['vl'] as any })]);
            expect(component.getValuelistForFilter({ column: { colId: 'c' } })).toEqual(['vl']);
        });
    });

    describe('isColumnEditable', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('enabled', true);
            fixture.componentRef.setInput('readOnly', false);
        });

        it('is false for a pinned (footer) row', () => {
            expect(component.isColumnEditable({ node: { rowPinned: 'bottom' }, colDef: {} })).toBe(false);
        });

        it('is false for a checkbox column clicked outside the icon', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c', editType: 'CHECKBOX' } as any)]);
            const args = { node: {}, colDef: { field: 'c' }, event: { target: { tagName: 'DIV' } } };
            expect(component.isColumnEditable(args)).toBe(false);
        });

        it('is true for an enabled editable cell', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c' })]);
            expect(component.isColumnEditable({ node: {}, colDef: { field: 'c' } })).toBe(true);
        });

        it('is false when the grid is read-only', () => {
            fixture.componentRef.setInput('readOnly', true);
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c' })]);
            expect(component.isColumnEditable({ node: {}, colDef: { field: 'c' } })).toBe(false);
        });

        it('delegates to the isEditableCallback when set', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c' })]);
            component.isEditableCallback = vi.fn().mockReturnValue(false);
            expect(component.isColumnEditable({ node: {}, colDef: { field: 'c' } })).toBe(false);
            expect(component.isEditableCallback).toHaveBeenCalled();
        });
    });

    describe('mergeConfig / isPlainObject', () => {
        it('merges source over target', () => {
            expect(component.mergeConfig({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
        });

        it('clones the target when there is no source', () => {
            const target = { a: 1 };
            const merged = component.mergeConfig(target, null);
            expect(merged).toEqual({ a: 1 });
            expect(merged).not.toBe(target);
        });

        it('isPlainObject is true for an object literal', () => {
            expect(component.isPlainObject({})).toBe(true);
        });

        it('isPlainObject is false for null and arrays', () => {
            expect(component.isPlainObject(null)).toBe(false);
            expect(component.isPlainObject([])).toBe(false);
        });
    });

    describe('getIconElement / getIconCheckboxEditor', () => {
        it('wraps an icon style class in an <i> tag', () => {
            expect(component.getIconElement('fa fa-x')).toBe('<i class="fa fa-x"/>');
        });

        it('returns the checked icon default for a truthy state', () => {
            expect(component.getIconCheckboxEditor(1)).toBe('far fa-check-square');
        });

        it('returns the unchecked icon default for a falsy state', () => {
            expect(component.getIconCheckboxEditor(0)).toBe('far fa-square');
        });
    });

    describe('getNodeGroupInfo', () => {
        it('collects the group hierarchy from the node and its parents', () => {
            const node = {
                field: 'city',
                key: 'Paris',
                parent: {
                    level: 0,
                    group: true,
                    field: 'country',
                    key: 'France',
                    parent: { level: -1, group: false }
                }
            };
            const info = component.getNodeGroupInfo(node);
            expect(info.rowGroupFields).toEqual(['country', 'city']);
            expect(info.rowGroupKeys).toEqual(['France', 'Paris']);
        });
    });

    describe('removeNodeAtLevel', () => {
        it('removes all keys at level 0', () => {
            const node: any = { a: {}, b: {} };
            component.removeNodeAtLevel(node, 0);
            expect(node).toEqual({});
        });

        it('recurses to the given level', () => {
            const node: any = { a: { x: {}, y: {} } };
            component.removeNodeAtLevel(node, 1);
            expect(node).toEqual({ a: {} });
        });

        it('is a no-op for a null node', () => {
            expect(() => component.removeNodeAtLevel(null, 0)).not.toThrow();
        });
    });

    describe('createValueFormatter', () => {
        it('formats a plain value', () => {
            vi.spyOn(component, 'format').mockImplementation((v: any) => 'F:' + v);
            const fmt = component.createValueFormatter({ display: 'x' });
            expect(fmt({ value: 'abc' })).toBe('F:abc');
        });

        it('unwraps a displayValue object before formatting', () => {
            vi.spyOn(component, 'format').mockImplementation((v: any) => 'F:' + v);
            const fmt = component.createValueFormatter({ display: 'x' });
            expect(fmt({ value: { displayValue: 'dv', realValue: 1 } })).toBe('F:dv');
        });

        it('returns empty string for null/undefined values', () => {
            const fmt = component.createValueFormatter({ display: 'x' });
            expect(fmt({ value: null })).toBe('');
            expect(fmt({ value: undefined })).toBe('');
        });
    });

    describe('column callback wrappers', () => {
        it('createColumnCallbackFunctionFromString passes the resolved colId and row data', () => {
            const spy = vi.fn().mockReturnValue('out');
            const wrapped = component.createColumnCallbackFunctionFromString(spy);
            const result = wrapped({ node: { rowIndex: 3 }, data: { a: 1 }, colDef: { colId: 'cid' }, value: 'v' });
            expect(result).toBe('out');
            expect(spy).toHaveBeenCalledWith(3, { a: 1 }, 'cid', 'v', expect.anything());
        });

        it('createColumnCallbackFunctionFromString falls back to colDef.field when colId is missing', () => {
            const spy = vi.fn();
            const wrapped = component.createColumnCallbackFunctionFromString(spy);
            wrapped({ node: { rowIndex: 0 }, data: {}, colDef: { field: 'fld' }, value: 1 });
            expect(spy.mock.calls[0][2]).toBe('fld');
        });

        it('createPivotComparatorCallbackFunctionFromString forwards both values', () => {
            const spy = vi.fn().mockReturnValue(-1);
            const wrapped = component.createPivotComparatorCallbackFunctionFromString(spy);
            expect(wrapped('a', 'b')).toBe(-1);
            expect(spy).toHaveBeenCalledWith('a', 'b');
        });

        it('createColumnValueGetterCallbackFunctionFromString passes row context', () => {
            const spy = vi.fn().mockReturnValue('g');
            const wrapped = component.createColumnValueGetterCallbackFunctionFromString(spy);
            expect(wrapped({ node: { rowIndex: 2 }, data: {}, colDef: { colId: 'c' } })).toBe('g');
        });

        it('createAggCustomFunctionFromString forwards the values array', () => {
            const spy = vi.fn().mockReturnValue(10);
            const wrapped = component.createAggCustomFunctionFromString(spy);
            expect(wrapped([1, 2, 3])).toBe(10);
            expect(spy).toHaveBeenCalledWith([1, 2, 3]);
        });
    });

    describe('getFooterData / getHeaderData', () => {
        it('builds footer data keyed by lowercase dataprovider', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ dataprovider: 'MyCol', footerText: 'F' }),
                makeColumn({ dataprovider: 'OtherCol' })
            ]);
            expect(component.getFooterData()).toEqual([{ mycol: 'F', othercol: null }]);
        });

        it('returns an empty array when no footer text exists', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ dataprovider: 'MyCol' })]);
            expect(component.getFooterData()).toEqual([]);
        });
    });

    describe('groupRowInnerRenderer', () => {
        it('renders the group key label', () => {
            const label = component.groupRowInnerRenderer({ node: { key: 'France' } });
            expect(label).toContain('France');
            expect(label).toContain('ag-group-label');
        });

        it('appends aggregate values when aggData is present', () => {
            const params = {
                node: { key: 'France', aggData: { total: 100 } },
                api: { getColumn: () => ({ aggFunc: 'sum', getColDef: () => ({ headerName: 'Total' }) }) }
            };
            const label = component.groupRowInnerRenderer(params);
            expect(label).toContain('sum(Total)');
            expect(label).toContain('100');
        });
    });

    describe('getMainMenuItems', () => {
        it('returns the configured items intersected with the defaults', () => {
            component.agMainMenuItemsConfig = { rowGroup: true, pinSubMenu: false };
            (component as any).customMainMenu = () => null;
            (component as any).registrationService = { powergridService: {} };
            const params = {
                context: { componentParent: component },
                column: { getColDef: () => ({ field: 'c' }), getColId: () => 'c' },
                defaultItems: ['rowGroup', 'resetColumns']
            };
            expect(component.getMainMenuItems(params)).toEqual(['rowGroup']);
        });

        it('defaults to rowGroup/rowUnGroup when no config is set', () => {
            component.agMainMenuItemsConfig = {};
            (component as any).customMainMenu = () => null;
            (component as any).registrationService = { powergridService: {} };
            const params = {
                context: { componentParent: component },
                column: { getColDef: () => ({ field: 'c' }), getColId: () => 'c' },
                defaultItems: ['rowGroup', 'rowUnGroup', 'resetColumns']
            };
            expect(component.getMainMenuItems(params)).toEqual(['rowGroup', 'rowUnGroup']);
        });
    });

    describe('cell click dispatch', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('enabled', true);
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c' })]);
        });

        it('onCellClicked fires onCellClick with resolved row data', () => {
            const onCellClick = vi.fn();
            fixture.componentRef.setInput('onCellClick', onCellClick);
            const params = { data: { a: 1 }, colDef: { colId: 'c', field: 'c' }, column: { colId: 'c' }, value: 'v', event: { target: { closest: () => null } } };
            component.onCellClicked(params);
            expect(onCellClick).toHaveBeenCalled();
            expect(onCellClick.mock.calls[0][0]).toEqual({ a: 1 });
        });

        it('onCellContextMenu fires onCellRightClick', () => {
            const onCellRightClick = vi.fn();
            fixture.componentRef.setInput('onCellRightClick', onCellRightClick);
            const params = { data: { a: 1 }, colDef: { colId: 'c', field: 'c' }, column: { colId: 'c' }, value: 'v', event: { target: { closest: () => null } } };
            component.onCellContextMenu(params);
            expect(onCellRightClick).toHaveBeenCalled();
        });

        it('onCellDoubleClicked ignores events while editing', () => {
            api.getEditingCells.mockReturnValue([{}]);
            const onCellDoubleClick = vi.fn();
            fixture.componentRef.setInput('onCellDoubleClick', onCellDoubleClick);
            component.onCellDoubleClicked({ data: {}, colDef: {}, column: {} });
            expect(onCellDoubleClick).not.toHaveBeenCalled();
        });
    });

    describe('applySortModel', () => {
        it('maps the sort model to column state with sortIndex', () => {
            component.applySortModel([{ colId: 'a', sort: 'asc' }, { colId: 'b', sort: 'desc' }]);
            expect(api.applyColumnState).toHaveBeenCalledWith({
                state: [
                    { colId: 'a', sort: 'asc', sortIndex: 0 },
                    { colId: 'b', sort: 'desc', sortIndex: 1 }
                ],
                defaultState: { sort: null }
            });
        });
    });

    describe('exportData', () => {
        it('applies defaults and exports to excel by default', () => {
            component.exportData(undefined, undefined, undefined, undefined, undefined, undefined);
            expect(api.exportDataAsExcel).toHaveBeenCalled();
            const params = api.exportDataAsExcel.mock.calls[0][0];
            expect(params.fileName).toBe('export.xlsx');
            expect(params.columnGroups).toBe(true);
        });

        it('exports as CSV when asCSV is true', () => {
            component.exportData('f.csv', true, false, false, false, true);
            expect(api.exportDataAsCsv).toHaveBeenCalled();
            expect(api.exportDataAsExcel).not.toHaveBeenCalled();
        });
    });

    describe('isTableGrouped', () => {
        it('is false when there are no row group columns', () => {
            expect(component.isTableGrouped()).toBe(false);
        });

        it('is true when row group columns exist', () => {
            api.getRowGroupColumns.mockReturnValue([{}]);
            expect(component.isTableGrouped()).toBe(true);
        });
    });

    describe('removeRowExpandedState', () => {
        it('removes a nested expanded key', () => {
            component.__internalExpandedState.set({ a: { b: {} } });
            component.removeRowExpandedState(['a', 'b']);
            expect(component.__internalExpandedState()).toEqual({ a: {} });
        });

        it('is a no-op when state is empty', () => {
            component.__internalExpandedState.set(undefined);
            expect(() => component.removeRowExpandedState(['a'])).not.toThrow();
        });
    });
});



