import { PdfMetadata } from '@features/metadata-editor/domain/models/pdf-metadata.model';
import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';

export interface PdfMetadataPort {
    open(pdfBytes: Uint8Array): Promise<PdfSession>;
    readMetadata(session: PdfSession): Promise<PdfMetadata>;
    writeMetadata(session: PdfSession, metadata: PdfMetadata): Promise<void>;
    save(session: PdfSession): Promise<Uint8Array>;
    close(session: PdfSession): void;
}
