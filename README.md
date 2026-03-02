# Student Applications Portal (Static, GitHub Pages)

A no-framework static web portal to manage student profiles, required documents, and university applications.

## Structure

- `docs/` → GitHub Pages web root
  - `index.html`, `students.html`, `student.html`, `applications.html`, `settings.html`
  - `assets/` modular JS + CSS
  - `data/` mirrored JSON for runtime reads on Pages
  - `uploads/` PDFs (organized per student)
- `data/` → canonical repo data (repo-as-backend)
  - `config.json`
  - `students.json`
  - `students/STU001.json`, `students/STU002.json`

## Enable GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** = `Deploy from branch`.
4. Set **Branch** = `main` (or default) and **Folder** = `/docs`.
5. Open the deployed URL.

## Offline bundle workflow (default)

1. Edit data from the portal (students, docs, apps).
2. Go to **Settings**.
3. Click **Download Update Bundle**.
4. Extract ZIP into repo root and commit included changed JSON + PDFs.
5. Push to GitHub.

Bundle includes:
- changed JSON files (`data/...`)
- selected PDF uploads (`docs/uploads/...`)
- `COMMIT_INSTRUCTIONS.txt`

## Optional direct GitHub API commit mode

1. Create a fine-grained PAT with repository **Contents: Read and write**.
2. In **Settings**, provide owner/repo/branch/token.
3. Click **Commit via GitHub API**.

Security notes:
- Token is kept in browser localStorage.
- Use least privilege + revoke token if compromised.

## Features

- CRUD students (`STU###` auto-id)
- Edit student profile + emergency contact
- Required docs checklist with status + PDF file attach
- Per-student application CRUD and status tracking
- Dashboard KPIs (students, applications, upcoming deadlines, missing docs)
- Deadline countdowns and status badges
- Validation (email, ISO dates, allowed statuses)
- Draft persistence in localStorage + “Reset to repo version”
- Change tracker with unsaved file count
