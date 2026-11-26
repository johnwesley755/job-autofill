import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalFormScanner } from '../src/scanner/formScanner';
import {
  basicCompanyFormHtml,
  greenhouseStyleFormHtml,
  leverStyleFormHtml,
  workdayStyleFormHtml,
  ambiguousAndSalaryFormHtml,
} from './fixtures/syntheticForms';
import { matchFieldToProfile } from '../src/intelligence/matcher';
import { DetectedField } from '../src/scanner/types';

describe('UniversalFormScanner and Field Intelligence Engine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('scans basic company application form and detects core fields with high confidence', () => {
    document.body.innerHTML = basicCompanyFormHtml;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    expect(summary.fields.length).toBe(5);

    const firstNameField = summary.fields.find((f) => f.name === 'first_name');
    expect(firstNameField).toBeDefined();
    expect(firstNameField?.mappedProfileKey).toBe('personal.firstName');
    expect(firstNameField?.confidenceTier).toBe('high');

    const emailField = summary.fields.find((f) => f.name === 'email');
    expect(emailField?.mappedProfileKey).toBe('personal.email');
    expect(emailField?.confidenceTier).toBe('high');
  });

  it('scans Greenhouse-style form structure with file input and custom label nesting', () => {
    document.body.innerHTML = greenhouseStyleFormHtml;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    const fileField = summary.fields.find((f) => f.type === 'file');
    expect(fileField).toBeDefined();

    const linkedinField = summary.fields.find((f) => f.label.toLowerCase().includes('linkedin'));
    expect(linkedinField?.mappedProfileKey).toBe('links.linkedin');
    expect(linkedinField?.confidenceTier).toBe('high');
  });

  it('scans Lever-style application question lists and maps full name & github', () => {
    document.body.innerHTML = leverStyleFormHtml;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    const nameField = summary.fields.find((f) => f.name === 'name');
    expect(nameField?.mappedProfileKey).toBe('personal.fullName');

    const githubField = summary.fields.find((f) => f.name === 'urls[GitHub]');
    expect(githubField?.mappedProfileKey).toBe('links.github');
  });

  it('scans Workday-style form with ARIA combobox', () => {
    document.body.innerHTML = workdayStyleFormHtml;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    const customSelect = summary.fields.find((f) => f.type === 'custom-select');
    expect(customSelect).toBeDefined();
    expect(customSelect?.label).toBe('Country');
  });

  it('distinguishes current CTC from expected CTC and notice period, and leaves unknown questions blank', () => {
    document.body.innerHTML = ambiguousAndSalaryFormHtml;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    const currentCtc = summary.fields.find((f) => f.name === 'current_ctc');
    const expectedCtc = summary.fields.find((f) => f.name === 'expected_ctc');
    const noticePeriod = summary.fields.find((f) => f.name === 'notice_period');
    const unknownQ = summary.fields.find((f) => f.name === 'custom_animal');

    expect(currentCtc?.mappedProfileKey).toBe('preferences.currentCtcLpa');
    expect(expectedCtc?.mappedProfileKey).toBe('preferences.expectedCtcLpa');
    expect(noticePeriod?.mappedProfileKey).toBe('preferences.noticePeriodDays');

    // Current and expected must NEVER match to the same key!
    expect(currentCtc?.mappedProfileKey).not.toBe(expectedCtc?.mappedProfileKey);

    // Unknown random question must remain low/unknown confidence
    expect(unknownQ?.confidenceTier).toBe('low');
    expect(unknownQ?.mappedProfileKey).toBeUndefined();
  });

  it('correctly flags ambiguous competing matches', () => {
    const ambiguousField: DetectedField = {
      id: 'test-ambig',
      type: 'text',
      label: 'City or State',
      isRequired: false,
      isDisabled: false,
      isVisible: true,
      selector: 'input',
    };

    const match = matchFieldToProfile(ambiguousField);
    expect(match.isAmbiguous).toBe(true);
    expect(match.confidenceTier).toBe('medium');
  });
});
