import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { TextEditor } from './texteditor';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit tests for the TextEditor cell editor. ag-grid is mocked: we never create a real grid,
 * only feed the editor the ICellEditorParams shape it reads and assert on OUR logic
 * (format resolution, value formatting/unformatting, keyboard navigation wiring).
 */
describe('TextEditor', () => {
    let component: TextEditor;
    let fixture: ReturnType<typeof TestBed.createComponent<TextEditor>>;

    let ngGridMock: any;
    let api: any;

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            value: 'hello',
            column: { getColId: () => 'col1' },
            colDef: {},
            rowIndex: 0,
            context: { componentParent: ngGridMock },
            ...overrides
        };
    }

    beforeEach(async () => {
        api = {
            tabToNextCell: vi.fn(),
            stopEditing: vi.fn(),
            setFocusedCell: vi.fn(),
            startEditingCell: vi.fn(),
            getDisplayedRowCount: vi.fn().mockReturnValue(5),
            forEachNode: vi.fn()
        };
        ngGridMock = {
            arrowsUpDownMoveWhenEditing: vi.fn().mockReturnValue('NONE'),
            editNextCellOnEnter: vi.fn().mockReturnValue(false),
            isInFindMode: vi.fn().mockReturnValue(false),
            getColumn: vi.fn().mockReturnValue(null),
            getColumnFormat: vi.fn().mockReturnValue(null),
            format: vi.fn((v: any) => 'fmt:' + v),
            agGrid: vi.fn().mockReturnValue({ api }),
            formattingService: {
                unformat: vi.fn((v: any) => 'unfmt:' + v),
                testForNumbersOnly: vi.fn().mockReturnValue(true)
            },
            selectionEvent: undefined
        };

        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, TextEditor],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(TextEditor);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('agInit - format and value resolution', () => {
        it('sets the initial display value from params.value when there is no format', () => {
            component.agInit(makeParams({ value: 'abc' }));
            expect(component._initialDisplayValue()).toBe('abc');
            expect(component._maxLength()).toBe(524288);
        });

        it('unwraps a {displayValue} initial value', () => {
            component.agInit(makeParams({ value: { displayValue: 'shown', realValue: 1 } }));
            expect(component._initialDisplayValue()).toBe('shown');
        });

        it('uses the column editTypeTextFieldInput as the input type', () => {
            ngGridMock.getColumn.mockReturnValue({ editTypeTextFieldInput: 'password' });
            component.agInit(makeParams());
            expect(component._inputType()).toBe('password');
        });

        it('forces input type number for a number cellDataType (backward compat)', () => {
            component.agInit(makeParams({ colDef: { cellDataType: 'number' } }));
            expect(component._inputType()).toBe('number');
        });

        it('applies the edit format to the initial value when not in find mode', () => {
            ngGridMock.getColumnFormat.mockReturnValue({ edit: 'yyyy', maxLength: 10 });
            component.agInit(makeParams({ value: 'raw' }));
            expect(ngGridMock.format).toHaveBeenCalledWith('raw', { edit: 'yyyy', maxLength: 10 }, true);
            expect(component._initialDisplayValue()).toBe('fmt:raw');
            expect(component._maxLength()).toBe(10);
        });

        it('applies the display format when there is no edit format', () => {
            ngGridMock.getColumnFormat.mockReturnValue({ display: 'yyyy' });
            component.agInit(makeParams({ value: 'raw' }));
            expect(ngGridMock.format).toHaveBeenCalledWith('raw', { display: 'yyyy' }, false);
            expect(component._initialDisplayValue()).toBe('fmt:raw');
        });

        it('leaves the value raw when in find mode even with a format', () => {
            ngGridMock.isInFindMode.mockReturnValue(true);
            ngGridMock.getColumnFormat.mockReturnValue({ edit: 'yyyy' });
            component.agInit(makeParams({ value: 'raw' }));
            expect(ngGridMock.format).not.toHaveBeenCalled();
            expect(component._initialDisplayValue()).toBe('raw');
        });
    });

    describe('getValue', () => {
        function primeInput(value: string) {
            component.agInit(makeParams({ value: 'x' }));
            fixture.detectChanges();
            component.elementRef()!.nativeElement.value = value;
        }

        it('returns the raw input value when there is no format', () => {
            primeInput('typed');
            expect(component.getValue()).toBe('typed');
        });

        it('unformats using the edit format when present', () => {
            ngGridMock.getColumnFormat.mockReturnValue({ edit: 'yyyy', type: 'DATETIME' });
            component.agInit(makeParams({ value: 'x' }));
            fixture.detectChanges();
            component.elementRef()!.nativeElement.value = 'typed';
            expect(component.getValue()).toBe('unfmt:typed');
            expect(ngGridMock.formattingService.unformat).toHaveBeenCalledWith('typed', 'yyyy', 'DATETIME', 'x');
        });

        it('uppercases a TEXT format value', () => {
            ngGridMock.getColumnFormat.mockReturnValue({ type: 'TEXT', uppercase: true });
            component.agInit(makeParams({ value: 'x' }));
            fixture.detectChanges();
            component.elementRef()!.nativeElement.value = 'abc';
            // no edit/display -> unformat not applied, uppercase applied to raw
            expect(component.getValue()).toBe('ABC');
        });

        it('lowercases a TEXT format value', () => {
            ngGridMock.getColumnFormat.mockReturnValue({ type: 'TEXT', lowercase: true });
            component.agInit(makeParams({ value: 'x' }));
            fixture.detectChanges();
            component.elementRef()!.nativeElement.value = 'ABC';
            expect(component.getValue()).toBe('abc');
        });
    });

    describe('onKeyDown navigation', () => {
        it('does nothing when arrowsUpDownMoveWhenEditing is NONE and editNextCellOnEnter is false', () => {
            component.agInit(makeParams());
            const e = { keyCode: 13, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
            component.onKeyDown(e);
            expect(api.tabToNextCell).not.toHaveBeenCalled();
            expect(e.stopPropagation).not.toHaveBeenCalled();
        });

        it('tabs to the next cell on Enter when editNextCellOnEnter is set', () => {
            ngGridMock.editNextCellOnEnter.mockReturnValue(true);
            component.agInit(makeParams());
            const e = { keyCode: 13, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
            component.onKeyDown(e);
            expect(api.tabToNextCell).toHaveBeenCalledTimes(1);
            expect(e.preventDefault).toHaveBeenCalled();
            expect(e.stopPropagation).toHaveBeenCalled();
        });

        it('moves selection down to the next editable row on arrow-down with NEXTEDITABLECELL', () => {
            ngGridMock.arrowsUpDownMoveWhenEditing.mockReturnValue('NEXTEDITABLECELL');
            const column = { isCellEditable: vi.fn().mockReturnValue(true), getColId: () => 'col1' };
            const targetNode = { rowIndex: 1, setSelected: vi.fn() };
            api.forEachNode.mockImplementation((cb: any) => cb(targetNode));
            component.agInit(makeParams({ column, rowIndex: 0 }));
            const e = { keyCode: 40, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;

            component.onKeyDown(e);

            expect(api.stopEditing).toHaveBeenCalled();
            expect(targetNode.setSelected).toHaveBeenCalledWith(true, true);
            expect(api.setFocusedCell).toHaveBeenCalledWith(1, 'col1');
            expect(api.startEditingCell).toHaveBeenCalledWith({ rowIndex: 1, colKey: 'col1' });
        });
    });

    describe('onKeyPress', () => {
        it('returns true for navigation keys', () => {
            component.agInit(makeParams());
            expect(component.onKeyPress({ keyCode: 37 } as any)).toBe(true);
        });

        it('delegates to testForNumbersOnly for a formatted non-navigation key', () => {
            ngGridMock.getColumnFormat.mockReturnValue({ edit: '0000' });
            component.agInit(makeParams());
            fixture.detectChanges();
            const e = { keyCode: 65 } as any;
            expect(component.onKeyPress(e)).toBe(true);
            expect(ngGridMock.formattingService.testForNumbersOnly).toHaveBeenCalled();
        });
    });
});
