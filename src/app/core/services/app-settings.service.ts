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
        themeLabel: 'Modo oscuro',
        languageLabel: 'English',
        editorTitle: 'Editor de Metadatos PDF',
        editorSubtitle: 'Arrastra un PDF, edita los campos clasicos y descarga el archivo modificado.',
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
    },
    en: {
        appTitle: 'PDF Editor Platform',
        appSubtitle: 'Modular PDF tools powered by Angular 21',
        navMetadata: 'Metadata',
        themeLabel: 'Dark mode',
        languageLabel: 'Spanish',
        editorTitle: 'PDF Metadata Editor',
        editorSubtitle: 'Drop a PDF, edit classic metadata fields, and download the updated file.',
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
