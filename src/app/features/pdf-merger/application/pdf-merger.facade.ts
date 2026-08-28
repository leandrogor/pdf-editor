import { inject, Injectable } from '@angular/core';
import { FILE_DOWNLOAD_PORT } from '@core/tokens/file-download.token';
import { PDF_MERGER_PORT } from '@core/tokens/pdf-merger.token';
import { FileDownloadPort } from '@features/metadata-editor/domain/ports/file-download.port';
import { PdfMergeFile } from '@features/pdf-merger/domain/models/pdf-merge-file.model';
import { PdfMergePage } from '@features/pdf-merger/domain/models/pdf-merge-page.model';
import { PdfMergerPort } from '@features/pdf-merger/domain/ports/pdf-merger.port';
import { PDF_MIME_TYPE } from '@shared/constants/file.constants';

export interface ProcessedPdfResult {
    file: PdfMergeFile;
    pages: PdfMergePage[];
}

@Injectable({ providedIn: 'root' })
export class PdfMergerFacade {
    private readonly mergerPort = inject<PdfMergerPort>(PDF_MERGER_PORT);
    private readonly fileDownloadPort = inject<FileDownloadPort>(FILE_DOWNLOAD_PORT);

    async processFile(file: File): Promise<ProcessedPdfResult> {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const inspection = await this.mergerPort.inspectPdf(bytes);

        const fileId = crypto.randomUUID();
        const mergeFile: PdfMergeFile = {
            id: fileId,
            name: file.name,
            size: file.size,
            pageCount: inspection.pageCount,
            bytes,
        };

        const pages: PdfMergePage[] = Array.from({ length: inspection.pageCount }, (_, index) => ({
            id: crypto.randomUUID(),
            fileId,
            fileName: file.name,
            sourceIndex: index,
            rotation: inspection.initialRotations[index] ?? 0,
        }));

        return { file: mergeFile, pages };
    }

    async mergeAndDownload(files: PdfMergeFile[], pages: PdfMergePage[], outputName = 'merged-document.pdf'): Promise<void> {
        const filesMap = new Map<string, Uint8Array>();
        for (const file of files) {
            filesMap.set(file.id, file.bytes);
        }

        const mergedBytes = await this.mergerPort.mergeAndSave(filesMap, pages);
        this.fileDownloadPort.download(mergedBytes, outputName, PDF_MIME_TYPE);
    }
}
