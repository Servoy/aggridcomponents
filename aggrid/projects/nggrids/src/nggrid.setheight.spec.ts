import { TestBed } from '@angular/core/testing';
import { Renderer2, ChangeDetectorRef } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { NGGridDirective } from './nggrid';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

class TestGrid extends NGGridDirective {
    getColumn(): any {
 return null; 
}
    getColumnIndex(): number {
 return -1; 
}
    getColumnFormat(): any {
 return null; 
}
    getEditingRowIndex(): number {
 return -1; 
}
    isInFindMode(): boolean {
 return false; 
}
    getValuelist(): any {
 return null; 
}
    getValuelistForFilter(): any {
 return null; 
}
    hasValuelistResolvedDisplayData(): boolean {
 return false; 
}
}

interface SetHeightHarness {
    component: TestGrid;
    element: HTMLElement;
    setGridOptionSpy: ReturnType<typeof vi.fn>;
    isInAbsoluteLayout: ReturnType<typeof vi.fn>;
    setLiveApi: () => void;
    clearLiveApi: () => void;
    setResponsiveHeight: (value: number | undefined) => void;
}

describe('NGGridDirective.setHeight change-detection hardening (SVY-21358)', () => {
    let harness: SetHeightHarness;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule],
            providers: [
                { provide: Renderer2, useValue: {} },
                { provide: ChangeDetectorRef, useValue: { detectChanges: () => { /* noop */ } } }
            ]
        }).compileComponents();

        const component = TestBed.runInInjectionContext(() => new TestGrid());

        const isInAbsoluteLayout = vi.fn().mockReturnValue(true);
        (component as any).servoyApi = () => ({ isInAbsoluteLayout });

        component.agGridOptions = {} as any;

        const element = document.createElement('div');
        (component as any).agGridElementRef = () => ({ nativeElement: element });

        const setGridOptionSpy = vi.fn();
        const fakeApi = { setGridOption: setGridOptionSpy, isDestroyed: () => true };

        harness = {
            component,
            element,
            setGridOptionSpy,
            isInAbsoluteLayout,
            setLiveApi: () => {
 (component as any).agGrid = () => ({ api: fakeApi }); 
},
            clearLiveApi: () => {
 (component as any).agGrid = () => undefined; 
},
            setResponsiveHeight: (value: number | undefined) => {
 (component as any).responsiveHeight = () => value; 
}
        };

        harness.clearLiveApi();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('absolute layout no-op', () => {
        it('does nothing when in absolute layout', () => {
            harness.isInAbsoluteLayout.mockReturnValue(true);
            harness.setResponsiveHeight(100);
            harness.setLiveApi();

            harness.component.setHeight();

            expect(harness.setGridOptionSpy).not.toHaveBeenCalled();
            expect(harness.element.style.height).toBe('');
        });
    });

    describe('init-time (no live API): applies synchronously to agGridOptions', () => {
        beforeEach(() => {
            harness.isInAbsoluteLayout.mockReturnValue(false);
            harness.clearLiveApi();
        });

        it('responsiveHeight < 0 -> autoHeight and clears inline height', () => {
            harness.setResponsiveHeight(-1);

            harness.component.setHeight();

            expect(harness.component.agGridOptions.domLayout).toBe('autoHeight');
            expect(harness.element.style.height).toBe('');
        });

        it('responsiveHeight > 0 -> normal and Npx inline height', () => {
            harness.setResponsiveHeight(250);

            harness.component.setHeight();

            expect(harness.component.agGridOptions.domLayout).toBe('normal');
            expect(harness.element.style.height).toBe('250px');
        });

        it('responsiveHeight 0 -> normal and 100% inline height', () => {
            harness.setResponsiveHeight(0);

            harness.component.setHeight();

            expect(harness.component.agGridOptions.domLayout).toBe('normal');
            expect(harness.element.style.height).toBe('100%');
        });

        it('responsiveHeight undefined -> normal and 100% inline height', () => {
            harness.setResponsiveHeight(undefined);

            harness.component.setHeight();

            expect(harness.component.agGridOptions.domLayout).toBe('normal');
            expect(harness.element.style.height).toBe('100%');
        });
    });

    describe('live grid (API present): defers the DOM/style mutation', () => {
        beforeEach(() => {
            harness.isInAbsoluteLayout.mockReturnValue(false);
            harness.setLiveApi();
            vi.useFakeTimers();
        });

        it('does NOT mutate synchronously within the setHeight call', () => {
            harness.setResponsiveHeight(250);

            harness.component.setHeight();

            expect(harness.setGridOptionSpy).not.toHaveBeenCalled();
            expect(harness.element.style.height).toBe('');
        });

        it('applies normal + Npx after the timer flushes (responsiveHeight > 0)', () => {
            harness.setResponsiveHeight(250);

            harness.component.setHeight();
            vi.advanceTimersByTime(0);

            expect(harness.setGridOptionSpy).toHaveBeenCalledWith('domLayout', 'normal');
            expect(harness.element.style.height).toBe('250px');
        });

        it('applies autoHeight + clears inline height after the timer flushes (responsiveHeight < 0)', () => {
            harness.setResponsiveHeight(-1);
            harness.element.style.height = '999px';

            harness.component.setHeight();
            expect(harness.setGridOptionSpy).not.toHaveBeenCalled();

            vi.advanceTimersByTime(0);

            expect(harness.setGridOptionSpy).toHaveBeenCalledWith('domLayout', 'autoHeight');
            expect(harness.element.style.height).toBe('');
        });

        it('applies normal + 100% after the timer flushes (responsiveHeight 0/undefined)', () => {
            harness.setResponsiveHeight(0);

            harness.component.setHeight();
            vi.advanceTimersByTime(0);

            expect(harness.setGridOptionSpy).toHaveBeenCalledWith('domLayout', 'normal');
            expect(harness.element.style.height).toBe('100%');
        });
    });

    describe('destruction guard: deferred applyHeight no-ops after destroy', () => {
        beforeEach(() => {
            harness.isInAbsoluteLayout.mockReturnValue(false);
            harness.setLiveApi();
            vi.useFakeTimers();
        });

        it('does not mutate when the component is destroyed before the timer flushes', () => {
            harness.setResponsiveHeight(250);

            harness.component.setHeight();
            (harness.component as any).destroyed = true;
            vi.advanceTimersByTime(0);

            expect(harness.setGridOptionSpy).not.toHaveBeenCalled();
            expect(harness.element.style.height).toBe('');
        });
    });
});
