import {
  getStudents,
  getStudentById,
  saveStudent,
  getApplications,
  upsertApplication,
  deleteApplication,
  getDocuments,
  setDocuments,
  getSettings,
  setSettings,
  dashboardKpis,
  nextId
} from './storage.js';
import { REQUIRED_DOCUMENTS, DEFAULT_CONFIG } from './schema.js';
import { mountNav, statusBadge, qs, formatDate } from './ui.js';

function param(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function initDashboard() {
  mountNav('index');
  const kpis = dashboardKpis();
  qs('#kpis').innerHTML = [
    ['Students', kpis.students],
    ['Applications', kpis.applications],
    ['Submitted', kpis.submitted],
    ['Due in 30 days', kpis.dueSoon]
  ]
    .map(([label, value]) => `<article class="card"><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></article>`)
    .join('');

  const studentsById = Object.fromEntries(getStudents().map((s) => [s.id, s]));
  qs('#appRows').innerHTML = getApplications()
    .map(
      (app) => `
        <tr>
          <td>${app.id}</td>
          <td><a href="student.html?id=${app.studentId}">${studentsById[app.studentId]?.name || app.studentId}</a></td>
          <td>${app.university}</td>
          <td>${app.program}</td>
          <td>${statusBadge(app.status)}</td>
          <td>${formatDate(app.deadline)}</td>
        </tr>`
    )
    .join('');
}

function initStudentsPage() {
  mountNav('students');
  const cards = getStudents()
    .map(
      (student) => `
      <article class="card stack">
        <div>
          <h3>${student.name}</h3>
          <div class="small">${student.id} · Cohort ${student.cohort}</div>
        </div>
        <div>${student.email}</div>
        <div class="small">${student.notes || ''}</div>
        <a href="student.html?id=${student.id}"><button>View student</button></a>
      </article>`
    )
    .join('');
  qs('#studentCards').innerHTML = cards || '<p class="small">No students yet.</p>';
}

function studentOrFallback() {
  const id = param('id');
  const student = id ? getStudentById(id) : null;
  if (!student) {
    qs('#studentRoot').innerHTML = '<article class="card">Student not found. Go to <a href="students.html">students</a>.</article>';
    return null;
  }
  return student;
}

function renderDocuments(student) {
  const selected = new Set(getDocuments(student.id));
  qs('#documents').innerHTML = REQUIRED_DOCUMENTS.map(
    (doc) => `
      <label>
        <input type="checkbox" value="${doc}" ${selected.has(doc) ? 'checked' : ''} /> ${doc}
      </label>`
  ).join('');

  qs('#saveDocuments').onclick = () => {
    const values = Array.from(document.querySelectorAll('#documents input:checked')).map((el) => el.value);
    setDocuments(student.id, values);
    alert('Documents saved.');
  };
}

function renderApplications(student) {
  const tbody = qs('#studentAppRows');
  const apps = getApplications(student.id);
  tbody.innerHTML = apps
    .map(
      (app) => `
        <tr>
          <td>${app.id}</td>
          <td>${app.university}</td>
          <td>${app.program}</td>
          <td>${statusBadge(app.status)}</td>
          <td>${formatDate(app.deadline)}</td>
          <td><button class="danger" data-del="${app.id}">Delete</button></td>
        </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteApplication(btn.dataset.del);
      renderApplications(student);
    });
  });
}

function initStudentPage() {
  mountNav('students');
  const student = studentOrFallback();
  if (!student) return;

  qs('#studentId').textContent = student.id;
  qs('#name').value = student.name || '';
  qs('#email').value = student.email || '';
  qs('#cohort').value = student.cohort || '';
  qs('#notes').value = student.notes || '';

  qs('#saveStudent').onclick = () => {
    saveStudent({
      id: student.id,
      name: qs('#name').value,
      email: qs('#email').value,
      cohort: qs('#cohort').value,
      notes: qs('#notes').value
    });
    alert('Student saved.');
  };

  renderApplications(student);

  qs('#addApplication').onclick = () => {
    const allApps = getApplications();
    const app = {
      id: nextId('APP', allApps),
      studentId: student.id,
      university: qs('#appUniversity').value,
      program: qs('#appProgram').value,
      status: qs('#appStatus').value,
      deadline: qs('#appDeadline').value
    };
    if (!app.university || !app.program) {
      alert('University and program are required.');
      return;
    }
    upsertApplication(app);
    qs('#appUniversity').value = '';
    qs('#appProgram').value = '';
    qs('#appDeadline').value = '';
    renderApplications(student);
  };

  renderDocuments(student);
}

function initSettingsPage() {
  mountNav('settings');
  const settings = getSettings();

  qs('#owner').value = settings.github?.owner || '';
  qs('#repo').value = settings.github?.repo || '';
  qs('#branch').value = settings.github?.branch || '';
  qs('#pathStudents').value = settings.github?.paths?.students || '';
  qs('#pathApplications').value = settings.github?.paths?.applications || '';
  qs('#pathDocuments').value = settings.github?.paths?.documents || '';
  qs('#token').value = settings.github?.token || '';
  qs('#configJson').value = JSON.stringify(settings, null, 2);

  qs('#saveSettings').onclick = () => {
    let config;
    try {
      config = JSON.parse(qs('#configJson').value);
    } catch {
      alert('Config JSON is invalid.');
      return;
    }

    config.github = {
      ...config.github,
      owner: qs('#owner').value,
      repo: qs('#repo').value,
      branch: qs('#branch').value,
      token: qs('#token').value,
      paths: {
        students: qs('#pathStudents').value,
        applications: qs('#pathApplications').value,
        documents: qs('#pathDocuments').value
      }
    };

    setSettings(config);
    alert('Settings saved.');
  };

  qs('#resetSettings').onclick = () => {
    setSettings(DEFAULT_CONFIG);
    window.location.reload();
  };
}

const page = document.body.dataset.page;
if (page === 'dashboard') initDashboard();
if (page === 'students') initStudentsPage();
if (page === 'student') initStudentPage();
if (page === 'settings') initSettingsPage();
