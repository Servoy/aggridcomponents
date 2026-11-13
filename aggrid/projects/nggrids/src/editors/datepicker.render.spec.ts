import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, FormattingService } from '@servoy/public';
import { DatePicker } from './datepicker';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Render test for the DatePicker editor. The ngGrid parent is mocked and loadCalendarLocale is
 * stubbed so tempus-dominus is never constructed; the Angular template still renders the input, so
 * OUR ngAfterViewInit branch selection (find-mode vs edit) and getValue run against a real input.
 */
describe('DatePicker - render', () => {
    let fixture: ComponentFixture<DatePicker>;
    let component: DatePicker;
    let ngGrid: any;
    let formatting: any;

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            value: new Date(2020, 0, 15),
            column: { getColId: () => 'c' },
            colDef: {},
            node: { data: {} },
            context: { componentParent: ngGrid },
            stopEditing: vi.fn(),
            ...overrides
        };
    }

    beforeEach(async () => {
        formatting = { parse: vi.fn().mockReturnValue(new Date(2020, 0, 1)) };
        ngGrid = {
            getColumn: vi.fn().mockReturnValue(null),
            isInFindMode: vi.fn().mockReturnValue(false),
            format: vi.fn((v: any) => '15/01/2020'),
            // never build tempus-dominus: resolve the locale deferred to a promise that never calls the body
            loadCalendarLocale: vi.fn().mockReturnValue({ promise: new Promise(() => { /* never resolves in test */ }) })
        };

        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, DatePicker],
            providers: [FormattingService],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(DatePicker);
        component = fixture.componentInstance;
        (component as any).formattingService = formatting;
    });

    afterEach(() => vi.restoreAllMocks());

    it('renders the date input', () => {
        component.agInit(makeParams());
        fixture.detectChanges();
        const input = fixture.nativeElement.querySelector('input');
        expect(input).not.toBeNull();
    });

    it('ngAfterViewInit loads the calendar locale when not in find mode', () => {
        component.agInit(makeParams());
        fixture.detectChanges();
        component.ngAfterViewInit();
        expect(ngGrid.loadCalendarLocale).toHaveBeenCalled();
    });

    it('ngAfterViewInit selects the input (deferred) in find mode', () => {
        ngGrid.isInFindMode.mockReturnValue(true);
        component.agInit(makeParams());
        fixture.detectChanges();
        vi.useFakeTimers();
        const selectSpy = vi.spyOn(component.elementRef()!.nativeElement, 'select');
        component.ngAfterViewInit();
        vi.advanceTimersByTime(10);
        expect(ngGrid.loadCalendarLocale).not.toHaveBeenCalled();
        expect(selectSpy).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('getValue parses the input to a Date when not in find mode', () => {
        const parsed = new Date(2021, 5, 1);
        formatting.parse.mockReturnValue(parsed);
        component.agInit(makeParams());
        fixture.detectChanges();
        component.elementRef()!.nativeElement.value = '01/06/2021';
        expect(component.getValue()).toBe(parsed);
    });

    it('getValue returns the raw input value in find mode', () => {
        ngGrid.isInFindMode.mockReturnValue(true);
        component.agInit(makeParams());
        fixture.detectChanges();
        component.elementRef()!.nativeElement.value = '2021';
        expect(component.getValue()).toBe('2021');
    });

    it('ngOnDestroy is a safe no-op when no picker was created', () => {
        component.agInit(makeParams());
        fixture.detectChanges();
        expect(() => component.ngOnDestroy()).not.toThrow();
    });
});
