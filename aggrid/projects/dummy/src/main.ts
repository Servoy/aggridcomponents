import { bootstrapApplication } from '@angular/platform-browser';
import { Component, ChangeDetectionStrategy, provideZonelessChangeDetection } from '@angular/core';

@Component({
    selector: 'app-root',
    template: '<div></div>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true
})
class AppComponent {}

bootstrapApplication(AppComponent, {
    providers: [provideZonelessChangeDetection()]
});
