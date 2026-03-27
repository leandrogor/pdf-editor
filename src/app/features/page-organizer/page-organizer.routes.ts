import { Routes } from '@angular/router';

export const PAGE_ORGANIZER_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('@features/page-organizer/presentation/pages/page-organizer-page.component').then(
                (m) => m.PageOrganizerPageComponent,
            ),
    },
];
