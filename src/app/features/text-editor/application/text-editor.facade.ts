import { inject, Injectable } from '@angular/core';
import { FILE_DOWNLOAD_PORT } from '@core/tokens/file-download.token';
import { PDF_TEXT_EDITOR_PORT } from '@core/tokens/pdf-text-editor.token';
import { FileDownloadPort } from '@features/metadata-editor/domain/ports/file-download.port';
import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';
import { PdfPageRender } from '@features/text-editor/domain/models/pdf-page-render.model';
import { PdfTextEdit } from '@features/text-editor/domain/models/pdf-text-edit.model';
import { PdfTextItem } from '@features/text-editor/domain/models/pdf-text-item.model';
import { PdfTextEditorPort } from '@features/text-editor/domain/ports/pdf-text-editor.port';
import { PDF_MIME_TYPE } from '@shared/constants/file.constants';

@Injectable({ providedIn: 'root' })
export class TextEditorFacade {
    private readonly textEditorPort = inject<PdfTextEditorPort>(PDF_TEXT_EDITOR_PORT);
    private readonly fileDownloadPort = inject<FileDownloadPort>(FILE_DOWNLOAD_PORT);

    private activeSession: PdfSession | null = null;
    private originalFileName = '';

    async load(file: File): Promise<number> {
        this.dispose();

        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        this.activeSession = await this.textEditorPort.open(bytes);
        this.originalFileName = file.name;

        return this.textEditorPort.getPageCount(this.activeSession);
    }

    async renderPage(pageIndex: number, scale: number): Promise<PdfPageRender> {
        const session = this.ensureSession();
        return this.textEditorPort.renderPage(session, pageIndex, scale);
    }

    async downloadWithEdits(edits: PdfTextEdit[], allTextItems: PdfTextItem[]): Promise<void> {
        const session = this.ensureSession();
        const bytes = await this.textEditorPort.applyEdits(session, edits, allTextItems);
        this.fileDownloadPort.download(bytes, this.buildOutputName(), PDF_MIME_TYPE);
    }

    dispose(): void {
        if (!this.activeSession) return;
        this.textEditorPort.close(this.activeSession);
        this.activeSession = null;
        this.originalFileName = '';
    }

    private ensureSession(): PdfSession {
        if (!this.activeSession) throw new Error('No PDF is currently loaded for text editing.');
        return this.activeSession;
    }

    private buildOutputName(): string {
        return this.originalFileName || 'document.pdf';
    }
}
