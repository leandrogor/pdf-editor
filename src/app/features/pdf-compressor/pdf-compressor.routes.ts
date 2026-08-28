import { Routes } from '@angular/router';

export const PDF_COMPRESSOR_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./presentation/pages/pdf-compressor-page.component').then(
                (m) => m.PdfCompressorPageComponent,
            ),
    },
];
