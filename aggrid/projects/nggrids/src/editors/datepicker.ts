import { Component, Inject } from '@angular/core';
import { DateTimeAdapter, OwlDateTimeIntl } from '@danielmoncada/angular-datetime-picker';
import { EditorDirective } from './editor';
import { ICellEditorParams } from '@ag-grid-community/core';
import { DOCUMENT } from '@angular/common';
import { PickerType } from '@danielmoncada/angular-datetime-picker/lib/date-time/date-time.class';
import { getFirstDayOfWeek, ServoyPublicService } from '@servoy/public';
import { DateTime } from 'luxon';

@Component({
    selector: 'aggrid-datepicker',
    template: `
      <div class="input-group ag-cell-edit-input">
        <input class="form-control" style="height: 100%;" [owlDateTime]="datetime" (dateTimeChange)="dateChanged($event)" [value]="initialValue" #element>
        <span tabindex="-1" (click)="onOpenPopup($event)"
          class="input-group-text input-group-append ag-custom-component-popup" style="height: 100%;" [owlDateTimeTrigger]="datetime"><span class="far fa-calendar-alt"></span></span>
        <owl-date-time #datetime [firstDayOfWeek]="firstDayOfWeek" [hour12Timer]="hour12Timer" [pickerType]="pickerType" [showSecondsTimer]="showSecondsTimer"></owl-date-time>
      </div>
    `,
    providers: [OwlDateTimeIntl]
})
export class DatePicker extends EditorDirective {

    firstDayOfWeek = 1;
    hour12Timer = false;
    pickerType: PickerType = 'both';
    showSecondsTimer = false;

    selectedValue: any;

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

        let format = 'MM/dd/yyyy hh:mm a';
        const column = this.ngGrid.getColumn(params.column.getColId());
        if (column && column.format) {
            format = column.format.edit ? column.format.edit : column.format.display;
        }

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
            this.elementRef.nativeElement.select();
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
            this.selectedValue = e.value.toDate();
        } else this.selectedValue = null;
    }
}
