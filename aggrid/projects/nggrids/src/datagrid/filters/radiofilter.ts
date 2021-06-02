import { Component } from '@angular/core';
import { DatagridFilterDirective } from './datagridfilter';

@Component({
    selector: 'aggrid-datagrid-radiofilter',
    template: `
      <div><div class="ag-filter-body-wrapper"><div class="ag-filter-body" #element>
        <label class="ag-radio-filter" id="filterRadio" *ngFor="let item of valuelistValues">
            <input type="radio" name="radioFilterInput" [value]="item.displayValue"/>
            <span>{{ item.displayValue }}</span>
        </label>
        </div></div>
        <div class="ag-filter-apply-panel">
          <button type="button" id="btnClearFilter" (click)="onClearFilter()">{{ txtClearFilter }}</button>
          <button type="button" id="btnApplyFilter" (click)="onApplyFilter()">{{ txtApplyFilter }}</button>
        </div>
      </div>
    `
})
export class RadioFilter extends DatagridFilterDirective {

    onClearFilter() {
      for(const nativeRadio of this.elementRef.nativeElement.children) {
        nativeRadio.children[0].checked = false;
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
}
