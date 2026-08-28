import { PdfCompressOptions, PdfCompressResult } from '@features/pdf-compressor/domain/models/pdf-compress-options.model';

export interface PdfCompressorPort {
    compress(pdfBytes: Uint8Array, options: PdfCompressOptions): Promise<PdfCompressResult>;
}
