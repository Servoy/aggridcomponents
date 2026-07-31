import { ChangeDetectionStrategy, Component, Inject, input, viewChild, signal, DOCUMENT } from '@angular/core';
import { NgbTypeahead, NgbTypeaheadConfig } from '@ng-bootstrap/ng-bootstrap';
import { merge, Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { FormattingService, IPopupSupportComponent } from '@servoy/public';
import { EditorDirective } from './editor';

@Component({
    selector: 'aggrid-typeahededitor',
    template: `
      <input class="ag-table-typeahed-editor-input"
        [svyTabFix]="this"
        [value]="_initialDisplayValue()"
        [maxLength]="_maxLength()"
        [style.width.px]="width"
        [ngbTypeahead]="filterValues"
        [resultFormatter]="resultFormatter"
		[inputFormatter]="inputFormatter"
        (focus)="focus$.next('')"
        (keydown)="onTypeaheadKeyDown($event)"
        (keyup.arrowDown)="scroll()" (keyup.arrowUp)="scroll()"
        #instance="ngbTypeahead" #element>
    `,
    host: {
      'style': 'width: 100%; height: 100%;',
      '(keydown)': 'onKeyDown($event)',
      '(keypress)': 'onKeyPress($event)'
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class TypeaheadEditor extends EditorDirective implements IPopupSupportComponent{

  readonly instance = viewChild<NgbTypeahead>('instance');
  readonly initialDisplayValue = input<any>(undefined);
  readonly maxLength = input(524288);
  
  _maxLength = signal(524288);
  _initialDisplayValue = signal<any>(undefined);

  focus$ = new Subject<string>();

  width!: number;
  hasRealValues!: boolean;
  format: any;
  initParams: any;
  valuelistValues: any;
  initialRealValue: any;

  findModeListener: any;
  private popupObserver!: MutationObserver;

  constructor(private formatService: FormattingService, config: NgbTypeaheadConfig, @Inject(DOCUMENT) private doc: Document) {
    super();
    config.container = 'body';
  }

  onKeyDown(e: KeyboardEvent) {
    const arrowsUpDownMoveWhenEditing = this.ngGrid.arrowsUpDownMoveWhenEditing();
    if(arrowsUpDownMoveWhenEditing && arrowsUpDownMoveWhenEditing !== 'NONE') {
        const isNavigationLeftRightKey = e.keyCode === 37 || e.keyCode === 39;
        const isNavigationUpDownEntertKey = e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13;

        if (isNavigationLeftRightKey || isNavigationUpDownEntertKey) {
            e.stopPropagation();
        }
    }
  }

  onTypeaheadKeyDown(e: KeyboardEvent) {
    if(e.keyCode === 13 && this.ngGrid.editNextCellOnEnter()) {
      this.instance()!.dismissPopup();
      this.ngGrid.agGrid()!.api.tabToNextCell();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  scroll() {
    if (!this.instance()!.isPopupOpen()) {
      return;
    }
    setTimeout(() => {
      const popup = this.doc.getElementById(this.instance()!.popupId);
      if (popup) {
        popup.style.width = this.elementRef()!.nativeElement.offsetWidth + 'px';
        const activeElements = popup.getElementsByClassName('active');
        if (activeElements.length === 1) {
          const elem = activeElements[0] as HTMLElement;
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  private observePopupOpen() {
    if (this.popupObserver) {
      this.popupObserver.disconnect();
    }
    this.popupObserver = new MutationObserver(() => {
      const popup = this.doc.getElementById(this.instance()!.popupId);
      if (popup) {
        popup.style.width = this.elementRef()!.nativeElement.offsetWidth + 'px';
        this.popupObserver.disconnect();
        this.popupObserver = null!;
      }
    });
    this.popupObserver.observe(this.doc.body, { childList: true, subtree: true });
  }

  onKeyPress(e: KeyboardEvent) {
      const isNavigationLeftRightKey = e.keyCode === 37 || e.keyCode === 39;
      const isNavigationUpDownEntertKey = e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13;

      if(!(isNavigationLeftRightKey || isNavigationUpDownEntertKey) && this.format) {
        return this.ngGrid.formattingService.testForNumbersOnly(e, null, this.elementRef()!.nativeElement, false, true, this.format, false);
      } else return true;
  }

  agInit(params: any): void {
    super.agInit(params);
    this._initialDisplayValue.set(this.initialDisplayValue());
    this._maxLength.set(this.maxLength());
    this.initParams = params;

    if(params.column.actualWidth) {
      this.width = params.column.actualWidth;
    }

    let valuelist = this.ngGrid.getValuelist(params);
    if (valuelist && this.ngGrid.hasValuelistResolvedDisplayData()) {
      valuelist.filterList('').subscribe((valuelistValues: any) => {
        this.valuelistValues = valuelistValues;
        this.hasRealValues = valuelist!.hasRealValues();
        if(this.hasRealValues && params.value && (params.value['realValue'] === undefined)) {
          let rv = this.initialValue;
          let rvFound = false;
          for (const item of valuelistValues) {
            if (item.displayValue === this.initialValue) {
              rv = item.realValue;
              rvFound = true;
              break;
            }
          }
          if(!rvFound) {
            valuelist = this.ngGrid.getValuelist(params);
            valuelist!.filterList(params.value).subscribe((valuelistWithInitialValue: any) => {
              for (const item of valuelistWithInitialValue) {
                if (item.displayValue === this.initialValue) {
                  rv = item.realValue;
                  break;
                }
              }
              params.node['data'][params.column.colDef['field']] = {realValue: rv, displayValue: this.initialValue};
              this.initialRealValue = rv;
            });
          } else {
            params.node['data'][params.column.colDef['field']] = {realValue: rv, displayValue: this.initialValue};
            this.initialRealValue = rv;
          }
        }
        else if(this.hasRealValues && params.value && params.value['realValue']) {
            this.initialRealValue = params.value['realValue'];
        }
      });
    }

    this.initialRealValue = this.initialValue;
    this._initialDisplayValue.set(this.initialValue);
    this.format = this.ngGrid.getColumnFormat(params.column.getColId());
    if(this.format && this.format.maxLength) {
      this._maxLength.set(this.format.maxLength);
    }
    
  }

  filterValues = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$).pipe( switchMap(term => {
      const valuelist = this.ngGrid.getValuelist(this.initParams);
      let valuelistObs: Observable<readonly any[]>;
      if(valuelist) {
        valuelistObs = valuelist.filterList(term);
        valuelistObs.subscribe(
            valuelistValues => this.valuelistValues = valuelistValues
        );
      } else {
        valuelistObs = of([]);
      }
      return valuelistObs;
    }));
  };

  ngAfterViewInit(): void {
    const editFormat = this.format?.edit ? this.format.edit : this.format?.display;
    if (this.format && editFormat && this.format.isMask) {
        const settings: Record<string, any> = {};
        settings['placeholder'] = this.format.placeHolder ? this.format.placeHolder : ' ';
        if (this.format.allowedCharacters)
            settings['allowedCharacters'] = this.format.allowedCharacters;

        //TODO: jquery mask
        //$(this.eInput).mask(editFormat, settings);
    }
    setTimeout(() => {
      this.elementRef()!.nativeElement.focus();
      this.elementRef()!.nativeElement.select();
      if(this.ngGrid.editNextCellOnEnter()) {
        this.focus$.next(this._initialDisplayValue());
      }
      this.observePopupOpen();
      if(this.ngGrid.isInFindMode()) {
        this.findModeListener = (e: KeyboardEvent) => {
          if(e.keyCode === 13) {
            this.ngGrid.agGrid()!.api.stopEditing();
          }
        };
        this.elementRef()!.nativeElement.addEventListener('keydown', this.findModeListener);
      }
    }, 0);
  }

  ngOnDestroy() {
    if (this.popupObserver) {
      this.popupObserver.disconnect();
      this.popupObserver = null!;
    }
    if(this.ngGrid.isInFindMode()) {
      this.elementRef()!.nativeElement.removeEventListener('keydown', this.findModeListener);
    }
  }

  getValue(): any {
    let displayValue = this.elementRef()!.nativeElement.value;
    let realValue = displayValue;

    if (this.valuelistValues) {
      let hasMatchingDisplayValue = false;
      const fDisplayValue = this.findDisplayValue(this.valuelistValues, displayValue);
      if(fDisplayValue != null) {
        hasMatchingDisplayValue = fDisplayValue['hasMatchingDisplayValue'];
        realValue = fDisplayValue['realValue'];
      }

      if (!hasMatchingDisplayValue) {
        if (this.hasRealValues) {
          if (this.initialValue != null) {
            displayValue = this._initialDisplayValue();
            realValue = this.initialRealValue;
          } else if(this.initialValue == null) {
            displayValue = realValue = '';
          }
        }
      }
    }

    return {displayValue, realValue};
  }

  resultFormatter = (result: {displayValue: string; realValue: any}) => {    
    if (result.displayValue === null || result.displayValue == '') return '\u00A0';
    return result.displayValue;
  };

  inputFormatter = (result: any) => {
    if (result === null) return '';
    if (result.displayValue !== undefined) result = result.displayValue;
    else if (this.valuelistValues.hasRealValues()) {
      // eslint-disable-next-line eqeqeq
      const value = this.valuelistValues.find((item: any) => item.realValue == result);
      if (value) {
        result = value.displayValue;
      }
    }
    return result;
  };


  closePopup(){
    this.instance()!.dismissPopup();
  }

  private findDisplayValue(vl: any, displayValue: any) {
    if(vl) {
      for (const vvalue of vl) {
        if (displayValue === vvalue.displayValue) {
          return { hasMatchingDisplayValue: true, realValue: vvalue.realValue };
        }
      }
    }
    return null;
  }
}
