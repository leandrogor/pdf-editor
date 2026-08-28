import { computed, inject, Injectable, signal } from '@angular/core';
import { mapPdfErrorKey } from '@core/error-handling/pdf-error.mapper';
import { AppSettingsService } from '@core/services/app-settings.service';
import { PdfMergerFacade } from '@features/pdf-merger/application/pdf-merger.facade';
import { PdfMergeFile } from '@features/pdf-merger/domain/models/pdf-merge-file.model';
import { PdfMergePage } from '@features/pdf-merger/domain/models/pdf-merge-page.model';
import { MAX_PDF_SIZE_BYTES } from '@shared/constants/file.constants';
import { isPdfFile } from '@shared/utils/pdf-file.utils';

export type PdfMergerStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

@Injectable()
export class PdfMergerStore {
    private readonly facade = inject(PdfMergerFacade);
    private readonly appSettings = inject(AppSettingsService);

    readonly status = signal<PdfMergerStatus>('idle');
    readonly files = signal<PdfMergeFile[]>([]);
    readonly pages = signal<PdfMergePage[]>([]);
    readonly errorMessage = signal('');

    readonly isBusy = computed(() => this.status() === 'loading' || this.status() === 'saving');
    readonly hasFiles = computed(() => this.files().length > 0);
    readonly totalPageCount = computed(() => this.pages().length);

    async addFiles(incomingFiles: FileList | File[] | null | undefined): Promise<void> {
        this.clearError();

        if (!incomingFiles || incomingFiles.length === 0) {
            return;
        }

        const fileArray = Array.from(incomingFiles);

        for (const file of fileArray) {
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
        }

        this.status.set('loading');

        try {
            const newFiles: PdfMergeFile[] = [];
            const newPages: PdfMergePage[] = [];

            for (const file of fileArray) {
                const result = await this.facade.processFile(file);
                newFiles.push(result.file);
                newPages.push(...result.pages);
            }

            this.files.update((current) => [...current, ...newFiles]);
            this.pages.update((current) => [...current, ...newPages]);
            this.status.set('ready');
        } catch (error) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    removeFile(fileId: string): void {
        this.clearError();

        this.files.update((current) => current.filter((file) => file.id !== fileId));
        this.pages.update((current) => current.filter((page) => page.fileId !== fileId));

        if (this.files().length === 0) {
            this.status.set('idle');
        }
    }

    movePageUp(index: number): void {
        this.movePage(index, index - 1);
    }

    movePageDown(index: number): void {
        this.movePage(index, index + 1);
    }

    removePage(index: number): void {
        this.clearError();

        this.pages.update((current) => {
            if (current.length <= 1 || index < 0 || index >= current.length) {
                this.errorMessage.set(this.appSettings.t('errorAtLeastOnePage'));
                return current;
            }

            const next = [...current];
            next.splice(index, 1);
            return next;
        });
    }

    rotatePageLeft(index: number): void {
        this.rotatePage(index, -90);
    }

    rotatePageRight(index: number): void {
        this.rotatePage(index, 90);
    }

    moveFileUp(fileIndex: number): void {
        if (fileIndex <= 0 || fileIndex >= this.files().length) {
            return;
        }

        this.files.update((current) => {
            const next = [...current];
            const [moved] = next.splice(fileIndex, 1);
            next.splice(fileIndex - 1, 0, moved);
            return next;
        });
    }

    moveFileDown(fileIndex: number): void {
        if (fileIndex < 0 || fileIndex >= this.files().length - 1) {
            return;
        }

        this.files.update((current) => {
            const next = [...current];
            const [moved] = next.splice(fileIndex, 1);
            next.splice(fileIndex + 1, 0, moved);
            return next;
        });
    }

    clearAll(): void {
        this.files.set([]);
        this.pages.set([]);
        this.status.set('idle');
        this.errorMessage.set('');
    }

    async downloadMergedPdf(): Promise<void> {
        if (!this.hasFiles() || this.pages().length === 0) {
            return;
        }

        this.clearError();
        this.status.set('saving');

        try {
            await this.facade.mergeAndDownload(this.files(), this.pages(), 'merged-document.pdf');
            this.status.set('ready');
        } catch (error) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    clearError(): void {
        this.errorMessage.set('');

        if (this.status() === 'error') {
            this.status.set(this.hasFiles() ? 'ready' : 'idle');
        }
    }

    private movePage(fromIndex: number, toIndex: number): void {
        this.clearError();

        this.pages.update((current) => {
            if (
                fromIndex < 0 ||
                fromIndex >= current.length ||
                toIndex < 0 ||
                toIndex >= current.length ||
                fromIndex === toIndex
            ) {
                return current;
            }

            const next = [...current];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);

            return next;
        });
    }

    private rotatePage(index: number, delta: number): void {
        this.clearError();

        this.pages.update((current) => {
            if (index < 0 || index >= current.length) {
                return current;
            }

            const next = [...current];
            const target = next[index];
            next[index] = {
                ...target,
                rotation: this.normalizeRotation(target.rotation + delta),
            };

            return next;
        });
    }

    private normalizeRotation(value: number): number {
        return ((value % 360) + 360) % 360;
    }
}
