import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSettingsService } from '@core/services/app-settings.service';
import {
    CompressionLevel,
    CompressionMode,
    SizeUnit,
} from '@features/pdf-compressor/domain/models/pdf-compress-options.model';
import { PdfCompressorStore } from '@features/pdf-compressor/presentation/state/pdf-compressor.store';

@Component({
    selector: 'app-pdf-compressor-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [PdfCompressorStore],
    templateUrl: './pdf-compressor-page.component.html',
})
export class PdfCompressorPageComponent {
    protected readonly appSettings = inject(AppSettingsService);
    protected readonly store = inject(PdfCompressorStore);
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

    protected onSelectMode(mode: CompressionMode): void {
        this.store.setMode(mode);
    }

    protected onSelectLevel(level: CompressionLevel): void {
        this.store.setLevel(level);
    }

    protected onTargetValueInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const num = Number.parseFloat(target.value);
        this.store.setTargetValue(Number.isNaN(num) ? null : num);
    }

    protected onTargetUnitChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        const unit = target.value as SizeUnit;
        this.store.setTargetUnit(unit);
    }

    protected async onCompressClicked(): Promise<void> {
        await this.store.compress();
    }

    protected onDownloadClicked(): void {
        this.store.download();
    }

    protected onResetClicked(): void {
        this.store.clearFile();
    }

    protected formatBytes(bytes: number): string {
        if (!bytes || bytes <= 0) {
            return '0 B';
        }

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const formatted = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2);

        return `${formatted} ${sizes[i]}`;
    }
}
