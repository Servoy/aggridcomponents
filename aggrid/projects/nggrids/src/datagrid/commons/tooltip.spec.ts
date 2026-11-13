import { describe, it, expect } from 'vitest';
import { CustomTooltip } from './tooltip';

/**
 * CustomTooltip is a tiny ag-grid ITooltipComp. We assert on OUR DOM-building logic for the
 * header/cell tooltip element.
 */
describe('CustomTooltip', () => {
    it('builds a header tooltip element with the value as innerHTML', () => {
        const tip = new CustomTooltip();
        tip.init({ location: 'header', value: '<b>hi</b>' } as any);
        const el = tip.getGui();
        expect(el.className).toBe('tooltip-inner ag-table-header-tooltip');
        expect(el.innerHTML).toBe('<b>hi</b>');
    });

    it('builds a cell tooltip element with the right class', () => {
        const tip = new CustomTooltip();
        tip.init({ location: 'cell', value: 'text' } as any);
        expect(tip.getGui().className).toBe('tooltip-inner ag-table-cell-tooltip');
    });
});
