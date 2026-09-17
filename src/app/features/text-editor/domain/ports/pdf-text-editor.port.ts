import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';
import { PdfPageRender } from '@features/text-editor/domain/models/pdf-page-render.model';
import { PdfTextEdit } from '@features/text-editor/domain/models/pdf-text-edit.model';
import { PdfTextItem } from '@features/text-editor/domain/models/pdf-text-item.model';

export interface PdfTextEditorPort {
    open(pdfBytes: Uint8Array): Promise<PdfSession>;
    getPageCount(session: PdfSession): number;
    renderPage(session: PdfSession, pageIndex: number, scale: number): Promise<PdfPageRender>;
    applyEdits(
        session: PdfSession,
        edits: PdfTextEdit[],
        allTextItems: PdfTextItem[],
    ): Promise<Uint8Array>;
    close(session: PdfSession): void;
}
