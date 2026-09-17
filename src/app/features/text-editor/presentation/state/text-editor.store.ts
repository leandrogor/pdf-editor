import { computed, inject, Injectable, signal } from '@angular/core';
import { mapPdfErrorKey } from '@core/error-handling/pdf-error.mapper';
import { AppSettingsService } from '@core/services/app-settings.service';
import { TextEditorFacade } from '@features/text-editor/application/text-editor.facade';
import { PdfPageRender } from '@features/text-editor/domain/models/pdf-page-render.model';
import { PdfTextEdit } from '@features/text-editor/domain/models/pdf-text-edit.model';
import { PdfTextItem } from '@features/text-editor/domain/models/pdf-text-item.model';
import { MAX_PDF_SIZE_BYTES } from '@shared/constants/file.constants';
import { isPdfFile } from '@shared/utils/pdf-file.utils';

export type TextEditorStatus = 'idle' | 'loading' | 'rendering' | 'ready' | 'saving' | 'error';

/** Default render scale — 1.5× gives good quality without being too heavy */
const DEFAULT_SCALE = 1.5;

@Injectable()
export class TextEditorStore {
    private readonly facade = inject(TextEditorFacade);
    private readonly appSettings = inject(AppSettingsService);

    readonly status = signal<TextEditorStatus>('idle');
    readonly fileName = signal('');
    readonly errorMessage = signal('');
    readonly pageCount = signal(0);
    readonly currentPageIndex = signal(0);
    readonly currentPage = signal<PdfPageRender | null>(null);
    readonly scale = signal(DEFAULT_SCALE);

    /** All text items collected across all loaded pages (keyed by id) */
    private readonly allTextItemsMap = new Map<string, PdfTextItem>();

    /** Edits keyed by itemId */
    readonly edits = signal<Map<string, PdfTextEdit>>(new Map());

    readonly pendingEditsCount = signal(0);

    readonly isBusy = computed(
        () =>
            this.status() === 'loading' ||
            this.status() === 'rendering' ||
            this.status() === 'saving',
    );
    readonly hasLoadedFile = computed(() => this.fileName().length > 0);
    readonly canGoNext = computed(() => this.currentPageIndex() < this.pageCount() - 1);
    readonly canGoPrev = computed(() => this.currentPageIndex() > 0);

    async loadFile(file: File): Promise<void> {
        this.clearError();

        if (!isPdfFile(file)) {
            this.setError(this.appSettings.t('errorOnlyPdf'));
            return;
        }

        if (file.size > MAX_PDF_SIZE_BYTES) {
            this.setError(this.appSettings.t('errorTooLarge'));
            return;
        }

        this.status.set('loading');
        this.allTextItemsMap.clear();
        this.edits.set(new Map());
        this.pendingEditsCount.set(0);

        try {
            const count = await this.facade.load(file);
            this.fileName.set(file.name);
            this.pageCount.set(count);
            this.currentPageIndex.set(0);
            await this.renderCurrentPage();
        } catch (error) {
            this.setError(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    async goToPage(pageIndex: number): Promise<void> {
        if (pageIndex < 0 || pageIndex >= this.pageCount()) return;
        this.currentPageIndex.set(pageIndex);
        await this.renderCurrentPage();
    }

    async nextPage(): Promise<void> {
        if (this.canGoNext()) {
            await this.goToPage(this.currentPageIndex() + 1);
        }
    }

    async prevPage(): Promise<void> {
        if (this.canGoPrev()) {
            await this.goToPage(this.currentPageIndex() - 1);
        }
    }

    async zoomIn(): Promise<void> {
        const next = Math.min(this.scale() + 0.25, 3);
        this.scale.set(next);
        await this.renderCurrentPage();
    }

    async zoomOut(): Promise<void> {
        const next = Math.max(this.scale() - 0.25, 0.5);
        this.scale.set(next);
        await this.renderCurrentPage();
    }

    recordEdit(edit: PdfTextEdit): void {
        this.edits.update((prev) => {
            const next = new Map(prev);
            if (edit.newText === edit.originalText) {
                next.delete(edit.itemId);
            } else {
                next.set(edit.itemId, edit);
            }
            return next;
        });
        this.pendingEditsCount.set(this.edits().size);
    }

    async downloadPdf(): Promise<void> {
        if (!this.hasLoadedFile()) return;

        this.clearError();
        this.status.set('saving');

        try {
            const edits = Array.from(this.edits().values());
            const allItems = Array.from(this.allTextItemsMap.values());
            await this.facade.downloadWithEdits(edits, allItems);
            this.status.set('ready');
        } catch (error) {
            this.setError(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    clearError(): void {
        this.errorMessage.set('');
        if (this.status() === 'error') {
            this.status.set(this.hasLoadedFile() ? 'ready' : 'idle');
        }
    }

    private async renderCurrentPage(): Promise<void> {
        this.status.set('rendering');
        try {
            const page = await this.facade.renderPage(this.currentPageIndex(), this.scale());
            // Index all text items from this page for later edit application
            for (const item of page.textItems) {
                this.allTextItemsMap.set(item.id, item);
            }
            this.currentPage.set(page);
            this.status.set('ready');
        } catch (error) {
            this.setError(this.appSettings.t(mapPdfErrorKey(error)));
        }
    }

    private setError(message: string): void {
        this.status.set('error');
        this.errorMessage.set(message);
    }
}
