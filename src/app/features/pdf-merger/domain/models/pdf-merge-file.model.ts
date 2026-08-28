export interface PdfMergeFile {
    id: string;
    name: string;
    size: number;
    pageCount: number;
    bytes: Uint8Array;
}
