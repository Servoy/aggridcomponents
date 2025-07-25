import { Component, HostListener, Inject, DOCUMENT } from '@angular/core';
import { EditorDirective } from './editor';
import { ICellEditorParams } from 'ag-grid-community';

import { Deferred } from '@servoy/public';

@Component({
    selector: 'aggrid-selecteditor',
    template: `
        <div class="ag-cell-edit-input">
            <select class="ag-cell-edit-input" #element></select>
        </div>
    `,
    host: {
        'style': 'width: 100%; height: 100%;'
    },
    standalone: false
})
export class SelectEditor extends EditorDirective {

    valuelistValuesDefer: Deferred<any>;

    constructor(@Inject(DOCUMENT) private doc: Document) {
        super();
    }

    @HostListener('keydown', ['$event']) onKeyDown(e: KeyboardEvent) {
        const isNavigationKey = e.keyCode === 38 || e.keyCode === 40;
        if (isNavigationKey) {
            e.stopPropagation();
        }
    }

    @HostListener('mousedown', ['$event']) onMouseDown(e: MouseEvent) {
        e.stopPropagation();
    }

    agInit(params: ICellEditorParams): void {
        super.agInit(params);

        let vl = this.ngGrid.getValuelist(params);
        if (vl) {
            this.valuelistValuesDefer = new Deferred();
            if(this.ngGrid.hasValuelistResolvedDisplayData()) {
                vl.filterList('').subscribe((valuelistValues: any) => {
                    let hasRealValues = false;
                    for (const item of valuelistValues) {
                        if (item.realValue !== item.displayValue) {
                            hasRealValues = true;
                            break;
                        }
                    }

                    // make sure initial value has the "realValue" set, so when oncolumndatachange is called
                    // the previous value has the "realValue"
                    if(hasRealValues && params.value && (params.value['realValue'] === undefined)) {
                        let rv = this.initialValue;
                        let rvFound = false;
                        for (const item of valuelistValues) {
                            if (item.displayValue === this.initialValue) {
                                rv = item.realValue;
                                rvFound = true;
                                break;
                            }
                        }
                        // it could be the valuelist does not have all the entries on the client
                        // try to get the entry using a filter call to the server
                        if(!rvFound) {
                            vl = this.ngGrid.getValuelist(params);
                            vl.filterList(params.value).subscribe((valuelistWithInitialValue: any) => {
                                for (const item of valuelistWithInitialValue) {
                                    if (item.displayValue === this.initialValue) {
                                        rv = item.realValue;
                                        break;
                                    }
                                }
                                params.node['data'][params.column.getColDef()['field']] = {realValue: rv, displayValue: this.initialValue};
                                let newValuelistValues = valuelistValues.slice();
                                newValuelistValues.push({realValue: rv, displayValue: this.initialValue});
                                this.valuelistValuesDefer.resolve({valuelist: newValuelistValues, value: this.initialValue});
                            });
                        } else {
                            params.node['data'][params.column.getColDef()['field']] = {realValue: rv, displayValue: this.initialValue};
                            this.valuelistValuesDefer.resolve({valuelist: valuelistValues, value: this.initialValue});
                        }
                    } else {
                        this.valuelistValuesDefer.resolve({valuelist: valuelistValues, value: this.initialValue});
                    }
                });
            } else {
                this.valuelistValuesDefer.resolve({valuelist: vl, value: this.initialValue});
            }
        }
    }

    createSelectOptions(valuelistValues: any[], selectedValue: any) {
        valuelistValues.forEach((value: any) => {
            const option = this.doc.createElement('option');
            option.value = value.realValue == null ? '_SERVOY_NULL' : value.realValue;
            option.text = value.displayValue;
            if (selectedValue != null && selectedValue.toString() === value.displayValue) {
                option.selected = true;
            }
            this.elementRef.nativeElement.appendChild(option);
        });
    }

    ngAfterViewInit(): void {
        if(this.valuelistValuesDefer) {
            this.valuelistValuesDefer.promise.then((r) => {
                this.createSelectOptions(r.valuelist, r.value);
                setTimeout(() => {
                    this.elementRef.nativeElement.focus();
                }, 0);
            });
        }
    }
    // returns the new value after editing
    getValue(): any {
        let displayValue = this.elementRef.nativeElement.selectedIndex > -1 ? this.elementRef.nativeElement.options[this.elementRef.nativeElement.selectedIndex].text : '';
        const realValue = this.elementRef.nativeElement.value === '_SERVOY_NULL' ? null : this.elementRef.nativeElement.value;
        return displayValue !== realValue ? { displayValue, realValue } : realValue;
    }
}
