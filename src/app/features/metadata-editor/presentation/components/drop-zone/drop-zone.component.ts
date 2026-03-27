import { Component, inject, output, signal } from '@angular/core';
import { AppSettingsService } from '@core/services/app-settings.service';

@Component({
    selector: 'app-drop-zone',
    standalone: true,
    templateUrl: './drop-zone.component.html',
})
export class DropZoneComponent {
    protected readonly appSettings = inject(AppSettingsService);
    readonly fileSelected = output<File>();

    protected readonly isDragActive = signal(false);

    protected onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDragActive.set(true);
    }

    protected onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.isDragActive.set(false);
    }

    protected onDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDragActive.set(false);

        const file = event.dataTransfer?.files?.item(0);

        if (file) {
            this.fileSelected.emit(file);
        }
    }

    protected onManualFileInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const file = target.files?.item(0);

        if (file) {
            this.fileSelected.emit(file);
        }

        target.value = '';
    }
}
