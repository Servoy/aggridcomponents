import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { FormEditor } from './formeditor';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for the FormEditor cell editor. The ngGrid parent, servoyApi and ag-grid params are
 * mocked. We drive OUR agInit (form value seeding, edit-started callback, size resolution),
 * getValue, getForm/getTemplate and the destroy hideForm call.
 */
describe('FormEditor', () => {
    let component: FormEditor;
    let ngGrid: any;
    let hideForm: ReturnType<typeof vi.fn>;
    let formWillShow: ReturnType<typeof vi.fn>;

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            value: 'v',
            column: { getColId: () => 'c' },
            node: { rowIndex: 0 },
            context: { componentParent: ngGrid },
            ...overrides
        };
    }

    beforeEach(async () => {
        hideForm = vi.fn();
        formWillShow = vi.fn().mockReturnValue(Promise.resolve());
        ngGrid = {
            __internalFormEditorValue: { set: vi.fn() },
            onColumnFormEditStarted: vi.fn().mockReturnValue(null),
            getEditingRowIndex: vi.fn().mockReturnValue(1),
            getColumnIndex: vi.fn().mockReturnValue(2),
            getColumn: vi.fn().mockReturnValue({ editForm: 'myForm' }),
            servoyApi: () => ({ formWillShow, hideForm }),
            _internalFormEditorValue: vi.fn().mockReturnValue('edited'),
            templateRef: vi.fn().mockReturnValue(null),
            agGrid: vi.fn().mockReturnValue({ api: { setFocusedCell: vi.fn() } })
        };

        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormEditor],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        component = TestBed.createComponent(FormEditor).componentInstance;
        component.agInit(makeParams());
    });

    describe('agInit', () => {
        it('seeds the internal form editor value from the params', () => {
            ngGrid.__internalFormEditorValue.set.mockClear();
            component.agInit(makeParams({ value: 'seed' }));
            expect(ngGrid.__internalFormEditorValue.set).toHaveBeenCalledWith('seed');
        });

        it('fires the onColumnFormEditStarted callback with row/column/value', () => {
            const cb = vi.fn();
            ngGrid.onColumnFormEditStarted.mockReturnValue(cb);
            component.agInit(makeParams({ value: 'v' }));
            // callback was registered after the beforeEach agInit, so it fires on this explicit call
            expect(cb).toHaveBeenCalledWith(1, 2, 'v');
        });

        it('reads the edit form and its size from the column', () => {
            ngGrid.getColumn.mockReturnValue({ editForm: 'f', editFormSize: { width: 400, height: 250 } });
            component.agInit(makeParams());
            expect(component.getForm()).toBe('f');
            expect(component.width).toBe(400);
            expect(component.height).toBe(250);
        });

        it('defaults the size when the column has no editFormSize', () => {
            component.agInit(makeParams());
            expect(component.width).toBe(300);
            expect(component.height).toBe(200);
        });

        it('asks the servoy api to show the edit form', () => {
            component.agInit(makeParams());
            expect(formWillShow).toHaveBeenCalledWith('myForm');
        });
    });

    describe('getValue / getTemplate', () => {
        it('returns the internal form editor value', () => {
            component.agInit(makeParams());
            expect(component.getValue()).toBe('edited');
        });

        it('exposes the grid template ref', () => {
            component.agInit(makeParams());
            expect(component.getTemplate()).toBeNull();
            expect(ngGrid.templateRef).toHaveBeenCalled();
        });
    });

    describe('isPopup', () => {
        it('is true', () => {
            expect(component.isPopup()).toBe(true);
        });
    });

    describe('ngOnDestroy', () => {
        it('hides the edit form on destroy', () => {
            component.agInit(makeParams());
            component.ngOnDestroy();
            expect(hideForm).toHaveBeenCalledWith('myForm');
        });
    });
});






