import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * More DataGrid helper tests against a live (real ag-grid) grid: updateFoundsetRecord apply path,
 * the checkbox editor icon resolver, header-text handlers, listener cleanup, foundset-manager
 * lookups, and remaining API delegations. These complement the pure-logic suites by exercising
 * the branches that need a live api object.
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
    { headerTitle: 'ID', id: 'id', dataprovider: { idForFoundset: 'id' }, width: 100, enableSort: true, visible: true } as unknown as DataGridColumn,
    { headerTitle: 'Country', id: 'country', dataprovider: { idForFoundset: 'country' }, width: 150, enableSort: true, visible: true } as unknown as DataGridColumn
]);

const rows = () => ([
    { _svyRowId: '1.1;_0', id: 1, country: 'France' },
    { _svyRowId: '1.2;_1', id: 2, country: 'Germany' }
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

describe('DataGrid - more helpers (jsdom render)', () => {
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

    describe('getFoundSetByFoundsetUUID / removeFoundSetByFoundsetUUID', () => {
        it('returns the root foundset for the root hash', () => {
            expect(grid.getFoundSetByFoundsetUUID('root')).toBe(foundset);
        });

        it('refuses to remove the root foundset', () => {
            const spy = vi.fn();
            Object.defineProperty(grid.log, 'error', { configurable: true, get: () => spy });
            expect(grid.removeFoundSetByFoundsetUUID('root')).toBe(false);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('getCheckboxEditorIcon state resolution', () => {
        it('returns the default checked icon for a truthy state', () => {
            expect(grid.getIconCheckboxEditor(true)).toBe('far fa-check-square');
        });

        it('returns the indeterminate icon for a null state', () => {
            expect(grid.getIconCheckboxEditor(null)).toBe('far fa-square-minus');
        });

        it('returns the unchecked icon for a falsy state', () => {
            expect(grid.getIconCheckboxEditor(false)).toBe('far fa-square');
        });
    });

    describe('handleColumnHeader / updateColumnHeader', () => {
        it('updates the header name through the live grid', () => {
            const spy = vi.spyOn(grid.agGrid()!.api, 'refreshHeader');
            grid.handleColumnHeader(0, 'headerName', 'New ID');
            expect(spy).toHaveBeenCalled();
        });

        it('warns when the column has no resolvable id', () => {
            const spy = vi.fn();
            Object.defineProperty(grid.log, 'warn', { configurable: true, get: () => spy });
            vi.spyOn(grid, 'getColumnID').mockReturnValue(undefined as any);
            // temporarily use a column model with no id
            wrapper.columns.set([{ } as DataGridColumn]);
            fixture.detectChanges();
            grid.handleColumnHeader(0, 'headerName', 'x');
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('handleColumnFooterText / handleColumnHeaderText', () => {
        it('pushes footer data to the pinned bottom row', () => {
            const spy = vi.spyOn(grid.agGrid()!.api, 'setGridOption');
            grid.handleColumnFooterText();
            expect(spy).toHaveBeenCalledWith('pinnedBottomRowData', expect.anything());
        });

        it('pushes header data to the pinned top row', () => {
            const spy = vi.spyOn(grid.agGrid()!.api, 'setGridOption');
            grid.handleColumnHeaderText();
            expect(spy).toHaveBeenCalledWith('pinnedTopRowData', expect.anything());
        });
    });

    describe('removeFooterTextListeners / removeHeaderTextListeners', () => {
        it('invokes and clears registered footer listeners', () => {
            const unsub = vi.fn();
            (grid as any).footerTextChangeListeners = [unsub];
            grid.removeFooterTextListeners();
            expect(unsub).toHaveBeenCalled();
            expect((grid as any).footerTextChangeListeners.length).toBe(0);
        });

        it('invokes and clears registered header listeners', () => {
            const unsub = vi.fn();
            (grid as any).headerTextChangeListeners = [unsub];
            grid.removeHeaderTextListeners();
            expect(unsub).toHaveBeenCalled();
            expect((grid as any).headerTextChangeListeners.length).toBe(0);
        });
    });

    describe('updateFoundsetRecord', () => {
        it('applies the new value to the foundset dataprovider', () => {
            const applySpy = vi.spyOn(grid.servoyApi(), 'apply').mockImplementation(() => {});
            const node = grid.agGrid()!.api.getDisplayedRowAtIndex(0)!;
            const params = {
                context: { componentParent: grid },
                node,
                data: node.data,
                column: { colId: 'country' },
                colDef: { field: 'country' },
                newValue: 'Spain',
                oldValue: 'France'
            };
            grid.updateFoundsetRecord(params);
            expect(applySpy).toHaveBeenCalled();
        });

        it('ignores an update for a different invalid cell', () => {
            grid.invalidCellDataIndex = { rowIndex: 9, colKey: 'x' };
            const applySpy = vi.spyOn(grid.servoyApi(), 'apply').mockImplementation(() => {});
            const node = grid.agGrid()!.api.getDisplayedRowAtIndex(0)!;
            grid.updateFoundsetRecord({ context: { componentParent: grid }, node, data: node.data, column: { colId: 'country' }, colDef: { field: 'country' }, newValue: 'X', oldValue: 'France' });
            expect(applySpy).not.toHaveBeenCalled();
        });
    });

    describe('internalGetGroupSelection', () => {
        it('returns null when the table is not grouped', () => {
            expect(grid.internalGetGroupSelection()).toBeNull();
        });
    });

    describe('getContextMenuItems option', () => {
        it('returns the configured context menu items', () => {
            grid.contextMenuItems = ['copy'];
            const fn = grid.agGridOptions.getContextMenuItems as any;
            expect(fn()).toEqual(['copy']);
        });
    });
});


