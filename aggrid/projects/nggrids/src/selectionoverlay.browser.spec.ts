import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { provideGlobalGridOptions } from 'ag-grid-community';
import { DataGrid, DataGridColumn } from './datagrid/datagrid';
import { createMockFoundset } from './testing/mock-foundset';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

/*
 * SVY-21651 - a selected-row colour set by a theme or a solution must be the
 * colour that shows.
 *
 * AG Grid 36 stopped painting the selection onto the row background and now
 * draws an overlay (a ::before on the row's cell containers) filled with
 * --ag-selected-row-background-color. Unless that variable is cleared, the
 * overlay is painted ON TOP of the row background, and the two colours blend.
 *
 * These tests measure the real overlay in chromium, so they fail if the reset
 * in ag-grid-custom.css is removed or moved somewhere the cascade defeats -
 * notably back onto the grid host, where AG Grid 36's inner .ag-styled-root
 * elements carry the ag-theme-* class and win.
 */

const GOLD = 'rgb(212, 175, 55)';
const SOLUTION_CSS = '.ag-table.svy-gold .ag-row-selected { background-color: #D4AF37; }';

@Component({
    template: `
        <div style="width: 800px; height: 400px;">
            <aggrid-groupingtable
                [servoyApi]="servoyApi"
                [columns]="columns()"
                [myFoundset]="myFoundset()"
                [styleClass]="styleClass()"
                [rowHeight]="25"
                [responsiveHeight]="400"
                [onReady]="onReadyCallback"
                #element>
            </aggrid-groupingtable>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [DataGrid]
})
class WrapperComponent {
    columns = signal<DataGridColumn[]>([]);
    myFoundset = signal<IFoundset>(undefined as any);
    styleClass = signal<string>('');
    servoyApi!: ServoyApi;

    private _resolveReady!: () => void;
    readonly gridReady = new Promise<void>(resolve => this._resolveReady = resolve);
    readonly onReadyCallback = () => this._resolveReady();

    @ViewChild('element') element!: DataGrid;
}

/** ag-grid.css and the package stylesheet are not part of the library build, so load them as text. */
const loadCssText = async (url: string): Promise<string> => {
    const module: any = await import(/* @vite-ignore */ url);
    return module.default as string;
};

const addStyle = (css: string): HTMLStyleElement => {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
    return el;
};

const columns = (): DataGridColumn[] => ([
    { headerTitle: 'ID', id: 'id', dataprovider: 'id', width: 100, visible: true } as DataGridColumn,
    { headerTitle: 'Country', id: 'country', dataprovider: 'country', width: 150, visible: true } as DataGridColumn
]);

const foundset = (): IFoundset => createMockFoundset({
    rows: [
        { _svyRowId: '1.1;_0', id: 1, country: 'France' },
        { _svyRowId: '1.2;_1', id: 2, country: 'Germany' },
        { _svyRowId: '1.3;_2', id: 3, country: 'Brazil' }
    ],
    selectedRowIndexes: [0]
});

/** AG Grid renders rows and applies the selection class over a few frames after onReady. */
const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 4000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
    }
    throw new Error(`timed out waiting for ${what}`);
};

const setupGrid = async (styleClass: string): Promise<ComponentFixture<WrapperComponent>> => {
    await TestBed.configureTestingModule({
        imports: [ServoyPublicTestingModule, WrapperComponent],
        teardown: { destroyAfterEach: false }
    }).compileComponents();

    const fixture = TestBed.createComponent(WrapperComponent);
    const wrapper = fixture.componentInstance;
    wrapper.servoyApi = new ServoyApiTesting() as any;
    wrapper.columns.set(columns());
    wrapper.myFoundset.set(foundset());
    wrapper.styleClass.set(styleClass);
    fixture.detectChanges();
    await wrapper.gridReady;
    fixture.detectChanges();
    await fixture.whenStable();
    await waitFor(() => !!fixture.nativeElement.querySelector('.ag-row-selected'), 'the selected row to render');
    return fixture;
};

/** The selection overlay lives on a ::before of the row's cell container. */
const overlayColorOf = (row: Element): string => {
    const container = row.querySelector('.ag-grid-scrolling-cells')
        ?? row.querySelector('.ag-grid-pinned-left-cells')
        ?? row;
    return getComputedStyle(container, '::before').backgroundColor;
};

const selectedRow = (fixture: ComponentFixture<WrapperComponent>): Element => {
    const row = fixture.nativeElement.querySelector('.ag-row-selected');
    expect(row, 'a row must be selected').not.toBeNull();
    return row as Element;
};

const isTransparent = (color: string): boolean =>
    color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || color === '';

describe('selected row colour is not blended with AG Grid 36 overlay (SVY-21651)', () => {
    const styles: HTMLStyleElement[] = [];

    beforeAll(async () => {
        // the grid runs in legacy-theme mode in NGClient, where the ag-theme-* class drives the styling
        provideGlobalGridOptions({ theme: 'legacy' });
        const [agGrid, alpine, pkg] = await Promise.all([
            loadCssText('/node_modules/ag-grid-community/styles/ag-grid.css?inline'),
            loadCssText('/node_modules/ag-grid-community/styles/ag-theme-alpine.css?inline'),
            loadCssText('/projects/nggrids/assets/ag-grid-custom.css?inline')
        ]);
        // the Servoy theme's own declaration, as a solution stylesheet makes it
        const servoyTheme = '.ag-theme-servoy { --ag-selected-row-background-color: rgba(33, 150, 243, 0.3); }';
        [agGrid, alpine, pkg, servoyTheme, SOLUTION_CSS].forEach(css => styles.push(addStyle(css)));
    });

    afterAll(() => {
        styles.forEach(s => s.remove());
    });

    afterEach(() => {
        document.querySelectorAll('.ag-table').forEach(el => el.closest('div')?.remove());
    });

    for (const theme of ['ag-theme-alpine', 'ag-theme-servoy']) {
        it(`paints no overlay over the selected row with ${theme}`, async () => {
            const fixture = await setupGrid(theme);
            const row = selectedRow(fixture);

            expect(isTransparent(overlayColorOf(row)),
                `overlay must not paint over the selected row, got ${overlayColorOf(row)}`).toBe(true);
        });

        it(`keeps a solution's selected-row colour exactly with ${theme}`, async () => {
            const fixture = await setupGrid(`${theme} svy-gold`);
            const row = selectedRow(fixture);

            expect(getComputedStyle(row).backgroundColor).toBe(GOLD);
            expect(isTransparent(overlayColorOf(row)),
                `the gold row must not be tinted, got overlay ${overlayColorOf(row)}`).toBe(true);
        });
    }

    it('leaves the theme colour on popups rendered inside the grid', async () => {
        const fixture = await setupGrid('ag-theme-alpine');
        const gridRoot = fixture.nativeElement.querySelector('.ag-root-wrapper');
        expect(gridRoot).not.toBeNull();

        // a rich-select popup is appended inside the grid and reads the same variable
        const popupRow = document.createElement('div');
        popupRow.className = 'ag-rich-select-row ag-rich-select-row-selected';
        gridRoot.appendChild(popupRow);

        const color = getComputedStyle(popupRow).backgroundColor;
        popupRow.remove();

        expect(isTransparent(color), 'popup selection must keep the theme colour').toBe(false);
    });
});
