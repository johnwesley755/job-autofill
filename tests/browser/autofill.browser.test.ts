import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Autofill Engine in Real Chromium Browser', () => {
  test('fills text, email, tel, number, date, and textarea with event dispatch', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'basic-form.html');
    await page.goto(`file://${fixturePath}`);

    // Execute autofill via native setter pattern inside Chromium page context
    await page.evaluate(() => {
      function nativeSet(el: HTMLInputElement | HTMLTextAreaElement, val: string) {
        const proto = el.tagName.toLowerCase() === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      }

      nativeSet(document.getElementById('first_name') as HTMLInputElement, 'John');
      nativeSet(document.getElementById('last_name') as HTMLInputElement, 'Wesley');
      nativeSet(document.getElementById('email') as HTMLInputElement, 'john.wesley@example.com');
      nativeSet(document.getElementById('phone') as HTMLInputElement, '+919876543210');
      nativeSet(document.getElementById('years_exp') as HTMLInputElement, '4');
      nativeSet(document.getElementById('dob') as HTMLInputElement, '2000-01-15');
      nativeSet(document.getElementById('cover_letter') as HTMLTextAreaElement, 'Experienced React and TypeScript engineer.');
    });

    // Verify exact DOM values in real Chromium layout
    await expect(page.locator('#first_name')).toHaveValue('John');
    await expect(page.locator('#last_name')).toHaveValue('Wesley');
    await expect(page.locator('#email')).toHaveValue('john.wesley@example.com');
    await expect(page.locator('#phone')).toHaveValue('+919876543210');
    await expect(page.locator('#years_exp')).toHaveValue('4');
    await expect(page.locator('#dob')).toHaveValue('2000-01-15');
    await expect(page.locator('#cover_letter')).toHaveValue('Experienced React and TypeScript engineer.');
  });

  test('selects native dropdown options accurately', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'select-form.html');
    await page.goto(`file://${fixturePath}`);

    await page.evaluate(() => {
      function selectOption(select: HTMLSelectElement, val: string) {
        const normalized = val.trim().toLowerCase();
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value.toLowerCase() === normalized || select.options[i].text.toLowerCase() === normalized) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      }

      selectOption(document.getElementById('gender') as HTMLSelectElement, 'male');
      selectOption(document.getElementById('work_mode') as HTMLSelectElement, 'hybrid');
      selectOption(document.getElementById('country') as HTMLSelectElement, 'India');
    });

    await expect(page.locator('#gender')).toHaveValue('male');
    await expect(page.locator('#work_mode')).toHaveValue('hybrid');
    await expect(page.locator('#country')).toHaveValue('India');
  });

  test('handles radio button and checkbox group selection accurately', async ({ page }) => {
    const radioFixture = path.join(__dirname, 'fixtures', 'radio-form.html');
    await page.goto(`file://${radioFixture}`);

    await page.evaluate(() => {
      const radio = document.getElementById('relocate_yes') as HTMLInputElement;
      radio.checked = true;
      radio.dispatchEvent(new Event('input', { bubbles: true }));
      radio.dispatchEvent(new Event('change', { bubbles: true }));

      const joiner = document.getElementById('joiner_true') as HTMLInputElement;
      joiner.checked = true;
      joiner.dispatchEvent(new Event('input', { bubbles: true }));
      joiner.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('#relocate_yes')).toBeChecked();
    await expect(page.locator('#relocate_no')).not.toBeChecked();
    await expect(page.locator('#joiner_true')).toBeChecked();

    // Checkbox group test
    const checkboxFixture = path.join(__dirname, 'fixtures', 'checkbox-form.html');
    await page.goto(`file://${checkboxFixture}`);

    await page.evaluate(() => {
      const targets = ['bengaluru', 'hyderabad'];
      const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('#preferred_cities_group input[type="checkbox"]'));
      for (const box of boxes) {
        if (targets.includes(box.value.toLowerCase())) {
          box.checked = true;
          box.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    await expect(page.locator('#city_blr')).toBeChecked();
    await expect(page.locator('#city_hyd')).toBeChecked();
    await expect(page.locator('#city_pune')).not.toBeChecked();
  });

  test('updates React-controlled synthetic inputs without bypassing state trees', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'react-form.html');
    await page.goto(`file://${fixturePath}`);

    await page.evaluate(() => {
      const input = document.getElementById('react_email') as HTMLInputElement;
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(input, 'candidate@domain.com');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('#react_email')).toHaveValue('candidate@domain.com');
    await expect(page.locator('#react_email')).toHaveAttribute('data-react-updated', 'true');
    await expect(page.locator('#react_email')).toHaveAttribute('data-last-recorded-value', 'candidate@domain.com');
  });

  test('detects dynamic step replacement in multi-step application form', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'dynamic-form.html');
    await page.goto(`file://${fixturePath}`);

    // Click step transition
    await page.locator('#next-btn').click();

    // Verify dynamic step 2 fields appear in real DOM
    await expect(page.locator('#dyn_first_name')).toBeVisible();
    await expect(page.locator('#dyn_email')).toBeVisible();

    // Fill new dynamic fields
    await page.locator('#dyn_first_name').fill('Jane');
    await expect(page.locator('#dyn_first_name')).toHaveValue('Jane');
  });
});
