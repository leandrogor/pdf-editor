import { Routes } from '@angular/router';

export const TEXT_EDITOR_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import(
                '@features/text-editor/presentation/pages/text-editor-page.component'
            ).then((m) => m.TextEditorPageComponent),
    },
];
