import { describe, it, expect, beforeEach } from 'vitest';
import { adapterRegistry } from '../src/adapters/adapterRegistry';
import { GoogleFormsAdapter } from '../src/adapters/googleForms/googleFormsAdapter';
import { MicrosoftFormsAdapter } from '../src/adapters/microsoftForms/microsoftFormsAdapter';
import { ZohoFormsAdapter } from '../src/adapters/zohoForms/zohoFormsAdapter';
import { ZohoRecruitAdapter } from '../src/adapters/zohoRecruit/zohoRecruitAdapter';
import { KekaAdapter } from '../src/adapters/keka/kekaAdapter';
import { UniversalFormScanner } from '../src/scanner/formScanner';

describe('Platform Adapter Detection and Extraction', () => {
  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('Test Form');
  });

  it('detects Google Forms by URL and DOM structure', () => {
    const gfAdapter = new GoogleFormsAdapter();
    expect(gfAdapter.canHandle('https://docs.google.com/forms/d/e/1FAIpQLSc/viewform', doc)).toBe(true);
    expect(gfAdapter.canHandle('https://forms.gle/abcXYZ', doc)).toBe(true);
    expect(gfAdapter.canHandle('https://example.com/job', doc)).toBe(false);
  });

  it('scans Google Forms question items into DetectedField objects', () => {
    const gfAdapter = new GoogleFormsAdapter();
    doc.body.innerHTML = `
      <div role="listitem">
        <div role="heading">Your Full Name *</div>
        <input type="text" name="entry.12345" value="" placeholder="Your answer" />
      </div>
      <div role="listitem">
        <div role="heading">Email Address *</div>
        <input type="email" name="entry.67890" value="" placeholder="Your email" />
      </div>
    `;

    const fields = gfAdapter.scanFields(doc, 'test-gf-session');
    expect(fields.length).toBe(2);
    expect(fields[0].label).toBe('Your Full Name');
    expect(fields[0].mappedProfileKey).toBe('personal.fullName');
    expect(fields[1].label).toBe('Email Address');
    expect(fields[1].mappedProfileKey).toBe('personal.email');
  });

  it('detects Microsoft Forms and extracts question items', () => {
    const msfAdapter = new MicrosoftFormsAdapter();
    expect(msfAdapter.canHandle('https://forms.office.com/pages/responsepage.aspx', doc)).toBe(true);

    doc.body.innerHTML = `
      <div data-automation-id="questionItem">
        <span data-automation-id="questionTitle">First Name *</span>
        <input type="text" name="r123" />
      </div>
    `;

    const fields = msfAdapter.scanFields(doc, 'test-msf-session');
    expect(fields.length).toBe(1);
    expect(fields[0].label).toBe('First Name');
    expect(fields[0].mappedProfileKey).toBe('personal.firstName');
  });

  it('detects Zoho Forms and Zoho Recruit', () => {
    const zfAdapter = new ZohoFormsAdapter();
    expect(zfAdapter.canHandle('https://forms.zoho.com/org/form/JobApplication', doc)).toBe(true);

    const zrAdapter = new ZohoRecruitAdapter();
    expect(zrAdapter.canHandle('https://recruit.zoho.com/recruit/Apply.na', doc)).toBe(true);
  });

  it('detects Keka application forms', () => {
    const kekaAdapter = new KekaAdapter();
    expect(kekaAdapter.canHandle('https://app.keka.com/careers/job/12345', doc)).toBe(true);

    doc.body.innerHTML = `
      <div class="form-group">
        <label>Phone Number *</label>
        <input type="tel" name="phone" />
      </div>
    `;

    const fields = kekaAdapter.scanFields(doc, 'test-keka-session');
    expect(fields.length).toBe(1);
    expect(fields[0].label).toBe('Phone Number');
    expect(fields[0].mappedProfileKey).toBe('personal.phone');
  });

  it('AdapterRegistry correctly matches platform adapters in priority', () => {
    const foundGF = adapterRegistry.findAdapter('https://docs.google.com/forms/d/123/viewform', doc);
    expect(foundGF?.platformId).toBe('google_forms');

    const foundMS = adapterRegistry.findAdapter('https://forms.office.com/r/123', doc);
    expect(foundMS?.platformId).toBe('microsoft_forms');

    const foundKeka = adapterRegistry.findAdapter('https://acme.keka.com/careers', doc);
    expect(foundKeka?.platformId).toBe('keka');
  });

  it('UniversalFormScanner merges adapter fields and generic fields without duplicate registrations', () => {
    const scanner = new UniversalFormScanner(doc);
    doc.body.innerHTML = `
      <form action="formResponse">
        <div role="listitem">
          <div role="heading">Full Name *</div>
          <input type="text" name="entry.1" id="gf_entry_1" value="" />
        </div>
        <div class="generic-row">
          <label for="generic_notes">Additional Comments</label>
          <textarea id="generic_notes" name="notes"></textarea>
        </div>
      </form>
    `;

    const summary = scanner.scan();
    expect(summary.fields.length).toBe(2);
    expect(summary.fields.some((f) => f.label === 'Full Name' && f.platformId === 'google_forms')).toBe(true);
    expect(summary.fields.some((f) => f.name === 'notes')).toBe(true);
  });
});
