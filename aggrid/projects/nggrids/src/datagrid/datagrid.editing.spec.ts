import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Editing / selection / foundset-update render tests for DataGrid against the REAL ag-grid.
 * These exercise OUR editCellAt success path, requestFocus, updateRows/updateRow, purge and the
 * change-listener viewport branches with a live grid and mock foundset.
 */
@Component({
    template: `
        <div style="width: 600px; height: 300px;">
            <aggrid-groupingtable
                [servoyApi]="servoyApi"
                [columns]="columns()"
                [myFoundset]="myFoundset()"
                [enabled]="true"
                [enableSorting]="true"
                [enableColumnResize]="true"
                [rowHeight]="25"
                [responsiveHeight]="300"
                [onReady]="onReadyCallback"
                #element>
            </aggrid-groupingtable>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [DataGrid, FormsModule]
})
class WrapperComponent {
    columns = signal<DataGridColumn[]>([]);
    myFoundset = signal<IFoundset>(undefined as any);
    servoyApi!: ServoyApi;
    private _resolveReady!: () => void;
    readonly gridReady = new Promise<void>(resolve => this._resolveReady = resolve);
    readonly onReadyCallback = () => this._resolveReady();
    @ViewChild('element') element!: DataGrid;
}

const columns = (): DataGridColumn[] => ([
    { headerTitle: 'ID', id: 'id', dataprovider: { idForFoundset: 'id' }, width: 100, enableSort: true, visible: true, editType: 'TEXTFIELD' } as unknown as DataGridColumn,
    { headerTitle: 'Country', id: 'country', dataprovider: { idForFoundset: 'country' }, width: 150, enableSort: true, visible: true } as unknown as DataGridColumn
]);

const rows = () => ([
    { _svyRowId: '1.1;_0', id: 1, country: 'France' },
    { _svyRowId: '1.2;_1', id: 2, country: 'Germany' },
    { _svyRowId: '1.3;_2', id: 3, country: 'Brazil' }
]);

const waitForData = async (grid: DataGrid, timeoutMs = 3000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const n = grid.agGrid()!.api.getDisplayedRowAtIndex(0);
        if (n && n.data) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('timed out waiting for row data');
};

describe('DataGrid - editing/selection/update (jsdom render)', () => {
    let fixture: ComponentFixture<WrapperComponent>;
    let wrapper: WrapperComponent;
    let grid: DataGrid;
    let foundset: IFoundset;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, WrapperComponent],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(WrapperComponent);
        wrapper = fixture.componentInstance;
        wrapper.servoyApi = new ServoyApiTesting() as any;
        wrapper.columns.set(columns());
        foundset = createMockFoundset({ rows: rows(), selectedRowIndexes: [0] });
        wrapper.myFoundset.set(foundset);
        fixture.detectChanges();
        await wrapper.gridReady;
        fixture.detectChanges();
        await fixture.whenStable();
        grid = wrapper.element;
        await waitForData(grid);
    }, 30000);

    afterEach(() => {
        try { grid?.destroy(); } catch (e) { /* ignore */ }
        vi.restoreAllMocks();
    });

    describe('editCellAt', () => {
        it('requests selection and defers an edit when selection is not yet ready', async () => {
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            const selSpy = vi.spyOn(foundset, 'requestSelectionUpdate');
            grid.isRenderedAndSelectionReady = false;
            grid.editCellAt(1, 0);
            await Promise.resolve();
            expect(selSpy).toHaveBeenCalledWith([0]);
        });

        it('resets the deferred edit coordinates when the selection is ready', async () => {
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            vi.spyOn(foundset, 'requestSelectionUpdate').mockResolvedValue([0] as any);
            grid.isRenderedAndSelectionReady = true;
            grid.isDataLoading = false;
            grid.startEditFoundsetIndex = 5;
            grid.startEditColumnIndex = 5;
            grid.editCellAt(1, 0);
            await Promise.resolve();
            await Promise.resolve();
            // the ready branch clears the stashed edit coordinates (the setTimeout schedules the actual edit)
            expect(grid.startEditFoundsetIndex).toBe(-1);
            expect(grid.startEditColumnIndex).toBe(-1);
        });
    });

    describe('requestFocus', () => {
        it('focuses the selected row cell when the selection is ready', () => {
            grid.isRenderedAndSelectionReady = true;
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            const spy = vi.spyOn(grid.agGrid()!.api, 'setFocusedCell');
            grid.requestFocus(0);
            expect(spy).toHaveBeenCalled();
        });

        it('stashes the column index when the selection is not ready', () => {
            grid.isRenderedAndSelectionReady = false;
            grid.requestFocus(1);
            expect(grid.requestFocusColumnIndex).toBe(1);
        });
    });

    describe('updateRows / updateRow', () => {
        it('updates a changed row without purging', () => {
            const needPurge = grid.updateRows([{ startIndex: 0, endIndex: 0, type: 0 }], grid.foundset);
            expect(needPurge).toBe(false);
        });

        it('purges when rows were inserted', () => {
            const purgeSpy = vi.spyOn(grid, 'purge').mockImplementation(() => {});
            const needPurge = grid.updateRows([{ startIndex: 0, endIndex: 0, type: 1 }], grid.foundset);
            expect(needPurge).toBe(true);
            expect(purgeSpy).toHaveBeenCalled();
        });
    });

    describe('purge / purgeImpl', () => {
        it('purgeImpl resets state and refreshes the datasource', () => {
            const refreshSpy = vi.spyOn(grid, 'refreshAgGridServerSide').mockImplementation(() => {});
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            grid.purgeImpl();
            expect(refreshSpy).toHaveBeenCalled();
            expect(grid.dirtyCache).toBe(false);
        });
    });

    describe('changeListener viewport update', () => {
        it('updates rows for a viewportRowsUpdated change', () => {
            const updateSpy = vi.spyOn(grid, 'updateRows').mockReturnValue(false);
            grid.isRootFoundsetLoaded = true;
            grid.sortHandlerPromises = [];
            grid.changeListener({ viewportRowsUpdated: [{ startIndex: 0, endIndex: 0, type: 0 }] } as any);
            expect(updateSpy).toHaveBeenCalled();
        });

        it('requests a selection change on selectedRowIndexesChanged', () => {
            const selSpy = vi.spyOn(grid, 'selectedRowIndexesChanged').mockReturnValue(false);
            vi.spyOn(grid, 'scrollToSelection').mockImplementation(() => {});
            grid.isRootFoundsetLoaded = true;
            grid.sortHandlerPromises = [];
            (grid as any).requestSelectionPromises = [];
            grid.changeListener({ selectedRowIndexesChanged: { oldValue: [0], newValue: [1] } } as any);
            expect(selSpy).toHaveBeenCalled();
        });
    });

    describe('scrollToSelectionEx', () => {
        it('ensures the selected index is visible for a non-grouped grid', () => {
            vi.spyOn(grid, 'isTableGrouped').mockReturnValue(false);
            const spy = vi.spyOn(grid.agGrid()!.api, 'ensureIndexVisible');
            grid.scrollToSelectionEx();
            expect(spy).toHaveBeenCalled();
        });
    });
});


