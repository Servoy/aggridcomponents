import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OwlDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ServoyPublicModule, SpecTypesService } from '@servoy/public';
import { DataGrid, DataGridColumn, GroupedColumn, HashedFoundset } from './datagrid/datagrid';
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
import { AggFuncInfo, PowerGrid, PowerGridColumn } from './powergrid/powergrid';
import { BlankLoadingCellRendrer } from './datagrid/renderers/blankloadingcellrenderer';
import { FormsModule } from '@angular/forms';
import { IconConfig, MainMenuItemsConfig, ToolPanelConfig } from './nggrid';

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
        FormsModule,
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
    constructor(specTypesService: SpecTypesService) {
        specTypesService.registerType('aggrid-groupingtable.column', DataGridColumn);
        specTypesService.registerType('aggrid-groupingtable.iconConfig', IconConfig);
        specTypesService.registerType('aggrid-groupingtable.toolPanelConfig', ToolPanelConfig);
        specTypesService.registerType('aggrid-groupingtable.mainMenuItemsConfig', MainMenuItemsConfig);
        specTypesService.registerType('aggrid-groupingtable.groupedColumn', GroupedColumn);
        specTypesService.registerType('aggrid-groupingtable.hashedFoundset', HashedFoundset);
        specTypesService.registerType('aggrid-datasettable.column', PowerGridColumn);
        specTypesService.registerType('aggrid-datasettable.iconConfig', IconConfig);
        specTypesService.registerType('aggrid-datasettable.toolPanelConfig', ToolPanelConfig);
        specTypesService.registerType('aggrid-datasettable.mainMenuItemsConfig', MainMenuItemsConfig);
        specTypesService.registerType('aggrid-datasettable.aggFuncInfo', AggFuncInfo);
        // eslint-disable-next-line max-len
        LicenseManager.setLicenseKey('CompanyName=Servoy B.V.,LicensedApplication=Servoy,LicenseType=SingleApplication,LicensedConcurrentDeveloperCount=7,LicensedProductionInstancesCount=10000,AssetReference=AG-018380,ExpiryDate=11_October_2022_[v2]_MTY2NTQ0MjgwMDAwMA==a725c314c19f2c87b1f6a2f4836eec3e');
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
