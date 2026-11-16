import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { AgGridModule } from 'ag-grid-angular';

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

describe('DataGrid - user selection event is consumed (SVY-21681)', () => {
    let component: DataGrid;
    let foundsetManager: any;
    let requestSelectionUpdateSpy: jasmine.Spy;

    // any api call not given explicitly (e.g. from the async onGridReady of the rendered grid) is a no-op
    function stubGrid(api: Record<string, any>) {
        const safeApi = new Proxy(api, { get: (target, prop: string) => (prop in target ? target[prop] : () => undefined) });
        (component as any).agGrid = { api: safeApi };
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DataGrid],
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        const fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        component.servoyApi = new ServoyApiTesting() as any;

        requestSelectionUpdateSpy = jasmine.createSpy('requestSelectionUpdate').and.callFake((idxs: number[]) => {
            foundsetManager.foundset.selectedRowIndexes = idxs;
            return Promise.resolve(idxs);
        });
        foundsetManager = { foundset: { multiSelect: true, selectedRowIndexes: [0, 1, 2], requestSelectionUpdate: requestSelectionUpdateSpy } };
        component.foundset = foundsetManager;
        component.agGridOptions = { rowSelection: { mode: 'multiRow' } } as any;
        spyOn(component, 'isTableGrouped').and.returnValue(false);
        spyOn(component, 'selectedRowIndexesChanged');
    });

    it('clears the handled click, so a later server side selection change is not treated as the same ctrl click', () => {
        const click = { type: 'click', event: { ctrlKey: true, shiftKey: false }, rowIndex: 3 };
        component.selectionEvent = click;
        // ag-grid has the clicked row selected, together with the previous ones
        stubGrid({ getSelectedNodes: () => [0, 1, 2, 3].map(rowIndex => ({ rowIndex })) });

        component.onSelectionChangedEx(click, {} as any);

        expect(component.selectionEvent).toBeNull();
        expect(requestSelectionUpdateSpy).toHaveBeenCalledWith([0, 1, 2, 3]);
    });

    it('does not add the old clicked row back when the server replaced the selection (foundset.setSelectedIndex)', () => {
        const click = { type: 'click', event: { ctrlKey: true, shiftKey: false }, rowIndex: 3 };
        component.selectionEvent = click;
        stubGrid({ getSelectedNodes: () => [0, 1, 2, 3].map(rowIndex => ({ rowIndex })) });
        component.onSelectionChangedEx(click, {} as any);
        requestSelectionUpdateSpy.calls.reset();

        // the script selects only record 5; ag-grid reports the change later, with the same (already handled) selectionEvent field
        foundsetManager.foundset.selectedRowIndexes = [4];
        stubGrid({ getSelectedNodes: () => [{ rowIndex: 4 }] });
        component.onSelectionChangedEx(component.selectionEvent, {} as any);

        expect(requestSelectionUpdateSpy).not.toHaveBeenCalledWith([3, 4]);
        expect(component.selectedRowIndexesChanged).toHaveBeenCalled();
    });
});
