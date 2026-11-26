/**
 * Comprehensive dictionary of recruiting aliases and conflicting terminology guards.
 */

export interface FieldDefinition {
  canonicalKey: string;
  category: 'personal' | 'location' | 'education' | 'experience' | 'skills' | 'preferences' | 'links';
  exactNames: string[];
  labelKeywords: string[];
  placeholderKeywords: string[];
  negativeKeywords: string[];
}

export const CANONICAL_FIELD_DICTIONARY: FieldDefinition[] = [
  // First Name
  {
    canonicalKey: 'personal.firstName',
    category: 'personal',
    exactNames: ['first_name', 'firstname', 'fname', 'first-name', 'given-name', 'givenname'],
    labelKeywords: ['first name', 'given name', 'forename'],
    placeholderKeywords: ['first name', 'given name'],
    negativeKeywords: ['last', 'sur', 'family', 'full', 'middle', 'company', 'father', 'mother'],
  },
  // Last Name
  {
    canonicalKey: 'personal.lastName',
    category: 'personal',
    exactNames: ['last_name', 'lastname', 'lname', 'last-name', 'surname', 'family-name', 'familyname'],
    labelKeywords: ['last name', 'surname', 'family name'],
    placeholderKeywords: ['last name', 'surname'],
    negativeKeywords: ['first', 'given', 'middle', 'full', 'company', 'father', 'mother'],
  },
  // Full Name
  {
    canonicalKey: 'personal.fullName',
    category: 'personal',
    exactNames: ['name', 'full_name', 'fullname', 'candidate_name', 'applicant_name'],
    labelKeywords: ['full name', 'name in full', 'legal name', 'complete name', 'your name'],
    placeholderKeywords: ['full name', 'your name', 'enter name'],
    negativeKeywords: ['first', 'last', 'sur', 'middle', 'company', 'institute', 'college', 'manager', 'reference'],
  },
  // Email
  {
    canonicalKey: 'personal.email',
    category: 'personal',
    exactNames: ['email', 'email_address', 'emailaddress', 'user_email', 'applicant_email'],
    labelKeywords: ['email', 'email address', 'e-mail'],
    placeholderKeywords: ['email', '@', 'example.com'],
    negativeKeywords: ['manager', 'referral', 'company', 'alternate', 'secondary'],
  },
  // Phone
  {
    canonicalKey: 'personal.phone',
    category: 'personal',
    exactNames: ['phone', 'mobile', 'telephone', 'phone_number', 'mobile_number', 'cell', 'cellphone'],
    labelKeywords: ['phone', 'mobile', 'contact number', 'phone number', 'mobile number', 'cell phone'],
    placeholderKeywords: ['phone', 'mobile', '98765', '10 digits'],
    negativeKeywords: ['fax', 'emergency', 'alternate', 'secondary', 'manager', 'company'],
  },
  // City
  {
    canonicalKey: 'location.city',
    category: 'location',
    exactNames: ['city', 'town', 'municipality', 'current_city'],
    labelKeywords: ['city', 'current city', 'town'],
    placeholderKeywords: ['city', 'e.g. bengaluru', 'town'],
    negativeKeywords: ['preferred', 'preference', 'relocation', 'country', 'birth'],
  },
  // State
  {
    canonicalKey: 'location.state',
    category: 'location',
    exactNames: ['state', 'province', 'region', 'current_state'],
    labelKeywords: ['state', 'province', 'state / province', 'region'],
    placeholderKeywords: ['state', 'province'],
    negativeKeywords: ['united states', 'status', 'statement', 'country', 'birth'],
  },
  // Country
  {
    canonicalKey: 'location.country',
    category: 'location',
    exactNames: ['country', 'nation', 'current_country'],
    labelKeywords: ['country', 'residence country', 'current country'],
    placeholderKeywords: ['country', 'india', 'united states'],
    negativeKeywords: ['code', 'dialing', 'citizenship', 'birth'],
  },
  // Education Institution
  {
    canonicalKey: 'education.institution',
    category: 'education',
    exactNames: ['school', 'college', 'university', 'institution', 'institute_name'],
    labelKeywords: ['school', 'college', 'university', 'institution', 'institute name', 'alma mater'],
    placeholderKeywords: ['university', 'college', 'institution'],
    negativeKeywords: ['high school', 'secondary school', '10th', '12th'],
  },
  // Degree
  {
    canonicalKey: 'education.degree',
    category: 'education',
    exactNames: ['degree', 'qualification', 'highest_degree', 'degree_name'],
    labelKeywords: ['degree', 'highest qualification', 'education level', 'degree obtained'],
    placeholderKeywords: ['b.tech', 'bachelor', 'master', 'degree'],
    negativeKeywords: ['percentage', 'cgpa', 'year', 'branch', 'stream'],
  },
  // Field of Study / Branch
  {
    canonicalKey: 'education.fieldOfStudy',
    category: 'education',
    exactNames: ['major', 'branch', 'specialization', 'field_of_study', 'department', 'stream'],
    labelKeywords: ['major', 'field of study', 'specialization', 'branch', 'stream', 'discipline'],
    placeholderKeywords: ['computer science', 'engineering', 'major'],
    negativeKeywords: ['degree', 'college', 'university', 'minor'],
  },
  // Graduation Year / Batch
  {
    canonicalKey: 'education.graduationYear',
    category: 'education',
    exactNames: ['grad_year', 'graduation_year', 'batch', 'year_of_passing', 'passing_year'],
    labelKeywords: ['graduation year', 'year of passing', 'batch', 'passing year', 'year of graduation'],
    placeholderKeywords: ['2024', '2025', 'batch', 'year'],
    negativeKeywords: ['start', 'birth', 'joining', 'experience'],
  },
  // Academic Score (CGPA / Percentage)
  {
    canonicalKey: 'education.score',
    category: 'education',
    exactNames: ['gpa', 'cgpa', 'percentage', 'marks', 'academic_score'],
    labelKeywords: ['cgpa', 'gpa', 'percentage', 'marks obtained', 'aggregate'],
    placeholderKeywords: ['cgpa', 'gpa', '%', 'percentage'],
    negativeKeywords: ['weight', 'credit'],
  },
  // Company / Current Employer
  {
    canonicalKey: 'experience.company',
    category: 'experience',
    exactNames: ['company', 'employer', 'organization', 'current_company', 'current_employer'],
    labelKeywords: ['current company', 'company', 'current employer', 'organization', 'most recent company'],
    placeholderKeywords: ['company', 'organization'],
    negativeKeywords: ['previous', 'first', 'desired'],
  },
  // Job Title
  {
    canonicalKey: 'experience.jobTitle',
    category: 'experience',
    exactNames: ['title', 'job_title', 'current_title', 'designation', 'position'],
    labelKeywords: ['job title', 'current title', 'designation', 'current role', 'position title'],
    placeholderKeywords: ['software engineer', 'developer', 'job title'],
    negativeKeywords: ['desired', 'applying for', 'target'],
  },
  // Total Experience
  {
    canonicalKey: 'preferences.totalExperienceYears',
    category: 'preferences',
    exactNames: ['experience', 'total_experience', 'years_of_experience', 'total_exp'],
    labelKeywords: ['total experience', 'years of experience', 'overall experience', 'relevant experience'],
    placeholderKeywords: ['years', 'experience in years'],
    negativeKeywords: ['internship', 'current', 'last'],
  },
  // Current CTC (LPA)
  {
    canonicalKey: 'preferences.currentCtcLpa',
    category: 'preferences',
    exactNames: ['current_ctc', 'current_salary', 'present_ctc', 'present_salary', 'curr_ctc'],
    labelKeywords: ['current ctc', 'current salary', 'present ctc', 'present salary', 'current compensation'],
    placeholderKeywords: ['lpa', 'inr', 'current ctc'],
    negativeKeywords: ['expected', 'target', 'desired', 'minimum'],
  },
  // Expected CTC (LPA)
  {
    canonicalKey: 'preferences.expectedCtcLpa',
    category: 'preferences',
    exactNames: ['expected_ctc', 'expected_salary', 'desired_salary', 'desired_compensation', 'exp_ctc'],
    labelKeywords: ['expected ctc', 'expected salary', 'desired salary', 'compensation expectation'],
    placeholderKeywords: ['lpa', 'inr', 'expected ctc'],
    negativeKeywords: ['current', 'present', 'previous', 'last'],
  },
  // Notice Period
  {
    canonicalKey: 'preferences.noticePeriodDays',
    category: 'preferences',
    exactNames: ['notice_period', 'notice_days', 'availability_days', 'notice'],
    labelKeywords: ['notice period', 'availability to join', 'joining period', 'days notice', 'serving notice'],
    placeholderKeywords: ['days', '30 days', 'notice period'],
    negativeKeywords: ['date', 'agreement'],
  },
  // LinkedIn
  {
    canonicalKey: 'links.linkedin',
    category: 'links',
    exactNames: ['linkedin', 'linkedin_url', 'linkedin_profile'],
    labelKeywords: ['linkedin', 'linkedin profile', 'linkedin url'],
    placeholderKeywords: ['linkedin.com', 'linkedin'],
    negativeKeywords: ['twitter', 'github', 'facebook'],
  },
  // GitHub
  {
    canonicalKey: 'links.github',
    category: 'links',
    exactNames: ['github', 'github_url', 'github_profile', 'urls[github]'],
    labelKeywords: ['github', 'github profile', 'github url'],
    placeholderKeywords: ['github.com', 'github'],
    negativeKeywords: ['linkedin', 'portfolio'],
  },
];
