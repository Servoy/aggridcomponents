import { AgGridAngular } from '@ag-grid-community/angular';
import { GridApi, GridOptions } from '@ag-grid-community/core';
import { ChangeDetectorRef, ContentChild, Directive, Input, TemplateRef, ViewChild } from '@angular/core';
import { BaseCustomObject, Format, FormattingService, LoggerService, ServoyBaseComponent } from '@servoy/public';

@Directive()
export abstract class NGGridDirective extends ServoyBaseComponent<HTMLDivElement> {

    @ContentChild( TemplateRef  , {static: true})
    templateRef: TemplateRef<any>;

    @ViewChild('element') agGrid: AgGridAngular;

    @Input() arrowsUpDownMoveWhenEditing: any;
    @Input() editNextCellOnEnter: boolean;
    @Input() _internalFormEditorValue: any;
    @Input() rowDropZoneFor: string[];
    @Input() onDragOverFunc: any;

    @Input() onDrop: any;
    @Input() onColumnFormEditStarted: any;

    agGridOptions: GridOptions;
    gridApi: GridApi;
    cdRef: ChangeDetectorRef;
    formattingService: FormattingService;
    selectionEvent: any;
    log: LoggerService;

    private destroyed = false;

    destroy(): any {
        this.agGrid.api.destroy();
        this.destroyed = true;
    }

    setTimeout(func: () => void, millis: number) {
        return setTimeout(() =>  {
            if (!this.destroyed) func();
        } , millis);
    }

    format(data: any, format: Format, useEditFormat: boolean): any {
        try {
            return this.formattingService.format(data, format, useEditFormat);
        } catch (e) {
            this.log.warn(e);
            return data;
        }
    }

    abstract getColumn(field: any, columnsModel?: any): any;

    abstract getColumnIndex(field: any): number;

    abstract getColumnFormat(field: any): any;

    abstract getEditingRowIndex(param: any): number;

    abstract isInFindMode(): boolean;

    abstract getValuelist(params: any): any;

    abstract getValuelistForFilter(params: any): any;

    abstract hasValuelistResolvedDisplayData(): boolean;
}

export class IconConfig extends BaseCustomObject {
}

export class ToolPanelConfig extends BaseCustomObject {
}

export class MainMenuItemsConfig extends BaseCustomObject {
}
