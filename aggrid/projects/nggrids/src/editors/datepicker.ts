import { Component, Inject, Input, Renderer2 } from '@angular/core';
import { EditorDirective } from './editor';
import { ICellEditorParams } from '@ag-grid-community/core';
import { DOCUMENT } from '@angular/common';
import { Deferred, Format, FormattingService, getFirstDayOfWeek, MaskFormat, ServoyPublicService } from '@servoy/public';
import { DateTime as DateTimeLuxon} from 'luxon';
import { DateTime, Namespace, Options, TempusDominus } from '@eonasdan/tempus-dominus';

@Component({
    selector: 'aggrid-datepicker',
    template: `
    <div class="ag-input-wrapper">
      <input class="ag-cell-edit-input" #element>
    </div>
    `,
    providers: []
})
export class DatePicker extends EditorDirective {

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
    maskFormat : MaskFormat;

    constructor(private _renderer: Renderer2, servoyService: ServoyPublicService,  @Inject(DOCUMENT) private doc: Document, 
                private formattingService: FormattingService) {
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
    }

    agInit(params: ICellEditorParams): void {
        super.agInit(params);
        this.selectedValue = this.initialValue && this.initialValue.displayValue !== undefined ? this.initialValue.displayValue : this.initialValue;

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
        if(!showCalendar && showTime) {
            this.config.display.viewMode = 'clock';    
        }
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
            this.loadCalendarLocale(this.config.localization.locale).promise.then(() => {
                (this.elementRef.nativeElement as HTMLInputElement).value = '';
                this.picker = new TempusDominus(this.elementRef.nativeElement, this.config);
                (this.elementRef.nativeElement as HTMLInputElement).value = this.ngGrid.format(this.selectedValue, this.format, this.format.edit && !this.format.isMask)
                this.picker.dates.formatInput =  (date: DateTime) => this.ngGrid.format(date, this.format, this.format.edit && !this.format.isMask);
                this.picker.dates.parseInput =  (value: string) => {
                    const parsed = this.formattingService.parse(value?value.trim():null, this.format, this.format.edit && !this.format.isMask, this.selectedValue, true);
                    if (parsed instanceof Date && !isNaN(parsed.getTime())) return  DateTime.convert(parsed, null, this.config.localization);
                    return null;
                };
                if (this.selectedValue) {
                    this.picker.dates.setValue(DateTime.convert(this.selectedValue));
                }
                this.picker.subscribe(Namespace.events.change, (event) => this.dateChanged(event));
                setTimeout(() => {
                    if (this.format.isMask) {
                        this.maskFormat = new MaskFormat(this.format, this._renderer, this.elementRef.nativeElement, this.formattingService, this.doc);
                        this.elementRef.nativeElement.focus();
                        this.elementRef.nativeElement.setSelectionRange(0, 0);
                    } else {
                        this.elementRef.nativeElement.select();
                    }
                    this.picker.show();
                    const dateContainer = this.doc.getElementsByClassName('tempus-dominus-widget calendarWeeks show');
                    if (dateContainer && dateContainer.length) {
                        dateContainer[0].classList.add('ag-custom-component-popup');
                    }
                    this.elementRef.nativeElement.addEventListener('focusout', (event: Event) => event.stopPropagation());
                }, 0);
                this.picker.subscribe(Namespace.events.hide, () => this.params.stopEditing());
            });
        } else {
            setTimeout(() => {
                this.elementRef.nativeElement.select();
            }, 0);
        }
    }

    ngOnDestroy() {
        if(this.maskFormat) this.maskFormat.destroy();
        if (this.picker) this.picker.dispose();
    }

    isPopup(): boolean {
        return false;
    }

    // returns the new value after editing
    getValue(): Date {
        if(this.ngGrid.isInFindMode()) {
            return this.elementRef.nativeElement.value;
        } else {
            const parsed = this.formattingService.parse(this.elementRef.nativeElement.value, this.format, this.format.edit && !this.format.isMask, this.selectedValue, true);
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

     private loadCalendarLocale(locale: string): Deferred<any> {
        const localeDefer  = new Deferred();
        const index = locale.indexOf('-');
        let language = locale.toLowerCase();
        if (index > 0 && language !== 'ar-sa' && language !== 'sr-latn') {
            language = locale.substring(0, index);
        }
        const moduleLoader =  (module: { default: { localization: { [key: string]: string | number} }}) => {
            const copy = Object.assign({}, module.default.localization);
            copy.startOfTheWeek =   this.config.localization.startOfTheWeek;
            copy.hourCycle = this.config.localization.hourCycle;
            this.config.localization = copy;
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
}
