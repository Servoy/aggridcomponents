import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';

describe('PowerGrid - headerIconStyleClass survives column hide/show (SVYX-1146)', () => {
    let component: PowerGrid;
    let fixture: ReturnType<typeof TestBed.createComponent<PowerGrid>>;

    function makeColumn(overrides: Partial<PowerGridColumn> = {}): PowerGridColumn {
        return Object.assign(new PowerGridColumn(), {
            dataprovider: 'col_' + Math.random().toString(36).slice(2, 8),
            ...overrides
        }) as PowerGridColumn;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PowerGrid],
            imports: [ServoyPublicTestingModule],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(PowerGrid);
        component = fixture.componentInstance;
        component.servoyApi = new ServoyApiTesting() as any;
    });

    describe('hasHeaderIconStyleClassColumn', () => {
        it('returns false when there are no columns', () => {
            expect((component as any).hasHeaderIconStyleClassColumn()).toBeFalsy();
        });

        it('returns false when no column declares headerIconStyleClass', () => {
            component.columns = [makeColumn({ dataprovider: 'a' })];

            expect((component as any).hasHeaderIconStyleClassColumn()).toBeFalsy();
        });

        it('returns true when a column declares headerIconStyleClass', () => {
            component.columns = [
                makeColumn({ dataprovider: 'a' }),
                makeColumn({ dataprovider: 'b', headerIconStyleClass: 'fa fa-star' })
            ];

            expect((component as any).hasHeaderIconStyleClassColumn()).toBeTruthy();
        });
    });

    describe('setupHeaderIconStyleClass', () => {
        let headerEl: HTMLElement;
        let labelEl: HTMLElement;

        beforeEach(() => {
            headerEl = document.createElement('div');
            headerEl.setAttribute('col-id', 'iconCol');
            labelEl = document.createElement('div');
            labelEl.setAttribute('class', 'ag-header-cell-label');
            headerEl.appendChild(labelEl);
            document.body.appendChild(headerEl);
            (component as any).doc = document;
        });

        afterEach(() => {
            headerEl.remove();
        });

        it('adds the configured class to the header label element', () => {
            component.columns = [
                makeColumn({ dataprovider: 'iconCol', id: 'iconCol', headerIconStyleClass: 'fa fa-star' })
            ];

            (component as any).setupHeaderIconStyleClass();

            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label fa fa-star');
        });

        it('re-applies the class after the header DOM element is recreated (simulating hide/show)', () => {
            component.columns = [
                makeColumn({ dataprovider: 'iconCol', id: 'iconCol', headerIconStyleClass: 'fa fa-star' })
            ];

            (component as any).setupHeaderIconStyleClass();
            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label fa fa-star');

            // simulate ag-Grid tearing down and recreating the header cell
            // (e.g. column hidden then shown again, or scrolled back into the virtualised viewport)
            headerEl.remove();
            headerEl = document.createElement('div');
            headerEl.setAttribute('col-id', 'iconCol');
            labelEl = document.createElement('div');
            labelEl.setAttribute('class', 'ag-header-cell-label');
            headerEl.appendChild(labelEl);
            document.body.appendChild(headerEl);

            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label');

            (component as any).setupHeaderIconStyleClass();

            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label fa fa-star');
        });

        it('does nothing when no column declares headerIconStyleClass', () => {
            component.columns = [makeColumn({ dataprovider: 'iconCol', id: 'iconCol' })];

            expect(() => (component as any).setupHeaderIconStyleClass()).not.toThrow();
            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label');
        });
    });

    describe('suppressColumnVirtualisation', () => {
        it('is enabled when a column declares headerIconStyleClass', () => {
            component.columns = [
                makeColumn({ dataprovider: 'a', headerIconStyleClass: 'fa fa-star' })
            ];

            component.ngOnInit();

            expect(component.agGridOptions.suppressColumnVirtualisation).toBeTruthy();
        });

        it('is disabled when no column declares headerIconStyleClass', () => {
            component.columns = [makeColumn({ dataprovider: 'a' })];

            component.ngOnInit();

            expect(component.agGridOptions.suppressColumnVirtualisation).toBeFalsy();
        });
    });
});
