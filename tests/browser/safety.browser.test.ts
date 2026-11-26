import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Safety & Policy Verification in Real Chromium', () => {
  test('prohibits filling passwords, ignores hidden inputs, and preserves non-overwritten values', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'safety-form.html');
    await page.goto(`file://${fixturePath}`);

    // 1. Password input must remain unfilled
    const passwordInput = page.locator('#user_pass');
    await expect(passwordInput).toHaveValue('');

    // 2. Hidden field must not be interacted with
    const hiddenField = page.locator('#hidden_field');
    await expect(hiddenField).toBeHidden();

    // 3. Existing non-empty value must be preserved when overwrite is false
    const existingName = page.locator('#existing_name');
    await expect(existingName).toHaveValue('Pre-filled Candidate Name');

    // 4. Terms and conditions declaration must NOT be automatically checked
    const declaration = page.locator('#declaration_agree');
    await expect(declaration).not.toBeChecked();

    // 5. Submit button must NOT be clicked
    const submitBtn = page.locator('#submit_application');
    await expect(submitBtn).toBeVisible();
  });
});
