import { qs, qsa, mountNav, statusBadge, docBadge, formatDate, daysLeft, escapeHtml } from './ui.js';
import { loadRepoData, saveDraft, loadDraft, clearDraft, createBundle, listChangedFiles, getSettings, setSettings, commitViaGitHub } from './storage.js';
import { DEFAULT_CONFIG, isValidEmail, validateApplication, isIsoDate, blankStudent, DOC_STATUSES } from './schema.js';

const state = { base: null, draft: null, changedFiles: {}, pendingUploads: [] };

const page = document.body.dataset.page;

function parseStudentFiles(data) {
  return Object.entries(data.details).map(([id, detail]) => [`data/students/${id}.json`, detail]);
}

function boot() {
  return loadRepoData().then((repo) => {
    state.base = repo;
    state.draft = loadDraft() || clone(repo);
    renderUnsaved();
    if (page === 'dashboard') initDashboard();
    if (page === 'students') initStudents();
    if (page === 'student') initStudent();
    if (page === 'settings') initSettings();
    if (page === 'applications') initApplications();
  });
}

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function allStudents() { return state.draft.studentsIndex.students || []; }
function detail(id) { return state.draft.details[id]; }
function allApps() { return allStudents().flatMap((s) => detail(s.id)?.applications || []); }
function missingDocs(stu) { return Object.values(stu.documents || {}).filter((d) => d.status !== 'uploaded').length; }

function renderUnsaved() {
  const el = qs('#changeCount');
  if (!el) return;
  const count = listChangedFiles(state).length + (state.pendingUploads?.length || 0);
  el.textContent = count;
}

function markChanged(filePath, content) {
  state.changedFiles[filePath] = content;
  saveDraft(state.draft);
  renderUnsaved();
}

function refreshStudentsIndex() {
  state.draft.studentsIndex.updatedAt = new Date().toISOString();
  markChanged('data/students.json', state.draft.studentsIndex);
}

function studentStats(stu) {
  const apps = stu.applications || [];
  return {
    applications: apps.length,
    submitted: apps.filter((a) => a.status === 'Submitted').length,
    offers: apps.filter((a) => a.status === 'Offer').length,
    missingDocs: missingDocs(stu)
  };
}

function initDashboard() {
  mountNav('dashboard');
  const config = state.draft.config || DEFAULT_CONFIG;
  const apps = allApps();
  const now = new Date();
  const kpis = {
    students: allStudents().length,
    applications: apps.length,
    upcoming: apps.filter((a) => { const d = new Date(a.deadline); return d >= now && daysLeft(a.deadline) <= config.deadlineWarningDays; }).length,
    missing: Object.values(state.draft.details).reduce((n, s) => n + missingDocs(s), 0)
  };
  qs('#kpis').innerHTML = [['Total Students', kpis.students], ['Total Applications', kpis.applications], [`Upcoming (${config.deadlineWarningDays}d)`, kpis.upcoming], ['Missing Docs', kpis.missing]]
    .map(([k, v]) => `<article class="card"><p class="muted">${k}</p><p class="kpi">${v}</p></article>`).join('');

  const rows = apps.map((a) => {
    const left = daysLeft(a.deadline);
    return `<tr><td><a href="student.html?id=${a.studentId}">${a.studentId}</a></td><td>${escapeHtml(a.uniName)}</td><td>${escapeHtml(a.programName)}</td><td>${statusBadge(a.status)}</td><td>${formatDate(a.deadline)} ${left !== null ? `<span class="muted">(${left}d)</span>` : ''}</td></tr>`;
  }).join('');
  qs('#appsBody').innerHTML = rows || '<tr><td colspan="5">No applications found.</td></tr>';
}

function initStudents() {
  mountNav('students');
  renderStudentCards();
  qs('#addStudent').addEventListener('click', () => {
    const id = nextStudentId();
    const stu = blankStudent(id, state.draft.config || DEFAULT_CONFIG);
    stu.name = qs('#newName').value.trim();
    stu.email = qs('#newEmail').value.trim();
    if (!stu.name) return alert('Student name is required.');
    if (!isValidEmail(stu.email)) return alert('Valid email required.');
    state.draft.studentsIndex.students.push({ id, name: stu.name, email: stu.email });
    state.draft.details[id] = stu;
    refreshStudentsIndex();
    markChanged(`data/students/${id}.json`, stu);
    renderStudentCards();
    qs('#newName').value = ''; qs('#newEmail').value = '';
  });
}

