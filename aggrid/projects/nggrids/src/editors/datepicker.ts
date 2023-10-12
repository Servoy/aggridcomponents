import { Component, ElementRef, Inject, Input, ViewChild } from '@angular/core';
import { EditorDirective } from './editor';
import { ICellEditorParams } from '@ag-grid-community/core';
import { DOCUMENT } from '@angular/common';
import { Format, FormattingService, getFirstDayOfWeek, ServoyPublicService } from '@servoy/public';
import { DateTime as DateTimeLuxon} from 'luxon';
import { DateTime, Namespace, Options, TempusDominus } from '@eonasdan/tempus-dominus';
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
            inline: false,
            theme: 'light'
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

    constructor(servoyService: ServoyPublicService,  @Inject(DOCUMENT) private doc: Document, private formattingService: FormattingService) {
        super();
        this.config.localization.startOfTheWeek = getFirstDayOfWeek(servoyService.getLocaleObject() ? servoyService.getLocaleObject().full : servoyService.getLocale());
        const lts = DateTimeLuxon.now().setLocale(servoyService.getLocale()).toLocaleString(DateTimeLuxon.DATETIME_FULL).toUpperCase();
        if (lts.indexOf('a') >= 0 || lts.indexOf('A') >= 0 || lts.indexOf('am') >= 0 || lts.indexOf('AM') >= 0) {
            this.config.localization.hourCycle = 'h12';
        } else if (lts.indexOf('H') >= 0) {
            this.config.localization.hourCycle = 'h23';
        } else if (lts.indexOf('h') >= 0) {
            this.config.localization.hourCycle = 'h12';
        }
        this.config.localization.locale = servoyService.getLocale();
        this.loadCalendarLocale(this.config.localization.locale);
    }

    agInit(params: ICellEditorParams): void {
        super.agInit(params);
        this.selectedValue = this.initialValue === NULL_VALUE ? null :
            this.initialValue && this.initialValue.displayValue !== undefined ? this.initialValue.displayValue : this.initialValue;

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
        const format = this.format.edit && !this.format.isMask ? this.format.edit : this.format.display;

        const showCalendar = format.indexOf('y') >= 0 || format.indexOf('M') >= 0;
        const showTime = format.indexOf('h') >= 0 || format.indexOf('H') >= 0 || format.indexOf('m') >= 0;
        const showSecondsTimer = format.indexOf('s') >= 0;
        this.config.display.components.decades = showCalendar;
        this.config.display.components.year = showCalendar;
        this.config.display.components.month = showCalendar;
        this.config.display.components.date = showCalendar;
        this.config.display.components.hours = showTime;
        this.config.display.components.minutes = showTime;
        this.config.display.components.seconds = showTime;
        this.config.display.components.seconds = showSecondsTimer;
		if (format.indexOf('a') >= 0 || format.indexOf('A') >= 0 || format.indexOf('am') >= 0 || format.indexOf('AM') >= 0) {
			this.config.localization.hourCycle = 'h12';
		} else if (format.indexOf('H') >= 0) {
			this.config.localization.hourCycle = 'h23';
		} else if (format.indexOf('h') >= 0) {
			this.config.localization.hourCycle = 'h12';
		}
    }

    ngAfterViewInit(): void {
        if(!this.ngGrid.isInFindMode()) {
            if (this.selectedValue) this.config.viewDate = DateTime.convert(this.selectedValue, null, this.config.localization);
            this.picker = new TempusDominus(this.inputElementRef.nativeElement, this.config);
            this.picker.dates.formatInput =  (date: DateTime) => this.ngGrid.format(date, this.format, false);
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
        } else {
            setTimeout(() => {
                this.inputElementRef.nativeElement.select();
            }, 0);
        }
    }

    ngOnDestroy() {
        if (this.picker) this.picker.dispose();
    }

    isPopup(): boolean {
        return true;
    }

    // returns the new value after editing
    getValue(): Date {
        if(this.ngGrid.isInFindMode()) {
            return this.inputElementRef.nativeElement.value;
        } else {
            const parsed = this.formattingService.parse(this.inputElementRef.nativeElement.value, this.format, false, this.selectedValue);
            if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
            return null;
        }
    }

    public dateChanged(event: any) {
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
        import(`@eonasdan/tempus-dominus/dist/locales/${language}.js`).then(
            (module: { localization: { [key: string]: string } }) => {
                this.config.localization = module.localization;
                if (this.picker !== null) this.picker.updateOptions(this.config);
            },
            () => {
                // ignore
            });
    }
}
