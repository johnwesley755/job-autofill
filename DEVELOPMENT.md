# Development Progress & System Architecture

## Completed Stages

### Stage 0 — Foundation Audit and Corrections
- **Removed Fabricated Candidate Defaults**: Purged hardcoded assumptions (CGPA, institution, experience, salary, city, notice period) from `src/types/profile.ts`. Defaults are strictly blank/unknown.
- **Icon Assets Generation**: Created standard placeholder PNGs (`icon-16.png`, `icon-48.png`, `icon-128.png`) in `public/icons/`.
- **Scoped Content Script Match Rules**: Scoped content scripts to targeted ATS domains and career/application URLs.
- **Removed Fake Greenhouse Fallback**: Cleaned up `FormScannerTab.tsx` so mock ATS detections are never reported.
- **Safe Chrome Messaging**: Added `chrome.runtime.lastError` guards to prevent uncaught runtime errors during tab querying and messaging.

### Stage 1 — Profile Infrastructure & IndexedDB
- **IndexedDB Service (`src/utils/indexedDb.ts`)**: Versioned local storage for PDF/DOCX resumes (raw `Blob` binary bytes) and saved answers.
- **Resume Management (`src/sidepanel/components/ResumesTab.tsx`)**: Support for multiple resumes, default selection, file metadata, and deletions.
- **JSON Export / Import (`src/utils/validation.ts` & `SettingsTab.tsx`)**: Import/export with structural schema validation and error reporting.

### Stage 2 & Stage 5 — Universal Form Detection Engine (Hardened)
- **Modular Scanner Architecture**:
  - `src/scanner/types.ts`: Strongly-typed `DetectedField` and `FormScanSummary` interfaces with `automationId`, `testId`, `formId`, and `groupName`.
  - `src/scanner/classifier.ts`: Classification of text, email, tel, number, date, select, custom-select (combobox), textarea, radio/checkbox groups, and file inputs. Explicitly excludes `password` inputs from candidate profiling.
  - `src/scanner/labelExtractor.ts`: Extraction of ARIA labelledby/label, `<label for>`, enclosing labels, field containers, placeholders, and section headers with dedicated required-asterisk detection.
  - `src/scanner/formScanner.ts`: `UniversalFormScanner` orchestrator with radio button grouping by form context and stable selector generation avoiding fragile `nth-of-type` indexing.
  - `src/content/index.ts`: Debounced `MutationObserver` filtering irrelevant node mutations and notifying the background service worker when form controls change.

### Stage 3 & Stage 5 — Field Intelligence & Semantic Matching
- **Canonical Field Dictionary (`src/intelligence/dictionary.ts`)**: Recruiter alias dictionary with negative-keyword guards and granular profile field support:
  - Middle name, DOB, gender, nationality, street address, postal/PIN code
  - Education start year, backlogs count
  - CGPA (strictly separate from percentage)
  - Percentage (strictly separate from CGPA)
  - Internship experience (strictly separate from full-time experience)
  - Preferred cities (strictly separate from current city)
  - Work authorization, work mode, immediate joining, portfolio URL
- **Semantic Matcher (`src/intelligence/matcher.ts`)**:
  - HTML5 `autocomplete` attribute detection.
  - Type compatibility bonuses (e.g. `email` input type for `personal.email`).
  - Strict ambiguity detection for competing matches within close score margins.

### Stage 4 & Stage 6 — Automated Tests & Continuous Integration
- **GitHub Actions CI Workflow (`.github/workflows/ci.yml`)**: Automated check running `npm ci`, `npm run check`, `npm run test`, and `npm run build`.
- **Vitest Suites**:
  - `tests/profileStore.test.ts` (4 tests)
  - `tests/validation.test.ts` (6 tests)
  - `tests/scanner.test.ts` (10 tests)
  - **Total: 20 passing automated tests**.

---

## Current Status & Verification
- `npm run check`: TypeScript clean check (0 errors).
- `npm run test`: All 3 suites passing (20/20 tests passed).
- `npm run build`: Production bundle built in `dist/`.

---

## Recommended Next Stage: Form Filling Engine
In the upcoming stage (Phase 6), build the field autofilling engine:
1. React-controlled synthetic setters dispatching `input`, `change`, and `blur` events via `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set`.
2. Post-fill field verification.
3. Interactive Side Panel review and confirmation interface before candidate submission.
