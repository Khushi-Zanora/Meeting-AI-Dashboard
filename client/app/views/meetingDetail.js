import { apiFetch } from '../../shared/api.js';
import { escapeHtml } from '../../shared/dom.js';
import { navigate } from '../router.js';

export const renderMeetingDetail = async (el, meetingId) => {
  el.innerHTML = '<p class="loading-state">Loading...</p>';

  try {
    const [meetingRes, notesRes, tasksRes] = await Promise.all([
      apiFetch(`/meetings/${meetingId}`),
      apiFetch(`/meetings/${meetingId}/notes`),
      apiFetch(`/tasks?meetingId=${meetingId}`)
    ]);

    if (meetingRes.status === 404) {
      el.innerHTML = '<p class="empty-state">Meeting not found.</p>';
      return;
    }
    if (!meetingRes.ok || !notesRes.ok || !tasksRes.ok) throw new Error('Failed to load meeting');

    const { meeting } = await meetingRes.json();
    const { notes } = await notesRes.json();
    const tasks = await tasksRes.json();

    renderView(el, meeting, notes, tasks);

  } catch (err) {
    console.error(err);
    el.innerHTML = '<p class="empty-state">Could not load this meeting.</p>';
  }
};

const renderView = (el, meeting, notes, tasks) => {
  el.innerHTML = `
    <a href="/app/meetings" data-link class="btn-text" style="display:inline-block;margin-bottom:12px">← Back to meetings</a>

    <div class="meeting-header">
      <div>
        <h2 id="titleDisplay" class="meeting-title">${escapeHtml(meeting.title || meeting.meeting_code)}</h2>
        <div class="list-card-meta">${meeting.meeting_code} · ${new Date(meeting.date).toLocaleDateString()}${meeting.participants ? ' · ' + escapeHtml(meeting.participants) : ''}</div>
      </div>
      <div class="meeting-actions">
        <button class="btn-text" id="editBtn">Edit</button>
        <button class="btn-text" id="archiveBtn">${meeting.archived_at ? 'Restore' : 'Archive'}</button>
        <button class="btn-text btn-text-danger" id="deleteBtn">Delete</button>
      </div>
    </div>

    <div id="editForm" style="display:none" class="card">
      <div class="field-group"><label class="field-label">Title</label><input class="field-input" id="editTitle" value="${escapeHtml(meeting.title || '')}" /></div>
      <div class="field-row">
        <div class="field-group" style="flex:1"><label class="field-label">Date</label><input class="field-input" type="date" id="editDate" value="${meeting.date ? meeting.date.slice(0,10) : ''}" /></div>
        <div class="field-group" style="flex:1"><label class="field-label">Participants</label><input class="field-input" id="editParticipants" value="${escapeHtml(meeting.participants || '')}" /></div>
      </div>
      <div class="field-group"><label class="field-label">Description</label><textarea class="field-input" id="editDescription">${escapeHtml(meeting.description || '')}</textarea></div>
      <div style="display:flex;gap:8px">
        <button class="btn-primary" id="saveEditBtn" style="width:auto;padding:9px 18px">Save</button>
        <button class="btn-secondary" id="cancelEditBtn">Cancel</button>
      </div>
    </div>

    <section class="card" style="margin-bottom:16px">
      <h3 class="section-title">Summary</h3>
      <p class="meeting-summary">${meeting.summary ? escapeHtml(meeting.summary) : '<span class="empty-state" style="padding:0">No summary available.</span>'}</p>
    </section>

    <div class="two-col">
      <section class="card">
        <h3 class="section-title">Key points</h3>
        ${renderBulletList(meeting.key_points)}
      </section>
      <section class="card">
        <h3 class="section-title">Decisions</h3>
        ${renderBulletList(meeting.decisions)}
      </section>
    </div>

    <section class="card" style="margin:16px 0">
      <details>
        <summary class="section-title" style="cursor:pointer;display:inline-block">Transcript</summary>
        <p class="transcript-box">${meeting.transcript ? escapeHtml(meeting.transcript) : 'No transcript stored.'}</p>
      </details>
    </section>

    <section style="margin-bottom:24px">
      <h3 class="section-title">Action items <span class="column-count">${tasks.length}</span></h3>
      <div id="taskList">${renderTasks(tasks)}</div>
    </section>

    <section>
      <h3 class="section-title">Notes <span class="column-count">${notes.length}</span></h3>
      <div class="field-group">
        <textarea class="field-input" id="newNoteInput" placeholder="Add a note..." style="min-height:70px"></textarea>
        <button class="btn-primary" id="addNoteBtn" style="width:auto;padding:9px 18px;margin-top:6px">Add note</button>
      </div>
      <div id="notesList">${renderNotes(notes)}</div>
    </section>
  `;

  attachHandlers(el, meeting);
};

