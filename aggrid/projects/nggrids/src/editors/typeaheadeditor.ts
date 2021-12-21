import { ViewChild } from '@angular/core';
import { HostListener } from '@angular/core';
import { Input } from '@angular/core';
import { Component } from '@angular/core';
import { NgbTypeahead, NgbTypeaheadConfig } from '@ng-bootstrap/ng-bootstrap';
import { merge, Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { FormattingService } from '@servoy/public';
import { EditorDirective } from './editor';

@Component({
    selector: 'aggrid-typeahededitor',
    template: `
      <input class="ag-table-typeahed-editor-input"
        [value]="initialDisplayValue"
        [maxLength]="maxLength"
        [style.width.px]="width"
        [ngbTypeahead]="filterValues"
        [resultFormatter]="resultFormatter"
		    [inputFormatter]="inputFormatter"
        (focus)="focus$.next('')"
        #instance="ngbTypeahead" #element>
    `
})
export class TypeaheadEditor extends EditorDirective {

  @ViewChild('instance') instance: NgbTypeahead;
  @Input() initialDisplayValue: any;
  @Input() maxLength = 524288;

  focus$ = new Subject<string>();

  width: number;
  valuelist: any;
  hasRealValues: boolean;
  format: any;
  valuelistValues: any;

  constructor(private formatService: FormattingService, config: NgbTypeaheadConfig) {
    super();
    config.container = 'body';
  }

  @HostListener('keydown',['$event']) onKeyDown(e: KeyboardEvent) {
    if(this.ngGrid.arrowsUpDownMoveWhenEditing && this.ngGrid.arrowsUpDownMoveWhenEditing !== 'NONE') {
        const isNavigationLeftRightKey = e.keyCode === 37 || e.keyCode === 39;
        const isNavigationUpDownEntertKey = e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13;

        if (isNavigationLeftRightKey || isNavigationUpDownEntertKey) {
            e.stopPropagation();
        }
    }
  }

  @HostListener('keypress',['$event']) onKeyPress(e: KeyboardEvent) {
      const isNavigationLeftRightKey = e.keyCode === 37 || e.keyCode === 39;
      const isNavigationUpDownEntertKey = e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13;

      if(!(isNavigationLeftRightKey || isNavigationUpDownEntertKey) && this.format) {
        return this.ngGrid.formattingService.testForNumbersOnly(e, null, this.elementRef.nativeElement, false, true, this.format, false);
      } else return true;
  }

  agInit(params: any): void {
    super.agInit(params);

    if(params.column.actualWidth) {
      this.width = params.column.actualWidth;
    }

    this.valuelist = this.ngGrid.getValuelist(params);
    if (this.valuelist) {
      this.valuelist.filterList('').subscribe((valuelistValues: any) => {
        this.valuelistValues = valuelistValues;
        let hasRealValues = false;
        for (const item of valuelistValues) {
          if (item.realValue !== item.displayValue) {
            hasRealValues = true;
            break;
          }
        }
        this.hasRealValues = hasRealValues;
        // make sure initial value has the "realValue" set, so when oncolumndatachange is called
        // the previous value has the "realValue"
        if(hasRealValues && params.value && (params.value['realValue'] === undefined)) {
          params.node['data'][params.column.colDef['field']] = {realValue: params.value, displayValue: params.value};
        }
      });
    }

    if(this.initialValue && this.initialValue.displayValue !== undefined) {
      this.initialValue = this.initialValue.displayValue;
    }
    let v = this.initialValue;
    const column = this.ngGrid.getColumn(params.column.getColId());
    if(column && column.format) {
        this.format = column.format;
        if (this.format.maxLength) {
            this.maxLength = this.format.maxLength;
        }
        if(this.format.edit) {
            v = this.ngGrid.formattingService.format(v, this.format, true);
        } else if(this.format.display) {
            v = this.ngGrid.formattingService.format(v, this.format, false);
        }
    }
    this.initialDisplayValue = v;
  }

  filterValues = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$).pipe( switchMap(term =>
      term === '' ? of(this.valuelistValues) : this.valuelist.filterList(term))) as Observable<readonly any[]>;

  };

  // focus and select can be done after the gui is attached
  ngAfterViewInit(): void {
    const editFormat = this.format.edit ? this.format.edit : this.format.display;
    if(this.format && editFormat && this.format.isMask) {
        const settings = {};
        settings['placeholder'] = this.format.placeHolder ? this.format.placeHolder : ' ';
        if (this.format.allowedCharacters)
            settings['allowedCharacters'] = this.format.allowedCharacters;

        //TODO: jquery mask
        //$(this.eInput).mask(editFormat, settings);
    }
    setTimeout(() => {
      this.elementRef.nativeElement.focus();
    }, 0);
  }

  // returns the new value after editing
  getValue(): any {
    let displayValue = this.elementRef.nativeElement.value;

    if(this.format) {
        const editFormat = this.format.edit ? this.format.edit : this.format.display;
        if(editFormat) {
            displayValue = this.ngGrid.formattingService.unformat(displayValue, editFormat, this.format.type, this.initialValue);
        }
        if (this.format.type === 'TEXT' && (this.format.uppercase || this.format.lowercase)) {
            if (this.format.uppercase) displayValue = displayValue.toUpperCase();
            else if (this.format.lowercase) displayValue = displayValue.toLowerCase();
        }
    }
    let realValue = displayValue;

    if (this.valuelist) {
      let hasMatchingDisplayValue = false;
      const fDisplayValue = this.findDisplayValue(this.valuelist, displayValue);
      if(fDisplayValue != null) {
        hasMatchingDisplayValue = fDisplayValue['hasMatchingDisplayValue'];
        realValue = fDisplayValue['realValue'];
      }

      if (!hasMatchingDisplayValue) {
        if (this.hasRealValues) {
          // if we still have old value do not set it to null or try to  get it from the list.
          if (this.initialValue != null && this.initialValue !== displayValue) {
            // so invalid thing is typed in the list and we are in real/display values, try to search the real value again to set the display value back.
            for (const vvalue of this.valuelist) {
              //TODO: compare trimmed values, typeahead will trim the selected value
              if (this.initialValue === vvalue.displayValue) {
                realValue = vvalue.realValue;
                break;
              }
            }
          } else if(this.initialValue == null) { // if the dataproviderid was null and we are in real|display then reset the value to ""
            displayValue = realValue = '';
          }
        }
      }
    }

    return {displayValue, realValue};
  }

  resultFormatter = (result: {displayValue: string; realValue: any}) => {
    if (result.displayValue === null) return '';
    return this.formatService.format(result.displayValue, this.format, false);
  };

  inputFormatter = (result: any) => {
    if (result === null) return '';
    if (result.displayValue !== undefined) result = result.displayValue;
    else if (this.valuelist.hasRealValues()) {
      // on purpose test with == so that "2" equals to 2
      // eslint-disable-next-line eqeqeq
      const value = this.valuelist.find((item: any) => item.realValue == result);
      if (value) {
        result = value.displayValue;
      }
    }
    return this.formatService.format(result, this.format, false);
  };

  private findDisplayValue(vl: any, displayValue: any) {
    if(vl) {
      for (const vvalue of vl) {
        //TODO: compare trimmed values, typeahead will trim the selected value
        if (displayValue === vvalue.displayValue) {
          return { hasMatchingDisplayValue: true, realValue: vvalue.realValue };
        }
      }
    }
    return null;
  }
}
