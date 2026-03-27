import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AppSettingsService } from '@core/services/app-settings.service';
import { PageOrganizerStore } from '@features/page-organizer/presentation/state/page-organizer.store';

@Component({
    selector: 'app-page-organizer-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [PageOrganizerStore],
    templateUrl: './page-organizer-page.component.html',
})
export class PageOrganizerPageComponent {
    protected readonly appSettings = inject(AppSettingsService);
    protected readonly store = inject(PageOrganizerStore);
    protected readonly isDragActive = signal(false);

    protected onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDragActive.set(true);
    }

    protected onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.isDragActive.set(false);
    }

    protected async onDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
        this.isDragActive.set(false);

        const file = event.dataTransfer?.files?.item(0);

        if (file) {
            await this.store.loadFile(file);
        }
    }

    protected async onManualFileInput(event: Event): Promise<void> {
        const target = event.target as HTMLInputElement;
        const file = target.files?.item(0);

        if (file) {
            await this.store.loadFile(file);
        }

        target.value = '';
    }

    protected onMoveUp(index: number): void {
        this.store.movePageUp(index);
    }

    protected onMoveDown(index: number): void {
        this.store.movePageDown(index);
    }

    protected onRotateLeft(index: number): void {
        this.store.rotatePageLeft(index);
    }

    protected onRotateRight(index: number): void {
        this.store.rotatePageRight(index);
    }

    protected onRemove(index: number): void {
        this.store.removePage(index);
    }

    protected async onDownloadClicked(): Promise<void> {
        await this.store.downloadPdf();
    }
}
