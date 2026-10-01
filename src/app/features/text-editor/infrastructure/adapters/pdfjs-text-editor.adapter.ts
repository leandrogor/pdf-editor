import { inject, Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import {
    PDFDict,
    PDFDocument,
    PDFName,
    PDFNumber,
    PDFObject,
    PDFOperator,
    PDFOperatorNames,
    PDFPage,
    PDFRef,
    PDFString,
    rgb,
    StandardFonts,
} from 'pdf-lib';
import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';
import { PdfPageRender } from '@features/text-editor/domain/models/pdf-page-render.model';
import { PdfTextEdit } from '@features/text-editor/domain/models/pdf-text-edit.model';
import { PdfTextItem } from '@features/text-editor/domain/models/pdf-text-item.model';
import { PdfTextEditorPort } from '@features/text-editor/domain/ports/pdf-text-editor.port';
import { PdfOcrService } from '../services/pdf-ocr.service';

/** Minimal shape of a text item returned by PDF.js getTextContent() */
interface PdfjsTextItem {
    str: string;
    fontName: string;
    width?: number;
    transform: number[];
}

interface TextEditorSession {
    pdfjsDocument: PDFDocumentProxy;
    originalBytes: Uint8Array;
    lastRenderedCanvas?: HTMLCanvasElement;
    lastRenderedScale?: number;
    lastRenderedPageIndex?: number;
}

// Fallback: map to pdf-lib StandardFonts
const PDF_LIB_FONT_MAP: Record<PdfTextItem['pdfFont'], StandardFonts> = {
    'Helvetica':             StandardFonts.Helvetica,
    'Helvetica-Bold':        StandardFonts.HelveticaBold,
    'Helvetica-Oblique':     StandardFonts.HelveticaOblique,
    'Helvetica-BoldOblique': StandardFonts.HelveticaBoldOblique,
    'Times-Roman':           StandardFonts.TimesRoman,
    'Times-Bold':            StandardFonts.TimesRomanBold,
    'Times-Italic':          StandardFonts.TimesRomanItalic,
    'Times-BoldItalic':      StandardFonts.TimesRomanBoldItalic,
    'Courier':               StandardFonts.Courier,
    'Courier-Bold':          StandardFonts.CourierBold,
    'Courier-Oblique':       StandardFonts.CourierOblique,
    'Courier-BoldOblique':   StandardFonts.CourierBoldOblique,
};

@Injectable({ providedIn: 'root' })
export class PdfjsTextEditorAdapter implements PdfTextEditorPort {
    private readonly sessions = new Map<string, TextEditorSession>();
    private readonly ocrService = inject(PdfOcrService);

    constructor() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    // ─── Open ────────────────────────────────────────────────────────────────

    async open(pdfBytes: Uint8Array): Promise<PdfSession> {
        const pdfjsDocument = await pdfjsLib.getDocument({
            data: pdfBytes.slice(),
            password: '',
        }).promise;

        const session: PdfSession = { id: crypto.randomUUID() };
        this.sessions.set(session.id, { pdfjsDocument, originalBytes: pdfBytes });
        return session;
    }

    // ─── Page count ──────────────────────────────────────────────────────────

    getPageCount(session: PdfSession): number {
        return this.getSession(session).pdfjsDocument.numPages;
    }

    // ─── Render page ─────────────────────────────────────────────────────────

    async renderPage(session: PdfSession, pageIndex: number, scale: number): Promise<PdfPageRender> {
        const sessionData = this.getSession(session);
        const { pdfjsDocument } = sessionData;
        const page: PDFPageProxy = await pdfjsDocument.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale });
        const widthPx = Math.ceil(viewport.width);
        const heightPx = Math.ceil(viewport.height);

        // Render to a real DOM canvas
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Could not get 2D canvas context');

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const imageDataUrl = canvas.toDataURL('image/png');

        // Cache last rendered canvas for fast OCR lookup
        sessionData.lastRenderedCanvas = canvas;
        sessionData.lastRenderedScale = scale;
        sessionData.lastRenderedPageIndex = pageIndex;

        // Unscaled viewport for correct PDF point coordinates
        const unscaledViewport = page.getViewport({ scale: 1 });
        const pageHeightPt = unscaledViewport.height;

        const textContent = await page.getTextContent({ includeMarkedContent: false });
        const textItems: PdfTextItem[] = [];

        for (const rawItem of textContent.items) {
            const item = rawItem as PdfjsTextItem;
            if (!item.str || item.str.trim() === '') continue;

            const transform = item.transform;
            const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
            if (fontSize < 0.5) continue;

            const x = transform[4];
            const yBottomLeft = transform[5];
            const y = pageHeightPt - yBottomLeft - fontSize;
            const width = item.width ?? fontSize * item.str.length * 0.55;
            const height = fontSize * 1.2;

            // Resolve font metadata from PDF.js styles and commonObjs
            const style = textContent.styles[item.fontName];
            const fontObj = (page as any).commonObjs?.get(item.fontName);
            const realFontName = fontObj?.name || style?.fontFamily || item.fontName || '';

            const isLight = Boolean(
                /light|thin|hairline|extralight|ultralight|book|300|200|100/i.test(realFontName)
            );
            const isBold = Boolean(
                fontObj?.bold ||
                fontObj?.black ||
                /bold|heavy|black|demi|semibold|700|800|900/i.test(realFontName)
            );
            const isItalic = Boolean(
                fontObj?.italic ||
                /italic|oblique|slant/i.test(realFontName)
            );

            const fontInfo = this.resolveFontInfo(realFontName, isBold, isItalic);

            // Sample actual rendered text and background colors
            const sampled = this.sampleColors(ctx, x, y, width, height, scale);

            textItems.push({
                id: crypto.randomUUID(),
                pageIndex,
                text: item.str,
                x,
                y,
                width,
                height,
                fontSize,
                fontName: realFontName,
                fontFamily: fontInfo.cssFamily,
                bold: isBold,
                italic: isItalic,
                isLight,
                color: sampled.textColor,
                backgroundColor: sampled.backgroundColor,
                transform,
                pdfFont: fontInfo.pdfFont,
            });
        }

        const isScanned = textItems.length === 0;

        return {
            pageIndex,
            imageDataUrl,
            widthPt: unscaledViewport.width,
            heightPt: pageHeightPt,
            widthPx,
            heightPx,
            scale,
            textItems,
            isScanned,
        };
    }

    // ─── OCR recognition ─────────────────────────────────────────────────────

    async recognizeOcrText(
        session: PdfSession,
        pageIndex: number,
        scale: number,
        onProgress?: (progressPct: number) => void,
    ): Promise<PdfTextItem[]> {
        const sessionData = this.getSession(session);
        let canvas = sessionData.lastRenderedCanvas;
        let ctx = canvas?.getContext('2d', { willReadFrequently: true });

        if (!canvas || !ctx || sessionData.lastRenderedPageIndex !== pageIndex || sessionData.lastRenderedScale !== scale) {
            const page = await sessionData.pdfjsDocument.getPage(pageIndex + 1);
            const viewport = page.getViewport({ scale });
            canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Could not get 2D canvas context');
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
            sessionData.lastRenderedCanvas = canvas;
            sessionData.lastRenderedPageIndex = pageIndex;
            sessionData.lastRenderedScale = scale;
        }

        const ocrGroups = await this.ocrService.recognize(canvas, onProgress);
        const textItems: PdfTextItem[] = [];

        for (const g of ocrGroups) {
            const x = g.x0 / scale;
            const y = g.y0 / scale;
            const width = Math.max(12, (g.x1 - g.x0) / scale);
            const height = Math.max(8, (g.y1 - g.y0) / scale);
            const fontSize = Math.max(8, Math.min(60, height * 0.68));

            const sampled = this.sampleColors(ctx, x, y, width, height, scale);

            textItems.push({
                id: crypto.randomUUID(),
                pageIndex,
                text: g.text,
                x,
                y,
                width,
                height,
                fontSize,
                fontName: 'Helvetica',
                fontFamily: '"Segoe UI", Roboto, "Open Sans", Helvetica, Arial, sans-serif',
                bold: false,
                italic: false,
                isLight: false,
                color: sampled.textColor,
                backgroundColor: sampled.backgroundColor,
                transform: [fontSize, 0, 0, fontSize, x, y],
                pdfFont: 'Helvetica',
                isOcr: true,
            });
        }

        return textItems;
    }

    // ─── Apply edits ─────────────────────────────────────────────────────────

    async applyEdits(
        session: PdfSession,
        edits: PdfTextEdit[],
        allTextItems: PdfTextItem[],
    ): Promise<Uint8Array> {
        if (edits.length === 0) {
            return this.getSession(session).originalBytes;
        }

        const { originalBytes } = this.getSession(session);

        // Load with ignoreEncryption to handle owner-locked PDFs
        const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();

        const editMap = new Map<string, PdfTextEdit>(edits.map((e) => [e.itemId, e]));
        const itemMap = new Map<string, PdfTextItem>(allTextItems.map((i) => [i.id, i]));

        // Pre-embed fallback standard fonts
        const requiredFallbackFonts = new Set<PdfTextItem['pdfFont']>();
        for (const edit of edits) {
            const item = itemMap.get(edit.itemId);
            if (item) requiredFallbackFonts.add(item.pdfFont);
        }
        const fallbackFonts = new Map<
            PdfTextItem['pdfFont'],
            Awaited<ReturnType<typeof pdfDoc.embedFont>>
        >();
        for (const fontKey of requiredFallbackFonts) {
            fallbackFonts.set(fontKey, await pdfDoc.embedFont(PDF_LIB_FONT_MAP[fontKey]));
        }

        // Apply each edit
        for (const edit of editMap.values()) {
            const item = itemMap.get(edit.itemId);
            if (!item) continue;

            const page = pages[item.pageIndex];
            if (!page) continue;

            const pageHeightPt = page.getHeight();
            // Convert from top-left back to bottom-left (PDF space)
            const xPt = item.x;
            const yPt = pageHeightPt - item.y - item.fontSize;
            // OCR items need a larger margin to fully cover the scanned image text
            const margin = item.isOcr ? item.fontSize * 0.45 : item.fontSize * 0.2;

            // ── Step 1: erase original text with background color ───────
            if (!item.isManual) {
                const bg = item.backgroundColor ?? [1, 1, 1];
                page.drawRectangle({
                    x: xPt - margin,
                    y: yPt - margin,
                    width: item.width + margin * 2,
                    height: item.fontSize + margin * 2,
                    color: rgb(bg[0], bg[1], bg[2]),
                    opacity: 1,
                });
            }

            if (!edit.newText.trim()) continue;

            const [r, g, b] = item.color;

            // ── Step 2: attempt to draw with the ORIGINAL embedded font ────────
            const originalFontKey = this.findOriginalFontKey(pdfDoc, page, item.fontName, edit.newText);

            if (originalFontKey) {
                // Use raw PDF text operators referencing the already-embedded font
                page.pushOperators(
                    PDFOperator.of(PDFOperatorNames.BeginText),
                    PDFOperator.of(PDFOperatorNames.NonStrokingColorRgb, [r, g, b].map((n) => PDFNumber.of(n))),
                    PDFOperator.of(PDFOperatorNames.SetFontAndSize, [PDFName.of(originalFontKey), PDFNumber.of(item.fontSize)]),
                    PDFOperator.of(PDFOperatorNames.SetTextMatrix, [1, 0, 0, 1, xPt, yPt].map((n) => PDFNumber.of(n))),
                    PDFOperator.of(PDFOperatorNames.ShowText, [PDFString.of(edit.newText)]),
                    PDFOperator.of(PDFOperatorNames.EndText),
                );
            } else {
                // ── Fallback: draw with embedded standard font ─────────────────
                const font = fallbackFonts.get(item.pdfFont)!;

                // For OCR items the background is a scanned image — the white-stroke
                // trick would paint a visible halo. Use plain fill (mode 0) instead.
                if (item.isOcr || item.isManual) {
                    page.drawText(edit.newText, {
                        x: xPt,
                        y: yPt,
                        font,
                        size: item.fontSize,
                        color: rgb(r, g, b),
                    });
                } else if (!item.bold) {
                    // Standard Helvetica in PDF readers has heavy stems (weight ~400+).
                    // When the original document text is Light (300) or regular screen sans,
                    // raw Helvetica looks like bold text.
                    // To achieve the EXACT light/regular weight without looking bold,
                    // we use PDF text rendering mode 2 (Fill, then stroke with white).
                    // The microscopic white stroke seamlessly trims the outer perimeter
                    // of the glyph against the white background, resulting in crisp,
                    // thin, elegant letterforms that perfectly match the original document.
                    try {
                        const encoded = font.encodeText(edit.newText);
                        const thinStrokeWidth = item.isLight
                            ? Math.max(0.35, Math.min(0.60, item.fontSize * 0.038))
                            : Math.max(0.22, Math.min(0.42, item.fontSize * 0.026));

                        page.pushOperators(
                            PDFOperator.of(PDFOperatorNames.PushGraphicsState),
                            // Line width for outer edge erosion
                            PDFOperator.of(PDFOperatorNames.SetLineWidth, [PDFNumber.of(thinStrokeWidth)]),
                            // Stroke with white (blends into the white background)
                            PDFOperator.of(PDFOperatorNames.StrokingColorRgb, [PDFNumber.of(1), PDFNumber.of(1), PDFNumber.of(1)]),
                            // Fill with sampled text color
                            PDFOperator.of(PDFOperatorNames.NonStrokingColorRgb, [r, g, b].map((n) => PDFNumber.of(n))),
                            PDFOperator.of(PDFOperatorNames.BeginText),
                            PDFOperator.of(PDFOperatorNames.SetFontAndSize, [PDFName.of(font.name), PDFNumber.of(item.fontSize)]),
                            // Mode 2: Fill then stroke text
                            PDFOperator.of(PDFOperatorNames.SetTextRenderingMode, [PDFNumber.of(2)]),
                            PDFOperator.of(PDFOperatorNames.SetTextMatrix, [1, 0, 0, 1, xPt, yPt].map((n) => PDFNumber.of(n))),
                            PDFOperator.of(PDFOperatorNames.ShowText, [encoded]),
                            PDFOperator.of(PDFOperatorNames.EndText),
                            PDFOperator.of(PDFOperatorNames.PopGraphicsState),
                        );
                    } catch {
                        // Fallback in case of unsupported glyph in encodeText
                        page.drawText(edit.newText, {
                            x: xPt,
                            y: yPt,
                            font,
                            size: item.fontSize,
                            color: rgb(r, g, b),
                        });
                    }
                } else {
                    // For bold text, standard drawText gives the desired bold weight
                    page.drawText(edit.newText, {
                        x: xPt,
                        y: yPt,
                        font,
                        size: item.fontSize,
                        color: rgb(r, g, b),
                    });
                }
            }
        }

        return pdfDoc.save();
    }

    // ─── Close ───────────────────────────────────────────────────────────────

    close(session: PdfSession): void {
        const s = this.sessions.get(session.id);
        if (s) {
            void s.pdfjsDocument.cleanup();
            delete s.lastRenderedCanvas;
            this.sessions.delete(session.id);
        }
    }

    private sampleColors(
        ctx: CanvasRenderingContext2D,
        xPt: number,
        yPt: number,
        wPt: number,
        hPt: number,
        scale: number,
    ): { textColor: [number, number, number]; backgroundColor: [number, number, number] } {
        try {
            // ── Text color: scan the interior of the bbox ─────────────────────
            const scanX  = Math.max(0, Math.floor(xPt * scale));
            const scanY  = Math.max(0, Math.floor(yPt * scale));
            const scanW  = Math.max(1, Math.min(Math.floor(wPt * scale * 0.8), ctx.canvas.width  - scanX));
            const scanH  = Math.max(1, Math.min(Math.floor(hPt * scale),        ctx.canvas.height - scanY));
            const interior = ctx.getImageData(scanX, scanY, scanW, scanH).data;

            let minLum = 255;
            let bestR = 0.12, bestG = 0.12, bestB = 0.12;
            let foundText = false;

            for (let i = 0; i < interior.length; i += 4) {
                const a = interior[i + 3];
                if (a < 100) continue;
                const lum = (interior[i] + interior[i + 1] + interior[i + 2]) / 3;
                if (lum < 200 && lum < minLum) {
                    minLum = lum;
                    bestR = interior[i]     / 255;
                    bestG = interior[i + 1] / 255;
                    bestB = interior[i + 2] / 255;
                    foundText = true;
                }
            }

            // ── Background color: sample a strip OUTSIDE the text area ────────
            // Prefer the 4-px strip ABOVE the bbox; fall back to below, then inside.
            const stripH = Math.max(4, Math.round(hPt * scale * 0.25));
            let bgR = 1, bgG = 1, bgB = 1;
            let foundBg = false;

            const trySampleStrip = (sy: number): boolean => {
                const clampSY = Math.max(0, sy);
                const clampSH = Math.min(stripH, ctx.canvas.height - clampSY);
                if (clampSH <= 0) return false;
                const clampSX = Math.max(0, scanX);
                const clampSW = Math.min(scanW, ctx.canvas.width - clampSX);
                if (clampSW <= 0) return false;
                const strip = ctx.getImageData(clampSX, clampSY, clampSW, clampSH).data;
                let maxLum = 0;
                let found = false;
                for (let i = 0; i < strip.length; i += 4) {
                    if (strip[i + 3] < 100) continue;
                    const lum = (strip[i] + strip[i + 1] + strip[i + 2]) / 3;
                    if (lum > maxLum) {
                        maxLum = lum;
                        bgR = strip[i]     / 255;
                        bgG = strip[i + 1] / 255;
                        bgB = strip[i + 2] / 255;
                        found = true;
                    }
                }
                return found && maxLum > 180; // only accept if clearly light
            };

            // Try strip above → strip below → fallback to interior brightest pixel
            if (!trySampleStrip(scanY - stripH)) {
                if (!trySampleStrip(scanY + Math.floor(hPt * scale) + 2)) {
                    // Last resort: pick lightest pixel from interior
                    let maxLum = 0;
                    for (let i = 0; i < interior.length; i += 4) {
                        if (interior[i + 3] < 100) continue;
                        const lum = (interior[i] + interior[i + 1] + interior[i + 2]) / 3;
                        if (lum > maxLum) {
                            maxLum = lum;
                            bgR = interior[i]     / 255;
                            bgG = interior[i + 1] / 255;
                            bgB = interior[i + 2] / 255;
                            foundBg = true;
                        }
                    }
                }
            }

            return {
                textColor:       foundText ? [bestR, bestG, bestB] : [0.12, 0.12, 0.12],
                backgroundColor: [bgR, bgG, bgB],
            };
        } catch {
            return {
                textColor:       [0.12, 0.12, 0.12],
                backgroundColor: [1, 1, 1],
            };
        }
    }


    // ─── Private: original font lookup ───────────────────────────────────────

    private findOriginalFontKey(
        pdfDoc: PDFDocument,
        page: PDFPage,
        pdfjsFontName: string,
        newText: string,
    ): string | null {
        if (!this.isLatin1Compatible(newText)) return null;

        try {
            const pageDict = page.node as unknown as PDFDict;
            const resources = this.resolveToDictSafe(pdfDoc, pageDict.get(PDFName.of('Resources')));
            if (!resources) return null;

            const fontDict = this.resolveToDictSafe(pdfDoc, resources.get(PDFName.of('Font')));
            if (!fontDict) return null;

            const targetNorm = this.normaliseFontName(pdfjsFontName);

            for (const [keyPdfName, fontRefOrObj] of fontDict.entries()) {
                const fontObj = this.resolveToDictSafe(pdfDoc, fontRefOrObj);
                if (!fontObj) continue;

                // Skip CID (composite) fonts — they use 2-byte encodings
                const subtype = this.pdfNameValue(fontObj.get(PDFName.of('Subtype')));
                if (subtype === 'Type0') continue;

                // Skip fonts with Identity-H/V encoding
                const encoding = this.pdfNameValue(fontObj.get(PDFName.of('Encoding')));
                if (encoding === 'Identity-H' || encoding === 'Identity-V') continue;

                const baseFont = this.pdfNameValue(fontObj.get(PDFName.of('BaseFont')));
                if (!baseFont) continue;

                const baseFontNorm = this.normaliseFontName(baseFont);

                const matches =
                    baseFontNorm === targetNorm ||
                    baseFontNorm.startsWith(targetNorm) ||
                    targetNorm.startsWith(baseFontNorm) ||
                    baseFontNorm.includes(targetNorm) ||
                    targetNorm.includes(baseFontNorm);

                if (matches) {
                    return keyPdfName.toString().replace(/^\//, '');
                }
            }
        } catch {
            // Best-effort
        }
        return null;
    }

    private resolveToDictSafe(pdfDoc: PDFDocument, obj: PDFObject | undefined): PDFDict | null {
        if (!obj) return null;
        try {
            const resolved: PDFObject =
                obj instanceof PDFRef ? (pdfDoc.context.lookup(obj) ?? obj) : obj;
            return resolved instanceof PDFDict ? resolved : null;
        } catch {
            return null;
        }
    }

    private pdfNameValue(obj: PDFObject | undefined): string {
        if (!obj) return '';
        return obj.toString().replace(/^\//, '');
    }

    private normaliseFontName(name: string): string {
        return name
            .replace(/^[A-Z]{6}\+/, '')
            .replace(/\//g, '')
            .toLowerCase()
            .replace(/[-_\s]/g, '');
    }

    private isLatin1Compatible(text: string): boolean {
        return Array.from(text).every((ch) => {
            const code = ch.charCodeAt(0);
            return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
        });
    }

    // ─── Private: font family resolution ─────────────────────────────────────

    private resolveFontInfo(
        rawFontName: string,
        bold: boolean,
        italic: boolean,
    ): {
        cssFamily: string;
        bold: boolean;
        italic: boolean;
        pdfFont: PdfTextItem['pdfFont'];
    } {
        const name = rawFontName.replace(/^[A-Z]{6}\+/, '').toLowerCase();

        // Sans-Serif family: Segoe UI, Roboto, Open Sans, Arial, Helvetica, etc.
        if (/helvetica|arial|segoe|roboto|opensans|open sans|lato|montserrat|ubuntu|noto|(?<![a-z])sans(?![a-z])/.test(name)) {
            return {
                cssFamily: '"Segoe UI", Roboto, "Open Sans", Helvetica, Arial, sans-serif',
                bold,
                italic,
                pdfFont: this.helveticaVariant(bold, italic),
            };
        }

        // Times / Serif family
        if (/times|roman|georgia|cambria|(?<![a-z])serif/.test(name)) {
            return {
                cssFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
                bold,
                italic,
                pdfFont: this.timesVariant(bold, italic),
            };
        }

        // Monospace family
        if (/courier|mono(?:space)?|consolas|cour/.test(name)) {
            return {
                cssFamily: 'Consolas, "Courier New", Courier, monospace',
                bold,
                italic,
                pdfFont: this.courierVariant(bold, italic),
            };
        }

        // Calibri
        if (/calibri|carlito/.test(name)) {
            return {
                cssFamily: 'Calibri, "Segoe UI", Helvetica, Arial, sans-serif',
                bold,
                italic,
                pdfFont: this.helveticaVariant(bold, italic),
            };
        }

        // Default: clean modern sans-serif
        return {
            cssFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            bold,
            italic,
            pdfFont: this.helveticaVariant(bold, italic),
        };
    }

    private helveticaVariant(bold: boolean, italic: boolean): PdfTextItem['pdfFont'] {
        if (bold && italic) return 'Helvetica-BoldOblique';
        if (bold)           return 'Helvetica-Bold';
        if (italic)         return 'Helvetica-Oblique';
        return 'Helvetica';
    }

    private timesVariant(bold: boolean, italic: boolean): PdfTextItem['pdfFont'] {
        if (bold && italic) return 'Times-BoldItalic';
        if (bold)           return 'Times-Bold';
        if (italic)         return 'Times-Italic';
        return 'Times-Roman';
    }

    private courierVariant(bold: boolean, italic: boolean): PdfTextItem['pdfFont'] {
        if (bold && italic) return 'Courier-BoldOblique';
        if (bold)           return 'Courier-Bold';
        if (italic)         return 'Courier-Oblique';
        return 'Courier';
    }

    private getSession(session: PdfSession): TextEditorSession {
        const s = this.sessions.get(session.id);
        if (!s) throw new Error('PDF text editor session is no longer available.');
        return s;
    }
}
