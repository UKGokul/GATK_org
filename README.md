# GATK_org

This repository hosts a static, GitHub Pages-friendly web app for managing student artifacts and generating offline bundles.

## 1) Hosting path and GitHub Pages setup

### Chosen hosting path: `/docs`

This project uses **`/docs`** as the publish source for GitHub Pages.

Why `/docs`:
- Keeps app assets in-repo and versioned with source data.
- Works natively with GitHub Pages “Deploy from a branch” mode.
- Avoids requiring a dedicated `gh-pages` branch.

### GitHub Pages setup steps

1. Push this repository to GitHub.
2. Ensure your built/static site files are in `/docs` (for example `docs/index.html`, `docs/assets/...`).
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (or your default branch)
   - **Folder**: `/docs`
5. Save the settings and wait for Pages deployment.
6. Open the published URL shown in Pages settings and verify navigation/routes load correctly.

> If you later prefer `/web`, you must update Pages to that folder and ensure all relative asset paths still resolve.

---

## 2) Data layout overview

Use the following layout to separate authoritative data from web-facing upload assets:

```text
/
├─ data/                 # canonical data (JSON/CSV/source records)
│  ├─ students/
│  ├─ classes/
│  └─ exports/
└─ docs/                 # GitHub Pages publish root
   ├─ index.html
   ├─ assets/
   ├─ uploads/           # user-provided files intended for web access
   │  ├─ students/
   │  └─ bundles/
   └─ data/              # optional mirrored/read-only data snapshots for frontend
```

Guidance:
- Keep **system-of-record data** in `/data`.
- Keep browser-consumable/public files in `/docs/uploads`.
- If the frontend needs static snapshots, write derived artifacts into `/docs/data` (do not hand-edit them).

---

## 3) Offline bundle workflow

Use this flow when internet/API access is unavailable or when exchanging bundles manually.

1. **Select files**
   - From the app, choose student/class files or export targets to include.
   - Confirm filenames and folder structure before packaging.

2. **Download ZIP**
   - Generate and download the offline bundle ZIP from the app.
   - Keep the ZIP unchanged to preserve checksums/metadata.

3. **Apply files in repo**
   - Extract ZIP locally.
   - Copy files into their target repository paths (typically `/data` and/or `/docs/uploads`).
   - Review diffs to ensure only intended files changed.

4. **Commit/push**
   - `git add` updated paths.
   - Commit with a clear message (example: `Apply offline bundle for 2026-03-02 student updates`).
   - Push and verify GitHub Pages reflects any `/docs` changes.

Recommended verification before push:
- Open key pages locally (or via Pages preview) and confirm data renders.
- Spot-check one or two updated student records end-to-end.

---

## 4) Optional GitHub API mode setup

API mode is optional; static/offline workflow works without it.

### Fine-grained PAT requirements

Create a **fine-grained Personal Access Token (PAT)** scoped to this repository only.

Minimum permissions (Repository permissions):
- **Contents: Read and write** (required to read/update files)
- **Metadata: Read-only** (typically implicit/default)

If your workflow opens pull requests via API, also add:
- **Pull requests: Read and write**

### Token storage behavior

In API mode, the app stores the token in browser **`localStorage`** for the current origin.

Implications:
- Token persists across page reloads and browser restarts.
- Token is accessible to scripts running on the same origin.
- Clearing site storage/logging out browser profile removes local copy.

### Security cautions and revocation guidance

- Prefer short-lived, least-privilege fine-grained tokens.
- Do not paste tokens into issue comments, commits, or screenshots.
- Avoid API mode on shared/public computers.
- Revoke immediately if exposure is suspected:
  1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
  2. Select token → **Revoke**
  3. Create a new token if needed and update local storage value in app settings.

---

## 5) Navigation and basic usage

## Dashboard
- Purpose: high-level status and quick actions.
- Typical actions:
  - View summary counts (students, pending uploads, recent updates).
  - Jump to Students or Settings.
  - Start offline bundle generation.

## Students
- Purpose: browse/search student list.
- Typical actions:
  - Filter/search by name, class, or status.
  - Open a specific student detail page.
  - Initiate bulk selection for export/bundle inclusion.

## Student detail
- Purpose: manage an individual student record and related files.
- Typical actions:
  - View profile and attached artifacts.
  - Upload/replace files destined for `/docs/uploads/students/...`.
  - Review history/notes (if enabled by app build).

## Settings
- Purpose: environment and integration configuration.
- Typical actions:
  - Configure repository path assumptions (`/data`, `/docs/uploads`).
  - Enable/disable GitHub API mode.
  - Enter/remove PAT token and test connectivity.
  - Run maintenance actions (clear local cache/storage, validate config).

---

## Quick start checklist

1. Configure GitHub Pages to publish from `/docs`.
2. Verify `/data` and `/docs/uploads` structure exists.
3. Test navigation: Dashboard → Students → Student detail → Settings.
4. (Optional) Enable API mode with fine-grained PAT.
5. Perform one offline bundle round-trip and commit the result.
