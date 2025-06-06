import { IJSMenu } from '@servoy/public';
import { NGGridDirective } from '../../nggrid';

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
    public customMainMenu: IJSMenu;

    private dragData: any[];

    setDragData(dragData: any[]) {
      this.dragData = dragData;
    }

    getDragData() {
      return this.dragData;
    }
}
