import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, FormattingService, ServoyPublicService } from '@servoy/public';
import { DatePicker } from './datepicker';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for the DatePicker cell editor agInit format-resolution logic and getValue parsing.
 * tempus-dominus is NOT created here (that needs a real DOM and runs in ngAfterViewInit); we
 * only drive OUR format derivation from the column model and the parse-based getValue.
 */
describe('DatePicker', () => {
    let component: DatePicker;
    let fixture: ReturnType<typeof TestBed.createComponent<DatePicker>>;
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
        formatting = { parse: vi.fn() };
        ngGrid = {
            getColumn: vi.fn().mockReturnValue(null),
            isInFindMode: vi.fn().mockReturnValue(false),
            format: vi.fn((v: any) => 'fmt:' + v)
        };

        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, DatePicker],
            providers: [FormattingService],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(DatePicker);
        component = fixture.componentInstance;
        // inject our formatting spy over the real service
        (component as any).formattingService = formatting;
    });

    describe('agInit - format resolution', () => {
        it('uses an object column format directly', () => {
            ngGrid.getColumn.mockReturnValue({ format: { type: 'DATETIME', display: 'dd-MM-yyyy' } });
            component.agInit(makeParams());
            expect(component.format).toEqual({ type: 'DATETIME', display: 'dd-MM-yyyy' });
        });

        it('builds a default DATETIME format when the column has none', () => {
            component.agInit(makeParams());
            expect(component.format.type).toBe('DATETIME');
            expect(component.format.display).toBe('MM/dd/yyyy hh:mm a');
        });

        it('parses a pipe-delimited string format into display/edit', () => {
            ngGrid.getColumn.mockReturnValue({ format: 'dd-MM-yyyy|yyyy-MM-dd' });
            component.agInit(makeParams());
            expect(component.format.display).toBe('dd-MM-yyyy');
            expect(component.format.edit).toBe('yyyy-MM-dd');
        });

        it('parses a mask string format', () => {
            ngGrid.getColumn.mockReturnValue({ format: 'dd-MM-yyyy|99-99-9999|_|mask' });
            component.agInit(makeParams());
            expect(component.format.isMask).toBe(true);
            expect(component.format.edit).toBe('99-99-9999');
            expect(component.format.placeHolder).toBe('_');
        });

        it('switches to clock view mode for a time-only format', () => {
            ngGrid.getColumn.mockReturnValue({ format: 'HH:mm' });
            component.agInit(makeParams());
            expect((component.config.display as any).viewMode).toBe('clock');
        });

        it('seeds the selected value from a displayValue object', () => {
            const d = new Date(2021, 5, 1);
            component.agInit(makeParams({ value: { displayValue: d, realValue: 1 } }));
            expect((component as any)._selectedValue()).toBe(d);
        });
    });

    describe('getValue', () => {
        it('returns the raw input value in find mode', () => {
            ngGrid.isInFindMode.mockReturnValue(true);
            component.agInit(makeParams());
            (component as any).elementRef = () => ({ nativeElement: { value: '2020' } });
            expect(component.getValue()).toBe('2020');
        });

        it('parses the input into a Date when not in find mode', () => {
            const parsed = new Date(2020, 0, 1);
            formatting.parse.mockReturnValue(parsed);
            component.agInit(makeParams());
            // stub elementRef directly to avoid detectChanges (which would run ngAfterViewInit / tempus-dominus)
            (component as any).elementRef = () => ({ nativeElement: { value: '01/01/2020' } });
            expect(component.getValue()).toBe(parsed);
        });

        it('returns null when the input does not parse to a valid date', () => {
            formatting.parse.mockReturnValue('not a date');
            component.agInit(makeParams());
            (component as any).elementRef = () => ({ nativeElement: { value: 'x' } });
            expect(component.getValue()).toBeNull();
        });
    });

    describe('dateChanged', () => {
        it('updates the selected value on a change event with a new date', () => {
            component.agInit(makeParams({ value: null }));
            const d = new Date(2022, 1, 2);
            component.dateChanged({ type: 'change.td', date: d });
            expect((component as any)._selectedValue()).toBe(d);
        });

        it('clears the selected value for a non-change event type', () => {
            component.agInit(makeParams());
            component.dateChanged({ type: 'other' });
            expect((component as any)._selectedValue()).toBeUndefined();
        });

        it('is a no-op when the date is unchanged', () => {
            const d = new Date(2022, 1, 2);
            component.agInit(makeParams({ value: d }));
            (component as any)._selectedValue.set(d);
            component.dateChanged({ type: 'change.td', date: new Date(2022, 1, 2) });
            expect((component as any)._selectedValue()).toBe(d);
        });
    });

    describe('isPopup', () => {
        it('is false', () => {
            expect(component.isPopup()).toBe(false);
        });
    });
});

