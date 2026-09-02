import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ServoyApiTesting, ServoyPublicTestingModule } from '@servoy/public';

import { PowerGrid } from './powergrid';

describe('PowerGrid - addRowExpandedState (SVY-21409)', () => {
    let component: PowerGrid;
    let fixture: ComponentFixture<PowerGrid>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PowerGrid],
            imports: [ServoyPublicTestingModule],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(PowerGrid);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('servoyApi', new ServoyApiTesting());
    });

    it('should create', () => {
        expect(component).toBeTruthy();
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
        const emitSpy = jasmine.createSpy('expandedStateChange');
        const sub = component._internalExpandedStateChange.subscribe(emitSpy);

        component.addRowExpandedState(['groupA']);

        expect(emitSpy).toHaveBeenCalledTimes(1);
        const emitted = emitSpy.calls.mostRecent().args[0];
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
        const emitSpy = jasmine.createSpy('expandedStateChange');
        const sub = component._internalExpandedStateChange.subscribe(emitSpy);

        component.addRowExpandedState(['groupA']);
        component.addRowExpandedState(['groupB']);

        expect(emitSpy).toHaveBeenCalledTimes(2);

        sub.unsubscribe();
    });
});
