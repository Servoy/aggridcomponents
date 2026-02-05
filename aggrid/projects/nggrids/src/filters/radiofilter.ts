import { Component } from '@angular/core';
import { FilterDirective } from './filter';

@Component({
    selector: 'aggrid-datagrid-radiofilter',
    template: `
      <div class="{{ !isFloating ? 'ag-filter-body-wrapper ag-simple-filter-body-wrapper' : '' }}">
        @if (!useCheckboxForFloatingFilter()) {
          <div class="ag-filter-body" #element>
            @for (item of valuelistValues; track item) {
              <label class="ag-radio-filter" id="filterRadio">
                <input type="radio" name="{{ getName() }}" [value]="getFormatedDisplayValue(item.displayValue)" (change)="valueChanged()"/>
                <span>{{ getFormatedDisplayValue(item.displayValue) }}</span>
              </label>
            }
          </div>
        }
        @if (useCheckboxForFloatingFilter()) {
          <div class="ag-filter-body">
            <input type="checkbox" style="width: 100%; height: 100%;" (click)="onCheckboxClick()" #element/>
          </div>
        }
        @if (!suppressAndOrCondition()) {
          <div class="ag-filter-condition"><label>OR</label></div>
        }
        @if (!suppressAndOrCondition()) {
          <div class="ag-filter-body" #element1>
            @for (item of valuelistValues; track item) {
              <label class="ag-radio-filter" id="filterRadio1">
                <input type="radio" name="{{ getName('1') }}" [value]="getFormatedDisplayValue(item.displayValue)" (change)="valueChanged()"/>
                <span>{{ getFormatedDisplayValue(item.displayValue) }}</span>
              </label>
            }
          </div>
        }
      </div>
      @if (hasApplyButton()) {
        <div class="ag-filter-apply-panel">
          <button type="button" id="btnApplyFilter" class="ag-button ag-standard-button ag-filter-apply-panel-button" (click)="onApplyFilter()">{{ txtApplyFilter }}</button>
          <button type="button" id="btnClearFilter" class="ag-button ag-standard-button ag-filter-apply-panel-button" (click)="onClearFilter()">{{ txtClearFilter }}</button>
        </div>
      }
      `,
    standalone: false
})
export class RadioFilter extends FilterDirective {

    checkboxStateValues: string[] = ['No', 'Yes', ''];
    checkboxState: string = '';  // Toggle between 'No' - unchecked, 'Yes' - checked, and '' - indeterminate

    constructor() {
      super();
      this.valuelistValues = [{displayValue: 'Yes', realValue: 1}, {displayValue: 'No', realValue: 0}];
    }

    ngAfterViewInit() {
      if(this.useCheckboxForFloatingFilter()) {
        this.updateCheckboxUI(); 
      }
    }

    onClearFilter() {
      if(this.useCheckboxForFloatingFilter()) {
        this.checkboxState = '';
        this.updateCheckboxUI();
      } else {
        for(const nativeRadio of this.elementRef().nativeElement.children) {
          nativeRadio.children[0].checked = false;
        }
        if(!this.suppressAndOrCondition()) {
          for(const nativeRadio of this.element1Ref().nativeElement.children) {
            nativeRadio.children[0].checked = false;
          }
        }
      }
      this.model = '';
    }

    getFilterUIValue(): any {
      let filterUIValue = null;
      if(this.useCheckboxForFloatingFilter()) {
        filterUIValue = this.checkboxState;
      } else {
        for(const nativeRadio of this.elementRef().nativeElement.children) {
          if(nativeRadio.children[0].checked) {
            filterUIValue = nativeRadio.children[0].value;
            break;
          }
        }
      }

      return filterUIValue;
    }

    setFilterUIValue(value) {
      if(this.useCheckboxForFloatingFilter()) {
        this.checkboxState = value;
        this.updateCheckboxUI();
      } else {
        for(const nativeRadio of this.elementRef().nativeElement.children) {
          nativeRadio.children[0].checked = nativeRadio.children[0].value === value;
        }
      }
    }

    getSecondFilterUIValue(): any {
      let filterUIValue = null;
      for(const nativeRadio of this.element1Ref().nativeElement.children) {
        if(nativeRadio.children[0].checked) {
          filterUIValue = nativeRadio.children[0].value;
          break;
        }
      }
      return filterUIValue;
    }

    getName(suffix?: string): string {
      return 'radioFilterInput_' + this.params.column.getColId() + (suffix ? suffix : '');
    }

    useCheckboxForFloatingFilter(): boolean {
      return this.isFloating && this.params.colDef.context && this.params.colDef.context['floatingFilterRadioAsCheckbox'] === true;
    }

    onCheckboxClick() {
      this.checkboxStateValues.indexOf(this.checkboxState);
      this.checkboxState = this.checkboxStateValues[(this.checkboxStateValues.indexOf(this.checkboxState) + 1) % this.checkboxStateValues.length];
      this.updateCheckboxUI();
      this.valueChanged();
    }

    updateCheckboxUI() {
        const elementRef = this.elementRef();
      if (this.checkboxState === this.checkboxStateValues[0]) {
        elementRef.nativeElement.indeterminate = false;
        elementRef.nativeElement.checked = false;
      } else if (this.checkboxState === this.checkboxStateValues[1]) {
        elementRef.nativeElement.indeterminate = false;
        elementRef.nativeElement.checked = true;
      } else {
        elementRef.nativeElement.indeterminate = true;
      }
    }
}
