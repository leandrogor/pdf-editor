export interface FileDownloadPort {
    download(fileBytes: Uint8Array, fileName: string, mimeType: string): void;
}
