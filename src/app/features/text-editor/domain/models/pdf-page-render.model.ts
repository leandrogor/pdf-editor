import { PdfTextItem } from './pdf-text-item.model';

export interface PdfPageRender {
    pageIndex: number;
    /** Page rendered as a base64 data URL PNG */
    imageDataUrl: string;
    /** Page width in PDF points */
    widthPt: number;
    /** Page height in PDF points */
    heightPt: number;
    /** Width in canvas pixels at the current scale */
    widthPx: number;
    /** Height in canvas pixels at the current scale */
    heightPx: number;
    /** Scale factor used when rendering */
    scale: number;
    textItems: PdfTextItem[];
}
