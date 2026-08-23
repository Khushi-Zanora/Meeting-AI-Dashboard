import { apiFetch } from '../../shared/api.js';
import { escapeHtml } from '../../shared/dom.js';

let currentSearch = '';
let showArchived = false;
let searchDebounce = null;

export const renderMeetings = async (el) => {
  el.innerHTML = `
    <div class="page-header">
      <h2 class="section-title">Meetings</h2>
      <a href="/app/meetings/new" data-link><button class="btn-primary" style="width:auto;padding:10px 18px">+ New meeting</button></a>
    </div>
    <div class="toolbar">
      <input type="text" id="meetingSearch" class="field-input" placeholder="Search by title, code, or participant..." style="max-width:320px" />
      <label class="checkbox-label">
        <input type="checkbox" id="archivedToggle" />
        Show archived
      </label>
    </div>
    <div id="meetingsList"><p class="loading-state">Loading...</p></div>
  `;

  el.querySelector('#meetingSearch').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => loadMeetings(el), 300);
  });

  el.querySelector('#archivedToggle').addEventListener('change', (e) => {
    showArchived = e.target.checked;
    loadMeetings(el);
  });

  loadMeetings(el);
};

const loadMeetings = async (el) => {
  const listEl = el.querySelector('#meetingsList');
  listEl.innerHTML = '<p class="loading-state">Loading...</p>';

  try {
    const params = new URLSearchParams();
    if (currentSearch) params.set('search', currentSearch);
    if (showArchived) params.set('archived', 'true');

    const res = await apiFetch(`/meetings?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load meetings');
    const { meetings } = await res.json();

    if (meetings.length === 0) {
      listEl.innerHTML = `<p class="empty-state">${showArchived ? 'No archived meetings.' : 'No meetings yet. Create your first one to get started.'}</p>`;
      return;
    }

    listEl.innerHTML = meetings.map((m) => `
      <div class="list-card meeting-card" data-id="${m.id}">
        <div style="flex:1">
          <a href="/app/meetings/${m.id}" data-link class="list-card-title">${escapeHtml(m.title || m.meeting_code)}</a>
          <div class="list-card-meta">${m.meeting_code} · ${new Date(m.created_at).toLocaleDateString()}${m.participants ? ' · ' + escapeHtml(m.participants) : ''}</div>
        </div>
        <div class="meeting-actions">
          ${showArchived
            ? `<button class="btn-text" data-action="restore" data-id="${m.id}">Restore</button>`
            : `<button class="btn-text" data-action="archive" data-id="${m.id}">Archive</button>`
          }
          <button class="btn-text btn-text-danger" data-action="delete" data-id="${m.id}">Delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => handleAction(el, btn.dataset.action, btn.dataset.id));
    });

  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p class="empty-state">Could not load meetings.</p>';
  }
};

const handleAction = async (el, action, id) => {
  if (action === 'delete' && !confirm('Delete this meeting and all its tasks/notes? This cannot be undone.')) return;

  const endpoints = {
    archive: { path: `/meetings/${id}/archive`, method: 'PATCH' },
    restore: { path: `/meetings/${id}/restore`, method: 'PATCH' },
    delete: { path: `/meetings/${id}`, method: 'DELETE' }
  };

  const { path, method } = endpoints[action];
  const res = await apiFetch(path, { method });

  if (res.ok) {
    loadMeetings(el);
  } else {
    alert('Something went wrong — please try again.');
  }
};