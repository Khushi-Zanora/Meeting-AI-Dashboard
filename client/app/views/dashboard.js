import { apiFetch } from '../../shared/api.js';

export const renderDashboard = async (el) => {
  try {
    const [meetingsRes, tasksRes] = await Promise.all([
      apiFetch('/meetings'),
      apiFetch('/tasks')
    ]);

    if (!meetingsRes.ok || !tasksRes.ok) throw new Error('Failed to load dashboard data');

    const { meetings } = await meetingsRes.json();
    const tasks = await tasksRes.json();

    const pending = tasks.filter((t) => t.status === 'pending').length;
    const done = tasks.filter((t) => t.status === 'done').length;

    el.innerHTML = `
      <h2 class="section-title">Dashboard</h2>
      <div class="stat-grid">
        <div class="stat-card"><span class="stat-label">Total meetings</span><span class="stat-value">${meetings.length}</span></div>
        <div class="stat-card"><span class="stat-label">Pending tasks</span><span class="stat-value">${pending}</span></div>
        <div class="stat-card"><span class="stat-label">Completed tasks</span><span class="stat-value">${done}</span></div>
        <div class="stat-card"><span class="stat-label">Total tasks</span><span class="stat-value">${tasks.length}</span></div>
      </div>
      <h3 class="section-title">Recent meetings</h3>
      <div id="recentMeetings"></div>
    `;

    const recentContainer = el.querySelector('#recentMeetings');

    if (meetings.length === 0) {
      recentContainer.innerHTML = '<p class="empty-state">No meetings yet. Upload your first one to get started.</p>';
      return;
    }

    recentContainer.innerHTML = meetings.slice(0, 5).map((m) => `
      <div class="list-card">
        <div class="list-card-title">${escapeHtml(m.title || m.meeting_code)}</div>
        <div class="list-card-meta">${m.meeting_code} · ${new Date(m.created_at).toLocaleDateString()}</div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    el.innerHTML = '<p class="empty-state">Could not load dashboard data.</p>';
  }
};

// Prevents a meeting title like <script>...</script> from ever executing —
// necessary anywhere user-provided text gets inserted via innerHTML
const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};