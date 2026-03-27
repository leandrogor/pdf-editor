# PDF Editor Platform

Angular 21 application for modular PDF tooling, currently focused on classic metadata editing.

## Tech Stack

- Angular 21 (standalone components, signals, modern control flow)
- Tailwind CSS v4 (utility-first styling)
- pdf-lib (client-side PDF metadata read/write)

## Current MVP

- Drag and drop PDF upload
- Manual PDF file selection
- Read existing classic PDF metadata
- Edit metadata fields
- Download updated PDF (keeps original file name)

Supported metadata fields:

- Title
- Author
- Subject
- Keywords
- Creator
- Producer
- Creation Date
- Modification Date

## UI Defaults

- Default language: English
- Default theme: Light
- Theme switch: off by default (turn on for dark mode)
- Language switch: off in English, on in Spanish

## Architecture

Feature-first structure with layered slices:

- `src/app/shell`: global layout and navigation
- `src/app/features`: domain-focused PDF tools
- `src/app/shared`: reusable constants and utilities
- `src/app/core`: cross-cutting services, DI tokens, error mapping

Current feature module:

- `src/app/features/metadata-editor/presentation`
- `src/app/features/metadata-editor/application`
- `src/app/features/metadata-editor/domain`
- `src/app/features/metadata-editor/infrastructure`

## Dependency Injection Design

The app uses Angular `InjectionToken`s to decouple business logic from concrete implementations.

- `PDF_METADATA_PORT` resolves to `PdfLibMetadataAdapter`
- `FILE_DOWNLOAD_PORT` resolves to `BrowserFileDownloadAdapter`

This makes the app easier to test and easier to extend (for example, replacing pdf-lib later without touching application logic).

## Project Commands

Install dependencies:

```bash
npm install
```

Run local development server (opens browser automatically on port 4300):

```bash
npm start
```

Build for production:

```bash
npm run build
```

Run unit tests:

```bash
npm test
```

## Current Constraints

- Password-protected/encrypted PDFs are not supported in this MVP
- Advanced XMP metadata editing is not included
- File size limit: 25MB

## Functional Flow

1. Upload a PDF
2. Load and display existing metadata
3. Edit metadata values
4. Apply changes in memory
5. Download the updated PDF
