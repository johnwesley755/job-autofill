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
  - Sidebar workspace navigation: Overview, Personal Details, Education, Experience, Skills & Links, Job Preferences, Resume Library, Form Assistant, and Settings.
  - Honest Dashboard Overview displaying live profile completeness, stored IndexedDB resume counts, and active browser tab target status.
- **Onest Typography (`public/fonts/`)**:
  - Self-hosted Google Fonts Onest WOFF2 files (weights 400, 500, 600, 700) bundled directly inside the extension for offline capability.
- **Design Tokens**: Eliminated all raw `bg-gray-*` and `bg-grey-*` classes across the entire codebase, replacing them with semantic tokens (`bg-canvas`, `bg-surface`, `bg-subtle`, `text-accent`, etc.).

### Stage 12 — Platform Adapters & User-Triggered Autofill
- **Shared Messaging Protocol (`src/messaging/protocol.ts`)**:
  - Unified typed contracts: `PING_CONTENT`, `GET_ACTIVE_APPLICATION_TAB`, `SCAN_FORM_SUMMARY`, `FILL_APPROVED_FIELDS`, `DYNAMIC_FORM_CHANGED`.
  - Eliminated discrepancy where `FillReviewTab` sent `FILL_APPROVED_FIELDS` while `content/index.ts` listened for `EXECUTE_FILL`.
  - Added strict instruction payload validation requiring `approved === true`.
- **User-Triggered Autofill Workflow**:
  - Removed automatic `scanCurrentTab(true)` on mount.
  - Form Assistant displays an idle state with target tab information and requires explicit click on **Start Autofilling**.
  - Review tab requires explicit click on **Fill Approved Fields**.
- **Platform Adapter Architecture (`src/adapters/`)**:
  - `GoogleFormsAdapter`: Detects Google Forms (`docs.google.com/forms`, `forms.gle`) and parses text, textarea, radio, and checkbox questions.
  - `MicrosoftFormsAdapter`: Detects MS Forms (`forms.office.com`, `forms.microsoft.com`) and parses question titles and controls.
  - `ZohoFormsAdapter`: Detects Zoho Forms (`forms.zoho.com`, `forms.zohopublic.com`).
  - `ZohoRecruitAdapter`: Detects Zoho Recruit candidate portals (`recruit.zoho.com`, `zohorecruit.com`).
  - `KekaAdapter`: Detects Keka application forms (`app.keka.com`, `keka.com`).
- **External Active Tab Tracking (`src/background/index.ts`)**:
  - Tracks last active non-extension tab so opening the dashboard or popup does not target itself.
- **Domain Coverage (`public/manifest.json`)**:
  - Added explicit match and host permission patterns for Google Forms, MS Forms, Zoho Forms, Zoho Recruit, and Keka with `all_frames: true` for embedded forms.
