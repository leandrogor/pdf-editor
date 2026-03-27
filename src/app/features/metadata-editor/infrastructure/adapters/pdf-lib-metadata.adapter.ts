import { Injectable } from '@angular/core';
import { PdfMetadata } from '@features/metadata-editor/domain/models/pdf-metadata.model';
import { PdfSession } from '@features/metadata-editor/domain/models/pdf-session.model';
import { PdfMetadataPort } from '@features/metadata-editor/domain/ports/pdf-metadata.port';
import { PDFDocument } from 'pdf-lib';

@Injectable({ providedIn: 'root' })
export class PdfLibMetadataAdapter implements PdfMetadataPort {
    private readonly sessions = new Map<string, PDFDocument>();

    async open(pdfBytes: Uint8Array): Promise<PdfSession> {
        const document = await PDFDocument.load(pdfBytes);
        const session: PdfSession = { id: crypto.randomUUID() };

        this.sessions.set(session.id, document);

        return session;
    }

    async readMetadata(session: PdfSession): Promise<PdfMetadata> {
        const document = this.getDocument(session);
        const keywords = document.getKeywords();

        return {
            title: document.getTitle() ?? '',
            author: document.getAuthor() ?? '',
            subject: document.getSubject() ?? '',
            keywords: Array.isArray(keywords) ? keywords.join(', ') : (keywords ?? ''),
            creator: document.getCreator() ?? '',
            producer: document.getProducer() ?? '',
            creationDate: this.toDateTimeLocal(document.getCreationDate()),
            modificationDate: this.toDateTimeLocal(document.getModificationDate()),
        };
    }

    async writeMetadata(session: PdfSession, metadata: PdfMetadata): Promise<void> {
        const document = this.getDocument(session);

        document.setTitle(metadata.title.trim());
        document.setAuthor(metadata.author.trim());
        document.setSubject(metadata.subject.trim());
        document.setCreator(metadata.creator.trim());
        document.setProducer(metadata.producer.trim());
        document.setKeywords(this.parseKeywords(metadata.keywords));

        const creationDate = this.fromDateTimeLocal(metadata.creationDate);
        if (creationDate) {
            document.setCreationDate(creationDate);
        }

        const modificationDate = this.fromDateTimeLocal(metadata.modificationDate);
        if (modificationDate) {
            document.setModificationDate(modificationDate);
        } else {
            document.setModificationDate(new Date());
        }
    }

    async save(session: PdfSession): Promise<Uint8Array> {
        const document = this.getDocument(session);
        return document.save();
    }

    close(session: PdfSession): void {
        this.sessions.delete(session.id);
    }

    private getDocument(session: PdfSession): PDFDocument {
        const document = this.sessions.get(session.id);

        if (!document) {
            throw new Error('La sesion PDF ya no esta disponible.');
        }

        return document;
    }

    private parseKeywords(keywords: string): string[] {
        return keywords
            .split(',')
            .map((keyword) => keyword.trim())
            .filter((keyword) => keyword.length > 0);
    }

    private toDateTimeLocal(date?: Date): string {
        if (!date) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    private fromDateTimeLocal(value: string): Date | null {
        if (!value.trim()) {
            return null;
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    }
}
