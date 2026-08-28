import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('@shell/layout/shell-layout.component').then((m) => m.ShellLayoutComponent),
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'metadata',
            },
            {
                path: 'metadata',
                loadChildren: () =>
                    import('@features/metadata-editor/metadata-editor.routes').then(
                        (m) => m.METADATA_EDITOR_ROUTES,
                    ),
            },
            {
                path: 'pages',
                loadChildren: () =>
                    import('@features/page-organizer/page-organizer.routes').then(
                        (m) => m.PAGE_ORGANIZER_ROUTES,
                    ),
            },
            {
                path: 'merge',
                loadChildren: () =>
                    import('@features/pdf-merger/pdf-merger.routes').then(
                        (m) => m.PDF_MERGER_ROUTES,
                    ),
            },
            {
                path: 'compress',
                loadChildren: () =>
                    import('@features/pdf-compressor/pdf-compressor.routes').then(
                        (m) => m.PDF_COMPRESSOR_ROUTES,
                    ),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
