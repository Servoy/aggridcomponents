import { AgGridAngular } from '@ag-grid-community/angular';
import { GridApi, GridOptions } from '@ag-grid-community/core';
import { ChangeDetectorRef, ContentChild, Directive, ElementRef, Input, TemplateRef, ViewChild } from '@angular/core';
import { BaseCustomObject, Format, FormattingService, LoggerService, ServoyBaseComponent } from '@servoy/public';

export const GRID_EVENT_TYPES = {
    GRID_READY: 'gridReady',
    DISPLAYED_COLUMNS_CHANGED : 'displayedColumnsChange',
    GRID_COLUMNS_CHANGED: 'gridColumnsChanged',
    GRID_ROW_POST_CREATE: 'gridRowPostCreate',
    GRID_SIZE_CHANGED: 'gridSizeChange',
    COLUMN_RESIZED: 'columnResize',
    COLUMN_ROW_GROUP_CHANGED: 'columnRowGroupChange',
    TOOLPANEL_VISIBLE_CHANGE: 'toolPanelVisibleChange'
};

@Directive()
export abstract class NGGridDirective extends ServoyBaseComponent<HTMLDivElement> {

    @ContentChild( TemplateRef  , {static: true})
    templateRef: TemplateRef<any>;

    @ViewChild('element') agGrid: AgGridAngular;
    @ViewChild('element', { read: ElementRef }) agGridElementRef: ElementRef;

    @Input() arrowsUpDownMoveWhenEditing: any;
    @Input() editNextCellOnEnter: boolean;
    @Input() _internalFormEditorValue: any;
    @Input() rowDropZoneFor: string[];
    @Input() onDragOverFunc: any;

    @Input() onDrop: any;
    @Input() onColumnFormEditStarted: any;

    @Input() responsiveHeight: number;

    doc: Document;

    agGridOptions: GridOptions;
    cdRef: ChangeDetectorRef;
    formattingService: FormattingService;
    selectionEvent: any;
    log: LoggerService;

    private destroyed = false;

    destroy(): any {
        if(!this.agGrid.api.isDestroyed()) this.agGrid.api.destroy();
        this.destroyed = true;
    }

    setTimeout(func: () => void, millis: number) {
        return setTimeout(() =>  {
            if (!this.destroyed) func();
        } , millis);
    }

    format(data: any, format: Format, useEditFormat: boolean): any {
        try {
            return this.formattingService.format(data, format, useEditFormat);
        } catch (e) {
            this.log.warn(e);
            return data;
        }
    }
    setHeight() {
        if (!this.servoyApi.isInAbsoluteLayout()) {
            if(this.responsiveHeight < 0) {
                if(this.agGridElementRef) this.agGridElementRef.nativeElement.style.height = '';
                if(this.agGrid) {
                    this.agGrid.api.setGridOption('domLayout', 'autoHeight');
                } else {
                    this.agGridOptions.domLayout = 'autoHeight';
                }
            }
            else {
                if(this.agGrid) {
                    this.agGrid.api.setGridOption('domLayout', 'normal');
                } else {
                    this.agGridOptions.domLayout = 'normal';
                }
                if(this.agGridElementRef) {
                    if (this.responsiveHeight) {
                        this.agGridElementRef.nativeElement.style.height = this.responsiveHeight + 'px';
                    } else {
                        // when responsive height is 0 or undefined, use 100% of the parent container.
                        this.agGridElementRef.nativeElement.style.height = '100%';
                    }
                }
            }
        }
    }
    
    abstract getColumn(field: any, columnsModel?: any): any;

    abstract getColumnIndex(field: any): number;

    abstract getColumnFormat(field: any): any;

    abstract getEditingRowIndex(param: any): number;

    abstract isInFindMode(): boolean;

    abstract getValuelist(params: any): any;

    abstract getValuelistForFilter(params: any): any;

    abstract hasValuelistResolvedDisplayData(): boolean;
}

export class IconConfig extends BaseCustomObject {
}

export class ToolPanelConfig extends BaseCustomObject {
}

export class MainMenuItemsConfig extends BaseCustomObject {
}

export class ColumnsAutoSizingOn extends BaseCustomObject {   
}