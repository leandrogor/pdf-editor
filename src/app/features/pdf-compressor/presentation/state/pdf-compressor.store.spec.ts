import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PdfCompressorStore } from './pdf-compressor.store';
import { PdfCompressorFacade } from '@features/pdf-compressor/application/pdf-compressor.facade';
import { AppSettingsService } from '@core/services/app-settings.service';

describe('PdfCompressorStore', () => {
    let store: PdfCompressorStore;
    let facadeMock: {
        compressFile: ReturnType<typeof vi.fn>;
        downloadCompressedFile: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        facadeMock = {
            compressFile: vi.fn(),
            downloadCompressedFile: vi.fn(),
        };

        TestBed.configureTestingModule({
            providers: [
                PdfCompressorStore,
                AppSettingsService,
                { provide: PdfCompressorFacade, useValue: facadeMock },
            ],
        });

        store = TestBed.inject(PdfCompressorStore);
    });

    it('should initialize with default values', () => {
        expect(store.status()).toBe('idle');
        expect(store.mode()).toBe('preset');
        expect(store.level()).toBe('medium');
        expect(store.targetValue()).toBe(3);
        expect(store.targetUnit()).toBe('MB');
        expect(store.selectedFile()).toBeNull();
        expect(store.hasFile()).toBe(false);
        expect(store.hasResult()).toBe(false);
    });

    it('should calculate targetSizeBytes for MB and KB correctly', () => {
        store.setTargetUnit('MB');
        store.setTargetValue(3);
        expect(store.targetSizeBytes()).toBe(3 * 1024 * 1024);

        store.setTargetUnit('KB');
        store.setTargetValue(1000);
        expect(store.targetSizeBytes()).toBe(1000 * 1024);

        store.setTargetValue(null);
        expect(store.targetSizeBytes()).toBeNull();
    });

    it('should reject non-pdf files and set error', async () => {
        const textFile = new File(['hello'], 'document.txt', { type: 'text/plain' });
        await store.loadFile(textFile);

        expect(store.status()).toBe('error');
        expect(store.errorMessage()).toBeTruthy();
        expect(store.hasFile()).toBe(false);
    });

    it('should load a valid PDF file and adjust default targets', async () => {
        const pdfFile = new File(['%PDF-1.5 test content'], 'doc.pdf', { type: 'application/pdf' });
        await store.loadFile(pdfFile);

        expect(store.status()).toBe('idle');
        expect(store.hasFile()).toBe(true);
        expect(store.selectedFile()?.name).toBe('doc.pdf');
    });

    it('should detect when original file is already smaller than target size', async () => {
        const smallPdf = new File([new Uint8Array(500)], 'small.pdf', { type: 'application/pdf' });
        await store.loadFile(smallPdf);

        store.setMode('target');
        store.setTargetUnit('KB');
        store.setTargetValue(10); // 10 KB = 10240 bytes > 500 bytes

        expect(store.isFileAlreadySmallerThanTarget()).toBe(true);

        store.setTargetValue(0.1); // 0.1 KB = 102 bytes < 500 bytes
        expect(store.isFileAlreadySmallerThanTarget()).toBe(false);
    });

    it('should compress with preset mode and update result', async () => {
        const pdfFile = new File([new Uint8Array(10000)], 'doc.pdf', { type: 'application/pdf' });
        await store.loadFile(pdfFile);

        store.setMode('preset');
        store.setLevel('high');

        facadeMock.compressFile.mockResolvedValueOnce({
            bytes: new Uint8Array(4000),
            originalSize: 10000,
            compressedSize: 4000,
            reductionPercentage: 60,
            reductionBytes: 6000,
            isOriginalPreserved: false,
        });

        await store.compress();

        expect(store.status()).toBe('ready');
        expect(store.hasResult()).toBe(true);
        expect(store.result()?.reductionPercentage).toBe(60);
        expect(facadeMock.compressFile).toHaveBeenCalledWith(pdfFile, {
            mode: 'preset',
            level: 'high',
            targetSizeBytes: undefined,
        });
    });

    it('should compress with target size mode and pass targetSizeBytes', async () => {
        const pdfFile = new File([new Uint8Array(100000)], 'doc.pdf', { type: 'application/pdf' });
        await store.loadFile(pdfFile);

        store.setMode('target');
        store.setTargetUnit('KB');
        store.setTargetValue(50); // 50 KB = 51200 bytes

        facadeMock.compressFile.mockResolvedValueOnce({
            bytes: new Uint8Array(48000),
            originalSize: 100000,
            compressedSize: 48000,
            reductionPercentage: 52,
            reductionBytes: 52000,
            isOriginalPreserved: false,
        });

        await store.compress();

        expect(store.status()).toBe('ready');
        expect(facadeMock.compressFile).toHaveBeenCalledWith(pdfFile, {
            mode: 'target',
            level: undefined,
            targetSizeBytes: 50 * 1024,
        });
    });

    it('should download result using facade', async () => {
        const pdfFile = new File([new Uint8Array(10000)], 'doc.pdf', { type: 'application/pdf' });
        await store.loadFile(pdfFile);

        const resultBytes = new Uint8Array(5000);
        facadeMock.compressFile.mockResolvedValueOnce({
            bytes: resultBytes,
            originalSize: 10000,
            compressedSize: 5000,
            reductionPercentage: 50,
            reductionBytes: 5000,
            isOriginalPreserved: false,
        });

        await store.compress();
        store.download();

        expect(facadeMock.downloadCompressedFile).toHaveBeenCalledWith(resultBytes, 'doc.pdf');
    });

    it('should reset store on clearFile', async () => {
        const pdfFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
        await store.loadFile(pdfFile);
        expect(store.hasFile()).toBe(true);

        store.clearFile();
        expect(store.hasFile()).toBe(false);
        expect(store.result()).toBeNull();
        expect(store.status()).toBe('idle');
    });
});
