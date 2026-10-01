import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';
import { PdfPageRender } from '@features/text-editor/domain/models/pdf-page-render.model';
import { PdfTextEdit } from '@features/text-editor/domain/models/pdf-text-edit.model';
import { PdfTextItem } from '@features/text-editor/domain/models/pdf-text-item.model';

export interface ApplyEditsOptions {
    /** When true, thresholding (binarization / background whitening) is applied to scanned images in the PDF.
     *  Converts pixels with luminance > threshold (default 210) to pure white (255) and <= threshold to solid black (0),
     *  eliminating background gray, JPEG noise, and antialiasing halos so edits blend seamlessly. */
    cleanScannedBackground?: boolean;
    /** Threshold value on 0–255 scale. Default: 210. */
    threshold?: number;
}

export interface PdfTextEditorPort {
    open(pdfBytes: Uint8Array): Promise<PdfSession>;
    getPageCount(session: PdfSession): number;
    renderPage(session: PdfSession, pageIndex: number, scale: number): Promise<PdfPageRender>;
    recognizeOcrText(
        session: PdfSession,
        pageIndex: number,
        scale: number,
        onProgress?: (progressPct: number) => void,
    ): Promise<PdfTextItem[]>;
    applyEdits(
        session: PdfSession,
        edits: PdfTextEdit[],
        allTextItems: PdfTextItem[],
        options?: ApplyEditsOptions,
    ): Promise<Uint8Array>;
    close(session: PdfSession): void;
}
