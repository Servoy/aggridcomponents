import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { DetailFormRenderer } from './detailformrenderer';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Render test for the DetailFormRenderer. The DataGrid parent is mocked; the Angular template is
 * rendered so OUR @if/@for form-component layout and the item template/state delegation run.
 */
describe('DetailFormRenderer - render', () => {
    let fixture: ComponentFixture<DetailFormRenderer>;
    let component: DetailFormRenderer;
    let dataGrid: any;

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            data: { _svyFoundsetIndex: 0 },
            node: { rowIndex: 0 },
            context: { componentParent: dataGrid },
            ...overrides
        };
    }

    beforeEach(async () => {
        dataGrid = {
            detailRowHeight: vi.fn().mockReturnValue(150),
            onDetailFormSetup: vi.fn().mockReturnValue(null),
            getRecord: vi.fn().mockReturnValue({ _svyRowId: 'r0' }),
            myFoundset: vi.fn().mockReturnValue({ viewPort: { startIndex: 0, rows: [{ _svyRowId: 'r0' }] } }),
            detailForm: vi.fn().mockReturnValue({ absoluteLayout: false, childElements: [{ name: 'a', layout: {} }] }),
            getDetailItemTemplate: vi.fn().mockReturnValue(null),
            getDetailItemState: vi.fn().mockReturnValue({ name: 'a' }),
            servoyApi: () => ({})
        };
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, DetailFormRenderer],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();
        fixture = TestBed.createComponent(DetailFormRenderer);
        component = fixture.componentInstance;
    });

    afterEach(() => vi.restoreAllMocks());

    it('renders the detail form container with the configured height', () => {
        component.agInit(makeParams());
        fixture.detectChanges();
        const container = fixture.nativeElement.querySelector('.svy-detail-form-container');
        expect(container).not.toBeNull();
        expect(component.height).toBe(150);
    });

    it('renders the absolute-layout wrapper when the form is absolute', () => {
        dataGrid.detailForm.mockReturnValue({ absoluteLayout: true, childElements: [{ name: 'a', layout: { left: '0px' } }] });
        component.agInit(makeParams());
        fixture.detectChanges();
        const wrapper = fixture.nativeElement.querySelector('.svy-wrapper');
        expect(wrapper).not.toBeNull();
    });

    it('delegates item template and state lookups to the grid', () => {
        component.agInit(makeParams());
        fixture.detectChanges();
        expect(component.getItemTemplate({ name: 'a' })).toBeNull();
        expect(component.getItemState({ name: 'a' })).toEqual({ name: 'a' });
    });
});
