import { TestBed } from '@angular/core/testing';
import { ServoyPublicTestingModule } from '@servoy/public';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RadioFilter } from './radiofilter';

/**
 * Unit tests for the RadioFilter. The grid and ag-grid filter params are mocked; we drive OUR
 * checkbox tri-state logic, the radio-group value read/write helpers and the name builder.
 */
describe('RadioFilter', () => {
    let filter: RadioFilter;
    let ngGrid: any;

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            column: { getColId: () => 'col' },
            colDef: { field: 'col', context: {} },
            context: { componentParent: ngGrid },
            filterChangedCallback: vi.fn(),
            ...overrides
        };
    }

    // builds a fake radio-group container the way the template renders it:
    // a wrapper whose children are <label> elements each holding an <input> at children[0]
    function radioGroup(values: string[], checkedValue?: string) {
        const children = values.map(v => {
            const input = { checked: v === checkedValue, value: v };
            return { children: [input] };
        });
        return { nativeElement: { children } };
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ServoyPublicTestingModule] }).compileComponents();
        ngGrid = {
            agGridOptions: { localeText: {} },
            getValuelistForFilter: vi.fn().mockReturnValue(null),
            getColumnFormat: vi.fn().mockReturnValue(null),
            detectChanges: vi.fn(),
            setTimeout: vi.fn((fn: () => void) => fn())
        };
        filter = TestBed.runInInjectionContext(() => new RadioFilter());
    });

    it('seeds Yes/No valuelist values in the constructor', () => {
        expect(filter.valuelistValues).toEqual([{ displayValue: 'Yes', realValue: 1 }, { displayValue: 'No', realValue: 0 }]);
    });

    describe('getName', () => {
        it('builds the radio input name from the column id', () => {
            filter.agInit(makeParams());
            expect(filter.getName()).toBe('radioFilterInput_col');
            expect(filter.getName('1')).toBe('radioFilterInput_col1');
        });
    });

    describe('useCheckboxForFloatingFilter', () => {
        it('is false for a non-floating filter', () => {
            filter.agInit(makeParams());
            expect(filter.useCheckboxForFloatingFilter()).toBe(false);
        });

        it('is true for a floating filter by default', () => {
            filter.agInit(makeParams({ filterParams: makeParams() }));
            expect(filter.useCheckboxForFloatingFilter()).toBe(true);
        });

        it('is false for a floating filter when floatingFilterRadioAsCheckbox is explicitly false', () => {
            const params = makeParams({ filterParams: makeParams() });
            params.filterParams.colDef.context = { floatingFilterRadioAsCheckbox: false };
            filter.agInit(params);
            // the directive reads this.params.colDef.context from the (inner) filter params
            (filter.params.colDef as any).context = { floatingFilterRadioAsCheckbox: false };
            expect(filter.useCheckboxForFloatingFilter()).toBe(false);
        });
    });

    describe('checkbox tri-state (onCheckboxClick)', () => {
        beforeEach(() => {
            filter.agInit(makeParams({ filterParams: makeParams() }));
            (filter as any).elementRef = () => ({ nativeElement: {} });
        });

        it('cycles the state empty -> No -> Yes -> empty', () => {
            vi.spyOn(filter, 'valueChanged').mockImplementation(() => {});
            expect(filter.checkboxState).toBe('');
            filter.onCheckboxClick();
            expect(filter.checkboxState).toBe('No');
            filter.onCheckboxClick();
            expect(filter.checkboxState).toBe('Yes');
            filter.onCheckboxClick();
            expect(filter.checkboxState).toBe('');
        });

        it('fires valueChanged on each click', () => {
            const spy = vi.spyOn(filter, 'valueChanged').mockImplementation(() => {});
            filter.onCheckboxClick();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('updateCheckboxUI', () => {
        let el: any;
        beforeEach(() => {
            filter.agInit(makeParams({ filterParams: makeParams() }));
            el = { nativeElement: {} };
            (filter as any).elementRef = () => el;
        });

        it('unchecks for the No state', () => {
            filter.checkboxState = 'No';
            filter.updateCheckboxUI();
            expect(el.nativeElement.checked).toBe(false);
            expect(el.nativeElement.indeterminate).toBe(false);
        });

        it('checks for the Yes state', () => {
            filter.checkboxState = 'Yes';
            filter.updateCheckboxUI();
            expect(el.nativeElement.checked).toBe(true);
            expect(el.nativeElement.indeterminate).toBe(false);
        });

        it('is indeterminate for the empty state', () => {
            filter.checkboxState = '';
            filter.updateCheckboxUI();
            expect(el.nativeElement.indeterminate).toBe(true);
        });
    });

    describe('getFilterUIValue / setFilterUIValue - radio group mode', () => {
        beforeEach(() => filter.agInit(makeParams()));

        it('reads the checked radio value', () => {
            (filter as any).elementRef = () => radioGroup(['Yes', 'No'], 'No');
            expect(filter.getFilterUIValue()).toBe('No');
        });

        it('returns null when nothing is checked', () => {
            (filter as any).elementRef = () => radioGroup(['Yes', 'No']);
            expect(filter.getFilterUIValue()).toBeNull();
        });

        it('checks the radio matching the given value', () => {
            const group = radioGroup(['Yes', 'No']);
            (filter as any).elementRef = () => group;
            filter.setFilterUIValue('Yes');
            expect(group.nativeElement.children[0].children[0].checked).toBe(true);
            expect(group.nativeElement.children[1].children[0].checked).toBe(false);
        });
    });

    describe('getFilterUIValue - checkbox mode', () => {
        it('returns the checkbox state', () => {
            filter.agInit(makeParams({ filterParams: makeParams() }));
            (filter as any).elementRef = () => ({ nativeElement: {} });
            filter.checkboxState = 'Yes';
            expect(filter.getFilterUIValue()).toBe('Yes');
        });
    });

    describe('getSecondFilterUIValue', () => {
        it('reads the checked radio from the second group', () => {
            filter.agInit(makeParams());
            (filter as any).element1Ref = () => radioGroup(['Yes', 'No'], 'Yes');
            expect(filter.getSecondFilterUIValue()).toBe('Yes');
        });
    });

    describe('onClearFilter', () => {
        it('clears the checkbox state in checkbox mode', () => {
            filter.agInit(makeParams({ filterParams: makeParams() }));
            (filter as any).elementRef = () => ({ nativeElement: {} });
            filter.checkboxState = 'Yes';
            filter.onClearFilter();
            expect(filter.checkboxState).toBe('');
            expect(filter.model).toBe('');
        });

        it('unchecks all radios in radio-group mode', () => {
            filter.agInit(makeParams({ suppressAndOrCondition: true }));
            const group = radioGroup(['Yes', 'No'], 'Yes');
            (filter as any).elementRef = () => group;
            filter.onClearFilter();
            expect(group.nativeElement.children[0].children[0].checked).toBe(false);
            expect(filter.model).toBe('');
        });
    });
});


