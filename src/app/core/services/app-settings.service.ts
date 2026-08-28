import { computed, Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'es' | 'en';

const THEME_STORAGE_KEY = 'pdf-editor-theme';
const LANGUAGE_STORAGE_KEY = 'pdf-editor-language';

const TRANSLATIONS = {
    es: {
        appTitle: 'PDF Editor Platform',
        appSubtitle: 'Herramientas PDF modulares sobre Angular 21',
        navMetadata: 'Metadatos',
        navPages: 'Paginas',
        navMerge: 'Unir PDFs',
        navCompress: 'Comprimir PDF',
        themeLabel: 'Modo oscuro',
        languageLabel: 'English',
        editorTitle: 'Editor de Metadatos PDF',
        editorSubtitle: 'Arrastra un PDF, edita los campos clasicos y descarga el archivo modificado.',
        pagesTitle: 'Organizador de Paginas PDF',
        pagesSubtitle: 'Reordena, rota o elimina paginas y descarga el PDF resultante.',
        pagesListTitle: 'Paginas del documento',
        pagesListSubtitle: 'Estos cambios se aplican al descargar el archivo actualizado.',
        mergeTitle: 'Unir y Organizar PDFs',
        mergeSubtitle: 'Combina multiples archivos PDF, reorganiza sus paginas o elimina las que no necesites.',
        compressTitle: 'Comprimir PDF',
        compressSubtitle: 'Reduce el tamaño de tu archivo PDF manteniendo la máxima calidad posible.',
        dropMergeTitle: 'Arrastra uno o varios PDFs aqui',
        dropMergeSubtitle: 'o selecciona archivos manualmente para combinarlos',
        compressDropTitle: 'Arrastra tu PDF aqui',
        compressDropSubtitle: 'o selecciona un archivo manualmente para comprimirlo',
        compressModePreset: 'Nivel predefinido',
        compressModeTarget: 'Tamaño objetivo',
        compressLevelLow: 'Baja',
        compressLevelLowDesc: 'Menor compresión, máxima calidad visual.',
        compressLevelMedium: 'Media (Recomendada)',
        compressLevelMediumDesc: 'Equilibrio ideal entre tamaño y nitidez.',
        compressLevelHigh: 'Alta',
        compressLevelHighDesc: 'Máximo ahorro de espacio.',
        compressTargetLabel: 'Tamaño objetivo deseado:',
        compressTargetUnit: 'Unidad',
        compressTargetHelper: 'Objetivo:',
        compressTargetAlreadySmaller: 'El archivo original ya es menor o igual al tamaño objetivo. Se descargará el archivo original sin agrandarlo.',
        compressActionBtn: 'Comprimir PDF',
        compressingBtn: 'Comprimiendo PDF...',
        compressResultTitle: 'Resultado de la compresión',
        compressOriginalSize: 'Tamaño original:',
        compressNewSize: 'Nuevo tamaño:',
        compressSaved: 'Ahorro:',
        compressOriginalPreservedNotice: 'El archivo original ya estaba optimizado o es menor que el objetivo. Se conserva el archivo original sin cambios.',
        compressDownloadBtn: 'Descargar PDF comprimido',
        compressOtherFileBtn: 'Comprimir otro PDF',
        compressInvalidTarget: 'Ingresa un valor numérico válido mayor a 0 para el tamaño objetivo.',
        selectPdfs: 'Seleccionar PDFs',
        addMorePdfs: 'Agregar mas PDFs',
        loadedFilesTitle: 'Archivos cargados',
        loadedFilesSubtitle: 'Lista de documentos seleccionados para la combinacion.',
        filePagesLabel: 'paginas',
        removeFile: 'Quitar archivo',
        moveFileUp: 'Mover archivo arriba',
        moveFileDown: 'Mover archivo abajo',
        mergedPagesTitle: 'Paginas del documento combinado',
        mergedPagesSubtitle: 'Reorganiza el orden de las paginas o elimina las que no desees incluir.',
        sourceFileLabel: 'Origen',
        downloadMergedPdf: 'Descargar PDF combinado',
        clearAll: 'Limpiar todo',
        pageLabel: 'Pagina',
        originalPageLabel: 'Pagina original',
        rotationLabel: 'Rotacion',
        moveUp: 'Subir',
        moveDown: 'Bajar',
        rotateLeft: 'Rotar izquierda',
        rotateRight: 'Rotar derecha',
        removePage: 'Eliminar',
        downloadOrganizedPdf: 'Descargar PDF organizado',
        loadedFile: 'Archivo cargado:',
        metadataSectionTitle: 'Metadatos',
        metadataSectionSubtitle: 'Puedes modificar cualquier valor y aplicarlo al PDF.',
        downloadUpdated: 'Descargar PDF actualizado',
        processing: 'Procesando...',
        dropTitle: 'Arrastra un PDF aqui',
        dropSubtitle: 'o selecciona un archivo manualmente',
        selectPdf: 'Seleccionar PDF',
        fieldTitle: 'Title',
        fieldAuthor: 'Author',
        fieldSubject: 'Subject',
        fieldKeywords: 'Keywords (coma separadas)',
        fieldCreator: 'Creator',
        fieldProducer: 'Producer',
        fieldCreationDate: 'Creation Date',
        fieldModificationDate: 'Modification Date',
        updateMetadata: 'Actualizar metadatos',
        errorOnlyPdf: 'Solo se permiten archivos PDF.',
        errorTooLarge: 'El archivo supera el limite de 25MB para este MVP.',
        errorEncrypted: 'El PDF esta encriptado y no se puede editar en esta version.',
        errorCorrupted: 'No se pudo procesar el PDF. Verifica que el archivo no este corrupto.',
        errorUnexpected: 'Ocurrio un error inesperado procesando el PDF.',
        errorAtLeastOnePage: 'El PDF debe conservar al menos una pagina.',
        errorAtLeastOneFile: 'Debes cargar al menos un archivo PDF.',
    },
    en: {
        appTitle: 'PDF Editor Platform',
        appSubtitle: 'Modular PDF tools powered by Angular 21',
        navMetadata: 'Metadata',
        navPages: 'Pages',
        navMerge: 'Merge PDFs',
        navCompress: 'Compress PDF',
        themeLabel: 'Dark mode',
        languageLabel: 'Spanish',
        editorTitle: 'PDF Metadata Editor',
        editorSubtitle: 'Drop a PDF, edit classic metadata fields, and download the updated file.',
        pagesTitle: 'PDF Page Organizer',
        pagesSubtitle: 'Reorder, rotate, or remove pages and download the resulting PDF.',
        pagesListTitle: 'Document pages',
        pagesListSubtitle: 'These changes are applied when you download the updated file.',
        mergeTitle: 'Merge & Organize PDFs',
        mergeSubtitle: 'Combine multiple PDF files, reorder their pages, or remove the ones you do not need.',
        compressTitle: 'Compress PDF',
        compressSubtitle: 'Reduce the size of your PDF file while retaining the highest possible quality.',
        dropMergeTitle: 'Drop one or multiple PDFs here',
        dropMergeSubtitle: 'or select files manually to combine them',
        compressDropTitle: 'Drop your PDF here',
        compressDropSubtitle: 'or select a file manually to compress it',
        compressModePreset: 'Preset level',
        compressModeTarget: 'Target size',
        compressLevelLow: 'Low',
        compressLevelLowDesc: 'Lowest compression, highest visual quality.',
        compressLevelMedium: 'Medium (Recommended)',
        compressLevelMediumDesc: 'Ideal balance between size reduction and crisp quality.',
        compressLevelHigh: 'High',
        compressLevelHighDesc: 'Maximum size reduction for tight email or upload limits.',
        compressTargetLabel: 'Desired target size:',
        compressTargetUnit: 'Unit',
        compressTargetHelper: 'Target:',
        compressTargetAlreadySmaller: 'The original file is already smaller than or equal to the target size. The original file will be downloaded without enlarging.',
        compressActionBtn: 'Compress PDF',
        compressingBtn: 'Compressing PDF...',
        compressResultTitle: 'Compression result',
        compressOriginalSize: 'Original size:',
        compressNewSize: 'New size:',
        compressSaved: 'Saved:',
        compressOriginalPreservedNotice: 'The original file was already optimized or smaller than the target. The original file is preserved without changes.',
        compressDownloadBtn: 'Download compressed PDF',
        compressOtherFileBtn: 'Compress another PDF',
        compressInvalidTarget: 'Please enter a valid numeric value greater than 0 for target size.',
        selectPdfs: 'Select PDFs',
        addMorePdfs: 'Add more PDFs',
        loadedFilesTitle: 'Loaded files',
        loadedFilesSubtitle: 'List of documents selected for merging.',
        filePagesLabel: 'pages',
        removeFile: 'Remove file',
        moveFileUp: 'Move file up',
        moveFileDown: 'Move file down',
        mergedPagesTitle: 'Combined document pages',
        mergedPagesSubtitle: 'Reorder page sequence or remove pages you do not want to include.',
        sourceFileLabel: 'Source',
        downloadMergedPdf: 'Download merged PDF',
        clearAll: 'Clear all',
        pageLabel: 'Page',
        originalPageLabel: 'Original page',
        rotationLabel: 'Rotation',
        moveUp: 'Move up',
        moveDown: 'Move down',
        rotateLeft: 'Rotate left',
        rotateRight: 'Rotate right',
        removePage: 'Remove',
        downloadOrganizedPdf: 'Download organized PDF',
        loadedFile: 'Loaded file:',
        metadataSectionTitle: 'Metadata',
        metadataSectionSubtitle: 'You can change any value and apply it to the PDF.',
        downloadUpdated: 'Download updated PDF',
        processing: 'Processing...',
        dropTitle: 'Drop a PDF here',
        dropSubtitle: 'or select a file manually',
        selectPdf: 'Select PDF',
        fieldTitle: 'Title',
        fieldAuthor: 'Author',
        fieldSubject: 'Subject',
        fieldKeywords: 'Keywords (comma separated)',
        fieldCreator: 'Creator',
        fieldProducer: 'Producer',
        fieldCreationDate: 'Creation Date',
        fieldModificationDate: 'Modification Date',
        updateMetadata: 'Update metadata',
        errorOnlyPdf: 'Only PDF files are allowed.',
        errorTooLarge: 'The file exceeds the 25MB limit for this MVP.',
        errorEncrypted: 'This PDF is encrypted and cannot be edited in this version.',
        errorCorrupted: 'The PDF could not be processed. Check that the file is not corrupted.',
        errorUnexpected: 'An unexpected error occurred while processing the PDF.',
        errorAtLeastOnePage: 'The PDF must keep at least one page.',
        errorAtLeastOneFile: 'You must load at least one PDF file.',
    },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.es;

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
    readonly theme = signal<AppTheme>('light');
    readonly language = signal<AppLanguage>('en');

    readonly isDarkMode = computed(() => this.theme() === 'dark');
    readonly isEnglish = computed(() => this.language() === 'en');

    constructor() {
        this.initializeTheme();
        this.initializeLanguage();
    }

    toggleTheme(): void {
        const nextTheme: AppTheme = this.theme() === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
    }

    toggleLanguage(): void {
        const nextLanguage: AppLanguage = this.language() === 'es' ? 'en' : 'es';
        this.setLanguage(nextLanguage);
    }

    t(key: TranslationKey): string {
        return TRANSLATIONS[this.language()][key];
    }

    private initializeTheme(): void {
        const storedTheme = this.readStorageValue<AppTheme>(THEME_STORAGE_KEY);

        if (storedTheme === 'light' || storedTheme === 'dark') {
            this.setTheme(storedTheme);
            return;
        }

        this.setTheme('light');
    }

    private initializeLanguage(): void {
        const storedLanguage = this.readStorageValue<AppLanguage>(LANGUAGE_STORAGE_KEY);

        if (storedLanguage === 'es' || storedLanguage === 'en') {
            this.setLanguage(storedLanguage);
            return;
        }

        this.setLanguage('en');
    }

    private setTheme(theme: AppTheme): void {
        this.theme.set(theme);
        this.writeStorageValue(THEME_STORAGE_KEY, theme);
        this.applyTheme(theme);
    }

    private setLanguage(language: AppLanguage): void {
        this.language.set(language);
        this.writeStorageValue(LANGUAGE_STORAGE_KEY, language);
    }

    private applyTheme(theme: AppTheme): void {
        if (typeof document === 'undefined') {
            return;
        }

        document.documentElement.classList.toggle('dark', theme === 'dark');
    }

    private readStorageValue<T extends string>(key: string): T | null {
        if (typeof localStorage === 'undefined') {
            return null;
        }

        return localStorage.getItem(key) as T | null;
    }

    private writeStorageValue(key: string, value: string): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(key, value);
    }
}
