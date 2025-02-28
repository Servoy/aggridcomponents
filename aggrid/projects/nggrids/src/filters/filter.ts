import { AgFloatingFilterComponent } from 'ag-grid-angular';
import { FilterChangedEvent, IFilterParams, IFloatingFilterParams, IFloatingFilterParent } from 'ag-grid-community';
import { Directive, ElementRef, HostBinding, ViewChild } from '@angular/core';
import { NULL_VALUE } from '../datagrid/datagrid';
import { Deferred } from '@servoy/public';
import { NGGridDirective } from '../nggrid';

@Directive()
export class FilterDirective implements AgFloatingFilterComponent, IFloatingFilterParent {

    @HostBinding('class.ag-floating-filter-input') isFloating = true;
    
    @ViewChild('element') elementRef: ElementRef;
    @ViewChild('element1') element1Ref: ElementRef;
    ngGrid: NGGridDirective;
    params: IFilterParams;
    floatingParams: IFloatingFilterParams;
    model: any;
    instance: any;
    valuelistValues: any;
    hasValuelistSet: boolean = false;
    format: any;
    txtClearFilter: string;
    txtApplyFilter: string;
    isRealValueUUID: boolean = false;

    valuelistValuesDefer: Deferred<any>;

    constructor() {
        this.instance = this;
    }

    agInit(params: any): void {
        this.isFloating = params.filterParams !== undefined;
        if(this.isFloating) {
          this.params = params.filterParams;
          this.floatingParams = params;
        } else {
          this.params = params;
        }
        this.ngGrid = this.params.context.componentParent;

        this.txtClearFilter = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['clearFilter'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['clearFilter'] : 'Clear Filter';
        this.txtApplyFilter = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['applyFilter'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['applyFilter'] : 'Apply Filter';

        this.valuelistValuesDefer = new Deferred();
        const valuelist = this.ngGrid.getValuelistForFilter(this.params);
        if (valuelist) {
          this.hasValuelistSet = true;
          valuelist.filterList('').subscribe((valuelistValues) => {
            if(valuelistValues.isRealValueUUID) {
              this.isRealValueUUID = valuelistValues.isRealValueUUID();
            }
            this.valuelistValues = valuelistValues;
            if(!this.hasApplyButton()) {
              this.valuelistValues.splice(0, 0, NULL_VALUE);
            }
            this.ngGrid.cdRef.detectChanges();
            this.valuelistValuesDefer.resolve(this.valuelistValues);
          });
        } else {
          this.valuelistValuesDefer.resolve(null);
        }
        this.format = this.ngGrid.getColumnFormat(params.column.getColId());
    }

    onClearFilter() {
        this.elementRef.nativeElement.value = '';
        if(!this.suppressAndOrCondition()) {
          this.element1Ref.nativeElement.value = '';
        }
        this.model = '';
    }

    onApplyFilter() {
      if(this.isFloating) {
        this.floatingParams.parentFilterInstance((instance: FilterDirective) => {
          instance.valuelistValuesDefer.promise.then(() => {
            instance.onFloatingFilterChanged('equals', this.getFilterUIValue());
          });
        });
      } else {
        this.doFilter();
      }
    }

    doFilter() {
        let filterRealValue = this.getFilterRealValue();
        if(filterRealValue === '' || filterRealValue === null) {
            this.model = null;
        } else {
            this.model = {
            filterType: this.isRealValueUUID ? 'uuid' : isNaN(filterRealValue) ? 'text' : 'number',
            type: 'equals',
            filter: filterRealValue,
            uiValue: this.getFilterUIValue(),
            };
        }

        if(!this.suppressAndOrCondition()) {
          let condition2 = null;
          filterRealValue = this.getFilterRealValue(true);
          if(filterRealValue === '' || filterRealValue === null) {
            condition2 = null;
          } else {
            condition2 = {
              filterType: this.isRealValueUUID ? 'uuid' : isNaN(filterRealValue) ? 'text' : 'number',
              type: 'equals',
              filter: filterRealValue
            };
          }

          if(this.model && condition2) {
            this.model = {
              operator: 'OR',
              conditions: [this.model, condition2]
            };
          } else if(condition2) {
            this.model = condition2;
          }
        }

        this.params.filterChangedCallback();
    }

    onParentModelChanged(parentModel: any, event: FilterChangedEvent) {
      this.setFilterUIValue(parentModel ? parentModel.uiValue : '');
    }

    onFloatingFilterChanged(type: string | null, value: any) {
      this.setFilterUIValue(value);
      this.doFilter();
    }

    getFilterUIValue(): any {
        return null;
    }

    setFilterUIValue(value) {
    }

    getSecondFilterUIValue(): any {
      return null;
    }

    getFormatedDisplayValue(displayValue: string): string {
      if (displayValue === null || displayValue == '') return '\u00A0';
      if(this.hasValuelistSet && this.format && displayValue) {
        return this.ngGrid.format(displayValue, this.format, false);
      }
      return displayValue;
    }

    getFilterRealValue(second?: boolean): any {
        let realValue = '';
        const displayValue = second ? this.getSecondFilterUIValue() : this.getFilterUIValue();
        if(this.valuelistValues) {
          for (const vvalue of this.valuelistValues) {
            let compareValue = this.getFormatedDisplayValue(vvalue.displayValue);
            // compare trimmed values, typeahead will trim the selected value
            if (displayValue != null && (displayValue.trim() === compareValue.trim())) {
              realValue = vvalue.realValue;
              break;
            }
          }
        }
        return realValue;
    }

    isFilterActive(): boolean {
        return this.model != null;
    }

    doesFilterPass(params: any): boolean {
      if(this.model && !this.ngGrid.hasValuelistResolvedDisplayData()) {
        return this.model.filter == params.data[this.params.colDef.field];
      } 
      return true;
    }

    getModel() {
        return this.model;
    }

    setModel(model: any): void {
        this.model = model;
    }

    getFrameworkComponentInstance() {
        return this.instance;
    }

    hasApplyButton(): boolean {
      return !this.isFloating && this.params['buttons'] instanceof Array && this.params['buttons'].indexOf('apply') !== -1;
    }

    valueChanged() {
      if(!this.hasApplyButton()) {
        this.ngGrid.setTimeout(() => {
          this.onApplyFilter();
        }, 0);
      }
    }

    suppressAndOrCondition(): boolean {
      return this.params['suppressAndOrCondition'] === true;
    }
}
