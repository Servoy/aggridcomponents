import { TestBed } from '@angular/core/testing';
import { ServoyPublicTestingModule } from '@servoy/public';
import { NgbTypeaheadConfig } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValuelistFilter } from './valuelistfilter';
import { NULL_VALUE } from '../commons/constants';

/**
 * Unit tests for the ValuelistFilter typeahead filter. The grid, ag-grid params and the
 * valuelist are mocked. We exercise OUR filter-value observable pipeline and the
 * result/input formatter helpers that back the ngbTypeahead bindings.
 */
describe('ValuelistFilter', () => {
    let filter: ValuelistFilter;
    let ngGrid: any;

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
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule],
            providers: [NgbTypeaheadConfig]
        }).compileComponents();
        ngGrid = {
            agGridOptions: { localeText: {} },
            getValuelistForFilter: vi.fn().mockReturnValue(null),
            getColumnFormat: vi.fn().mockReturnValue({ display: 'x' }),
            detectChanges: vi.fn(),
            format: vi.fn((v: any) => 'fmt:' + v),
            hasValuelistResolvedDisplayData: vi.fn().mockReturnValue(false),
            setTimeout: vi.fn((fn: () => void) => fn())
        };
        filter = TestBed.runInInjectionContext(() => new ValuelistFilter());
        filter.agInit(makeParams());
    });

    describe('resultFormatter', () => {
        it('returns a non-breaking space for empty display values', () => {
            expect(filter.resultFormatter({ displayValue: '', realValue: 1 })).toBe('\u00A0');
        });

        it('formats a display value through the grid', () => {
            expect(filter.resultFormatter({ displayValue: 'A', realValue: 1 })).toBe('fmt:A');
        });
    });

    describe('inputFormatter', () => {
        it('returns empty string for null', () => {
            expect(filter.inputFormatter(null)).toBe('');
        });

        it('unwraps and formats a displayValue object', () => {
            expect(filter.inputFormatter({ displayValue: 'A', realValue: 1 })).toBe('fmt:A');
        });

        it('resolves a real value through the valuelist before formatting', () => {
            const list: any = [{ realValue: 2, displayValue: 'Two' }];
            list.hasRealValues = () => true;
            filter.valuelistValues = list;
            expect(filter.inputFormatter(2)).toBe('fmt:Two');
        });
    });

    describe('getFilterUIValue / setFilterUIValue', () => {
        it('reads and writes the input element value', () => {
            const el = { nativeElement: { value: 'typed' } };
            (filter as any).elementRef = () => el;
            expect(filter.getFilterUIValue()).toBe('typed');
            filter.setFilterUIValue('new');
            expect(el.nativeElement.value).toBe('new');
        });
    });

    describe('getSecondFilterUIValue', () => {
        it('reads the second input element value', () => {
            (filter as any).element1Ref = () => ({ nativeElement: { value: 'two' } });
            expect(filter.getSecondFilterUIValue()).toBe('two');
        });
    });

    describe('doFilterValues observable', () => {
        it('filters the cached values by the typed term (case-insensitive)', () => {
            filter.valuelistValues = [
                { realValue: 1, displayValue: 'Apple' },
                { realValue: 2, displayValue: 'Banana' }
            ];
            const focus$ = new Subject<string>();
            const result = filter.doFilterValues(of('app'), focus$);
            let emitted: any;
            result.subscribe(v => emitted = v);
            expect(emitted).toEqual([{ realValue: 1, displayValue: 'Apple' }]);
        });

        it('loads the valuelist and prepends NULL_VALUE when the cache is empty and there is no apply button', () => {
            filter.valuelistValues = undefined;
            const list = [{ realValue: 1, displayValue: 'One' }];
            // filterList returns a real Observable: the pipeline subscribes to it (populating the
            // cache) and also returns it from switchMap
            ngGrid.getValuelistForFilter.mockReturnValue({ filterList: vi.fn().mockReturnValue(of(list)) });
            const focus$ = new Subject<string>();
            const result = filter.doFilterValues(of(''), focus$);
            result.subscribe(() => { /* trigger */ });
            expect(filter.valuelistValues[0]).toBe(NULL_VALUE);
        });

        it('emits an empty list when there is no valuelist and the cache is empty', () => {
            filter.valuelistValues = undefined;
            ngGrid.getValuelistForFilter.mockReturnValue(null);
            const focus$ = new Subject<string>();
            const result = filter.doFilterValues(of('x'), focus$);
            let emitted: any;
            result.subscribe(v => emitted = v);
            expect(emitted).toEqual([]);
        });
    });
});

