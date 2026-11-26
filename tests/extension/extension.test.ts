import { test, expect } from './fixtures';

test.describe('Chrome Extension End-to-End in Chromium', () => {
  test('extension loads and background service worker is active', async ({ context, extensionId }) => {
    expect(extensionId).toBeDefined();
    expect(extensionId.length).toBeGreaterThan(10);

    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThanOrEqual(1);
    const bg = workers.find((w) => w.url().includes(extensionId));
    expect(bg).toBeDefined();
    expect(bg!.url()).toBe(`chrome-extension://${extensionId}/background.js`);
  });

  test('standalone dashboard app.html loads cleanly and renders Onest typography', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`chrome-extension://${extensionId}/app.html`);
    await page.waitForLoadState('networkidle');

    expect(pageErrors).toEqual([]);
    
    // Check root and brand title
    const brand = page.getByRole('heading', { name: 'AutoApply', exact: true });
    await expect(brand).toBeAttached();

    // Verify Onest font-family is computed on body
    const fontFamily = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });
    expect(fontFamily.toLowerCase()).toContain('onest');

    // Check main dashboard sections
    await expect(page.getByText('WORKSPACE')).toBeVisible();
    await expect(page.getByText('APPLICATION TOOLS')).toBeVisible();
    await expect(page.getByText('Candidate Profile')).toBeVisible();
    await expect(page.getByText('Resume Repository')).toBeVisible();

    await page.close();
  });
});
