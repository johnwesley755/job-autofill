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
- **Modular Scanner Architecture**:
  - `src/scanner/types.ts`: Strongly-typed `DetectedField` and `FormScanSummary` interfaces with `automationId`, `testId`, `formId`, `groupName`, `isReadOnly`, and `scanSessionId`.
  - `src/scanner/classifier.ts`: Classification of text, email, tel, number, date, select, custom-select (combobox), textarea, radio/checkbox groups, and file inputs. Explicitly excludes `password` inputs from candidate profiling. Checks ancestor occlusion, fixed-position elements, and layout bounding boxes.
  - `src/scanner/labelExtractor.ts`: Extraction of ARIA labelledby/label, `<label for>`, enclosing labels, field containers, placeholders, and section headers with dedicated required-asterisk detection.
  - `src/scanner/formScanner.ts`: `UniversalFormScanner` orchestrator with radio button and checkbox grouping by form/fieldset context, scan-session registration, and stable selector generation avoiding fragile `nth-of-type` indexing.
  - `src/scanner/elementRegistry.ts`: In-memory `ScanSessionElementRegistry` tracking exact DOM nodes per scan session in the content script, eliminating serialization and stale DOM reference failures.
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
  - Strict ambiguity detection for competing matches within close score margins or mutually exclusive categories.
  - Strict confidence tiers: High (`>= 0.90`), Medium (`0.70 - 0.89`), Low (`< 0.70`).

### Stage 7, Stage 8 & Stage 9 — Production-Safe Autofill & Chromium Browser Integration
- **Strict Session Isolation (`src/scanner/elementRegistry.ts`)**:
  - Immediate rejection of mismatched session IDs (`resolve` returns `undefined` for stale sessions).
  - Cross-session resolution is completely blocked; stale session IDs cannot access new DOM elements.
- **Advanced Overwrite & Change Protection (`src/filling/fieldValueMapper.ts` & `fillCoordinator.ts`)**:
  - Separated states: existing page value, ambiguous profile mapping, conflicting field match, and missing candidate data.
  - Default all fields to unchecked on scan.
  - "Select Eligible" selects only high-confidence, non-conflicting, empty fields.
  - Distinct explicit overwrite checkbox required before overwriting non-empty fields.
  - Ambiguous matches can NEVER be filled, even if overwrite is toggled.
  - Scan-time vs fill-time value comparison: if page content changes between scan and fill, the field is skipped with `skipped_value_changed` requiring a re-scan.
- **Robust Control Handlers (`src/filling/`)**:
  - `selectHandler.ts`: Exact option and clean-prefix matching only (no partial substring mismatches).
  - `radioHandler.ts`: Explicit label (`label[for]`) association and boolean value handling.
  - `checkboxHandler.ts`: Exact value matching and verification that all desired boxes are checked; prevents clearing existing selections without explicit overwrite approval.
  - `nativeSetter.ts`: React 19 synthetic setter dispatch with value verification.
- **Profile Resolver Hardening (`src/filling/profileResolver.ts`)**:
  - Validates selected education/experience IDs; rejects fallback if an invalid ID is provided.
  - Rejects using an internship record for a full-time company query.
- **Side Panel UI Hardening (`src/sidepanel/components/FillReviewTab.tsx` & `FormScannerTab.tsx`)**:
  - Uses native checkbox inputs with keyboard accessibility (`Enter`/`Space`).
  - Authoritative session ID taken directly from `scanResult.scanSessionId`.
  - Removed mock fill fallback: reports a clear error if Chrome extension tab APIs are unavailable.
  - Shows distinct ambiguity warnings and separate overwrite toggles.
- **Comprehensive Chromium Browser Integration Testing (Playwright)**:
  - Synthetic form test fixtures in `tests/browser/fixtures/`:
    - `basic-form.html` (text, email, tel, number, date, textarea)
    - `select-form.html` (native selects, disabled options)
    - `radio-form.html` (radio groups)
    - `checkbox-form.html` (checkbox groups, single checkboxes)
    - `react-form.html` (React fiber value tracking simulation)
    - `dynamic-form.html` (multi-step dynamic replacement)
    - `safety-form.html` (password, disabled, hidden, readonly, declaration, submit button)
  - 8 real browser test specs across `scanner.browser.test.ts`, `autofill.browser.test.ts`, and `safety.browser.test.ts`.
- **CI Workflow (`.github/workflows/ci.yml`)**:
  - Added dedicated `browser-tests` job running on `ubuntu-latest`.
  - Automated installation of Playwright Chromium and system dependencies (`npx playwright install --with-deps chromium`).
  - Fails the build if either unit tests or Chromium browser integration tests fail.

---

## Current Status & Verification
- `npm run check`: TypeScript clean check (0 errors).
- `npm run test`: All 5 Vitest suites passing (**35/35 tests passed**):
  - `tests/profileStore.test.ts` (4 tests)
  - `tests/validation.test.ts` (6 tests)
  - `tests/scanner.test.ts` (10 tests)
  - `tests/profileResolver.test.ts` (7 tests)
  - `tests/fillEngine.test.ts` (8 tests)
- `npm run test:browser`: Playwright Chromium browser integration tests passing (**8/8 tests passed**).
- `npm run build`: Production bundle built in `dist/` (Manifest V3 background worker, content script, popup, sidepanel).
