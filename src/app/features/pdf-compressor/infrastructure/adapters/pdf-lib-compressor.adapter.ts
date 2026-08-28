import { Injectable } from '@angular/core';
import {
    CompressionLevel,
    PdfCompressOptions,
    PdfCompressResult,
} from '@features/pdf-compressor/domain/models/pdf-compress-options.model';
import { PdfCompressorPort } from '@features/pdf-compressor/domain/ports/pdf-compressor.port';
import { JpegEmbedder, PDFDocument, PDFName, PDFNumber } from 'pdf-lib';
import * as pako from 'pako';

interface CompressionPresetConfig {
    quality: number;
    maxDimension: number;
}

const PRESET_CONFIGS: Record<CompressionLevel, CompressionPresetConfig> = {
    low: { quality: 0.85, maxDimension: 2048 },
    medium: { quality: 0.72, maxDimension: 1600 },
    high: { quality: 0.52, maxDimension: 1200 },
};

@Injectable({ providedIn: 'root' })
export class PdfLibCompressorAdapter implements PdfCompressorPort {
    async compress(pdfBytes: Uint8Array, options: PdfCompressOptions): Promise<PdfCompressResult> {
        const originalSize = pdfBytes.length;

        // If in target mode and original is already within target, return original without enlarging
        if (
            options.mode === 'target' &&
            typeof options.targetSizeBytes === 'number' &&
            options.targetSizeBytes > 0 &&
            originalSize <= options.targetSizeBytes
        ) {
            return {
                bytes: pdfBytes,
                originalSize,
                compressedSize: originalSize,
                reductionPercentage: 0,
                reductionBytes: 0,
                isOriginalPreserved: true,
            };
        }

        let bestBytes: Uint8Array | null = null;

        if (options.mode === 'preset') {
            const level = options.level ?? 'medium';
            const config = PRESET_CONFIGS[level];
            bestBytes = await this.executeCompressionPass(pdfBytes, config.quality, config.maxDimension);
        } else {
            // Target size mode: attempt progressive adaptive passes from ultra-high fidelity downwards to retain maximum possible quality that fits within target
            const targetBytes = options.targetSizeBytes ?? originalSize;
            const passes: CompressionPresetConfig[] = [
                { quality: 0.95, maxDimension: 3840 },
                { quality: 0.92, maxDimension: 3000 },
                { quality: 0.88, maxDimension: 2560 },
                { quality: 0.84, maxDimension: 2048 },
                { quality: 0.78, maxDimension: 1800 },
                { quality: 0.72, maxDimension: 1500 },
                { quality: 0.64, maxDimension: 1280 },
                { quality: 0.54, maxDimension: 1080 },
                { quality: 0.42, maxDimension: 900 },
                { quality: 0.30, maxDimension: 720 },
            ];

            let smallestSoFar: Uint8Array | null = null;

            for (const pass of passes) {
                const passResult = await this.executeCompressionPass(pdfBytes, pass.quality, pass.maxDimension);

                if (!smallestSoFar || passResult.length < smallestSoFar.length) {
                    smallestSoFar = passResult;
                }

                // If this pass reached the target size with highest possible quality, stop here
                if (passResult.length <= targetBytes) {
                    bestBytes = passResult;
                    break;
                }
            }

            bestBytes = bestBytes ?? smallestSoFar;
        }

        // Rule: If compression resulted in a larger file or no reduction, preserve original file without enlarging
        if (!bestBytes || bestBytes.length >= originalSize) {
            return {
                bytes: pdfBytes,
                originalSize,
                compressedSize: originalSize,
                reductionPercentage: 0,
                reductionBytes: 0,
                isOriginalPreserved: true,
            };
        }

        const compressedSize = bestBytes.length;
        const reductionBytes = originalSize - compressedSize;
        const reductionPercentage = Math.max(1, Math.round((reductionBytes / originalSize) * 100));

        return {
            bytes: bestBytes,
            originalSize,
            compressedSize,
            reductionPercentage,
            reductionBytes,
            isOriginalPreserved: false,
        };
    }

    private async executeCompressionPass(
        pdfBytes: Uint8Array,
        imageQuality: number,
        maxDimension: number,
    ): Promise<Uint8Array> {
        try {
            const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            const context = doc.context;
            const objects = context.enumerateIndirectObjects();

            for (const [ref, obj] of objects) {
                if (!obj || typeof (obj as any).dict?.get !== 'function') {
                    continue;
                }

                const dict = (obj as any).dict;
                const subtype = dict.get(PDFName.of('Subtype'))?.toString();
                const type = dict.get(PDFName.of('Type'))?.toString();

                if (subtype === '/Image' || (type === '/XObject' && subtype !== '/Form')) {
                    await this.optimizeImageStream(doc, ref, obj, imageQuality, maxDimension);
                }
            }

            return await doc.save({ useObjectStreams: true });
        } catch {
            // If processing fails, fallback to object streams only or original
            try {
                const fallbackDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
                return await fallbackDoc.save({ useObjectStreams: true });
            } catch {
                return pdfBytes;
            }
        }
    }

