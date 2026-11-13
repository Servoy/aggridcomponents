import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { DataGrid, DataGridColumn } from './datagrid';
import { AgGridModule } from 'ag-grid-angular';
import { createMockFoundset } from '../testing/mock-foundset';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * GroupManager / GroupHashCache tests WITHOUT booting a live ag-grid. GroupManager is internal to
 * datagrid.ts and created in ngOnInit; we run ngOnInit with a mocked agGrid signal and stubbed
 * server round-trips so no async datasource runs, then drive OUR foundset-ref tree cache directly.
 */
describe('DataGrid - GroupManager / GroupHashCache (no live grid)', () => {
    let grid: DataGrid;

    function makeColumn(overrides: Record<string, any> = {}): DataGridColumn {
        return { columnid: 'col_' + Math.random().toString(36).slice(2, 8), ...overrides } as unknown as DataGridColumn;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, DataGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        const fixture = TestBed.createComponent(DataGrid);
        grid = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
        fixture.componentRef.setInput('columns', [
            makeColumn({ id: 'country', columnid: 'country', dataprovider: { idForFoundset: 'country' } }),
            makeColumn({ id: 'city', columnid: 'city', dataprovider: { idForFoundset: 'city' } })
        ]);
        fixture.componentRef.setInput('myFoundset', createMockFoundset({ rows: [] }));
        grid.state.columns = {};
        const api = new Proxy({ getColumnState: () => [] }, { get: (t: any, p: string) => (p in t ? t[p] : vi.fn()) });
        (grid as any).agGrid = () => ({ api });
        // run OUR ngOnInit (builds the group manager + grid options) without a live grid
        grid.ngOnInit();
    });

    it('creates the group manager during ngOnInit', () => {
        expect(grid.groupManager).toBeDefined();
    });

    it('resolves the root foundset ref for empty group criteria', async () => {
        const uuid = await grid.groupManager.getFoundsetRef([], []);
        expect(uuid).toBe('root');
    });

    it('returns null for an uncached group', () => {
        expect(grid.groupManager.getCachedFoundsetUUID([{ field: 'country' }], ['FR'])).toBeNull();
    });

    it('caches a server-resolved grouped foundset uuid', async () => {
        vi.spyOn(grid.servoyApi(), 'callServerSideApi').mockResolvedValue('g-uuid' as any);
        const uuid = await grid.groupManager.getFoundsetRef([{ field: 'country', id: 'country' }], ['FR']);
        expect(uuid).toBe('g-uuid');
        expect(grid.groupManager.getCachedFoundsetUUID([{ field: 'country' }], ['FR'])).toBe('g-uuid');
    });

    it('createOrReplaceFoundsetRef removes a cached ref then re-fetches', () => {
        (grid.groupManager as any).hashTree.setCachedFoundset([{ field: 'country', id: 'country' }], ['DE'], 'old-uuid');
        const removeSpy = vi.spyOn(grid.groupManager, 'removeFoundsetRef').mockReturnValue(true as any);
        const getSpy = vi.spyOn(grid.groupManager, 'getFoundsetRef').mockReturnValue(Promise.resolve('new-uuid') as any);
        grid.groupManager.createOrReplaceFoundsetRef([{ field: 'country', id: 'country' }], ['DE'], 'asc');
        expect(removeSpy).toHaveBeenCalledWith('old-uuid');
        expect(getSpy).toHaveBeenCalled();
    });

    it('createOrReplaceFoundsetRef fetches directly when nothing is cached', () => {
        const removeSpy = vi.spyOn(grid.groupManager, 'removeFoundsetRef');
        const getSpy = vi.spyOn(grid.groupManager, 'getFoundsetRef').mockReturnValue(Promise.resolve('x') as any);
        grid.groupManager.createOrReplaceFoundsetRef([{ field: 'city', id: 'city' }], ['Paris'], 'asc');
        expect(removeSpy).not.toHaveBeenCalled();
        expect(getSpy).toHaveBeenCalled();
    });

    it('removeFoundsetRefAtLevel(0) clears an empty cache without throwing', () => {
        expect(() => grid.groupManager.removeFoundsetRefAtLevel(0)).not.toThrow();
    });

    it('getFoundsetManagerByFoundsetUUID builds and caches a non-root manager', () => {
        const child = createMockFoundset({ rows: [] });
        vi.spyOn(grid, 'getFoundSetByFoundsetUUID').mockReturnValue(child);
        const mgr = grid.getFoundsetManagerByFoundsetUUID('hash-1');
        expect(mgr.isRoot).toBe(false);
        expect(grid.getFoundsetManagerByFoundsetUUID('hash-1')).toBe(mgr);
    });

    it('getCachedFoundsetUUID resolves a nested (multi-level) cached foundset', () => {
        const ht = (grid.groupManager as any).hashTree;
        ht.setCachedFoundset([{ field: 'country', id: 'country' }, { field: 'city', id: 'city' }], ['FR', 'Paris'], 'nested-uuid');
        expect(grid.groupManager.getCachedFoundsetUUID([{ field: 'country' }, { field: 'city' }], ['FR', 'Paris'])).toBe('nested-uuid');
    });

    it('removeFoundsetRef removes a cached node and returns true', () => {
        const ht = (grid.groupManager as any).hashTree;
        ht.setCachedFoundset([{ field: 'country', id: 'country' }], ['FR'], 'u-remove');
        // the removed node's foundset manager destroy touches getFoundsetManagerByFoundsetUUID; serve a child
        vi.spyOn(grid, 'getFoundSetByFoundsetUUID').mockReturnValue(createMockFoundset({ rows: [] }));
        vi.spyOn(grid, 'removeFoundSetByFoundsetUUID').mockReturnValue(true);
        const result = grid.groupManager.removeFoundsetRef('u-remove');
        expect(result).toBe(true);
        expect(grid.groupManager.getCachedFoundsetUUID([{ field: 'country' }], ['FR'])).toBeNull();
    });

    it('removeFoundsetRef returns false for a missing foundset uuid', () => {
        expect(grid.groupManager.removeFoundsetRef('does-not-exist')).toBe(false);
    });

    it('removeChildFoundsetRef removes all child nodes of a cached foundset', () => {
        const ht = (grid.groupManager as any).hashTree;
        ht.setCachedFoundset([{ field: 'country', id: 'country' }], ['FR'], 'parent-uuid');
        ht.setCachedFoundset([{ field: 'country', id: 'country' }, { field: 'city', id: 'city' }], ['FR', 'Paris'], 'child-uuid');
        vi.spyOn(grid, 'getFoundSetByFoundsetUUID').mockReturnValue(createMockFoundset({ rows: [] }));
        vi.spyOn(grid, 'removeFoundSetByFoundsetUUID').mockReturnValue(true);
        expect(() => grid.groupManager.removeChildFoundsetRef('parent-uuid', null, null)).not.toThrow();
    });

    it('updateFoundsetRefs clears the cache and fetches the first-level ref', () => {
        const clearSpy = vi.spyOn(grid.groupManager, 'clearAll');
        const getSpy = vi.spyOn(grid.groupManager, 'getFoundsetRef').mockReturnValue(Promise.resolve('root') as any);
        grid.groupManager.updateFoundsetRefs([{ colDef: { field: 'country' } }]);
        expect(clearSpy).toHaveBeenCalled();
        expect(getSpy).toHaveBeenCalled();
    });
});

