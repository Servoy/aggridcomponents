import { PowerGridColumn } from '../powergrid/powergrid';

export function createPowerGridColumns(): PowerGridColumn[] {
    const col1 = new PowerGridColumn();
    col1.headerText = 'ID';
    col1.id = 'id';
    col1.dataprovider = 'id';
    col1.width = 100;
    col1.enableSort = true;
    col1.enableResize = true;
    col1.visible = true;

    const col2 = new PowerGridColumn();
    col2.headerText = 'Country';
    col2.id = 'country';
    col2.dataprovider = 'country';
    col2.width = 150;
    col2.enableSort = true;
    col2.enableResize = true;
    col2.visible = true;

    const col3 = new PowerGridColumn();
    col3.headerText = 'City';
    col3.id = 'city';
    col3.dataprovider = 'city';
    col3.width = 150;
    col3.enableSort = true;
    col3.enableResize = true;
    col3.visible = true;

    return [col1, col2, col3];
}

export function createPowerGridData(): any {
    return {
        columnNames: ['id', 'country', 'city'],
        rows: [
            [1, 'France', 'Paris'],
            [2, 'Germany', 'Berlin'],
            [3, 'Brazil', 'Rio de Janeiro'],
            [4, 'USA', 'New York'],
            [5, 'Austria', 'Vienna'],
            [6, 'Sweden', 'Stockholm'],
            [7, 'Finland', 'Helsinki'],
            [8, 'Mexico', 'Mexico City'],
            [9, 'Switzerland', 'Bern'],
            [10, 'Belgium', 'Brussels']
        ]
    };
}
