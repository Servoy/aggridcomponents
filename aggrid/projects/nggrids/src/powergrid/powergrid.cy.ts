import { MountConfig } from 'cypress/angular';
import { Component, ViewChild, signal } from '@angular/core';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { NGGridsModule } from '../nggrids.module';
import { FormsModule } from '@angular/forms';
import { createPowerGridColumns, createPowerGridData } from '../testing/mock-data';

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
                [onReady]="onReady"
                [responsiveHeight]="responsiveHeight()"
                #element>
            </aggrid-datasettable>
        </div>
    `,
    standalone: false
})
class WrapperComponent {
    columns = signal<PowerGridColumn[]>(undefined);
    data = signal<any>(undefined);
    enabled = signal<boolean>(true);
    readOnly = signal<boolean>(false);
    styleClass = signal<string>(undefined);
    enableSorting = signal<boolean>(true);
    enableColumnResize = signal<boolean>(true);
    rowHeight = signal<number>(25);
    headerHeight = signal<number>(33);
    multiSelect = signal<boolean>(false);
    responsiveHeight = signal<number>(400);
    servoyApi: ServoyApi;
    onCellClick: (rowData: any, colId: string, value: any, event: Event, dataTarget?: string) => void;
    onCellDoubleClick: (rowData: any, colId: string, value: any, event: Event, dataTarget?: string) => void;
    onCellRightClick: (rowData: any, colId: string, value: any, event: Event, dataTarget?: string) => void;
    onReady: () => void;

    @ViewChild('element') element: PowerGrid;
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

describe('PowerGrid', () => {
    const configWrapper: MountConfig<WrapperComponent> = {
        declarations: [WrapperComponent],
        imports: [NGGridsModule, ServoyPublicTestingModule, FormsModule]
    };

    it('should mount and render grid with correct columns', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row').should('have.length', 10);
            cy.get('.ag-header-cell-text').should('have.length.at.least', 3);
        });
    });

    it('should render correct number of rows', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row').should('have.length', 10);
        });
    });

    it('should display cell values correctly', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-row[row-index="0"] .ag-cell').eq(0).should('contain.text', '1');
            cy.get('.ag-row[row-index="0"] .ag-cell').eq(1).should('contain.text', 'France');
            cy.get('.ag-row[row-index="0"] .ag-cell').eq(2).should('contain.text', 'Paris');
        });
    });

    it('should trigger onCellClick when a cell is clicked', () => {
        const servoyApi = new ServoyApiTesting();
        const onCellClick = cy.stub().as('onCellClick');
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.component.onCellClick = onCellClick;
            wrapper.fixture.detectChanges();

            cy.get('.ag-row[row-index="0"] .ag-cell').eq(1).click().then(() => {
                cy.wrap(onCellClick).should('have.been.calledOnce');
            });
        });
    });

    it('should trigger onCellDoubleClick on double click', () => {
        const servoyApi = new ServoyApiTesting();
        const onCellDoubleClick = cy.stub().as('onCellDoubleClick');
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.component.onCellDoubleClick = onCellDoubleClick;
            wrapper.fixture.detectChanges();

            cy.get('.ag-row[row-index="1"] .ag-cell').eq(0).dblclick().then(() => {
                cy.wrap(onCellDoubleClick).should('have.been.calledOnce');
            });
        });
    });

    it('should trigger onCellRightClick on context menu', () => {
        const servoyApi = new ServoyApiTesting();
        const onCellRightClick = cy.stub().as('onCellRightClick');
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.component.onCellRightClick = onCellRightClick;
            wrapper.fixture.detectChanges();

            cy.get('.ag-row[row-index="0"] .ag-cell').eq(2).rightclick().then(() => {
                cy.wrap(onCellRightClick).should('have.been.calledOnce');
            });
        });
    });

    it('should apply styleClass to the grid', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.component.styleClass.set('my-custom-class');
            wrapper.fixture.detectChanges();

            cy.get('ag-grid-angular').should('have.class', 'my-custom-class');
        });
    });

    it('should select a row on click', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-row[row-index="2"] .ag-cell').eq(0).click();
            cy.get('.ag-row[row-index="2"]').should('have.class', 'ag-row-selected');
        });
    });

    it('should support multi-select', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.component.multiSelect.set(true);
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row[row-index="0"] .ag-cell').first().click();
            cy.get('.ag-center-cols-container .ag-row[row-index="2"] .ag-cell').first().click({ ctrlKey: true });
            cy.get('.ag-center-cols-container .ag-row-selected').should('have.length', 2);
        });
    });

    it('should call onReady when grid is initialized', () => {
        const servoyApi = new ServoyApiTesting();
        const onReady = cy.stub().as('onReady');
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.component.onReady = onReady;
            wrapper.fixture.detectChanges();

            cy.wrap(onReady).should('have.been.calledOnce');
        });
    });

    it('should update data dynamically', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createPowerGridColumns());
            wrapper.component.data.set(getRowData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row').should('have.length', 10).then(() => {
                const newData = getRowData().slice(0, 3);
                wrapper.component.data.set(newData);
                wrapper.fixture.detectChanges();
                cy.get('.ag-center-cols-container .ag-row').should('have.length', 3);
            });
        });
    });
});
