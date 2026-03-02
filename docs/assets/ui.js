export function qs(sel, scope = document) {
  return scope.querySelector(sel);
}

export function qsa(sel, scope = document) {
  return [...scope.querySelectorAll(sel)];
}

export function mountNav(activePage) {
  const nav = qs('[data-nav]');
  if (!nav) return;
  const links = [
    ['index.html', 'Dashboard', 'dashboard'],
    ['students.html', 'Students', 'students'],
    ['applications.html', 'Applications', 'applications'],
    ['settings.html', 'Settings', 'settings']
  ];
  nav.innerHTML = `
    <div class="container nav-inner">
      <a class="brand" href="index.html">Student Portal</a>
      <nav class="nav-links" aria-label="Main navigation">
        ${links.map(([href, label, key]) => `<a class="nav-link ${activePage === key ? 'active' : ''}" href="${href}">${label}</a>`).join('')}
      </nav>
    </div>`;
}

export function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  const cls = s.includes('offer') ? 'success' : s.includes('rejected') || s.includes('withdrawn') ? 'danger' : s.includes('submitted') ? 'info' : 'warn';
  return `<span class="badge ${cls}">${status || 'Unknown'}</span>`;
}

export function docBadge(status) {
  const cls = status === 'uploaded' ? 'success' : status === 'outdated' ? 'warn' : 'danger';
  return `<span class="badge ${cls}">${status}</span>`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
}

export function daysLeft(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const due = new Date(`${dateStr}T23:59:59`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due - now) / 86400000);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
