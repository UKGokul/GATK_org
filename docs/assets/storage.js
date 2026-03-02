import { DEFAULT_CONFIG, DEFAULT_REPO_SETTINGS } from './schema.js';

const DRAFT_KEY = 'portal_repo_draft_v1';
const SETTINGS_KEY = 'portal_repo_settings_v1';

function clone(v) { return JSON.parse(JSON.stringify(v)); }

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} (${res.status})`);
  return res.json();
}

export async function loadRepoData() {
  const config = await fetchJson('./data/config.json').catch(() => fetchJson('../data/config.json')).catch(() => clone(DEFAULT_CONFIG));
  const studentsIndex = await fetchJson('./data/students.json').catch(() => fetchJson('../data/students.json')).catch(() => ({ students: [], updatedAt: new Date().toISOString() }));
  const details = {};
  await Promise.all(studentsIndex.students.map(async (s) => {
    details[s.id] = await fetchJson(`./data/students/${s.id}.json`).catch(() => fetchJson(`../data/students/${s.id}.json`));
  }));
  return { config, studentsIndex, details };
}

export function getSettings() {
  return { ...DEFAULT_REPO_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) };
}

export function setSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function saveDraft(state) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
}

export function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function listChangedFiles(state) {
  return Object.keys(state.changedFiles || {});
}

export async function createBundle(state) {
  const files = [];
  Object.entries(state.changedFiles || {}).forEach(([path, content]) => files.push({ path, content: JSON.stringify(content, null, 2) }));
  (state.pendingUploads || []).forEach((u) => files.push({ path: u.path, blob: u.file }));
  files.push({
    path: 'COMMIT_INSTRUCTIONS.txt',
    content: [
      'Apply these files at repository root, then commit.',
      '',
      ...files.map((f) => `- ${f.path}`),
      '',
      `Suggested commit: Update ${Object.keys(state.changedFiles || {}).length} JSON files and ${state.pendingUploads?.length || 0} PDFs`
    ].join('\n')
  });

  const zipBlob = await makeZip(files);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlob);
  a.download = `update-bundle-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.zip`;
  a.click();
}

async function makeZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = file.blob ? new Uint8Array(await file.blob.arrayBuffer()) : encoder.encode(file.content || '');
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + name.length);
    const dv = new DataView(localHeader.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(8, 0, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, data.length, true); dv.setUint32(22, data.length, true);
    dv.setUint16(26, name.length, true);
    localHeader.set(name, 30);
    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + name.length);
    const cdv = new DataView(centralHeader.buffer);
    cdv.setUint32(0, 0x02014b50, true); cdv.setUint16(4, 20, true); cdv.setUint16(6, 20, true);
    cdv.setUint32(16, crc, true); cdv.setUint32(20, data.length, true); cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, name.length, true); cdv.setUint32(42, offset, true);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((n, b) => n + b.length, 0);
  const end = new Uint8Array(22);
  const edv = new DataView(end.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, files.length, true); edv.setUint16(10, files.length, true);
  edv.setUint32(12, centralSize, true); edv.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export async function commitViaGitHub(state, message = 'Update portal data') {
  const s = getSettings();
  if (!s.owner || !s.repo || !s.token) throw new Error('Missing owner/repo/token.');
  const branch = s.branch || 'main';
  const headers = { Authorization: `token ${s.token}`, Accept: 'application/vnd.github+json' };

  const putFile = async (path, contentBase64) => {
    const url = `https://api.github.com/repos/${s.owner}/${s.repo}/contents/${path}`;
    let sha;
    const existing = await fetch(`${url}?ref=${branch}`, { headers });
    if (existing.ok) sha = (await existing.json()).sha;
    const body = { message, content: contentBase64, branch, ...(sha ? { sha } : {}) };
    const res = await fetch(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`GitHub commit failed for ${path}`);
  };

  for (const [path, content] of Object.entries(state.changedFiles || {})) {
    await putFile(path, btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))));
  }
  for (const upload of (state.pendingUploads || [])) {
    const ab = await upload.file.arrayBuffer();
    const bin = String.fromCharCode(...new Uint8Array(ab));
    await putFile(upload.path, btoa(bin));
  }
}
