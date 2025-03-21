import { Injectable } from '@angular/core';
import { GridService } from './commons/grid.service';
import { IJSMenu } from '@servoy/public';

@Injectable({
  providedIn: 'root'
})
export class DatagridService extends GridService {
    public arrowsUpDownMoveWhenEditing: string;
    public editNextCellOnEnter: boolean;
    public customMainMenu: IJSMenu;
    
}
