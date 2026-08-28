import { PdfMergePage } from '@features/pdf-merger/domain/models/pdf-merge-page.model';

export interface PdfInspectionResult {
    pageCount: number;
    initialRotations: number[];
}

export interface PdfMergerPort {
    inspectPdf(pdfBytes: Uint8Array): Promise<PdfInspectionResult>;
    mergeAndSave(files: Map<string, Uint8Array>, pages: PdfMergePage[]): Promise<Uint8Array>;
}
