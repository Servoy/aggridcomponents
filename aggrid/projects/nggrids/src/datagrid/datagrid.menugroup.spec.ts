import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Pure-logic coverage for DataGrid main-menu building, grouped-column bookkeeping, state grouped
 * columns and getRowClass. ag-grid is mocked via the agGrid() signal; onGridReadyBase is stubbed
 * and groupManager is stubbed so TestBed teardown cannot throw. No live grid is created.
 */
describe('DataGrid - menu & grouping logic', () => {
    let fixture: ComponentFixture<DataGrid>;
    let component: DataGrid;
    let api: any;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return { columnid: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as DataGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            getRowGroupColumns: vi.fn().mockReturnValue([]),
            setFilterModel: vi.fn(),
            deselectAll: vi.fn(),
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
        fixture.componentRef.setInput('enabled', true);
        component.agGridOptions = component.agGridOptions || {} as any;
        api = fakeApi();
        (component as any).agGrid = () => ({ api });
        vi.spyOn(component as any, 'onGridReadyBase').mockImplementation(() => { /* no-op */ });
        (component as any).groupManager = { removeFoundsetRefAtLevel: () => undefined, clearAll: () => undefined };
    });

    describe('getMainMenuItems', () => {
        function params(defaultItems: string[]) {
            return {
                context: { componentParent: component },
                column: { getColDef: () => ({ field: 'c' }), getColId: () => 'c' },
                defaultItems
            } as any;
        }

        it('defaults to rowGroup/rowUnGroup intersected with the default items', () => {
            component.agMainMenuItemsConfig = {};
            (component as any).customMainMenu = () => null;
            (component as any).registrationService = { datagridService: {} };
            expect(component.getMainMenuItems(params(['rowGroup', 'resetColumns', 'rowUnGroup']))).toEqual(['rowGroup', 'rowUnGroup']);
        });

        it('uses the configured menu item map when set', () => {
            component.agMainMenuItemsConfig = { resetColumns: true, pinSubMenu: false };
            (component as any).customMainMenu = () => null;
            (component as any).registrationService = { datagridService: {} };
            expect(component.getMainMenuItems(params(['resetColumns', 'rowGroup']))).toEqual(['resetColumns']);
        });

        it('prepends custom main menu items from the registration service', () => {
            component.agMainMenuItemsConfig = {};
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c' })]);
            component.state.columns = {};
            (component as any).customMainMenu = () => null;
            (component as any).registrationService = {
                datagridService: { customMainMenu: { items: [{ extraProperties: { 'NG-Grids': { isSeparator: true } } }] } }
            };
            const result = component.getMainMenuItems(params(['rowGroup']));
            expect(result).toContain('separator');
        });
    });

    describe('setStateGroupedColumns', () => {
        it('records grouped column ids and fields in the state', () => {
            component.setStateGroupedColumns([{ colId: 'country', colDef: { field: 'country' } }]);
            expect(component.state.grouped.columns).toContain('country');
            expect(component.state.expanded.fields).toContain('country');
        });
    });

    describe('onColumnRowGroupChanged', () => {
        it('enters group view and sets rowGroupIndex on the grouped column', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'country', id: 'country', dataprovider: { idForFoundset: 'country' } }),
                makeColumn({ columnid: 'city', id: 'city', dataprovider: { idForFoundset: 'city' } })
            ]);
            component.state.columns = {};
            api.getRowGroupColumns.mockReturnValue([{ colId: 'country', colDef: { field: 'country' } }]);
            vi.spyOn(component, 'setStateGroupedColumns').mockImplementation(() => {});
            vi.spyOn(component as any, 'sizeHeaderAndColumnsToFit').mockImplementation(() => {});
            component.onColumnRowGroupChanged({});
            expect(component.isGroupView).toBe(true);
            expect(component.getColumn('country').rowGroupIndex).toBe(0);
        });

        it('leaves group view and clears row group indexes when there are no group columns', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'country', id: 'country', rowGroupIndex: 0 })]);
            component.state.columns = {};
            component.isGroupView = true;
            api.getRowGroupColumns.mockReturnValue([]);
            vi.spyOn(component, 'setStateGroupedColumns').mockImplementation(() => {});
            vi.spyOn(component as any, 'sizeHeaderAndColumnsToFit').mockImplementation(() => {});
            component.onColumnRowGroupChanged({});
            expect(component.isGroupView).toBe(false);
        });
    });

    describe('getRowClass', () => {
        it('returns empty string when there is no foundset', () => {
            component.foundset = undefined as any;
            const params = { context: { componentParent: component }, node: { rowPinned: null, rowIndex: 0 } };
            expect(component.getRowClass(params)).toBe('');
        });

        it('returns empty string for a pinned row', () => {
            component.foundset = { foundset: { viewPort: { startIndex: 0 } } } as any;
            const params = { context: { componentParent: component }, node: { rowPinned: 'bottom' } };
            expect(component.getRowClass(params)).toBe('');
        });

        it('reads the per-row style class provider for a non-grouped grid', () => {
            component.foundset = { foundset: { viewPort: { startIndex: 0 } } } as any;
            fixture.componentRef.setInput('rowStyleClassDataprovider', ['hot', '', '']);
            vi.spyOn(component, 'isTableGrouped').mockReturnValue(false);
            (component as any).agGridElementRef = () => ({ nativeElement: document.createElement('div') });
            const params = { context: { componentParent: component }, node: { rowPinned: null, rowIndex: 0 }, rowIndex: 0 };
            const cls = component.getRowClass(params);
            expect(cls).toEqual(['hot']);
        });
    });
});

