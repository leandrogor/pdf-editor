import { Injectable } from '@angular/core';
import { PdfPageLayout } from '@features/page-organizer/domain/models/pdf-page-layout.model';
import { PdfPageOrganizerPort } from '@features/page-organizer/domain/ports/pdf-page-organizer.port';
import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';
import { PDFDocument, degrees } from 'pdf-lib';

@Injectable({ providedIn: 'root' })
export class PdfLibPageOrganizerAdapter implements PdfPageOrganizerPort {
    private readonly sessions = new Map<string, PDFDocument>();

    async open(pdfBytes: Uint8Array): Promise<PdfSession> {
        const document = await PDFDocument.load(pdfBytes);
        const session: PdfSession = { id: crypto.randomUUID() };

        this.sessions.set(session.id, document);

        return session;
    }

    async readPageLayout(session: PdfSession): Promise<PdfPageLayout[]> {
        const document = this.getDocument(session);
        const pages = document.getPages();

        return pages.map((page, index) => ({
            sourceIndex: index,
            rotation: this.normalizeRotation(page.getRotation().angle),
        }));
    }

    async saveWithLayout(session: PdfSession, layout: PdfPageLayout[]): Promise<Uint8Array> {
        const sourceDocument = this.getDocument(session);
        const organizedDocument = await PDFDocument.create();
        const sourceIndexes = layout.map((page) => page.sourceIndex);
        const copiedPages = await organizedDocument.copyPages(sourceDocument, sourceIndexes);

        copiedPages.forEach((page, index) => {
            page.setRotation(degrees(this.normalizeRotation(layout[index].rotation)));
            organizedDocument.addPage(page);
        });

        return organizedDocument.save();
    }

    close(session: PdfSession): void {
        this.sessions.delete(session.id);
    }

    private getDocument(session: PdfSession): PDFDocument {
        const document = this.sessions.get(session.id);

        if (!document) {
            throw new Error('PDF session is no longer available.');
        }

        return document;
    }

    private normalizeRotation(value: number): number {
        const normalized = ((value % 360) + 360) % 360;

        if (normalized === 90 || normalized === 180 || normalized === 270) {
            return normalized;
        }

        return 0;
    }
}
