export const REQUIRED_DOCUMENTS = [
  'Passport',
  'Transcript',
  'Recommendation Letter',
  'Statement of Purpose',
  'Financial Proof'
];

export const DEFAULT_CONFIG = {
  github: {
    owner: 'example-owner',
    repo: 'example-repo',
    branch: 'main',
    paths: {
      students: 'data/students.json',
      applications: 'data/applications.json',
      documents: 'data/documents.json'
    },
    token: ''
  },
  flags: {
    requireAllDocumentsBeforeSubmit: true,
    highlightOverdueApplications: true
  }
};

export const SEED_DATA = {
  students: [
    { id: 'STU001', name: 'Ava Patel', email: 'ava@example.edu', cohort: '2026', notes: 'Interested in STEM scholarships.' },
    { id: 'STU002', name: 'Noah Kim', email: 'noah@example.edu', cohort: '2025', notes: 'Strong extracurricular profile.' },
    { id: 'STU003', name: 'Mia Garcia', email: 'mia@example.edu', cohort: '2026', notes: 'Needs support on essay drafts.' }
  ],
  applications: [
    { id: 'APP001', studentId: 'STU001', university: 'State University', program: 'Computer Science', status: 'In Progress', deadline: '2026-01-15' },
    { id: 'APP002', studentId: 'STU001', university: 'Riverside College', program: 'Data Science', status: 'Submitted', deadline: '2025-12-20' },
    { id: 'APP003', studentId: 'STU002', university: 'Metro Institute', program: 'Economics', status: 'Draft', deadline: '2025-11-30' }
  ],
  documents: {
    STU001: ['Passport', 'Transcript', 'Statement of Purpose'],
    STU002: ['Passport'],
    STU003: ['Passport', 'Transcript', 'Recommendation Letter', 'Statement of Purpose', 'Financial Proof']
  },
  settings: DEFAULT_CONFIG
};
