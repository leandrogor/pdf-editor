import { InjectionToken } from '@angular/core';
import { PdfMetadataPort } from '@features/metadata-editor/domain/ports/pdf-metadata.port';

export const PDF_METADATA_PORT = new InjectionToken<PdfMetadataPort>('PDF_METADATA_PORT');
