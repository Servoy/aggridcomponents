import { Component, ElementRef, Inject, Input, ViewChild } from '@angular/core';
import { EditorDirective } from './editor';
import { ICellEditorParams } from '@ag-grid-community/core';
import { DOCUMENT } from '@angular/common';
import { Format, FormattingService, getFirstDayOfWeek, ServoyPublicService } from '@servoy/public';
import { DateTime as DateTimeLuxon} from 'luxon';
import { DateTime, Namespace, Options, TempusDominus } from '@servoy/tempus-dominus';
import { ChangeEvent } from '@servoy/tempus-dominus/types/utilities/event-types';
import { NULL_VALUE } from '../datagrid/datagrid';

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

    @Input() selectedValue: Date;


    picker: TempusDominus;

    readonly config: Options = {
        allowInputToggle: true,
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
//        hooks: {
//        },
        localization: {
            startOfTheWeek: 1,
            locale: 'en'
        }
    };

    format: Format;

    constructor(servoyService: ServoyPublicService,  @Inject(DOCUMENT) private doc: Document, private formattingService: FormattingService,) {
        super();
        this.config.localization.startOfTheWeek = getFirstDayOfWeek(servoyService.getLocale());
        const lts = DateTimeLuxon.now().setLocale(servoyService.getLocale()).toLocaleString(DateTimeLuxon.DATETIME_FULL).toUpperCase();
        this.config.display.components.useTwentyfourHour = lts.indexOf('AM') >= 0 || lts.indexOf('PM') >= 0;
        this.config.localization.locale = servoyService.getLocale();
        this.loadCalendarLocale(this.config.localization.locale);
    }

    agInit(params: ICellEditorParams): void {
        super.agInit(params);
        this.selectedValue = this.initialValue === NULL_VALUE?null:this.initialValue;

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
        if (this.selectedValue) this.config.viewDate = DateTime.convert(this.selectedValue);
        this.picker = new TempusDominus(this.inputElementRef.nativeElement, this.config);
        this.picker.dates.formatInput =  (date: DateTime) => this.formattingService.format(date, this.format, false);
        this.picker.dates.parseInput =  (value: string) => {
            const parsed = this.formattingService.parse(value?value.trim():null, this.format, true, this.selectedValue);
            if (parsed instanceof Date && !isNaN(parsed.getTime())) return  new DateTime(parsed);
            return null;
        };
        if ( this.config.viewDate ) this.picker.dates.setValue( this.config.viewDate );
        this.picker.subscribe(Namespace.events.change, (event) => this.dateChanged(event));
        setTimeout(() => {
            this.inputElementRef.nativeElement.select();
            this.picker.show();
            const dateContainer = this.doc.getElementsByClassName('tempus-dominus-widget calendarWeeks show');
             if (dateContainer && dateContainer.length) {
            dateContainer[0].classList.add('ag-custom-component-popup');
        }
        }, 0);
         this.picker.subscribe(Namespace.events.hide, () => this.params.stopEditing());
    }

    ngOnDestroy() {
        if (this.picker !== null) this.picker.dispose();
    }

    isPopup(): boolean {
        return true;
    }

    // returns the new value after editing
    getValue(): Date {
        const parsed = this.formattingService.parse(this.inputElementRef.nativeElement.value, this.format, true, this.selectedValue);
        if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
        return null;
    }

    public dateChanged(event: ChangeEvent) {
        if (event.type === 'change.td') {
            if ((event.date && this.selectedValue && event.date.getTime() === this.selectedValue.getTime()) ||
                (!event.date && !this.selectedValue)) return;
            this.selectedValue = event.date;
        } else this.selectedValue = null;
    }

     private loadCalendarLocale(locale: string) {
        const index = locale.indexOf('-');
        let language = locale;
        if (index > 0) {
            language = locale.substring(0, index);
        }
        language = language.toLowerCase();
        import(`@servoy/tempus-dominus/dist/locales/${language}.js`).then(
            (module: { localization: { [key: string]: string } }) => {
                this.config.localization = module.localization;
                if (this.picker !== null) this.picker.updateOptions(this.config);
            },
            () => {
                // ignore
            });
    }
}
