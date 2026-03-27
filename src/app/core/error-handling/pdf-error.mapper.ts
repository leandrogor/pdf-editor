import { TranslationKey } from '@core/services/app-settings.service';

export function mapPdfErrorKey(error: unknown): TranslationKey {
    if (error instanceof Error) {
        const normalized = error.message.toLowerCase();

        if (normalized.includes('encrypted')) {
            return 'errorEncrypted';
        }

        if (normalized.includes('failed to parse') || normalized.includes('invalid')) {
            return 'errorCorrupted';
        }
    }

    return 'errorUnexpected';
}