const renderBulletList = (items) => {
  if (!items || items.length === 0) return '<p class="empty-state" style="padding:0">None recorded.</p>';
  return `<ul class="bullet-list">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
};

const renderTasks = (tasks) => {
  if (tasks.length === 0) return '<p class="empty-state">No action items for this meeting.</p>';
  return tasks.map((t) => `
    <div class="list-card task-row">
      <div>
        <span class="priority-dot priority-${t.priority}"></span>
        <span class="list-card-title">${escapeHtml(t.title)}</span>
        <div class="list-card-meta">${t.assignee ? escapeHtml(t.assignee) : 'Unassigned'}${t.deadline ? ' · ' + escapeHtml(t.deadline) : ''}</div>
      </div>
      <button class="btn-text task-toggle" data-id="${t.id}" data-status="${t.status}">${t.status === 'pending' ? 'Mark done' : 'Reopen'}</button>
    </div>
  `).join('');
};

const renderNotes = (notes) => {
  if (notes.length === 0) return '<p class="empty-state">No notes yet.</p>';
  return notes.map((n) => `
    <div class="list-card note-row" data-id="${n.id}">
      <p class="note-content">${escapeHtml(n.content)}</p>
      <div class="note-footer">
        <span class="list-card-meta">${new Date(n.created_at).toLocaleDateString()}</span>
        <div class="meeting-actions">
          <button class="btn-text pin-btn" data-id="${n.id}" data-pinned="${n.is_pinned}">${n.is_pinned ? 'Unpin' : 'Pin'}</button>
          <button class="btn-text btn-text-danger delete-note-btn" data-id="${n.id}">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
};

const attachHandlers = (el, meeting) => {
  const meetingId = meeting.id;

  el.querySelector('#editBtn').addEventListener('click', () => {
    el.querySelector('#editForm').style.display = 'block';
  });
  el.querySelector('#cancelEditBtn').addEventListener('click', () => {
    el.querySelector('#editForm').style.display = 'none';
  });

  el.querySelector('#saveEditBtn').addEventListener('click', async () => {
    const body = {
      title: el.querySelector('#editTitle').value.trim(),
      date: el.querySelector('#editDate').value,
      participants: el.querySelector('#editParticipants').value.trim(),
      description: el.querySelector('#editDescription').value.trim()
    };
    const res = await apiFetch(`/meetings/${meetingId}`, { method: 'PATCH', body: JSON.stringify(body) });
    if (res.ok) {
      renderMeetingDetail(el, meetingId);
    } else {
      alert('Could not save changes.');
    }
  });

  el.querySelector('#archiveBtn').addEventListener('click', async () => {
    const action = meeting.archived_at ? 'restore' : 'archive';
    const res = await apiFetch(`/meetings/${meetingId}/${action}`, { method: 'PATCH' });
    if (res.ok) renderMeetingDetail(el, meetingId);
  });

  el.querySelector('#deleteBtn').addEventListener('click', async () => {
    if (!confirm('Delete this meeting and all its tasks/notes? This cannot be undone.')) return;
    const res = await apiFetch(`/meetings/${meetingId}`, { method: 'DELETE' });
    if (res.ok) navigate('/app/meetings');
  });

  el.querySelectorAll('.task-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status === 'pending' ? 'done' : 'pending';
      const res = await apiFetch(`/tasks/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      if (res.ok) renderMeetingDetail(el, meetingId);
    });
  });

  el.querySelector('#addNoteBtn').addEventListener('click', async () => {
    const input = el.querySelector('#newNoteInput');
    const content = input.value.trim();
    if (!content) return;
    const res = await apiFetch(`/meetings/${meetingId}/notes`, { method: 'POST', body: JSON.stringify({ content }) });
    if (res.ok) renderMeetingDetail(el, meetingId);
  });

  el.querySelectorAll('.pin-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const isPinned = btn.dataset.pinned === '1' || btn.dataset.pinned === 'true';
      const res = await apiFetch(`/notes/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ isPinned: !isPinned }) });
      if (res.ok) renderMeetingDetail(el, meetingId);
    });
  });

  el.querySelectorAll('.delete-note-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this note?')) return;
      const res = await apiFetch(`/notes/${btn.dataset.id}`, { method: 'DELETE' });
      if (res.ok) renderMeetingDetail(el, meetingId);
    });
  });
};