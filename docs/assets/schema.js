export const DEFAULT_CONFIG = {
  requiredDocuments: [
    { key: 'transcript', label: 'Transcript' },
    { key: 'degree_certificate', label: 'Degree Certificate' },
    { key: 'passport', label: 'Passport' },
    { key: 'cv', label: 'CV' },
    { key: 'motivation_letter', label: 'Motivation Letter' }
  ],
  applicationStatuses: ['Planned', 'In Progress', 'Submitted', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
  deadlineWarningDays: 14,
  portals: ['Uni-Assist', 'University Portal', 'Email Application', 'Other']
};

export const DEFAULT_REPO_SETTINGS = {
  owner: '',
  repo: '',
  branch: 'main',
  dataPath: 'data',
  docsPath: 'docs'
};

export const DOC_STATUSES = ['missing', 'uploaded', 'outdated'];

export function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(String(value || '').trim());
}

export function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

export function validateApplication(app, config) {
  const errors = [];
  if (!app.uniName?.trim()) errors.push('University name is required.');
  if (!app.programName?.trim()) errors.push('Program name is required.');
  if (!isIsoDate(app.deadline)) errors.push('Deadline must be in yyyy-mm-dd format.');
  if (!config.applicationStatuses.includes(app.status)) errors.push('Status is invalid.');
  return errors;
}

export function blankStudent(id, config) {
  const documents = Object.fromEntries(config.requiredDocuments.map((d) => [d.key, { status: 'missing', path: '' }]));
  return {
    id,
    name: '',
    email: '',
    phone: '',
    emergencyContact: { name: '', phone: '', relation: '' },
    notes: '',
    documents,
    applications: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
