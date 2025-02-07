import { ITooltipComp, ITooltipParams } from 'ag-grid-community';

export class CustomTooltip implements ITooltipComp {

    eGui: HTMLElement;

    init(params: ITooltipParams) {
        this.eGui = document.createElement('div');
        this.eGui.className = 'tooltip-inner ag-table-' + params.location + '-tooltip'; // ag-table-header-tooltip or ag-table-cell-tooltip
        this.eGui.innerHTML = params.value;
    }

    getGui(): HTMLElement {
        return this.eGui;
    }
}
