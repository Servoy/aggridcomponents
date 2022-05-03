import { Injectable } from '@angular/core';

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
}
