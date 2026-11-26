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
    checkFile(iconPath, `Icon ${size}x${size}`);
  }
}

// 2. Action / Background / Popup
if (manifest.action?.default_popup) {
  checkFile(manifest.action.default_popup, 'Action popup HTML');
}
if (manifest.background?.service_worker) {
  checkFile(manifest.background.service_worker, 'Background service worker');
}

// 3. Standalone Dashboard HTML entry
checkFile('app.html', 'Standalone Dashboard HTML');

// 4. Content Scripts
if (Array.isArray(manifest.content_scripts)) {
  for (const cs of manifest.content_scripts) {
    if (Array.isArray(cs.js)) {
      for (const jsFile of cs.js) {
        checkFile(jsFile, 'Content script');
      }
    }
  }
}

// 5. Self-hosted Onest Fonts
const fonts = [
  'fonts/Onest-Regular.woff2',
  'fonts/Onest-Medium.woff2',
  'fonts/Onest-SemiBold.woff2',
  'fonts/Onest-Bold.woff2',
];
for (const fontPath of fonts) {
  checkFile(fontPath, `Self-hosted font ${fontPath}`);
}

// 6. Check content script for static ES imports
const contentScriptPath = path.join(distDir, 'content.js');
if (fs.existsSync(contentScriptPath)) {
  const contentCode = fs.readFileSync(contentScriptPath, 'utf8');
  if (/^\s*import\s+.*from\s+['"]/m.test(contentCode)) {
    errors.push('content.js contains top-level static "import" statement which Chrome rejects in classic content scripts.');
  }
}

if (errors.length > 0) {
  console.error('[Error] Extension production validation failed:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('[Validate Extension] dist/ passed all production manifest, popup, dashboard, and asset checks!');
