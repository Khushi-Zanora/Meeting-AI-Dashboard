import { apiFetch } from '../../shared/api.js';
import { escapeHtml, renderSkeleton, renderEmptyState } from '../../shared/dom.js';
import { openPinDialog, pinRequest } from '../../shared/modal.js';

let currentSearch = '';
let view = 'active'; // 'active' | 'archived' | 'vault'
let searchDebounce = null;

export const renderMeetings = async (el) => {
  currentSearch = '';
  view = 'active';

  el.innerHTML = `
    <div class="page-header">
      <h2 class="section-title">Meetings</h2>
      <a href="/app/meetings/new" data-link><button class="btn-primary" style="width:auto;padding:10px 18px"><i class="ti ti-plus" aria-hidden="true"></i>New meeting</button></a>
    </div>
    <div class="toolbar">
      <div class="tab-switch" id="viewSwitch" style="margin-bottom:0">
        <button type="button" class="tab-btn active" data-view="active">Active</button>
        <button type="button" class="tab-btn" data-view="archived"><i class="ti ti-archive" aria-hidden="true"></i>Archived</button>
        <button type="button" class="tab-btn" data-view="vault"><i class="ti ti-lock" aria-hidden="true"></i>Vault</button>
      </div>
      <input type="text" id="meetingSearch" class="field-input" placeholder="Search by title, code, or participant..." style="max-width:320px" />
    </div>
    <div id="meetingsList">${renderSkeleton(4)}</div>
  `;

  const searchInput = el.querySelector('#meetingSearch');

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => loadMeetings(el), 300);
  });

  el.querySelectorAll('#viewSwitch .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      view = btn.dataset.view;
      el.querySelectorAll('#viewSwitch .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      searchInput.placeholder = view === 'vault' ? 'Search the vault by title or code...' : 'Search by title, code, or participant...';
      loadMeetings(el);
    });
  });

  loadMeetings(el);
};

const emptyFor = () => {
  if (view === 'archived') return renderEmptyState({ icon: 'ti-archive', title: 'No archived meetings' });
  if (view === 'vault') {
    return renderEmptyState({
      icon: 'ti-lock',
      title: 'Your vault is empty',
      subtitle: 'Use the Vault button on a meeting to protect it with a PIN.'
    });
  }
  return renderEmptyState({
    icon: 'ti-video-off',
    title: 'No meetings yet',
    subtitle: 'Create your first one to get started.',
    ctaLabel: '+ New meeting',
    ctaHref: '/app/meetings/new'
  });
};

const renderCard = (m) => {
  if (view === 'vault') {
    return `
      <div class="list-card meeting-card">
        <div style="flex:1">
          <a href="/app/meetings/${m.id}" data-link class="list-card-title"><i class="ti ti-lock" aria-hidden="true" style="color:var(--text-muted);margin-right:6px"></i>${escapeHtml(m.title || m.meeting_code)}</a>
          <div class="list-card-meta">${escapeHtml(m.meeting_code)} · ${new Date(m.created_at).toLocaleDateString()}</div>
        </div>
        <div class="meeting-actions">
          <a href="/app/meetings/${m.id}" data-link class="btn-text"><i class="ti ti-key" aria-hidden="true"></i>Unlock</a>
          <button class="btn-text btn-text-danger" data-action="delete" data-id="${m.id}"><i class="ti ti-trash" aria-hidden="true"></i>Delete</button>
        </div>
      </div>
    `;
  }

  const actions = view === 'archived'
    ? `<button class="btn-text" data-action="restore" data-id="${m.id}"><i class="ti ti-arrow-back-up" aria-hidden="true"></i>Restore</button>`
    : `<button class="btn-text" data-action="archive" data-id="${m.id}"><i class="ti ti-archive" aria-hidden="true"></i>Archive</button>
       <button class="btn-text" data-action="vault" data-id="${m.id}"><i class="ti ti-lock" aria-hidden="true"></i>Vault</button>`;

  return `
    <div class="list-card meeting-card">
      <div style="flex:1">
        <a href="/app/meetings/${m.id}" data-link class="list-card-title">${escapeHtml(m.title || m.meeting_code)}</a>
        <div class="list-card-meta">${escapeHtml(m.meeting_code)} · ${new Date(m.created_at).toLocaleDateString()}${m.participants ? ' · ' + escapeHtml(m.participants) : ''}</div>
      </div>
      <div class="meeting-actions">
        ${actions}
        <button class="btn-text btn-text-danger" data-action="delete" data-id="${m.id}"><i class="ti ti-trash" aria-hidden="true"></i>Delete</button>
      </div>
    </div>
  `;
};

const loadMeetings = async (el) => {
  const listEl = el.querySelector('#meetingsList');
  listEl.innerHTML = renderSkeleton(4);

  try {
    const params = new URLSearchParams();
    if (currentSearch) params.set('search', currentSearch);
    if (view === 'archived') params.set('archived', 'true');
    if (view === 'vault') { params.set('vaulted', 'true'); params.set('archived', 'all'); }

    const res = await apiFetch('/meetings?' + params.toString());
    if (!res.ok) throw new Error('Failed to load meetings');
    const { meetings } = await res.json();

    if (meetings.length === 0) { listEl.innerHTML = emptyFor(); return; }

    listEl.innerHTML = meetings.map(renderCard).join('');
    listEl.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => handleAction(el, btn.dataset.action, btn.dataset.id));
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = renderEmptyState({ icon: 'ti-alert-triangle', title: 'Could not load meetings' });
  }
};

const handleAction = async (el, action, id) => {
  if (action === 'vault') {
    const ok = await openPinDialog({
      title: 'Move to vault',
      message: 'Choose a PIN (4 to 32 characters). You will need it every time you open this meeting. If you forget it, the only option is to delete the meeting. Collaborators, if any, lose access while it is in the vault.',
      submitLabel: 'Move to vault',
      confirm: true,
      onSubmit: async (pin) => {
        const result = await pinRequest('/meetings/' + id + '/vault', 'POST', pin);
        return result.ok ? null : (result.data.message || 'Something went wrong');
      }
    });
    if (ok) loadMeetings(el);
    return;
  }

  if (action === 'delete' && !confirm('Delete this meeting and all its tasks and notes? This cannot be undone.')) return;

  const endpoints = {
    archive: { path: '/meetings/' + id + '/archive', method: 'PATCH' },
    restore: { path: '/meetings/' + id + '/restore', method: 'PATCH' },
    delete: { path: '/meetings/' + id, method: 'DELETE' }
  };

  const { path, method } = endpoints[action];
  const res = await apiFetch(path, { method });

  if (res.ok) loadMeetings(el);
  else alert('Something went wrong. Please try again.');
};
