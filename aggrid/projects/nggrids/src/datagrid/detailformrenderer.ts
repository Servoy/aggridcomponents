import { ChangeDetectionStrategy, ChangeDetectorRef, Component, TemplateRef } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { DataGrid } from './datagrid';

@Component({
    selector: 'aggrid-detailformrenderer',
    template: `
      <div class="svy-detail-form-container" [style.height.px]="height" style="width: 100%; overflow: auto;">
        @if (formComponentCache) {
          @if (formComponentCache.absoluteLayout) {
            <div style="position: relative; width: 100%; height: 100%;">
              @for (item of formComponentCache.childElements; track item) {
                <div class="svy-wrapper" style="position:absolute" [ngStyle]="item.layout">
                  <ng-template [ngTemplateOutlet]="getItemTemplate(item)"
                    [ngTemplateOutletContext]="{ state: getItemState(item), callback: this }">
                  </ng-template>
                </div>
              }
            </div>
          }
          @if (!formComponentCache.absoluteLayout) {
            <div>
              @for (item of formComponentCache.childElements; track item) {
                <ng-template [ngTemplateOutlet]="getItemTemplate(item)"
                  [ngTemplateOutletContext]="{ state: getItemState(item), callback: this }">
                </ng-template>
              }
            </div>
          }
        }
      </div>
    `,
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailFormRenderer implements ICellRendererAngularComp {
    private dataGrid!: DataGrid;
    private params!: ICellRendererParams;
    private rowIndex!: number;

    formComponentCache: any;
    height = 200;

    constructor(private cdRef: ChangeDetectorRef) {
    }

    agInit(params: ICellRendererParams): void {
        this.params = params;
        this.dataGrid = params.context.componentParent;

        let detailHeight = this.dataGrid.detailRowHeight() || 200;
        const onDetailFormSetup = this.dataGrid.onDetailFormSetup();
        if (onDetailFormSetup && params.data) {
            const foundsetIndex = params.node.rowIndex! + 1;
            const record = this.dataGrid.getRecord(params);
            const result = onDetailFormSetup(foundsetIndex, record);
            if (result) {
                if (result.height) detailHeight = result.height;
            }
        }

        this.height = detailHeight;
        this.rowIndex = params.data._svyFoundsetIndex - (this.dataGrid.myFoundset()?.viewPort?.startIndex || 0);

        const detailForm = this.dataGrid.detailForm();
        if (detailForm && detailForm.childElements) {
            this.formComponentCache = detailForm;
        }
    }

    getItemTemplate(item: any): TemplateRef<any> {
        return this.dataGrid.getDetailItemTemplate(item);
    }

    getItemState(item: any): any {
        return this.dataGrid.getDetailItemState(item, this.rowIndex);
    }

    getHandler(state: any, name: string) {
        const childElement = this.formComponentCache?.childElements?.find((el: any) => el.name === state.name);
        if (childElement?.mappedHandlers) {
            const handler = childElement.mappedHandlers.get(name);
            if (handler) {
                const rowId = this.dataGrid.myFoundset()?.viewPort?.rows?.[this.rowIndex]?._svyRowId;
                return rowId ? handler.selectRecordHandler(rowId) : handler;
            }
        }
        return null;
    }

    getServoyApi(item: any) {
        return this.dataGrid.servoyApi;
    }

    datachange(state: any, property: string, value: any, dataprovider: boolean) {
        const model = state.model;
        const oldValue = model[property];
        model[property] = value;
        const childElement = this.formComponentCache?.childElements?.find((el: any) => el.name === state.name);
        if (childElement?.sendChanges) {
            const rowId = this.dataGrid.myFoundset()?.viewPort?.rows?.[this.rowIndex]?._svyRowId;
            childElement.sendChanges(property, value, oldValue, rowId, dataprovider);
        }
    }

    refresh(_params: ICellRendererParams): boolean {
        return false;
    }

    destroy(): void {
    }
}
