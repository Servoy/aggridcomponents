import { AgFloatingFilterComponent } from '@ag-grid-community/angular';
import { FilterChangedEvent, IFilterParams, IFloatingFilterParams, IFloatingFilterParent } from '@ag-grid-community/core';
import { Directive, ElementRef, ViewChild } from '@angular/core';
import { DataGrid, NULL_VALUE } from '../datagrid';

@Directive()
export class DatagridFilterDirective implements AgFloatingFilterComponent, IFloatingFilterParent {

    @ViewChild('element') elementRef: ElementRef;
    @ViewChild('element1') element1Ref: ElementRef;
    dataGrid: DataGrid;
    params: IFilterParams;
    floatingParams: IFloatingFilterParams;
    model: any;
    instance: any;
    valuelistValues: any;
    format: any;
    txtClearFilter: string;
    txtApplyFilter: string;
    isFloating: boolean;

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
        this.dataGrid = this.params.context.componentParent;

        this.txtClearFilter = this.dataGrid.agGridOptions['localeText'] && this.dataGrid.agGridOptions['localeText']['clearFilter'] ?
          this.dataGrid.agGridOptions['localeText'] && this.dataGrid.agGridOptions['localeText']['clearFilter'] : 'Clear Filter';
        this.txtApplyFilter = this.dataGrid.agGridOptions['localeText'] && this.dataGrid.agGridOptions['localeText']['applyFilter'] ?
          this.dataGrid.agGridOptions['localeText'] && this.dataGrid.agGridOptions['localeText']['applyFilter'] : 'Apply Filter';

        const valuelist = this.getValuelistFromGrid();
        if (valuelist) {
          valuelist.filterList('').subscribe((valuelistValues) => {
            this.valuelistValues = valuelistValues;
            if(!this.hasApplyButton()) {
              this.valuelistValues.splice(0, 0, NULL_VALUE);
            }
            this.dataGrid.cdRef.detectChanges();
          });
        }
        const column = this.dataGrid.getColumn(this.params.column.getColId());
        if(column && column.format) {
            this.format = column.format;
        }
    }

    getValuelistFromGrid(): any {
      const rows = this.dataGrid.agGrid.api ? this.dataGrid.agGrid.api.getSelectedRows() : null;
      return rows && rows.length > 0 ? this.dataGrid.getValuelistEx(rows[0], this.params.column.getColId()) : null;
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
        this.floatingParams.parentFilterInstance((instance) => {
          instance.onFloatingFilterChanged('equals', this.getFilterUIValue());
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
            filterType: isNaN(filterRealValue) ? 'text' : 'number',
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
              filterType: isNaN(filterRealValue) ? 'text' : 'number',
              type: 'equals',
              filter: filterRealValue
            };
          }

          if(this.model && condition2) {
            this.model = {
              operator: 'OR',
              condition1: this.model,
              condition2
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

    getFilterRealValue(second?: boolean): any {
        let realValue = '';
        const displayValue = second ? this.getSecondFilterUIValue() : this.getFilterUIValue();
        if(this.valuelistValues) {
          for (const vvalue of this.valuelistValues) {
            // compare trimmed values, typeahead will trim the selected value
            if (displayValue != null && (displayValue.trim() === vvalue.displayValue.trim())) {
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

    doesFilterPass(): boolean {
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
        this.dataGrid.setTimeout(() => {
          this.onApplyFilter();
        }, 0);
      }
    }

    suppressAndOrCondition(): boolean {
      return this.params['suppressAndOrCondition'] === true;
    }
}
