import { PdfPageLayout } from '@features/page-organizer/domain/models/pdf-page-layout.model';
import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';

export interface PdfPageOrganizerPort {
    open(pdfBytes: Uint8Array): Promise<PdfSession>;
    readPageLayout(session: PdfSession): Promise<PdfPageLayout[]>;
    saveWithLayout(session: PdfSession, layout: PdfPageLayout[]): Promise<Uint8Array>;
    close(session: PdfSession): void;
}
