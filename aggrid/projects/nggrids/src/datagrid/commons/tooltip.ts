import { ITooltipComp, ITooltipParams } from '@ag-grid-community/core';;

export class CustomTooltip implements ITooltipComp {

    eGui: HTMLElement;

    init(params: ITooltipParams) {
        this.eGui = document.createElement('div');
        this.eGui.className = 'tooltip-inner';
        this.eGui.innerHTML = params.value;
    }

    getGui(): HTMLElement {
        return this.eGui;
    }
}
