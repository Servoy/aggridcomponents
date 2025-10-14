import { Component, ElementRef, Inject, Renderer2, ViewChild, DOCUMENT } from "@angular/core";
import { FilterDirective } from "./filter";
import { Format, FormattingService, getFirstDayOfWeek, MaskFormat, ServoyPublicService } from '@servoy/public';
import { DateTime as DateTimeLuxon} from 'luxon';
import { DateTime, Options, Namespace, TempusDominus } from '@eonasdan/tempus-dominus';


@Component({
  selector: 'aggrid-datagrid-datefilter',
  template: `
    <div><div class="{{ !isFloating ? 'ag-filter-body-wrapper ag-simple-filter-body-wrapper' : '' }}">
      <div [hidden]="isFloating" class="ag-picker-field ag-labeled ag-label-align-left ag-select ag-filter-select">
        <select style="width:100%;" [(ngModel)]="selectedFilterOperation" (change)="onFilterOperationChange($event)">
          <option value="equals">{{ equals }}</option>
          <option value="notEqual">{{ notEqual }}</option>
          <option value="lessThan">{{ lessThan }}</option>
          <option value="greaterThan">{{ greaterThan }}</option>
          <option value="inRange">{{ inRange }}</option>
          <option value="blank">{{ blank }}</option>
          <option value="notBlank">{{ notBlank }}</option>
        </select>
      </div>
      <div class="ag-filter-body">
        <div class="ag-input-wrapper">
          <div class="input-group" id="filterdatetimepicker" data-td-target-input="nearest" data-td-target-toggle="nearest" #filterdatetimepicker>
            <input class="ag-filter-filter ag-input-field-input form-control" type="text" id="filterText" autocomplete="off" data-td-target="#filterdatetimepicker" #element>
            <span class="input-group-text" data-td-target="#filterdatetimepicker" data-td-toggle="datetimepicker">
              <i class="fas fa-calendar"></i>
            </span>
          </div>
          <div [hidden]="isFloating || selectedFilterOperation !== 'inRange'" class="input-group" id="filterdatetimepickerTo" data-td-target-input="nearest" data-td-target-toggle="nearest" #filterdatetimepickerTo>
            <input class="ag-filter-filter ag-input-field-input form-control" type="text" id="filterTextTo" autocomplete="off" data-td-target="#filterdatetimepickerTo" #elementTo>
            <span class="input-group-text" data-td-target="#filterdatetimepickerTo" data-td-toggle="datetimepicker">
              <i class="fas fa-calendar"></i>
            </span>
          </div>
        </div>
      </div>
      @if (!suppressAndOrCondition()) {
        <div class="ag-filter-condition"><label>OR</label></div>
      }
      @if (!suppressAndOrCondition()) {
        <div class="ag-filter-body">
          <div class="ag-input-wrapper">
            <input class="ag-filter-filter ag-input-field-input" type="text" id="filterText1" autocomplete="off" #element1>
          </div>
        </div>
      }
    </div>
    @if (hasApplyButton()) {
      <div class="ag-filter-apply-panel">
        <button type="button" id="btnApplyFilter" class="ag-button ag-standard-button ag-filter-apply-panel-button" (click)="onApplyFilter()">{{ txtApplyFilter }}</button>
        <button type="button" id="btnClearFilter" class="ag-button ag-standard-button ag-filter-apply-panel-button" (click)="onClearFilter()">{{ txtClearFilter }}</button>
      </div>
    }</div>
    `,
  standalone: false
})
export class DateFilter extends FilterDirective {
    @ViewChild('elementTo') elementToRef: ElementRef;
    @ViewChild('filterdatetimepicker') filterdatetimepickerRef: ElementRef;
    @ViewChild('filterdatetimepickerTo') filterdatetimepickerToRef: ElementRef;
    picker: TempusDominus;
    pickerTo: TempusDominus;

