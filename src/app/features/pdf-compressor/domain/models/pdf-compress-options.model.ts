export type CompressionLevel = 'low' | 'medium' | 'high';
export type CompressionMode = 'preset' | 'target';
export type SizeUnit = 'MB' | 'KB';

export interface PdfCompressOptions {
    mode: CompressionMode;
    level?: CompressionLevel;
    targetSizeBytes?: number;
}

export interface PdfCompressResult {
    bytes: Uint8Array;
    originalSize: number;
    compressedSize: number;
    reductionPercentage: number;
    reductionBytes: number;
    isOriginalPreserved: boolean;
}
