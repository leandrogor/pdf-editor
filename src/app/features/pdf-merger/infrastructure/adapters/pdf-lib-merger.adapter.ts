import { Injectable } from '@angular/core';
import { PdfInspectionResult, PdfMergerPort } from '@features/pdf-merger/domain/ports/pdf-merger.port';
import { PdfMergePage } from '@features/pdf-merger/domain/models/pdf-merge-page.model';
import { degrees, PDFDocument } from 'pdf-lib';

@Injectable({ providedIn: 'root' })
export class PdfLibMergerAdapter implements PdfMergerPort {
    async inspectPdf(pdfBytes: Uint8Array): Promise<PdfInspectionResult> {
        const doc = await PDFDocument.load(pdfBytes);
        const pages = doc.getPages();

        return {
            pageCount: pages.length,
            initialRotations: pages.map((page) => this.normalizeRotation(page.getRotation().angle)),
        };
    }

    async mergeAndSave(files: Map<string, Uint8Array>, pages: PdfMergePage[]): Promise<Uint8Array> {
        if (pages.length === 0) {
            throw new Error('At least one page is required to generate a PDF.');
        }

        const mergedDoc = await PDFDocument.create();
        const loadedDocs = new Map<string, PDFDocument>();

        // Preload only the documents that have pages included in the final output
        for (const pageItem of pages) {
            if (!loadedDocs.has(pageItem.fileId)) {
                const bytes = files.get(pageItem.fileId);
                if (!bytes) {
                    throw new Error(`Source PDF data not found for file ID: ${pageItem.fileId}`);
                }
                const sourceDoc = await PDFDocument.load(bytes);
                loadedDocs.set(pageItem.fileId, sourceDoc);
            }
        }

        for (const pageItem of pages) {
            const sourceDoc = loadedDocs.get(pageItem.fileId);
            if (!sourceDoc) {
                continue;
            }

            const [copiedPage] = await mergedDoc.copyPages(sourceDoc, [pageItem.sourceIndex]);
            copiedPage.setRotation(degrees(this.normalizeRotation(pageItem.rotation)));
            mergedDoc.addPage(copiedPage);
        }

        return mergedDoc.save();
    }

    private normalizeRotation(value: number): number {
        const normalized = ((value % 360) + 360) % 360;

        if (normalized === 90 || normalized === 180 || normalized === 270) {
            return normalized;
        }

        return 0;
    }
}
