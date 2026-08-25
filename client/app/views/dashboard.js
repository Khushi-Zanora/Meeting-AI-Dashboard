// import { apiFetch } from '../../shared/api.js';

// export const renderDashboard = async (el) => {
//   try {
//     const [meetingsRes, tasksRes] = await Promise.all([
//       apiFetch('/meetings'),
//       apiFetch('/tasks')
//     ]);

//     if (!meetingsRes.ok || !tasksRes.ok) throw new Error('Failed to load dashboard data');

//     const { meetings } = await meetingsRes.json();
//     const tasks = await tasksRes.json();

//     const pending = tasks.filter((t) => t.status === 'pending').length;
//     const done = tasks.filter((t) => t.status === 'done').length;

//     el.innerHTML = `
//       <h2 class="section-title">Dashboard</h2>
//       <div class="stat-grid">
//         <div class="stat-card"><span class="stat-label">Total meetings</span><span class="stat-value">${meetings.length}</span></div>
//         <div class="stat-card"><span class="stat-label">Pending tasks</span><span class="stat-value">${pending}</span></div>
//         <div class="stat-card"><span class="stat-label">Completed tasks</span><span class="stat-value">${done}</span></div>
//         <div class="stat-card"><span class="stat-label">Total tasks</span><span class="stat-value">${tasks.length}</span></div>
//       </div>
//       <h3 class="section-title">Recent meetings</h3>
//       <div id="recentMeetings"></div>
//     `;

//     const recentContainer = el.querySelector('#recentMeetings');

//     if (meetings.length === 0) {
//       recentContainer.innerHTML = '<p class="empty-state">No meetings yet. Upload your first one to get started.</p>';
//       return;
//     }

//     recentContainer.innerHTML = meetings.slice(0, 5).map((m) => `
//       <div class="list-card">
//         <div class="list-card-title">${escapeHtml(m.title || m.meeting_code)}</div>
//         <div class="list-card-meta">${m.meeting_code} · ${new Date(m.created_at).toLocaleDateString()}</div>
//       </div>
//     `).join('');

//   } catch (err) {
//     console.error(err);
//     el.innerHTML = '<p class="empty-state">Could not load dashboard data.</p>';
//   }
// };

// // Prevents a meeting title like <script>...</script> from ever executing —
// // necessary anywhere user-provided text gets inserted via innerHTML
// const escapeHtml = (str) => {
//   const div = document.createElement('div');
//   div.textContent = str;
//   return div.innerHTML;
// };

import { apiFetch } from '../../shared/api.js';
import { escapeHtml, renderSkeleton, renderEmptyState } from '../../shared/dom.js';
import { navigate } from '../router.js';

export const renderDashboard = async (el) => {
  el.innerHTML = `
    <h2 class="section-title">Dashboard</h2>
    <div class="stat-grid">${renderSkeleton(4)}</div>
    ${renderSkeleton(3)}
  `;

  try {
    const [meetingsRes, tasksRes] = await Promise.all([apiFetch('/meetings'), apiFetch('/tasks')]);
    if (!meetingsRes.ok || !tasksRes.ok) throw new Error('Failed to load dashboard data');

    const { meetings } = await meetingsRes.json();
    const tasks = await tasksRes.json();
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const done = tasks.filter((t) => t.status === 'done').length;

    el.innerHTML = `
      <h2 class="section-title">Dashboard</h2>

      <div class="card quick-create-card">
        <h3 class="section-title" style="margin-bottom:10px"><i class="ti ti-sparkles" aria-hidden="true"></i> Quick create</h3>
        <textarea class="field-input" id="quickTranscript" placeholder="Paste a transcript to process it right now..."></textarea>
        <div class="quick-create-footer">
          <a href="/app/meetings/new" data-link class="btn-text"><i class="ti ti-microphone" aria-hidden="true"></i>Upload audio instead</a>
          <button class="btn-primary" id="quickSubmitBtn" style="width:auto;padding:9px 18px"><i class="ti ti-bolt" aria-hidden="true"></i>Process meeting</button>
        </div>
        <p class="form-status" id="quickStatus"></p>
      </div>

      <div class="stat-grid">
        <div class="stat-card"><span class="stat-label"><i class="ti ti-video" aria-hidden="true"></i> Total meetings</span><span class="stat-value">${meetings.length}</span></div>
        <div class="stat-card"><span class="stat-label"><i class="ti ti-clock" aria-hidden="true"></i> Pending tasks</span><span class="stat-value">${pending}</span></div>
        <div class="stat-card"><span class="stat-label"><i class="ti ti-circle-check" aria-hidden="true"></i> Completed tasks</span><span class="stat-value">${done}</span></div>
        <div class="stat-card"><span class="stat-label"><i class="ti ti-checklist" aria-hidden="true"></i> Total tasks</span><span class="stat-value">${tasks.length}</span></div>
      </div>

      <h3 class="section-title">Recent meetings</h3>
      <div id="recentMeetings"></div>
    `;

    const recentContainer = el.querySelector('#recentMeetings');
    recentContainer.innerHTML = meetings.length === 0
      ? renderEmptyState({ icon: 'ti-video-off', title: 'No meetings yet', subtitle: 'Upload your first one to get started.', ctaLabel: 'New meeting', ctaHref: '/app/meetings/new' })
      : meetings.slice(0, 5).map((m) => `
          <a href="/app/meetings/${m.id}" data-link style="text-decoration:none">
            <div class="list-card">
              <div class="list-card-title" style="color:var(--text-primary)"><i class="ti ti-video" aria-hidden="true" style="color:var(--text-muted);margin-right:6px"></i>${escapeHtml(m.title || m.meeting_code)}</div>
              <div class="list-card-meta">${m.meeting_code} · ${new Date(m.created_at).toLocaleDateString()}</div>
            </div>
          </a>
        `).join('');

    el.querySelector('#quickSubmitBtn').addEventListener('click', () => handleQuickCreate(el));

  } catch (err) {
    console.error(err);
    el.innerHTML = renderEmptyState({ icon: 'ti-alert-triangle', title: 'Could not load dashboard', subtitle: 'Try refreshing the page.' });
  }
};

const handleQuickCreate = async (el) => {
  const textarea = el.querySelector('#quickTranscript');
  const status = el.querySelector('#quickStatus');
  const btn = el.querySelector('#quickSubmitBtn');
  const text = textarea.value.trim();

  status.classList.remove('error');
  if (!text) { status.classList.add('error'); status.textContent = 'Paste a transcript first'; return; }

  btn.disabled = true;
  status.textContent = 'Analyzing meeting...';

  try {
    const formData = new FormData();
    formData.append('transcriptText', text);
    const res = await apiFetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Processing failed');
    navigate(`/app/meetings/${data.meetingId}`);
  } catch (err) {
    status.classList.add('error');
    status.textContent = err.message;
    btn.disabled = false;
  }
};