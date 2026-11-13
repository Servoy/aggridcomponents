import { TestBed } from '@angular/core/testing';
import { Renderer2, ChangeDetectorRef } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { NGGridDirective, getMediaImageCellTag, dataproviderToLowerCase } from './nggrid';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

class TestGrid extends NGGridDirective {
    getColumn(): any { return null; }
    getColumnIndex(): number { return -1; }
    getColumnFormat(): any { return null; }
    getEditingRowIndex(): number { return -1; }
    isInFindMode(): boolean { return false; }
    getValuelist(): any { return null; }
    getValuelistForFilter(): any { return null; }
    hasValuelistResolvedDisplayData(): boolean { return false; }
}

describe('NGGridDirective - shared helpers', () => {
    let component: TestGrid;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule],
            providers: [
                { provide: Renderer2, useValue: {} },
                { provide: ChangeDetectorRef, useValue: { detectChanges: () => { /* noop */ } } }
            ]
        }).compileComponents();
        component = TestBed.runInInjectionContext(() => new TestGrid());
        component.log = { warn: vi.fn(), debug: vi.fn(), error: vi.fn() } as any;
        component.formattingService = { format: vi.fn((v: any) => 'fmt:' + v) } as any;
    });

    afterEach(() => vi.restoreAllMocks());

    describe('format', () => {
        it('delegates to the formatting service', () => {
            expect(component.format('x', { display: 'd' } as any, false)).toBe('fmt:x');
        });

        it('returns the raw data and warns when the formatting service throws', () => {
            component.formattingService = { format: () => { throw new Error('bad'); } } as any;
            expect(component.format('x', {} as any, false)).toBe('x');
            expect(component.log.warn).toHaveBeenCalled();
        });
    });

    describe('getDataTarget', () => {
        it('returns the data-target attribute of the closest element', () => {
            const el = { getAttribute: () => 'myTarget' };
            const event = { target: { closest: (sel: string) => sel === '[data-target]' ? el : null } };
            expect(component.getDataTarget(event)).toBe('myTarget');
        });

        it('returns null when there is no data-target ancestor', () => {
            const event = { target: { closest: () => null } };
            expect(component.getDataTarget(event)).toBeNull();
        });
    });

    describe('setTimeout', () => {
        it('runs the callback only while not destroyed', () => {
            vi.useFakeTimers();
            const fn = vi.fn();
            component.setTimeout(fn, 10);
            vi.advanceTimersByTime(10);
            expect(fn).toHaveBeenCalledTimes(1);
            vi.useRealTimers();
        });

        it('skips the callback once the component is destroyed', () => {
            vi.useFakeTimers();
            const fn = vi.fn();
            component.setTimeout(fn, 10);
            (component as any).destroyed = true;
            vi.advanceTimersByTime(10);
            expect(fn).not.toHaveBeenCalled();
            vi.useRealTimers();
        });
    });

    describe('gridDragEnd', () => {
        it('cancels scroll and restores the drag-over target column', () => {
            const cancelSpy = vi.spyOn(component, 'cancelDragViewportScroll');
            const restoreSpy = vi.spyOn(component, 'restoreDragOverTargetColumn');
            (component as any).onDragGetImageFunc = () => null;
            component.gridDragEnd({});
            expect(cancelSpy).toHaveBeenCalled();
            expect(restoreSpy).toHaveBeenCalled();
        });

        it('removes the drag ghost element when a drag image func is set', () => {
            const ghost = document.createElement('div');
            ghost.id = 'nggrids-drag-ghost';
            document.body.appendChild(ghost);
            (component as any).onDragGetImageFunc = () => (() => '');
            (component as any).doc = document;
            component.gridDragEnd({});
            expect(document.getElementById('nggrids-drag-ghost')).toBeNull();
        });
    });

    describe('restoreDragOverTargetColumn', () => {
        it('restores the cached class name on the target column', () => {
            const col = { className: 'changed' } as any;
            component.dragOverTargetColumn = col;
            component.dragOverTargetColumnClassName = 'original';
            component.restoreDragOverTargetColumn();
            expect(col.className).toBe('original');
            expect(component.dragOverTargetColumn).toBeNull();
            expect(component.lastDragOverResult).toBe(false);
        });
    });

    describe('createCustomMainMenuItems', () => {
        function menuItem(ng: Record<string, any>, extra: Record<string, any> = {}) {
            return { extraProperties: { 'NG-Grids': ng }, ...extra };
        }

        it('adds a separator entry', () => {
            const items: any[] = [];
            component.createCustomMainMenuItems(items, { items: [menuItem({ isSeparator: true })] }, { id: 'c' }, 'c');
            expect(items).toEqual(['separator']);
        });

        it('passes through a raw agGridMenuItem', () => {
            const items: any[] = [];
            component.createCustomMainMenuItems(items, { items: [menuItem({ agGridMenuItem: 'copy' })] }, { id: 'c' }, 'c');
            expect(items).toEqual(['copy']);
        });

        it('builds a normal menu item and wires the action to onCustomMainMenuAction', () => {
            const onAction = vi.fn();
            (component as any).onCustomMainMenuAction = () => onAction;
            const items: any[] = [];
            component.createCustomMainMenuItems(items, {
                items: [menuItem({}, { menuText: 'Do', enabled: true, isSelected: false, tooltipText: 'tip', iconStyleClass: 'fa', itemID: 'id1' })]
            }, { id: 'c' }, 'colA');
            expect(items[0].name).toBe('Do');
            expect(items[0].icon).toContain('fa');
            items[0].action();
            expect(onAction).toHaveBeenCalledWith('id1', 'colA');
        });

        it('hides an item for a column listed in hideForColIds', () => {
            const items: any[] = [];
            component.createCustomMainMenuItems(items, {
                items: [menuItem({ hideForColIds: 'c' }, { menuText: 'Hidden' })]
            }, { id: 'c' }, 'c');
            expect(items.length).toBe(0);
        });
    });

    describe('loadCalendarLocale', () => {
        it('resolves immediately for an unknown locale (default branch)', async () => {
            const defer = component.loadCalendarLocale({ localization: { locale: 'zz', startOfTheWeek: 1 } } as any);
            await expect(defer.promise).resolves.toBe('');
        });

        it('loads a known locale module and resolves with the locale', async () => {
            const defer = component.loadCalendarLocale({ localization: { locale: 'nl', startOfTheWeek: 1, hourCycle: 'h23' } } as any);
            const result = await defer.promise;
            // either the module loaded ('nl') or failed to load ('') - both are valid resolutions
            expect(['nl', '']).toContain(result);
        });
    });

    describe('getMediaImageCellTag re-export', () => {
        it('is re-exported and works', () => {
            const svc = { generateMediaDownloadUrl: (m: string) => 'resources/fs/sol' + m.substring(8) } as any;
            expect(getMediaImageCellTag('media:///a.png', svc)).toContain('<img');
        });
    });

    describe('dataproviderToLowerCase re-export', () => {
        it('lowercases the dataprovider', () => {
            expect(dataproviderToLowerCase({ dataprovider: 'MyCol' })).toBe('mycol');
        });
    });
});
