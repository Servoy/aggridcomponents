import { ICellEditorAngularComp } from '@ag-grid-community/angular';
import { ICellEditorParams } from '@ag-grid-community/core';
import { Directive, ElementRef, ViewChild } from '@angular/core';
import { NGGridDirective} from '../nggrid';

@Directive()
export class EditorDirective implements ICellEditorAngularComp {

    @ViewChild('element') elementRef: ElementRef;
    ngGrid: NGGridDirective;
    params: ICellEditorParams;
    initialValue: any;
    initialValueFormated: any;
    instance: any;

    constructor() {
        this.instance = this;
    }

    agInit(params: ICellEditorParams): void {
        // create the cell
        this.params = params;
        this.ngGrid = params.context.componentParent;
        this.initialValue = params.value;
        if(this.initialValue && this.initialValue.displayValue !== undefined) {
            this.initialValue = this.initialValue.displayValue;
        }
        this.initialValueFormated = this.initialValue;
        const columnFormat = this.ngGrid.getColumnFormat(params.column.getColId());
        if(columnFormat) {
            if(columnFormat.edit) {
                this.initialValueFormated = this.ngGrid.format(this.initialValueFormated, columnFormat, true);
            } else if(columnFormat.display) {
                this.initialValueFormated = this.ngGrid.format(this.initialValueFormated, columnFormat, false);
            }
        }
    }

    getValue() {
        throw new Error('Method not implemented.');
    }

    getFrameworkComponentInstance(): any {
        return this.instance;
    }
}
