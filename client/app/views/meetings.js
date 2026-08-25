import { apiFetch } from '../../shared/api.js';
import { escapeHtml, renderSkeleton, renderEmptyState } from '../../shared/dom.js';

let currentSearch = '';
let showArchived = false;
let searchDebounce = null;

export const renderMeetings = async (el) => {
  el.innerHTML = `
    <div class="page-header">
      <h2 class="section-title">Meetings</h2>
      <a href="/app/meetings/new" data-link><button class="btn-primary" style="width:auto;padding:10px 18px"><i class="ti ti-plus" aria-hidden="true"></i>New meeting</button></a>
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
  listEl.innerHTML = renderSkeleton(4);

  try {
    const params = new URLSearchParams();
    if (currentSearch) params.set('search', currentSearch);
    if (showArchived) params.set('archived', 'true');

    const res = await apiFetch(`/meetings?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load meetings');
    const { meetings } = await res.json();

        if (meetings.length === 0) {
      listEl.innerHTML = showArchived
        ? renderEmptyState({ icon: 'ti-archive', title: 'No archived meetings' })
        : renderEmptyState({ icon: 'ti-video-off', title: 'No meetings yet', subtitle: 'Create your first one to get started.', ctaLabel: '+ New meeting', ctaHref: '/app/meetings/new' });
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
            ? `<button class="btn-text" data-action="restore" data-id="${m.id}"><i class="ti ti-arrow-back-up" aria-hidden="true"></i>Restore</button>`
            : `<button class="btn-text" data-action="archive" data-id="${m.id}"><i class="ti ti-archive" aria-hidden="true"></i>Archive</button>`
          }
          <button class="btn-text btn-text-danger" data-action="delete" data-id="${m.id}"><i class="ti ti-trash" aria-hidden="true"></i>Delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => handleAction(el, btn.dataset.action, btn.dataset.id));
    });

  } catch (err) {
    console.error(err);
    listEl.innerHTML = renderEmptyState({ icon: 'ti-alert-triangle', title: 'Could not load meetings' });
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