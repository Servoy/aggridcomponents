import { MountConfig } from 'cypress/angular';
import { Component, ViewChild, signal } from '@angular/core';
import { ServoyApi, ServoyApiTesting, ServoyPublicTestingModule, IFoundset } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { NGGridsModule } from '../nggrids.module';
import { FormsModule } from '@angular/forms';
import { createMockFoundset } from '../testing/mock-foundset';

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
                [onReady]="onReady"
                [onSelectedRowsChanged]="onSelectedRowsChanged"
                #element>
            </aggrid-groupingtable>
        </div>
    `,
    standalone: false
})
class WrapperComponent {
    columns = signal<DataGridColumn[]>(undefined);
    myFoundset = signal<IFoundset>(undefined);
    enabled = signal<boolean>(true);
    readOnly = signal<boolean>(false);
    styleClass = signal<string>(undefined);
    enableSorting = signal<boolean>(true);
    enableColumnResize = signal<boolean>(true);
    rowHeight = signal<number>(25);
    responsiveHeight = signal<number>(400);
    servoyApi: ServoyApi;
    onReady: () => void;
    onSelectedRowsChanged: (isgroupselection?: boolean, groupcolumnid?: string, groupkey?: unknown, groupselection?: boolean, event?: Event) => void;

    @ViewChild('element') element: DataGrid;
}

function createDataGridColumns(): DataGridColumn[] {
    const col1 = new DataGridColumn();
    col1.headerTitle = 'ID';
    col1.id = 'id';
    col1.dataprovider = 'id';
    col1.width = 100;
    col1.enableSort = true;
    col1.enableResize = true;
    col1.visible = true;

    const col2 = new DataGridColumn();
    col2.headerTitle = 'Country';
    col2.id = 'country';
    col2.dataprovider = 'country';
    col2.width = 150;
    col2.enableSort = true;
    col2.enableResize = true;
    col2.visible = true;

    const col3 = new DataGridColumn();
    col3.headerTitle = 'City';
    col3.id = 'city';
    col3.dataprovider = 'city';
    col3.width = 150;
    col3.enableSort = true;
    col3.enableResize = true;
    col3.visible = true;

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

describe('DataGrid', () => {
    const configWrapper: MountConfig<WrapperComponent> = {
        declarations: [WrapperComponent],
        imports: [NGGridsModule, ServoyPublicTestingModule, FormsModule]
    };

    it('should mount and render grid with correct column headers', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createDataGridColumns());
            wrapper.component.myFoundset.set(createFoundsetWithData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-header-cell-text').should('contain.text', 'ID');
            cy.get('.ag-header-cell-text').should('contain.text', 'Country');
            cy.get('.ag-header-cell-text').should('contain.text', 'City');
        });
    });

    it('should render rows from foundset viewport', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createDataGridColumns());
            wrapper.component.myFoundset.set(createFoundsetWithData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row').should('have.length.at.least', 1);
        });
    });

    it('should display cell values from foundset data', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createDataGridColumns());
            wrapper.component.myFoundset.set(createFoundsetWithData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row').first().find('.ag-cell').first()
                .should('not.have.text', '');
        });
    });

    it('should apply styleClass to the grid', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createDataGridColumns());
            wrapper.component.myFoundset.set(createFoundsetWithData());
            wrapper.component.styleClass.set('my-datagrid-class');
            wrapper.fixture.detectChanges();

            cy.get('ag-grid-angular').should('have.class', 'my-datagrid-class');
        });
    });

    it('should select a row on click', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createDataGridColumns());
            wrapper.component.myFoundset.set(createFoundsetWithData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row').eq(2).find('.ag-cell').first().click();
            cy.get('.ag-center-cols-container .ag-row').eq(2).should('have.class', 'ag-row-selected');
        });
    });

    it('should call onReady when grid is initialized', () => {
        const servoyApi = new ServoyApiTesting();
        const onReady = cy.stub().as('onReady');
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createDataGridColumns());
            wrapper.component.myFoundset.set(createFoundsetWithData());
            wrapper.component.onReady = onReady;
            wrapper.fixture.detectChanges();

            cy.wrap(onReady).should('have.been.calledOnce');
        });
    });

    it('should highlight the initially selected row', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createDataGridColumns());
            wrapper.component.myFoundset.set(createFoundsetWithData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row').first().should('have.class', 'ag-row-selected');
        });
    });

    it('should render viewport rows', () => {
        const servoyApi = new ServoyApiTesting();
        cy.mount(WrapperComponent, configWrapper).then(wrapper => {
            wrapper.component.servoyApi = servoyApi;
            wrapper.component.columns.set(createDataGridColumns());
            wrapper.component.myFoundset.set(createFoundsetWithData());
            wrapper.fixture.detectChanges();

            cy.get('.ag-center-cols-container .ag-row').should('have.length', 10);
        });
    });
});
