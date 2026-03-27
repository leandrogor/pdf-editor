import { computed, inject, Injectable, signal } from '@angular/core';
import { mapPdfErrorKey } from '@core/error-handling/pdf-error.mapper';
import { AppSettingsService } from '@core/services/app-settings.service';
import { PageOrganizerFacade } from '@features/page-organizer/application/page-organizer.facade';
import { PdfPageLayout } from '@features/page-organizer/domain/models/pdf-page-layout.model';
import { MAX_PDF_SIZE_BYTES } from '@shared/constants/file.constants';
import { isPdfFile } from '@shared/utils/pdf-file.utils';

export type PageOrganizerStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

@Injectable()
export class PageOrganizerStore {
    private readonly facade = inject(PageOrganizerFacade);
    private readonly appSettings = inject(AppSettingsService);

    readonly status = signal<PageOrganizerStatus>('idle');
    readonly fileName = signal('');
    readonly pages = signal<PdfPageLayout[]>([]);
    readonly errorMessage = signal('');

    readonly isBusy = computed(() => this.status() === 'loading' || this.status() === 'saving');
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
            const layout = await this.facade.load(file);
            this.fileName.set(file.name);
            this.pages.set(layout);
            this.status.set('ready');
        } catch (error) {
            this.status.set('error');
            this.errorMessage.set(this.appSettings.t(mapPdfErrorKey(error)));
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

    async downloadPdf(): Promise<void> {
        if (!this.hasLoadedFile() || this.pages().length === 0) {
            return;
        }

        this.clearError();
        this.status.set('saving');

        try {
            await this.facade.downloadWithLayout(this.pages());
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
