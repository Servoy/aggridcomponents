import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { RegistrationService } from './commons/registration.service';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * DataGrid ngOnInit configuration coverage. ngOnInit is OUR code that assembles the GridOptions
 * from inputs + the shared datagrid registration service config. We run it without a live grid
 * (agGrid signal undefined, groupManager built by ngOnInit itself) to drive the option-merging,
 * sidebar, icon, tooltip-delay, user-grid-options and service-default branches.
 */
describe('DataGrid - ngOnInit config', () => {
    let fixture: ComponentFixture<DataGrid>;
    let component: DataGrid;
    let registration: RegistrationService;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return { columnid: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as DataGridColumn;
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
        registration = TestBed.inject(RegistrationService);
        const d: any = registration.datagridService;
        d.toolPanelConfig = null; d.iconConfig = null; d.gridOptions = null; d.localeText = null;
        d.mainMenuItemsConfig = null; d.arrowsUpDownMoveWhenEditing = undefined;
        d.editNextCellOnEnter = undefined; d.moveToNextEditableCellOnTab = undefined;
        d.continuousColumnsAutoSizing = false; d.columnsAutoSizingOn = null;
        (component as any).destroy = () => undefined;
    });

    afterEach(() => {
        // Mark the component destroyed so its setTimeout guard suppresses any
        // pending async callbacks (e.g. scrollToSelectionEx) after the test ends.
        if (component) (component as any).destroyed = true;
    });

    it('builds the serverSide grid options with a default sideBar', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect(component.agGridOptions.rowModelType).toBe('serverSide');
        expect(component.sideBar).toBeTruthy();
        expect(component.groupManager).toBeDefined();
    });

    it('adds a filters tool panel to the sideBar when a column has a filter', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a', filterType: 'TEXT' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        const panels = (component.sideBar as any).toolPanels.map((p: any) => p.id);
        expect(panels).toContain('filters');
    });

    it('disables the sideBar when suppressSideButtons is configured', () => {
        (registration.datagridService as any).toolPanelConfig = { suppressSideButtons: true };
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect(component.sideBar).toBe(false);
    });

    it('reads arrowsUpDownMoveWhenEditing / editNextCellOnEnter from the service defaults', () => {
        (registration.datagridService as any).arrowsUpDownMoveWhenEditing = 'NEXTCELL';
        (registration.datagridService as any).editNextCellOnEnter = true;
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect((component as any).agArrowsUpDownMoveWhenEditing).toBe('NEXTCELL');
        expect((component as any).agEditNextCellOnEnter).toBe(true);
    });

    it('builds the icons map from an icon config', () => {
        fixture.componentRef.setInput('iconConfig', { iconGroupExpanded: 'fa-x' });
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect(component.agGridOptions.icons).toBeDefined();
    });

    it('merges a user gridOptions object and honours a user sideBar override', () => {
        fixture.componentRef.setInput('gridOptions', { sideBar: false, suppressCsvExport: true });
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect(component.sideBar).toBe(false);
        expect((component.agGridOptions as any).suppressCsvExport).toBe(true);
    });

    it('applies tooltip delays from the servoy UI properties', () => {
        const svc: any = (component as any).servoyService;
        svc.getUIProperty = (k: string) => k === 'tooltipInitialDelay' ? 300 : 1500;
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect(component.agGridOptions.tooltipShowDelay).toBe(300);
        expect(component.agGridOptions.tooltipHideDelay).toBe(1500);
    });

    it('sets the multiRow selection mode for a multi-select foundset', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: true, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect((component.agGridOptions.rowSelection as any).mode).toBe('multiRow');
    });

    it('enables master-detail options when masterDetail is set', () => {
        fixture.componentRef.setInput('masterDetail', {} as any);
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect(component.agGridOptions.masterDetail).toBe(true);
    });

    it('wires getRowClass when a rowStyleClassDataprovider is present', () => {
        fixture.componentRef.setInput('rowStyleClassDataprovider', ['hot']);
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect(typeof component.agGridOptions.getRowClass).toBe('function');
    });

    it('swaps in the blank loading cell renderer when the loading indicator is suppressed', () => {
        fixture.componentRef.setInput('showLoadingIndicator', false);
        fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
        fixture.componentRef.setInput('myFoundset', { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => () => undefined } as any);
        component.ngOnInit();
        expect(component.agGridOptions.loadingCellRenderer).toBeDefined();
    });
});



