/*
 * StorageService provides local JSON loading, in-browser draft tracking,
 * offline bundle generation, and optional GitHub Contents API publishing.
 */

const DEFAULT_AUTOSAVE_KEY = 'json_editor_draft_v1';

function toRepoRelativePath(path) {
  return path.replace(/^\/+/, '');
}

function toDataUrl(path) {
  const repoPath = toRepoRelativePath(path);
  return repoPath.startsWith('data/') ? `/${repoPath}` : `/data/${repoPath}`;
}

function sanitizeBranch(branch) {
  return (branch || 'main').trim();
}

function toGitHubContentsPath(path) {
  return toRepoRelativePath(path).split('/').map(encodeURIComponent).join('/');
}

function encodeBase64String(content) {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(content)));
  }
  return Buffer.from(content, 'utf8').toString('base64');
}

function decodeBase64ToString(content) {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(content)));
  }
  return Buffer.from(content, 'base64').toString('utf8');
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class StorageService {
  constructor(options = {}) {
    this.autosaveKey = options.autosaveKey || DEFAULT_AUTOSAVE_KEY;
    this.storage = options.storage || window.localStorage;
    this.githubSettings = {
      owner: '',
      repo: '',
      branch: 'main',
      token: '',
      ...(options.githubSettings || {})
    };

    this.loadedJson = new Map();
    this.modifiedJson = new Map();
    this.queuedPdfs = new Map();

    this.restoreDraft();
  }

  setGitHubSettings(settings = {}) {
    this.githubSettings = {
      ...this.githubSettings,
      ...settings,
      branch: sanitizeBranch(settings.branch || this.githubSettings.branch)
    };
  }

  getGitHubSettings() {
    return { ...this.githubSettings };
  }

  async loadJson(path) {
    const repoPath = toRepoRelativePath(path);
    const response = await fetch(toDataUrl(repoPath), {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${repoPath} (${response.status})`);
    }

    const parsed = await response.json();
    this.loadedJson.set(repoPath, parsed);

    // If a draft exists, preserve it as the current modified value.
    if (!this.modifiedJson.has(repoPath)) {
      this.modifiedJson.set(repoPath, {
        original: structuredClone(parsed),
        current: structuredClone(parsed)
      });
    } else {
      const current = this.modifiedJson.get(repoPath).current;
      this.modifiedJson.set(repoPath, {
        original: structuredClone(parsed),
        current
      });
    }

    this.persistDraft();
    return this.getJson(repoPath);
  }

  getJson(path) {
    const repoPath = toRepoRelativePath(path);
    const state = this.modifiedJson.get(repoPath);
    return state ? structuredClone(state.current) : null;
  }

  markJsonChanged(path, value) {
    const repoPath = toRepoRelativePath(path);
    const currentState = this.modifiedJson.get(repoPath);
    const original = currentState
      ? currentState.original
      : structuredClone(this.loadedJson.get(repoPath) || {});

    this.modifiedJson.set(repoPath, {
      original: structuredClone(original),
      current: structuredClone(value)
    });

    this.persistDraft();
  }

  async queuePdf(path, fileOrBase64, options = {}) {
    const repoPath = toRepoRelativePath(path);
    if (!repoPath.startsWith('docs/STU')) {
      throw new Error('PDF paths must be repo-relative docs/STU###/...');
    }

    let base64;
    let fileName = options.fileName || repoPath.split('/').pop() || 'document.pdf';

    if (typeof fileOrBase64 === 'string') {
      base64 = fileOrBase64;
    } else if (fileOrBase64 instanceof File) {
      fileName = fileOrBase64.name || fileName;
      base64 = await fileToBase64(fileOrBase64);
    } else {
      throw new Error('queuePdf expects a File or base64 string');
    }

    this.queuedPdfs.set(repoPath, {
      fileName,
      mimeType: 'application/pdf',
      base64,
      updatedAt: new Date().toISOString()
    });

    this.persistDraft();
  }

  removeQueuedPdf(path) {
    this.queuedPdfs.delete(toRepoRelativePath(path));
    this.persistDraft();
  }

  getChangedJsonPaths() {
    return [...this.modifiedJson.entries()]
      .filter(([, v]) => JSON.stringify(v.original) !== JSON.stringify(v.current))
      .map(([path]) => path);
  }

  getQueuedPdfPaths() {
    return [...this.queuedPdfs.keys()];
  }

  getChangeSummary() {
    return {
      changedJson: this.getChangedJsonPaths(),
      queuedPdfs: this.getQueuedPdfPaths()
    };
  }

  resetToRepoVersion() {
    this.modifiedJson = new Map(
      [...this.loadedJson.entries()].map(([path, value]) => [
        path,
        {
          original: structuredClone(value),
          current: structuredClone(value)
        }
      ])
    );
    this.queuedPdfs.clear();
    this.clearDraft();
  }

  persistDraft() {
    const draft = {
      json: [...this.modifiedJson.entries()].map(([path, v]) => ({
        path,
        original: v.original,
        current: v.current
      })),
      queuedPdfs: [...this.queuedPdfs.entries()].map(([path, pdf]) => ({
        path,
        ...pdf
      })),
      updatedAt: new Date().toISOString()
    };

    this.storage.setItem(this.autosaveKey, JSON.stringify(draft));
  }

  restoreDraft() {
    const raw = this.storage.getItem(this.autosaveKey);
    if (!raw) {
      return;
    }

    try {
      const draft = JSON.parse(raw);
      this.modifiedJson = new Map(
        (draft.json || []).map((entry) => [entry.path, {
          original: entry.original,
          current: entry.current
        }])
      );
      this.queuedPdfs = new Map(
        (draft.queuedPdfs || []).map((entry) => [entry.path, {
          fileName: entry.fileName,
          mimeType: entry.mimeType || 'application/pdf',
          base64: entry.base64,
          updatedAt: entry.updatedAt
        }])
      );
    } catch {
      this.clearDraft();
    }
  }

  clearDraft() {
    this.storage.removeItem(this.autosaveKey);
  }

  getCommitUiState() {
    const hasToken = Boolean((this.githubSettings.token || '').trim());
    return {
      canCommitToGitHub: hasToken,
      commitButtonHidden: !hasToken,
      offlineHintVisible: !hasToken
    };
  }

  applyCommitUiState(commitButton, offlineHintElement) {
    const ui = this.getCommitUiState();
    if (commitButton) {
      commitButton.disabled = !ui.canCommitToGitHub;
      commitButton.hidden = ui.commitButtonHidden;
    }
    if (offlineHintElement) {
      offlineHintElement.hidden = !ui.offlineHintVisible;
    }
    return ui;
  }

  async buildOfflineBundle({ selectedPdfPaths = null, zipFactory = null } = {}) {
    const JSZipRef = zipFactory || globalThis.JSZip;
    if (!JSZipRef) {
      throw new Error('JSZip is required to build offline bundles');
    }

    const changedJson = this.getChangedJsonPaths();
    const selectedPaths = selectedPdfPaths
      ? selectedPdfPaths.map((p) => toRepoRelativePath(p))
      : this.getQueuedPdfPaths();

    const zip = new JSZipRef();
    const filesToCommit = [];

    changedJson.forEach((path) => {
      const payload = this.modifiedJson.get(path).current;
      zip.file(path, `${JSON.stringify(payload, null, 2)}\n`);
      filesToCommit.push(path);
    });

    selectedPaths.forEach((path) => {
      const pdf = this.queuedPdfs.get(path);
      if (!pdf) {
        return;
      }
      zip.file(path, pdf.base64, { base64: true });
      filesToCommit.push(path);
    });

    const suggestedMessage = this.suggestCommitMessage(filesToCommit);
    const instructions = [
      'Offline bundle generated by StorageService',
      '',
      'Files to add/replace:',
      ...filesToCommit.map((f) => `- ${f}`),
      '',
      `Suggested commit message: ${suggestedMessage}`
    ].join('\n');

    zip.file('COMMIT_INSTRUCTIONS.txt', `${instructions}\n`);

    const blob = await zip.generateAsync({ type: 'blob' });
    return {
      blob,
      filesToCommit,
      suggestedMessage
    };
  }

  suggestCommitMessage(filesToCommit = []) {
    const jsonCount = filesToCommit.filter((p) => p.startsWith('data/')).length;
    const pdfCount = filesToCommit.filter((p) => p.startsWith('docs/')).length;

    if (jsonCount && pdfCount) {
      return `Update ${jsonCount} JSON file(s) and ${pdfCount} PDF document(s)`;
    }
    if (jsonCount) {
      return `Update ${jsonCount} JSON data file(s)`;
    }
    if (pdfCount) {
      return `Update ${pdfCount} PDF document(s)`;
    }
    return 'Update repository content';
  }

  async commitViaGitHub({ message, committer } = {}) {
    const { owner, repo, token } = this.githubSettings;
    const branch = sanitizeBranch(this.githubSettings.branch);

    if (!owner || !repo) {
      throw new Error('GitHub owner/repo settings are required');
    }
    if (!token) {
      throw new Error('GitHub token is required. Use offline bundle workflow instead.');
    }

    const changedFiles = [];

    for (const path of this.getChangedJsonPaths()) {
      const content = `${JSON.stringify(this.modifiedJson.get(path).current, null, 2)}\n`;
      const result = await this.putGitHubContent({
        owner,
        repo,
        branch,
        token,
        path,
        contentBase64: encodeBase64String(content),
        message: message || `Update ${path}`,
        committer
      });
      changedFiles.push(result.path);
    }

    for (const path of this.getQueuedPdfPaths()) {
      const pdf = this.queuedPdfs.get(path);
      const result = await this.putGitHubContent({
        owner,
        repo,
        branch,
        token,
        path,
        contentBase64: pdf.base64,
        message: message || `Update ${path}`,
        committer
      });
      changedFiles.push(result.path);
    }

    return changedFiles;
  }

  async putGitHubContent({ owner, repo, branch, token, path, contentBase64, message, committer }) {
    const apiPath = `https://api.github.com/repos/${owner}/${repo}/contents/${toGitHubContentsPath(path)}`;
    const existing = await this.fetchGitHubContentMetadata({ owner, repo, branch, token, path });

    const payload = {
      message,
      branch,
      content: contentBase64
    };

    if (existing?.sha) {
      payload.sha = existing.sha;
    }

    if (committer) {
      payload.committer = committer;
    }

    const response = await fetch(apiPath, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`GitHub PUT failed for ${path}: ${response.status} ${details}`);
    }

    const result = await response.json();
    return {
      path,
      commitSha: result.commit?.sha,
      contentSha: result.content?.sha
    };
  }

  async fetchGitHubContentMetadata({ owner, repo, branch, token, path }) {
    const apiPath = `https://api.github.com/repos/${owner}/${repo}/contents/${toGitHubContentsPath(path)}?ref=${encodeURIComponent(branch)}`;
    const response = await fetch(apiPath, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`GitHub metadata request failed for ${path}: ${response.status} ${details}`);
    }

    const body = await response.json();
    return {
      sha: body.sha,
      encoding: body.encoding,
      content: body.content ? decodeBase64ToString(body.content) : null
    };
  }
}

export default StorageService;
