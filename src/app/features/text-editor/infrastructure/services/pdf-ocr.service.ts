import { Injectable, OnDestroy } from '@angular/core';
import { createWorker, Worker } from 'tesseract.js';

export interface OcrGroupedItem {
    text: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    confidence: number;
}

@Injectable({ providedIn: 'root' })
export class PdfOcrService implements OnDestroy {
    private workerPromise: Promise<Worker> | null = null;

    async ngOnDestroy(): Promise<void> {
        await this.terminate();
    }

    private async getWorker(onProgress?: (progressPct: number) => void): Promise<Worker> {
        if (!this.workerPromise) {
            this.workerPromise = (async () => {
                // Use absolute URLs so the web worker resolves them against the document
                // origin rather than against its own script URL.
                const origin = location.origin;
                const worker = await createWorker(['spa', 'eng'], undefined, {
                    workerPath: `${origin}/worker.min.js`,
                    langPath:   `${origin}/tessdata`,
                    corePath:   origin,
                    logger: (m) => {
                        if (onProgress && m.status === 'recognizing text') {
                            onProgress(Math.round((m.progress || 0) * 100));
                        }
                    },
                });
                return worker;
            })().catch((err) => {
                this.workerPromise = null;
                throw err;
            });
        }
        return this.workerPromise;
    }

    async recognize(
        imageSource: HTMLCanvasElement | string,
        onProgress?: (progressPct: number) => void,
    ): Promise<OcrGroupedItem[]> {
        const worker = await this.getWorker(onProgress);
        const result = await worker.recognize(imageSource, {}, { blocks: true });
        return this.extractWordGroups(result.data);
    }

    private extractWordGroups(data: any): OcrGroupedItem[] {
        const groups: OcrGroupedItem[] = [];

        for (const block of data.blocks || []) {
            for (const para of block.paragraphs || []) {
                for (const line of para.lines || []) {
                    const lineGroups = this.groupLineWords(line);
                    groups.push(...lineGroups);
                }
            }
        }

        return groups;
    }

    private groupLineWords(line: any): OcrGroupedItem[] {
        if (!line.words || line.words.length === 0) return [];

        const clusters: any[][] = [];
        let currentCluster: any[] = [line.words[0]];

        for (let i = 1; i < line.words.length; i++) {
            const prev = line.words[i - 1];
            const curr = line.words[i];
            const gap = curr.bbox.x0 - prev.bbox.x1;
            const avgHeight = (prev.bbox.y1 - prev.bbox.y0 + curr.bbox.y1 - curr.bbox.y0) / 2;

            const splitAfterColon = prev.text.trim().endsWith(':');
            const gapTooBig = gap > avgHeight * 1.5 || gap < -5;

            if (splitAfterColon || gapTooBig) {
                clusters.push(currentCluster);
                currentCluster = [curr];
            } else {
                currentCluster.push(curr);
            }
        }
        if (currentCluster.length > 0) clusters.push(currentCluster);

        return clusters
            .map((c) => {
                let text = c.map((w) => w.text).join(' ').trim();
                text = text
                    .replace(/&amp;apos;|&apos;|&mp;apos;/gi, "'")
                    .replace(/&amp;/gi, '&')
                    .replace(/&lt;/gi, '<')
                    .replace(/&gt;/gi, '>');

                const x0 = Math.min(...c.map((w) => w.bbox.x0));
                const y0 = Math.min(...c.map((w) => w.bbox.y0));
                const x1 = Math.max(...c.map((w) => w.bbox.x1));
                const y1 = Math.max(...c.map((w) => w.bbox.y1));
                const avgConf = c.reduce((acc, w) => acc + (w.confidence ?? 0), 0) / c.length;

                return { text, x0, y0, x1, y1, confidence: avgConf };
            })
            .filter((g) => {
                if (!g.text) return false;
                // Filter single char noise artifacts on extreme margins
                if (g.text.length <= 1 && (g.x0 < 45 || g.confidence < 45)) return false;
                return true;
            });
    }

    async terminate(): Promise<void> {
        if (this.workerPromise) {
            try {
                const worker = await this.workerPromise;
                await worker.terminate();
            } catch {
                // Ignore cleanup error
            }
            this.workerPromise = null;
        }
    }
}
