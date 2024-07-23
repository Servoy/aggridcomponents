import { Component, ViewChild } from '@angular/core';
import { NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { merge, Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { FilterDirective } from './filter';
import { NULL_VALUE } from '../datagrid/datagrid';

@Component({
    selector: 'aggrid-datagrid-valuelistfilter',
    template: `
      <div><div class="{{ !isFloating ? 'ag-filter-body-wrapper' : '' }}">
        <div class="ag-filter-body">
          <div class="ag-input-wrapper">
            <input class="ag-filter-filter ag-input-field-input" type="text" id="filterText" autocomplete="off"
                [ngbTypeahead]="filterValues"
                (selectItem)="valueChanged()"
                [resultFormatter]="resultFormatter"
                [inputFormatter]="inputFormatter"
                (focus)="focus$.next('')"
                [resultTemplate]="rt"
                [popupClass]="'ag-custom-component-popup'"
                #instance="ngbTypeahead" #element>
          </div>
        </div>
        <div *ngIf="!suppressAndOrCondition()" class="ag-filter-condition"><label>OR</label></div>
        <div *ngIf="!suppressAndOrCondition()" class="ag-filter-body">
          <div class="ag-input-wrapper">
            <input class="ag-filter-filter ag-input-field-input" type="text" id="filterText1" autocomplete="off"
                [ngbTypeahead]="filterValues1"
                (selectItem)="valueChanged()"
                [resultFormatter]="resultFormatter"
                [inputFormatter]="inputFormatter"
                (focus)="focus1$.next('')"
                [resultTemplate]="rt"
                [popupClass]="'ag-custom-component-popup'"
                #instance="ngbTypeahead" #element1>
          </div>
        </div>
      </div>
      <div *ngIf="hasApplyButton()" class="ag-filter-apply-panel">
          <button type="button" id="btnClearFilter" (click)="onClearFilter()">{{ txtClearFilter }}</button>
          <button type="button" id="btnApplyFilter" (click)="onApplyFilter()">{{ txtApplyFilter }}</button>
      </div></div>
      <ng-template #rt let-r="result" let-t="term">
        <ngb-highlight [result]="getFormatedDisplayValue(r.displayValue)" [term]="t"></ngb-highlight>
      </ng-template>
    `
})
export class ValuelistFilter extends FilterDirective {

    @ViewChild('instance') instance: NgbTypeahead;
    @ViewChild('instance1') instance1: NgbTypeahead;
    focus$ = new Subject<string>();
    focus1$ = new Subject<string>();

    filterValues = (text$: Observable<string>) => this.doFilterValues(text$, this.focus$);

    filterValues1 = (text$: Observable<string>) => this.doFilterValues(text$, this.focus1$);

    doFilterValues(text$: Observable<string>, inputFocus$: any) {
      const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
      return merge(debouncedText$, inputFocus$).pipe( switchMap(term => {
          let valuelistObs: Observable<readonly any[]>;
          if(!this.valuelistValues) {
            const valuelist = this.ngGrid.getValuelistForFilter(this.params);
            if(valuelist) {
              valuelistObs = valuelist.filterList('');
              valuelistObs.subscribe(valuelistValues =>  {
                this.valuelistValues = valuelistValues;
                if(!this.hasApplyButton()) {
                  this.valuelistValues.splice(0, 0, NULL_VALUE);
                }
              });
            } else {
              valuelistObs = of([]);
            }
          } else {
            valuelistObs = of(this.valuelistValues.filter(str => {
              return str.displayValue.toLowerCase().indexOf((term as string).toLowerCase()) != -1;
            }));
          }
          return valuelistObs;
        }));
    }

    resultFormatter = (result: {displayValue: string; realValue: any}) => {
      if (result.displayValue === null || result.displayValue == '') return '\u00A0';
      return this.ngGrid.format(result.displayValue, this.format, false);
    };

    inputFormatter = (result: any) => {
      if (result === null) return '';
      if (result.displayValue !== undefined) result = result.displayValue;
      else if (this.valuelistValues.hasRealValues()) {
        // on purpose test with == so that "2" equals to 2
        // eslint-disable-next-line eqeqeq
        const value = this.valuelistValues.find((item: any) => item.realValue == result);
        if (value) {
          result = value.displayValue;
        }
      }
      return this.ngGrid.format(result, this.format, false);
    };

    getFilterUIValue(): any {
      return this.elementRef.nativeElement.value;
    }

    setFilterUIValue(value) {
      this.elementRef.nativeElement.value = value;
    }

    getSecondFilterUIValue(): any {
      return this.element1Ref.nativeElement.value;
    }
}
