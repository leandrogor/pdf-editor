import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PdfMergerStore } from './pdf-merger.store';
import { PdfMergerFacade } from '@features/pdf-merger/application/pdf-merger.facade';
import { AppSettingsService } from '@core/services/app-settings.service';

describe('PdfMergerStore', () => {
    let store: PdfMergerStore;
    let facadeMock: {
        processFile: ReturnType<typeof vi.fn>;
        mergeAndDownload: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        facadeMock = {
            processFile: vi.fn(),
            mergeAndDownload: vi.fn(),
        };

        TestBed.configureTestingModule({
            providers: [
                PdfMergerStore,
                AppSettingsService,
                { provide: PdfMergerFacade, useValue: facadeMock },
            ],
        });

        store = TestBed.inject(PdfMergerStore);
    });

    it('should initialize with idle status and empty files/pages', () => {
        expect(store.status()).toBe('idle');
        expect(store.files()).toEqual([]);
        expect(store.pages()).toEqual([]);
        expect(store.hasFiles()).toBe(false);
        expect(store.totalPageCount()).toBe(0);
    });

    it('should reject non-pdf files', async () => {
        const fakeFile = new File(['text'], 'test.txt', { type: 'text/plain' });
        await store.addFiles([fakeFile]);

        expect(store.status()).toBe('error');
        expect(store.errorMessage()).toBeTruthy();
        expect(store.files().length).toBe(0);
    });

    it('should add files and populate pages correctly', async () => {
        const file1 = new File(['%PDF-1.4...'], 'doc1.pdf', { type: 'application/pdf' });
        facadeMock.processFile.mockResolvedValueOnce({
            file: { id: 'f1', name: 'doc1.pdf', size: 100, pageCount: 2, bytes: new Uint8Array() },
            pages: [
                { id: 'p1', fileId: 'f1', fileName: 'doc1.pdf', sourceIndex: 0, rotation: 0 },
                { id: 'p2', fileId: 'f1', fileName: 'doc1.pdf', sourceIndex: 1, rotation: 0 },
            ],
        });

        await store.addFiles([file1]);

        expect(store.status()).toBe('ready');
        expect(store.files().length).toBe(1);
        expect(store.pages().length).toBe(2);
        expect(store.totalPageCount()).toBe(2);
        expect(store.hasFiles()).toBe(true);
    });

    it('should reorder pages up and down', async () => {
        const file1 = new File(['%PDF-1.4...'], 'doc1.pdf', { type: 'application/pdf' });
        facadeMock.processFile.mockResolvedValueOnce({
            file: { id: 'f1', name: 'doc1.pdf', size: 100, pageCount: 2, bytes: new Uint8Array() },
            pages: [
                { id: 'p1', fileId: 'f1', fileName: 'doc1.pdf', sourceIndex: 0, rotation: 0 },
                { id: 'p2', fileId: 'f1', fileName: 'doc1.pdf', sourceIndex: 1, rotation: 0 },
            ],
        });

        await store.addFiles([file1]);

        // Move 2nd page up
        store.movePageUp(1);
        expect(store.pages()[0].id).toBe('p2');
        expect(store.pages()[1].id).toBe('p1');

        // Move 1st page down
        store.movePageDown(0);
        expect(store.pages()[0].id).toBe('p1');
        expect(store.pages()[1].id).toBe('p2');
    });

    it('should rotate pages properly', async () => {
        const file1 = new File(['%PDF-1.4...'], 'doc1.pdf', { type: 'application/pdf' });
        facadeMock.processFile.mockResolvedValueOnce({
            file: { id: 'f1', name: 'doc1.pdf', size: 100, pageCount: 1, bytes: new Uint8Array() },
            pages: [
                { id: 'p1', fileId: 'f1', fileName: 'doc1.pdf', sourceIndex: 0, rotation: 0 },
            ],
        });

        await store.addFiles([file1]);

        store.rotatePageRight(0);
        expect(store.pages()[0].rotation).toBe(90);

        store.rotatePageLeft(0);
        expect(store.pages()[0].rotation).toBe(0);

        store.rotatePageLeft(0);
        expect(store.pages()[0].rotation).toBe(270);
    });

    it('should remove a page and keep at least one page', async () => {
        const file1 = new File(['%PDF-1.4...'], 'doc1.pdf', { type: 'application/pdf' });
        facadeMock.processFile.mockResolvedValueOnce({
            file: { id: 'f1', name: 'doc1.pdf', size: 100, pageCount: 2, bytes: new Uint8Array() },
            pages: [
                { id: 'p1', fileId: 'f1', fileName: 'doc1.pdf', sourceIndex: 0, rotation: 0 },
                { id: 'p2', fileId: 'f1', fileName: 'doc1.pdf', sourceIndex: 1, rotation: 0 },
            ],
        });

        await store.addFiles([file1]);

        store.removePage(0);
        expect(store.pages().length).toBe(1);
        expect(store.pages()[0].id).toBe('p2');

        // Attempting to remove the last remaining page
        store.removePage(0);
        expect(store.pages().length).toBe(1);
        expect(store.errorMessage()).toBeTruthy();
    });

    it('should remove a file and its pages', async () => {
        const file1 = new File(['%PDF-1.4...'], 'doc1.pdf', { type: 'application/pdf' });
        facadeMock.processFile.mockResolvedValueOnce({
            file: { id: 'f1', name: 'doc1.pdf', size: 100, pageCount: 1, bytes: new Uint8Array() },
            pages: [
                { id: 'p1', fileId: 'f1', fileName: 'doc1.pdf', sourceIndex: 0, rotation: 0 },
            ],
        });

        await store.addFiles([file1]);
        expect(store.files().length).toBe(1);

        store.removeFile('f1');
        expect(store.files().length).toBe(0);
        expect(store.pages().length).toBe(0);
        expect(store.status()).toBe('idle');
    });
});
