import { Component, inject } from '@angular/core';
import { AppSettingsService } from '@core/services/app-settings.service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-shell-layout',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './shell-layout.component.html',
})
export class ShellLayoutComponent {
    protected readonly appSettings = inject(AppSettingsService);

    protected onThemeToggle(): void {
        this.appSettings.toggleTheme();
    }

    protected onLanguageToggle(): void {
        this.appSettings.toggleLanguage();
    }
}
