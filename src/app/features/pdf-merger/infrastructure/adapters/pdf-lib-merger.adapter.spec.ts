import { describe, it, expect, beforeEach } from 'vitest';
import { PdfLibMergerAdapter } from './pdf-lib-merger.adapter';
import { PDFDocument, degrees } from 'pdf-lib';
import { PdfMergePage } from '@features/pdf-merger/domain/models/pdf-merge-page.model';

describe('PdfLibMergerAdapter', () => {
    let adapter: PdfLibMergerAdapter;

    beforeEach(() => {
        adapter = new PdfLibMergerAdapter();
    });

    async function createTestPdf(pageCount: number, rotateSecondPage = false): Promise<Uint8Array> {
        const doc = await PDFDocument.create();
        for (let i = 0; i < pageCount; i++) {
            const page = doc.addPage([200, 200]);
            if (i === 1 && rotateSecondPage) {
                page.setRotation(degrees(90));
            }
        }
        return doc.save();
    }

    it('should inspect a PDF and return page count and initial rotations', async () => {
        const pdfBytes = await createTestPdf(3, true);
        const result = await adapter.inspectPdf(pdfBytes);

        expect(result.pageCount).toBe(3);
        expect(result.initialRotations).toEqual([0, 90, 0]);
    });

    it('should merge multiple PDFs in specified page order and rotations', async () => {
        const pdf1Bytes = await createTestPdf(2);
        const pdf2Bytes = await createTestPdf(3);

        const files = new Map<string, Uint8Array>([
            ['doc1', pdf1Bytes],
            ['doc2', pdf2Bytes],
        ]);

        const pagesToMerge: PdfMergePage[] = [
            { id: '1', fileId: 'doc2', fileName: 'doc2.pdf', sourceIndex: 2, rotation: 0 },
            { id: '2', fileId: 'doc1', fileName: 'doc1.pdf', sourceIndex: 0, rotation: 180 },
            { id: '3', fileId: 'doc2', fileName: 'doc2.pdf', sourceIndex: 0, rotation: 90 },
        ];

        const mergedBytes = await adapter.mergeAndSave(files, pagesToMerge);
        expect(mergedBytes).toBeInstanceOf(Uint8Array);
        expect(mergedBytes.length).toBeGreaterThan(0);

        const loadedMerged = await PDFDocument.load(mergedBytes);
        expect(loadedMerged.getPageCount()).toBe(3);
        expect(loadedMerged.getPage(0).getRotation().angle).toBe(0);
        expect(loadedMerged.getPage(1).getRotation().angle).toBe(180);
        expect(loadedMerged.getPage(2).getRotation().angle).toBe(90);
    });

    it('should throw error if attempting to merge empty pages array', async () => {
        const files = new Map<string, Uint8Array>();
        await expect(adapter.mergeAndSave(files, [])).rejects.toThrow('At least one page is required');
    });
});
