import { computed, inject, Injectable, signal } from '@angular/core';
import { mapPdfErrorKey } from '@core/error-handling/pdf-error.mapper';
import { AppSettingsService } from '@core/services/app-settings.service';
import { MetadataEditorFacade } from '@features/metadata-editor/application/metadata-editor.facade';
import {
    EMPTY_PDF_METADATA,
    PdfMetadata,
} from '@features/metadata-editor/domain/models/pdf-metadata.model';
import { MAX_PDF_SIZE_BYTES } from '@shared/constants/file.constants';
import { isPdfFile } from '@shared/utils/pdf-file.utils';

export type MetadataEditorStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

@Injectable()
export class MetadataEditorStore {
    private readonly facade = inject(MetadataEditorFacade);
    private readonly appSettings = inject(AppSettingsService);

    readonly status = signal<MetadataEditorStatus>('idle');
    readonly fileName = signal('');
    readonly metadata = signal<PdfMetadata>(EMPTY_PDF_METADATA);
    readonly errorMessage = signal('');

    readonly isBusy = computed(() => this.status() === 'loading' || this.status() === 'saving');
    readonly canEdit = computed(() => this.status() === 'ready');
    readonly hasLoadedFile = computed(() => this.fileName().length > 0);

    async loadFile(file: File): Promise<void> {
        this.clearError();

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

        this.status.set('loading');

        try {
            const metadata = await this.facade.load(file);
            this.fileName.set(file.name);
            this.metadata.set(metadata);
            this.status.set('ready');
        } catch (error) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    async updateMetadata(metadata: PdfMetadata): Promise<void> {
        if (!this.hasLoadedFile()) {
            return;
        }

        this.clearError();
        this.status.set('saving');

        try {
            await this.facade.updateMetadata(metadata);
            this.metadata.set(metadata);
            this.status.set('ready');
        } catch (error) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    async downloadPdf(): Promise<void> {
        if (!this.hasLoadedFile()) {
            return;
        }

        this.clearError();
        this.status.set('saving');

        try {
            await this.facade.downloadUpdatedPdf();
            this.status.set('ready');
        } catch (error) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    clearError(): void {
        this.errorMessage.set('');
        if (this.status() === 'error') {
            this.status.set(this.hasLoadedFile() ? 'ready' : 'idle');
        }
    }
}
