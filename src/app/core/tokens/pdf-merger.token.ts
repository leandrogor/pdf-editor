import { InjectionToken } from '@angular/core';
import { PdfMergerPort } from '@features/pdf-merger/domain/ports/pdf-merger.port';

export const PDF_MERGER_PORT = new InjectionToken<PdfMergerPort>('PDF_MERGER_PORT');
