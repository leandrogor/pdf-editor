import { Routes } from '@angular/router';

export const PDF_MERGER_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('@features/pdf-merger/presentation/pages/pdf-merger-page.component').then(
                (m) => m.PdfMergerPageComponent,
            ),
    },
];
