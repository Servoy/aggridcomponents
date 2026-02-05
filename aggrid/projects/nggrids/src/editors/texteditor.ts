import { ICellEditorParams } from 'ag-grid-community';
import { Component, HostListener, input, signal } from '@angular/core';
import { EditorDirective } from './editor';

@Component({
    selector: 'aggrid-texteditor',
    template: `
    <div class="ag-input-wrapper">
      <input class="ag-cell-edit-input" [type]="_inputType()" [value]="_initialDisplayValue()" [svyDecimalKeyConverter]="!ngGrid.isInFindMode() ? _format() : null" [maxLength]="_maxLength()" #element>
    </div>
    `,
    host: {
        'style': 'width: 100%; height: 100%;'
    },
    standalone: false
})
export class TextEditor extends EditorDirective {

    readonly initialDisplayValue = input<any>(undefined);
    readonly format = input<any>(undefined);
    readonly maxLength = input(524288);
    readonly inputType = input<any>(undefined);
    
    _inputType = signal<any>(undefined);
    _format = signal<any>(undefined);
    _maxLength = signal(524288);
    _initialDisplayValue = signal<any>(undefined);

    @HostListener('keydown',['$event']) onKeyDown(e: KeyboardEvent) {
        const arrowsUpDownMoveWhenEditing = this.ngGrid.arrowsUpDownMoveWhenEditing();
        const editNextCellOnEnter = this.ngGrid.editNextCellOnEnter();
        if((arrowsUpDownMoveWhenEditing && arrowsUpDownMoveWhenEditing !== 'NONE') || editNextCellOnEnter) {
            const isNavigationLeftRightKey = e.keyCode === 37 || e.keyCode === 39;
            const isNavigationUpDownEntertKey = e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13;

            if (isNavigationLeftRightKey || isNavigationUpDownEntertKey) {

                if(isNavigationUpDownEntertKey) {

                    if(editNextCellOnEnter && e.keyCode === 13) {
                        this.ngGrid.agGrid().api.tabToNextCell();
                    } else if (arrowsUpDownMoveWhenEditing && arrowsUpDownMoveWhenEditing !== 'NONE') {
                        let newEditingNode = null;
                        const columnToCheck = this.params.column;
                        const mustBeEditable = arrowsUpDownMoveWhenEditing === 'NEXTEDITABLECELL';
                        if( e.keyCode === 38) { // UP
                            if(this.params.rowIndex > 0) {
                                this.ngGrid.agGrid().api.forEachNode( (node) => {
                                    if (node.rowIndex <= (this.params.rowIndex - 1) &&
                                        (!mustBeEditable || columnToCheck.isCellEditable(node))) {
                                        newEditingNode = node;
                                    }
                                });
                            }
                        } else if (e.keyCode === 13 || e.keyCode === 40) { // ENTER/DOWN
                            if( this.params.rowIndex < this.ngGrid.agGrid().api.getDisplayedRowCount() - 1) {
                                this.ngGrid.agGrid().api.forEachNode( (node) => {
                                    if (node.rowIndex >= (this.params.rowIndex + 1) &&
                                        !newEditingNode && (!mustBeEditable || columnToCheck.isCellEditable(node))) {
                                        newEditingNode = node;
                                    }
                                });
                            }
                        }
                        this.ngGrid.agGrid().api.stopEditing();
                        if (newEditingNode) {
                            this.ngGrid.selectionEvent = { type: 'key', event: e };
                            newEditingNode.setSelected(true, true);
    
                            this.ngGrid.agGrid().api.setFocusedCell(newEditingNode.rowIndex, columnToCheck.getColId());
                            if(columnToCheck.isCellEditable(newEditingNode)) {
                                this.ngGrid.agGrid().api.startEditingCell({
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

        if(!(isNavigationLeftRightKey || isNavigationUpDownEntertKey) && !this.ngGrid.isInFindMode()) {
            return this.ngGrid.formattingService.testForNumbersOnly(e, null, this.elementRef().nativeElement, false, true, this._format(), false);
        } else return true;
    }

    agInit(params: ICellEditorParams): void {
        super.agInit(params);
        this._inputType.set(this.inputType());
        this._maxLength.set(this.maxLength());
        this._initialDisplayValue.set(this.initialDisplayValue());
        this._format.set(this.format());
		const column = this.ngGrid.getColumn(params.column.getColId());
		if (column && column.editTypeTextFieldInput) {
			this._inputType.set(column.editTypeTextFieldInput);
		}
        if(params.colDef['cellDataType'] === 'number') this._inputType.set('number'); // for backward compatibility

        if(this.initialValue && this.initialValue.displayValue !== undefined) {
            this.initialValue = this.initialValue.displayValue;
        }
        let v = this.initialValue;
        this._format.set(this.ngGrid.getColumnFormat(params.column.getColId()));
        const format = this._format();
        if(format && !this.ngGrid.isInFindMode()) {
            if (format.maxLength) {
                this._maxLength.set(format.maxLength);
            }
            if(format.edit) {
                v = this.ngGrid.format(v, format, true);
            } else if(format.display) {
                v = this.ngGrid.format(v, format, false);
            }
        }
        this._initialDisplayValue.set(v);
    }

    // focus and select can be done after the gui is attached
    ngAfterViewInit(): void {
        setTimeout(() => {
            if(this._inputType() === 'color') {
                this.elementRef().nativeElement.click();
            } else {
                this.elementRef().nativeElement.select();
                const format = this._format();
                if(format && !this.ngGrid.isInFindMode()) {
                    const editFormat = format.edit ? format.edit : format.display;
                    if(editFormat && format.isMask) {
                        const settings = {};
                        settings['placeholder'] = format.placeHolder ? format.placeHolder : ' ';
                        if (format.allowedCharacters)
                            settings['allowedCharacters'] = format.allowedCharacters;

                        //TODO: jquery mask
                        //$(this.eInput).mask(editFormat, settings);
                    }
                }
            }

        }, 0);
    }

    // returns the new value after editing
    getValue(): any {
        let displayValue = this.elementRef().nativeElement.value;

        const format = this._format();
        if(format && !this.ngGrid.isInFindMode()) {
            const editFormat = format.edit ? format.edit : format.display;
            if(editFormat) {
                displayValue = this.ngGrid.formattingService.unformat(displayValue, editFormat, format.type, this.initialValue);
            }
            if (format.type === 'TEXT' && (format.uppercase || format.lowercase)) {
                if (format.uppercase) displayValue = displayValue.toUpperCase();
                else if (format.lowercase) displayValue = displayValue.toLowerCase();
            }
        }
        return displayValue;
    }
}
