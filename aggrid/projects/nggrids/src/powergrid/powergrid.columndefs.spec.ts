import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { AgGridModule } from 'ag-grid-angular';
import { TextEditor } from '../editors/texteditor';
import { DatePicker } from '../editors/datepicker';
import { SelectEditor } from '../editors/selecteditor';
import { TypeaheadEditor } from '../editors/typeaheadeditor';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Pure getColumnDefs transformation tests for PowerGrid. The grid is NOT booted; getColumnDefs
 * is a model->colDef mapping. The fixture's auto-created grid onGridReadyBase is stubbed so the
 * attached grid (from fixture.detectChanges, which we avoid) is irrelevant - we call getColumnDefs
 * directly on the component.
 */
describe('PowerGrid - getColumnDefs mapping', () => {
    let fixture: ComponentFixture<PowerGrid>;
    let component: PowerGrid;

    function makeColumn(overrides: Partial<PowerGridColumn> = {}): PowerGridColumn {
        return { dataprovider: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as PowerGridColumn;
    }

    function findDef(defs: any[], field: string): any {
        return defs.find(d => d.field === field || d.colId === field);
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
    });

    it('maps headerTitle / field / tooltip', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ id: 'a', dataprovider: 'ColA', headerTitle: 'Alpha', tooltip: 'tip' })
        ]);
        const def = findDef(component.getColumnDefs(), 'cola');
        expect(def.headerName).toBe('Alpha');
        expect(def.field).toBe('cola');
        expect(def.colId).toBe('a');
        expect(def.tooltipField).toBe('tip');
    });

    it('adds the stringType cell class for a TEXT format column', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'a', formatType: 'TEXT' } as any)]);
        const def = findDef(component.getColumnDefs(), component.getColumnDefs()[0].field);
        expect(def.cellClass).toContain('stringType');
    });

    it('wires the edit types to editors', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ id: 't', dataprovider: 't', editType: 'TEXTFIELD' } as any),
            makeColumn({ id: 'd', dataprovider: 'd', editType: 'DATEPICKER' } as any),
            makeColumn({ id: 'c', dataprovider: 'c', editType: 'COMBOBOX' } as any),
            makeColumn({ id: 'ta', dataprovider: 'ta', editType: 'TYPEAHEAD' } as any)
        ]);
        const defs = component.getColumnDefs();
        expect(findDef(defs, 't').cellEditor).toBe(TextEditor);
        expect(findDef(defs, 'd').cellEditor).toBe(DatePicker);
        expect(findDef(defs, 'c').cellEditor).toBe(SelectEditor);
        expect(findDef(defs, 'ta').cellEditor).toBe(TypeaheadEditor);
    });

    it('wires filter types', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ id: 'txt', dataprovider: 'txt', filterType: 'TEXT' } as any),
            makeColumn({ id: 'num', dataprovider: 'num', filterType: 'NUMBER' } as any),
            makeColumn({ id: 'dt', dataprovider: 'dt', filterType: 'DATE' } as any),
            makeColumn({ id: 'vl', dataprovider: 'vl', filterType: 'VALUELIST' } as any),
            makeColumn({ id: 'rd', dataprovider: 'rd', filterType: 'RADIO' } as any)
        ]);
        const defs = component.getColumnDefs();
        expect(findDef(defs, 'txt').filter).toBe('agTextColumnFilter');
        expect(findDef(defs, 'num').filter).toBe('agNumberColumnFilter');
        expect(findDef(defs, 'dt').filter).toBe('dateFilter');
        expect(findDef(defs, 'vl').filter).toBe('valuelistFilter');
        expect(findDef(defs, 'rd').filter).toBe('radioFilter');
    });

    it('uses a value formatter when the column has a format', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'f', dataprovider: 'f', format: { display: 'x' } } as any)]);
        const def = findDef(component.getColumnDefs(), 'f');
        expect(typeof def.valueFormatter).toBe('function');
        expect(typeof def.keyCreator).toBe('function');
    });

    it('sets a local-date value getter for a DATETIME useLocalDateTime format', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'd', dataprovider: 'd', formatType: 'DATETIME', format: { useLocalDateTime: true } } as any)]);
        const def = findDef(component.getColumnDefs(), 'd');
        const result = def.valueGetter({ colDef: { field: 'd' }, data: { d: '2020-01-01T00:00:00' } });
        expect(result instanceof Date).toBe(true);
    });

    it('wraps the value getter to resolve a valuelist entry', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'v', dataprovider: 'v', valuelist: [{ realValue: 1, displayValue: 'One' }] } as any)]);
        const def = findDef(component.getColumnDefs(), 'v');
        const result = def.valueGetter({ colDef: { field: 'v' }, data: { v: 1 } });
        expect(result).toEqual({ realValue: 1, displayValue: 'One' });
    });

    it('builds a custom cell renderer from a string function', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'r', dataprovider: 'r', cellRendererFunc: ((..._a: any[]) => 'R') as any } as any)]);
        const def = findDef(component.getColumnDefs(), 'r');
        expect(typeof def.cellRenderer).toBe('function');
    });

    it('hides a non-visible column and disables sort when configured', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'h', dataprovider: 'h', visible: false, enableSort: false } as any)]);
        const def = findDef(component.getColumnDefs(), 'h');
        expect(def.hide).toBe(true);
        expect(def.sortable).toBe(false);
    });

    it('skips excluded columns', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ id: 'keep', dataprovider: 'keep' }),
            makeColumn({ id: 'drop', dataprovider: 'drop', excluded: true } as any)
        ]);
        const defs = component.getColumnDefs();
        expect(findDef(defs, 'keep')).toBeDefined();
        expect(findDef(defs, 'drop')).toBeUndefined();
    });

    it('enables row group and pivot flags when configured and enabled', () => {
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'g', dataprovider: 'g', enableRowGroup: true, enablePivot: true, aggFunc: 'sum' } as any)]);
        const def = findDef(component.getColumnDefs(), 'g');
        expect(def.enableRowGroup).toBe(true);
        expect(def.enablePivot).toBe(true);
        expect(def.aggFunc).toBe('sum');
        expect(def.enableValue).toBe(true);
    });
});

