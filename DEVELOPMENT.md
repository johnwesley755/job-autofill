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

### Stage 7, Stage 8 & Stage 9 — Production-Safe Autofill
- **Strict Session Isolation (`src/scanner/elementRegistry.ts`)**:
  - Immediate rejection of mismatched session IDs (`resolve` returns `undefined` for stale sessions).
  - Cross-session resolution is completely blocked; stale session IDs cannot access new DOM elements.
- **Advanced Overwrite & Change Protection (`src/filling/fieldValueMapper.ts` & `fillCoordinator.ts`)**:
  - Separated states: existing page value, ambiguous profile mapping, conflicting field match, and missing candidate data.
  - Default all fields to unchecked on scan.
  - "Select Eligible" selects only high-confidence, non-conflicting, empty fields.
  - Distinct explicit overwrite checkbox required before overwriting non-empty fields.
  - Ambiguous matches can NEVER be filled, even if overwrite is toggled.

### Stage 10 — Packaging, Installation Fix and Production Verification
- **Root Entry Points & Vite Build Alignments**:
  - Created root `popup.html` and `sidepanel.html` referencing `./src/popup/index.tsx` and `./src/sidepanel/index.tsx`.
  - Configured `public/manifest.json` pointing directly to `popup.html`, `sidepanel.html`, `background.js`, and `content.js`.
  - Vite Rollup multi-page inputs configured so production build emits files directly to the root of `dist/`.
- **Validation Script (`scripts/validate-extension.mjs`)**:
  - Verifies Manifest V3 compliance, icons presence, absence of unresolved `src/` paths, and checks that `content.js` has no illegal static ES imports.
- **Packaging Script (`scripts/package-extension.mjs`)**:
  - Validates `dist/` and creates release archive `job-autofill-extension.zip` with `manifest.json` at root.
