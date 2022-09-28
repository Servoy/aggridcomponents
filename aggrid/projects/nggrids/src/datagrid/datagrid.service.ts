import { RowDropZoneParams } from '@ag-grid-community/core';
import { Injectable } from '@angular/core';
import { DataGrid } from './datagrid';

@Injectable({
  providedIn: 'root'
})
export class DatagridService {
    public iconConfig: any;
    public toolPanelConfig: any;
    public gridOptions: any;
    public localeText: any;
    public columnOptions: any;
    public mainMenuItemsConfig: any;
    public arrowsUpDownMoveWhenEditing: string;
    public editNextCellOnEnter: boolean;

    private gridNameToRowDropZoneInfo: Map<string, RowDropZoneInfo> = new Map();

    addRowDropZone(dataGrid: DataGrid, rowDropZone: RowDropZoneParams) {
      if(rowDropZone && dataGrid.rowDropZoneFor && dataGrid.rowDropZoneFor.length) {
        dataGrid.rowDropZoneFor.forEach(forGridName => {
          if(this.gridNameToRowDropZoneInfo.has(forGridName)) {
            this.gridNameToRowDropZoneInfo.get(forGridName).dataGrid.agGrid.api.addRowDropZone(rowDropZone);
          }
        });
      }

      this.gridNameToRowDropZoneInfo.forEach(rowDropZoneInfo => {
        if(rowDropZoneInfo.rowDropZone && rowDropZoneInfo.dataGrid.rowDropZoneFor && rowDropZoneInfo.dataGrid.rowDropZoneFor.length) {
          rowDropZoneInfo.dataGrid.rowDropZoneFor.forEach(forGridName => {
            if(dataGrid.name === forGridName) {
              dataGrid.agGrid.api.addRowDropZone(rowDropZoneInfo.rowDropZone);
            }
          });
        }
      });
      this.gridNameToRowDropZoneInfo.set(dataGrid.name,  new RowDropZoneInfo(dataGrid, rowDropZone));
    }

    removeRowDropZone(dataGrid: DataGrid) {
      if(this.gridNameToRowDropZoneInfo.has(dataGrid.name)) {
        const rowDropZoneInfo = this.gridNameToRowDropZoneInfo.get(dataGrid.name);
        if(rowDropZoneInfo.rowDropZone && rowDropZoneInfo.dataGrid.rowDropZoneFor && rowDropZoneInfo.dataGrid.rowDropZoneFor.length) {
          dataGrid.rowDropZoneFor.forEach(forGridName => {
            if(this.gridNameToRowDropZoneInfo.has(forGridName)) {
              this.gridNameToRowDropZoneInfo.get(forGridName).dataGrid.agGrid.api.removeRowDropZone(rowDropZoneInfo.rowDropZone);
            }
          });
        }
        this.gridNameToRowDropZoneInfo.delete(dataGrid.name)
      }

      this.gridNameToRowDropZoneInfo.forEach(rowDropZoneInfo => {
        if(rowDropZoneInfo.rowDropZone && rowDropZoneInfo.dataGrid.rowDropZoneFor && rowDropZoneInfo.dataGrid.rowDropZoneFor.length) {
          rowDropZoneInfo.dataGrid.rowDropZoneFor.forEach(forGridName => {
            if(dataGrid.name === forGridName) {
              dataGrid.agGrid.api.removeRowDropZone(rowDropZoneInfo.rowDropZone);
            }
          });
        }
      });
    }
}

class RowDropZoneInfo {
  constructor(public dataGrid: DataGrid, public rowDropZone: RowDropZoneParams) {
  }
}