    private async optimizeImageStream(
        doc: PDFDocument,
        ref: any,
        stream: any,
        quality: number,
        maxDimension: number,
    ): Promise<void> {
        const contents = (stream.contents || (typeof stream.getContents === 'function' ? stream.getContents() : null)) as Uint8Array | null;
        if (!contents || contents.length === 0) {
            return;
        }

        try {
            const dict = stream.dict;
            const filterObj = dict?.get(PDFName.of('Filter'));
            const filterStr = filterObj ? filterObj.toString() : '';
            const widthObj = dict?.get(PDFName.of('Width'));
            const heightObj = dict?.get(PDFName.of('Height'));
            const width = widthObj instanceof PDFNumber ? widthObj.asNumber() : 0;
            const height = heightObj instanceof PDFNumber ? heightObj.asNumber() : 0;

            let recompressedBytes: Uint8Array | null = null;

            // Check 1: JPEG stream (starts with JPEG header or has DCTDecode in filter)
            if (
                (contents[0] === 0xff && contents[1] === 0xd8) ||
                filterStr.includes('DCTDecode') ||
                filterStr.includes('/DCT')
            ) {
                recompressedBytes = await this.recompressJpegBytes(contents, quality, maxDimension);
            }
            // Check 2: FlateDecode / Deflated image stream
            else if (
                filterStr.includes('FlateDecode') ||
                filterStr.includes('/Fl') ||
                (contents[0] === 0x78)
            ) {
                try {
                    const decompressed = pako.inflate(contents);
                    if (decompressed[0] === 0xff && decompressed[1] === 0xd8) {
                        // JPEG wrapped in Flate
                        recompressedBytes = await this.recompressJpegBytes(decompressed, quality, maxDimension);
                    } else if (width > 0 && height > 0) {
                        const colorSpace = dict?.get(PDFName.of('ColorSpace'))?.toString() || '';
                        const decodeParms = dict?.get(PDFName.of('DecodeParms'));
                        let predictor = 1;
                        if (decodeParms && typeof decodeParms.get === 'function') {
                            const predObj = decodeParms.get(PDFName.of('Predictor'));
                            if (predObj instanceof PDFNumber) {
                                predictor = predObj.asNumber();
                            }
                        }

                        const channels: 1 | 3 = (colorSpace.includes('Gray') || decompressed.length === width * height) ? 1 : 3;

                        const rawPixels: Uint8Array = predictor >= 10
                            ? this.unfilterPngScanlines(decompressed, width, height, channels)
                            : new Uint8Array(decompressed);

                        recompressedBytes = await this.recompressRawPixels(rawPixels, width, height, channels, quality, maxDimension);
                    }
                } catch {
                    // Ignore decompression failures
                }
            }

            // If we successfully produced a smaller representation, replace the image stream
            if (recompressedBytes && recompressedBytes.length < contents.length) {
                const cleanBytes = new Uint8Array(recompressedBytes.length);
                cleanBytes.set(recompressedBytes);
                const embedder = await JpegEmbedder.for(cleanBytes);
                await embedder.embedIntoContext(doc.context, ref);
            }
        } catch {
            // Keep original stream untouched on any failure
        }
    }

    private unfilterPngScanlines(
        data: Uint8Array,
        width: number,
        height: number,
        channels: number,
    ): Uint8Array {
        const rowStride = width * channels;
        const filteredRowStride = 1 + rowStride;
        const raw = new Uint8Array(width * height * channels);
        let prevRawRow = new Uint8Array(rowStride);

        for (let y = 0; y < height; y++) {
            const filterType = data[y * filteredRowStride];
            const rowStart = y * filteredRowStride + 1;
            const currRawRow = new Uint8Array(rowStride);

            for (let x = 0; x < rowStride; x++) {
                const byte = data[rowStart + x] || 0;
                const left = x >= channels ? currRawRow[x - channels] : 0;
                const up = prevRawRow[x];
                const upLeft = x >= channels ? prevRawRow[x - channels] : 0;

                let val = byte;
                if (filterType === 1) {
                    val = (byte + left) & 0xff;
                } else if (filterType === 2) {
                    val = (byte + up) & 0xff;
                } else if (filterType === 3) {
                    val = (byte + Math.floor((left + up) / 2)) & 0xff;
                } else if (filterType === 4) {
                    const p = left + up - upLeft;
                    const pa = Math.abs(p - left);
                    const pb = Math.abs(p - up);
                    const pc = Math.abs(p - upLeft);
                    let pr = left;
                    if (pb < pa && pb <= pc) pr = up;
                    else if (pc < pa && pc < pb) pr = upLeft;
                    val = (byte + pr) & 0xff;
                }
                currRawRow[x] = val;
                raw[y * rowStride + x] = val;
            }
            prevRawRow = currRawRow;
        }

        return raw;
    }

