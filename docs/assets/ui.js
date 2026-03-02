export function mountNav(activePage) {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;
  const links = [
    { href: 'index.html', label: 'Dashboard', key: 'index' },
    { href: 'students.html', label: 'Students', key: 'students' },
    { href: 'settings.html', label: 'Settings', key: 'settings' }
  ];

  nav.innerHTML = `
    <div class="container">
      <a class="brand" href="index.html">Admissions Tracker</a>
      <div class="nav-links">
        ${links
          .map((link) => `<a class="nav-link ${activePage === link.key ? 'active' : ''}" href="${link.href}">${link.label}</a>`)
          .join('')}
      </div>
    </div>
  `;
}

export function statusBadge(status) {
  const normalized = String(status || '').toLowerCase();
  const cls = normalized === 'submitted' ? 'success' : normalized === 'in progress' ? 'warn' : normalized === 'rejected' ? 'danger' : '';
  return `<span class="badge ${cls}">${status || 'Unknown'}</span>`;
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}
