import { InjectionToken } from '@angular/core';
import { PdfPageOrganizerPort } from '@features/page-organizer/domain/ports/pdf-page-organizer.port';

export const PDF_PAGE_ORGANIZER_PORT = new InjectionToken<PdfPageOrganizerPort>(
    'PDF_PAGE_ORGANIZER_PORT',
);
