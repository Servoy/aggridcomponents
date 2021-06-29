import { Component, ElementRef, Inject, Input, ViewChild } from '@angular/core';
import { DateTimeAdapter, OwlDateTimeIntl } from '@danielmoncada/angular-datetime-picker';
import { EditorDirective } from './editor';
import { ICellEditorParams } from '@ag-grid-community/core';
import { DOCUMENT } from '@angular/common';
import { PickerType } from '@danielmoncada/angular-datetime-picker/lib/date-time/date-time.class';
import { Format, getFirstDayOfWeek, ServoyPublicService } from '@servoy/public';
import { DateTime } from 'luxon';

@Component({
    selector: 'aggrid-datepicker',
    template: `
      <div class="input-group date bts-calendar-container ag-cell-edit-input" style="flex-wrap: nowrap" #element>
        <input style="form-control form-control svy-line-height-normal" [(ngModel)]="selectedValue" [svyFormat]="format" #inputElement>
        <span tabindex="-1" (click)="onOpenPopup($event)"
          class="input-group-text input-group-append ag-custom-component-popup" style="padding:7px;" [owlDateTimeTrigger]="datetime"><span class="far fa-calendar-alt"></span></span>
        <input class="form-control" style="position:absolute;bottom:0px;width:0px;height:0px;border:0px;padding:0px" [owlDateTime]="datetime" (dateTimeChange)="dateChanged($event)" [value]="initialValue">
        <owl-date-time #datetime [firstDayOfWeek]="firstDayOfWeek" [hour12Timer]="hour12Timer" [pickerType]="pickerType" [showSecondsTimer]="showSecondsTimer"></owl-date-time>
      </div>
    `,
    providers: [OwlDateTimeIntl]
})
export class DatePicker extends EditorDirective {

    @ViewChild('inputElement') inputElementRef: ElementRef;
    
    firstDayOfWeek = 1;
    hour12Timer = false;
    pickerType: PickerType = 'both';
    showSecondsTimer = false;

    @Input() selectedValue: any;

    format: Format;

    constructor(servoyService: ServoyPublicService, dateTimeAdapter: DateTimeAdapter<any>, @Inject(DOCUMENT) private doc: Document) {
        super();
        dateTimeAdapter.setLocale(servoyService.getLocale());

        this.firstDayOfWeek = getFirstDayOfWeek(servoyService.getLocale());
        const lts = DateTime.now().setLocale(servoyService.getLocale()).toLocaleString(DateTime.DATETIME_FULL).toUpperCase();
        this.hour12Timer = lts.indexOf('AM') >= 0 || lts.indexOf('PM') >= 0;
    }

    agInit(params: ICellEditorParams): void {
        super.agInit(params);
        this.selectedValue = this.initialValue;

        const column = this.ngGrid.getColumn(params.column.getColId());
        if (column && column.format && typeof column.format !== 'string') {
            this.format = column.format;
        } else {
            this.format = new Format();
            this.format.type = 'DATETIME';
            if(column && column.format && typeof column.format === 'string') {
                const splitedEditFormat = column.format.split("|");
                this.format.display = splitedEditFormat[0];
                if(splitedEditFormat.length === 4 && splitedEditFormat[3] === 'mask') {
                    this.format.edit = splitedEditFormat[1];
                    this.format.isMask = true;
                    this.format.placeHolder = splitedEditFormat[2];
                }
                else if(splitedEditFormat.length > 1) {
                    this.format.edit = splitedEditFormat[1];
                }
            } else {
                this.format.display = 'MM/dd/yyyy hh:mm a';
            }
        }
        const format = this.format.edit ? this.format.edit : this.format.display;

        const showCalendar = format.indexOf('y') >= 0 || format.indexOf('M') >= 0;
        const showTime = format.indexOf('h') >= 0 || format.indexOf('H') >= 0 || format.indexOf('m') >= 0;
        if (showCalendar) {
            if (showTime) this.pickerType = 'both';
            else this.pickerType = 'calendar';
        } else this.pickerType = 'timer';
        this.showSecondsTimer = format.indexOf('s') >= 0;
        this.hour12Timer = format.indexOf('h') >= 0 || format.indexOf('a') >= 0 || format.indexOf('A') >= 0;
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.inputElementRef.nativeElement.select();
        }, 0);
    }

    onOpenPopup(event: MouseEvent) {
        const dateContainer = this.doc.getElementsByTagName('owl-date-time-container');
        if (dateContainer && dateContainer.length) {
            dateContainer[0].classList.add('ag-custom-component-popup');
        }
    }

    isPopup(): boolean {
        return true;
    }

    // returns the new value after editing
    getValue(): any {
        return this.selectedValue;
    }

    dateChanged(e: any): any {
        if (e && e.value) {
            this.selectedValue = e.value;
        } else this.selectedValue = null;
    }
}
