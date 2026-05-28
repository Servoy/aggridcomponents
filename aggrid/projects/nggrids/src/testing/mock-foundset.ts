import { IFoundset, ViewPort, ViewPortRow, FoundsetChangeListener, RequestInfoPromise } from '@servoy/public';

export function createMockFoundset(config?: Partial<{
    serverSize: number;
    rows: ViewPortRow[];
    selectedRowIndexes: number[];
    sortColumns: string;
    multiSelect: boolean;
    hasMoreRows: boolean;
}>): IFoundset {
    const rows: ViewPortRow[] = config?.rows ?? [
        { _svyRowId: '1.1;_0' },
        { _svyRowId: '1.2;_1' },
        { _svyRowId: '1.3;_2' },
        { _svyRowId: '1.4;_3' },
        { _svyRowId: '1.5;_4' },
        { _svyRowId: '1.6;_5' },
        { _svyRowId: '1.7;_6' },
        { _svyRowId: '1.8;_7' },
        { _svyRowId: '1.9;_8' },
        { _svyRowId: '1.10;_9' }
    ];

    const viewPort: ViewPort = {
        startIndex: 0,
        size: rows.length,
        rows
    };

    const changeListeners: FoundsetChangeListener[] = [];

    const foundset: IFoundset = {
        foundsetId: 1,
        serverSize: config?.serverSize ?? rows.length,
        viewPort,
        selectedRowIndexes: config?.selectedRowIndexes ?? [0],
        sortColumns: config?.sortColumns ?? '',
        multiSelect: config?.multiSelect ?? false,
        hasMoreRows: config?.hasMoreRows ?? false,
        findMode: false,
        columnFormats: {},

        loadRecordsAsync(_startIndex: number, _size: number): RequestInfoPromise<any> {
            return Promise.resolve(true) as RequestInfoPromise<any>;
        },
        loadExtraRecordsAsync(_negativeOrPositiveCount: number, _dontNotifyYet?: boolean): RequestInfoPromise<any> {
            return Promise.resolve(true) as RequestInfoPromise<any>;
        },
        loadLessRecordsAsync(_negativeOrPositiveCount: number, _dontNotifyYet?: boolean): RequestInfoPromise<any> {
            return Promise.resolve(true) as RequestInfoPromise<any>;
        },
        notifyChanged(): void {},
        sort(_sortColumns: Array<{ name: string; direction: 'asc' | 'desc' }>): RequestInfoPromise<any> {
            return Promise.resolve(true) as RequestInfoPromise<any>;
        },
        requestSelectionUpdate(selectedRowIdxs: number[]): RequestInfoPromise<any> {
            foundset.selectedRowIndexes = selectedRowIdxs;
            return Promise.resolve(selectedRowIdxs) as RequestInfoPromise<any>;
        },
        columnDataChangedByRowId(_rowID: string, _columnName: string, _newValue: any, _oldValue: any): Promise<any> {
            return Promise.resolve(true);
        },
        columnDataChanged(_rowIndex: number, _columnName: string, _newValue: any, _oldValue: any): Promise<any> {
            return Promise.resolve(true);
        },
        updateViewportRecord(_rowID: string, _columnID: string, _newValue: any, _oldValue: any): void {},
        getRecordRefByRowID(rowId: string): object {
            return { _svyRowId: rowId };
        },
        setPreferredViewportSize(_preferredSize: number, _sendViewportWithSelection?: boolean, _centerViewportOnSelected?: boolean): void {},
        addChangeListener(changeListener: FoundsetChangeListener): () => void {
            changeListeners.push(changeListener);
            return () => {
                const idx = changeListeners.indexOf(changeListener);
                if (idx >= 0) changeListeners.splice(idx, 1);
            };
        },
        removeChangeListener(changeListener: FoundsetChangeListener): void {
            const idx = changeListeners.indexOf(changeListener);
            if (idx >= 0) changeListeners.splice(idx, 1);
        }
    };

    return foundset;
}
