import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, FormattingService } from '@servoy/public';
import { NgbTypeaheadConfig } from '@ng-bootstrap/ng-bootstrap';
import { TypeaheadEditor } from './typeaheadeditor';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Render test for the TypeaheadEditor. The ngGrid parent and valuelist are mocked; the ngbTypeahead
 * template is rendered by Angular so OUR template bindings, ngAfterViewInit focus wiring, the
 * filterValues observable and the popup-observer run against the real rendered input. ag-grid is
 * never instantiated.
 */
describe('TypeaheadEditor - render', () => {
    let fixture: ComponentFixture<TypeaheadEditor>;
    let component: TypeaheadEditor;
    let ngGrid: any;
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
            context: { componentParent: ngGrid },
            ...overrides
        };
    }

    beforeEach(async () => {
        api = { tabToNextCell: vi.fn(), stopEditing: vi.fn() };
        ngGrid = {
            arrowsUpDownMoveWhenEditing: vi.fn().mockReturnValue('NONE'),
            editNextCellOnEnter: vi.fn().mockReturnValue(false),
            isInFindMode: vi.fn().mockReturnValue(false),
            getColumnFormat: vi.fn().mockReturnValue(null),
            getValuelist: vi.fn().mockReturnValue(null),
            hasValuelistResolvedDisplayData: vi.fn().mockReturnValue(false),
            format: vi.fn((v: any) => v),
            agGrid: vi.fn().mockReturnValue({ api }),
            formattingService: { testForNumbersOnly: vi.fn().mockReturnValue(true) }
        };

        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, TypeaheadEditor],
            providers: [FormattingService, NgbTypeaheadConfig],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(TypeaheadEditor);
        component = fixture.componentInstance;
    });

    afterEach(() => vi.restoreAllMocks());

    it('renders the typeahead input with the initial display value', () => {
        component.agInit(makeParams({ value: 'hello' }));
        fixture.detectChanges();
        const input = fixture.nativeElement.querySelector('input');
        expect(input).not.toBeNull();
        expect(input.value).toBe('hello');
    });

    it('ngAfterViewInit focuses the input (deferred) without throwing', () => {
        vi.useFakeTimers();
        component.agInit(makeParams());
        fixture.detectChanges();
        const input = component.elementRef()!.nativeElement as HTMLInputElement;
        const focusSpy = vi.spyOn(input, 'focus');
        component.ngAfterViewInit();
        vi.advanceTimersByTime(10);
        expect(focusSpy).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('filterValues returns an empty observable when there is no valuelist', () => {
        component.agInit(makeParams());
        fixture.detectChanges();
        let emitted: any;
        component.filterValues(of('x')).subscribe(v => emitted = v);
        expect(emitted).toEqual([]);
    });

    it('filterValues returns the valuelist results and caches them', () => {
        const list = [{ realValue: 1, displayValue: 'Apple' }];
        ngGrid.getValuelist.mockReturnValue({ filterList: vi.fn().mockReturnValue(of(list)) });
        component.agInit(makeParams());
        fixture.detectChanges();
        let emitted: any;
        component.filterValues(of('app')).subscribe(v => emitted = v);
        expect(emitted).toBe(list);
        expect(component.valuelistValues).toBe(list);
    });

    it('onTypeaheadKeyDown tabs to the next cell on Enter when editNextCellOnEnter is set', () => {
        ngGrid.editNextCellOnEnter.mockReturnValue(true);
        component.agInit(makeParams());
        fixture.detectChanges();
        // the real ngbTypeahead instance is present after detectChanges
        const e = { keyCode: 13, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
        component.onTypeaheadKeyDown(e);
        expect(api.tabToNextCell).toHaveBeenCalled();
        expect(e.preventDefault).toHaveBeenCalled();
    });

    it('closePopup dismisses the typeahead popup', () => {
        component.agInit(makeParams());
        fixture.detectChanges();
        const inst = component.instance()!;
        const spy = vi.spyOn(inst, 'dismissPopup');
        component.closePopup();
        expect(spy).toHaveBeenCalled();
    });

    it('scroll is a no-op when the popup is closed', () => {
        component.agInit(makeParams());
        fixture.detectChanges();
        expect(() => component.scroll()).not.toThrow();
    });

    it('getValue returns the typed value as display and real when there is no valuelist', () => {
        component.agInit(makeParams({ value: 'x' }));
        fixture.detectChanges();
        component.elementRef()!.nativeElement.value = 'typed';
        expect(component.getValue()).toEqual({ displayValue: 'typed', realValue: 'typed' });
    });
});
