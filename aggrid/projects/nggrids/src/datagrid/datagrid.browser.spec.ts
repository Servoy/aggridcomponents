import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { FormsModule } from '@angular/forms';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, vi } from 'vitest';

@Component({
    template: `
        <div style="width: 800px; height: 400px;">
            <aggrid-groupingtable
                [servoyApi]="servoyApi"
                [columns]="columns()"
                [myFoundset]="myFoundset()"
                [enabled]="enabled()"
                [readOnly]="readOnly()"
                [styleClass]="styleClass()"
                [enableSorting]="enableSorting()"
                [enableColumnResize]="enableColumnResize()"
                [rowHeight]="rowHeight()"
                [responsiveHeight]="responsiveHeight()"
                [onReady]="onReadyCallback"
                [onSelectedRowsChanged]="onSelectedRowsChanged"
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
    enabled = signal<boolean>(true);
    readOnly = signal<boolean>(false);
    styleClass = signal<string>('');
    enableSorting = signal<boolean>(true);
    enableColumnResize = signal<boolean>(true);
    rowHeight = signal<number>(25);
    responsiveHeight = signal<number>(400);
    servoyApi!: ServoyApi;
    onSelectedRowsChanged!: (isgroupselection?: boolean, groupcolumnid?: string, groupkey?: unknown, groupselection?: boolean, event?: Event) => void;

    private _resolveReady!: () => void;
    readonly gridReady = new Promise<void>(resolve => this._resolveReady = resolve);
    userOnReady?: () => void;

    readonly onReadyCallback = () => {
        this._resolveReady();
        this.userOnReady?.();
    };

    @ViewChild('element') element!: DataGrid;
}

function createDataGridColumns(): DataGridColumn[] {
    const col1 = {
        headerTitle: 'ID',
        id: 'id',
        dataprovider: 'id',
        width: 100,
        enableSort: true,
        enableResize: true,
        visible: true
    } as DataGridColumn;

    const col2 = {
        headerTitle: 'Country',
        id: 'country',
        dataprovider: 'country',
        width: 150,
        enableSort: true,
        enableResize: true,
        visible: true
    } as DataGridColumn;

    const col3 = {
        headerTitle: 'City',
        id: 'city',
        dataprovider: 'city',
        width: 150,
        enableSort: true,
        enableResize: true,
        visible: true
    } as DataGridColumn;

    return [col1, col2, col3];
}

function createFoundsetWithData(): IFoundset {
    const rows = [
        { _svyRowId: '1.1;_0', id: 1, country: 'France', city: 'Paris' },
        { _svyRowId: '1.2;_1', id: 2, country: 'Germany', city: 'Berlin' },
        { _svyRowId: '1.3;_2', id: 3, country: 'Brazil', city: 'Rio de Janeiro' },
        { _svyRowId: '1.4;_3', id: 4, country: 'USA', city: 'New York' },
        { _svyRowId: '1.5;_4', id: 5, country: 'Austria', city: 'Vienna' },
        { _svyRowId: '1.6;_5', id: 6, country: 'Sweden', city: 'Stockholm' },
        { _svyRowId: '1.7;_6', id: 7, country: 'Finland', city: 'Helsinki' },
        { _svyRowId: '1.8;_7', id: 8, country: 'Mexico', city: 'Mexico City' },
        { _svyRowId: '1.9;_8', id: 9, country: 'Switzerland', city: 'Bern' },
        { _svyRowId: '1.10;_9', id: 10, country: 'Belgium', city: 'Brussels' }
    ];
    return createMockFoundset({ rows, selectedRowIndexes: [0] });
}

async function setupGrid(overrides?: {
    styleClass?: string;
    onReady?: () => void;
    onSelectedRowsChanged?: (...args: any[]) => void;
    waitForReady?: boolean;
}): Promise<ComponentFixture<WrapperComponent>> {
    await TestBed.configureTestingModule({
        imports: [ServoyPublicTestingModule, WrapperComponent],
        teardown: { destroyAfterEach: false }
    }).compileComponents();

    const fixture = TestBed.createComponent(WrapperComponent);
    const wrapper = fixture.componentInstance;
    wrapper.servoyApi = new ServoyApiTesting() as any;
    wrapper.columns.set(createDataGridColumns());
    wrapper.myFoundset.set(createFoundsetWithData());
    if (overrides?.styleClass) wrapper.styleClass.set(overrides.styleClass);
    if (overrides?.onReady) wrapper.userOnReady = overrides.onReady;
    if (overrides?.onSelectedRowsChanged) wrapper.onSelectedRowsChanged = overrides.onSelectedRowsChanged;
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

describe('DataGrid - browser rendering', () => {
    it('should mount and render grid with correct column headers', async () => {
        const fixture = await setupGrid();
        const headers = queryAll(fixture, '.ag-header-cell-text');
        const headerTexts = headers.map(h => h.textContent?.trim());
        expect(headerTexts).toContain('ID');
        expect(headerTexts).toContain('Country');
        expect(headerTexts).toContain('City');
    });

    it('should render rows from foundset viewport', async () => {
        const fixture = await setupGrid();
        const rows = queryAll(fixture, '[role="row"][row-index]');
        expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should display cells in foundset rows', async () => {
        const fixture = await setupGrid();
        const firstRow = query(fixture, '.ag-row[row-index="0"]');
        expect(firstRow).not.toBeNull();
        const cells = firstRow!.querySelectorAll('.ag-cell');
        expect(cells.length).toBeGreaterThanOrEqual(3);
    });

    it('should apply styleClass to the grid', async () => {
        const fixture = await setupGrid({ styleClass: 'my-datagrid-class' });
        const grid = query(fixture, 'ag-grid-angular');
        expect(grid).not.toBeNull();
        expect(grid!.classList.contains('my-datagrid-class')).toBe(true);
    });

    it('should select a row on click', async () => {
        const fixture = await setupGrid();
        const row2Cell = query(fixture, '.ag-row[row-index="2"] .ag-cell');
        expect(row2Cell).not.toBeNull();
        (row2Cell as HTMLElement).click();
        fixture.detectChanges();
        await fixture.whenStable();
        const row2 = query(fixture, '.ag-row[row-index="2"]');
        expect(row2!.classList.contains('ag-row-selected')).toBe(true);
    });

    it('should call onReady when grid is initialized', async () => {
        const onReady = vi.fn();
        await setupGrid({ onReady });
        expect(onReady).toHaveBeenCalled();
    });

    it('should highlight the initially selected row', async () => {
        const fixture = await setupGrid();
        const row0 = query(fixture, '.ag-row[row-index="0"]');
        expect(row0).not.toBeNull();
        expect(row0!.classList.contains('ag-row-selected')).toBe(true);
    });

    it('should render viewport rows', async () => {
        const fixture = await setupGrid();
        const rows = queryAll(fixture, '[role="row"][row-index]');
        expect(rows.length).toBe(10);
    });
});
