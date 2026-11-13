import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { ValuelistFilter } from './valuelistfilter';
import { NgbTypeaheadConfig } from '@ng-bootstrap/ng-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Render test for the ValuelistFilter standalone typeahead filter. ag-grid and the valuelist are
 * mocked; the ngbTypeahead template is rendered by Angular so OUR template bindings and the
 * input read/write helpers run against the real rendered inputs.
 */
describe('ValuelistFilter - render', () => {
    let fixture: ComponentFixture<ValuelistFilter>;
    let filter: ValuelistFilter;
    let ngGrid: any;

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
        ngGrid = {
            agGridOptions: { localeText: {} },
            getValuelistForFilter: vi.fn().mockReturnValue(null),
            getColumnFormat: vi.fn().mockReturnValue({ display: 'x' }),
            detectChanges: vi.fn(),
            format: vi.fn((v: any) => 'fmt:' + v),
            setTimeout: vi.fn((fn: () => void) => fn())
        };
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, ValuelistFilter],
            providers: [NgbTypeaheadConfig],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();
        fixture = TestBed.createComponent(ValuelistFilter);
        filter = fixture.componentInstance;
    });

    afterEach(() => vi.restoreAllMocks());

    it('renders the typeahead input(s)', () => {
        filter.agInit(makeParams({ suppressAndOrCondition: false }));
        fixture.detectChanges();
        const inputs = fixture.nativeElement.querySelectorAll('input.ag-filter-filter');
        expect(inputs.length).toBe(2);
    });

    it('reads and writes the rendered input value', () => {
        filter.agInit(makeParams({ suppressAndOrCondition: true }));
        fixture.detectChanges();
        filter.setFilterUIValue('typed');
        expect(filter.getFilterUIValue()).toBe('typed');
    });

    it('reads the second input value', () => {
        filter.agInit(makeParams({ suppressAndOrCondition: false }));
        fixture.detectChanges();
        filter.element1Ref()!.nativeElement.value = 'two';
        expect(filter.getSecondFilterUIValue()).toBe('two');
    });

    it('resultFormatter formats a non-empty display value', () => {
        filter.agInit(makeParams());
        fixture.detectChanges();
        expect(filter.resultFormatter({ displayValue: 'A', realValue: 1 })).toBe('fmt:A');
    });
});
