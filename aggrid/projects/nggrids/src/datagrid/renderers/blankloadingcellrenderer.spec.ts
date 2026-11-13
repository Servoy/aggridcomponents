import { describe, it, expect } from 'vitest';
import { BlankLoadingCellRendrer } from './blankloadingcellrenderer';

/**
 * The blank loading-cell renderer is deliberately empty; these tests just lock in that its
 * ag-grid lifecycle hooks are callable no-ops so the class stays safe to instantiate.
 */
describe('BlankLoadingCellRendrer', () => {
    it('agInit and afterGuiAttached are safe no-ops', () => {
        const r = new BlankLoadingCellRendrer();
        expect(() => r.agInit({} as any)).not.toThrow();
        expect(() => r.afterGuiAttached!()).not.toThrow();
    });
});
