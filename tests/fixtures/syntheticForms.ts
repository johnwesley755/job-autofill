export const basicCompanyFormHtml = `
<form id="application-form">
  <h2>Personal Information</h2>
  <div class="field">
    <label for="first_name">First Name *</label>
    <input type="text" id="first_name" name="first_name" required />
  </div>
  <div class="field">
    <label for="last_name">Last Name *</label>
    <input type="text" id="last_name" name="last_name" required />
  </div>
  <div class="field">
    <label for="email">Email Address *</label>
    <input type="email" id="email" name="email" required />
  </div>
  <div class="field">
    <label for="phone">Phone Number *</label>
    <input type="tel" id="phone" name="phone" required />
  </div>
  <div class="field">
    <label for="city">Current City</label>
    <input type="text" id="city" name="city" />
  </div>
</form>
`;

export const greenhouseStyleFormHtml = `
<div id="application">
  <h3>Apply for this Job</h3>
  <div class="field">
    <label>First Name <span class="asterisk">*</span></label>
    <input type="text" id="first_name" autocomplete="given-name" />
  </div>
  <div class="field">
    <label>Last Name <span class="asterisk">*</span></label>
    <input type="text" id="last_name" autocomplete="family-name" />
  </div>
  <div class="field">
    <label>Email <span class="asterisk">*</span></label>
    <input type="email" id="email" autocomplete="email" />
  </div>
  <div class="field">
    <label>Phone <span class="asterisk">*</span></label>
    <input type="tel" id="phone" autocomplete="tel" />
  </div>
  <div class="field">
    <label>Resume/CV</label>
    <input type="file" id="resume" name="resume" />
  </div>
  <div class="field">
    <label>LinkedIn Profile</label>
    <input type="text" id="job_application_answers_attributes_0_text_value" name="job_application[answers_attributes][0][text_value]" placeholder="https://linkedin.com/in/" />
  </div>
</div>
`;

export const leverStyleFormHtml = `
<div class="application-form">
  <ul class="application-fields">
    <li class="application-question">
      <div class="application-label">Full name</div>
      <input type="text" name="name" />
    </li>
    <li class="application-question">
      <div class="application-label">Email</div>
      <input type="email" name="email" />
    </li>
    <li class="application-question">
      <div class="application-label">Phone</div>
      <input type="text" name="phone" />
    </li>
    <li class="application-question">
      <div class="application-label">Current company</div>
      <input type="text" name="org" />
    </li>
    <li class="application-question">
      <div class="application-label">GitHub URL</div>
      <input type="text" name="urls[GitHub]" />
    </li>
  </ul>
</div>
`;

export const workdayStyleFormHtml = `
<div class="css-workday-container">
  <div data-automation-id="legalNameSection">
    <div data-automation-id="formLabel">Legal First Name</div>
    <input data-automation-id="legalNameSection_firstName" type="text" id="input-1" />
  </div>
  <div data-automation-id="legalNameSection">
    <div data-automation-id="formLabel">Legal Last Name</div>
    <input data-automation-id="legalNameSection_lastName" type="text" id="input-2" />
  </div>
  <div data-automation-id="contactInfo">
    <label for="input-3">Email Address</label>
    <input type="email" id="input-3" />
  </div>
  <div data-automation-id="customDropdownWrapper">
    <div id="country-label">Country</div>
    <div role="combobox" aria-labelledby="country-label" aria-haspopup="listbox" id="country-select"></div>
  </div>
</div>
`;

export const ambiguousAndSalaryFormHtml = `
<form>
  <div class="field">
    <label for="curr_ctc">Current CTC (in INR LPA)</label>
    <input type="number" id="curr_ctc" name="current_ctc" />
  </div>
  <div class="field">
    <label for="exp_ctc">Expected CTC (in INR LPA)</label>
    <input type="number" id="exp_ctc" name="expected_ctc" />
  </div>
  <div class="field">
    <label for="notice">Notice Period (Days)</label>
    <input type="number" id="notice" name="notice_period" />
  </div>
  <div class="field">
    <label for="unknown_q">What is your favorite animal?</label>
    <input type="text" id="unknown_q" name="custom_animal" />
  </div>
</form>
`;
