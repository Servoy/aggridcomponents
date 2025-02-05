import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ServoyPublicModule, SpecTypesService } from '@servoy/public';
import { DataGrid, DataGridColumn, GroupedColumn, HashedFoundset } from './datagrid/datagrid';
import { DatePicker } from './editors/datepicker';
import { FormEditor } from './editors/formeditor';
import { SelectEditor } from './editors/selecteditor';
import { TextEditor } from './editors/texteditor';
import { TypeaheadEditor } from './editors/typeaheadeditor';
import { AgGridModule } from '@ag-grid-community/angular';
import { ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ServerSideRowModelModule } from '@ag-grid-enterprise/server-side-row-model';
import { ColumnsToolPanelModule } from '@ag-grid-enterprise/column-tool-panel';
import { FiltersToolPanelModule } from '@ag-grid-enterprise/filter-tool-panel';
import { RangeSelectionModule } from '@ag-grid-enterprise/range-selection';
import { ExcelExportModule } from '@ag-grid-enterprise/excel-export';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { SideBarModule } from '@ag-grid-enterprise/side-bar';
import { RowGroupingModule } from '@ag-grid-enterprise/row-grouping';
import { ClipboardModule } from '@ag-grid-enterprise/clipboard';
import { ValuelistFilter } from './filters/valuelistfilter';
import { RadioFilter } from './filters/radiofilter';
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
        NgbModule,
        AgGridModule
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
        ModuleRegistry.registerModules([
            ServerSideRowModelModule,
            RangeSelectionModule,
            RowGroupingModule,
            SideBarModule,
            ColumnsToolPanelModule,
            MenuModule,
            FiltersToolPanelModule,
            ClientSideRowModelModule,
            ExcelExportModule,
            ClipboardModule]);
    }
}
