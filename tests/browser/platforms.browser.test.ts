import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Platform DOM Fixtures Verification', () => {
  test('Google Forms fixture renders and matches expected structures', async ({ page }) => {
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'google-forms.html');
    const html = fs.readFileSync(fixturePath, 'utf-8');
    await page.setContent(html);

    const questions = page.locator('[role="listitem"]');
    await expect(questions).toHaveCount(6);

    const nameInput = page.locator('input[name="entry.1001"]');
    await expect(nameInput).toBeVisible();

    const radioGroup = page.locator('[role="radio"]');
    await expect(radioGroup).toHaveCount(2);
  });

  test('Microsoft Forms fixture renders and matches question automation IDs', async ({ page }) => {
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'microsoft-forms.html');
    const html = fs.readFileSync(fixturePath, 'utf-8');
    await page.setContent(html);

    const questions = page.locator('[data-automation-id="questionItem"]');
    await expect(questions).toHaveCount(4);

    const fName = page.locator('input[name="r101"]');
    await expect(fName).toBeVisible();
  });

  test('Zoho Forms fixture renders and matches wrappers', async ({ page }) => {
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'zoho-forms.html');
    const html = fs.readFileSync(fixturePath, 'utf-8');
    await page.setContent(html);

    const rows = page.locator('.zf-tempFrmWrapper');
    await expect(rows).toHaveCount(5);

    const email = page.locator('input[name="Email"]');
    await expect(email).toBeVisible();
  });

  test('Zoho Recruit fixture renders candidate rows', async ({ page }) => {
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'zoho-recruit.html');
    const html = fs.readFileSync(fixturePath, 'utf-8');
    await page.setContent(html);

    const rows = page.locator('.zr-field-row');
    await expect(rows).toHaveCount(5);

    const phone = page.locator('input[name="CANDIDATE_PHONE"]');
    await expect(phone).toBeVisible();
  });

  test('Keka fixture renders form groups and inputs', async ({ page }) => {
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'keka.html');
    const html = fs.readFileSync(fixturePath, 'utf-8');
    await page.setContent(html);

    const groups = page.locator('.form-group');
    await expect(groups).toHaveCount(4);

    const fullName = page.locator('input[name="fullName"]');
    await expect(fullName).toBeVisible();
  });
});
