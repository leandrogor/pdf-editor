import { PDF_EXTENSION, PDF_MIME_TYPE } from '@shared/constants/file.constants';

export function isPdfFile(file: File): boolean {
    const normalizedName = file.name.toLowerCase();
    return file.type === PDF_MIME_TYPE || normalizedName.endsWith(PDF_EXTENSION);
}
