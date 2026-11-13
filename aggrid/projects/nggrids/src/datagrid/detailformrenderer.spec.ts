import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DetailFormRenderer } from './detailformrenderer';

/**
 * Unit tests for DetailFormRenderer. The DataGrid parent and its servoyApi are mocked; we drive
 * OUR agInit height resolution, item template/state delegation, handler wiring and datachange
 * propagation. ag-grid cell-renderer params are plain objects.
 */
describe('DetailFormRenderer', () => {
    let renderer: DetailFormRenderer;
    let dataGrid: any;

    function makeParams(overrides: Record<string, any> = {}): any {
        return {
            data: { _svyFoundsetIndex: 0 },
            node: { rowIndex: 0 },
            context: { componentParent: dataGrid },
            ...overrides
        };
    }

    beforeEach(() => {
        dataGrid = {
            detailRowHeight: vi.fn().mockReturnValue(0),
            onDetailFormSetup: vi.fn().mockReturnValue(null),
            getRecord: vi.fn().mockReturnValue({ _svyRowId: 'r0' }),
            myFoundset: vi.fn().mockReturnValue({ viewPort: { startIndex: 0, rows: [{ _svyRowId: 'r0' }] } }),
            detailForm: vi.fn().mockReturnValue(null),
            getDetailItemTemplate: vi.fn().mockReturnValue('tmpl'),
            getDetailItemState: vi.fn().mockReturnValue({ name: 'x' }),
            servoyApi: () => ({})
        };
        renderer = new DetailFormRenderer();
    });

    describe('agInit', () => {
        it('defaults the height to 200 when no detail row height is configured', () => {
            renderer.agInit(makeParams());
            expect(renderer.height).toBe(200);
        });

        it('uses the configured detail row height', () => {
            dataGrid.detailRowHeight.mockReturnValue(350);
            renderer.agInit(makeParams());
            expect(renderer.height).toBe(350);
        });

        it('lets onDetailFormSetup override the height', () => {
            dataGrid.onDetailFormSetup.mockReturnValue(vi.fn().mockReturnValue({ height: 500 }));
            renderer.agInit(makeParams());
            expect(renderer.height).toBe(500);
        });

        it('caches the detail form when it has child elements', () => {
            dataGrid.detailForm.mockReturnValue({ childElements: [{ name: 'a' }] });
            renderer.agInit(makeParams());
            expect(renderer.formComponentCache).toEqual({ childElements: [{ name: 'a' }] });
        });

        it('leaves the form cache unset when the detail form has no children', () => {
            dataGrid.detailForm.mockReturnValue({});
            renderer.agInit(makeParams());
            expect(renderer.formComponentCache).toBeUndefined();
        });
    });

    describe('getItemTemplate / getItemState', () => {
        it('delegates the template lookup to the grid', () => {
            renderer.agInit(makeParams());
            expect(renderer.getItemTemplate({ name: 'a' })).toBe('tmpl');
            expect(dataGrid.getDetailItemTemplate).toHaveBeenCalled();
        });

        it('delegates the state lookup to the grid', () => {
            renderer.agInit(makeParams());
            expect(renderer.getItemState({ name: 'a' })).toEqual({ name: 'x' });
        });
    });

    describe('getHandler', () => {
        it('returns a record-bound handler when the child element has mapped handlers', () => {
            const boundHandler = { bound: true };
            const handler = { selectRecordHandler: vi.fn().mockReturnValue(boundHandler) };
            dataGrid.detailForm.mockReturnValue({
                childElements: [{ name: 'x', mappedHandlers: new Map([['onClick', handler]]) }]
            });
            renderer.agInit(makeParams());
            const result = renderer.getHandler({ name: 'x' }, 'onClick');
            expect(result).toBe(boundHandler);
            expect(handler.selectRecordHandler).toHaveBeenCalledWith('r0');
        });

        it('returns null when there is no matching child element', () => {
            dataGrid.detailForm.mockReturnValue({ childElements: [] });
            renderer.agInit(makeParams());
            expect(renderer.getHandler({ name: 'x' }, 'onClick')).toBeNull();
        });
    });

    describe('datachange', () => {
        it('updates the model and forwards the change to the child element', () => {
            const sendChanges = vi.fn();
            dataGrid.detailForm.mockReturnValue({
                childElements: [{ name: 'x', sendChanges }]
            });
            renderer.agInit(makeParams());
            const state = { name: 'x', model: { a: 1 } };
            renderer.datachange(state, 'a', 2, true);
            expect(state.model.a).toBe(2);
            expect(sendChanges).toHaveBeenCalledWith('a', 2, 1, 'r0', true);
        });
    });

    describe('refresh / destroy', () => {
        it('refresh always returns false (no in-place refresh)', () => {
            expect(renderer.refresh({} as any)).toBe(false);
        });

        it('destroy is a safe no-op', () => {
            expect(() => renderer.destroy()).not.toThrow();
        });
    });
});
