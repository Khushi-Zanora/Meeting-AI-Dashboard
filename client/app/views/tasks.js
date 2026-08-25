import { apiFetch } from '../../shared/api.js';
import { escapeHtml, renderSkeleton, renderEmptyState } from '../../shared/dom.js';

let filters = { status: '', priority: '', meetingId: '', search: '' };
let meetingsMap = {};
let searchDebounce = null;
let editingTaskId = null;

export const renderTasks = async (el) => {
  el.innerHTML = renderSkeleton(4);

  try {
    const meetingsRes = await apiFetch('/meetings?archived=all');
    if (!meetingsRes.ok) throw new Error('Failed to load meetings');
    const { meetings } = await meetingsRes.json();
    meetingsMap = Object.fromEntries(meetings.map((m) => [m.id, m.title || m.meeting_code]));

    el.innerHTML = `
      <h2 class="section-title">Tasks</h2>
      <div class="toolbar filters-row">
        <input type="text" id="taskSearch" class="field-input" placeholder="Search tasks..." style="max-width:220px" />
        <select id="statusFilter" class="field-input select-input">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
        <select id="priorityFilter" class="field-input select-input">
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select id="meetingFilter" class="field-input select-input">
          <option value="">All meetings</option>
          ${meetings.map((m) => `<option value="${m.id}">${escapeHtml(m.title || m.meeting_code)}</option>`).join('')}
        </select>
      </div>
      <div id="taskList"><p class="loading-state">Loading...</p></div>
    `;

    el.querySelector('#taskSearch').addEventListener('input', (e) => {
      filters.search = e.target.value;
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => loadTasks(el), 300);
    });
    el.querySelector('#statusFilter').addEventListener('change', (e) => { filters.status = e.target.value; loadTasks(el); });
    el.querySelector('#priorityFilter').addEventListener('change', (e) => { filters.priority = e.target.value; loadTasks(el); });
    el.querySelector('#meetingFilter').addEventListener('change', (e) => { filters.meetingId = e.target.value; loadTasks(el); });

    loadTasks(el);

  } catch (err) {
    console.error(err);
    el.innerHTML = renderEmptyState({ icon: 'ti-alert-triangle', title: 'Could not load tasks' });
  }
};

const loadTasks = async (el) => {
  const listEl = el.querySelector('#taskList');
  listEl.innerHTML = renderSkeleton(4);

  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.meetingId) params.set('meetingId', filters.meetingId);
  if (filters.search) params.set('search', filters.search);

    const res = await apiFetch(`/tasks?${params.toString()}`);
  if (!res.ok) { listEl.innerHTML = renderEmptyState({ icon: 'ti-alert-triangle', title: 'Could not load tasks' }); return; }

  const tasks = await res.json();

  if (tasks.length === 0) {
    listEl.innerHTML = renderEmptyState({ icon: 'ti-checklist', title: 'No tasks match these filters' });
    return;
  }

  listEl.innerHTML = tasks.map((t) => renderTaskRow(t)).join('');
  attachRowHandlers(el);
};

const renderTaskRow = (t) => {
  if (editingTaskId === t.id) {
    return `
      <div class="list-card" data-id="${t.id}">
        <div class="field-row">
          <input class="field-input edit-title" value="${escapeHtml(t.title)}" style="flex:2" />
          <input class="field-input edit-assignee" value="${escapeHtml(t.assignee || '')}" placeholder="Assignee" style="flex:1" />
          <input class="field-input edit-deadline" value="${escapeHtml(t.deadline || '')}" placeholder="Deadline" style="flex:1" />
          <select class="field-input select-input edit-priority" style="flex:1">
            <option value="high" ${t.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${t.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${t.priority === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn-primary save-task-btn" data-id="${t.id}" style="width:auto;padding:7px 14px"><i class="ti ti-check" aria-hidden="true"></i>Save</button>
          <button class="btn-secondary cancel-edit-btn"><i class="ti ti-x" aria-hidden="true"></i>Cancel</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="list-card task-row">
      <div>
        <span class="priority-dot priority-${t.priority}"></span>
        <span class="list-card-title">${escapeHtml(t.title)}</span>
        <div class="list-card-meta">
          <a href="/app/meetings/${t.meeting_id}" data-link>${escapeHtml(meetingsMap[t.meeting_id] || 'Unknown meeting')}</a>
          · ${t.assignee ? escapeHtml(t.assignee) : 'Unassigned'}${t.deadline ? ' · ' + escapeHtml(t.deadline) : ''}
        </div>
      </div>
        <div class="meeting-actions">
        <button class="btn-text edit-task-btn" data-id="${t.id}"><i class="ti ti-edit" aria-hidden="true"></i>Edit</button>
        <button class="btn-text task-toggle" data-id="${t.id}" data-status="${t.status}"><i class="ti ${t.status === 'pending' ? 'ti-circle-check' : 'ti-rotate'}" aria-hidden="true"></i>${t.status === 'pending' ? 'Mark done' : 'Reopen'}</button>
        <button class="btn-text btn-text-danger delete-task-btn" data-id="${t.id}"><i class="ti ti-trash" aria-hidden="true"></i>Delete</button>
      </div>
    </div>
  `;
};

const attachRowHandlers = (el) => {
  el.querySelectorAll('.task-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status === 'pending' ? 'done' : 'pending';
      const res = await apiFetch(`/tasks/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      if (res.ok) loadTasks(el);
    });
  });

  el.querySelectorAll('.delete-task-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this task?')) return;
      const res = await apiFetch(`/tasks/${btn.dataset.id}`, { method: 'DELETE' });
      if (res.ok) loadTasks(el);
    });
  });

  el.querySelectorAll('.edit-task-btn').forEach((btn) => {
    btn.addEventListener('click', () => { editingTaskId = Number(btn.dataset.id); loadTasks(el); });
  });

  el.querySelectorAll('.cancel-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => { editingTaskId = null; loadTasks(el); });
  });

  el.querySelectorAll('.save-task-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.list-card');
      const body = {
        title: row.querySelector('.edit-title').value.trim(),
        assignee: row.querySelector('.edit-assignee').value.trim(),
        deadline: row.querySelector('.edit-deadline').value.trim(),
        priority: row.querySelector('.edit-priority').value
      };
      if (!body.title) { alert('Title is required'); return; }

      const res = await apiFetch(`/tasks/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      editingTaskId = null;
      if (res.ok) loadTasks(el); else alert('Could not save changes.');
    });
  });
};