import { InjectionToken } from '@angular/core';
import { FileDownloadPort } from '@features/metadata-editor/domain/ports/file-download.port';

export const FILE_DOWNLOAD_PORT = new InjectionToken<FileDownloadPort>('FILE_DOWNLOAD_PORT');
