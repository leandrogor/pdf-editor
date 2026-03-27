import { Component, inject, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { AppSettingsService } from '@core/services/app-settings.service';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PdfMetadata } from '@features/metadata-editor/domain/models/pdf-metadata.model';

@Component({
    selector: 'app-metadata-form',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './metadata-form.component.html',
})
export class MetadataFormComponent implements OnChanges {
    protected readonly appSettings = inject(AppSettingsService);
    private readonly formBuilder = inject(NonNullableFormBuilder);

    readonly metadata = input.required<PdfMetadata>();
    readonly disabled = input(false);

    readonly metadataSubmitted = output<PdfMetadata>();

    protected readonly form = this.formBuilder.group({
        title: ['', [Validators.maxLength(200)]],
        author: ['', [Validators.maxLength(200)]],
        subject: ['', [Validators.maxLength(200)]],
        keywords: ['', [Validators.maxLength(300)]],
        creator: ['', [Validators.maxLength(200)]],
        producer: ['', [Validators.maxLength(200)]],
        creationDate: [''],
        modificationDate: [''],
    });

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['metadata']) {
            this.form.patchValue(this.metadata(), { emitEvent: false });
            this.form.markAsPristine();
        }

        if (changes['disabled']) {
            if (this.disabled()) {
                this.form.disable({ emitEvent: false });
            } else {
                this.form.enable({ emitEvent: false });
            }
        }
    }

    protected onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.metadataSubmitted.emit(this.form.getRawValue());
        this.form.markAsPristine();
    }
}
