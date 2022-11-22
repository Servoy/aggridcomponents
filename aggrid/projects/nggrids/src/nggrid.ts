import { AgGridAngular } from '@ag-grid-community/angular';
import { ContentChild, Directive, Input, TemplateRef, ViewChild } from '@angular/core';
import { BaseCustomObject, FormattingService, ServoyBaseComponent } from '@servoy/public';

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

    formattingService: FormattingService;
    selectionEvent: any;

    private destroyed = false;

    getValuelist(params: any): any {
        return null;
    }

    destroy(): any {
        this.agGrid.api.destroy();
        this.destroyed = true;
    }

    setTimeout(func: () => void, millis: number) {
        return setTimeout(() =>  {
            if (!this.destroyed) func();
        } , millis);
    }

    abstract getColumn(field: any, columnsModel?: any): any;

    abstract getColumnIndex(field: any): number;

    abstract getColumnFormat(field: any): any;

    abstract getEditingRowIndex(param: any): number;
}

export class IconConfig extends BaseCustomObject {
}

export class ToolPanelConfig extends BaseCustomObject {
}

export class MainMenuItemsConfig extends BaseCustomObject {
}
