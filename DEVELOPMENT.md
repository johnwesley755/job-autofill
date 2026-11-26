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
  - `src/scanner/classifier.ts`: Classification of text, email, tel, number, date, select, custom-select (combobox), textarea, radio/checkbox groups, and file inputs. Explicitly excludes `password` inputs from candidate profiling. Checks ancestor occlusion and layout dimensions.
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

### Stage 7 — Autofill Engine & User Review System
- **Profile Resolver (`src/filling/profileResolver.ts`)**:
  - Safely extracts candidate values matching canonical profile keys.
  - Supports education/experience record selection with defaults to highest/current records.
  - Strictly prevents cross-field leakage (CGPA vs percentage, current vs expected CTC, internship vs full-time).
- **Field Value Mapper (`src/filling/fieldValueMapper.ts`)**:
  - Generates proposed fill plans with safety checks.
  - Detects existing non-empty values on page and flags them for explicit overwrite approval.
  - Marks high-confidence, non-conflicting, empty fields as preselected; requires manual review for warned fields.
- **Native Input Setters (`src/filling/nativeSetter.ts`, `selectHandler.ts`, `radioHandler.ts`, `checkboxHandler.ts`)**:
  - Native prototype descriptor setters compatible with React 19 synthetic event pools (`Object.getOwnPropertyDescriptor(prototype, 'value')?.set`).
  - Dispatches `input`, `change`, and `blur` events with `bubbles: true`.
  - Verifies DOM value post-assignment.
- **Fill Coordinator (`src/filling/fillCoordinator.ts`)**:
  - Executes approved fills using session-registered DOM nodes.
  - Emits structured `FillSessionReport` detailing successful, skipped, and failed fields.
- **Side Panel Review Interface (`src/sidepanel/components/FillReviewTab.tsx` & `FormScannerTab.tsx`)**:
  - Interactive Review & Fill subtab in the Side Panel.
  - Shows proposed value vs existing value, confidence badge, and safety warnings.
  - Per-field toggles, "Select All Eligible", and "Fill Approved Fields" actions.
  - Detailed completion report showing summary stats and any skipped/failed items.
- **Safety Policy Enforcement**:
  - Zero automated submissions: Apply and Submit buttons are never clicked.
  - Declarations and legal agreements are never accepted automatically.
  - CAPTCHAs are never bypassed or solved.

---

## Current Status & Verification
- `npm run check`: TypeScript clean check (0 errors).
- `npm run test`: All 5 test suites passing (33/33 tests passed):
  - `tests/profileStore.test.ts` (4 tests)
  - `tests/validation.test.ts` (6 tests)
  - `tests/scanner.test.ts` (10 tests)
  - `tests/profileResolver.test.ts` (5 tests)
  - `tests/fillEngine.test.ts` (8 tests)
- `npm run build`: Production bundle successfully built in `dist/` (Manifest V3 background worker, content script, popup, and sidepanel bundles).

---

## Upcoming Stage: Resume Attachment & Platform Adapters (Stage 8)
1. Technically supported file upload input detection (`type="file"`) with `DataTransfer` resume attachment where allowed.
2. Custom dropdown adapters for Greenhouse, Lever, Workday, and Taleo comboboxes.
