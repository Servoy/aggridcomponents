import { PowerGridColumn } from '../powergrid/powergrid';

export function createPowerGridColumns(): PowerGridColumn[] {
    const col1: Partial<PowerGridColumn> = {
        headerText: 'ID',
        id: 'id',
        dataprovider: 'id',
        width: 100,
        enableSort: true,
        enableResize: true,
        visible: true
    };

    const col2: Partial<PowerGridColumn> = {
        headerText: 'Country',
        id: 'country',
        dataprovider: 'country',
        width: 150,
        enableSort: true,
        enableResize: true,
        visible: true
    };

    const col3: Partial<PowerGridColumn> = {
        headerText: 'City',
        id: 'city',
        dataprovider: 'city',
        width: 150,
        enableSort: true,
        enableResize: true,
        visible: true
    };

    return [col1, col2, col3] as PowerGridColumn[];
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
