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

// viewport rect: left 100, top 50, 400x300 => right edge 500, bottom edge 350
const RECT = { left: 100, top: 50, width: 400, height: 300, right: 500, bottom: 350, x: 100, y: 50, toJSON: () => ({}) } as DOMRect;

describe('NGGridDirective.handleDragViewportScroll (SVY-21513)', () => {
    let component: TestGrid;

    const buildAgGrid36Dom = () => {
        const container = document.createElement('div');
        const viewport = document.createElement('div');
        viewport.className = 'ag-grid-viewport';
        const hProxy = document.createElement('div');
        hProxy.className = 'ag-body-horizontal-scroll-viewport';
        container.appendChild(viewport);
        container.appendChild(hProxy);
        const rectSpy = vi.fn(() => RECT);
        const scrollSpy = vi.fn();
        const proxyScrollSpy = vi.fn();
        (viewport as any).getBoundingClientRect = rectSpy;
        (viewport as any).scrollBy = scrollSpy;
        (hProxy as any).scrollBy = proxyScrollSpy;
        return { container, viewport, hProxy, rectSpy, scrollSpy, proxyScrollSpy };
    };

    const dragEvent = (currentTarget: any, clientX: number, clientY: number) => ({ currentTarget, clientX, clientY });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule],
            providers: [
                { provide: Renderer2, useValue: {} },
                { provide: ChangeDetectorRef, useValue: { detectChanges: () => { /* noop */ } } }
            ]
        }).compileComponents();
        component = TestBed.runInInjectionContext(() => new TestGrid());
        vi.useFakeTimers();
    });

    afterEach(() => {
        component.cancelDragViewportScroll();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('missing DOM / null safety', () => {
        it('does not throw, cache anything, or start an interval when the viewport is missing (legacy ag-body-viewport markup)', () => {
            const container = document.createElement('div');
            const legacy = document.createElement('div');
            legacy.className = 'ag-body-viewport';
            container.appendChild(legacy);
            const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

            expect(() => component.handleDragViewportScroll(dragEvent(container, 0, 0))).not.toThrow();

            expect(component.dragViewport).toBeFalsy();
            expect(component.dragViewportRect).toBeFalsy();
            expect(component.dragViewportScrollInterval).toBeFalsy();
            expect(setIntervalSpy).not.toHaveBeenCalled();
        });

        it('returns early when currentTarget is null', () => {
            expect(() => component.handleDragViewportScroll(dragEvent(null, 0, 0))).not.toThrow();
            expect(component.dragViewportRect).toBeFalsy();
            expect(component.dragViewportScrollInterval).toBeFalsy();
        });

        it('retries the lookup on a later dragover once the viewport appears', () => {
            const container = document.createElement('div');
            component.handleDragViewportScroll(dragEvent(container, 300, 200));
            expect(component.dragViewport).toBeFalsy();

            const dom = buildAgGrid36Dom();
            container.appendChild(dom.viewport);
            component.handleDragViewportScroll(dragEvent(container, 300, 200));

            expect(component.dragViewport).toBe(dom.viewport);
            expect(component.dragViewportRect).toBe(RECT);
        });
    });

    describe('AG Grid 36 markup', () => {
        it('caches .ag-grid-viewport as vertical and horizontal target and its rect', () => {
            const dom = buildAgGrid36Dom();

            component.handleDragViewportScroll(dragEvent(dom.container, 300, 200));

            expect(component.dragViewport).toBe(dom.viewport);
            expect(component.dragViewportHorizontalScrollViewport).toBe(dom.viewport);
            expect(component.dragViewportRect).toBe(RECT);
            expect(dom.rectSpy).toHaveBeenCalledTimes(1);
        });

        it('does not start an interval when the pointer is away from the edges', () => {
            const dom = buildAgGrid36Dom();

            component.handleDragViewportScroll(dragEvent(dom.container, 300, 200));
            vi.advanceTimersByTime(100);

            expect(component.dragViewportScrollInterval).toBeFalsy();
            expect(dom.scrollSpy).not.toHaveBeenCalled();
        });

        it('scrolls down (positive top) near the bottom edge', () => {
            const dom = buildAgGrid36Dom();

            component.handleDragViewportScroll(dragEvent(dom.container, 300, 345));
            vi.advanceTimersByTime(16);

            expect(dom.scrollSpy).toHaveBeenCalledWith({ left: 0, top: component.dragViewportScrollSpeed });
            expect(dom.proxyScrollSpy).not.toHaveBeenCalled();
        });

        it('scrolls up (negative top) near the top edge', () => {
            const dom = buildAgGrid36Dom();

            component.handleDragViewportScroll(dragEvent(dom.container, 300, 55));
            vi.advanceTimersByTime(16);

            expect(dom.scrollSpy).toHaveBeenCalledWith({ left: 0, top: -component.dragViewportScrollSpeed });
        });

        it('scrolls the viewport horizontally near the left and right edges', () => {
            const dom = buildAgGrid36Dom();

            component.handleDragViewportScroll(dragEvent(dom.container, 105, 200));
            vi.advanceTimersByTime(16);
            expect(dom.scrollSpy).toHaveBeenLastCalledWith({ left: -component.dragViewportScrollSpeed, top: 0 });

            component.handleDragViewportScroll(dragEvent(dom.container, 495, 200));
            vi.advanceTimersByTime(16);
            expect(dom.scrollSpy).toHaveBeenLastCalledWith({ left: component.dragViewportScrollSpeed, top: 0 });
        });

        it('stops the interval when the pointer leaves the edge zone', () => {
            const dom = buildAgGrid36Dom();

            component.handleDragViewportScroll(dragEvent(dom.container, 300, 345));
            vi.advanceTimersByTime(16);
            component.handleDragViewportScroll(dragEvent(dom.container, 300, 200));
            vi.advanceTimersByTime(16);
            const calls = dom.scrollSpy.mock.calls.length;
            vi.advanceTimersByTime(100);

            expect(component.dragViewportScrollInterval).toBeFalsy();
            expect(dom.scrollSpy.mock.calls.length).toBe(calls);
        });
    });

    describe('drag-end cleanup', () => {
        it('cancelDragViewportScroll clears the interval and cached fields', () => {
            const dom = buildAgGrid36Dom();
            component.handleDragViewportScroll(dragEvent(dom.container, 300, 345));
            expect(component.dragViewportScrollInterval).toBeTruthy();

            component.cancelDragViewportScroll();
            vi.advanceTimersByTime(100);

            expect(dom.scrollSpy).not.toHaveBeenCalled();
            expect(component.dragViewportScrollInterval).toBeNull();
            expect(component.dragViewport).toBeNull();
            expect(component.dragViewportRect).toBeNull();
            expect(component.dragViewportHorizontalScrollViewport).toBeNull();
        });
    });
});
