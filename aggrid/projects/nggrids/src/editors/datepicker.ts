import { Component, ElementRef, Inject, Input, ViewChild } from '@angular/core';
import { EditorDirective } from './editor';
import { ICellEditorParams } from '@ag-grid-community/core';
import { DOCUMENT } from '@angular/common';
import { Format, FormattingService, getFirstDayOfWeek, ServoyPublicService } from '@servoy/public';
import { DateTime as DateTimeLuxon} from 'luxon';
import { DateTime, Namespace, Options, TempusDominus } from '@eonasdan/tempus-dominus';
import { ChangeEvent } from '@eonasdan/tempus-dominus/types/event-types';

@Component({
    selector: 'aggrid-datepicker',
    template: `
    <div class="input-group date bts-calendar-container ag-cell-edit-input" style="flex-wrap: nowrap" data-td-target-input='nearest' data-td-target-toggle='nearest' #element>
    <input style="form-control form-control svy-line-height-normal" [(ngModel)]="selectedValue" [svyFormat]="format" data-td-target='#datetimepicker1' #inputElement>
    </div>
    `,
    providers: []
})
export class DatePicker extends EditorDirective {

    @ViewChild('inputElement') inputElementRef: ElementRef;

    @Input() selectedValue: any;


    picker: TempusDominus;

    readonly config: Options = {
        allowInputToggle: false,
        useCurrent: false,
        display: {
            components: {
                useTwentyfourHour: true,
                decades: true,
                year: true,
                month: true,
                date: true,
                hours: true,
                minutes: true,
                seconds: true
            },
            calendarWeeks: true,
            buttons: {
                today: true,
                close: true,
                clear: true,
            },
            inline: false
        },
        restrictions: {
        },
        hooks: {
        },
        localization: {
            startOfTheWeek: 1,
            locale: 'en'
        }
    };

    format: Format;

    constructor(servoyService: ServoyPublicService,  @Inject(DOCUMENT) private doc: Document, formattingService: FormattingService,) {
        super();
        this.config.localization.startOfTheWeek = getFirstDayOfWeek(servoyService.getLocale());
        const lts = DateTimeLuxon.now().setLocale(servoyService.getLocale()).toLocaleString(DateTimeLuxon.DATETIME_FULL).toUpperCase();
        this.config.display.components.useTwentyfourHour = lts.indexOf('AM') >= 0 || lts.indexOf('PM') >= 0;
           this.config.hooks = {
            inputFormat: (_context: TempusDominus, date: DateTime) => formattingService.format(date, this.format, false),
            inputParse: (_context: TempusDominus, value: any) => {
                const parsed  = formattingService.parse(value, this.format, true, this.selectedValue);
                if (parsed instanceof Date) return  new DateTime(parsed);
                return null;
            }
        };
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
                const splitedEditFormat = column.format.split('|');
                this.format.display = splitedEditFormat[0];
                if(splitedEditFormat.length === 4 && splitedEditFormat[3] === 'mask') {
                    this.format.edit = splitedEditFormat[1];
                    this.format.isMask = true;
                    this.format.placeHolder = splitedEditFormat[2];
                } else if(splitedEditFormat.length > 1) {
                    this.format.edit = splitedEditFormat[1];
                }
            } else {
                this.format.display = 'MM/dd/yyyy hh:mm a';
            }
        }
        const format = this.format.edit ? this.format.edit : this.format.display;

        const showCalendar = format.indexOf('y') >= 0 || format.indexOf('M') >= 0;
        const showTime = format.indexOf('h') >= 0 || format.indexOf('H') >= 0 || format.indexOf('m') >= 0;
        const showSecondsTimer = format.indexOf('s') >= 0;
        this.config.display.components.useTwentyfourHour = !(format.indexOf('h') >= 0 || format.indexOf('a') >= 0 || format.indexOf('A') >= 0);
        this.config.display.components.decades = showCalendar;
        this.config.display.components.year = showCalendar;
        this.config.display.components.month = showCalendar;
        this.config.display.components.date = showCalendar;
        this.config.display.components.hours = showTime;
        this.config.display.components.minutes = showTime;
        this.config.display.components.seconds = showTime;
        this.config.display.components.seconds = showSecondsTimer;

    }

    ngAfterViewInit(): void {
        if (this.selectedValue) this.config.viewDate = this.selectedValue;
        this.picker = new TempusDominus(this.inputElementRef.nativeElement, this.config);
        if (this.selectedValue) this.picker.dates.set(this.selectedValue);
        this.picker.subscribe(Namespace.events.change, (event) => this.dateChanged(event));
        setTimeout(() => {
            this.inputElementRef.nativeElement.select();
            this.picker.show();
            const dateContainer = this.doc.getElementsByClassName('tempus-dominus-widget calendarWeeks show');
             if (dateContainer && dateContainer.length) {
            dateContainer[0].classList.add('ag-custom-component-popup');
        }
        }, 0);
    }

    ngOnDestroy() {
        if (this.picker !== null) this.picker.dispose();
    }

    isPopup(): boolean {
        return true;
    }

    // returns the new value after editing
    getValue(): any {
        return this.selectedValue;
    }

    public dateChanged(event: ChangeEvent) {
        if (event.type === 'change.td') {
            if ((event.date && this.selectedValue && event.date.getTime() === this.selectedValue.getTime()) ||
                (!event.date && !this.selectedValue)) return;
            this.selectedValue = event.date;
        } else this.selectedValue = null;
    }
}