function renderStudentCards() {
  const term = qs('#studentSearch')?.value?.toLowerCase() || '';
  const cards = allStudents().filter((s) => `${s.name} ${s.email}`.toLowerCase().includes(term)).map((s) => {
    const st = studentStats(detail(s.id));
    return `<article class="card stack"><h3>${escapeHtml(s.name)}</h3><p class="muted">${escapeHtml(s.email)} · ${s.id}</p><p>${st.applications} applications · ${st.submitted} submitted · ${st.offers} offers</p><p>Missing docs: <strong>${st.missingDocs}</strong></p><a class="button-link" href="student.html?id=${s.id}">Open</a></article>`;
  }).join('');
  qs('#studentsGrid').innerHTML = cards || '<p>No students yet.</p>';
  qs('#studentSearch')?.addEventListener('input', renderStudentCards, { once: true });
}

function nextStudentId() {
  const max = allStudents().reduce((m, s) => Math.max(m, Number(s.id.replace('STU', '')) || 0), 0);
  return `STU${String(max + 1).padStart(3, '0')}`;
}

function initStudent() {
  mountNav('students');
  const id = new URLSearchParams(location.search).get('id');
  const stu = id && detail(id);
  if (!stu) return (qs('#studentRoot').innerHTML = '<article class="card">Student not found.</article>');
  qs('#studentTitle').textContent = `${stu.name} (${stu.id})`;

  qsa('[data-student]').forEach((i) => { i.value = i.dataset.student.split('.').reduce((a, k) => a?.[k], stu) || ''; });

  qs('#saveProfile').onclick = () => {
    const email = qs('[data-student="email"]').value.trim();
    if (!isValidEmail(email)) return alert('Invalid email.');
    stu.name = qs('[data-student="name"]').value.trim();
    stu.email = email;
    stu.phone = qs('[data-student="phone"]').value.trim();
    stu.emergencyContact.name = qs('[data-student="emergencyContact.name"]').value.trim();
    stu.emergencyContact.phone = qs('[data-student="emergencyContact.phone"]').value.trim();
    stu.emergencyContact.relation = qs('[data-student="emergencyContact.relation"]').value.trim();
    stu.notes = qs('[data-student="notes"]').value.trim();
    stu.updatedAt = new Date().toISOString();
    const idx = state.draft.studentsIndex.students.findIndex((s) => s.id === stu.id);
    state.draft.studentsIndex.students[idx] = { id: stu.id, name: stu.name, email: stu.email };
    refreshStudentsIndex();
    markChanged(`data/students/${stu.id}.json`, stu);
    alert('Saved profile.');
  };

  renderDocs(stu);
  renderApps(stu);
}

function renderDocs(stu) {
  const cfg = state.draft.config || DEFAULT_CONFIG;
  qs('#docsList').innerHTML = cfg.requiredDocuments.map((d) => {
    const item = stu.documents[d.key] || { status: 'missing', path: '' };
    return `<div class="card rowline"><div><strong>${d.label}</strong><div class="muted small">${item.path || 'No file linked'}</div></div><div>${docBadge(item.status)}</div><select data-doc-status="${d.key}">${DOC_STATUSES.map((s) => `<option ${s === item.status ? 'selected' : ''}>${s}</option>`)}</select><input type="file" data-doc-file="${d.key}" accept="application/pdf" /></div>`;
  }).join('');
  qs('#saveDocs').onclick = () => {
    qsa('[data-doc-status]').forEach((s) => {
      const key = s.dataset.docStatus;
      if (!stu.documents[key]) stu.documents[key] = { status: 'missing', path: '' };
      stu.documents[key].status = s.value;
    });
    qsa('[data-doc-file]').forEach((f) => {
      const key = f.dataset.docFile;
      const file = f.files[0];
      if (file) {
        const path = `docs/uploads/${stu.id}/${key}.pdf`;
        stu.documents[key] = { status: 'uploaded', path };
        state.pendingUploads.push({ path, file });
      }
    });
    stu.updatedAt = new Date().toISOString();
    markChanged(`data/students/${stu.id}.json`, stu);
    renderDocs(stu);
  };
}

