import { initAuth, getCurrentUser, clearAuth } from '../shared/auth.js';
import { apiFetch } from '../shared/api.js';
import { renderDashboard } from './views/dashboard.js';
import { renderMeetings } from './views/meetings.js';
import { renderNewMeeting } from './views/newMeeting.js';
import { renderMeetingDetail } from './views/meetingDetail.js';
import { renderTasks } from './views/tasks.js';
import { renderNotes } from './views/notes.js';

const viewContent = document.getElementById('viewContent');
const userNameEl = document.getElementById('userName');
const navLinks = document.querySelectorAll('.top-nav a');

const routes = [
  { pattern: /^\/app\/dashboard$/, render: renderDashboard },
  { pattern: /^\/app\/meetings\/new$/, render: renderNewMeeting },
  { pattern: /^\/app\/meetings$/, render: renderMeetings },
  { pattern: /^\/app\/meetings\/(\d+)$/, render: (el, match) => renderMeetingDetail(el, match[1]) },
  { pattern: /^\/app\/tasks$/, render: renderTasks },
  { pattern: /^\/app\/notes$/, render: renderNotes }
];

const matchRoute = (path) => {
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) return { render: route.render, match };
  }
  return null;
};

const renderCurrentRoute = () => {
  const path = window.location.pathname;
  const matched = matchRoute(path);

  navLinks.forEach((link) => {
    link.classList.toggle('active', path.startsWith(link.getAttribute('href')));
  });

  if (!matched) {
    viewContent.innerHTML = '<p class="empty-state">Page not found.</p>';
    return;
  }

  viewContent.innerHTML = '<p class="loading-state">Loading...</p>';
  matched.render(viewContent, matched.match);
};

export const navigate = (path) => {
  window.history.pushState({}, '', path);
  renderCurrentRoute();
};

// Intercept clicks on internal nav links so navigation doesn't trigger a full reload
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-link]');
  if (!link) return;
  e.preventDefault();
  navigate(link.getAttribute('href'));
});

// Handle the browser's own back/forward buttons
window.addEventListener('popstate', renderCurrentRoute);

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await apiFetch('/auth/logout', { method: 'POST' });
  clearAuth();
  window.location.href = '/public/landing.html';
});

const bootstrap = async () => {
  const ok = await initAuth();
  if (!ok) {
    window.location.href = '/public/login.html';
    return;
  }

  const user = getCurrentUser();
  if (user) userNameEl.textContent = user.name;

  if (window.location.pathname === '/app' || window.location.pathname === '/app/') {
    navigate('/app/dashboard');
  } else {
    renderCurrentRoute();
  }
};

bootstrap();