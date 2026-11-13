import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Remaining pure-logic PowerGrid coverage: agg custom funcs, editCellAt validation, the
 * group-row inner renderer and the default cell renderer branches. ag-grid is mocked via the
 * agGrid() signal; the fixture grid's onGridReadyBase is stubbed.
 */
describe('PowerGrid - remaining logic', () => {
    let fixture: ComponentFixture<PowerGrid>;
    let component: PowerGrid;
    let api: any;

    function makeColumn(overrides: Partial<PowerGridColumn> = {}): PowerGridColumn {
        return { dataprovider: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as PowerGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            getRowGroupColumns: vi.fn().mockReturnValue([]),
            startEditingCell: vi.fn(),
            addAggFuncs: vi.fn(),
            setGridOption: vi.fn(),
            getColumn: vi.fn(),
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
        component.isGridReady = true;
        api = fakeApi();
        (component as any).agGrid = () => ({ api });
        vi.spyOn(component as any, 'onGridReadyBase').mockImplementation(() => { /* no-op */ });
        // ngOnInit never runs here; make destroy a no-op so TestBed teardown can't throw
        (component as any).destroy = () => undefined;
    });

    describe('getAggCustomFuncs', () => {
        it('builds a map of custom aggregation functions from the internal list', () => {
            (component as any)._internalAggCustomFuncs = () => [
                { name: 'myCount', aggFunc: ((vals: any[]) => vals.length) as any }
            ];
            const funcs = component.getAggCustomFuncs();
            expect(typeof funcs['myCount']).toBe('function');
            expect(funcs['myCount']([1, 2, 3] as any)).toBe(3);
        });
    });

    describe('editCellAt', () => {
        it('warns when the table is grouped', () => {
            vi.spyOn(component, 'isTableGrouped').mockReturnValue(true);
            const spy = vi.fn();
            Object.defineProperty(component.log, 'warn', { configurable: true, get: () => spy });
            component.editCellAt(0, 0);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('not supported in grouped mode'));
        });

        it('warns on a negative rowindex', () => {
            vi.spyOn(component, 'isTableGrouped').mockReturnValue(false);
            const spy = vi.fn();
            Object.defineProperty(component.log, 'warn', { configurable: true, get: () => spy });
            component.editCellAt(-1, 0);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('invalid rowindex'));
        });

        it('warns on an out-of-range columnindex', () => {
            vi.spyOn(component, 'isTableGrouped').mockReturnValue(false);
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a' })]);
            const spy = vi.fn();
            Object.defineProperty(component.log, 'warn', { configurable: true, get: () => spy });
            component.editCellAt(0, 5);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('invalid columnindex'));
        });

        it('schedules startEditingCell for a valid cell', () => {
            vi.spyOn(component, 'isTableGrouped').mockReturnValue(false);
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', dataprovider: 'a' })]);
            vi.useFakeTimers();
            component.editCellAt(0, 0);
            vi.advanceTimersByTime(10);
            expect(api.startEditingCell).toHaveBeenCalledWith({ rowIndex: 0, colKey: 'a' });
            vi.useRealTimers();
        });
    });

    describe('groupRowInnerRenderer', () => {
        it('renders a group label with no aggregates', () => {
            const label = component.groupRowInnerRenderer({ node: { key: 'France' } });
            expect(label).toContain('France');
            expect(label).not.toContain('ag-group-aggregate-value');
        });

        it('renders aggregate values with separators for multiple aggs', () => {
            const column = { aggFunc: 'sum', getColDef: () => ({ headerName: 'Total', valueFormatter: null }) };
            const params = {
                node: { key: 'FR', aggData: { total: 100, qty: 5 } },
                api: { getColumn: () => column }
            };
            const label = component.groupRowInnerRenderer(params);
            expect(label).toContain('sum(Total)');
            expect(label).toContain('ag-group-aggregate-separator');
        });
    });

    describe('getDefaultCellRenderer', () => {
        beforeEach(() => { (component as any).doc = document; });

        it('renders a checkbox icon for a CHECKBOX column', () => {
            const renderer = component.getDefaultCellRenderer({ editType: 'CHECKBOX' });
            const result = renderer({ value: 1, node: { group: false } });
            expect(result.tagName).toBe('I');
        });

        it('colours the cell background for a color TEXTFIELD', () => {
            const renderer = component.getDefaultCellRenderer({ editType: 'TEXTFIELD', editTypeTextFieldInput: 'color' });
            const eGridCell = { style: {} as any };
            const result = renderer({ value: '#ff0000', node: { group: false }, eGridCell });
            expect(eGridCell.style.backgroundColor).toBe('#ff0000');
            expect(result).toBe('');
        });

        it('renders an html showAs value as a string', () => {
            const renderer = component.getDefaultCellRenderer({ showAs: 'html' });
            const result = renderer({ value: '<b>x</b>', node: { group: false } });
            expect(result).toBe('<b>x</b>');
        });

        it('returns a text node for a plain value', () => {
            const renderer = component.getDefaultCellRenderer({});
            const result = renderer({ value: 'plain', valueFormatted: 'plain', node: { group: false } });
            expect(result.textContent).toBe('plain');
        });
    });

    describe('getIconCheckboxEditor with config', () => {
        it('uses a custom checked icon from the merged config', () => {
            (component as any).registrationService = { powergridService: { iconConfig: { iconEditorChecked: 'fa-custom-check' } } };
            (component as any).iconConfig = () => ({});
            expect(component.getIconCheckboxEditor(1)).toBe('fa-custom-check');
        });
    });
});

