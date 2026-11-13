import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Logic-focused tests for DataGrid. ag-grid is mocked with a fake api object returned from the
 * agGrid() signal. Assertions target OUR code: column id/index/format resolution, find mode,
 * checkbox editor value toggling, sort-string parsing, config merging, group info extraction,
 * foundset sort-model building, cell dispatch, and the FoundsetManager helpers.
 */
describe('DataGrid - logic', () => {
    let fixture: ComponentFixture<DataGrid>;
    let component: DataGrid;
    let api: any;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return { columnid: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as DataGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            getRowGroupColumns: vi.fn().mockReturnValue([]),
            getEditingCells: vi.fn().mockReturnValue([]),
            applyColumnState: vi.fn(),
            setGridOption: vi.fn(),
            getDisplayedRowAtIndex: vi.fn(),
            getRowNode: vi.fn(),
            forEachNode: vi.fn(),
            getSelectedNodes: vi.fn().mockReturnValue([]),
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

    describe('getColumnID', () => {
        it('uses the explicit columnid when present', () => {
            expect(component.getColumnID({ columnid: 'cid' }, 2)).toBe('cid');
        });

        it('derives an id from the dataprovider idForFoundset and index', () => {
            expect(component.getColumnID({ dataprovider: { idForFoundset: 'name' } }, 3)).toBe('name:3');
        });

        it('falls back to col_<idx> when nothing is set', () => {
            expect(component.getColumnID({}, 5)).toBe('col_5');
        });
    });

    describe('getColumn / getColumnIndex', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'a', id: 'a' }),
                makeColumn({ columnid: 'b', id: 'b' })
            ]);
            component.state.columns = {};
        });

        it('finds a column by id and caches it', () => {
            expect(component.getColumn('b').id).toBe('b');
            // second lookup hits the cache
            expect(component.getColumn('b').id).toBe('b');
            expect(component.state.columns['b']).toBeDefined();
        });

        it('returns null for an unknown column', () => {
            expect(component.getColumn('zzz')).toBeNull();
        });

        it('returns the column index by id', () => {
            expect(component.getColumnIndex('b')).toBe(1);
        });
    });

    describe('getColIDs', () => {
        it('collects all column ids matching the idForFoundset', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'x', id: 'x', dataprovider: { idForFoundset: 'name' } }),
                makeColumn({ columnid: undefined, dataprovider: { idForFoundset: 'name' } }),
                makeColumn({ columnid: 'y', id: 'y', dataprovider: { idForFoundset: 'other' } })
            ]);
            const ids = component.getColIDs('name');
            expect(ids).toContain('x');
            expect(ids.length).toBe(2);
        });

        it('returns an empty array for a falsy idForFoundset', () => {
            expect(component.getColIDs(null)).toEqual([]);
        });
    });

    describe('getColumnFormat', () => {
        it('returns the column format', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c', columnid: 'c', format: { display: 'x' } })]);
            component.state.columns = {};
            expect(component.getColumnFormat('c')).toEqual({ display: 'x' });
        });
    });

    describe('isInFindMode', () => {
        it('is false when there is no foundset', () => {
            component.foundset = undefined as any;
            expect(component.isInFindMode()).toBe(false);
        });

        it('reflects the foundset findMode flag', () => {
            component.foundset = { foundset: { findMode: true } } as any;
            expect(component.isInFindMode()).toBe(true);
        });
    });

    describe('getEditingRowIndex / getFoundsetIndexFromEvent', () => {
        it('returns rowIndex + 1 for a non-grouped table', () => {
            vi.spyOn(component, 'isTableGrouped').mockReturnValue(false);
            expect(component.getEditingRowIndex({ node: { rowIndex: 4 } })).toBe(5);
        });

        it('returns -1 for a grouped table', () => {
            vi.spyOn(component, 'isTableGrouped').mockReturnValue(true);
            expect(component.getEditingRowIndex({ node: { rowIndex: 4 } })).toBe(-1);
        });
    });

    describe('getCheckboxEditorToggleValue', () => {
        it('toggles textual yes/no pairs', () => {
            expect(component.getCheckboxEditorToggleValue('yes')).toBe('no');
            expect(component.getCheckboxEditorToggleValue('no')).toBe('yes');
            expect(component.getCheckboxEditorToggleValue('t')).toBe('f');
            expect(component.getCheckboxEditorToggleValue('false')).toBe('true');
        });

        it('toggles numeric values', () => {
            expect(component.getCheckboxEditorToggleValue(1)).toBe(0);
            expect(component.getCheckboxEditorToggleValue(0)).toBe(1);
        });

        it('returns 1 for null', () => {
            expect(component.getCheckboxEditorToggleValue(null)).toBe(1);
        });
    });

    describe('getCheckboxEditorBooleanValue', () => {
        it('maps truthy textual values to true', () => {
            expect(component.getCheckboxEditorBooleanValue('yes')).toBe(true);
            expect(component.getCheckboxEditorBooleanValue('t')).toBe(true);
        });

        it('maps falsy textual values to false', () => {
            expect(component.getCheckboxEditorBooleanValue('no')).toBe(false);
            expect(component.getCheckboxEditorBooleanValue('')).toBe(false);
        });

        it('maps numbers by sign', () => {
            expect(component.getCheckboxEditorBooleanValue(2)).toBe(true);
            expect(component.getCheckboxEditorBooleanValue(0)).toBe(false);
        });
    });

    describe('stripUnsortableColumns', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'name', id: 'name', dataprovider: { idForFoundset: 'name' }, enableSort: true }),
                makeColumn({ columnid: 'age', id: 'age', dataprovider: { idForFoundset: 'age' }, enableSort: false })
            ]);
            component.state.columns = {};
        });

        it('keeps sortable columns and drops unsortable ones', () => {
            expect(component.stripUnsortableColumns('name asc,age desc')).toBe('name asc');
        });

        it('returns the input unchanged when it is empty', () => {
            expect(component.stripUnsortableColumns('')).toBe('');
        });
    });

    describe('getSortModel', () => {
        it('returns an empty model without a foundset', () => {
            component.foundset = undefined as any;
            expect(component.getSortModel()).toEqual([]);
        });

        it('parses the foundset sort columns into a model', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'name', id: 'name', dataprovider: { idForFoundset: 'name' } })
            ]);
            component.state.columns = {};
            component.foundset = { getSortColumns: () => 'name desc' } as any;
            expect(component.getSortModel()).toEqual([{ colId: 'name', sort: 'desc' }]);
        });
    });

    describe('getFoundsetSortModel', () => {
        it('builds the sort string and columns from a grid sort model', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'name', id: 'name', dataprovider: { idForFoundset: 'name' } })
            ]);
            component.state.columns = {};
            const result = component.getFoundsetSortModel([{ colId: 'name', sort: 'asc' }]);
            expect(result.sortString).toBe('name asc');
            expect(result.sortColumns).toEqual([{ name: 'name', direction: 'asc' }]);
        });

        it('returns empty values for a null sort model', () => {
            const result = component.getFoundsetSortModel(null);
            expect(result.sortColumns).toEqual([]);
        });
    });

    describe('applySortModel', () => {
        it('maps the sort model to column state with sortIndex and clears default sort', () => {
            component.applySortModel([{ colId: 'a', sort: 'asc' }]);
            expect(api.applyColumnState).toHaveBeenCalledWith({
                state: [{ colId: 'a', sort: 'asc', sortIndex: 0 }],
                defaultState: { sort: null }
            });
            expect(component.isSortModelApplied).toBe(true);
        });
    });

    describe('mergeConfig', () => {
        it('merges source over target', () => {
            expect(component.mergeConfig({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 2, b: 3 });
        });

        it('handles a null target', () => {
            expect(component.mergeConfig(null, { a: 1 })).toEqual({ a: 1 });
        });
    });

    describe('isTableGrouped / getRowGroupColumns', () => {
        it('is false with no group columns', () => {
            expect(component.isTableGrouped()).toBe(false);
        });

        it('is true when the grid reports group columns', () => {
            api.getRowGroupColumns.mockReturnValue([{}]);
            expect(component.isTableGrouped()).toBe(true);
        });

        it('getRowGroupColumns returns an empty array when the api is missing', () => {
            (component as any).agGrid = () => undefined;
            expect(component.getRowGroupColumns()).toEqual([]);
        });
    });

    describe('getNodeGroupInfo', () => {
        it('collects fields and keys up the parent chain', () => {
            const node: any = {
                field: 'city',
                key: 'Paris',
                parent: {
                    level: 0, group: true, field: 'country',
                    data: { country: 'France' },
                    parent: { level: -1, group: false }
                }
            };
            const info = component.getNodeGroupInfo(node);
            expect(info!.rowGroupFields).toEqual(['country', 'city']);
            expect(info!.rowGroupKeys).toEqual(['France', 'Paris']);
        });

        it('returns null when a parent group node is missing field and data', () => {
            const node: any = {
                field: 'city', key: 'Paris',
                parent: { level: 0, group: true, parent: null }
            };
            expect(component.getNodeGroupInfo(node)).toBeNull();
        });
    });

    describe('getCellClass', () => {
        it('adds the base class and a disabled class for a disabled column', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c', enabled: false })]);
            component.state.columns = {};
            const cls = component.getCellClass({ context: { componentParent: component }, colDef: { field: 'c' } });
            expect(cls).toContain('ag-table-cell');
            expect(cls).toContain('svy-disabled-cell');
        });

        it('appends a column styleClass', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c', styleClass: 'a b' })]);
            component.state.columns = {};
            const cls = component.getCellClass({ context: { componentParent: component }, colDef: { field: 'c' } });
            expect(cls).toContain('a');
            expect(cls).toContain('b');
        });
    });

    describe('removeSortHandlerPromise', () => {
        it('removes a known promise from the queue', () => {
            const p = Promise.resolve();
            component.sortHandlerPromises = [p];
            (component as any).removeSortHandlerPromise(p);
            expect(component.sortHandlerPromises.length).toBe(0);
        });

        it('logs when the promise is not in the queue', () => {
            const errSpy = vi.fn();
            Object.defineProperty(component.log, 'error', { configurable: true, get: () => errSpy });
            component.sortHandlerPromises = [];
            (component as any).removeSortHandlerPromise(Promise.resolve());
            expect(errSpy).toHaveBeenCalledWith('sortHandlerPromises out of sync');
        });
    });

    describe('cellClickHandler', () => {
        it('does nothing when the grid is disabled', () => {
            fixture.componentRef.setInput('enabled', false);
            component.cellClickHandler({ node: { rowIndex: 0 }, event: {} });
            expect(component.selectionEvent).toBeFalsy();
        });

        it('fires onFooterClick for a bottom-pinned row', () => {
            fixture.componentRef.setInput('enabled', true);
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c' })]);
            component.state.columns = {};
            const onFooterClick = vi.fn();
            fixture.componentRef.setInput('onFooterClick', onFooterClick);
            const event = { target: { closest: () => null } };
            component.cellClickHandler({ node: { rowPinned: 'bottom' }, column: { colId: 'c' }, event });
            expect(onFooterClick).toHaveBeenCalled();
        });
    });

    describe('onRowSelected', () => {
        it('fires onSelectedRowsChanged for a checkbox-selected group node', () => {
            const onSelectedRowsChanged = vi.fn();
            fixture.componentRef.setInput('onSelectedRowsChanged', onSelectedRowsChanged);
            // createJSEvent uses initMouseEvent which jsdom can't build; stub it out
            vi.spyOn(component, 'createJSEvent').mockReturnValue({} as any);
            const e: any = {
                source: 'checkboxSelected',
                node: { group: true, field: 'country', data: { country: 'FR' }, rowGroupColumn: { getColId: () => 'country' }, isSelected: () => true }
            };
            component.onRowSelected(e);
            expect(onSelectedRowsChanged).toHaveBeenCalled();
        });

        it('ignores non-checkbox selection sources', () => {
            const onSelectedRowsChanged = vi.fn();
            fixture.componentRef.setInput('onSelectedRowsChanged', onSelectedRowsChanged);
            component.onRowSelected({ source: 'rowClicked', node: { group: false } } as any);
            expect(onSelectedRowsChanged).not.toHaveBeenCalled();
        });
    });
});


