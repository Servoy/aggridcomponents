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
    @Input() onDragOverFunc: any;
    @Input() onDragGetImageFunc: any;

    @Input() onDrop: any;
    @Input() onColumnFormEditStarted: any;

    @Input() responsiveHeight: number;

    doc: Document;

    agGridOptions: GridOptions;
    gridApi: GridApi;
    cdRef: ChangeDetectorRef;
    formattingService: FormattingService;
    selectionEvent: any;
    log: LoggerService;

    dragViewport: HTMLElement
    dragViewportRect: DOMRect;
    dragViewportHorizontalScrollViewport: HTMLElement;
    dragViewportScrollThreshold = 20;
    dragViewportScrollSpeed = 10;
    dragViewportScrollInterval: any;
    dragScrollDirection: string;

    private destroyed = false;

    destroy(): any {
        this.cancelDragViewportScroll();
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

    handleDragViewportScroll($event) {
        if(!this.dragViewport) {
            this.dragViewport = $event.currentTarget.getElementsByClassName("ag-body-viewport")[0] as HTMLElement;
            this.dragViewportHorizontalScrollViewport = $event.currentTarget.getElementsByClassName("ag-body-horizontal-scroll-viewport")[0] as HTMLElement;
            
            this.dragViewportRect = this.dragViewport.getBoundingClientRect();
        }
        const clientX = $event.clientX - this.dragViewportRect.left;
        const clientY = $event.clientY - this.dragViewportRect.top;
        const containerWidth = this.dragViewportRect.width;
        const containerHeight = this.dragViewportRect.height;
      
        this.dragScrollDirection = null;
        if (clientX < this.dragViewportScrollThreshold) {
            this.dragScrollDirection = 'left';
        } else if (clientX > containerWidth - this.dragViewportScrollThreshold) {
            this.dragScrollDirection = 'right';
        } else if (clientY < this.dragViewportScrollThreshold) {
            this.dragScrollDirection = 'up';
        } else if (clientY > containerHeight - this.dragViewportScrollThreshold) {
            this.dragScrollDirection = 'down';
        }
        if(this.dragScrollDirection && !this.dragViewportScrollInterval) {
            this.dragViewportScrollInterval = setInterval(() => {
                if(this.dragScrollDirection) {
                    switch (this.dragScrollDirection) {
                        case 'left':
                            this.dragViewportHorizontalScrollViewport.scrollBy({ left: -this.dragViewportScrollSpeed, top: 0 });
                          break;
                        case 'right':
                            this.dragViewportHorizontalScrollViewport.scrollBy({ left: this.dragViewportScrollSpeed, top: 0 });
                          break;
                        case 'up':
                            this.dragViewport.scrollBy({ left: 0, top: -this.dragViewportScrollSpeed });
                          break;
                        case 'down':
                            this.dragViewport.scrollBy({ left: 0, top: this.dragViewportScrollSpeed });
                          break;
                      }
                } else {
                    clearInterval(this.dragViewportScrollInterval);
                    this.dragViewportScrollInterval = null;
                }
            }, 16);
        }
    }

    cancelDragViewportScroll() {
        if(this.dragViewportScrollInterval) {
            clearInterval(this.dragViewportScrollInterval);
        }
        this.dragViewportScrollInterval = null;
        this.dragViewport = null;
        this.dragViewportRect = null;
        this.dragViewportHorizontalScrollViewport = null;
        this.dragScrollDirection = null;
    }

    gridDragEnd($event) {
        this.cancelDragViewportScroll();
        if(this.onDragGetImageFunc) {
            const dragGhostEl = this.doc.getElementById("nggrids-drag-ghost") as HTMLElement;
            if (dragGhostEl.parentNode) {
                dragGhostEl.parentNode.removeChild(dragGhostEl);
            }
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