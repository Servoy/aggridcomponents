import { Injectable } from '@angular/core';
import { GridService } from './commons/grid.service';

@Injectable({
  providedIn: 'root'
})
export class DatagridService extends GridService {
    public arrowsUpDownMoveWhenEditing: string;
    public editNextCellOnEnter: boolean;
    public moveToNextEditableCellOnTab: boolean;
    
}
