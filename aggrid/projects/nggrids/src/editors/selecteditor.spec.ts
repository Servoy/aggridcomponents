import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { SelectEditor } from './selecteditor';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit tests for the SelectEditor cell editor. ag-grid is mocked - we feed the editor the
 * params shape it reads and drive OUR option-building / getValue logic. The valuelist is a
 * simple stub returning an rxjs-like {subscribe} so we exercise the display-resolution path.
 */
describe('SelectEditor', () => {
    let component: SelectEditor;
    let fixture: ReturnType<typeof TestBed.createComponent<SelectEditor>>;
    let ngGridMock: any;
    let api: any;

    function subscribable(values: any) {
        return { subscribe: (cb: any) => { cb(values); return { unsubscribe() {} }; } };
    }

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            value: 'A',
            column: { getColId: () => 'c', getColDef: () => ({ field: 'c' }) },
            colDef: {},
            node: { data: {} },
            rowIndex: 0,
            context: { componentParent: ngGridMock },
            ...overrides
        };
    }

    beforeEach(async () => {
        api = { tabToNextCell: vi.fn() };
        ngGridMock = {
            editNextCellOnEnter: vi.fn().mockReturnValue(false),
            hasValuelistResolvedDisplayData: vi.fn().mockReturnValue(false),
            getValuelist: vi.fn().mockReturnValue(null),
            agGrid: vi.fn().mockReturnValue({ api })
        };

        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, SelectEditor],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(SelectEditor);
        component = fixture.componentInstance;
    });

    afterEach(() => vi.restoreAllMocks());

    describe('onKeyDown', () => {
        it('tabs to next cell on Enter when editNextCellOnEnter is true', () => {
            ngGridMock.editNextCellOnEnter.mockReturnValue(true);
            component.agInit(makeParams());
            const e = { keyCode: 13, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
            component.onKeyDown(e);
            expect(api.tabToNextCell).toHaveBeenCalled();
            expect(e.preventDefault).toHaveBeenCalled();
            expect(e.stopPropagation).toHaveBeenCalled();
        });

        it('only stops propagation (no tab) on arrow keys', () => {
            component.agInit(makeParams());
            const e = { keyCode: 40, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
            component.onKeyDown(e);
            expect(api.tabToNextCell).not.toHaveBeenCalled();
            expect(e.stopPropagation).toHaveBeenCalled();
        });

        it('ignores non-navigation keys', () => {
            component.agInit(makeParams());
            const e = { keyCode: 65, stopPropagation: vi.fn() } as any;
            component.onKeyDown(e);
            expect(e.stopPropagation).not.toHaveBeenCalled();
        });
    });

    describe('onMouseDown', () => {
        it('stops propagation', () => {
            const e = { stopPropagation: vi.fn() } as any;
            component.onMouseDown(e);
            expect(e.stopPropagation).toHaveBeenCalled();
        });
    });

    describe('createSelectOptions', () => {
        it('creates an option per value and marks the selected display value', () => {
            component.agInit(makeParams());
            fixture.detectChanges();
            component.createSelectOptions([
                { realValue: 1, displayValue: 'One' },
                { realValue: 2, displayValue: 'Two' }
            ], 'Two');
            const select = component.elementRef()!.nativeElement as HTMLSelectElement;
            expect(select.options.length).toBe(2);
            expect(select.options[0].value).toBe('1');
            expect(select.options[0].text).toBe('One');
            expect(select.options[1].selected).toBe(true);
        });

        it('maps a null realValue to the _SERVOY_NULL sentinel', () => {
            component.agInit(makeParams());
            fixture.detectChanges();
            component.createSelectOptions([{ realValue: null, displayValue: '' }], null);
            const select = component.elementRef()!.nativeElement as HTMLSelectElement;
            expect(select.options[0].value).toBe('_SERVOY_NULL');
        });
    });

    describe('getValue', () => {
        it('returns the raw realValue when it equals the display value', () => {
            component.agInit(makeParams());
            fixture.detectChanges();
            component.createSelectOptions([{ realValue: 'X', displayValue: 'X' }], 'X');
            component.elementRef()!.nativeElement.selectedIndex = 0;
            expect(component.getValue()).toBe('X');
        });

        it('returns {displayValue, realValue} when they differ', () => {
            component.agInit(makeParams());
            fixture.detectChanges();
            component.createSelectOptions([{ realValue: '1', displayValue: 'One' }], 'One');
            component.elementRef()!.nativeElement.selectedIndex = 0;
            expect(component.getValue()).toEqual({ displayValue: 'One', realValue: '1' });
        });

        it('maps the _SERVOY_NULL sentinel back to a null realValue', () => {
            component.agInit(makeParams());
            fixture.detectChanges();
            component.createSelectOptions([{ realValue: null, displayValue: 'Blank' }], null);
            component.elementRef()!.nativeElement.selectedIndex = 0;
            expect(component.getValue()).toEqual({ displayValue: 'Blank', realValue: null });
        });
    });

    describe('agInit valuelist deferral', () => {
        it('does not create a defer when there is no valuelist', () => {
            component.agInit(makeParams());
            expect(component.valuelistValuesDefer).toBeUndefined();
        });

        it('resolves the defer directly with the valuelist when display data is not resolved', async () => {
            const vl = subscribable([{ realValue: 1, displayValue: 'One' }]);
            ngGridMock.getValuelist.mockReturnValue(vl);
            ngGridMock.hasValuelistResolvedDisplayData.mockReturnValue(false);
            component.agInit(makeParams());
            const r = await component.valuelistValuesDefer.promise;
            expect(r.valuelist).toBe(vl);
        });

        it('resolves the defer with the filtered list when display data is resolved', async () => {
            const list = [{ realValue: 1, displayValue: 'One' }];
            const vl = { filterList: vi.fn().mockReturnValue(subscribable(list)) };
            ngGridMock.getValuelist.mockReturnValue(vl);
            ngGridMock.hasValuelistResolvedDisplayData.mockReturnValue(true);
            component.agInit(makeParams({ value: 'One' }));
            const r = await component.valuelistValuesDefer.promise;
            expect(r.valuelist).toBe(list);
        });
    });

    describe('agInit valuelist with resolved display data', () => {
        it('resolves the real value for the initial display value when it exists in the list', async () => {
            const list = [{ realValue: 10, displayValue: 'Ten' }, { realValue: 20, displayValue: 'Twenty' }];
            const vl = { filterList: vi.fn().mockReturnValue(subscribable(list)) };
            ngGridMock.getValuelist.mockReturnValue(vl);
            ngGridMock.hasValuelistResolvedDisplayData.mockReturnValue(true);
            const node: any = { data: {} };
            const params = makeParams({ value: { displayValue: 'Ten' }, node, column: { getColId: () => 'c', getColDef: () => ({ field: 'c' }) } });
            component.agInit(params);
            const r = await component.valuelistValuesDefer.promise;
            expect(r.valuelist).toBe(list);
            // the row data field is populated with the resolved real/display pair
            expect(node.data['c']).toEqual({ realValue: 10, displayValue: 'Ten' });
        });

        it('fetches the real value via a second filterList call when not in the first list', async () => {
            const firstList = [{ realValue: 1, displayValue: 'One' }];
            const secondList = [{ realValue: 99, displayValue: 'Ninety-nine' }];
            const vl = {
                filterList: vi.fn()
                    .mockReturnValueOnce(subscribable(firstList))
                    .mockReturnValueOnce(subscribable(secondList))
            };
            ngGridMock.getValuelist.mockReturnValue(vl);
            ngGridMock.hasValuelistResolvedDisplayData.mockReturnValue(true);
            const node: any = { data: {} };
            const params = makeParams({ value: { displayValue: 'Ninety-nine' }, node, column: { getColId: () => 'c', getColDef: () => ({ field: 'c' }) } });
            component.agInit(params);
            const r = await component.valuelistValuesDefer.promise;
            expect(r.value).toBe('Ninety-nine');
            expect(node.data['c']).toEqual({ realValue: 99, displayValue: 'Ninety-nine' });
        });
    });

    describe('ngAfterViewInit', () => {
        it('creates the select options from the resolved defer', async () => {
            // display data resolved -> defer resolves with a real array we can render
            const list = [{ realValue: 1, displayValue: 'One' }];
            const vl = { filterList: vi.fn().mockReturnValue(subscribable(list)) };
            ngGridMock.getValuelist.mockReturnValue(vl);
            ngGridMock.hasValuelistResolvedDisplayData.mockReturnValue(true);
            component.agInit(makeParams({ value: 'One' }));
            fixture.detectChanges();
            const createSpy = vi.spyOn(component, 'createSelectOptions').mockImplementation(() => {});
            component.ngAfterViewInit();
            await component.valuelistValuesDefer.promise;
            expect(createSpy).toHaveBeenCalledWith(list, 'One');
        });
    });
});



