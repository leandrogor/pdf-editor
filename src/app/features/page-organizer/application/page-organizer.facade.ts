import { inject, Injectable } from '@angular/core';
import { FILE_DOWNLOAD_PORT } from '@core/tokens/file-download.token';
import { PDF_PAGE_ORGANIZER_PORT } from '@core/tokens/pdf-page-organizer.token';
import { PdfPageLayout } from '@features/page-organizer/domain/models/pdf-page-layout.model';
import { PdfPageOrganizerPort } from '@features/page-organizer/domain/ports/pdf-page-organizer.port';
import { FileDownloadPort } from '@features/metadata-editor/domain/ports/file-download.port';
import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';
import { PDF_MIME_TYPE } from '@shared/constants/file.constants';

@Injectable({ providedIn: 'root' })
export class PageOrganizerFacade {
    private readonly organizerPort = inject<PdfPageOrganizerPort>(PDF_PAGE_ORGANIZER_PORT);
    private readonly fileDownloadPort = inject<FileDownloadPort>(FILE_DOWNLOAD_PORT);

    private activeSession: PdfSession | null = null;
    private originalFileName = '';

    async load(file: File): Promise<PdfPageLayout[]> {
        this.dispose();

        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        this.activeSession = await this.organizerPort.open(bytes);
        this.originalFileName = file.name;

        return this.organizerPort.readPageLayout(this.activeSession);
    }

    async downloadWithLayout(layout: PdfPageLayout[]): Promise<void> {
        const session = this.ensureSession();
        const fileBytes = await this.organizerPort.saveWithLayout(session, layout);
        this.fileDownloadPort.download(fileBytes, this.buildOutputName(), PDF_MIME_TYPE);
    }

    dispose(): void {
        if (!this.activeSession) {
            return;
        }

        this.organizerPort.close(this.activeSession);
        this.activeSession = null;
        this.originalFileName = '';
    }

    private ensureSession(): PdfSession {
        if (!this.activeSession) {
            throw new Error('No PDF is currently loaded.');
        }

        return this.activeSession;
    }

    private buildOutputName(): string {
        return this.originalFileName || 'document.pdf';
    }
}
