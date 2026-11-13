import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Drag/drop and function-call render tests for DataGrid against the REAL ag-grid. These exercise
 * OUR gridDragOver / gridDrop handlers (drag-data mapping, JSEvent assembly, dropEffect) and the
 * executeFunctionCall dispatcher, driving live row nodes.
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

describe('DataGrid - drag/drop & function calls (jsdom render)', () => {
    let fixture: ComponentFixture<WrapperComponent>;
    let wrapper: WrapperComponent;
    let grid: DataGrid;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, WrapperComponent],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        fixture = TestBed.createComponent(WrapperComponent);
        wrapper = fixture.componentInstance;
        wrapper.servoyApi = new ServoyApiTesting() as any;
        wrapper.columns.set(columns());
        wrapper.myFoundset.set(createMockFoundset({ rows: rows(), selectedRowIndexes: [0] }));
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

    describe('gridDragOver', () => {
        it('ignores drags whose first type is not the nggrids type', () => {
            const event: any = { dataTransfer: { types: ['text/plain'] }, preventDefault: vi.fn() };
            grid.gridDragOver(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('sets copy dropEffect and prevents default for a supported drag with no onDragOver handler', () => {
            const event: any = {
                dataTransfer: { types: ['nggrids-drag/json'], dropEffect: '' },
                preventDefault: vi.fn(),
                currentTarget: document.createElement('div'),
                clientX: 0, clientY: 0,
                target: { closest: () => null }
            };
            grid.gridDragOver(event);
            expect(event.dataTransfer.dropEffect).toBe('copy');
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('gridDrop', () => {
        it('parses the transfer data and calls onDrop with the records', () => {
            const onDrop = vi.fn();
            (grid as any).onDrop = () => onDrop;
            const transfer = { sourceGridName: 'g', sourceColumnId: 'id', records: [{ id: 1 }] };
            const event: any = {
                preventDefault: vi.fn(),
                target: { closest: () => ({ getAttribute: () => 'id' }) },
                dataTransfer: { getData: () => JSON.stringify(transfer) }
            };
            vi.spyOn(grid as any, 'getNodeForElement').mockReturnValue(null);
            grid.gridDrop(event);
            expect(onDrop).toHaveBeenCalled();
            expect(onDrop.mock.calls[0][0]).toEqual([{ id: 1 }]);
        });

        it('does nothing when there is no onDrop handler', () => {
            (grid as any).onDrop = () => null;
            const event: any = { preventDefault: vi.fn(), target: { closest: () => null }, dataTransfer: { getData: () => '{}' } };
            expect(() => grid.gridDrop(event)).not.toThrow();
        });
    });

    describe('getNodeForElement', () => {
        it('resolves a row node from a row-id element', () => {
            const node = grid.agGrid()!.api.getDisplayedRowAtIndex(0)!;
            const rowId = (node as any).id;
            const element = { closest: (sel: string) => sel === '[row-id]' ? { getAttribute: () => rowId } : null };
            expect(grid.getNodeForElement(element)).toBe(node);
        });

        it('returns null when there is no row-id element', () => {
            expect(grid.getNodeForElement({ closest: () => null })).toBeNull();
        });
    });

    describe('executeFunctionCall', () => {
        it('invokes the matching registered function call', () => {
            const f = vi.fn();
            (grid as any)._internalFunctionCalls = () => [{ alias: 'doIt', f }];
            grid.executeFunctionCall('doIt', 42);
            expect(f).toHaveBeenCalledWith(42);
        });

        it('warns when no matching function call exists', () => {
            const spy = vi.fn();
            Object.defineProperty(grid.log, 'warn', { configurable: true, get: () => spy });
            (grid as any)._internalFunctionCalls = () => [];
            grid.executeFunctionCall('missing', null);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('cannot find functionCall'));
        });
    });
});

