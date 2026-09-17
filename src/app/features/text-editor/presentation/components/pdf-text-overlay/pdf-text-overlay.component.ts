import {
    Component,
    ElementRef,
    input,
    output,
    signal,
    viewChildren,
} from '@angular/core';
import { PdfPageRender } from '@features/text-editor/domain/models/pdf-page-render.model';
import { PdfTextEdit } from '@features/text-editor/domain/models/pdf-text-edit.model';
import { PdfTextItem } from '@features/text-editor/domain/models/pdf-text-item.model';

@Component({
    selector: 'app-pdf-text-overlay',
    standalone: true,
    templateUrl: './pdf-text-overlay.component.html',
    host: { class: 'block' },
})
export class PdfTextOverlayComponent {
    readonly page = input.required<PdfPageRender>();
    readonly edits = input<Map<string, PdfTextEdit>>(new Map());
    readonly textEdit = output<PdfTextEdit>();

    /** Tracks which text item is currently active / being edited */
    protected readonly activeItemId = signal<string | null>(null);

    protected onFocus(item: PdfTextItem): void {
        this.activeItemId.set(item.id);
    }

    protected onBlur(item: PdfTextItem, event: FocusEvent): void {
        this.activeItemId.set(null);
        const span = event.target as HTMLSpanElement;
        const newText = span.textContent ?? '';

        if (newText !== item.text) {
            this.textEdit.emit({
                itemId: item.id,
                originalText: item.text,
                newText,
            });
        }
    }

    protected onKeydown(event: KeyboardEvent, item: PdfTextItem): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            (event.target as HTMLElement).blur();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            const span = event.target as HTMLSpanElement;
            span.textContent = item.text;
            span.blur();
        }
    }

    /**
     * Convert a PdfTextItem's position (in PDF points, top-left origin) to
     * CSS pixel position for the overlay, using the page's scale factor.
     *
     * KEY FIX FOR DOUBLE-VISION:
     * When not editing and not modified, text color is TRANSPARENT.
     * This lets the crisp, sharp canvas image underneath show through completely
     * with zero ghosting or blurry duplicate outlines.
     * When focused for editing or modified, a solid white background covers
     * the underlying image text, and the editable text becomes clearly visible.
     */
    protected itemStyle(
        item: PdfTextItem,
        scale: number,
        isEditing: boolean,
        isModified: boolean,
    ): Record<string, string> {
        const isVisible = isEditing || isModified;
        const color = isVisible
            ? `rgb(${item.color.map((c) => Math.round(c * 255)).join(',')})`
            : 'transparent';

        const backgroundColor = isVisible ? '#ffffff' : 'transparent';

        return {
            left: `${item.x * scale}px`,
            top: `${item.y * scale}px`,
            minWidth: `${item.width * scale}px`,
            height: `${item.height * scale}px`,
            fontSize: `${item.fontSize * scale}px`,
            lineHeight: `${item.height * scale}px`,
            fontFamily: item.fontFamily,
            fontWeight: item.bold ? 'bold' : item.isLight ? '300' : 'normal',
            fontStyle: item.italic ? 'italic' : 'normal',
            color,
            backgroundColor,
            caretColor: '#0284c7',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
        };
    }

    protected trackById(_index: number, item: PdfTextItem): string {
        return item.id;
    }
}
