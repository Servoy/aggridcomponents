import { DragTransferData, NGGridDirective } from '../../nggrid';
import { RowDropZoneParams } from 'ag-grid-community';

export class GridService {
    public iconConfig: any;
    public toolPanelConfig: any;
    public gridOptions: any;
    public localeText: {
        [key: string]: string;
    };
    public columnOptions: any;
    public mainMenuItemsConfig: any;
    public continuousColumnsAutoSizing: boolean;
    public columnsAutoSizingOn: any;
    public licenseKey: string;

    private dragData: DragTransferData;

    setDragData(dragData: DragTransferData) {
      this.dragData = dragData;
    }

    getDragData(): DragTransferData {
      return this.dragData;
    }
}
