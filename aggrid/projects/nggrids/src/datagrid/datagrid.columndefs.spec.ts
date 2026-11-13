import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { AgGridModule } from 'ag-grid-angular';
import { TextEditor } from '../editors/texteditor';
import { TypeaheadEditor } from '../editors/typeaheadeditor';
import { SelectEditor } from '../editors/selecteditor';
import { DatePicker } from '../editors/datepicker';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for the DataGrid column-definition builder and cell renderer. These exercise the
 * largest uncovered block (getColumnDefs) and the cellRenderer branch logic. ag-grid is not
 * instantiated: getColumnDefs is a pure model->colDef transformation and cellRenderer is driven
 * with plain param objects. The onGridReadyBase hook is stubbed so the auto-created fixture grid
 * does not touch a live api.
 */
describe('DataGrid - getColumnDefs & cellRenderer', () => {
    let fixture: ComponentFixture<DataGrid>;
    let component: DataGrid;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return { columnid: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as DataGridColumn;
    }

    function findColDef(colDefs: any[], field: string): any {
        return colDefs.find(d => d.field === field || d.colId === field);
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
        (component as any).agGrid = () => ({ api: new Proxy({}, { get: () => vi.fn() }) });
        vi.spyOn(component as any, 'onGridReadyBase').mockImplementation(() => { /* no-op */ });
        // ngOnInit never runs in these pure-logic specs, so stub the pieces TestBed teardown touches
        (component as any).groupManager = { removeFoundsetRefAtLevel: () => undefined };
    });

    describe('getColumnDefs - basics', () => {
        it('builds a colDef per non-excluded column with headerName and field', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'a', id: 'a', headerTitle: 'Alpha' }),
                makeColumn({ columnid: 'b', id: 'b', headerTitle: 'Beta', excluded: true })
            ]);
            const defs = component.getColumnDefs();
            const a = findColDef(defs, 'a');
            expect(a.headerName).toBe('Alpha');
            expect(findColDef(defs, 'b')).toBeUndefined();
        });

        it('adds the base header class and merges a headerStyleClass', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a', headerStyleClass: 'x y' })]);
            const def = findColDef(component.getColumnDefs(), 'a');
            expect(def.headerClass).toContain('ag-table-header');
            expect(def.headerClass).toContain('x');
            expect(def.headerClass).toContain('y');
        });

        it('adds a disabled cell class when the column is disabled', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a', enabled: false })]);
            const def = findColDef(component.getColumnDefs(), 'a');
            expect(def.cellClass).toContain('svy-disabled-cell');
        });

        it('hides a column that is not visible and disables resize/sort when configured', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'a', id: 'a', visible: false, enableResize: false, enableSort: false })
            ]);
            const def = findColDef(component.getColumnDefs(), 'a');
            expect(def.hide).toBe(true);
            expect(def.resizable).toBe(false);
            expect(def.sortable).toBe(false);
        });

        it('wires the editType to the matching cell editor', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 't', id: 't', editType: 'TEXTFIELD' }),
                makeColumn({ columnid: 'ta', id: 'ta', editType: 'TYPEAHEAD' }),
                makeColumn({ columnid: 'd', id: 'd', editType: 'DATEPICKER' }),
                makeColumn({ columnid: 'c', id: 'c', editType: 'COMBOBOX' })
            ]);
            const defs = component.getColumnDefs();
            expect(findColDef(defs, 't').cellEditor).toBe(TextEditor);
            expect(findColDef(defs, 'ta').cellEditor).toBe(TypeaheadEditor);
            expect(findColDef(defs, 'd').cellEditor).toBe(DatePicker);
            expect(findColDef(defs, 'd').cellEditorPopupPosition).toBe('over');
            expect(findColDef(defs, 'c').cellEditor).toBe(SelectEditor);
        });

        it('wires the filterType to the matching ag-grid filter', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'txt', id: 'txt', filterType: 'TEXT' }),
                makeColumn({ columnid: 'num', id: 'num', filterType: 'NUMBER' }),
                makeColumn({ columnid: 'dt', id: 'dt', filterType: 'DATE' }),
                makeColumn({ columnid: 'vl', id: 'vl', filterType: 'VALUELIST' }),
                makeColumn({ columnid: 'rd', id: 'rd', filterType: 'RADIO' })
            ]);
            const defs = component.getColumnDefs();
            expect(findColDef(defs, 'txt').filter).toBe('agTextColumnFilter');
            expect(findColDef(defs, 'num').filter).toBe('agNumberColumnFilter');
            expect(findColDef(defs, 'dt').filter).toBe('dateFilter');
            expect(findColDef(defs, 'vl').filter).toBe('valuelistFilter');
            expect(findColDef(defs, 'rd').filter).toBe('radioFilter');
        });

        it('wires the FORM editor with a suppressKeyboardEvent for enter/tab', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'f', id: 'f', editType: 'FORM' })]);
            const def = findColDef(component.getColumnDefs(), 'f');
            expect(typeof def.suppressKeyboardEvent).toBe('function');
            // ENTER while editing should be suppressed
            expect(def.suppressKeyboardEvent({ editing: true, event: { keyCode: 13 } })).toBe(true);
            expect(def.suppressKeyboardEvent({ editing: false, event: { keyCode: 13 } })).toBe(false);
        });

        it('sets a dndSource callback for a column with a dndSourceDataprovider', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'd', id: 'd', dndSourceDataprovider: [true] })]);
            const def = findColDef(component.getColumnDefs(), 'd');
            expect(typeof def.dndSource).toBe('function');
            expect(typeof def.dndSourceOnRowDrag).toBe('function');
        });

        it('enables plain dndSource for a column flagged dndSource', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'd', id: 'd', dndSource: true })]);
            const def = findColDef(component.getColumnDefs(), 'd');
            expect(def.dndSource).toBe(true);
        });

        it('registers footer/header text change listeners for change-aware texts', () => {
            const footerUnsub = vi.fn();
            const headerUnsub = vi.fn();
            const footerText: any = ['F']; footerText.addChangeListener = vi.fn().mockReturnValue(footerUnsub);
            const headerText: any = ['H']; headerText.addChangeListener = vi.fn().mockReturnValue(headerUnsub);
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c', footerText, headerText })]);
            component.getColumnDefs();
            expect(footerText.addChangeListener).toHaveBeenCalled();
            expect(headerText.addChangeListener).toHaveBeenCalled();
        });

        it('adds a header checkbox template to the column when no selection column is used', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c', headerCheckbox: true })]);
            component._checkboxSelection.set(false);
            const def = findColDef(component.getColumnDefs(), 'c');
            expect(def.headerComponentParams).toBeDefined();
            expect(def.headerComponentParams.template).toContain('svy-header-checkbox');
        });

        it('routes the header checkbox template to the selection column when checkbox selection is on', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c', headerCheckbox: true })]);
            component._checkboxSelection.set(true);
            component.getColumnDefs();
            expect(component._headerCheckboxColumnParams()).toBeDefined();
        });

        it('wires the master-detail group cell renderer on the first visible column', () => {
            fixture.componentRef.setInput('masterDetail', {} as any);
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
            const defs = component.getColumnDefs();
            const a = findColDef(defs, 'a');
            expect(a.cellRenderer).toBe('agGroupCellRenderer');
        });

        it('appends the hidden _svyRowId and _svyFoundsetUUID ghost columns', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'a', id: 'a' })]);
            const defs = component.getColumnDefs();
            expect(defs.find((d: any) => d.field === '_svyRowId')).toBeDefined();
            expect(defs.find((d: any) => d.field === '_svyFoundsetUUID')).toBeDefined();
        });

        it('groups columns under a synthesized header group definition', () => {
            fixture.componentRef.setInput('columns', [
                makeColumn({ columnid: 'a', id: 'a', headerGroup: 'G1' }),
                makeColumn({ columnid: 'b', id: 'b', headerGroup: 'G1' })
            ]);
            const defs = component.getColumnDefs();
            const group = defs.find((d: any) => d.children && d.headerName === 'G1');
            expect(group).toBeDefined();
            expect(group.children.length).toBe(2);
        });
    });

    describe('cellRenderer', () => {
        function cellParams(overrides: Record<string, any> = {}): any {
            return {
                colDef: { field: 'c' },
                column: { colId: 'c' },
                node: { group: false, rowPinned: null },
                value: 'v',
                valueFormatted: 'vf',
                ...overrides
            };
        }

        beforeEach(() => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c' })]);
            component.state.columns = {};
            (component as any).doc = document;
        });

        it('returns a text node with the formatted value for a plain column', () => {
            const result = component.cellRenderer(cellParams());
            expect(result.textContent).toBe('vf');
        });

        it('returns the raw html string for a column shown as html', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c', showAs: 'html' })]);
            component.state.columns = {};
            const result = component.cellRenderer(cellParams({ value: '<b>x</b>' }));
            expect(result).toBe('<b>x</b>');
        });

        it('wraps the content in a styleClass div when a styleClassDataprovider is present', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ columnid: 'c', id: 'c', styleClassDataprovider: ['hot'] })]);
            component.state.columns = {};
            component.foundset = { foundset: { viewPort: { startIndex: 0 } } } as any;
            vi.spyOn(component, 'isTableGrouped').mockReturnValue(false);
            const result = component.cellRenderer(cellParams({ node: { group: false, rowPinned: null, rowIndex: 0 } }));
            expect(result.className).toBe('hot');
        });
    });

    describe('createCustomMainMenuItems', () => {
        it('adds a separator item', () => {
            const items: any[] = [];
            const menu = { items: [{ extraProperties: { 'NG-Grids': { isSeparator: true } } }] };
            component.createCustomMainMenuItems(items, menu, { id: 'c' }, 'c');
            expect(items).toEqual(['separator']);
        });

        it('adds a normal menu item with name and disabled flag', () => {
            const items: any[] = [];
            const menu = { items: [{ menuText: 'Do it', enabled: true, extraProperties: { 'NG-Grids': {} } }] };
            component.createCustomMainMenuItems(items, menu, { id: 'c' }, 'c');
            expect(items[0].name).toBe('Do it');
            expect(items[0].disabled).toBe(false);
        });
    });
});