    readonly config: Options = {
        allowInputToggle: false,
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
            theme: 'light',
            keyboardNavigation: true
        },
        restrictions: {
        },
        localization: {
            startOfTheWeek: 1,
            locale: 'en'
        }
    };

    equals: string;
    notEqual: string;
    lessThan: string;
    greaterThan: string;
    inRange: string;
    blank: string;
    notBlank: string;

    maskFormat : MaskFormat;
    maskFormatTo : MaskFormat;
    selectedFilterOperation: string = 'equals';

    constructor(private _renderer: Renderer2, servoyService: ServoyPublicService, private formattingService: FormattingService, @Inject(DOCUMENT) private doc: Document,) {
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

    agInit(params: any): void {
        super.agInit(params);

        this.equals = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['equals'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['equals'] : 'Equals';
        this.notEqual = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['notEqual'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['notEqual'] : 'Does not equal';
        this.lessThan = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['lessThan'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['lessThan'] : 'Before';
        this.greaterThan = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['greaterThan'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['greaterThan'] : 'After';
        this.inRange = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['inRange'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['inRange'] : 'Between';
        this.blank = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['blank'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['blank'] : 'Blank';
        this.notBlank = this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['notBlank'] ?
          this.ngGrid.agGridOptions['localeText'] && this.ngGrid.agGridOptions['localeText']['notBlank'] : 'Not blank';

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
      this.ngGrid.loadCalendarLocale(this.config).promise.then(() => {
        (this.elementRef.nativeElement as HTMLInputElement).value = '';
        (this.elementToRef.nativeElement as HTMLInputElement).value = '';

        this.picker = this.createDatepicker(this.filterdatetimepickerRef.nativeElement);
        this.pickerTo = this.createDatepicker(this.filterdatetimepickerToRef.nativeElement);

        setTimeout(() => {
            if (this.format.isMask) {
                this.maskFormat = new MaskFormat(this.format, this._renderer, this.elementRef.nativeElement, this.formattingService, this.doc);
                if(!this.isFloating) {
                  this.elementRef.nativeElement.focus();
                  this.elementRef.nativeElement.setSelectionRange(0, 0);
                }
                this.maskFormatTo = new MaskFormat(this.format, this._renderer, this.elementToRef.nativeElement, this.formattingService, this.doc);
            } else if (!this.isFloating) {
                this.elementRef.nativeElement.select();
            }
        }, 0);
      });
    }

    createDatepicker(element: HTMLInputElement): TempusDominus {
      const thePicker = new TempusDominus(element, this.config);
      thePicker.dates.formatInput =  (date: DateTime) => this.ngGrid.format(date, this.format, this.format.edit && !this.format.isMask);
      thePicker.dates.parseInput =  (value: string) => {
          const parsed = this.formattingService.parse(value?value.trim():null, this.format, this.format.edit && !this.format.isMask, null, true);
          if (parsed instanceof Date && !isNaN(parsed.getTime())) return  DateTime.convert(parsed, null, this.config.localization);
          return null;
      };
      thePicker.subscribe(Namespace.events.change, (event) => {
        if (thePicker) {
          thePicker.hide(); // Close the date picker
          this.valueChanged();
        }
      });
      thePicker.subscribe(Namespace.events.show, (event) => {
        const dateContainer = this.doc.getElementsByClassName('tempus-dominus-widget calendarWeeks show');
        if (dateContainer && dateContainer.length) {
            dateContainer[0].classList.add('ag-custom-component-popup');
        }
      });
      return thePicker;
    }

    getFilterUIValue(): any {
      return this.elementRef.nativeElement.value;
    }

    setFilterUIValue(value) {
      this.elementRef.nativeElement.value = value;
    }

    getFilterRealValue(second?: boolean): any {
      const displayValue = second ? this.getSecondFilterUIValue() : this.getFilterUIValue();
      const parsed = this.formattingService.parse(displayValue, this.format, this.format.edit && !this.format.isMask, null, true);
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
      return null;
    }

    onFilterOperationChange(event: Event): void {
      const operation = (event.target as HTMLSelectElement).value;
      this.selectedFilterOperation = operation;
    }

    getCondition(realValue): any {
      const condition = {
        filterType: 'date',
        type: this.selectedFilterOperation,
        uiValue: this.getFilterUIValue(),
      };

      const date = this.getFilterRealValue();
      if(date !== null) {
        condition['dateFrom'] = DateTimeLuxon.fromJSDate(date).toFormat('yyyy-MM-dd HH:mm:ss');
        condition['dateFromMs'] = date.getTime();
      }
      if(this.selectedFilterOperation === 'inRange') {
        const dateTo = this.getDateToRealValue();
        if(dateTo !== null) {
          condition['dateTo'] = DateTimeLuxon.fromJSDate(dateTo).toFormat('yyyy-MM-dd HH:mm:ss');
          condition['dateToMs'] = dateTo.getTime();
        }
      }

      return condition;
    }

    getCondition2(realValue): any {
      const condition2 = {
        filterType: 'date',
        type: this.selectedFilterOperation
      };

      const date = this.getFilterRealValue();
      if(date !== null) {
        condition2['dateFrom'] = DateTimeLuxon.fromJSDate(date).toFormat('yyyy-MM-dd HH:mm:ss');
        condition2['dateFromMs'] = date.getTime();
      }
      if(this.selectedFilterOperation === 'inRange') {
        const dateTo = this.getDateToRealValue();
        if(dateTo !== null) {
          condition2['dateTo'] = DateTimeLuxon.fromJSDate(dateTo).toFormat('yyyy-MM-dd HH:mm:ss');
          condition2['dateToMs'] = dateTo.getTime();
        }
      }

      return condition2;
    }

    getDateToRealValue(): any {
      const displayValue = this.elementToRef.nativeElement.value;
      const parsed = this.formattingService.parse(displayValue, this.format, this.format.edit && !this.format.isMask, null, true);
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
      return null;
    }

    onClearFilter() {
      super.onClearFilter();
      this.elementToRef.nativeElement.value = '';
    }

    ngOnDestroy() {
      if(this.maskFormat) this.maskFormat.destroy();
      if(this.maskFormatTo) this.maskFormatTo.destroy();
      if(this.picker) this.picker.dispose();
      if(this.pickerTo) this.pickerTo.dispose();
    }    
}