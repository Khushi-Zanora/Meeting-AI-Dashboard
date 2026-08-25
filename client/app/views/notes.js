import { apiFetch } from '../../shared/api.js';
import { escapeHtml } from '../../shared/dom.js';

let filters = { search: '', meetingId: '' };
let meetingsMap = {};
let searchDebounce = null;
let editingNoteId = null;

export const renderNotes = async (el) => {
  el.innerHTML = '<p class="loading-state">Loading...</p>';

  try {
    const meetingsRes = await apiFetch('/meetings?archived=all');
    if (!meetingsRes.ok) throw new Error('Failed to load meetings');
    const { meetings } = await meetingsRes.json();
    meetingsMap = Object.fromEntries(meetings.map((m) => [m.id, m.title || m.meeting_code]));

    el.innerHTML = `
      <h2 class="section-title">Notes</h2>
      <div class="toolbar filters-row">
        <input type="text" id="noteSearch" class="field-input" placeholder="Search notes..." style="max-width:260px" />
        <select id="meetingFilter" class="field-input select-input">
          <option value="">All meetings</option>
          ${meetings.map((m) => `<option value="${m.id}">${escapeHtml(m.title || m.meeting_code)}</option>`).join('')}
        </select>
      </div>
      <div id="notesList"><p class="loading-state">Loading...</p></div>
    `;

    el.querySelector('#noteSearch').addEventListener('input', (e) => {
      filters.search = e.target.value;
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => loadNotes(el), 300);
    });
    el.querySelector('#meetingFilter').addEventListener('change', (e) => {
      filters.meetingId = e.target.value;
      loadNotes(el);
    });

    loadNotes(el);

  } catch (err) {
    console.error(err);
    el.innerHTML = '<p class="empty-state">Could not load notes.</p>';
  }
};

const loadNotes = async (el) => {
  const listEl = el.querySelector('#notesList');
  listEl.innerHTML = '<p class="loading-state">Loading...</p>';

  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.meetingId) params.set('meetingId', filters.meetingId);

  const res = await apiFetch(`/notes?${params.toString()}`);
  if (!res.ok) { listEl.innerHTML = '<p class="empty-state">Could not load notes.</p>'; return; }

  const { notes } = await res.json();

  if (notes.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No notes match these filters.</p>';
    return;
  }

  listEl.innerHTML = notes.map((n) => renderNoteCard(n)).join('');
  attachHandlers(el);
};

const renderNoteCard = (n) => {
  if (editingNoteId === n.id) {
    return `
      <div class="list-card" data-id="${n.id}">
        <textarea class="field-input edit-content" style="min-height:70px">${escapeHtml(n.content)}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn-primary save-note-btn" data-id="${n.id}" style="width:auto;padding:7px 14px">Save</button>
          <button class="btn-secondary cancel-edit-btn">Cancel</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="list-card note-row" data-id="${n.id}">
      ${n.is_pinned ? '<span class="pin-badge">Pinned</span>' : ''}
      <p class="note-content">${escapeHtml(n.content)}</p>
      <div class="note-footer">
        <span class="list-card-meta">
          <a href="/app/meetings/${n.meeting_id}" data-link>${escapeHtml(meetingsMap[n.meeting_id] || 'Unknown meeting')}</a>
          · ${new Date(n.created_at).toLocaleDateString()}
        </span>
        <div class="meeting-actions">
          <button class="btn-text pin-btn" data-id="${n.id}" data-pinned="${n.is_pinned}">${n.is_pinned ? 'Unpin' : 'Pin'}</button>
          <button class="btn-text edit-note-btn" data-id="${n.id}">Edit</button>
          <button class="btn-text btn-text-danger delete-note-btn" data-id="${n.id}">Delete</button>
        </div>
      </div>
    </div>
  `;
};

const attachHandlers = (el) => {
  el.querySelectorAll('.pin-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const isPinned = btn.dataset.pinned === '1' || btn.dataset.pinned === 'true';
      const res = await apiFetch(`/notes/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ isPinned: !isPinned }) });
      if (res.ok) loadNotes(el);
    });
  });

  el.querySelectorAll('.delete-note-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this note?')) return;
      const res = await apiFetch(`/notes/${btn.dataset.id}`, { method: 'DELETE' });
      if (res.ok) loadNotes(el);
    });
  });

  el.querySelectorAll('.edit-note-btn').forEach((btn) => {
    btn.addEventListener('click', () => { editingNoteId = Number(btn.dataset.id); loadNotes(el); });
  });

  el.querySelectorAll('.cancel-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => { editingNoteId = null; loadNotes(el); });
  });

  el.querySelectorAll('.save-note-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.list-card');
      const content = row.querySelector('.edit-content').value.trim();
      if (!content) { alert('Note content cannot be empty'); return; }

      const res = await apiFetch(`/notes/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ content }) });
      editingNoteId = null;
      if (res.ok) loadNotes(el); else alert('Could not save changes.');
    });
  });
};