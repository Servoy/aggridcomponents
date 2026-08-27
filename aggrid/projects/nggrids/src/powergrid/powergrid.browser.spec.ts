import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { NGGridsModule } from '../nggrids.module';
import { FormsModule } from '@angular/forms';
import { createPowerGridColumns, createPowerGridData } from '../testing/mock-data';
import { describe, it, expect, vi } from 'vitest';

@Component({
    template: `
        <div style="width: 800px; height: 400px;">
            <aggrid-datasettable
                [servoyApi]="servoyApi"
                [columns]="columns()"
                [data]="data()"
                [enabled]="enabled()"
                [readOnly]="readOnly()"
                [styleClass]="styleClass()"
                [enableSorting]="enableSorting()"
                [enableColumnResize]="enableColumnResize()"
                [rowHeight]="rowHeight()"
                [headerHeight]="headerHeight()"
                [multiSelect]="multiSelect()"
                [onCellClick]="onCellClick"
                [onCellDoubleClick]="onCellDoubleClick"
                [onCellRightClick]="onCellRightClick"
                [onReady]="onReadyCallback"
                [responsiveHeight]="responsiveHeight()"
                #element>
            </aggrid-datasettable>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NGGridsModule, FormsModule]
})
class WrapperComponent {
    columns = signal<PowerGridColumn[]>([]);
    data = signal<any>(undefined);
    enabled = signal<boolean>(true);
    readOnly = signal<boolean>(false);
    styleClass = signal<string>('');
    enableSorting = signal<boolean>(true);
    enableColumnResize = signal<boolean>(true);
    rowHeight = signal<number>(25);
    headerHeight = signal<number>(33);
    multiSelect = signal<boolean>(false);
    responsiveHeight = signal<number>(400);
    servoyApi!: ServoyApi;
    onCellClick!: (rowData: any, colId: string, value: any, event: Event, dataTarget?: string) => void;
    onCellDoubleClick!: (rowData: any, colId: string, value: any, event: Event, dataTarget?: string) => void;
    onCellRightClick!: (rowData: any, colId: string, value: any, event: Event, dataTarget?: string) => void;

    private _resolveReady!: () => void;
    readonly gridReady = new Promise<void>(resolve => this._resolveReady = resolve);
    userOnReady?: () => void;

    readonly onReadyCallback = () => {
        this._resolveReady();
        this.userOnReady?.();
    };

    @ViewChild('element') element!: PowerGrid;
}

function getRowData(): any[] {
    const dataset = createPowerGridData();
    return dataset.rows.map((row: any[]) => {
        const obj: any = {};
        dataset.columnNames.forEach((name: string, idx: number) => {
            obj[name] = row[idx];
        });
        return obj;
    });
}

function delay(ms = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupGrid(overrides?: {
    styleClass?: string;
    multiSelect?: boolean;
    onReady?: () => void;
    onCellClick?: (...args: any[]) => void;
    onCellDoubleClick?: (...args: any[]) => void;
    onCellRightClick?: (...args: any[]) => void;
    waitForReady?: boolean;
}): Promise<ComponentFixture<WrapperComponent>> {
    await TestBed.configureTestingModule({
        imports: [ServoyPublicTestingModule, WrapperComponent],
        teardown: { destroyAfterEach: false }
    }).compileComponents();

    const fixture = TestBed.createComponent(WrapperComponent);
    const wrapper = fixture.componentInstance;
    wrapper.servoyApi = new ServoyApiTesting() as any;
    wrapper.columns.set(createPowerGridColumns());
    wrapper.data.set(getRowData());
    if (overrides?.styleClass) wrapper.styleClass.set(overrides.styleClass);
    if (overrides?.multiSelect !== undefined) wrapper.multiSelect.set(overrides.multiSelect);
    if (overrides?.onReady) wrapper.userOnReady = overrides.onReady;
    if (overrides?.onCellClick) wrapper.onCellClick = overrides.onCellClick;
    if (overrides?.onCellDoubleClick) wrapper.onCellDoubleClick = overrides.onCellDoubleClick;
    if (overrides?.onCellRightClick) wrapper.onCellRightClick = overrides.onCellRightClick;
    fixture.detectChanges();

    if (overrides?.waitForReady !== false) {
        await wrapper.gridReady;
        fixture.detectChanges();
    }

    return fixture;
}

function queryAll(fixture: ComponentFixture<any>, selector: string): Element[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector));
}

function query(fixture: ComponentFixture<any>, selector: string): Element | null {
    return fixture.nativeElement.querySelector(selector);
}

describe('PowerGrid - browser rendering', () => {
    it('should mount and render grid with correct columns', async () => {
        const fixture = await setupGrid();
        const rows = queryAll(fixture, '.ag-row[row-index]');
        expect(rows.length).toBeGreaterThanOrEqual(1);
        const headers = queryAll(fixture, '.ag-header-cell-text');
        expect(headers.length).toBeGreaterThanOrEqual(3);
    });

    it('should render correct number of rows', async () => {
        const fixture = await setupGrid();
        const row9 = query(fixture, '.ag-row[row-index="9"]');
        expect(row9).not.toBeNull();
    });

    it('should display cell values correctly', async () => {
        const fixture = await setupGrid();
        const firstRowCells = queryAll(fixture, '.ag-row[row-index="0"] .ag-cell');
        expect(firstRowCells[0]?.textContent?.trim()).toContain('1');
        expect(firstRowCells[1]?.textContent?.trim()).toContain('France');
        expect(firstRowCells[2]?.textContent?.trim()).toContain('Paris');
    });

    it('should trigger onCellClick when a cell is clicked', async () => {
        const onCellClick = vi.fn();
        const fixture = await setupGrid({ onCellClick });
        const cell = query(fixture, '.ag-row[row-index="0"] .ag-cell:nth-child(2)');
        expect(cell).not.toBeNull();
        (cell as HTMLElement).click();
        await delay();
        fixture.detectChanges();
        expect(onCellClick).toHaveBeenCalled();
    });

    it('should trigger onCellDoubleClick on double click', async () => {
        const onCellDoubleClick = vi.fn();
        const fixture = await setupGrid({ onCellDoubleClick });
        const cell = query(fixture, '.ag-row[row-index="1"] .ag-cell');
        expect(cell).not.toBeNull();
        (cell as HTMLElement).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        await delay();
        fixture.detectChanges();
        expect(onCellDoubleClick).toHaveBeenCalled();
    });

    it('should trigger onCellRightClick on context menu', async () => {
        const onCellRightClick = vi.fn();
        const fixture = await setupGrid({ onCellRightClick });
        const cell = query(fixture, '.ag-row[row-index="0"] .ag-cell:nth-child(3)');
        expect(cell).not.toBeNull();
        (cell as HTMLElement).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        await delay();
        fixture.detectChanges();
        expect(onCellRightClick).toHaveBeenCalled();
    });

    it('should apply styleClass to the grid', async () => {
        const fixture = await setupGrid({ styleClass: 'my-custom-class' });
        const grid = query(fixture, 'ag-grid-angular');
        expect(grid).not.toBeNull();
        expect(grid!.classList.contains('my-custom-class')).toBe(true);
    });

    it('should select a row on click', async () => {
        const fixture = await setupGrid();
        const cell = query(fixture, '.ag-row[row-index="2"] .ag-cell');
        expect(cell).not.toBeNull();
        (cell as HTMLElement).click();
        fixture.detectChanges();
        await fixture.whenStable();
        const row2 = query(fixture, '.ag-row[row-index="2"]');
        expect(row2!.classList.contains('ag-row-selected')).toBe(true);
    });

    it('should support multi-select', async () => {
        const fixture = await setupGrid({ multiSelect: true });
        const cell0 = query(fixture, '.ag-row[row-index="0"] .ag-cell');
        (cell0 as HTMLElement).click();
        fixture.detectChanges();
        await fixture.whenStable();

        const cell2 = query(fixture, '.ag-row[row-index="2"] .ag-cell');
        (cell2 as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
        fixture.detectChanges();
        await fixture.whenStable();

        const selected = queryAll(fixture, '.ag-row-selected');
        expect(selected.length).toBe(2);
    });

    it('should call onReady when grid is initialized', async () => {
        const onReady = vi.fn();
        await setupGrid({ onReady });
        expect(onReady).toHaveBeenCalled();
    });

    it('should update data dynamically', async () => {
        const fixture = await setupGrid();
        const row9 = query(fixture, '.ag-row[row-index="9"]');
        expect(row9).not.toBeNull();

        const newData = getRowData().slice(0, 3);
        fixture.componentInstance.data.set(newData);
        fixture.detectChanges();
        await fixture.whenStable();

        const row2 = query(fixture, '.ag-row[row-index="2"]');
        expect(row2).not.toBeNull();
        const row3 = query(fixture, '.ag-row[row-index="3"]');
        expect(row3).toBeNull();
    });
});
