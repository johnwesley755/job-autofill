# Development Progress & System Architecture

## Completed Stages

### Stage 0 — Foundation Audit and Corrections
- **Removed Fabricated Candidate Defaults**: Purged hardcoded assumptions (CGPA, institution, experience, salary, city, notice period) from `src/types/profile.ts`. Defaults are strictly blank/unknown.
- **Icon Assets Generation**: Created standard placeholder PNGs (`icon-16.png`, `icon-48.png`, `icon-128.png`) in `public/icons/`.
- **Scoped Content Script Match Rules**: Scoped content scripts to targeted ATS domains and career/application URLs.
- **Removed Fake Greenhouse Fallback**: Cleaned up `FormScannerTab.tsx` so mock ATS detections are never reported.
- **Safe Chrome Messaging**: Added `chrome.runtime.lastError` guards to prevent uncaught runtime errors during tab querying and messaging.

### Stage 1 — Profile Infrastructure & IndexedDB
- **IndexedDB Service (`src/utils/indexedDb.ts`)**: Versioned local storage for PDF/DOCX resumes (raw `Blob` binary bytes with magic-bytes verification and 5MB limits) and saved answers.
- **Resume Management (`src/sidepanel/components/ResumesTab.tsx`)**: Support for multiple resumes, default selection, file metadata, and deletions.
- **JSON Export / Import (`src/utils/validation.ts` & `SettingsTab.tsx`)**: Import/export with structural schema validation, strict boolean coercion prevention, and error reporting.

### Stage 2 & Stage 6 — Universal Form Detection Engine (Hardened)
- **Modular Scanner Architecture**: Strongly-typed `DetectedField` and `FormScanSummary` with layout bounding checks and DOM element registries.
- **Classifier & Label Extractor**: Excludes passwords, hidden and disabled controls; respects label-for and ARIA semantics.

### Stage 7, 8 & 9 — Production-Safe Autofill
- **Strict Session Isolation**: Rejects mismatched session IDs to prevent cross-session filling.
- **Safe Overwrite Protection**: Separated states: existing page value, ambiguous mapping, conflicting field match. Requires explicit consent before touching existing values.

### Stage 10 & 11 — Standalone Dashboard, Onest Typography & UI Redesign
- **Full-Page Standalone Dashboard (`app.html` & `src/app/index.tsx`)**:
  - Manifest V3 `chrome.action.onClicked` listener launches/focuses the standalone dashboard tab at `chrome-extension://<id>/app.html`.
  - Removed small popup action.
  - Sidebar workspace navigation: Overview, Personal Details, Education, Experience, Skills & Links, Job Preferences, Resume Library, Form Assistant, and Settings.
  - Honest Dashboard Overview displaying live profile completeness, stored IndexedDB resume counts, and active browser tab target status.
- **Onest Typography (`public/fonts/`)**:
  - Self-hosted Google Fonts Onest WOFF2 files (weights 400, 500, 600, 700) bundled directly inside the extension for offline capability.
- **Hallmark Visual Design System**:
  - Refined warm canvas (`#fcfbf9`), deep charcoal text (`#1c1f1d`), and deep forest green accent (`#1e4634`).
  - Dark mode support using matching deep neutrals.
  - Strict absence of AI slop: no decorative blobs, fake metrics, generic testimonials, or flashy gradient cards.
- **Extension Packaging & Validation**:
  - `scripts/validate-extension.mjs` verifies `app.html`, manifest paths, and font assets.
  - `scripts/package-extension.mjs` generates `job-autofill-extension.zip`.
