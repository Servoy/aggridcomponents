import { NGGridDirective } from '../../nggrid';
import { RowDropZoneParams } from '@ag-grid-community/core';

export class GridService {
    public iconConfig: any;
    public toolPanelConfig: any;
    public gridOptions: any;
    public localeText: any;
    public columnOptions: any;
    public mainMenuItemsConfig: any;

    private gridNameToRowDropZoneInfo: Map<string, RowDropZoneInfo> = new Map();

    addRowDropZone(grid: NGGridDirective, rowDropZone: RowDropZoneParams) {
      const formNameGridName = grid.servoyApi.getFormName() + '.' + grid.name;
      if(rowDropZone && grid.rowDropZoneFor && grid.rowDropZoneFor.length) {
        grid.rowDropZoneFor.forEach(forGridName => {
          if(this.gridNameToRowDropZoneInfo.has(forGridName)) {
            this.gridNameToRowDropZoneInfo.get(forGridName).grid.agGrid.api.addRowDropZone(rowDropZone);
          }
        });
      }

      this.gridNameToRowDropZoneInfo.forEach(rowDropZoneInfo => {
        if(rowDropZoneInfo.rowDropZone && rowDropZoneInfo.grid.rowDropZoneFor && rowDropZoneInfo.grid.rowDropZoneFor.length) {
          rowDropZoneInfo.grid.rowDropZoneFor.forEach(forGridName => {
            if(formNameGridName === forGridName) {
              grid.agGrid.api.addRowDropZone(rowDropZoneInfo.rowDropZone);
            }
          });
        }
      });
      this.gridNameToRowDropZoneInfo.set(formNameGridName,  new RowDropZoneInfo(grid, rowDropZone));
    }

    removeRowDropZone(grid: NGGridDirective) {
      const formNameGridName = grid.servoyApi.getFormName() + '.' + grid.name;
      if(this.gridNameToRowDropZoneInfo.has(formNameGridName)) {
        const rowDropZoneInfo = this.gridNameToRowDropZoneInfo.get(formNameGridName);
        if(rowDropZoneInfo.rowDropZone && rowDropZoneInfo.grid.rowDropZoneFor && rowDropZoneInfo.grid.rowDropZoneFor.length) {
          grid.rowDropZoneFor.forEach(forGridName => {
            if(this.gridNameToRowDropZoneInfo.has(forGridName)) {
              this.gridNameToRowDropZoneInfo.get(forGridName).grid.agGrid.api.removeRowDropZone(rowDropZoneInfo.rowDropZone);
            }
          });
        }
        this.gridNameToRowDropZoneInfo.delete(formNameGridName);
      }

      this.gridNameToRowDropZoneInfo.forEach(rowDropZoneInfo => {
        if(rowDropZoneInfo.rowDropZone && rowDropZoneInfo.grid.rowDropZoneFor && rowDropZoneInfo.grid.rowDropZoneFor.length) {
          rowDropZoneInfo.grid.rowDropZoneFor.forEach(forGridName => {
            if(formNameGridName === forGridName) {
              grid.agGrid.api.removeRowDropZone(rowDropZoneInfo.rowDropZone);
            }
          });
        }
      });
    }
}

class RowDropZoneInfo {
    constructor(public grid: NGGridDirective, public rowDropZone: RowDropZoneParams) {
    }
}
