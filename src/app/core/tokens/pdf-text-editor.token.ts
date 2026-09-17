import { InjectionToken } from '@angular/core';
import { PdfTextEditorPort } from '@features/text-editor/domain/ports/pdf-text-editor.port';

export const PDF_TEXT_EDITOR_PORT = new InjectionToken<PdfTextEditorPort>('PDF_TEXT_EDITOR_PORT');
