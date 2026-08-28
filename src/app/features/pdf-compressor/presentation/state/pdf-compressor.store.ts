import { computed, inject, Injectable, signal } from '@angular/core';
import { mapPdfErrorKey } from '@core/error-handling/pdf-error.mapper';
import { AppSettingsService } from '@core/services/app-settings.service';
import { PdfCompressorFacade } from '@features/pdf-compressor/application/pdf-compressor.facade';
import {
    CompressionLevel,
    CompressionMode,
    PdfCompressOptions,
    PdfCompressResult,
    SizeUnit,
} from '@features/pdf-compressor/domain/models/pdf-compress-options.model';
import { MAX_PDF_SIZE_BYTES } from '@shared/constants/file.constants';
import { isPdfFile } from '@shared/utils/pdf-file.utils';

export type CompressorStatus = 'idle' | 'loading' | 'compressing' | 'ready' | 'error';

@Injectable()
export class PdfCompressorStore {
    private readonly facade = inject(PdfCompressorFacade);
    private readonly appSettings = inject(AppSettingsService);

    readonly status = signal<CompressorStatus>('idle');
    readonly selectedFile = signal<File | null>(null);
    readonly mode = signal<CompressionMode>('preset');
    readonly level = signal<CompressionLevel>('medium');
    readonly targetValue = signal<number | null>(3);
    readonly targetUnit = signal<SizeUnit>('MB');
    readonly result = signal<PdfCompressResult | null>(null);
    readonly errorMessage = signal('');

    readonly hasFile = computed(() => this.selectedFile() !== null);
    readonly isBusy = computed(() => this.status() === 'loading' || this.status() === 'compressing');
    readonly hasResult = computed(() => this.result() !== null);

    readonly targetSizeBytes = computed(() => {
        const value = this.targetValue();
        if (value === null || Number.isNaN(value) || value <= 0) {
            return null;
        }

        const multiplier = this.targetUnit() === 'MB' ? 1024 * 1024 : 1024;
        return Math.round(value * multiplier);
    });

    readonly originalFileSize = computed(() => this.selectedFile()?.size ?? 0);

    readonly isFileAlreadySmallerThanTarget = computed(() => {
        if (this.mode() !== 'target') {
            return false;
        }

        const target = this.targetSizeBytes();
        if (target === null) {
            return false;
        }

        return this.originalFileSize() > 0 && this.originalFileSize() <= target;
    });

    async loadFile(file: File | null | undefined): Promise<void> {
        this.clearError();

        if (!file) {
            return;
        }

        if (!isPdfFile(file)) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t('errorOnlyPdf'));
            return;
        }

        if (file.size > MAX_PDF_SIZE_BYTES) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t('errorTooLarge'));
            return;
        }

        this.selectedFile.set(file);
        this.result.set(null);
        this.status.set('idle');

        // Set default target values close to half of current size if not set
        const mbSize = file.size / (1024 * 1024);
        if (mbSize < 1) {
            this.targetUnit.set('KB');
            this.targetValue.set(Math.max(50, Math.round(file.size / 1024 / 2)));
        } else {
            this.targetUnit.set('MB');
            this.targetValue.set(Math.max(1, Math.round(mbSize / 2)));
        }
    }

    setMode(mode: CompressionMode): void {
        this.clearError();
        this.mode.set(mode);
        this.result.set(null);
    }

    setLevel(level: CompressionLevel): void {
        this.clearError();
        this.level.set(level);
        this.result.set(null);
    }

    setTargetValue(value: number | null): void {
        this.clearError();
        this.targetValue.set(value);
        this.result.set(null);
    }

    setTargetUnit(unit: SizeUnit): void {
        this.clearError();
        this.targetUnit.set(unit);
        this.result.set(null);
    }

    async compress(): Promise<void> {
        const file = this.selectedFile();
        if (!file) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t('errorAtLeastOneFile'));
            return;
        }

        if (this.mode() === 'target') {
            const targetBytes = this.targetSizeBytes();
            if (targetBytes === null || targetBytes <= 0) {
                this.status.set('error');
                this.errorMessage.set(this.appSettings.t('compressInvalidTarget'));
                return;
            }
        }

        this.clearError();
        this.status.set('compressing');

        try {
            const options: PdfCompressOptions = {
                mode: this.mode(),
                level: this.mode() === 'preset' ? this.level() : undefined,
                targetSizeBytes: this.mode() === 'target' ? (this.targetSizeBytes() ?? undefined) : undefined,
            };

            const compressionResult = await this.facade.compressFile(file, options);
            this.result.set(compressionResult);
            this.status.set('ready');
        } catch (error) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    download(): void {
        const res = this.result();
        const file = this.selectedFile();
        if (!res || !file) {
            return;
        }

        this.facade.downloadCompressedFile(res.bytes, file.name);
    }

    clearFile(): void {
        this.selectedFile.set(null);
        this.result.set(null);
        this.status.set('idle');
        this.errorMessage.set('');
    }

    clearError(): void {
        this.errorMessage.set('');
        if (this.status() !== 'error') {
            return;
        }

        if (this.hasResult()) {
            this.status.set('ready');
        } else {
            this.status.set('idle');
        }
    }
}
