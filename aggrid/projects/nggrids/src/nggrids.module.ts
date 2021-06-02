import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OwlDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ServoyPublicModule } from '@servoy/public';
import { DataGrid } from './datagrid/datagrid';
import { DatePicker } from './editors/datepicker';
import { FormEditor } from './editors/formeditor';
import { SelectEditor } from './editors/selecteditor';
import { TextEditor } from './editors/texteditor';
import { TypeaheadEditor } from './editors/typeaheadeditor';
import { AgGridModule } from '@ag-grid-community/angular';
import { LicenseManager } from '@ag-grid-enterprise/core';
import { ClientSideRowModelModule,
    ColumnsToolPanelModule, FiltersToolPanelModule, MenuModule, ModuleRegistry, RowGroupingModule, ServerSideRowModelModule, SideBarModule } from '@ag-grid-enterprise/all-modules';
import { ValuelistFilter } from './datagrid/filters/valuelistfilter';
import { RadioFilter } from './datagrid/filters/radiofilter';
import { PowerGrid } from './powergrid/powergrid';
import { BlankLoadingCellRendrer } from './datagrid/renderers/blankloadingcellrenderer';

@NgModule({
    declarations: [
        DataGrid,
        TextEditor,
        DatePicker,
        FormEditor,
        SelectEditor,
        TypeaheadEditor,
        ValuelistFilter,
        RadioFilter,
        BlankLoadingCellRendrer,
        PowerGrid
    ],
    imports: [
        CommonModule,
        ServoyPublicModule,
        OwlDateTimeModule,
        NgbModule,
        AgGridModule.withComponents([])
    ],
    exports: [
        DataGrid,
        PowerGrid
    ]
})
export class NGGridsModule {
    constructor() {
        // eslint-disable-next-line max-len
        LicenseManager.setLicenseKey('CompanyName=Servoy B.V.,LicensedApplication=Servoy,LicenseType=SingleApplication,LicensedConcurrentDeveloperCount=7,LicensedProductionInstancesCount=200,AssetReference=AG-010463,ExpiryDate=11_October_2021_[v2]_MTYzMzkwNjgwMDAwMA==4c6752fe4cb2066ab1f0e9c572bc7491');
        ModuleRegistry.registerModules([
            ServerSideRowModelModule,
            RowGroupingModule,
            SideBarModule,
            ColumnsToolPanelModule,
            MenuModule,
            FiltersToolPanelModule,
            ClientSideRowModelModule]);
    }
}
