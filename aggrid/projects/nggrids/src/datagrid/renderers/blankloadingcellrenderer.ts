import { ILoadingCellRendererAngularComp } from 'ag-grid-angular';
import { ILoadingCellRendererParams, IAfterGuiAttachedParams } from 'ag-grid-community';
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'aggrid-blankloadingcellrenderer',
    template: `
    <div ></div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class BlankLoadingCellRendrer implements ILoadingCellRendererAngularComp {
    agInit(params: ILoadingCellRendererParams): void {
    }
    afterGuiAttached?(params?: IAfterGuiAttachedParams): void {
    }
}