function renderApps(stu) {
  const cfg = state.draft.config || DEFAULT_CONFIG;
  qs('#appStatus').innerHTML = cfg.applicationStatuses.map((s) => `<option>${s}</option>`).join('');
  qs('#portalName').innerHTML = cfg.portals.map((s) => `<option>${s}</option>`).join('');

  qs('#appsTable').innerHTML = (stu.applications || []).map((a) => {
    const left = daysLeft(a.deadline);
    return `<tr><td>${a.appId}</td><td>${escapeHtml(a.uniName)}</td><td>${escapeHtml(a.programName)}</td><td>${statusBadge(a.status)}</td><td>${formatDate(a.deadline)} ${left !== null ? `(${left}d)` : ''}</td><td><button data-del="${a.appId}" class="danger">Delete</button></td></tr>`;
  }).join('') || '<tr><td colspan="6">No applications yet.</td></tr>';

  qsa('[data-del]').forEach((b) => b.onclick = () => {
    stu.applications = stu.applications.filter((a) => a.appId !== b.dataset.del);
    stu.updatedAt = new Date().toISOString();
    markChanged(`data/students/${stu.id}.json`, stu);
    renderApps(stu);
  });

  qs('#saveApp').onclick = () => {
    const app = {
      appId: `APP-${Date.now().toString().slice(-6)}`,
      studentId: stu.id,
      uniName: qs('#uniName').value.trim(),
      programName: qs('#programName').value.trim(),
      portalName: qs('#portalName').value,
      portalUrl: qs('#portalUrl').value.trim(),
      emailUsed: qs('#emailUsed').value.trim(),
      applicationAccountId: qs('#applicationAccountId').value.trim(),
      uniAssistId: qs('#uniAssistId').value.trim(),
      deadline: qs('#deadline').value,
      submissionDate: qs('#submissionDate').value,
      status: qs('#appStatus').value,
      priority: qs('#priority').value,
      country: qs('#country').value.trim(),
      city: qs('#city').value.trim(),
      feeEUR: qs('#feeEUR').value.trim(),
      requirementsNotes: qs('#requirementsNotes').value.trim(),
      lastUpdated: new Date().toISOString()
    };
    const errors = validateApplication(app, cfg);
    if (!isValidEmail(app.emailUsed)) errors.push('Application email is invalid.');
    if (app.submissionDate && !isIsoDate(app.submissionDate)) errors.push('Submission date must be yyyy-mm-dd.');
    if (errors.length) return alert(errors.join('\n'));
    stu.applications.push(app);
    stu.updatedAt = new Date().toISOString();
    markChanged(`data/students/${stu.id}.json`, stu);
    renderApps(stu);
  };
}

function initApplications() {
  mountNav('applications');
  const apps = allApps().sort((a, b) => a.deadline.localeCompare(b.deadline));
  qs('#allApps').innerHTML = apps.map((a) => `<tr><td><a href="student.html?id=${a.studentId}">${a.studentId}</a></td><td>${escapeHtml(a.uniName)}</td><td>${escapeHtml(a.programName)}</td><td>${statusBadge(a.status)}</td><td>${formatDate(a.deadline)}</td></tr>`).join('');
}

function initSettings() {
  mountNav('settings');
  const s = getSettings();
  qsa('[data-setting]').forEach((i) => i.value = s[i.dataset.setting] || '');
  qs('#configEditor').value = JSON.stringify(state.draft.config || DEFAULT_CONFIG, null, 2);

  qs('#saveSettings').onclick = () => {
    const next = {};
    qsa('[data-setting]').forEach((i) => next[i.dataset.setting] = i.value.trim());
    setSettings(next);
    try {
      state.draft.config = JSON.parse(qs('#configEditor').value);
      markChanged('data/config.json', state.draft.config);
    } catch {
      return alert('Config JSON is invalid.');
    }
    alert('Settings saved.');
  };

  qs('#downloadBundle').onclick = () => createBundle(state);
  qs('#resetRepo').onclick = () => { clearDraft(); location.reload(); };
  qs('#commitGithub').onclick = async () => {
    try {
      await commitViaGitHub(state, 'Update portal data');
      alert('Committed to GitHub successfully.');
    } catch (e) {
      alert(e.message);
    }
  };

  qs('#changedFiles').textContent = listChangedFiles(state).join('\n') || 'No JSON changes yet.';
}

boot();
