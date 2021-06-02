import { AgGridAngular } from '@ag-grid-community/angular';
import { ContentChild, Directive, Input, TemplateRef, ViewChild } from '@angular/core';
import { FormattingService, ServoyBaseComponent } from '@servoy/public';

@Directive()
export abstract class NGGridDirective extends ServoyBaseComponent<HTMLDivElement> {

    @ContentChild( TemplateRef  , {static: true})
    templateRef: TemplateRef<any>;

    @ViewChild('element') agGrid: AgGridAngular;

    @Input() arrowsUpDownMoveWhenEditing: any;
    @Input() _internalFormEditorValue: any;

    @Input() onColumnFormEditStarted: any;

    formattingService: FormattingService;
    selectionEvent: any;

    getValuelist(params: any): any {
        return null;
    }

    abstract getColumn(field: any, columnsModel?: any): any;

    abstract getColumnIndex(field: any): number;

    abstract getEditingRowIndex(param: any): number;
}
