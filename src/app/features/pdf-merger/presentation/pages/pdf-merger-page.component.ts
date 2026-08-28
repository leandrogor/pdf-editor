import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AppSettingsService } from '@core/services/app-settings.service';
import { PdfMergerStore } from '@features/pdf-merger/presentation/state/pdf-merger.store';

@Component({
    selector: 'app-pdf-merger-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [PdfMergerStore],
    templateUrl: './pdf-merger-page.component.html',
})
export class PdfMergerPageComponent {
    protected readonly appSettings = inject(AppSettingsService);
    protected readonly store = inject(PdfMergerStore);
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

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            await this.store.addFiles(files);
        }
    }

    protected async onManualFileInput(event: Event): Promise<void> {
        const target = event.target as HTMLInputElement;
        const files = target.files;

        if (files && files.length > 0) {
            await this.store.addFiles(files);
        }

        target.value = '';
    }

    protected onMoveFileUp(index: number): void {
        this.store.moveFileUp(index);
    }

    protected onMoveFileDown(index: number): void {
        this.store.moveFileDown(index);
    }

    protected onRemoveFile(fileId: string): void {
        this.store.removeFile(fileId);
    }

    protected onMovePageUp(index: number): void {
        this.store.movePageUp(index);
    }

    protected onMovePageDown(index: number): void {
        this.store.movePageDown(index);
    }

    protected onRotateLeft(index: number): void {
        this.store.rotatePageLeft(index);
    }

    protected onRotateRight(index: number): void {
        this.store.rotatePageRight(index);
    }

    protected onRemovePage(index: number): void {
        this.store.removePage(index);
    }

    protected onClearAll(): void {
        this.store.clearAll();
    }

    protected async onDownloadClicked(): Promise<void> {
        await this.store.downloadMergedPdf();
    }

    protected formatFileSize(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}
