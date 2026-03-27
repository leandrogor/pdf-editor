import { Injectable } from '@angular/core';
import { FileDownloadPort } from '@features/metadata-editor/domain/ports/file-download.port';

@Injectable({ providedIn: 'root' })
export class BrowserFileDownloadAdapter implements FileDownloadPort {
    download(fileBytes: Uint8Array, fileName: string, mimeType: string): void {
        const normalizedBytes = new Uint8Array(fileBytes);
        const blob = new Blob([normalizedBytes.buffer], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.click();

        URL.revokeObjectURL(objectUrl);
    }
}
