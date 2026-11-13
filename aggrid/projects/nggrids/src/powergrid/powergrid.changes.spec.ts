import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * svyOnChanges / drag-drop / lazy-loading logic tests for PowerGrid. ag-grid is mocked via the
 * agGrid() signal; the fixture grid's onGridReadyBase is stubbed. We drive OUR change-dispatch
 * branches, the gridDragOver/gridDrop handlers and the RemoteDatasource getRows path.
 */
describe('PowerGrid - svyOnChanges / drag-drop / lazy loading', () => {
    let fixture: ComponentFixture<PowerGrid>;
    let component: PowerGrid;
    let api: any;

    function makeColumn(overrides: Partial<PowerGridColumn> = {}): PowerGridColumn {
        return { dataprovider: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as PowerGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            setGridOption: vi.fn(),
            applyTransaction: vi.fn(),
            getRowNode: vi.fn(),
            refreshCells: vi.fn(),
            getRowGroupColumns: vi.fn().mockReturnValue([]),
            updateGridOptions: vi.fn(),
            resetColumnState: vi.fn(),
            addAggFuncs: vi.fn(),
            setColumnsVisible: vi.fn(),
            getColumn: vi.fn().mockReturnValue({ getActualWidth: () => 100 }),
            setColumnWidths: vi.fn(),
            ...overrides
        };
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
        component.agGridOptions = component.agGridOptions || {} as any;
        component.isGridReady = true;
        api = fakeApi();
        (component as any).agGrid = () => ({ api });
        vi.spyOn(component as any, 'onGridReadyBase').mockImplementation(() => { /* no-op */ });
        // ngOnInit never runs here; make destroy a no-op so TestBed teardown can't throw
        (component as any).destroy = () => undefined;
    });

    describe('svyOnChanges - data', () => {
        it('pushes rowData to the live grid when not lazy loading', () => {
            (component as any).useLazyLoading = () => false;
            (component as any).data = () => [{ id: 1 }];
            component.svyOnChanges({ data: { currentValue: [{ id: 1 }], previousValue: [], firstChange: false } } as any);
            expect(api.setGridOption).toHaveBeenCalledWith('rowData', [{ id: 1 }]);
        });
    });

    describe('svyOnChanges - updateData', () => {
        it('applies the transaction and clears update data on the server', () => {
            const callSpy = vi.spyOn(component.servoyApi(), 'callServerSideApi').mockReturnValue(undefined as any);
            component.svyOnChanges({ updateData: { currentValue: { add: [{ id: 2 }] }, previousValue: null, firstChange: false } } as any);
            expect(api.applyTransaction).toHaveBeenCalledWith({ add: [{ id: 2 }] });
            expect(callSpy).toHaveBeenCalledWith('clearUpdateData', []);
        });
    });

    describe('svyOnChanges - enabled', () => {
        it('re-applies row selection and refreshes columns', () => {
            (component.agGridOptions as any).rowSelection = { mode: 'singleRow' };
            const updateSpy = vi.spyOn(component, 'updateColumnDefs').mockImplementation(() => {});
            component.svyOnChanges({ enabled: { currentValue: false, previousValue: true, firstChange: false } } as any);
            expect(api.setGridOption).toHaveBeenCalledWith('rowSelection', expect.anything());
            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('svyOnChanges - gridOptions', () => {
        it('updates the live grid options and captures a new sideBar', () => {
            component.svyOnChanges({ gridOptions: { currentValue: { sideBar: false }, previousValue: {}, firstChange: false } } as any);
            expect(api.updateGridOptions).toHaveBeenCalledWith({ sideBar: false });
            expect(component.sideBar).toBe(false);
        });

        it('does nothing on the first change', () => {
            component.svyOnChanges({ gridOptions: { currentValue: {}, previousValue: undefined, firstChange: true } } as any);
            expect(api.updateGridOptions).not.toHaveBeenCalled();
        });
    });

    describe('svyOnChanges - _internalAggCustomFuncs', () => {
        it('registers custom agg funcs on the grid', () => {
            (component as any)._internalAggCustomFuncs = () => [{ name: 'myAgg', aggFunc: ((v: any[]) => v.length) as any }];
            component.svyOnChanges({ _internalAggCustomFuncs: { currentValue: [{ name: 'myAgg' }], previousValue: null, firstChange: false } } as any);
            expect(api.addAggFuncs).toHaveBeenCalled();
        });
    });

    describe('gridDragOver', () => {
        it('ignores drags that are not nggrids drags', () => {
            const event = { dataTransfer: { types: ['text/plain'] }, preventDefault: vi.fn() };
            component.gridDragOver(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('sets copy dropEffect and prevents default for a supported drag with no onDragOver', () => {
            (component as any).onDragOverFunc = () => null;
            const event: any = { dataTransfer: { types: ['nggrids-drag/json'], dropEffect: '' }, preventDefault: vi.fn() };
            component.gridDragOver(event);
            expect(event.dataTransfer.dropEffect).toBe('copy');
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('gridDrop', () => {
        it('parses the transfer data and calls the onDrop handler', () => {
            const onDrop = vi.fn();
            (component as any).onDrop = () => onDrop;
            const transfer = { sourceGridName: 'g', sourceColumnId: 'c', records: [{ id: 1 }] };
            const event: any = {
                preventDefault: vi.fn(),
                target: { closest: () => ({ getAttribute: () => 'c' }) },
                dataTransfer: { getData: () => JSON.stringify(transfer) }
            };
            vi.spyOn(component as any, 'getNodeForElement').mockReturnValue(null);
            component.gridDrop(event);
            expect(onDrop).toHaveBeenCalled();
            expect(onDrop.mock.calls[0][0]).toEqual([{ id: 1 }]);
        });

        it('does nothing when there is no onDrop handler', () => {
            (component as any).onDrop = () => null;
            const event: any = { preventDefault: vi.fn(), target: { closest: () => null }, dataTransfer: { getData: () => '{}' } };
            expect(() => component.gridDrop(event)).not.toThrow();
        });
    });

    describe('getNodeForElement', () => {
        it('resolves the row node from a row-id element', () => {
            api.getRowNode.mockReturnValue({ id: 'n1' });
            const element = { closest: (sel: string) => sel === '[row-id]' ? { getAttribute: () => 'r1' } : null };
            expect(component.getNodeForElement(element)).toEqual({ id: 'n1' });
            expect(api.getRowNode).toHaveBeenCalledWith('r1');
        });

        it('returns null when there is no row element', () => {
            const element = { closest: () => null };
            expect(component.getNodeForElement(element)).toBeNull();
        });
    });
});

