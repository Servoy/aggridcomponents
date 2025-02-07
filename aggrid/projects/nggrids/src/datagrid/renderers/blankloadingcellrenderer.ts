import { ILoadingCellRendererAngularComp } from 'ag-grid-angular';
import { ILoadingCellRendererParams, IAfterGuiAttachedParams } from 'ag-grid-community';
import { Component } from '@angular/core';

@Component({
    selector: 'aggrid-blankloadingcellrenderer',
    template: `
    <div ></div>
    `,
    standalone: false
})
export class BlankLoadingCellRendrer implements ILoadingCellRendererAngularComp {
    agInit(params: ILoadingCellRendererParams): void {
    }
    afterGuiAttached?(params?: IAfterGuiAttachedParams): void {
    }
}
