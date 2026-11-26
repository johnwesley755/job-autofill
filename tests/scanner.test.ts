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
    expect(firstNameField?.isRequired).toBe(true);

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

  it('scans Workday-style form with ARIA combobox and data-automation-id', () => {
    document.body.innerHTML = workdayStyleFormHtml;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    const customSelect = summary.fields.find((f) => f.type === 'custom-select');
    expect(customSelect).toBeDefined();
    expect(customSelect?.label).toBe('Country');

    const fName = summary.fields.find((f) => f.automationId === 'legalNameSection_firstName');
    expect(fName).toBeDefined();
    expect(fName?.mappedProfileKey).toBe('personal.firstName');
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

  it('correctly ignores password fields from candidate profile autofill', () => {
    document.body.innerHTML = `
      <form>
        <label for="pwd">Account Password *</label>
        <input type="password" id="pwd" name="password" required />
      </form>
    `;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    expect(summary.fields.length).toBe(0); // Passwords are fundamentally excluded
  });

  it('correctly consolidates radio button groups into a single field representation', () => {
    document.body.innerHTML = `
      <form id="diversity-form">
        <fieldset class="form-group">
          <legend>Gender Identity *</legend>
          <label><input type="radio" name="gender" value="male" /> Male</label>
          <label><input type="radio" name="gender" value="female" /> Female</label>
          <label><input type="radio" name="gender" value="non-binary" /> Non-binary</label>
        </fieldset>
      </form>
    `;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    expect(summary.fields.length).toBe(1);
    const radioGroup = summary.fields[0];
    expect(radioGroup.type).toBe('radio-group');
    expect(radioGroup.label).toBe('Gender Identity');
    expect(radioGroup.isRequired).toBe(true);
    expect(radioGroup.options?.length).toBe(3);
    expect(radioGroup.mappedProfileKey).toBe('personal.gender');
  });

  it('distinguishes CGPA from percentage score fields', () => {
    const cgpaField: DetectedField = {
      id: 'f1',
      type: 'number',
      label: 'Cumulative GPA (out of 10)',
      isRequired: true,
      isDisabled: false,
      isVisible: true,
      selector: 'input',
    };

    const percentageField: DetectedField = {
      id: 'f2',
      type: 'number',
      label: 'Aggregate Marks in %',
      isRequired: true,
      isDisabled: false,
      isVisible: true,
      selector: 'input',
    };

    const cgpaMatch = matchFieldToProfile(cgpaField);
    const percentageMatch = matchFieldToProfile(percentageField);

    expect(cgpaMatch.canonicalKey).toBe('education.cgpa');
    expect(percentageMatch.canonicalKey).toBe('education.percentage');
    expect(cgpaMatch.canonicalKey).not.toBe(percentageMatch.canonicalKey);
  });

  it('distinguishes internship experience from full-time experience', () => {
    const internField: DetectedField = {
      id: 'f3',
      type: 'text',
      label: 'Summer Internship Organization',
      isRequired: false,
      isDisabled: false,
      isVisible: true,
      selector: 'input',
    };

    const fulltimeField: DetectedField = {
      id: 'f4',
      type: 'text',
      label: 'Current Company / Employer',
      isRequired: true,
      isDisabled: false,
      isVisible: true,
      selector: 'input',
    };

    const internMatch = matchFieldToProfile(internField);
    const fulltimeMatch = matchFieldToProfile(fulltimeField);

    expect(internMatch.canonicalKey).toBe('experience.internship');
    expect(fulltimeMatch.canonicalKey).toBe('experience.company');
    expect(internMatch.canonicalKey).not.toBe(fulltimeMatch.canonicalKey);
  });

  it('correctly ignores elements inside hidden ancestor containers', () => {
    document.body.innerHTML = `
      <div style="display: none;">
        <label for="hidden_field">Hidden input</label>
        <input type="text" id="hidden_field" name="hidden_name" />
      </div>
      <div>
        <label for="visible_field">Visible input</label>
        <input type="text" id="visible_field" name="visible_name" />
      </div>
    `;
    const scanner = new UniversalFormScanner(document);
    const summary = scanner.scan();

    expect(summary.fields.length).toBe(1);
    expect(summary.fields[0].elementId).toBe('visible_field');
  });
});
