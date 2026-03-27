import { Component, inject } from '@angular/core';
import { AppSettingsService } from '@core/services/app-settings.service';
import { DropZoneComponent } from '@features/metadata-editor/presentation/components/drop-zone/drop-zone.component';
import { MetadataFormComponent } from '@features/metadata-editor/presentation/components/metadata-form/metadata-form.component';
import { MetadataEditorStore } from '@features/metadata-editor/presentation/state/metadata-editor.store';
import { PdfMetadata } from '@features/metadata-editor/domain/models/pdf-metadata.model';

@Component({
    selector: 'app-metadata-editor-page',
    standalone: true,
    imports: [DropZoneComponent, MetadataFormComponent],
    providers: [MetadataEditorStore],
    templateUrl: './metadata-editor-page.component.html',
})
export class MetadataEditorPageComponent {
    protected readonly appSettings = inject(AppSettingsService);
    protected readonly store = inject(MetadataEditorStore);

    protected async onFileSelected(file: File): Promise<void> {
        await this.store.loadFile(file);
    }

    protected async onMetadataSubmitted(metadata: PdfMetadata): Promise<void> {
        await this.store.updateMetadata(metadata);
    }

    protected async onDownloadClicked(): Promise<void> {
        await this.store.downloadPdf();
    }
}
