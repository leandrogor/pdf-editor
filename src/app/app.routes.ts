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
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
