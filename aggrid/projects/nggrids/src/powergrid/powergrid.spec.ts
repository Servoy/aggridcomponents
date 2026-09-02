import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyPublicTestingModule, ServoyApiTesting } from '@servoy/public';
import { PowerGrid, PowerGridColumn } from './powergrid';
import { AgGridModule } from 'ag-grid-angular';
import { RowClassParams } from 'ag-grid-community';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PowerGrid - rowStyleClassFunc params argument (SVYX-1141)', () => {
    let component: PowerGrid;
    let getRowClass: (params: RowClassParams) => string | string[] | undefined;

    function setupWithRowStyleClassFunc(func: (...args: any[]) => any) {
        const rowStyleClassFunc = func;
        component.agGridOptions = component.agGridOptions || {} as any;
        component.agGridOptions.getRowClass =
            (params: RowClassParams) => {
                if (params.node.rowPinned) return '';
                return rowStyleClassFunc(params.rowIndex, (params.data || Object.assign(params.node.groupData as any, params.node.aggData)), null, params.node.group, params) as any;
            };
        getRowClass = component.agGridOptions.getRowClass as any;
    }

    function makeParams(overrides: Partial<RowClassParams> = {}): RowClassParams {
        return {
            rowIndex: 0,
            data: { name: 'test' },
            node: {
                rowPinned: null,
                group: false,
                groupData: {},
                aggData: {},
                leafGroup: false,
                level: 0,
                expanded: false,
                footer: false,
                allChildrenCount: null,
                key: null,
            } as any,
            api: {} as any,
            context: {},
            ...overrides
        } as any;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, PowerGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        const fixture = TestBed.createComponent(PowerGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
    });

    describe('backward compatibility with 4-parameter callbacks', () => {
        it('should work with a callback that only uses 4 parameters', () => {
            const fourArgFunc = vi.fn((rowIndex: number, _rowData: any, _event: any, isGroup: boolean) => {
                return isGroup ? 'group-row' : 'normal-row';
            });

            setupWithRowStyleClassFunc(fourArgFunc);

            const params = makeParams({ rowIndex: 2 });
            const result = getRowClass(params);

            expect(fourArgFunc).toHaveBeenCalledTimes(1);
            expect(result).toBe('normal-row');
        });

        it('should pass correct rowIndex as 1st argument', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams({ rowIndex: 5 });
            getRowClass(params);

            expect(spy.mock.calls[spy.mock.calls.length - 1][0]).toBe(5);
        });

        it('should pass row data as 2nd argument for non-group rows', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const rowData = { id: 1, name: 'Alice' };
            const params = makeParams({ data: rowData });
            getRowClass(params);

            expect(spy.mock.calls[spy.mock.calls.length - 1][1]).toBe(rowData);
        });

        it('should pass null as 3rd argument (event)', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            getRowClass(makeParams());

            expect(spy.mock.calls[spy.mock.calls.length - 1][2]).toBeNull();
        });

        it('should pass isGroup boolean as 4th argument', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            (params.node as any).group = true;
            getRowClass(params);

            expect(spy.mock.calls[spy.mock.calls.length - 1][3]).toBe(true);
        });
    });

    describe('5th argument: full RowClassParams', () => {
        it('should pass the full params object as the 5th argument', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            getRowClass(params);

            expect(spy.mock.calls[spy.mock.calls.length - 1][4]).toBe(params);
        });

        it('should provide params.node.leafGroup', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            (params.node as any).leafGroup = true;
            getRowClass(params);

            const receivedParams = spy.mock.calls[spy.mock.calls.length - 1][4];
            expect(receivedParams.node.leafGroup).toBe(true);
        });

        it('should provide params.node.level for grouping depth', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            (params.node as any).level = 3;
            getRowClass(params);

            const receivedParams = spy.mock.calls[spy.mock.calls.length - 1][4];
            expect(receivedParams.node.level).toBe(3);
        });

        it('should provide params.node.expanded', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            (params.node as any).expanded = true;
            getRowClass(params);

            const receivedParams = spy.mock.calls[spy.mock.calls.length - 1][4];
            expect(receivedParams.node.expanded).toBe(true);
        });

        it('should provide params.api', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const mockApi = { getSelectedRows: () => [] } as any;
            const params = makeParams({ api: mockApi });
            getRowClass(params);

            const receivedParams = spy.mock.calls[spy.mock.calls.length - 1][4];
            expect(receivedParams.api).toBe(mockApi);
        });

        it('should provide params.context', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const ctx = { myCustomProp: 42 };
            const params = makeParams({ context: ctx });
            getRowClass(params);

            const receivedParams = spy.mock.calls[spy.mock.calls.length - 1][4];
            expect(receivedParams.context).toBe(ctx);
        });

        it('should allow a 5-param callback to use params for styling decisions', () => {
            const fiveArgFunc = (_rowIndex: number, _rowData: any, _event: any, _isGroup: boolean, params: RowClassParams) => {
                if ((params.node as any).level === 0 && params.node.group) return 'top-level-group';
                if ((params.node as any).leafGroup) return 'leaf-group';
                return 'regular';
            };

            setupWithRowStyleClassFunc(fiveArgFunc);

            const topGroupParams = makeParams();
            (topGroupParams.node as any).group = true;
            (topGroupParams.node as any).level = 0;
            expect(getRowClass(topGroupParams)).toBe('top-level-group');

            const leafParams = makeParams();
            (leafParams.node as any).leafGroup = true;
            expect(getRowClass(leafParams)).toBe('leaf-group');

            const regularParams = makeParams();
            expect(getRowClass(regularParams)).toBe('regular');
        });
    });

    describe('group row handling', () => {
        it('should merge groupData and aggData for group rows without data', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            params.data = undefined as any;
            (params.node as any).group = true;
            (params.node as any).groupData = { country: 'US' };
            (params.node as any).aggData = { total: 100 };
            getRowClass(params);

            const rowData = spy.mock.calls[spy.mock.calls.length - 1][1];
            expect(rowData.country).toBe('US');
            expect(rowData.total).toBe(100);
        });

        it('should still pass params as 5th arg for group rows', () => {
            const spy = vi.fn().mockReturnValue('');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            params.data = undefined as any;
            (params.node as any).group = true;
            (params.node as any).groupData = { country: 'US' };
            (params.node as any).aggData = {};
            getRowClass(params);

            expect(spy.mock.calls[spy.mock.calls.length - 1][4]).toBe(params);
        });
    });

    describe('pinned row exclusion', () => {
        it('should return empty string for pinned rows', () => {
            const spy = vi.fn().mockReturnValue('should-not-reach');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            (params.node as any).rowPinned = 'top';
            const result = getRowClass(params);

            expect(result).toBe('');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should return empty string for bottom-pinned rows', () => {
            const spy = vi.fn().mockReturnValue('should-not-reach');
            setupWithRowStyleClassFunc(spy);

            const params = makeParams();
            (params.node as any).rowPinned = 'bottom';
            const result = getRowClass(params);

            expect(result).toBe('');
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('dataproviderToLowerCase inline expression (SVY-21388 / SVY-20337 regression)', () => {
        function dataproviderToLowerCase(column: Partial<PowerGridColumn>): string {
            return (column.dataprovider?.toLowerCase?.() || '');
        }

        it('should lowercase a mixed-case dataprovider', () => {
            expect(dataproviderToLowerCase({ dataprovider: 'MyColumn' })).toBe('mycolumn');
        });

        it('should return already-lowercase dataprovider unchanged', () => {
            expect(dataproviderToLowerCase({ dataprovider: 'mycolumn' })).toBe('mycolumn');
        });

        it('should return empty string for undefined dataprovider', () => {
            expect(dataproviderToLowerCase({ dataprovider: undefined } as any)).toBe('');
            expect(dataproviderToLowerCase({} as any)).toBe('');
        });

        it('should return empty string for null dataprovider', () => {
            expect(dataproviderToLowerCase({ dataprovider: null } as any)).toBe('');
        });

        it('should return empty string for empty string dataprovider', () => {
            expect(dataproviderToLowerCase({ dataprovider: '' })).toBe('');
        });
    });

    describe('edge cases', () => {
        it('should not set getRowClass when rowStyleClassFunc is undefined', () => {
            expect(component.agGridOptions?.getRowClass).toBeUndefined();
        });

        it('should handle callback returning undefined', () => {
            const spy = vi.fn().mockReturnValue(undefined);
            setupWithRowStyleClassFunc(spy);

            const result = getRowClass(makeParams());
            expect(result).toBeUndefined();
        });

        it('should handle callback returning an array of class names', () => {
            const func = () => ['class-a', 'class-b'];
            setupWithRowStyleClassFunc(func);

            const result = getRowClass(makeParams());
            expect(result).toEqual(['class-a', 'class-b']);
        });

        it('should handle callback returning empty string', () => {
            const func = () => '';
            setupWithRowStyleClassFunc(func);

            const result = getRowClass(makeParams());
            expect(result).toBe('');
        });
    });
});

describe('PowerGrid - addRowExpandedState (SVY-21409)', () => {
    let component: PowerGrid;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ServoyPublicTestingModule, FormsModule, AgGridModule, PowerGrid],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false }
        }).compileComponents();

        const fixture = TestBed.createComponent(PowerGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting() as any);
    });

    it('does not throw when expanded state is initially undefined (crash fix)', () => {
        expect(component.__internalExpandedState()).toBeUndefined();

        expect(() => component.addRowExpandedState(['J:982'])).not.toThrow();
    });

    it('creates the nested object structure on first expand when state is falsy', () => {
        component.__internalExpandedState.set(undefined);

        component.addRowExpandedState(['groupA']);

        const state = component.__internalExpandedState();
        expect(state).toBeDefined();
        expect(state).toEqual({ groupA: {} });
    });

    it('persists the expanded group into __internalExpandedState after first expand', () => {
        component.addRowExpandedState(['groupA']);

        const state = component.__internalExpandedState();
        expect(state).toBeDefined();
        expect(state.groupA).toEqual({});
    });

    it('emits the expanded-state object via _internalExpandedStateChange after an expand', () => {
        const emitSpy = vi.fn();
        const sub = component._internalExpandedStateChange.subscribe(emitSpy);

        component.addRowExpandedState(['groupA']);

        expect(emitSpy).toHaveBeenCalledTimes(1);
        const emitted = emitSpy.mock.calls[emitSpy.mock.calls.length - 1][0];
        expect(emitted).toBe(component.__internalExpandedState());
        expect(emitted).toEqual({ groupA: {} });

        sub.unsubscribe();
    });

    it('nests multiple group keys correctly', () => {
        component.addRowExpandedState(['groupA', 'groupB', 'groupC']);

        expect(component.__internalExpandedState()).toEqual({
            groupA: { groupB: { groupC: {} } }
        });
    });

    it('merges subsequent expands into the existing state without throwing', () => {
        component.addRowExpandedState(['groupA']);

        expect(() => component.addRowExpandedState(['groupA', 'child1'])).not.toThrow();
        expect(() => component.addRowExpandedState(['groupB'])).not.toThrow();

        expect(component.__internalExpandedState()).toEqual({
            groupA: { child1: {} },
            groupB: {}
        });
    });

    it('does not overwrite an already-expanded sibling key on re-expand', () => {
        component.addRowExpandedState(['groupA', 'child1']);
        component.addRowExpandedState(['groupA', 'child2']);

        expect(component.__internalExpandedState()).toEqual({
            groupA: { child1: {}, child2: {} }
        });
    });

    it('emits on each expand call', () => {
        const emitSpy = vi.fn();
        const sub = component._internalExpandedStateChange.subscribe(emitSpy);

        component.addRowExpandedState(['groupA']);
        component.addRowExpandedState(['groupB']);

        expect(emitSpy).toHaveBeenCalledTimes(2);

        sub.unsubscribe();
    });
});
