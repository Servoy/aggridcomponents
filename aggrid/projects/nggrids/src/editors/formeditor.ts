import { ICellEditorParams } from 'ag-grid-community';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { EditorDirective } from './editor';

@Component({
    selector: 'aggrid-formeditor',
    template: `
      <div id="nggridformeditor" [style.width.px]="width" [style.height.px]="height">
        <ng-template [ngTemplateOutlet]="getTemplate()" [ngTemplateOutletContext]="{name:getForm()}"></ng-template>
      </div>
    `,
    standalone: false
})
export class FormEditor extends EditorDirective implements OnDestroy {

    editForm: any;
    width = 300;
    height = 200;

    constructor(private cdRef: ChangeDetectorRef) {
        super();
    }

    agInit(params: ICellEditorParams): void {
        super.agInit(params);
        this.ngGrid.__internalFormEditorValue.set(this.params.value);

        const onColumnFormEditStarted = this.ngGrid.onColumnFormEditStarted();
        if(onColumnFormEditStarted) {
            onColumnFormEditStarted(
                this.ngGrid.getEditingRowIndex(this.params), this.ngGrid.getColumnIndex(this.params.column.getColId()), this.params.value);
        }

        const column = this.ngGrid.getColumn(params.column.getColId());
        if(column.editFormSize) {
            this.width = column.editFormSize.width;
            this.height = column.editFormSize.height;
        }

        this.editForm = column.editForm;
        this.ngGrid.servoyApi.formWillShow(this.editForm).finally(() => this.cdRef.markForCheck());
    }

    ngAfterViewInit(): void {
        this.ngGrid.agGrid().api.setFocusedCell(this.params.node.rowIndex, this.params.column.getColId());
    }

    isPopup(): boolean {
        return true;
    }

    getValue(): any {
        return this.ngGrid._internalFormEditorValue();
    }

    ngOnDestroy(): void {
        const column = this.ngGrid.getColumn(this.params.column.getColId());
        this.ngGrid.servoyApi.hideForm(column.editForm);
    }

    getForm() {
        return this.editForm;
    }

    getTemplate() {
        return this.ngGrid.templateRef();
    }
}
