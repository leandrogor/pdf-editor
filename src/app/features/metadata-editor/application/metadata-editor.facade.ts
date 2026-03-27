import { inject, Injectable } from '@angular/core';
import { FILE_DOWNLOAD_PORT } from '@core/tokens/file-download.token';
import { PDF_METADATA_PORT } from '@core/tokens/pdf-metadata.token';
import { PdfMetadata } from '@features/metadata-editor/domain/models/pdf-metadata.model';
import { FileDownloadPort } from '@features/metadata-editor/domain/ports/file-download.port';
import { PdfMetadataPort } from '@features/metadata-editor/domain/ports/pdf-metadata.port';
import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';
import { PDF_MIME_TYPE } from '@shared/constants/file.constants';

@Injectable({ providedIn: 'root' })
export class MetadataEditorFacade {
    private readonly pdfMetadataPort = inject<PdfMetadataPort>(PDF_METADATA_PORT);
    private readonly fileDownloadPort = inject<FileDownloadPort>(FILE_DOWNLOAD_PORT);

    private activeSession: PdfSession | null = null;
    private originalFileName = '';

    async load(file: File): Promise<PdfMetadata> {
        this.dispose();

        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        this.activeSession = await this.pdfMetadataPort.open(bytes);
        this.originalFileName = file.name;

        return this.pdfMetadataPort.readMetadata(this.activeSession);
    }

    async updateMetadata(metadata: PdfMetadata): Promise<void> {
        const session = this.ensureSession();
        await this.pdfMetadataPort.writeMetadata(session, metadata);
    }

    async downloadUpdatedPdf(): Promise<void> {
        const session = this.ensureSession();
        const fileBytes = await this.pdfMetadataPort.save(session);
        const fileName = this.buildOutputName();

        this.fileDownloadPort.download(fileBytes, fileName, PDF_MIME_TYPE);
    }

    dispose(): void {
        if (!this.activeSession) {
            return;
        }

        this.pdfMetadataPort.close(this.activeSession);
        this.activeSession = null;
        this.originalFileName = '';
    }

    private ensureSession(): PdfSession {
        if (!this.activeSession) {
            throw new Error('No hay un PDF cargado para editar.');
        }

        return this.activeSession;
    }

    private buildOutputName(): string {
        if (!this.originalFileName) {
            return 'documento.pdf';
        }

        return this.originalFileName;
    }
}
