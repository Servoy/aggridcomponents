import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, FormattingService, ServoyPublicService } from '@servoy/public';
import { NgbTypeaheadConfig } from '@ng-bootstrap/ng-bootstrap';
import { TypeaheadEditor } from './typeaheadeditor';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit tests for the TypeaheadEditor cell editor. ag-grid and the valuelist are mocked. We
 * assert on OUR logic: initial value/format resolution, keyboard handling, formatter helpers
 * and getValue display/real-value reconciliation.
 */
describe('TypeaheadEditor', () => {
    let component: TypeaheadEditor;
    let fixture: ReturnType<typeof TestBed.createComponent<TypeaheadEditor>>;
    let ngGridMock: any;
    let api: any;

    function subscribable(values: any) {
        return { subscribe: (cb: any) => { cb(values); return { unsubscribe() {} }; } };
    }

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            value: 'A',
            column: { getColId: () => 'c', actualWidth: 120, colDef: { field: 'c' } },
            colDef: {},
            node: { data: {} },
            rowIndex: 0,
            context: { componentParent: ngGridMock },
            ...overrides
        };
    }

    beforeEach(async () => {
        api = { tabToNextCell: vi.fn(), stopEditing: vi.fn() };
        ngGridMock = {
            arrowsUpDownMoveWhenEditing: vi.fn().mockReturnValue('NONE'),
            editNextCellOnEnter: vi.fn().mockReturnValue(false),
            isInFindMode: vi.fn().mockReturnValue(false),
            getColumnFormat: vi.fn().mockReturnValue(null),
            getValuelist: vi.fn().mockReturnValue(null),
            format: vi.fn((v: any) => 'fmt:' + v),
            agGrid: vi.fn().mockReturnValue({ api }),
            formattingService: { testForNumbersOnly: vi.fn().mockReturnValue(true) }
        };

        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, TypeaheadEditor],
            providers: [FormattingService, NgbTypeaheadConfig],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(TypeaheadEditor);
        component = fixture.componentInstance;
    });

    afterEach(() => vi.restoreAllMocks());

    describe('agInit', () => {
        it('seeds initial display/real value from params.value', () => {
            component.agInit(makeParams({ value: 'abc' }));
            expect(component._initialDisplayValue()).toBe('abc');
            expect(component.initialRealValue).toBe('abc');
            expect(component.width).toBe(120);
        });

        it('reads maxLength from the column format', () => {
            ngGridMock.getColumnFormat.mockReturnValue({ maxLength: 7 });
            component.agInit(makeParams());
            expect(component._maxLength()).toBe(7);
        });

        it('builds a valuelist value cache when display data is resolved', () => {
            const list: any = [{ realValue: 1, displayValue: 'A' }];
            const vl: any = { filterList: vi.fn().mockReturnValue(subscribable(list)), hasRealValues: () => true };
            ngGridMock.getValuelist.mockReturnValue(vl);
            ngGridMock.hasValuelistResolvedDisplayData = vi.fn().mockReturnValue(true);
            // params.value already carries a realValue, so the extra resolution round-trip is skipped
            component.agInit(makeParams({ value: { realValue: 1, displayValue: 'A' } }));
            expect(component.valuelistValues).toBe(list);
            expect(component.hasRealValues).toBe(true);
        });
    });

    describe('onKeyDown', () => {
        it('stops propagation of navigation keys when arrowsUpDownMoveWhenEditing is active', () => {
            ngGridMock.arrowsUpDownMoveWhenEditing.mockReturnValue('ANY');
            component.agInit(makeParams());
            const e = { keyCode: 40, stopPropagation: vi.fn() } as any;
            component.onKeyDown(e);
            expect(e.stopPropagation).toHaveBeenCalled();
        });

        it('leaves navigation keys alone when mode is NONE', () => {
            component.agInit(makeParams());
            const e = { keyCode: 40, stopPropagation: vi.fn() } as any;
            component.onKeyDown(e);
            expect(e.stopPropagation).not.toHaveBeenCalled();
        });
    });

    describe('onKeyPress', () => {
        it('returns true for navigation keys', () => {
            component.agInit(makeParams());
            expect(component.onKeyPress({ keyCode: 38 } as any)).toBe(true);
        });

        it('delegates to testForNumbersOnly for a formatted key', () => {
            ngGridMock.getColumnFormat.mockReturnValue({ edit: '0000' });
            component.agInit(makeParams());
            fixture.detectChanges();
            expect(component.onKeyPress({ keyCode: 65 } as any)).toBe(true);
            expect(ngGridMock.formattingService.testForNumbersOnly).toHaveBeenCalled();
        });
    });

    describe('formatter helpers', () => {
        it('resultFormatter returns a non-breaking space for empty display values', () => {
            component.agInit(makeParams());
            expect(component.resultFormatter({ displayValue: '', realValue: 1 })).toBe('\u00A0');
        });

        it('resultFormatter returns the display value otherwise', () => {
            component.agInit(makeParams());
            expect(component.resultFormatter({ displayValue: 'X', realValue: 1 })).toBe('X');
        });

        it('inputFormatter returns empty string for null', () => {
            component.agInit(makeParams());
            expect(component.inputFormatter(null)).toBe('');
        });

        it('inputFormatter unwraps a displayValue object', () => {
            component.agInit(makeParams());
            expect(component.inputFormatter({ displayValue: 'D', realValue: 1 })).toBe('D');
        });

        it('inputFormatter resolves a real value through the valuelist', () => {
            const list: any = [{ realValue: 2, displayValue: 'Two' }];
            list.hasRealValues = () => true;
            component.agInit(makeParams());
            component.valuelistValues = list;
            expect(component.inputFormatter(2)).toBe('Two');
        });
    });

    describe('getValue', () => {
        function primeInput(value: string) {
            component.agInit(makeParams({ value: 'x' }));
            fixture.detectChanges();
            component.elementRef()!.nativeElement.value = value;
        }

        it('returns the typed value as display and real when there is no valuelist', () => {
            primeInput('typed');
            expect(component.getValue()).toEqual({ displayValue: 'typed', realValue: 'typed' });
        });

        it('resolves the real value from a matching display value', () => {
            component.agInit(makeParams({ value: 'x' }));
            fixture.detectChanges();
            component.valuelistValues = [{ realValue: 9, displayValue: 'Nine' }];
            component.elementRef()!.nativeElement.value = 'Nine';
            expect(component.getValue()).toEqual({ displayValue: 'Nine', realValue: 9 });
        });

        it('falls back to the initial value when the typed display does not match and hasRealValues', () => {
            component.agInit(makeParams({ value: 'initial' }));
            fixture.detectChanges();
            component.hasRealValues = true;
            component.initialRealValue = 42;
            (component as any)._initialDisplayValue.set('initial');
            component.valuelistValues = [{ realValue: 1, displayValue: 'One' }];
            component.elementRef()!.nativeElement.value = 'does-not-match';
            expect(component.getValue()).toEqual({ displayValue: 'initial', realValue: 42 });
        });
    });
});




