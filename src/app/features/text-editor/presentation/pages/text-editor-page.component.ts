import { Component, inject } from '@angular/core';
import { AppSettingsService } from '@core/services/app-settings.service';
import { DropZoneComponent } from '@features/metadata-editor/presentation/components/drop-zone/drop-zone.component';
import { PdfTextOverlayComponent } from '@features/text-editor/presentation/components/pdf-text-overlay/pdf-text-overlay.component';
import { TextEditorStore } from '@features/text-editor/presentation/state/text-editor.store';
import { PdfTextEdit } from '@features/text-editor/domain/models/pdf-text-edit.model';

@Component({
    selector: 'app-text-editor-page',
    standalone: true,
    imports: [DropZoneComponent, PdfTextOverlayComponent],
    providers: [TextEditorStore],
    templateUrl: './text-editor-page.component.html',
})
export class TextEditorPageComponent {
    protected readonly appSettings = inject(AppSettingsService);
    protected readonly store = inject(TextEditorStore);

    protected async onFileSelected(file: File): Promise<void> {
        await this.store.loadFile(file);
    }

    protected async onNextPage(): Promise<void> {
        await this.store.nextPage();
    }

    protected async onPrevPage(): Promise<void> {
        await this.store.prevPage();
    }

    protected async onZoomIn(): Promise<void> {
        await this.store.zoomIn();
    }

    protected async onZoomOut(): Promise<void> {
        await this.store.zoomOut();
    }

    protected onTextEdit(edit: PdfTextEdit): void {
        this.store.recordEdit(edit);
    }

    protected async onDownload(): Promise<void> {
        await this.store.downloadPdf();
    }
}
