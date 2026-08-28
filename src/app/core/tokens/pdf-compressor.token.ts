import { InjectionToken } from '@angular/core';
import { PdfCompressorPort } from '@features/pdf-compressor/domain/ports/pdf-compressor.port';

export const PDF_COMPRESSOR_PORT = new InjectionToken<PdfCompressorPort>('PDF_COMPRESSOR_PORT');