    private async recompressRawPixels(
        pixels: Uint8Array,
        width: number,
        height: number,
        channels: 1 | 3,
        quality: number,
        maxDimension: number,
    ): Promise<Uint8Array | null> {
        if (typeof document === 'undefined') {
            return null;
        }

        try {
            const expectedSize = width * height * channels;
            if (pixels.length < expectedSize) {
                return null;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return null;
            }

            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;

            if (channels === 3) {
                for (let i = 0, j = 0; i < width * height; i++, j += 3) {
                    const idx = i * 4;
                    data[idx] = pixels[j];
                    data[idx + 1] = pixels[j + 1];
                    data[idx + 2] = pixels[j + 2];
                    data[idx + 3] = 255;
                }
            } else {
                for (let i = 0; i < width * height; i++) {
                    const val = pixels[i];
                    const idx = i * 4;
                    data[idx] = val;
                    data[idx + 1] = val;
                    data[idx + 2] = val;
                    data[idx + 3] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            let targetWidth = width;
            let targetHeight = height;

            if (targetWidth > maxDimension || targetHeight > maxDimension) {
                if (targetWidth > targetHeight) {
                    targetHeight = Math.max(1, Math.round((targetHeight * maxDimension) / targetWidth));
                    targetWidth = maxDimension;
                } else {
                    targetWidth = Math.max(1, Math.round((targetWidth * maxDimension) / targetHeight));
                    targetHeight = maxDimension;
                }

                const scaledCanvas = document.createElement('canvas');
                scaledCanvas.width = targetWidth;
                scaledCanvas.height = targetHeight;
                const scaledCtx = scaledCanvas.getContext('2d');
                if (!scaledCtx) {
                    return null;
                }

                scaledCtx.imageSmoothingEnabled = true;
                scaledCtx.imageSmoothingQuality = 'high';
                scaledCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

                return this.canvasToJpegBytes(scaledCanvas, quality);
            }

            return this.canvasToJpegBytes(canvas, quality);
        } catch {
            return null;
        }
    }

    private async recompressJpegBytes(
        jpegBytes: Uint8Array,
        quality: number,
        maxDimension: number,
    ): Promise<Uint8Array | null> {
        if (typeof document === 'undefined') {
            return null;
        }

        try {
            const cleanBytes = new Uint8Array(jpegBytes.length);
            cleanBytes.set(jpegBytes);
            const blob = new Blob([cleanBytes as BlobPart], { type: 'image/jpeg' });
            return await this.recompressBlobThroughCanvas(blob, quality, maxDimension);
        } catch {
            return null;
        }
    }

    private async recompressBlobThroughCanvas(
        blob: Blob,
        quality: number,
        maxDimension: number,
    ): Promise<Uint8Array | null> {
        let imageBitmap: ImageBitmap | HTMLImageElement | null = null;

        try {
            if (typeof createImageBitmap !== 'undefined') {
                try {
                    imageBitmap = await createImageBitmap(blob);
                } catch {
                    imageBitmap = null;
                }
            }

            if (!imageBitmap) {
                const img = new Image();
                const url = URL.createObjectURL(blob);
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Image failed to load in canvas'));
                    img.src = url;
                });
                URL.revokeObjectURL(url);
                imageBitmap = img;
            }

            let width = imageBitmap.width;
            let height = imageBitmap.height;

            if (width <= 0 || height <= 0) {
                return null;
            }

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.max(1, Math.round((height * maxDimension) / width));
                    width = maxDimension;
                } else {
                    width = Math.max(1, Math.round((width * maxDimension) / height));
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return null;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(imageBitmap, 0, 0, width, height);

            return this.canvasToJpegBytes(canvas, quality);
        } catch {
            return null;
        } finally {
            if (imageBitmap && 'close' in imageBitmap && typeof (imageBitmap as ImageBitmap).close === 'function') {
                (imageBitmap as ImageBitmap).close();
            }
        }
    }

    private canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Uint8Array | null {
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            if (!dataUrl?.startsWith('data:image/jpeg;base64,')) {
                return null;
            }

            const base64 = dataUrl.substring('data:image/jpeg;base64,'.length);
            const binaryStr = atob(base64);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.codePointAt(i) ?? 0;
            }
            return bytes;
        } catch {
            return null;
        }
    }
}
