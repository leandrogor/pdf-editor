import { inject, Injectable } from '@angular/core';
import { FILE_DOWNLOAD_PORT } from '@core/tokens/file-download.token';
import { PDF_COMPRESSOR_PORT } from '@core/tokens/pdf-compressor.token';
import { FileDownloadPort } from '@features/metadata-editor/domain/ports/file-download.port';
import {
    PdfCompressOptions,
    PdfCompressResult,
} from '@features/pdf-compressor/domain/models/pdf-compress-options.model';
import { PdfCompressorPort } from '@features/pdf-compressor/domain/ports/pdf-compressor.port';
import { PDF_EXTENSION, PDF_MIME_TYPE } from '@shared/constants/file.constants';

@Injectable({ providedIn: 'root' })
export class PdfCompressorFacade {
    private readonly compressorPort = inject<PdfCompressorPort>(PDF_COMPRESSOR_PORT);
    private readonly fileDownloadPort = inject<FileDownloadPort>(FILE_DOWNLOAD_PORT);

    async compressFile(file: File, options: PdfCompressOptions): Promise<PdfCompressResult> {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        return this.compressorPort.compress(bytes, options);
    }

    downloadCompressedFile(bytes: Uint8Array, originalFileName: string): void {
        const outputName = this.buildCompressedFileName(originalFileName);
        this.fileDownloadPort.download(bytes, outputName, PDF_MIME_TYPE);
    }

    private buildCompressedFileName(fileName: string): string {
        if (!fileName) {
            return 'document-compressed.pdf';
        }

        const base = fileName.toLowerCase().endsWith(PDF_EXTENSION)
            ? fileName.slice(0, -PDF_EXTENSION.length)
            : fileName;

        return `${base}-compressed.pdf`;
    }
}
