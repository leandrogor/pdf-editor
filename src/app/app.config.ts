import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FILE_DOWNLOAD_PORT } from '@core/tokens/file-download.token';
import { PDF_METADATA_PORT } from '@core/tokens/pdf-metadata.token';
import { BrowserFileDownloadAdapter } from '@features/metadata-editor/infrastructure/adapters/browser-file-download.adapter';
import { PdfLibMetadataAdapter } from '@features/metadata-editor/infrastructure/adapters/pdf-lib-metadata.adapter';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    PdfLibMetadataAdapter,
    BrowserFileDownloadAdapter,
    {
      provide: PDF_METADATA_PORT,
      useExisting: PdfLibMetadataAdapter,
    },
    {
      provide: FILE_DOWNLOAD_PORT,
      useExisting: BrowserFileDownloadAdapter,
    },
  ],
};
