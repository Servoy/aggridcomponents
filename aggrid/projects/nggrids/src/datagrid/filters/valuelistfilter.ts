import { Component, ViewChild } from '@angular/core';
import { NgbTypeahead, NgbTypeaheadConfig } from '@ng-bootstrap/ng-bootstrap';
import { merge, Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { FormattingService } from '@servoy/public';
import { DatagridFilterDirective } from './datagridfilter';

@Component({
    selector: 'aggrid-datagrid-valuelistfilter',
    template: `
      <div><div class="ag-filter-body-wrapper"><div class="ag-filter-body">
        <div class="ag-input-wrapper">
            <input class="ag-filter-filter" type="text" id="filterText" autocomplete="off"
                [ngbTypeahead]="filterValues"
                [resultFormatter]="resultFormatter"
                [inputFormatter]="inputFormatter"
                [resultTemplate]="rt"
                #instance="ngbTypeahead" #element>
        </div></div></div>
        <div class="ag-filter-apply-panel">
          <button type="button" id="btnClearFilter" (click)="onClearFilter()">{{ txtClearFilter }}</button>
          <button type="button" id="btnApplyFilter" (click)="onApplyFilter()">{{ txtApplyFilter }}</button>
        </div>
      </div>
      <ng-template #rt let-r="result" let-t="term">
        <div class="ag-custom-component-popup"><ngb-highlight [result]="r.displayValue" [term]="t"></ngb-highlight></div>
      </ng-template>
    `
})
export class ValuelistFilter extends DatagridFilterDirective {

    @ViewChild('instance') instance: NgbTypeahead;
    focus$ = new Subject<string>();
    click$ = new Subject<string>();

    constructor(private formatService: FormattingService, config: NgbTypeaheadConfig) {
      super();
      config.container = 'body';
    }

    filterValues = (text$: Observable<string>) => {
        const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
        const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
        const inputFocus$ = this.focus$;
        return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe( switchMap(term => (term === '' ? of(this.valuelist)
        : this.valuelist.filterList(term)))) as Observable<readonly any[]>;
    };

    resultFormatter = (result: {displayValue: string; realValue: any}) => {
      if (result.displayValue === null) return '';
      return this.formatService.format(result.displayValue, this.format, false);
    };

    inputFormatter = (result: any) => {
      if (result === null) return '';
      if (result.displayValue !== undefined) result = result.displayValue;
      else if (this.valuelist.hasRealValues()) {
        // on purpose test with == so that "2" equals to 2
        // eslint-disable-next-line eqeqeq
        const value = this.valuelist.find((item: any) => item.realValue == result);
        if (value) {
          result = value.displayValue;
        }
      }
      return this.formatService.format(result, this.format, false);
    };

    getFilterUIValue(): any {
      return this.elementRef.nativeElement.value;
  }
}
