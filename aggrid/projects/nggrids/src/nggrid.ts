import { AgGridAngular } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import { ChangeDetectorRef, ContentChild, Directive, ElementRef, Input, TemplateRef, ViewChild } from '@angular/core';
import { Deferred, BaseCustomObject, Format, FormattingService, LoggerService, ServoyBaseComponent, JSEvent, IJSMenu, IJSMenuItem, PopupStateService } from '@servoy/public';
import { Options } from '@eonasdan/tempus-dominus';

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

    @Input() enableBrowserContextMenu: boolean;
    @Input() arrowsUpDownMoveWhenEditing: any;
    @Input() editNextCellOnEnter: boolean;
    @Input() moveToNextEditableCellOnTab: boolean;
    @Input() _internalFormEditorValue: any;
    @Input() onDragOverFunc: any;
    @Input() onDragGetImageFunc: any;

    @Input() onDrop: any;
    @Input() onColumnFormEditStarted: any;

    @Input() responsiveHeight: number;
    @Input() customMainMenu: IJSMenu;

    @Input() onCustomMainMenuAction: (menuItemName: string, colId: string) => void;

    doc: Document;

    agGridOptions: GridOptions;
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

    protected popupStateService: PopupStateService
    private popupParent: HTMLElement;
    private popupParentObserver: MutationObserver;

	svyOnInit() {
		super.svyOnInit();
		if (!this.servoyApi.isInDesigner()) {
            let mainWindowContainer = this.agGridElementRef.nativeElement.closest('.svy-main-window-container');
            if(!mainWindowContainer) {
                mainWindowContainer = this.agGridElementRef.nativeElement.closest('.svy-dialog');
            }
            this.popupParent = mainWindowContainer ? mainWindowContainer : this.agGridElementRef.nativeElement;
            this.agGrid.api.setGridOption('popupParent', this.popupParent);
            this.popupParentObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    // Added nodes
                    mutation.addedNodes.forEach(node => {
                        if (node instanceof HTMLElement && (node.classList.contains('ag-popup') /*|| node.classList.contains('ag-custom-component-popup')*/)) {
                            this.popupStateService.activatePopup(this.agGridElementRef.nativeElement.parentNode.id);
                        }
                    });
                    // Removed nodes
                    mutation.removedNodes.forEach(node => {
                        if (node instanceof HTMLElement && (node.classList.contains('ag-popup') /*|| node.classList.contains('ag-custom-component-popup')*/)) {
                            this.popupStateService.deactivatePopup(this.agGridElementRef.nativeElement.parentNode.id);
                        }
                    });
                });
            });

            this.popupParentObserver.observe(this.popupParent, { childList: true, subtree: false });
            //this.popupParentObserver.observe(this.doc.body, { childList: true, subtree: false });

            if(!this.enableBrowserContextMenu) {
                this.agGridElementRef.nativeElement.addEventListener('contextmenu', (e: any) => {
                    e.preventDefault();
                });
            }
        }
    }

    destroy(): any {
        this.cancelDragViewportScroll();
        if (this.popupParentObserver) this.popupParentObserver.disconnect();
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

    getDataTarget(event): any {
        const dataTarget = event.target.closest('[data-target]');
        if (dataTarget) {
            return dataTarget.getAttribute('data-target');
        }
        return null;
    }

    loadCalendarLocale(config: Options): Deferred<any> {
        const locale = config.localization.locale;
        const localeDefer  = new Deferred();
        const index = locale.indexOf('-');
        let language = locale.toLowerCase();
        if (index > 0 && language !== 'ar-sa' && language !== 'sr-latn') {
            language = locale.substring(0, index);
        }
        const moduleLoader =  (module: { default: { localization: { [key: string]: string | number} }}) => {
            const copy = Object.assign({}, module.default.localization);
            copy.startOfTheWeek =   config.localization.startOfTheWeek;
            copy.hourCycle = config.localization.hourCycle;
            config.localization = copy;
            localeDefer.resolve(locale);
        }
        const errorHandler = () => {
			localeDefer.resolve('');
        }
        switch(language) {
            case 'ar-sa': import('@eonasdan/tempus-dominus/dist/locales/ar-SA.js').then(moduleLoader,errorHandler); break;
            case 'ar': import('@eonasdan/tempus-dominus/dist/locales/ar.js').then(moduleLoader,errorHandler); break;
            case 'ca': import('@eonasdan/tempus-dominus/dist/locales/ca.js').then(moduleLoader,errorHandler); break;
            case 'cs': import('@eonasdan/tempus-dominus/dist/locales/cs.js').then(moduleLoader,errorHandler); break;
            case 'de': import('@eonasdan/tempus-dominus/dist/locales/de.js').then(moduleLoader,errorHandler); break;
            case 'es': import('@eonasdan/tempus-dominus/dist/locales/es.js').then(moduleLoader,errorHandler); break;
            case 'fi': import('@eonasdan/tempus-dominus/dist/locales/fi.js').then(moduleLoader,errorHandler); break;
            case 'fr': import('@eonasdan/tempus-dominus/dist/locales/fr.js').then(moduleLoader,errorHandler); break;
            case 'hr': import('@eonasdan/tempus-dominus/dist/locales/hr.js').then(moduleLoader,errorHandler); break;
            case 'hy': import('@eonasdan/tempus-dominus/dist/locales/hy.js').then(moduleLoader,errorHandler); break;
            case 'it': import('@eonasdan/tempus-dominus/dist/locales/it.js').then(moduleLoader,errorHandler); break;
            case 'nl': import('@eonasdan/tempus-dominus/dist/locales/nl.js').then(moduleLoader,errorHandler); break;
            case 'pl': import('@eonasdan/tempus-dominus/dist/locales/pl.js').then(moduleLoader,errorHandler); break;
            case 'ro': import('@eonasdan/tempus-dominus/dist/locales/ro.js').then(moduleLoader,errorHandler); break;
            case 'ru': import('@eonasdan/tempus-dominus/dist/locales/ru.js').then(moduleLoader,errorHandler); break;
            case 'sl': import('@eonasdan/tempus-dominus/dist/locales/sl.js').then(moduleLoader,errorHandler); break;
            case 'sr': import('@eonasdan/tempus-dominus/dist/locales/sr.js').then(moduleLoader,errorHandler); break;
            case 'sr-latn': import('@eonasdan/tempus-dominus/dist/locales/sr-Latn.js').then(moduleLoader,errorHandler); break;
            case 'tr': import('@eonasdan/tempus-dominus/dist/locales/tr.js').then(moduleLoader,errorHandler); break;
            default: localeDefer.resolve('');
        }
        return localeDefer;
    }    

	createCustomMainMenuItems(menuItems: any[], customMainMenu: any, column: any, colId: string): any[] {
		customMainMenu.items.forEach((item: IJSMenuItem) => {
			let hideForColIds: string[] = typeof item.extraProperties['NG-Grids']['hideForColIds'] === 'string' && item.extraProperties['NG-Grids']['hideForColIds'].trim().length > 0 ? item.extraProperties['NG-Grids']['hideForColIds'].split(',') : [];
			let showForColIds: string[] = typeof item.extraProperties['NG-Grids']['showForColIds'] === 'string' && item.extraProperties['NG-Grids']['showForColIds'].trim().length > 0 ? item.extraProperties['NG-Grids']['showForColIds'].split(',') : [];
			if ((!column.id && showForColIds.length === 0) || ((hideForColIds.length === 0 || hideForColIds.indexOf(column.id) === -1) &&
				(showForColIds.length === 0 || showForColIds.indexOf(column.id) !== -1))) {
				if (item.extraProperties['NG-Grids']['isSeparator']) {
					menuItems.push('separator');
				} else if(item.extraProperties['NG-Grids']['agGridMenuItem']) {
					menuItems.push(item.extraProperties['NG-Grids']['agGridMenuItem']);
				} else {
					menuItems.push({
						name: item.menuText,
						icon: item.iconStyleClass ? '<span class="' + item.iconStyleClass + '"></span>' : null,
						disabled: !item.enabled,
						checked: item.isSelected,
						tooltip: item.tooltipText,
						action: () => {
							if (this.onCustomMainMenuAction) {
								this.onCustomMainMenuAction(item.itemID, colId);
							}
						},
						subMenu: item.items ? this.createCustomMainMenuItems([], item, column, colId) : null
					});
				}
			}
		});
		return menuItems;
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

export class DragTransferData {
    constructor(public records: any, public sourceGridName: string, public sourceColumnId: string) {
    }
}

export class JSDNDEvent extends JSEvent{
    targetColumnId: string;
    sourceColumnId: string;
    sourceGridName: string;
}