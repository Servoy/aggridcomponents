import { Component } from '@angular/core';
import { FilterDirective } from './filter';

@Component({
    selector: 'aggrid-datagrid-radiofilter',
    template: `
      <div><div class="ag-filter-body-wrapper">
        <div class="ag-filter-body" #element>
          <label class="ag-radio-filter" id="filterRadio" *ngFor="let item of valuelistValues">
            <input type="radio" name="radioFilterInput" [value]="getFormatedDisplayValue(item.displayValue)" (change)="valueChanged()"/>
            <span>{{ getFormatedDisplayValue(item.displayValue) }}</span>
          </label>
        </div>
        <div *ngIf="!suppressAndOrCondition()" class="ag-filter-condition"><label>OR</label></div>
        <div *ngIf="!suppressAndOrCondition()" class="ag-filter-body" #element1>
          <label class="ag-radio-filter" id="filterRadio1" *ngFor="let item of valuelistValues">
            <input type="radio" name="radioFilterInput1" [value]="getFormatedDisplayValue(item.displayValue)" (change)="valueChanged()"/>
            <span>{{ getFormatedDisplayValue(item.displayValue) }}</span>
          </label>
        </div>
      </div>
      <div *ngIf="hasApplyButton()" class="ag-filter-apply-panel">
          <button type="button" id="btnClearFilter" (click)="onClearFilter()">{{ txtClearFilter }}</button>
          <button type="button" id="btnApplyFilter" (click)="onApplyFilter()">{{ txtApplyFilter }}</button>
      </div></div>
    `
})
export class RadioFilter extends FilterDirective {

    constructor() {
      super();
      this.valuelistValues = [{displayValue: 'Yes', realValue: 1}, {displayValue: 'No', realValue: 0}];
    }

    onClearFilter() {
      for(const nativeRadio of this.elementRef.nativeElement.children) {
        nativeRadio.children[0].checked = false;
      }
      if(!this.suppressAndOrCondition()) {
        for(const nativeRadio of this.element1Ref.nativeElement.children) {
          nativeRadio.children[0].checked = false;
        }
      }
      this.model = '';
    }

    getFilterUIValue(): any {
      let filterUIValue = null;
      for(const nativeRadio of this.elementRef.nativeElement.children) {
        if(nativeRadio.children[0].checked) {
          filterUIValue = nativeRadio.children[0].value;
          break;
        }
      }
      return filterUIValue;
    }

    setFilterUIValue(value) {
      for(const nativeRadio of this.elementRef.nativeElement.children) {
        if(nativeRadio.children[0].value === value) {
          nativeRadio.children[0].checked = true;
          break;
        }
      }
    }

    getSecondFilterUIValue(): any {
      let filterUIValue = null;
      for(const nativeRadio of this.element1Ref.nativeElement.children) {
        if(nativeRadio.children[0].checked) {
          filterUIValue = nativeRadio.children[0].value;
          break;
        }
      }
      return filterUIValue;
    }
}
