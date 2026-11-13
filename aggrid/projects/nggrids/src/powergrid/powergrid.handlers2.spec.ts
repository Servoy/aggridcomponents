import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { AgGridModule } from 'ag-grid-angular';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Pure-logic PowerGrid click/navigation/value-changed coverage. ag-grid is mocked via the agGrid()
 * signal; the fixture grid onGridReadyBase is stubbed and destroy is a no-op so no live api is
 * touched. We drive OUR handler branches (click/double-click/context, key navigation, tab
 * navigation, onCellValueChanged, onColumnRowGroupChanged, onRowGroupOpenedHandler).
 */
describe('PowerGrid - handlers & navigation (logic)', () => {
    let fixture: ComponentFixture<PowerGrid>;
    let component: PowerGrid;
    let api: any;

    function makeColumn(overrides: Partial<PowerGridColumn> = {}): PowerGridColumn {
        return { dataprovider: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as PowerGridColumn;
    }

    function fakeApi(overrides: Record<string, any> = {}) {
        const base: Record<string, any> = {
            getDisplayedRowAtIndex: vi.fn(),
            getSelectedNodes: vi.fn().mockReturnValue([]),
            getEditingCells: vi.fn().mockReturnValue([]),
            getRowGroupColumns: vi.fn().mockReturnValue([]),
            forEachNode: vi.fn(),
            getCellValue: vi.fn(),
            startEditingCell: vi.fn(),
            stopEditing: vi.fn(),
            setGridOption: vi.fn(),
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
        fixture.componentRef.setInput('enabled', true);
        fixture.componentRef.setInput('columns', [makeColumn({ id: 'c', dataprovider: 'c' })]);
        component.agGridOptions = component.agGridOptions || {} as any;
        api = fakeApi();
        (component as any).agGrid = () => ({ api });
        (component as any).doc = document;
        vi.spyOn(component as any, 'onGridReadyBase').mockImplementation(() => { /* no-op */ });
        (component as any).destroy = () => undefined;
    });

    function clickParams(overrides: Record<string, any> = {}): any {
        return {
            data: { c: 'v' },
            node: { rowPinned: null, setDataValue: vi.fn(), groupData: {}, aggData: {} },
            colDef: { field: 'c', colId: 'c', editable: true },
            column: { colId: 'c' },
            value: 'v',
            event: { target: { closest: () => null } },
            ...overrides
        };
    }

    describe('onCellClicked', () => {
        it('fires onCellClick with the row data', () => {
            const onCellClick = vi.fn();
            (component as any).onCellClick = () => onCellClick;
            component.onCellClicked(clickParams());
            expect(onCellClick).toHaveBeenCalled();
            expect(onCellClick.mock.calls[0][0]).toEqual({ c: 'v' });
        });

        it('toggles a checkbox value for an editable CHECKBOX column', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c', dataprovider: 'c', editType: 'CHECKBOX' } as any)]);
            fixture.componentRef.setInput('readOnly', false);
            // isColumnEditable requires the click target to be the checkbox icon <I>
            const params = clickParams({ value: '0', event: { target: { tagName: 'I', closest: () => null } } });
            component.onCellClicked(params);
            expect(params.node.setDataValue).toHaveBeenCalledWith('c', 1);
        });
    });

    describe('cellClickHandler', () => {
        it('does nothing when the grid is disabled', () => {
            fixture.componentRef.setInput('enabled', false);
            const onCellClick = vi.fn();
            (component as any).onCellClick = () => onCellClick;
            component.cellClickHandler(clickParams());
            expect(onCellClick).not.toHaveBeenCalled();
        });

        it('fires onFooterClick for a bottom-pinned row', () => {
            const onFooterClick = vi.fn();
            (component as any).onFooterClick = () => onFooterClick;
            component.cellClickHandler(clickParams({ node: { rowPinned: 'bottom' } }));
            expect(onFooterClick).toHaveBeenCalled();
        });

        it('fires onHeaderTextClick for a top-pinned row', () => {
            const onHeaderTextClick = vi.fn();
            (component as any).onHeaderTextClick = () => onHeaderTextClick;
            component.cellClickHandler(clickParams({ node: { rowPinned: 'top' } }));
            expect(onHeaderTextClick).toHaveBeenCalled();
        });

        it('defers to a double-click timer when onCellDoubleClick is set', () => {
            vi.useFakeTimers();
            (component as any).onCellDoubleClick = () => (() => undefined);
            const onCellClick = vi.fn();
            (component as any).onCellClick = () => onCellClick;
            component.cellClickHandler(clickParams());
            vi.advanceTimersByTime(300);
            expect(onCellClick).toHaveBeenCalled();
            vi.useRealTimers();
        });
    });

    describe('onCellDoubleClicked', () => {
        it('ignores the event while editing', () => {
            api.getEditingCells.mockReturnValue([{}]);
            const onCellDoubleClick = vi.fn();
            (component as any).onCellDoubleClick = () => onCellDoubleClick;
            component.onCellDoubleClicked(clickParams());
            expect(onCellDoubleClick).not.toHaveBeenCalled();
        });

        it('fires onCellDoubleClick with the row data otherwise', () => {
            const onCellDoubleClick = vi.fn();
            (component as any).onCellDoubleClick = () => onCellDoubleClick;
            component.onCellDoubleClicked(clickParams());
            expect(onCellDoubleClick).toHaveBeenCalled();
        });
    });

    describe('onCellContextMenu', () => {
        it('fires onCellRightClick with the row data', () => {
            const onCellRightClick = vi.fn();
            (component as any).onCellRightClick = () => onCellRightClick;
            component.onCellContextMenu(clickParams());
            expect(onCellRightClick).toHaveBeenCalled();
        });
    });

    describe('selectionChangeNavigation', () => {
        it('skips group/selected rows and suggests the next selectable row on arrow-down', () => {
            const row2 = { id: 'r2', group: false, selected: false, setSelected: vi.fn() };
            api.getDisplayedRowAtIndex.mockImplementation((idx: number) => idx === 1 ? { id: 'g', group: true } : idx === 2 ? row2 : null);
            fixture.componentRef.setInput('multiSelect', false);
            const result = component.selectionChangeNavigation({
                event: { keyCode: 40 },
                previousCellPosition: { rowIndex: 0 },
                nextCellPosition: { rowIndex: 0 }
            });
            expect(result.rowIndex).toBe(2);
            expect(row2.setSelected).toHaveBeenCalledWith(true, true);
        });

        it('returns null when the next row is not yet rendered (no id)', () => {
            api.getDisplayedRowAtIndex.mockReturnValue({ group: false, selected: false });
            const result = component.selectionChangeNavigation({
                event: { keyCode: 38 },
                previousCellPosition: { rowIndex: 2 },
                nextCellPosition: { rowIndex: 2 }
            });
            expect(result).toBeNull();
        });

        it('passes left/right through unchanged', () => {
            const next = { rowIndex: 1, _m: true };
            const result = component.selectionChangeNavigation({ event: { keyCode: 39 }, previousCellPosition: { rowIndex: 1 }, nextCellPosition: next });
            expect(result).toBe(next);
        });
    });

    describe('tabSelectionChangeNavigation', () => {
        it('returns false when disabled', () => {
            fixture.componentRef.setInput('enabled', false);
            expect(component.tabSelectionChangeNavigation({ nextCellPosition: { rowIndex: 0 } })).toBe(false);
        });

        it('selects the suggested next cell row and returns it', () => {
            const node = { rowIndex: 1, setSelected: vi.fn() };
            api.forEachNode.mockImplementation((cb: any) => cb(node));
            const params = { nextCellPosition: { rowIndex: 1, rowPinned: null }, event: {} };
            const result = component.tabSelectionChangeNavigation(params);
            expect(node.setSelected).toHaveBeenCalledWith(true, true);
            expect(result).toBe(params.nextCellPosition);
        });

        it('returns false when there is no suggested next cell', () => {
            (component as any).sabloTabseqDirective = () => undefined;
            expect(component.tabSelectionChangeNavigation({ nextCellPosition: null, backwards: false, event: {} })).toBe(false);
        });
    });

    describe('onCellValueChanged', () => {
        it('emits dataChange and fires onColumnDataChange when the value changed', () => {
            fixture.componentRef.setInput('columns', [makeColumn({ id: 'c', dataprovider: 'c' })]);
            fixture.componentRef.setInput('useLazyLoading', false);
            const customArray: any = ['x'];
            customArray.getStateHolder = () => ({ markAllChanged: vi.fn() });
            (component as any)._data = () => customArray;
            const onColumnDataChange = vi.fn().mockReturnValue(Promise.resolve(true));
            (component as any).onColumnDataChange = () => onColumnDataChange;
            vi.spyOn(component, 'createJSEvent').mockReturnValue({} as any);
            const emitSpy = vi.fn();
            component.dataChange.subscribe(emitSpy);
            component.onCellValueChanged({
                node: { rowIndex: 0 }, column: { colId: 'c' }, colDef: { field: 'c' },
                newValue: 'new', oldValue: 'old', data: { c: 'new' }
            });
            expect(emitSpy).toHaveBeenCalled();
            expect(onColumnDataChange).toHaveBeenCalled();
        });

        it('ignores an update for a different invalid cell', () => {
            component.invalidCellDataIndex = { rowIndex: 9, colKey: 'x' };
            const emitSpy = vi.fn();
            component.dataChange.subscribe(emitSpy);
            component.onCellValueChanged({ node: { rowIndex: 0 }, column: { colId: 'c' }, colDef: { field: 'c' }, newValue: 'n', oldValue: 'o', data: {} });
            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('onColumnRowGroupChanged', () => {
        it('caches grouped fields in the state', () => {
            api.getRowGroupColumns.mockReturnValue([{ colDef: { field: 'country' } }]);
            component.onColumnRowGroupChanged({});
            expect(component.state.expanded.fields).toContain('country');
        });
    });

    describe('onRowGroupOpenedHandler', () => {
        it('persists the expanded state and fires onRowGroupOpened', () => {
            const onRowGroupOpened = vi.fn();
            (component as any).onRowGroupOpened = () => onRowGroupOpened;
            const node = { expanded: true, field: 'country', key: 'FR', parent: { level: -1, group: false } };
            component.onRowGroupOpenedHandler({ node });
            expect(onRowGroupOpened).toHaveBeenCalled();
        });
    });
});

