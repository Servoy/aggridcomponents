import { AgFilterComponent } from '@ag-grid-community/angular';
import { IFilterParams } from '@ag-grid-community/core';
import { Directive, ElementRef, ViewChild } from '@angular/core';
import { DataGrid } from '../datagrid';

@Directive()
export class DatagridFilterDirective implements AgFilterComponent {

    @ViewChild('element') elementRef: ElementRef;
    dataGrid: DataGrid;
    params: IFilterParams;
    model: any;
    instance: any;
    valuelistValues: any;
    format: any;
    txtClearFilter: string;
    txtApplyFilter: string;

    constructor() {
        this.instance = this;
    }

    agInit(params: IFilterParams): void {
        this.params = params;
        this.dataGrid = params.context.componentParent;

        this.txtClearFilter = this.dataGrid.agGridOptions['localeText'] && this.dataGrid.agGridOptions['localeText']['clearFilter'] ?
          this.dataGrid.agGridOptions['localeText'] && this.dataGrid.agGridOptions['localeText']['clearFilter'] : 'Clear Filter';
        this.txtApplyFilter = this.dataGrid.agGridOptions['localeText'] && this.dataGrid.agGridOptions['localeText']['applyFilter'] ?
          this.dataGrid.agGridOptions['localeText'] && this.dataGrid.agGridOptions['localeText']['applyFilter'] : 'Apply Filter';

        const valuelist = this.getValuelistFromGrid();
        if (valuelist) {
          valuelist.filterList('').subscribe((valuelistValues) => {
            this.valuelistValues = valuelistValues;
            this.dataGrid.cdRef.detectChanges();
          });
        }
        const column = this.dataGrid.getColumn(params.column.getColId());
        if(column && column.format) {
            this.format = column.format;
        }
    }

    getValuelistFromGrid(): any {
      const rows = this.dataGrid.agGrid.api.getSelectedRows();
      return rows && rows.length > 0 ? this.dataGrid.getValuelistEx(rows[0], this.params.column.getColId()) : null;
    }

    onClearFilter() {
        this.elementRef.nativeElement.value = '';
        this.model = '';
      }

    onApplyFilter() {
        const filterRealValue = this.getFilterRealValue();
        if(filterRealValue === '' || filterRealValue === null) {
            this.model = null;
        } else {
            this.model = {
            filterType: isNaN(filterRealValue) ? 'text' : 'number',
            type: 'equals',
            filter: filterRealValue
            };
        }
        this.params.filterChangedCallback();
    }

    getFilterUIValue(): any {
        return null;
    }

    getFilterRealValue(): any {
        let realValue = '';
        const displayValue = this.getFilterUIValue();
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
}
