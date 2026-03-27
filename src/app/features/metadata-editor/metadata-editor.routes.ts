import { Routes } from '@angular/router';

export const METADATA_EDITOR_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('@features/metadata-editor/presentation/pages/metadata-editor-page.component').then(
                (m) => m.MetadataEditorPageComponent,
            ),
    },
];
