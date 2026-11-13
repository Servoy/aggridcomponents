import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, FormattingService, ServoyPublicService } from '@servoy/public';
import { DateFilter } from './datefilter';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateTime as DateTimeLuxon } from 'luxon';

/**
 * Tests for the DateFilter format resolution, operation handling and condition building.
 * tempus-dominus (created in ngAfterViewInit) is never instantiated; we drive OUR agInit
 * format derivation, the real/UI value helpers and getCondition logic with stubbed element refs.
 */
describe('DateFilter', () => {
    let filter: DateFilter;
    let ngGrid: any;
    let formatting: any;

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            column: { getColId: () => 'c' },
            colDef: { field: 'c' },
            context: { componentParent: ngGrid },
            filterChangedCallback: vi.fn(),
            ...overrides
        };
    }

    function stubElements(fromValue = '', toValue = '') {
        (filter as any).elementRef = () => ({ nativeElement: { value: fromValue } });
        (filter as any).elementToRef = () => ({ nativeElement: { value: toValue } });
    }

    beforeEach(async () => {
        formatting = { parse: vi.fn() };
        ngGrid = {
            agGridOptions: { localeText: {} },
            getValuelistForFilter: vi.fn().mockReturnValue(null),
            getColumn: vi.fn().mockReturnValue(null),
            getColumnFormat: vi.fn().mockReturnValue(null),
            detectChanges: vi.fn(),
            format: vi.fn((v: any) => 'fmt:' + v),
            hasValuelistResolvedDisplayData: vi.fn().mockReturnValue(false),
            setTimeout: vi.fn((fn: () => void) => fn())
        };

        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, DateFilter],
            providers: [FormattingService],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        filter = TestBed.runInInjectionContext(() => TestBed.createComponent(DateFilter).componentInstance);
        (filter as any).formattingService = formatting;
    });

    describe('agInit - locale labels and format', () => {
        it('falls back to default operation labels when localeText is empty', () => {
            filter.agInit(makeParams());
            expect(filter.equals).toBe('Equals');
            expect(filter.inRange).toBe('Between');
            expect(filter.notBlank).toBe('Not blank');
        });

        it('uses localeText overrides for the operation labels', () => {
            ngGrid.agGridOptions.localeText = { equals: 'Gelijk', inRange: 'Tussen' };
            filter.agInit(makeParams());
            expect(filter.equals).toBe('Gelijk');
            expect(filter.inRange).toBe('Tussen');
        });

        it('builds a default DATETIME format when the column has none', () => {
            filter.agInit(makeParams());
            expect(filter.format.type).toBe('DATETIME');
            expect(filter.format.display).toBe('MM/dd/yyyy hh:mm a');
        });

        it('uses an object column format directly', () => {
            ngGrid.getColumn.mockReturnValue({ format: { type: 'DATETIME', display: 'dd-MM-yyyy' } });
            filter.agInit(makeParams());
            expect(filter.format.display).toBe('dd-MM-yyyy');
        });

        it('parses a pipe-delimited string column format', () => {
            ngGrid.getColumn.mockReturnValue({ format: 'dd-MM-yyyy|yyyy-MM-dd' });
            filter.agInit(makeParams());
            expect(filter.format.display).toBe('dd-MM-yyyy');
            expect(filter.format.edit).toBe('yyyy-MM-dd');
        });
    });

    describe('getFilterRealValue', () => {
        beforeEach(() => {
            filter.agInit(makeParams());
            stubElements('01/01/2020');
        });

        it('returns a space sentinel for blank/notBlank operations', () => {
            filter.selectedFilterOperation = 'blank';
            expect(filter.getFilterRealValue()).toBe(' ');
        });

        it('parses the input to a Date for a value operation', () => {
            const d = new Date(2020, 0, 1);
            formatting.parse.mockReturnValue(d);
            filter.selectedFilterOperation = 'equals';
            expect(filter.getFilterRealValue()).toBe(d);
        });

        it('returns null when parsing fails', () => {
            formatting.parse.mockReturnValue('x');
            filter.selectedFilterOperation = 'equals';
            expect(filter.getFilterRealValue()).toBeNull();
        });
    });

    describe('onFilterOperationChange', () => {
        beforeEach(() => {
            filter.agInit(makeParams());
            stubElements();
        });

        it('sets the selected operation', () => {
            filter.onFilterOperationChange({ target: { value: 'greaterThan' } } as any);
            expect(filter.selectedFilterOperation).toBe('greaterThan');
        });

        it('clears the UI value and fires valueChanged for blank', () => {
            const spy = vi.spyOn(filter, 'valueChanged').mockImplementation(() => {});
            const setSpy = vi.spyOn(filter, 'setFilterUIValue');
            filter.onFilterOperationChange({ target: { value: 'blank' } } as any);
            expect(setSpy).toHaveBeenCalledWith('');
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('getCondition', () => {
        beforeEach(() => {
            filter.agInit(makeParams());
            stubElements('01/01/2020');
        });

        it('includes dateFrom for a simple equals condition', () => {
            const d = new Date(2020, 0, 1);
            formatting.parse.mockReturnValue(d);
            filter.selectedFilterOperation = 'equals';
            const cond = filter.getCondition(null);
            expect(cond.filterType).toBe('date');
            expect(cond.type).toBe('equals');
            expect(cond.dateFromMs).toBe(d.getTime());
        });

        it('omits date fields for a blank condition', () => {
            filter.selectedFilterOperation = 'blank';
            const cond = filter.getCondition(null);
            expect(cond.dateFrom).toBeUndefined();
        });

        it('includes dateTo for an inRange condition', () => {
            const from = new Date(2020, 0, 1);
            const to = new Date(2020, 0, 31);
            formatting.parse.mockImplementation((v: any) => (v === 'from' ? from : to));
            (filter as any).elementRef = () => ({ nativeElement: { value: 'from' } });
            (filter as any).elementToRef = () => ({ nativeElement: { value: 'to' } });
            filter.selectedFilterOperation = 'inRange';
            const cond = filter.getCondition(null);
            expect(cond.dateToMs).toBe(to.getTime());
        });
    });

    describe('getFilterUIValue / setFilterUIValue', () => {
        it('reads and writes the input value', () => {
            filter.agInit(makeParams());
            const el = { nativeElement: { value: 'x' } };
            (filter as any).elementRef = () => el;
            expect(filter.getFilterUIValue()).toBe('x');
            filter.setFilterUIValue('y');
            expect(el.nativeElement.value).toBe('y');
        });
    });

    describe('getCondition2', () => {
        beforeEach(() => {
            filter.agInit(makeParams({ suppressAndOrCondition: false }));
            stubElements('01/01/2020');
        });

        it('includes dateFrom for an equals condition2', () => {
            const d = new Date(2020, 0, 1);
            formatting.parse.mockReturnValue(d);
            filter.selectedFilterOperation = 'equals';
            const cond = filter.getCondition2(null);
            expect(cond.filterType).toBe('date');
            expect(cond.dateFromMs).toBe(d.getTime());
        });

        it('includes dateTo for an inRange condition2', () => {
            const from = new Date(2020, 0, 1);
            const to = new Date(2020, 0, 31);
            formatting.parse.mockImplementation((v: any) => (v === 'from' ? from : to));
            (filter as any).elementRef = () => ({ nativeElement: { value: 'from' } });
            (filter as any).elementToRef = () => ({ nativeElement: { value: 'to' } });
            filter.selectedFilterOperation = 'inRange';
            const cond = filter.getCondition2(null);
            expect(cond.dateToMs).toBe(to.getTime());
        });
    });

    describe('getDateToRealValue', () => {
        it('parses the elementTo value into a Date', () => {
            filter.agInit(makeParams());
            const d = new Date(2022, 2, 3);
            formatting.parse.mockReturnValue(d);
            (filter as any).elementToRef = () => ({ nativeElement: { value: '03/03/2022' } });
            expect(filter.getDateToRealValue()).toBe(d);
        });

        it('returns null when the elementTo value does not parse', () => {
            filter.agInit(makeParams());
            formatting.parse.mockReturnValue('x');
            (filter as any).elementToRef = () => ({ nativeElement: { value: 'bad' } });
            expect(filter.getDateToRealValue()).toBeNull();
        });
    });

    describe('onClearFilter', () => {
        it('clears both the from and to inputs', () => {
            filter.agInit(makeParams({ suppressAndOrCondition: true }));
            const fromEl = { nativeElement: { value: 'x' } };
            const toEl = { nativeElement: { value: 'y' } };
            (filter as any).elementRef = () => fromEl;
            (filter as any).element1Ref = () => ({ nativeElement: { value: 'z' } });
            (filter as any).elementToRef = () => toEl;
            filter.onClearFilter();
            expect(fromEl.nativeElement.value).toBe('');
            expect(toEl.nativeElement.value).toBe('');
        });
    });
});

