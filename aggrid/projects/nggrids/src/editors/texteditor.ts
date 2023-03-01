import { ICellEditorParams } from '@ag-grid-community/core';
import { Component, HostListener, Input } from '@angular/core';
import { EditorDirective } from './editor';

@Component({
    selector: 'aggrid-texteditor',
    template: `
    <div class="ag-input-wrapper">
      <input class="ag-cell-edit-input" [value]="initialDisplayValue" [svyDecimalKeyConverter]="format" [maxLength]="maxLength" #element>
    </div>
    `
})
export class TextEditor extends EditorDirective {

    @Input() initialDisplayValue: any;
    @Input() format: any;
    @Input() maxLength = 524288;

    @HostListener('keydown',['$event']) onKeyDown(e: KeyboardEvent) {
        if((this.ngGrid.arrowsUpDownMoveWhenEditing && this.ngGrid.arrowsUpDownMoveWhenEditing !== 'NONE') || this.ngGrid.editNextCellOnEnter) {
            const isNavigationLeftRightKey = e.keyCode === 37 || e.keyCode === 39;
            const isNavigationUpDownEntertKey = e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13;

            if (isNavigationLeftRightKey || isNavigationUpDownEntertKey) {

                if(isNavigationUpDownEntertKey) {

                    if(this.ngGrid.editNextCellOnEnter && e.keyCode === 13) {
                        this.ngGrid.agGrid.api.tabToNextCell();
                    } else if (this.ngGrid.arrowsUpDownMoveWhenEditing && this.ngGrid.arrowsUpDownMoveWhenEditing !== 'NONE') {
                        let newEditingNode = null;
                        const columnToCheck = this.params.column;
                        const mustBeEditable = this.ngGrid.arrowsUpDownMoveWhenEditing === 'NEXTEDITABLECELL';
                        if( e.keyCode === 38) { // UP
                            if(this.params.rowIndex > 0) {
                                this.ngGrid.agGrid.api.forEachNode( (node) => {
                                    if (node.rowIndex <= (this.params.rowIndex - 1) &&
                                        (!mustBeEditable || columnToCheck.isCellEditable(node))) {
                                        newEditingNode = node;
                                    }
                                });
                            }
                        } else if (e.keyCode === 13 || e.keyCode === 40) { // ENTER/DOWN
                            if( this.params.rowIndex < this.ngGrid.agGrid.api.getModel().getRowCount() - 1) {
                                this.ngGrid.agGrid.api.forEachNode( (node) => {
                                    if (node.rowIndex >= (this.params.rowIndex + 1) &&
                                        !newEditingNode && (!mustBeEditable || columnToCheck.isCellEditable(node))) {
                                        newEditingNode = node;
                                    }
                                });
                            }
                        }
                        this.ngGrid.agGrid.api.stopEditing();
                        if (newEditingNode) {
                            this.ngGrid.selectionEvent = { type: 'key', event: e };
                            newEditingNode.setSelected(true, true);
    
                            this.ngGrid.agGrid.api.setFocusedCell(newEditingNode.rowIndex, columnToCheck.getColId());
                            if(columnToCheck.isCellEditable(newEditingNode)) {
                                this.ngGrid.agGrid.api.startEditingCell({
                                    rowIndex: newEditingNode.rowIndex,
                                    colKey: columnToCheck.getColId()
                                });
                            }
                        }
                    }
                    e.preventDefault();
                }
                e.stopPropagation();
            }
        }
    }

    @HostListener('keypress',['$event']) onKeyPress(e: KeyboardEvent) {
        const isNavigationLeftRightKey = e.keyCode === 37 || e.keyCode === 39;
        const isNavigationUpDownEntertKey = e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13;

        if(!(isNavigationLeftRightKey || isNavigationUpDownEntertKey) && this.format) {
            return this.ngGrid.formattingService.testForNumbersOnly(e, null, this.elementRef.nativeElement, false, true, this.format, false);
        } else return true;
    }

    agInit(params: ICellEditorParams): void {
        super.agInit(params);

        if(this.initialValue && this.initialValue.displayValue !== undefined) {
            this.initialValue = this.initialValue.displayValue;
        }
        let v = this.initialValue;
        this.format = this.ngGrid.getColumnFormat(params.column.getColId());
        if(this.format) {
            if (this.format.maxLength) {
                this.maxLength = this.format.maxLength;
            }
            if(this.format.edit) {
                v = this.ngGrid.format(v, this.format, true);
            } else if(this.format.display) {
                v = this.ngGrid.format(v, this.format, false);
            }
        }
        this.initialDisplayValue = v;
    }

    // focus and select can be done after the gui is attached
    ngAfterViewInit(): void {
        setTimeout(() => {
            this.elementRef.nativeElement.select();

            if(this.format) {
                const editFormat = this.format.edit ? this.format.edit : this.format.display;
                if(editFormat && this.format.isMask) {
                    const settings = {};
                    settings['placeholder'] = this.format.placeHolder ? this.format.placeHolder : ' ';
                    if (this.format.allowedCharacters)
                        settings['allowedCharacters'] = this.format.allowedCharacters;

                    //TODO: jquery mask
                    //$(this.eInput).mask(editFormat, settings);
                }
            }
        }, 0);
    }

    // returns the new value after editing
    getValue(): any {
        let displayValue = this.elementRef.nativeElement.value;

        if(this.format) {
            const editFormat = this.format.edit ? this.format.edit : this.format.display;
            if(editFormat) {
                displayValue = this.ngGrid.formattingService.unformat(displayValue, editFormat, this.format.type, this.initialValue);
            }
            if (this.format.type === 'TEXT' && (this.format.uppercase || this.format.lowercase)) {
                if (this.format.uppercase) displayValue = displayValue.toUpperCase();
                else if (this.format.lowercase) displayValue = displayValue.toLowerCase();
            }
        }
        return displayValue;
    }
}
