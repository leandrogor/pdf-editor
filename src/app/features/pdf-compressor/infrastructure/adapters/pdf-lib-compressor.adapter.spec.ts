import { describe, it, expect, beforeEach } from 'vitest';
import { PdfLibCompressorAdapter } from './pdf-lib-compressor.adapter';
import { PDFDocument } from 'pdf-lib';

describe('PdfLibCompressorAdapter', () => {
    let adapter: PdfLibCompressorAdapter;

    beforeEach(() => {
        adapter = new PdfLibCompressorAdapter();
    });

    async function createSamplePdf(): Promise<Uint8Array> {
        const doc = await PDFDocument.create();
        const page1 = doc.addPage([400, 400]);
        page1.drawText('Sample Document Page 1', { x: 50, y: 350 });
        const page2 = doc.addPage([400, 400]);
        page2.drawText('Sample Document Page 2', { x: 50, y: 350 });
        return doc.save();
    }

    it('should return original bytes if original is already smaller than target size', async () => {
        const pdfBytes = await createSamplePdf();
        const originalSize = pdfBytes.length;

        // Set target size much larger than document (e.g. 5 MB)
        const targetSizeBytes = 5 * 1024 * 1024;
        const result = await adapter.compress(pdfBytes, {
            mode: 'target',
            targetSizeBytes,
        });

        expect(result.isOriginalPreserved).toBe(true);
        expect(result.originalSize).toBe(originalSize);
        expect(result.compressedSize).toBe(originalSize);
        expect(result.reductionPercentage).toBe(0);
        expect(result.reductionBytes).toBe(0);
        expect(result.bytes).toBe(pdfBytes);
    });

    it('should execute preset compression and never return a larger file', async () => {
        const pdfBytes = await createSamplePdf();
        const result = await adapter.compress(pdfBytes, {
            mode: 'preset',
            level: 'medium',
        });

        expect(result.compressedSize).toBeLessThanOrEqual(pdfBytes.length);
        expect(result.bytes).toHaveLength(result.compressedSize);

        // Resulting PDF should still be a valid loadable PDF
        const loaded = await PDFDocument.load(result.bytes);
        expect(loaded.getPageCount()).toBe(2);
    });

    it('should execute target compression when original is larger than target', async () => {
        const pdfBytes = await createSamplePdf();
        // Target is 100 bytes (smaller than sample pdf)
        const result = await adapter.compress(pdfBytes, {
            mode: 'target',
            targetSizeBytes: 100,
        });

        expect(result.compressedSize).toBeLessThanOrEqual(pdfBytes.length);
        const loaded = await PDFDocument.load(result.bytes);
        expect(loaded.getPageCount()).toBe(2);
    });
});
