import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfMergerPageComponent } from './pdf-merger-page.component';
import { AppSettingsService } from '@core/services/app-settings.service';
import { PDF_MERGER_PORT } from '@core/tokens/pdf-merger.token';
import { FILE_DOWNLOAD_PORT } from '@core/tokens/file-download.token';

describe('PdfMergerPageComponent', () => {
    let component: PdfMergerPageComponent;
    let fixture: ComponentFixture<PdfMergerPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PdfMergerPageComponent],
            providers: [
                AppSettingsService,
                {
                    provide: PDF_MERGER_PORT,
                    useValue: {
                        inspectPdf: () => Promise.resolve({ pageCount: 1, initialRotations: [0] }),
                        mergeAndSave: () => Promise.resolve(new Uint8Array()),
                    },
                },
                {
                    provide: FILE_DOWNLOAD_PORT,
                    useValue: { download: () => {} },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PdfMergerPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should render the drop zone and title', () => {
        const appSettings = TestBed.inject(AppSettingsService);
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('h2')?.textContent).toContain(appSettings.t('mergeTitle'));
        expect(compiled.querySelector('input[type="file"]')).toBeTruthy();
    });
});
