import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const outputZip = path.resolve(rootDir, 'job-autofill-extension.zip');

console.log('[Package Extension] Validating dist directory...');
if (!fs.existsSync(distDir)) {
  console.error('[Error] dist/ directory not found. Please build first.');
  process.exit(1);
}

// Run extension validator first
try {
  execSync('node scripts/validate-extension.mjs', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error('[Error] Extension validation failed before packaging.');
  process.exit(1);
}

// Remove old zip if exists
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
}

console.log('[Package Extension] Creating release zip:', outputZip);

try {
  if (process.platform === 'win32') {
    // Suppress PowerShell Write-Progress to avoid Win32 ReadConsoleOutput host buffer error in non-interactive environments
    const psCmd = `powershell.exe -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path '${distDir}\\*' -DestinationPath '${outputZip}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });
  } else {
    execSync(`cd "${distDir}" && zip -r "${outputZip}" ./*`, { stdio: 'inherit' });
  }

  if (!fs.existsSync(outputZip)) {
    throw new Error('Zip file was not created.');
  }

  const stats = fs.statSync(outputZip);
  console.log(`[Package Extension] Successfully created job-autofill-extension.zip (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('[Error] Failed to package extension:', err.message);
  process.exit(1);
}
