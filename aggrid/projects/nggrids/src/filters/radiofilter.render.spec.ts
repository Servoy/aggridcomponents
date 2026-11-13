import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { RadioFilter } from './radiofilter';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Render test for the RadioFilter standalone component. ag-grid is mocked (we feed the filter
 * params and a mock ngGrid), but the component template is rendered with Angular so the radio /
 * checkbox DOM and the ngAfterViewInit wiring are exercised - that is OUR template + logic, not
 * ag-grid. We then drive the read/write helpers against the real rendered inputs.
 */
describe('RadioFilter - render', () => {
    let fixture: ComponentFixture<RadioFilter>;
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

    beforeEach(async () => {
        ngGrid = {
            agGridOptions: { localeText: {} },
            getValuelistForFilter: vi.fn().mockReturnValue(null),
            getColumnFormat: vi.fn().mockReturnValue(null),
            detectChanges: vi.fn(),
            format: vi.fn((v: any) => v),
            setTimeout: vi.fn((fn: () => void) => fn())
        };
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, RadioFilter],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();
        fixture = TestBed.createComponent(RadioFilter);
        filter = fixture.componentInstance;
    });

    afterEach(() => vi.restoreAllMocks());

    it('renders the radio-group template for a non-floating filter', () => {
        filter.agInit(makeParams({ suppressAndOrCondition: false }));
        fixture.detectChanges();
        const radios = fixture.nativeElement.querySelectorAll('input[type="radio"]');
        // two valuelist values (Yes/No) rendered twice (primary + OR group)
        expect(radios.length).toBe(4);
    });

    it('reads and writes the checked radio through the rendered DOM', () => {
        filter.agInit(makeParams({ suppressAndOrCondition: true }));
        fixture.detectChanges();
        filter.setFilterUIValue('Yes');
        expect(filter.getFilterUIValue()).toBe('Yes');
    });

    it('clears all radios on clear', () => {
        filter.agInit(makeParams({ suppressAndOrCondition: true }));
        fixture.detectChanges();
        filter.setFilterUIValue('No');
        filter.onClearFilter();
        expect(filter.getFilterUIValue()).toBeNull();
        expect(filter.model).toBe('');
    });

    it('renders a checkbox for a floating filter', () => {
        filter.agInit(makeParams({ filterParams: makeParams() }));
        fixture.detectChanges();
        const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
        expect(checkbox).not.toBeNull();
        expect(filter.useCheckboxForFloatingFilter()).toBe(true);
    });

    it('cycles the checkbox tri-state and reports it as the UI value', () => {
        filter.agInit(makeParams({ filterParams: makeParams() }));
        fixture.detectChanges();
        vi.spyOn(filter, 'valueChanged').mockImplementation(() => { /* skip apply */ });
        filter.onCheckboxClick();
        expect(filter.checkboxState).toBe('No');
        expect(filter.getFilterUIValue()).toBe('No');
    });

    it('ngAfterViewInit updates the checkbox UI for a floating filter', () => {
        filter.agInit(makeParams({ filterParams: makeParams() }));
        fixture.detectChanges();
        filter.checkboxState = 'Yes';
        filter.ngAfterViewInit();
        expect(filter.elementRef()!.nativeElement.checked).toBe(true);
    });
});



