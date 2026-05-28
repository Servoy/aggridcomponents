import { mount } from 'cypress/angular';
import { LicenseManager, ModuleRegistry, AllEnterpriseModule } from 'ag-grid-enterprise';

const licenseKey = Cypress.env('AG_GRID_LICENSE');
if (licenseKey) {
    LicenseManager.setLicenseKey(licenseKey);
}
ModuleRegistry.registerModules([AllEnterpriseModule]);

declare global {
    namespace Cypress {
        interface Chainable {
            mount: typeof mount;
        }
    }
}

Cypress.Commands.add('mount', mount);
