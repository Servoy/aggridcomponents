import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { RegistrationService } from '../datagrid/commons/registration.service';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * PowerGrid ngOnInit configuration coverage. ngOnInit is OUR code that assembles the GridOptions
 * from inputs + the shared registration service config. We run it with a mocked agGrid signal and
 * various inputs/service config to drive the option-merging, side-bar, icon, group-renderer,
 * lazy-loading, pks row-id and auto-sizing branches. No live grid.
 */
describe('PowerGrid - ngOnInit config', () => {
    let fixture: ComponentFixture<PowerGrid>;
    let component: PowerGrid;
    let registration: RegistrationService;

    function makeColumn(overrides: Partial<PowerGridColumn> = {}): PowerGridColumn {
        return { dataprovider: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as PowerGridColumn;
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
        fixture.componentRef.setInput('enabled', true);
        registration = TestBed.inject(RegistrationService);
        // reset shared service config between tests
        (registration.powergridService as any).toolPanelConfig = null;
        (registration.powergridService as any).iconConfig = null;
        (registration.powergridService as any).gridOptions = null;
        (registration.powergridService as any).localeText = null;
        (registration.powergridService as any).columnsAutoSizingOn = null;
        (registration.powergridService as any).continuousColumnsAutoSizing = false;
        (component as any).destroy = () => undefined;
    });

    afterEach(() => {
        // Mark the component destroyed so its setTimeout guard suppresses any
        // pending async callbacks after the test ends.
        if (component) (component as any).destroyed = true;
    });

    it('builds a default sideBar with a filters tool panel when a column has a filter', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a', filterType: 'TEXT' } as any)]);
        component.ngOnInit();
        expect(component.sideBar).toBeTruthy();
        const panels = (component.sideBar as any).toolPanels.map((p: any) => p.id);
        expect(panels).toContain('columns');
        expect(panels).toContain('filters');
    });

    it('disables the sideBar when suppressSideButtons is configured', () => {
        (registration.powergridService as any).toolPanelConfig = { suppressSideButtons: true };
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        expect(component.sideBar).toBe(false);
    });

    it('merges a user gridOptions object and honours a user sideBar override', () => {
        fixture.componentRef.setInput('gridOptions', { sideBar: false, suppressContextMenu: true });
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        expect(component.sideBar).toBe(false);
        expect((component.agGridOptions as any).suppressContextMenu).toBe(true);
    });

    it('builds the icons map from an icon config', () => {
        fixture.componentRef.setInput('iconConfig', { iconGroupExpanded: 'fa-expand', iconRefreshData: 'skip' });
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        expect(component.agGridOptions.icons).toBeDefined();
        expect((component.agGridOptions.icons as any).groupExpanded).toContain('fa-expand');
    });

    it('uses the server-side row model when lazy loading is enabled', () => {
        fixture.componentRef.setInput('useLazyLoading', true);
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        expect(component.agGridOptions.rowModelType).toBe('serverSide');
    });

    it('uses the client-side row model with the data array otherwise', () => {
        fixture.componentRef.setInput('useLazyLoading', false);
        fixture.componentRef.setInput('data', [{ a: 1 }]);
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        expect(component.agGridOptions.rowModelType).toBe('clientSide');
        expect(component.agGridOptions.rowData).toEqual([{ a: 1 }]);
    });

    it('wires a getRowClass that delegates to the rowStyleClassFunc', () => {
        const rowStyleClassFunc = vi.fn().mockReturnValue('my-class');
        fixture.componentRef.setInput('rowStyleClassFunc', rowStyleClassFunc);
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        const cls = (component.agGridOptions.getRowClass as any)({ node: { rowPinned: null, group: false }, rowIndex: 0, data: { a: 1 } });
        expect(cls).toBe('my-class');
        expect(rowStyleClassFunc).toHaveBeenCalled();
    });

    it('wires an isEditableCallback from the isEditableFunc', () => {
        const isEditableFunc = vi.fn().mockReturnValue(true);
        fixture.componentRef.setInput('isEditableFunc', isEditableFunc);
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        expect(typeof component.isEditableCallback).toBe('function');
        component.isEditableCallback({ node: { rowIndex: 0 }, data: {}, colDef: { field: 'a' } });
        expect(isEditableFunc).toHaveBeenCalled();
    });

    it('applies tooltip delays from the servoy UI properties', () => {
        vi.spyOn(component['servoyService'] as any ?? component as any, 'getUIProperty');
        const svc: any = (component as any).servoyService;
        if (svc) svc.getUIProperty = (k: string) => k === 'tooltipInitialDelay' ? 500 : 2000;
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        expect(component.agGridOptions.tooltipShowDelay).toBe(500);
        expect(component.agGridOptions.tooltipHideDelay).toBe(2000);
    });

    it('registers a custom agg funcs map when internal agg funcs are present', () => {
        (component as any)._internalAggCustomFuncs = () => [{ name: 'myAgg', aggFunc: ((v: any[]) => v.length) as any }];
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        expect(component.agGridOptions.aggFuncs).toBeDefined();
        expect(typeof (component.agGridOptions.aggFuncs as any).myAgg).toBe('function');
    });

    it('generates a row id from configured pks', () => {
        fixture.componentRef.setInput('pks', ['id', 'country']);
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
        component.ngOnInit();
        const id = (component.agGridOptions.getRowId as any)({ data: { id: 7, country: 'FR' } });
        expect(id).toBe('7_FR');
    });
});

