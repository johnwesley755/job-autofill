# Development Progress & System Architecture

## Completed Stages

### Stage 0 — Foundation Audit and Corrections
- **Removed Fabricated Candidate Defaults**: Purged hardcoded assumptions (CGPA, institution, experience, salary, city, notice period) from `src/types/profile.ts`. Defaults are strictly blank/unknown.
- **Icon Assets Generation**: Created standard placeholder PNGs (`icon-16.png`, `icon-48.png`, `icon-128.png`) in `public/icons/`.
- **Scoped Content Script Match Rules**: Replaced over-broad `*://*/*` injection in `public/manifest.json` with targeted ATS domains (`greenhouse.io`, `lever.co`, `myworkdayjobs.com`, `ashbyhq.com`) and job path patterns (`*job*`, `*career*`, `*apply*`).
- **Removed Fake Greenhouse Fallback**: Cleaned up `FormScannerTab.tsx` so mock ATS detections are never reported.
- **Safe Chrome Messaging**: Added `chrome.runtime.lastError` guards to prevent uncaught runtime errors during tab querying and messaging.
- **Completeness & Validation Engine**: Added `validateProfile` with real-time percentage indicators and conflict detection (e.g. Current CTC > Expected CTC).

### Stage 1 — Profile Infrastructure & IndexedDB
- **IndexedDB Service (`src/utils/indexedDb.ts`)**: Versioned local storage for PDF/DOCX resumes (raw `Blob` binary bytes) and saved answers.
- **Resume Management (`src/sidepanel/components/ResumesTab.tsx`)**: Support for multiple resumes, default selection, file metadata, and deletions.
- **JSON Export / Import (`src/utils/validation.ts` & `SettingsTab.tsx`)**: Import/export with structural schema validation and error reporting.

### Stage 2 — Universal Form Detection Engine
- **Modular Scanner Architecture**:
  - `src/scanner/types.ts`: Strongly-typed `DetectedField` and `FormScanSummary` interfaces.
  - `src/scanner/classifier.ts`: Classification of text, email, tel, number, date, select, custom-select (combobox), textarea, radio/checkbox groups, and file inputs.
  - `src/scanner/labelExtractor.ts`: Extraction of ARIA labelledby/label, `<label for>`, enclosing labels, field containers, placeholders, and section headers.
  - `src/scanner/formScanner.ts`: `UniversalFormScanner` class inspecting DOM form controls while filtering invisible nodes and buttons.
  - `src/content/index.ts`: Content script using debounced `MutationObserver` to notify on dynamic changes without full-page re-scanning loops.

### Stage 3 — Field Intelligence & Semantic Matching
- **Canonical Field Dictionary (`src/intelligence/dictionary.ts`)**: Recruiter alias dictionary with negative-keyword guards avoiding confusion between:
  - Current CTC vs Expected CTC
  - CGPA vs Percentage
  - Personal name vs Company name
  - City vs State vs Country
- **Semantic Matcher (`src/intelligence/matcher.ts`)**:
  - Conservative confidence tiers: `high` (≥ 0.75), `medium` (0.50 - 0.74), `low` (< 0.50).
  - Ambiguity detection when multiple profile fields compete within a close score margin.

### Stage 4 — Synthetic HTML Fixtures & Automated Verification
- Created realistic synthetic fixtures (`tests/fixtures/syntheticForms.ts`):
  1. Basic company form
  2. Greenhouse-style form
  3. Lever-style question list
  4. Workday-style form with ARIA combobox
  5. India compensation & notice period form with unknown questions
- Automated Vitest test suites:
  - `tests/profileStore.test.ts`: Zustand store mutation and name generation (4 tests passed).
  - `tests/validation.test.ts`: Profile validation, warning detection, JSON export/import (4 tests passed).
  - `tests/scanner.test.ts`: Form scanner detection, semantic matching, ambiguity detection, and compensation distinction (6 tests passed).
  - **Total: 14 passing automated tests**.

---

## Current Status & Known Limitations
- **Completed**: Stages 0, 1, 2, 3, and 4 (DOM scanner, candidate schemas, local IndexedDB, and field intelligence engine).
- **Not Yet Implemented (Next Phases)**:
  - Phase 4: Form input setter engine (React controlled synthetic event dispatchers).
  - Phase 5: File attachment engine using `DataTransfer` on file inputs.
  - Phase 6-8: Dedicated ATS platform adapters (Workday, Greenhouse, Lever, Ashby).

---

## Verification Commands
- `npm run check`: Strict TypeScript compilation passes with zero errors.
- `npm run test`: All 3 test suites and 14 tests pass.
- `npm run build`: Production build cleanly generates Manifest V3 bundle in `dist/`.
