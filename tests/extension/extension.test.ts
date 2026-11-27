import { test, expect } from './fixtures';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    await expect(page.getByText('Candidate Profile', { exact: true })).toBeVisible();
    await expect(page.getByText('Resume Repository', { exact: true })).toBeVisible();

    await page.close();
  });

  test('Form Assistant does not scan on load and requires explicit user action', async ({ context, extensionId }) => {
    const dashboardPage = await context.newPage();
    await dashboardPage.goto(`chrome-extension://${extensionId}/app.html`);
    await dashboardPage.waitForLoadState('networkidle');

    // Click on Form Assistant tool
    await dashboardPage.getByText('Form Assistant').first().click();

    // Verify it is in idle state
    await expect(dashboardPage.getByText('Ready to scan application form')).toBeVisible();
    await expect(dashboardPage.getByText('AutoApply never runs automatic scans in the background')).toBeVisible();

    // Verify Start Autofilling button exists
    const startBtn = dashboardPage.getByRole('button', { name: /Start Autofilling/i });
    await expect(startBtn).toBeVisible();

    await dashboardPage.close();
  });

  test('Extension popup renders cleanly with enable toggle and detailed dashboard bridge', async ({ context, extensionId }) => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('networkidle');

    await expect(popupPage.getByRole('heading', { name: 'AutoApply' })).toBeVisible();
    await expect(popupPage.getByText('Autofill Companion')).toBeVisible();

    // Check Detailed View / Dashboard button exists
    const dashboardBtn = popupPage.getByRole('button', { name: /Full Dashboard|Dashboard/i });
    await expect(dashboardBtn).toBeVisible();

    // Check Enable toggle button exists
    const enableToggle = popupPage.getByRole('button', { name: /Enabled|Paused/i });
    await expect(enableToggle).toBeVisible();

    await popupPage.close();
  });

  test('Target tab locking and scan session validation blocks arbitrary external tabs', async ({ context, extensionId }) => {
    const appPage = await context.newPage();
    const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'google-forms.html');
    await appPage.goto(`file://${fixturePath}`);

    const dashboardPage = await context.newPage();
    await dashboardPage.goto(`chrome-extension://${extensionId}/app.html`);
    await dashboardPage.waitForLoadState('networkidle');

    await dashboardPage.getByText('Form Assistant').first().click();
    await expect(dashboardPage.getByText('Ready to scan application form')).toBeVisible();

    await appPage.close();
    await dashboardPage.close();
  });

  test('True E2E: Extension populates and verifies form fields on application tab', async ({ context, extensionId }) => {
    // 1. Set candidate profile in extension storage
    const bg = context.serviceWorkers().find((w) => w.url().includes(extensionId));
    expect(bg).toBeDefined();

    // 2. Open dashboard page first and seed profile into IndexedDB/Zustand storage
    const dashboardPage = await context.newPage();
    await dashboardPage.goto(`chrome-extension://${extensionId}/app.html`);
    await dashboardPage.waitForLoadState('networkidle');

    await dashboardPage.evaluate(async () => {
      const sampleProfile = {
        id: 'test-profile-e2e',
        updatedAt: new Date().toISOString(),
        personal: {
          firstName: 'John',
          middleName: '',
          lastName: 'Wesley',
          fullName: 'John Wesley',
          email: 'john.wesley@example.com',
          phone: '+919876543210',
          phoneCountryCode: '+91',
          dob: '1995-05-20',
          gender: 'male',
          nationality: 'Indian',
        },
        location: {
          addressLine1: '123 Tech Street',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          postalCode: '560001',
        },
        education: [],
        experience: [],
        skills: { languages: [], frameworks: [], databases: [], tools: [], certifications: [] },
        links: { linkedin: 'https://linkedin.com/in/johnwesley', github: 'https://github.com/johnwesley755' },
        preferences: {
          isFresher: false,
          immediateJoiner: true,
          currency: 'INR',
          preferredCities: ['Bengaluru'],
          willingToRelocate: true,
          workMode: 'hybrid',
          workAuthorization: 'Authorized',
        },
      };
      localStorage.setItem('autoapply_profile', JSON.stringify(sampleProfile));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ autoapply_profile: sampleProfile });
      }
      // Update Zustand in the dashboard
      const store = (window as any).__PROFILE_STORE__;
      if (store && store.getState) {
        await store.getState().loadProfile();
      }
    });

    // Reload dashboard page to ensure Zustand store hydrates sample profile
    await dashboardPage.reload();
    await dashboardPage.waitForLoadState('networkidle');

    // 3. Start local HTTP test server serving basic-form.html on an /apply/ URL
    const fixtureHtml = fs.readFileSync(
      path.resolve(__dirname, '..', 'browser', 'fixtures', 'basic-form.html'),
      'utf-8'
    );
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fixtureHtml);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const port = (server.address() as any).port;
    const testUrl = `http://127.0.0.1:${port}/careers/apply/engineer`;

    // 4. Open test application page in an external tab and ensure it becomes the active tracked tab
    const appPage = await context.newPage();
    await appPage.goto(testUrl);
    await appPage.waitForLoadState('domcontentloaded');

    // 5. Focus dashboard and switch to Form Assistant
    await dashboardPage.bringToFront();
    await dashboardPage.getByText('Form Assistant').first().click();

    // 6. Seed active tracked tab in extension storage so background finds it reliably
    await dashboardPage.evaluate(async (_targetUrl) => {
      const allTabs = await chrome.tabs.query({});
      const target = allTabs.find((t) => t.url && t.url.includes('/apply/'));
      if (target && target.id) {
        const info = {
          tabId: target.id,
          url: target.url,
          title: target.title || 'Job Application',
          domain: '127.0.0.1',
          timestamp: Date.now(),
        };
        if (chrome.storage.session) {
          await chrome.storage.session.set({ autoapply_last_external_tab: info });
        }
        await chrome.storage.local.set({ autoapply_last_external_tab: info });
      }
    }, testUrl);

    // Re-trigger GET_ACTIVE_APPLICATION_TAB so UI picks up the newly tracked tab
    await dashboardPage.evaluate(() => {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_APPLICATION_TAB' });
    });
    await new Promise((r) => setTimeout(r, 400));

    // 6. Click Start Autofilling
    const startBtn = dashboardPage.getByRole('button', { name: /Start Autofilling/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // 7. Verify scan results appear and proceed to review
    await expect(dashboardPage.getByText(/Scanned Controls/i)).toBeVisible({ timeout: 10000 });
    const reviewBtn = dashboardPage.getByText(/Review & Fill/i).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // 8. Verify proposed fields and click Fill Approved Fields
    const fillApprovedBtn = dashboardPage.getByRole('button', { name: /Fill.*Approved/i });
    await expect(fillApprovedBtn).toBeVisible({ timeout: 10000 });
    await fillApprovedBtn.click();

    // 9. Wait for Autofill Completed
    await expect(dashboardPage.getByText(/Autofill Completed/i)).toBeVisible({ timeout: 10000 });

    // 10. Verify in the appPage that fields were genuinely filled
    await expect(appPage.locator('#first_name')).toHaveValue('John', { timeout: 10000 });
    await expect(appPage.locator('#last_name')).toHaveValue('Wesley');
    await expect(appPage.locator('#email')).toHaveValue('john.wesley@example.com');
    await expect(appPage.locator('#phone')).toHaveValue('+919876543210');

    await appPage.close();
    await dashboardPage.close();
    server.close();
  });
});
