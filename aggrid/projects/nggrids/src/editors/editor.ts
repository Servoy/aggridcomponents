import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';
import { Directive, ElementRef, ViewChild } from '@angular/core';
import { NGGridDirective} from '../nggrid';

@Directive()
export class EditorDirective implements ICellEditorAngularComp {

    @ViewChild('element') elementRef: ElementRef;
    ngGrid: NGGridDirective;
    params: ICellEditorParams;
    initialValue: any;
    instance: any;

    constructor() {
        this.instance = this;
    }

    agInit(params: ICellEditorParams): void {
        // create the cell
        this.params = params;
        this.ngGrid = params.context.componentParent;
        this.initialValue = params.value;
    }

    getValue() {
        throw new Error('Method not implemented.');
    }

    getFrameworkComponentInstance(): any {
        return this.instance;
    }
}
