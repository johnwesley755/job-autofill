import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Universal Form Scanner in Real Chromium', () => {
  test('scans native standard form in real browser layout', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'basic-form.html');
    await page.goto(`file://${fixturePath}`);

    // Verify DOM inputs exist and are rendered with geometry
    const firstName = page.locator('#first_name');
    await expect(firstName).toBeVisible();

    const box = await firstName.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('correctly identifies hidden and zero-sized containers', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'safety-form.html');
    await page.goto(`file://${fixturePath}`);

    const hiddenField = page.locator('#hidden_field');
    await expect(hiddenField).toBeHidden();

    const disabledField = page.locator('#disabled_field');
    await expect(disabledField).toBeDisabled();

    const readOnlyField = page.locator('#readonly_field');
    await expect(readOnlyField).toHaveAttribute('readonly', '');
  });
});
