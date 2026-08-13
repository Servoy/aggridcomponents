import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid } from './datagrid';
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
});
