import { Injectable } from "@angular/core";
import { DatagridService } from "../datagrid.service";
import { PowergridService } from "../../powergrid/powergrid.service";
import { AllEnterpriseModule, LicenseManager, ModuleRegistry } from "ag-grid-enterprise";
import { AgChartsEnterpriseModule } from 'ag-charts-enterprise';
import type { DragTransferData } from "../../nggrid";

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
    constructor(public datagridService: DatagridService, public powergridService: PowergridService) {
      const licenseKey = datagridService.licenseKey ? datagridService.licenseKey : powergridService.licenseKey ? datagridService.licenseKey : null;
      if(licenseKey) LicenseManager.setLicenseKey(licenseKey);
      ModuleRegistry.registerModules(licenseKey ? [AllEnterpriseModule.with(AgChartsEnterpriseModule)] : [AllEnterpriseModule]);
    }

    private dragData: DragTransferData | null = null;

    // shared by Data Grid and Power Grid so drag data is available when dragging between the two grid types
    setDragData(dragData: DragTransferData | null) {
      this.dragData = dragData;
    }

    getDragData(): DragTransferData | null {
      return this.dragData;
    }
}
