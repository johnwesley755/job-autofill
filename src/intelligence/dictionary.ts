/**
 * Comprehensive dictionary of recruiting aliases and conflicting terminology guards.
 * Supports granular candidate profile keys:
 *  - personal: firstName, middleName, lastName, fullName, email, phone, dob, gender, nationality
 *  - location: addressLine1, city, state, country, postalCode
 *  - education: institution, degree, fieldOfStudy, graduationYear, startYear, cgpa, percentage, backlogsCount
 *  - experience: company, jobTitle, fullTimeExperience, internshipExperience
 *  - preferences: totalExperienceYears, currentCtcLpa, expectedCtcLpa, noticePeriodDays, immediateJoiner, preferredCities, workMode, workAuthorization
 *  - links: linkedin, github, portfolio
 */

export interface FieldDefinition {
  canonicalKey: string;
  category: 'personal' | 'location' | 'education' | 'experience' | 'skills' | 'preferences' | 'links';
  exactNames: string[];
  exactIds: string[];
  autocompletes?: string[];
  labelKeywords: string[];
  placeholderKeywords: string[];
  negativeKeywords: string[];
}

export const CANONICAL_FIELD_DICTIONARY: FieldDefinition[] = [
  // First Name
  {
    canonicalKey: 'personal.firstName',
    category: 'personal',
    exactNames: ['first_name', 'firstname', 'fname', 'first-name', 'given-name', 'givenname', 'legalname_firstname'],
    exactIds: ['first_name', 'firstname', 'fname', 'first-name', 'legal_first_name'],
    autocompletes: ['given-name', 'fname'],
    labelKeywords: ['first name', 'given name', 'forename', 'legal first name'],
    placeholderKeywords: ['first name', 'given name'],
    negativeKeywords: ['last', 'sur', 'family', 'full', 'middle', 'company', 'father', 'mother'],
  },
  // Middle Name
  {
    canonicalKey: 'personal.middleName',
    category: 'personal',
    exactNames: ['middle_name', 'middlename', 'mname', 'middle-name', 'legalname_middlename'],
    exactIds: ['middle_name', 'middlename', 'mname', 'legal_middle_name'],
    autocompletes: ['additional-name', 'mname'],
    labelKeywords: ['middle name', 'middle initial'],
    placeholderKeywords: ['middle name'],
    negativeKeywords: ['first', 'last', 'sur', 'full', 'family'],
  },
  // Last Name
  {
    canonicalKey: 'personal.lastName',
    category: 'personal',
    exactNames: ['last_name', 'lastname', 'lname', 'last-name', 'surname', 'family-name', 'familyname', 'legalname_lastname'],
    exactIds: ['last_name', 'lastname', 'lname', 'surname', 'family_name'],
    autocompletes: ['family-name', 'lname'],
    labelKeywords: ['last name', 'surname', 'family name', 'legal last name'],
    placeholderKeywords: ['last name', 'surname', 'family name'],
    negativeKeywords: ['first', 'given', 'middle', 'full', 'company', 'father', 'mother'],
  },
  // Full Name
  {
    canonicalKey: 'personal.fullName',
    category: 'personal',
    exactNames: ['name', 'full_name', 'fullname', 'candidate_name', 'applicant_name', 'legal_name'],
    exactIds: ['full_name', 'fullname', 'candidate_name', 'applicant_name', 'name'],
    autocompletes: ['name'],
    labelKeywords: ['full name', 'name in full', 'legal name', 'complete name', 'your name', 'candidate name'],
    placeholderKeywords: ['full name', 'your name', 'enter name'],
    negativeKeywords: ['first', 'last', 'sur', 'middle', 'company', 'institute', 'college', 'manager', 'reference'],
  },
  // Email
  {
    canonicalKey: 'personal.email',
    category: 'personal',
    exactNames: ['email', 'email_address', 'emailaddress', 'user_email', 'applicant_email'],
    exactIds: ['email', 'email_address', 'user_email', 'applicant_email'],
    autocompletes: ['email'],
    labelKeywords: ['email', 'email address', 'e-mail'],
    placeholderKeywords: ['email', '@', 'example.com'],
    negativeKeywords: ['manager', 'referral', 'company', 'alternate', 'secondary'],
  },
  // Phone
  {
    canonicalKey: 'personal.phone',
    category: 'personal',
    exactNames: ['phone', 'mobile', 'telephone', 'phone_number', 'mobile_number', 'cell', 'cellphone'],
    exactIds: ['phone', 'mobile', 'phone_number', 'mobile_number'],
    autocompletes: ['tel', 'tel-national'],
    labelKeywords: ['phone', 'mobile', 'contact number', 'phone number', 'mobile number', 'cell phone'],
    placeholderKeywords: ['phone', 'mobile', '98765', '10 digits'],
    negativeKeywords: ['fax', 'emergency', 'alternate', 'secondary', 'manager', 'company'],
  },
  // Date of Birth
  {
    canonicalKey: 'personal.dob',
    category: 'personal',
    exactNames: ['dob', 'date_of_birth', 'birthdate', 'birth_date'],
    exactIds: ['dob', 'date_of_birth', 'birthdate'],
    autocompletes: ['bday'],
    labelKeywords: ['date of birth', 'dob', 'birth date', 'born on'],
    placeholderKeywords: ['yyyy-mm-dd', 'dd/mm/yyyy', 'dob'],
    negativeKeywords: ['place of birth', 'country of birth'],
  },
  // Gender
  {
    canonicalKey: 'personal.gender',
    category: 'personal',
    exactNames: ['gender', 'sex'],
    exactIds: ['gender', 'sex', 'candidate_gender'],
    autocompletes: ['sex'],
    labelKeywords: ['gender', 'gender identity', 'sex'],
    placeholderKeywords: ['select gender', 'gender'],
    negativeKeywords: ['generation'],
  },
  // Nationality
  {
    canonicalKey: 'personal.nationality',
    category: 'personal',
    exactNames: ['nationality', 'citizenship'],
    exactIds: ['nationality', 'citizenship'],
    autocompletes: ['nationality'],
    labelKeywords: ['nationality', 'country of citizenship', 'citizenship'],
    placeholderKeywords: ['nationality', 'citizenship'],
    negativeKeywords: ['dual', 'residence'],
  },
  // Address
  {
    canonicalKey: 'location.addressLine1',
    category: 'location',
    exactNames: ['address', 'street_address', 'address_line1', 'address1', 'street'],
    exactIds: ['address', 'street_address', 'address_line1'],
    autocompletes: ['street-address', 'address-line1'],
    labelKeywords: ['street address', 'address line 1', 'residential address', 'permanent address'],
    placeholderKeywords: ['street address', 'flat, house no.'],
    negativeKeywords: ['email', 'ip address', 'mac address'],
  },
  // City
  {
    canonicalKey: 'location.city',
    category: 'location',
    exactNames: ['city', 'town', 'municipality', 'current_city'],
    exactIds: ['city', 'town', 'current_city'],
    autocompletes: ['address-level2'],
    labelKeywords: ['city', 'current city', 'town'],
    placeholderKeywords: ['city', 'e.g. bengaluru', 'town'],
    negativeKeywords: ['preferred', 'preference', 'relocation', 'country', 'birth'],
  },
  // State
  {
    canonicalKey: 'location.state',
    category: 'location',
    exactNames: ['state', 'province', 'region', 'current_state'],
    exactIds: ['state', 'province', 'current_state'],
    autocompletes: ['address-level1'],
    labelKeywords: ['state', 'province', 'state / province', 'region'],
    placeholderKeywords: ['state', 'province'],
    negativeKeywords: ['united states', 'status', 'statement', 'country', 'birth'],
  },
  // Country
  {
    canonicalKey: 'location.country',
    category: 'location',
    exactNames: ['country', 'nation', 'current_country'],
    exactIds: ['country', 'nation', 'current_country'],
    autocompletes: ['country', 'country-name'],
    labelKeywords: ['country', 'residence country', 'current country'],
    placeholderKeywords: ['country', 'india', 'united states'],
    negativeKeywords: ['code', 'dialing', 'citizenship', 'birth', 'relocation'],
  },
  // Postal Code / PIN Code
  {
    canonicalKey: 'location.postalCode',
    category: 'location',
    exactNames: ['postal_code', 'postalcode', 'zip', 'zipcode', 'zip_code', 'pin_code', 'pincode'],
    exactIds: ['postal_code', 'zip', 'zipcode', 'pincode', 'pin_code'],
    autocompletes: ['postal-code'],
    labelKeywords: ['postal code', 'zip code', 'pin code', 'zip', 'pincode'],
    placeholderKeywords: ['postal code', 'zip', 'pin code', '6 digits'],
    negativeKeywords: ['country code', 'area code', 'dialing code'],
  },
  // Education Institution
  {
    canonicalKey: 'education.institution',
    category: 'education',
    exactNames: ['school', 'college', 'university', 'institution', 'institute_name', 'college_name'],
    exactIds: ['school', 'college', 'university', 'institution'],
    autocompletes: [],
    labelKeywords: ['school', 'college', 'university', 'institution', 'institute name', 'alma mater'],
    placeholderKeywords: ['university', 'college', 'institution'],
    negativeKeywords: ['high school', 'secondary school', '10th', '12th'],
  },
  // Degree
  {
    canonicalKey: 'education.degree',
    category: 'education',
    exactNames: ['degree', 'qualification', 'highest_degree', 'degree_name'],
    exactIds: ['degree', 'qualification', 'highest_degree'],
    autocompletes: [],
    labelKeywords: ['degree', 'highest qualification', 'education level', 'degree obtained'],
    placeholderKeywords: ['b.tech', 'bachelor', 'master', 'degree'],
    negativeKeywords: ['percentage', 'cgpa', 'year', 'branch', 'stream', 'score'],
  },
  // Field of Study / Branch
  {
    canonicalKey: 'education.fieldOfStudy',
    category: 'education',
    exactNames: ['major', 'branch', 'specialization', 'field_of_study', 'department', 'stream'],
    exactIds: ['major', 'branch', 'specialization', 'field_of_study'],
    autocompletes: [],
    labelKeywords: ['major', 'field of study', 'specialization', 'branch', 'stream', 'discipline'],
    placeholderKeywords: ['computer science', 'engineering', 'major'],
    negativeKeywords: ['degree', 'college', 'university', 'minor', 'year'],
  },
  // Graduation Year / Batch
  {
    canonicalKey: 'education.graduationYear',
    category: 'education',
    exactNames: ['grad_year', 'graduation_year', 'batch', 'year_of_passing', 'passing_year', 'completion_year'],
    exactIds: ['grad_year', 'graduation_year', 'batch', 'year_of_passing'],
    autocompletes: [],
    labelKeywords: ['graduation year', 'year of passing', 'batch', 'passing year', 'year of graduation'],
    placeholderKeywords: ['2024', '2025', 'batch', 'year'],
    negativeKeywords: ['start', 'birth', 'joining', 'experience'],
  },
  // Education Start Year
  {
    canonicalKey: 'education.startYear',
    category: 'education',
    exactNames: ['start_year', 'education_start_year', 'joining_year', 'admission_year'],
    exactIds: ['start_year', 'education_start'],
    autocompletes: [],
    labelKeywords: ['start year', 'year of admission', 'commencement year'],
    placeholderKeywords: ['start year', '2020'],
    negativeKeywords: ['graduation', 'passing', 'end', 'birth'],
  },
  // CGPA (strictly separate from percentage)
  {
    canonicalKey: 'education.cgpa',
    category: 'education',
    exactNames: ['cgpa', 'gpa', 'cumulative_gpa', 'academic_gpa'],
    exactIds: ['cgpa', 'gpa'],
    autocompletes: [],
    labelKeywords: ['cgpa', 'gpa', 'cumulative grade point', 'cgpa (out of 10)'],
    placeholderKeywords: ['cgpa', 'gpa', 'out of 10', 'out of 4'],
    negativeKeywords: ['percentage', '%', 'percentile'],
  },
  // Percentage (strictly separate from CGPA)
  {
    canonicalKey: 'education.percentage',
    category: 'education',
    exactNames: ['percentage', 'percent', 'aggregate_percentage', 'marks_percentage'],
    exactIds: ['percentage', 'percent', 'aggregate_percentage'],
    autocompletes: [],
    labelKeywords: ['percentage', 'marks in %', 'aggregate percentage', 'percent score'],
    placeholderKeywords: ['%', 'percentage', 'out of 100'],
    negativeKeywords: ['cgpa', 'gpa', 'scale of 10', 'scale of 4'],
  },
  // Backlogs
  {
    canonicalKey: 'education.backlogsCount',
    category: 'education',
    exactNames: ['backlogs', 'backlog_count', 'active_backlogs', 'standing_arrears'],
    exactIds: ['backlogs', 'backlog_count', 'active_backlogs'],
    autocompletes: [],
    labelKeywords: ['backlogs', 'active backlogs', 'number of backlogs', 'standing arrears'],
    placeholderKeywords: ['0', 'backlogs'],
    negativeKeywords: ['history'],
  },
  // Full-time Work Experience / Company
  {
    canonicalKey: 'experience.company',
    category: 'experience',
    exactNames: ['company', 'employer', 'organization', 'current_company', 'current_employer'],
    exactIds: ['company', 'employer', 'organization', 'current_company'],
    autocompletes: ['organization'],
    labelKeywords: ['current company', 'company', 'current employer', 'organization', 'most recent company'],
    placeholderKeywords: ['company', 'organization'],
    negativeKeywords: ['internship', 'previous', 'first', 'desired'],
  },
  // Internship Experience (strictly separate from full-time experience)
  {
    canonicalKey: 'experience.internship',
    category: 'experience',
    exactNames: ['internship_company', 'internship', 'intern_experience'],
    exactIds: ['internship_company', 'internship'],
    autocompletes: [],
    labelKeywords: ['internship', 'internship company', 'trainee organization', 'intern details'],
    placeholderKeywords: ['internship company', 'summer intern'],
    negativeKeywords: ['full-time', 'permanent', 'current full-time'],
  },
  // Job Title
  {
    canonicalKey: 'experience.jobTitle',
    category: 'experience',
    exactNames: ['title', 'job_title', 'current_title', 'designation', 'position'],
    exactIds: ['title', 'job_title', 'current_title', 'designation'],
    autocompletes: ['organization-title'],
    labelKeywords: ['job title', 'current title', 'designation', 'current role', 'position title'],
    placeholderKeywords: ['software engineer', 'developer', 'job title'],
    negativeKeywords: ['desired', 'applying for', 'target'],
  },
  // Total Experience
  {
    canonicalKey: 'preferences.totalExperienceYears',
    category: 'preferences',
    exactNames: ['experience', 'total_experience', 'years_of_experience', 'total_exp'],
    exactIds: ['experience', 'total_experience', 'years_of_experience'],
    autocompletes: [],
    labelKeywords: ['total experience', 'years of experience', 'overall experience', 'relevant experience'],
    placeholderKeywords: ['years', 'experience in years'],
    negativeKeywords: ['internship', 'current', 'last'],
  },
  // Current CTC (LPA) - strictly separate from expected CTC
  {
    canonicalKey: 'preferences.currentCtcLpa',
    category: 'preferences',
    exactNames: ['current_ctc', 'current_salary', 'present_ctc', 'present_salary', 'curr_ctc'],
    exactIds: ['current_ctc', 'current_salary', 'present_ctc', 'curr_ctc'],
    autocompletes: [],
    labelKeywords: ['current ctc', 'current salary', 'present ctc', 'present salary', 'current compensation'],
    placeholderKeywords: ['lpa', 'inr', 'current ctc'],
    negativeKeywords: ['expected', 'target', 'desired', 'minimum'],
  },
  // Expected CTC (LPA) - strictly separate from current CTC
  {
    canonicalKey: 'preferences.expectedCtcLpa',
    category: 'preferences',
    exactNames: ['expected_ctc', 'expected_salary', 'desired_salary', 'desired_compensation', 'exp_ctc'],
    exactIds: ['expected_ctc', 'expected_salary', 'desired_salary', 'exp_ctc'],
    autocompletes: [],
    labelKeywords: ['expected ctc', 'expected salary', 'desired salary', 'compensation expectation'],
    placeholderKeywords: ['lpa', 'inr', 'expected ctc'],
    negativeKeywords: ['current', 'present', 'previous', 'last'],
  },
  // Notice Period
  {
    canonicalKey: 'preferences.noticePeriodDays',
    category: 'preferences',
    exactNames: ['notice_period', 'notice_days', 'availability_days', 'notice'],
    exactIds: ['notice_period', 'notice_days', 'notice'],
    autocompletes: [],
    labelKeywords: ['notice period', 'availability to join', 'joining period', 'days notice', 'serving notice'],
    placeholderKeywords: ['days', '30 days', 'notice period'],
    negativeKeywords: ['date', 'agreement'],
  },
  // Immediate Joiner
  {
    canonicalKey: 'preferences.immediateJoiner',
    category: 'preferences',
    exactNames: ['immediate_joiner', 'can_join_immediately', 'immediate_joining'],
    exactIds: ['immediate_joiner', 'immediate_joining'],
    autocompletes: [],
    labelKeywords: ['immediate joiner', 'can join immediately', 'available to join immediately'],
    placeholderKeywords: ['yes/no', 'immediate'],
    negativeKeywords: [],
  },
  // Preferred Cities
  {
    canonicalKey: 'preferences.preferredCities',
    category: 'preferences',
    exactNames: ['preferred_location', 'preferred_city', 'preferred_cities', 'preferred_locations'],
    exactIds: ['preferred_location', 'preferred_city', 'preferred_cities'],
    autocompletes: [],
    labelKeywords: ['preferred location', 'preferred city', 'preferred work location', 'preferred cities'],
    placeholderKeywords: ['bengaluru, hyderabad', 'preferred location'],
    negativeKeywords: ['current city', 'current location'],
  },
  // Work Mode
  {
    canonicalKey: 'preferences.workMode',
    category: 'preferences',
    exactNames: ['work_mode', 'work_preference', 'work_arrangement', 'work_model'],
    exactIds: ['work_mode', 'work_preference'],
    autocompletes: [],
    labelKeywords: ['work mode', 'remote / hybrid / onsite', 'work arrangement', 'preferred work mode'],
    placeholderKeywords: ['remote', 'hybrid', 'onsite'],
    negativeKeywords: [],
  },
  // Work Authorization
  {
    canonicalKey: 'preferences.workAuthorization',
    category: 'preferences',
    exactNames: ['work_auth', 'work_authorization', 'visa_status', 'authorized_to_work'],
    exactIds: ['work_auth', 'work_authorization', 'visa_status'],
    autocompletes: [],
    labelKeywords: ['authorized to work', 'work authorization', 'legal right to work', 'visa status'],
    placeholderKeywords: ['authorized', 'citizen', 'visa'],
    negativeKeywords: [],
  },
  // LinkedIn
  {
    canonicalKey: 'links.linkedin',
    category: 'links',
    exactNames: ['linkedin', 'linkedin_url', 'linkedin_profile'],
    exactIds: ['linkedin', 'linkedin_url', 'linkedin_profile'],
    autocompletes: [],
    labelKeywords: ['linkedin', 'linkedin profile', 'linkedin url'],
    placeholderKeywords: ['linkedin.com', 'linkedin'],
    negativeKeywords: ['twitter', 'github', 'facebook'],
  },
  // GitHub
  {
    canonicalKey: 'links.github',
    category: 'links',
    exactNames: ['github', 'github_url', 'github_profile', 'urls[github]'],
    exactIds: ['github', 'github_url', 'github_profile'],
    autocompletes: [],
    labelKeywords: ['github', 'github profile', 'github url'],
    placeholderKeywords: ['github.com', 'github'],
    negativeKeywords: ['linkedin', 'portfolio'],
  },
  // Portfolio
  {
    canonicalKey: 'links.portfolio',
    category: 'links',
    exactNames: ['portfolio', 'portfolio_url', 'website', 'personal_website', 'urls[portfolio]'],
    exactIds: ['portfolio', 'portfolio_url', 'website'],
    autocompletes: ['url'],
    labelKeywords: ['portfolio', 'portfolio website', 'personal website', 'portfolio url', 'personal link'],
    placeholderKeywords: ['portfolio.dev', 'mywebsite.com', 'portfolio'],
    negativeKeywords: ['github', 'linkedin', 'twitter'],
  },
];
