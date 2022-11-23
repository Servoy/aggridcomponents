import { NGGridDirective } from '../../nggrid';
import { RowDropZoneParams } from '@ag-grid-community/core';

export class GridService {
    public iconConfig: any;
    public toolPanelConfig: any;
    public gridOptions: any;
    public localeText: any;
    public columnOptions: any;
    public mainMenuItemsConfig: any;

    private dragData: any;

    setDragData(dragData: any) {
      this.dragData = dragData;
    }

    getDragData() {
      return this.dragData;
    }
}