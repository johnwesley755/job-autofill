import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('[Validate Extension] Checking production build in:', distDir);

if (!fs.existsSync(distDir)) {
  console.error('[Error] dist/ directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

const manifestPath = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('[Error] dist/manifest.json not found.');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (err) {
  console.error('[Error] Failed to parse dist/manifest.json:', err.message);
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  console.error(`[Error] Expected manifest_version 3, got: ${manifest.manifest_version}`);
  process.exit(1);
}

const errors = [];

function checkFile(relPath, desc) {
  if (!relPath) return;
  if (relPath.startsWith('src/')) {
    errors.push(`${desc} references development path "${relPath}". Must point to production root.`);
    return;
  }
  const fullPath = path.join(distDir, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${desc} target missing: "${relPath}" (looked in ${fullPath})`);
  }
}

// 1. Icons
if (manifest.icons) {
  for (const [size, iconPath] of Object.entries(manifest.icons)) {
    checkFile(iconPath, `Icon (${size}px)`);
  }
}

// 2. Popup
if (manifest.action?.default_popup) {
  checkFile(manifest.action.default_popup, 'Action popup');
}

// 3. Side Panel
if (manifest.side_panel?.default_path) {
  checkFile(manifest.side_panel.default_path, 'Side panel');
}

// 4. Background Service Worker
if (manifest.background?.service_worker) {
  checkFile(manifest.background.service_worker, 'Background service worker');
}

// 5. Content Scripts
if (manifest.content_scripts) {
  for (const cs of manifest.content_scripts) {
    if (cs.js) {
      for (const jsFile of cs.js) {
        checkFile(jsFile, 'Content script JS');

        // Check for unsupported static ES module import statements in classic content scripts
        const fullJsPath = path.join(distDir, jsFile);
        if (fs.existsSync(fullJsPath)) {
          const content = fs.readFileSync(fullJsPath, 'utf8');
          // Match top-level static import declarations like: import "..." or import x from "..."
          if (/^\s*import\s+[^;]+from\s+['"][^'"]+['"]/m.test(content) || /^\s*import\s*['"][^'"]+['"]/m.test(content)) {
            errors.push(`Content script "${jsFile}" contains static ES module imports. Content scripts must be self-contained classic scripts.`);
          }
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error('[Error] Extension validation failed:');
  for (const err of errors) {
    console.error('  - ' + err);
  }
  process.exit(1);
}

console.log('[Validate Extension] dist/ passed all production manifest and asset checks!');
