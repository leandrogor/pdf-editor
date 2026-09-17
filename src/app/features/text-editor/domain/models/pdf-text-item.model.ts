export interface PdfTextItem {
    id: string;
    pageIndex: number;
    text: string;
    /** X position in PDF points (bottom-left origin) */
    x: number;
    /** Y position in PDF points (bottom-left origin) */
    y: number;
    width: number;
    height: number;
    fontSize: number;
    /** Original font name as reported by PDF.js */
    fontName: string;
    /** Resolved font family for CSS rendering */
    fontFamily: string;
    /** Whether the font is bold */
    bold: boolean;
    /** Whether the font is italic */
    italic: boolean;
    /** Whether the font has light/thin weight (e.g. 300, Light, Thin) */
    isLight: boolean;
    /** Text color as RGB [0..1] */
    color: [number, number, number];
    /** Full PDF transformation matrix [a, b, c, d, e, f] */
    transform: number[];
    /** Closest standard PDF font for re-embedding */
    pdfFont: 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' | 'Helvetica-BoldOblique'
           | 'Times-Roman' | 'Times-Bold' | 'Times-Italic' | 'Times-BoldItalic'
           | 'Courier' | 'Courier-Bold' | 'Courier-Oblique' | 'Courier-BoldOblique';
}
