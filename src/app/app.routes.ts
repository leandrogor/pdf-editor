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
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
