import { SEED_DATA, DEFAULT_CONFIG } from './schema.js';

const STORAGE_KEY = 'admissions_dashboard_v1';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return clone(SEED_DATA);
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return clone(SEED_DATA);
  }
}

function saveAll(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getStudents() {
  return loadAll().students || [];
}

export function getStudentById(id) {
  return getStudents().find((student) => student.id === id) || null;
}

export function saveStudent(updated) {
  const state = loadAll();
  const index = state.students.findIndex((s) => s.id === updated.id);
  if (index >= 0) state.students[index] = updated;
  else state.students.push(updated);
  saveAll(state);
}

export function getApplications(studentId = null) {
  const apps = loadAll().applications || [];
  return studentId ? apps.filter((app) => app.studentId === studentId) : apps;
}

export function upsertApplication(app) {
  const state = loadAll();
  const index = state.applications.findIndex((a) => a.id === app.id);
  if (index >= 0) state.applications[index] = app;
  else state.applications.push(app);
  saveAll(state);
}

export function deleteApplication(appId) {
  const state = loadAll();
  state.applications = state.applications.filter((app) => app.id !== appId);
  saveAll(state);
}

export function getDocuments(studentId) {
  const docs = loadAll().documents || {};
  return docs[studentId] || [];
}

export function setDocuments(studentId, list) {
  const state = loadAll();
  if (!state.documents) state.documents = {};
  state.documents[studentId] = list;
  saveAll(state);
}

export function getSettings() {
  const state = loadAll();
  return state.settings || clone(DEFAULT_CONFIG);
}

export function setSettings(settings) {
  const state = loadAll();
  state.settings = settings;
  saveAll(state);
}

export function dashboardKpis() {
  const state = loadAll();
  const students = state.students || [];
  const applications = state.applications || [];
  const submitted = applications.filter((a) => a.status === 'Submitted').length;
  const dueSoon = applications.filter((a) => {
    if (!a.deadline) return false;
    const delta = (new Date(a.deadline) - new Date()) / (1000 * 60 * 60 * 24);
    return delta >= 0 && delta <= 30;
  }).length;
  return {
    students: students.length,
    applications: applications.length,
    submitted,
    dueSoon
  };
}

export function nextId(prefix, items) {
  const max = items.reduce((acc, item) => {
    const value = Number(String(item.id || '').replace(prefix, ''));
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}
