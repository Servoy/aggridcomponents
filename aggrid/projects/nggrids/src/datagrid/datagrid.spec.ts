import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { SortChangedEvent } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';

describe('DataGrid - onSortChanged source guard (SVY-21291)', () => {
    let component: DataGrid;
    let onSortChanged: (event: SortChangedEvent) => void;
    let onSortHandlerSpy: jasmine.Spy;
    let storeColumnsStateSpy: jasmine.Spy;
    let isTableGroupedSpy: jasmine.Spy;
    let refreshAgGridServerSideSpy: jasmine.Spy;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DataGrid],
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        const fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        component.servoyApi = new ServoyApiTesting() as any;

        component.ngOnInit();

        onSortHandlerSpy = spyOn(component, 'onSortHandler');
        storeColumnsStateSpy = spyOn(component, 'storeColumnsState');
        isTableGroupedSpy = spyOn(component, 'isTableGrouped').and.returnValue(false);
        refreshAgGridServerSideSpy = spyOn(component, 'refreshAgGridServerSide');

        onSortChanged = component.agGridOptions.onSortChanged! as (event: SortChangedEvent) => void;
    });

    function enableOnSort(handler?: () => Promise<unknown>) {
        const h = handler ?? (() => Promise.resolve());
        Object.defineProperty(component, 'onSort', {
            value: () => h,
            configurable: true
        });
    }

    describe('onSortHandler guard by event.source', () => {
        it('should NOT call onSortHandler when event.source is api', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'api' } as any);

            expect(onSortHandlerSpy).not.toHaveBeenCalled();
        });

        it('should call onSortHandler when event.source is uiColumnSorted', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(onSortHandlerSpy).toHaveBeenCalledTimes(1);
        });

        it('should call onSortHandler when event.source is columnMenu', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'columnMenu' } as any);

            expect(onSortHandlerSpy).toHaveBeenCalledTimes(1);
        });

        it('should NOT call onSortHandler when onSort handler is not defined', () => {
            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(onSortHandlerSpy).not.toHaveBeenCalled();
        });

        it('should NOT call onSortHandler when event.source is gridInitializing', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'gridInitializing' } as any);

            expect(onSortHandlerSpy).not.toHaveBeenCalled();
        });
    });

    describe('storeColumnsState fires for all sources', () => {
        it('should call storeColumnsState when event.source is api', () => {
            onSortChanged.call(component, { source: 'api' } as any);

            expect(storeColumnsStateSpy).toHaveBeenCalledTimes(1);
        });

        it('should call storeColumnsState when event.source is uiColumnSorted', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(storeColumnsStateSpy).toHaveBeenCalledTimes(1);
        });

        it('should call storeColumnsState when event.source is columnMenu', () => {
            enableOnSort();

            onSortChanged.call(component, { source: 'columnMenu' } as any);

            expect(storeColumnsStateSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('grouped table refresh fires for all sources', () => {
        it('should call refreshAgGridServerSide when grouped and event.source is api', () => {
            isTableGroupedSpy.and.returnValue(true);

            onSortChanged.call(component, { source: 'api' } as any);

            expect(refreshAgGridServerSideSpy).toHaveBeenCalledTimes(1);
            expect(component.removeAllFoundsetRef).toBeTrue();
        });

        it('should call refreshAgGridServerSide when grouped and event.source is uiColumnSorted', () => {
            enableOnSort();
            isTableGroupedSpy.and.returnValue(true);

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(refreshAgGridServerSideSpy).toHaveBeenCalledTimes(1);
            expect(component.removeAllFoundsetRef).toBeTrue();
        });

        it('should NOT call refreshAgGridServerSide when not grouped', () => {
            isTableGroupedSpy.and.returnValue(false);

            onSortChanged.call(component, { source: 'api' } as any);

            expect(refreshAgGridServerSideSpy).not.toHaveBeenCalled();
        });
    });

    describe('isSortModelApplied flag', () => {
        it('should set isSortModelApplied to true when event.source is uiColumnSorted', () => {
            enableOnSort();
            component.isSortModelApplied = false;

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(component.isSortModelApplied).toBeTrue();
        });

        it('should set isSortModelApplied to true when event.source is columnMenu', () => {
            enableOnSort();
            component.isSortModelApplied = false;

            onSortChanged.call(component, { source: 'columnMenu' } as any);

            expect(component.isSortModelApplied).toBeTrue();
        });

        it('should NOT set isSortModelApplied when event.source is api', () => {
            component.isSortModelApplied = false;

            onSortChanged.call(component, { source: 'api' } as any);

            expect(component.isSortModelApplied).toBeFalse();
        });
    });

    describe('sortHandlerPromises queue integrity', () => {
        it('should not grow sortHandlerPromises when sort triggered by api source', () => {
            enableOnSort();
            component.sortHandlerPromises = [];

            onSortChanged.call(component, { source: 'api' } as any);

            expect(component.sortHandlerPromises.length).toBe(0);
        });

        it('should only add to sortHandlerPromises for UI sort, not API sort', () => {
            const sortPromise = Promise.resolve();
            enableOnSort(() => sortPromise);
            component.sortHandlerPromises = [];

            onSortHandlerSpy.and.callFake(function(this: DataGrid) {
                this.sortHandlerPromises.push(sortPromise);
            });

            onSortChanged.call(component, { source: 'api' } as any);
            expect(component.sortHandlerPromises.length).toBe(0);

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);
            expect(component.sortHandlerPromises.length).toBe(1);
        });

        it('should keep sortHandlerPromises empty when multiple api-source events fire in rapid succession', () => {
            enableOnSort();
            component.sortHandlerPromises = [];

            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);

            expect(component.sortHandlerPromises.length).toBe(0);
            expect(onSortHandlerSpy).not.toHaveBeenCalled();
        });

        it('should not corrupt the queue when interleaved api sorts precede a single UI sort (foundset-change scenario)', () => {
            const sortPromise = Promise.resolve();
            enableOnSort(() => sortPromise);
            component.sortHandlerPromises = [];

            onSortHandlerSpy.and.callFake(function(this: DataGrid) {
                this.sortHandlerPromises.push(sortPromise);
            });

            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);
            onSortChanged.call(component, { source: 'api' } as any);

            expect(component.sortHandlerPromises.length).toBe(0);
            expect(onSortHandlerSpy).not.toHaveBeenCalled();

            onSortChanged.call(component, { source: 'uiColumnSorted' } as any);

            expect(component.sortHandlerPromises.length).toBe(1);
            expect(onSortHandlerSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('sortHandlerPromises out-of-order resolution', () => {
        let logErrorSpy: jasmine.Spy;

        function removeSortHandlerPromise(promise: unknown) {
            (component as any).removeSortHandlerPromise(promise);
        }

        beforeEach(() => {
            logErrorSpy = spyOn(component.log, 'error');
            component.sortHandlerPromises = [];
        });

        it('should drain the queue without error when promises resolve out of order', () => {
            const first = Promise.resolve();
            const second = Promise.resolve();
            component.sortHandlerPromises.push(first, second);

            removeSortHandlerPromise(second);
            removeSortHandlerPromise(first);

            expect(component.sortHandlerPromises.length).toBe(0);
            expect(logErrorSpy).not.toHaveBeenCalled();
        });

        it('should drain the queue without error when a reject settles before an earlier resolve', () => {
            const first = Promise.resolve();
            const second = Promise.reject().catch(() => undefined);
            component.sortHandlerPromises.push(first, second);

            removeSortHandlerPromise(second);
            removeSortHandlerPromise(first);

            expect(component.sortHandlerPromises.length).toBe(0);
            expect(logErrorSpy).not.toHaveBeenCalled();
        });

        it('should log out of sync when a settling promise is not in the queue', () => {
            const known = Promise.resolve();
            const stray = Promise.resolve();
            component.sortHandlerPromises.push(known);

            removeSortHandlerPromise(stray);

            expect(logErrorSpy).toHaveBeenCalledWith('sortHandlerPromises out of sync');
            expect(component.sortHandlerPromises.length).toBe(1);
        });
    });
});

describe('DataGrid - headerGroupKeepColumnsTogether -> marryChildren (SVYX-1144)', () => {
    let component: DataGrid;
    let fixture: ReturnType<typeof TestBed.createComponent<DataGrid>>;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return {
            columnid: 'col_' + Math.random().toString(36).slice(2, 8),
            ...overrides
        } as unknown as DataGridColumn;
    }

    function findGroupDef(colDefs: any[], headerName: string): any {
        return colDefs.find(def => def && def.children && def.headerName === headerName);
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DataGrid],
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(DataGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
    });

    it('sets marryChildren=true on the synthesized group def when the first column of the group has headerGroupKeepColumnsTogether=true', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: true }),
            makeColumn({ columnid: 'b', headerGroup: 'G1' })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group).toBeDefined();
        expect(group.marryChildren).toBe(true);
        expect(group.children.length).toBe(2);
    });

    it('leaves marryChildren falsy when the flag is unset on the establishing column', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1' }),
            makeColumn({ columnid: 'b', headerGroup: 'G1' })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group).toBeDefined();
        expect(group.marryChildren).toBeFalsy();
    });

    it('leaves marryChildren false when the flag is explicitly false on the establishing column', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: false }),
            makeColumn({ columnid: 'b', headerGroup: 'G1' })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group.marryChildren).toBe(false);
    });

    it('first-column-wins: a later member column setting the flag does NOT enable marryChildren', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: false }),
            makeColumn({ columnid: 'b', headerGroup: 'G1', headerGroupKeepColumnsTogether: true })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group.marryChildren).toBe(false);
    });

    it('first-column-wins: a later member column clearing the flag does NOT disable marryChildren', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: true }),
            makeColumn({ columnid: 'b', headerGroup: 'G1', headerGroupKeepColumnsTogether: false })
        ]);

        const colDefs = component.getColumnDefs();
        const group = findGroupDef(colDefs, 'G1');

        expect(group.marryChildren).toBe(true);
    });

    it('resolves the flag independently per header group', () => {
        fixture.componentRef.setInput('columns', [
            makeColumn({ columnid: 'a', headerGroup: 'G1', headerGroupKeepColumnsTogether: true }),
            makeColumn({ columnid: 'b', headerGroup: 'G2', headerGroupKeepColumnsTogether: false })
        ]);

        const colDefs = component.getColumnDefs();

        expect(findGroupDef(colDefs, 'G1').marryChildren).toBe(true);
        expect(findGroupDef(colDefs, 'G2').marryChildren).toBe(false);
    });
});
