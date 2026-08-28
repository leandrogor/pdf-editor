import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfCompressorPageComponent } from './pdf-compressor-page.component';
import { AppSettingsService } from '@core/services/app-settings.service';
import { PDF_COMPRESSOR_PORT } from '@core/tokens/pdf-compressor.token';
import { FILE_DOWNLOAD_PORT } from '@core/tokens/file-download.token';

describe('PdfCompressorPageComponent', () => {
    let component: PdfCompressorPageComponent;
    let fixture: ComponentFixture<PdfCompressorPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PdfCompressorPageComponent],
            providers: [
                AppSettingsService,
                {
                    provide: PDF_COMPRESSOR_PORT,
                    useValue: {
                        compress: () =>
                            Promise.resolve({
                                bytes: new Uint8Array(),
                                originalSize: 100,
                                compressedSize: 60,
                                reductionPercentage: 40,
                                reductionBytes: 40,
                                isOriginalPreserved: false,
                            }),
                    },
                },
                {
                    provide: FILE_DOWNLOAD_PORT,
                    useValue: { download: () => {} },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PdfCompressorPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should render the drop zone and compressor title', () => {
        const appSettings = TestBed.inject(AppSettingsService);
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('h2')?.textContent).toContain(appSettings.t('compressTitle'));
        expect(compiled.querySelector('input[type="file"]')).toBeTruthy();
    });
});
