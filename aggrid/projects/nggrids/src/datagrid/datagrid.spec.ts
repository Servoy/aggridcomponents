import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApi, ServoyBaseComponent } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { AgGridModule } from '@ag-grid-community/angular';

// Minimal ServoyApi stub; this version of @servoy/public does not export a ServoyApiTesting class.
class ServoyApiTesting extends ServoyApi {
    formWillShow(): Promise<boolean> { return Promise.resolve(true); }
    hideForm(): Promise<boolean> { return Promise.resolve(true); }
    startEdit(): void { /* no-op */ }
    apply(): void { /* no-op */ }
    callServerSideApi(): Promise<any> { return Promise.resolve(); }
    isInDesigner(): boolean { return false; }
    trustAsHtml(): boolean { return false; }
    isInAbsoluteLayout(): boolean { return false; }
    getMarkupId(): string { return 'test'; }
    getFormName(): string { return 'testForm'; }
    registerComponent(_component: ServoyBaseComponent<HTMLElement>): void { /* no-op */ }
    unRegisterComponent(_component: ServoyBaseComponent<HTMLElement>): void { /* no-op */ }
    getClientProperty(): any { return undefined; }
}

describe('DataGrid - headerIconStyleClass survives column hide/show (SVYX-1146)', () => {
    let component: DataGrid;
    let fixture: ReturnType<typeof TestBed.createComponent<DataGrid>>;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return Object.assign(new DataGridColumn(), {
            columnid: 'col_' + Math.random().toString(36).slice(2, 8),
            ...overrides
        }) as DataGridColumn;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DataGrid],
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        component.servoyApi = new ServoyApiTesting() as any;
    });

    describe('hasHeaderIconStyleClassColumn', () => {
        it('returns false when there are no columns', () => {
            expect((component as any).hasHeaderIconStyleClassColumn()).toBeFalsy();
        });

        it('returns false when no column declares headerIconStyleClass', () => {
            component.columns = [makeColumn({ columnid: 'a' })];

            expect((component as any).hasHeaderIconStyleClassColumn()).toBeFalsy();
        });

        it('returns true when a column declares headerIconStyleClass', () => {
            component.columns = [
                makeColumn({ columnid: 'a' }),
                makeColumn({ columnid: 'b', headerIconStyleClass: 'fa fa-star' })
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
                makeColumn({ columnid: 'iconCol', id: 'iconCol', headerIconStyleClass: 'fa fa-star' })
            ];

            (component as any).setupHeaderIconStyleClass();

            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label fa fa-star');
        });

        it('re-applies the class after the header DOM element is recreated (simulating hide/show)', () => {
            component.columns = [
                makeColumn({ columnid: 'iconCol', id: 'iconCol', headerIconStyleClass: 'fa fa-star' })
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
            component.columns = [makeColumn({ columnid: 'iconCol', id: 'iconCol' })];

            expect(() => (component as any).setupHeaderIconStyleClass()).not.toThrow();
            expect(labelEl.getAttribute('class')).toBe('ag-header-cell-label');
        });
    });

    describe('suppressColumnVirtualisation', () => {
        it('is enabled when a column declares headerIconStyleClass', () => {
            component.columns = [
                makeColumn({ columnid: 'a', headerIconStyleClass: 'fa fa-star' })
            ];
            component.myFoundset = { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => undefined } as any;

            component.ngOnInit();

            expect(component.agGridOptions.suppressColumnVirtualisation).toBeTruthy();
        });

        it('is disabled when no column declares headerIconStyleClass', () => {
            component.columns = [makeColumn({ columnid: 'a' })];
            component.myFoundset = { multiSelect: false, viewPort: { size: 0 }, addChangeListener: () => undefined } as any;

            component.ngOnInit();

            expect(component.agGridOptions.suppressColumnVirtualisation).toBeFalsy();
        });
    });
});
