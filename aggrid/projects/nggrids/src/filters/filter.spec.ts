import { TestBed } from '@angular/core/testing';
import { ServoyPublicTestingModule } from '@servoy/public';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterDirective } from './filter';
import { NULL_VALUE } from '../commons/constants';

/**
 * Unit tests for the base FilterDirective. ag-grid filter params and the grid are mocked;
 * we drive OUR condition-building, model lifecycle and valuelist filtering logic directly.
 * The element viewChild signals are stubbed with plain objects so the DOM-touching helpers
 * can be exercised without a live component.
 */
describe('FilterDirective', () => {
    let filter: FilterDirective;
    let ngGrid: any;

    function stubElements(filter: FilterDirective, value = '', value1 = '') {
        const el = { nativeElement: { value } };
        const el1 = { nativeElement: { value: value1 } };
        (filter as any).elementRef = () => el;
        (filter as any).element1Ref = () => el1;
        return { el, el1 };
    }

    function subscribable(values: any) {
        return { subscribe: (cb: any) => { cb(values); return { unsubscribe() {} }; } };
    }

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            column: { getColId: () => 'c' },
            colDef: { field: 'c' },
            context: { componentParent: ngGrid },
            filterChangedCallback: vi.fn(),
            ...overrides
        };
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ServoyPublicTestingModule] }).compileComponents();
        ngGrid = {
            agGridOptions: { localeText: {} },
            getValuelistForFilter: vi.fn().mockReturnValue(null),
            getColumnFormat: vi.fn().mockReturnValue(null),
            detectChanges: vi.fn(),
            format: vi.fn((v: any) => 'fmt:' + v),
            hasValuelistResolvedDisplayData: vi.fn().mockReturnValue(false),
            setTimeout: vi.fn((fn: () => void) => fn())
        };
        filter = TestBed.runInInjectionContext(() => new FilterDirective());
    });

    describe('agInit', () => {
        it('treats params with filterParams as a floating filter', () => {
            filter.agInit(makeParams({ filterParams: makeParams() }));
            expect(filter.isFloating).toBe(true);
        });

        it('treats params without filterParams as a non-floating filter', () => {
            filter.agInit(makeParams());
            expect(filter.isFloating).toBe(false);
            expect(filter.params).toBeDefined();
        });

        it('uses the default Clear/Apply labels when localeText is empty', () => {
            filter.agInit(makeParams());
            expect(filter.txtClearFilter).toBe('Clear');
            expect(filter.txtApplyFilter).toBe('Apply');
        });

        it('uses localeText overrides for the button labels', () => {
            ngGrid.agGridOptions.localeText = { clearFilter: 'Wis', applyFilter: 'Pas toe' };
            filter.agInit(makeParams());
            expect(filter.txtClearFilter).toBe('Wis');
            expect(filter.txtApplyFilter).toBe('Pas toe');
        });

        it('loads valuelist values and prepends NULL_VALUE when there is no apply button', () => {
            const vl = { filterList: vi.fn().mockReturnValue(subscribable([{ realValue: 1, displayValue: 'One' }])) };
            ngGrid.getValuelistForFilter.mockReturnValue(vl);
            filter.agInit(makeParams());
            expect(filter.hasValuelistSet).toBe(true);
            expect(filter.valuelistValues[0]).toBe(NULL_VALUE);
            expect(filter.valuelistValues.length).toBe(2);
        });
    });

    describe('isFilterActive / model accessors', () => {
        it('is inactive while the model is null', () => {
            expect(filter.isFilterActive()).toBe(false);
        });

        it('is active once the model is set', () => {
            filter.setModel({ filter: 'x' });
            expect(filter.isFilterActive()).toBe(true);
            expect(filter.getModel()).toEqual({ filter: 'x' });
        });

        it('exposes itself as the framework component instance', () => {
            expect(filter.getFrameworkComponentInstance()).toBe(filter);
        });
    });

    describe('getCondition / getCondition2', () => {
        beforeEach(() => {
            filter.agInit(makeParams());
            stubElements(filter, 'display');
        });

        it('builds a text condition for a non-numeric real value', () => {
            // the base getFilterUIValue returns null, so uiValue is null here
            expect(filter.getCondition('abc')).toEqual({ filterType: 'text', type: 'equals', filter: 'abc', uiValue: null });
        });

        it('builds a number condition for a numeric real value', () => {
            expect(filter.getCondition('123').filterType).toBe('number');
        });

        it('builds a uuid condition when the real value is a UUID', () => {
            filter.isRealValueUUID = true;
            expect(filter.getCondition('abc').filterType).toBe('uuid');
            expect(filter.getCondition2('abc').filterType).toBe('uuid');
        });
    });

    describe('getFilterRealValue', () => {
        it('resolves the real value from a matching trimmed display value', () => {
            filter.agInit(makeParams());
            filter.valuelistValues = [{ realValue: 7, displayValue: 'Seven' }];
            filter.getFilterUIValue = () => ' Seven ';
            filter.getFormatedDisplayValue = (d: string) => d;
            expect(filter.getFilterRealValue()).toBe(7);
        });

        it('returns an empty string when nothing matches', () => {
            filter.agInit(makeParams());
            filter.valuelistValues = [{ realValue: 7, displayValue: 'Seven' }];
            filter.getFilterUIValue = () => 'None';
            filter.getFormatedDisplayValue = (d: string) => d;
            expect(filter.getFilterRealValue()).toBe('');
        });
    });

    describe('getFormatedDisplayValue', () => {
        beforeEach(() => filter.agInit(makeParams()));

        it('returns a non-breaking space for null/empty', () => {
            expect(filter.getFormatedDisplayValue(null as any)).toBe('\u00A0');
            expect(filter.getFormatedDisplayValue('')).toBe('\u00A0');
        });

        it('formats the value through the grid when a valuelist and format are set', () => {
            filter.hasValuelistSet = true;
            filter.format = { display: 'x' };
            expect(filter.getFormatedDisplayValue('v')).toBe('fmt:v');
        });

        it('returns the plain display value when no format', () => {
            expect(filter.getFormatedDisplayValue('plain')).toBe('plain');
        });
    });

    describe('suppressAndOrCondition / hasApplyButton', () => {
        it('reflects the suppressAndOrCondition param', () => {
            filter.agInit(makeParams({ suppressAndOrCondition: true }));
            expect(filter.suppressAndOrCondition()).toBe(true);
        });

        it('hasApplyButton is true for a non-floating filter with an apply button', () => {
            filter.agInit(makeParams({ buttons: ['apply'], suppressAndOrCondition: true }));
            expect(filter.hasApplyButton()).toBe(true);
        });

        it('hasApplyButton is false for a floating filter', () => {
            filter.agInit(makeParams({ filterParams: makeParams({ buttons: ['apply'] }) }));
            expect(filter.hasApplyButton()).toBe(false);
        });
    });

    describe('doFilter', () => {
        beforeEach(() => {
            filter.agInit(makeParams({ suppressAndOrCondition: true }));
            stubElements(filter, 'x');
        });

        it('nulls the model and fires the callback when there is no real value', () => {
            filter.getFilterRealValue = () => '';
            filter.doFilter();
            expect(filter.model).toBeNull();
            expect(filter.params.filterChangedCallback).toHaveBeenCalled();
        });

        it('sets the condition model when a real value is present', () => {
            filter.getFilterRealValue = () => 'abc';
            filter.getFilterUIValue = () => 'abc';
            filter.doFilter();
            expect(filter.model).toMatchObject({ type: 'equals', filter: 'abc' });
        });
    });

    describe('onParentModelChanged / onFloatingFilterChanged', () => {
        it('sets the UI value from the parent model uiValue', () => {
            filter.agInit(makeParams());
            const setSpy = vi.spyOn(filter, 'setFilterUIValue');
            filter.onParentModelChanged({ uiValue: 'v' }, {} as any);
            expect(setSpy).toHaveBeenCalledWith('v');
        });

        it('clears the UI value when the parent model is null', () => {
            filter.agInit(makeParams());
            const setSpy = vi.spyOn(filter, 'setFilterUIValue');
            filter.onParentModelChanged(null, {} as any);
            expect(setSpy).toHaveBeenCalledWith('');
        });
    });

    describe('valueChanged', () => {
        it('applies the filter via the grid timeout when there is no apply button', () => {
            filter.agInit(makeParams({ suppressAndOrCondition: true }));
            stubElements(filter, 'x');
            filter.getFilterRealValue = () => 'abc';
            filter.getFilterUIValue = () => 'abc';
            filter.valueChanged();
            expect(ngGrid.setTimeout).toHaveBeenCalled();
            expect(filter.params.filterChangedCallback).toHaveBeenCalled();
        });
    });

    describe('onApplyFilter', () => {
        it('calls doFilter directly for a non-floating filter', () => {
            filter.agInit(makeParams({ suppressAndOrCondition: true }));
            stubElements(filter, 'x');
            const spy = vi.spyOn(filter, 'doFilter').mockImplementation(() => {});
            filter.onApplyFilter();
            expect(spy).toHaveBeenCalled();
        });

        it('routes through the parent filter instance for a floating filter', () => {
            const parentInstance = {
                valuelistValuesDefer: { promise: Promise.resolve() },
                onFloatingFilterChanged: vi.fn()
            };
            const floatingParams = makeParams({ filterParams: makeParams() });
            floatingParams.parentFilterInstance = (cb: any) => cb(parentInstance);
            filter.agInit(floatingParams);
            filter.getFilterUIValue = () => 'val';
            filter.onApplyFilter();
            expect(filter.isFloating).toBe(true);
        });
    });

    describe('onFloatingFilterChanged', () => {
        it('sets the UI value and runs doFilter', () => {
            filter.agInit(makeParams({ suppressAndOrCondition: true }));
            stubElements(filter, 'x');
            const setSpy = vi.spyOn(filter, 'setFilterUIValue');
            const doSpy = vi.spyOn(filter, 'doFilter').mockImplementation(() => {});
            filter.onFloatingFilterChanged('equals', 'v');
            expect(setSpy).toHaveBeenCalledWith('v');
            expect(doSpy).toHaveBeenCalled();
        });
    });

    describe('doFilter OR-condition', () => {
        it('combines two conditions with an OR operator when both are present', () => {
            filter.agInit(makeParams({ suppressAndOrCondition: false }));
            stubElements(filter, 'a', 'b');
            let call = 0;
            filter.getFilterRealValue = () => ++call === 1 ? 'a' : 'b';
            filter.getFilterUIValue = () => 'a';
            filter.getSecondFilterUIValue = () => 'b';
            filter.doFilter();
            expect(filter.model.operator).toBe('OR');
            expect(filter.model.conditions.length).toBe(2);
        });

        it('uses only the second condition when the first is empty', () => {
            filter.agInit(makeParams({ suppressAndOrCondition: false }));
            stubElements(filter, '', 'b');
            let call = 0;
            filter.getFilterRealValue = () => ++call === 1 ? '' : 'b';
            filter.getFilterUIValue = () => '';
            filter.getSecondFilterUIValue = () => 'b';
            filter.doFilter();
            expect(filter.model).toMatchObject({ type: 'equals', filter: 'b' });
        });
    });

    describe('doesFilterPass', () => {
        it('returns true when there is no model', () => {
            filter.agInit(makeParams());
            filter.model = null;
            expect(filter.doesFilterPass({ data: {} })).toBe(true);
        });

        it('compares the model filter against the row value when display data is not resolved', () => {
            filter.agInit(makeParams());
            filter.model = { filter: 'FR' };
            filter.params.colDef.field = 'country';
            expect(filter.doesFilterPass({ data: { country: 'FR' } })).toBe(true);
            expect(filter.doesFilterPass({ data: { country: 'DE' } })).toBe(false);
        });
    });

    describe('getSecondFilterUIValue default', () => {
        it('returns null in the base directive', () => {
            expect(filter.getSecondFilterUIValue()).toBeNull();
        });
    });
});

