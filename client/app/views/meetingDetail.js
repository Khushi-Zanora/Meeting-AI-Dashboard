import { apiFetch } from '../../shared/api.js';
import { escapeHtml, renderSkeleton, renderEmptyState } from '../../shared/dom.js';
import { getCurrentUser } from '../../shared/auth.js';
import { clearVaultToken } from '../../shared/vault.js';
import { openPinDialog, pinRequest, promptUnlock } from '../../shared/modal.js';
import { navigate } from '../router.js';

const isVaultLocked = async (res) => {
  if (res.status !== 403) return false;
  const body = await res.clone().json().catch(() => ({}));
  return body.code === 'VAULT_LOCKED';
};

// If the 10-minute vault token ran out mid-session, drop back to the lock screen
const bounceIfLocked = async (el, meetingId, res) => {
  if (!(await isVaultLocked(res))) return false;
  clearVaultToken(meetingId);
  renderLockScreen(el, meetingId);
  return true;
};

// Every call from this page carries the meeting's vault token (if we hold one).
// Returns null if the vault re-locked, otherwise the response.
const call = async (el, meetingId, path, method, body) => {
  const res = await apiFetch(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    vaultMeetingId: meetingId
  });
  if (await bounceIfLocked(el, meetingId, res)) return null;
  return res;
};

const renderLockScreen = (el, meetingId) => {
  el.innerHTML = `
    <a href="/app/meetings" data-link class="btn-text" style="display:inline-block;margin-bottom:12px"><i class="ti ti-arrow-left" aria-hidden="true"></i>Back to meetings</a>
    <div class="empty-card lock-card">
      <i class="ti ti-lock" aria-hidden="true"></i>
      <h3>This meeting is in the vault</h3>
      <p>Enter your PIN to open it. Access lasts 10 minutes.</p>
      <button class="btn-primary" id="unlockBtn" style="width:auto;padding:9px 18px"><i class="ti ti-key" aria-hidden="true"></i>Enter PIN</button>
    </div>
  `;

  const unlock = async () => {
    const ok = await promptUnlock(meetingId);
    if (ok) renderMeetingDetail(el, meetingId);
  };
  el.querySelector('#unlockBtn').addEventListener('click', unlock);
  unlock(); // open the dialog straight away
};

export const renderMeetingDetail = async (el, meetingId) => {
  el.innerHTML = renderSkeleton(3);
  const opts = { vaultMeetingId: meetingId };

  try {
    const meetingRes = await apiFetch('/meetings/' + meetingId, opts);

    if (meetingRes.status === 404) {
      el.innerHTML = renderEmptyState({
        icon: 'ti-video-off',
        title: 'Meeting not found',
        subtitle: 'It may have been deleted, or you no longer have access.',
        ctaLabel: 'Back to meetings',
        ctaHref: '/app/meetings'
      });
      return;
    }
    if (await bounceIfLocked(el, meetingId, meetingRes)) return;
    if (!meetingRes.ok) throw new Error('Failed to load meeting');

    const { meeting } = await meetingRes.json();
    const isOwner = meeting.access_role === 'owner';

    const [notesRes, tasksRes, collabRes] = await Promise.all([
      apiFetch('/meetings/' + meetingId + '/notes', opts),
      apiFetch('/tasks?meetingId=' + meetingId, opts),
      isOwner ? apiFetch('/meetings/' + meetingId + '/collaborators', opts) : Promise.resolve(null)
    ]);

    for (const r of [notesRes, tasksRes, collabRes]) {
      if (r && (await bounceIfLocked(el, meetingId, r))) return;
    }
    if (!notesRes.ok || !tasksRes.ok || (collabRes && !collabRes.ok)) throw new Error('Failed to load meeting');

    const { notes } = await notesRes.json();
    const tasks = await tasksRes.json();
    const collaborators = collabRes ? (await collabRes.json()).collaborators : [];

    renderView(el, meeting, notes, tasks, collaborators);
  } catch (err) {
    console.error(err);
    el.innerHTML = renderEmptyState({ icon: 'ti-alert-triangle', title: 'Could not load this meeting' });
  }
};

const renderView = (el, meeting, notes, tasks, collaborators) => {
  const role = meeting.access_role; // owner | editor | viewer
  const isOwner = role === 'owner';
  const canEdit = role === 'owner' || role === 'editor';
  const me = getCurrentUser();
  const myId = me ? me.id : null;

  // Matches the server: the owner may change any note; an editor only their own
  const canChangeNote = (n) => isOwner || (canEdit && n.user_id === myId);

  const roleBadge = isOwner ? '' : `<span class="badge badge-${role}">${role === 'editor' ? 'Editor' : 'Viewer'}</span>`;
  const vaultBadge = meeting.is_vaulted ? '<span class="badge badge-vault"><i class="ti ti-lock" aria-hidden="true"></i>In vault</span>' : '';

  let actions = '';
  if (canEdit) actions += '<button class="btn-text" id="editBtn"><i class="ti ti-edit" aria-hidden="true"></i>Edit</button>';
  if (isOwner) {
    actions += '<button class="btn-text" id="shareBtn"><i class="ti ti-users" aria-hidden="true"></i>Share</button>';
    actions += `<button class="btn-text" id="archiveBtn"><i class="ti ${meeting.archived_at ? 'ti-arrow-back-up' : 'ti-archive'}" aria-hidden="true"></i>${meeting.archived_at ? 'Restore' : 'Archive'}</button>`;
    actions += meeting.is_vaulted
      ? '<button class="btn-text" id="lockNowBtn"><i class="ti ti-lock" aria-hidden="true"></i>Lock now</button><button class="btn-text" id="unvaultBtn"><i class="ti ti-lock-open" aria-hidden="true"></i>Remove from vault</button>'
      : '<button class="btn-text" id="vaultBtn"><i class="ti ti-lock" aria-hidden="true"></i>Move to vault</button>';
    actions += '<button class="btn-text btn-text-danger" id="deleteBtn"><i class="ti ti-trash" aria-hidden="true"></i>Delete</button>';
  } else {
    actions += '<button class="btn-text btn-text-danger" id="leaveBtn"><i class="ti ti-door-exit" aria-hidden="true"></i>Leave</button>';
  }

  const editForm = canEdit ? `
    <div id="editForm" style="display:none" class="card">
      <div class="field-group"><label class="field-label">Title</label><input class="field-input" id="editTitle" value="${escapeHtml(meeting.title || '')}" /></div>
      <div class="field-row">
        <div class="field-group" style="flex:1"><label class="field-label">Date</label><input class="field-input" type="date" id="editDate" value="${meeting.date ? escapeHtml(meeting.date.slice(0, 10)) : ''}" /></div>
        <div class="field-group" style="flex:1"><label class="field-label">Participants</label><input class="field-input" id="editParticipants" value="${escapeHtml(meeting.participants || '')}" /></div>
      </div>
      <div class="field-group"><label class="field-label">Description</label><textarea class="field-input" id="editDescription">${escapeHtml(meeting.description || '')}</textarea></div>
      <div style="display:flex;gap:8px">
        <button class="btn-primary" id="saveEditBtn" style="width:auto;padding:9px 18px"><i class="ti ti-check" aria-hidden="true"></i>Save</button>
        <button class="btn-secondary" id="cancelEditBtn"><i class="ti ti-x" aria-hidden="true"></i>Cancel</button>
      </div>
    </div>
  ` : '';

  const sharePanel = isOwner ? `
    <section class="card" id="sharePanel" style="display:none;margin-bottom:16px">
      <h3 class="section-title"><i class="ti ti-users" aria-hidden="true"></i> Sharing</h3>
      ${meeting.is_vaulted ? '<p class="list-card-meta" style="margin-bottom:10px">Collaborators cannot see this meeting while it is in the vault.</p>' : ''}
      <div id="collabList">${renderCollaborators(collaborators)}</div>
      <div class="invite-row">
        <input class="field-input" id="inviteEmail" type="email" placeholder="Invite by email (they need an account)" />
        <select class="field-input select-input" id="inviteRole">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button class="btn-primary" id="inviteBtn" style="width:auto;padding:9px 18px"><i class="ti ti-user-plus" aria-hidden="true"></i>Invite</button>
      </div>
      <p class="form-status" id="inviteStatus"></p>
    </section>
  ` : '';

  const addNote = canEdit ? `
    <div class="field-group">
      <textarea class="field-input" id="newNoteInput" placeholder="Add a note..." style="min-height:70px"></textarea>
      <button class="btn-primary" id="addNoteBtn" style="width:auto;padding:9px 18px;margin-top:6px"><i class="ti ti-plus" aria-hidden="true"></i>Add note</button>
    </div>
  ` : '';

  el.innerHTML = `
    <a href="${isOwner ? '/app/meetings' : '/app/shared'}" data-link class="btn-text" style="display:inline-block;margin-bottom:12px"><i class="ti ti-arrow-left" aria-hidden="true"></i>${isOwner ? 'Back to meetings' : 'Back to shared'}</a>

    <div class="meeting-header">
      <div>
        <h2 class="meeting-title">${escapeHtml(meeting.title || meeting.meeting_code)}${roleBadge}${vaultBadge}</h2>
        <div class="list-card-meta">${escapeHtml(meeting.meeting_code)} · ${new Date(meeting.date).toLocaleDateString()}${meeting.participants ? ' · ' + escapeHtml(meeting.participants) : ''}${isOwner ? '' : ' · Shared by ' + escapeHtml(meeting.owner_name)}</div>
      </div>
      <div class="meeting-actions">${actions}</div>
    </div>

    ${editForm}
    ${sharePanel}

    <section class="card" style="margin-bottom:16px">
      <h3 class="section-title">Summary</h3>
      <p class="meeting-summary">${meeting.summary ? escapeHtml(meeting.summary) : 'No summary available.'}</p>
    </section>

    <div class="two-col">
      <section class="card"><h3 class="section-title">Key points</h3>${renderBulletList(meeting.key_points)}</section>
      <section class="card"><h3 class="section-title">Decisions</h3>${renderBulletList(meeting.decisions)}</section>
    </div>

    <section class="card" style="margin:16px 0">
      <details>
        <summary class="section-title" style="cursor:pointer;display:inline-block">Transcript</summary>
        <p class="transcript-box">${meeting.transcript ? escapeHtml(meeting.transcript) : 'No transcript stored.'}</p>
      </details>
    </section>

    <section style="margin-bottom:24px">
      <h3 class="section-title">Action items <span class="column-count">${tasks.length}</span></h3>
      <div id="taskList">${renderTasks(tasks, canEdit)}</div>
    </section>

    <section>
      <h3 class="section-title">Notes <span class="column-count">${notes.length}</span></h3>
      ${addNote}
      <div id="notesList">${renderNotes(notes, canChangeNote, myId)}</div>
    </section>
  `;

  attachHandlers(el, meeting, collaborators, canEdit, isOwner);
};

const renderBulletList = (items) => {
  if (!items || items.length === 0) return '<p class="list-card-meta">None recorded.</p>';
  return `<ul class="bullet-list">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
};

const renderTasks = (tasks, canEdit) => {
  if (tasks.length === 0) return renderEmptyState({ icon: 'ti-checklist', title: 'No action items for this meeting' });
  return tasks.map((t) => `
    <div class="list-card task-row">
      <div>
        <span class="priority-dot priority-${escapeHtml(t.priority)}"></span>
        <span class="list-card-title">${escapeHtml(t.title)}</span>
        <div class="list-card-meta">${t.assignee ? escapeHtml(t.assignee) : 'Unassigned'}${t.deadline ? ' · ' + escapeHtml(t.deadline) : ''}${t.status === 'done' ? ' · Done' : ''}</div>
      </div>
      ${canEdit ? `<button class="btn-text task-toggle" data-id="${t.id}" data-status="${t.status}"><i class="ti ${t.status === 'pending' ? 'ti-circle-check' : 'ti-rotate'}" aria-hidden="true"></i>${t.status === 'pending' ? 'Mark done' : 'Reopen'}</button>` : ''}
    </div>
  `).join('');
};

const renderNotes = (notes, canChangeNote, myId) => {
  if (notes.length === 0) return renderEmptyState({ icon: 'ti-notes-off', title: 'No notes yet' });
  return notes.map((n) => `
    <div class="list-card note-row">
      ${n.is_pinned ? '<span class="pin-badge"><i class="ti ti-pin" aria-hidden="true"></i> Pinned</span>' : ''}
      <p class="note-content">${escapeHtml(n.content)}</p>
      <div class="note-footer">
        <span class="list-card-meta"><span class="note-author">${n.user_id === myId ? 'You' : escapeHtml(n.author_name)}</span> · ${new Date(n.created_at).toLocaleDateString()}</span>
        ${canChangeNote(n) ? `
          <div class="meeting-actions">
            <button class="btn-text pin-btn" data-id="${n.id}" data-pinned="${n.is_pinned}"><i class="ti ti-pin" aria-hidden="true"></i>${n.is_pinned ? 'Unpin' : 'Pin'}</button>
            <button class="btn-text btn-text-danger delete-note-btn" data-id="${n.id}"><i class="ti ti-trash" aria-hidden="true"></i>Delete</button>
          </div>` : ''}
      </div>
    </div>
  `).join('');
};

const renderCollaborators = (list) => {
  if (!list || list.length === 0) return '<p class="list-card-meta">Not shared with anyone yet.</p>';
  return list.map((c) => `
    <div class="collab-row">
      <div>
        <div class="collab-name">${escapeHtml(c.name)}</div>
        <div class="collab-email">${escapeHtml(c.email)}</div>
      </div>
      <div class="collab-controls">
        <select class="field-input select-input collab-role" data-user="${c.user_id}">
          <option value="viewer" ${c.role === 'viewer' ? 'selected' : ''}>Viewer</option>
          <option value="editor" ${c.role === 'editor' ? 'selected' : ''}>Editor</option>
        </select>
        <button class="btn-text btn-text-danger collab-remove" data-user="${c.user_id}"><i class="ti ti-user-minus" aria-hidden="true"></i>Remove</button>
      </div>
    </div>
  `).join('');
};

const refreshCollaborators = async (el, meetingId) => {
  const res = await call(el, meetingId, '/meetings/' + meetingId + '/collaborators', 'GET');
  if (!res || !res.ok) return;
  const { collaborators } = await res.json();
  el.querySelector('#collabList').innerHTML = renderCollaborators(collaborators);
  attachCollabRowHandlers(el, meetingId);
};

const attachCollabRowHandlers = (el, meetingId) => {
  const status = el.querySelector('#inviteStatus');

  el.querySelectorAll('.collab-role').forEach((select) => {
    select.addEventListener('change', async () => {
      const res = await call(el, meetingId, '/meetings/' + meetingId + '/collaborators/' + select.dataset.user, 'PATCH', { role: select.value });
      if (!res) return;
      status.classList.toggle('error', !res.ok);
      status.textContent = res.ok ? 'Role updated.' : 'Could not update the role.';
      if (!res.ok) refreshCollaborators(el, meetingId);
    });
  });

  el.querySelectorAll('.collab-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm("Remove this person's access to the meeting?")) return;
      const res = await call(el, meetingId, '/meetings/' + meetingId + '/collaborators/' + btn.dataset.user, 'DELETE');
      if (res && res.ok) {
        status.classList.remove('error');
        status.textContent = 'Access removed.';
        refreshCollaborators(el, meetingId);
      }
    });
  });
};

const attachHandlers = (el, meeting, collaborators, canEdit, isOwner) => {
  const meetingId = meeting.id;
  const reload = () => renderMeetingDetail(el, meetingId);

  // ---- meeting details ----
  if (canEdit) {
    el.querySelector('#editBtn').addEventListener('click', () => { el.querySelector('#editForm').style.display = 'block'; });
    el.querySelector('#cancelEditBtn').addEventListener('click', () => { el.querySelector('#editForm').style.display = 'none'; });
    el.querySelector('#saveEditBtn').addEventListener('click', async () => {
      const body = {
        title: el.querySelector('#editTitle').value.trim(),
        participants: el.querySelector('#editParticipants').value.trim(),
        description: el.querySelector('#editDescription').value.trim()
      };
      const date = el.querySelector('#editDate').value;
      if (date) body.date = date;

      const res = await call(el, meetingId, '/meetings/' + meetingId, 'PATCH', body);
      if (!res) return;
      if (res.ok) reload(); else alert('Could not save changes.');
    });
  }

  // ---- tasks ----
  el.querySelectorAll('.task-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const status = btn.dataset.status === 'pending' ? 'done' : 'pending';
      const res = await call(el, meetingId, '/tasks/' + btn.dataset.id, 'PATCH', { status });
      if (res && res.ok) reload();
    });
  });

  // ---- notes ----
  if (canEdit) {
    el.querySelector('#addNoteBtn').addEventListener('click', async () => {
      const content = el.querySelector('#newNoteInput').value.trim();
      if (!content) return;
      const res = await call(el, meetingId, '/meetings/' + meetingId + '/notes', 'POST', { content });
      if (res && res.ok) reload();
    });
  }

  el.querySelectorAll('.pin-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const isPinned = btn.dataset.pinned === '1' || btn.dataset.pinned === 'true';
      const res = await call(el, meetingId, '/notes/' + btn.dataset.id, 'PATCH', { isPinned: !isPinned });
      if (res && res.ok) reload();
    });
  });

  el.querySelectorAll('.delete-note-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this note?')) return;
      const res = await call(el, meetingId, '/notes/' + btn.dataset.id, 'DELETE');
      if (res && res.ok) reload();
    });
  });

  // ---- collaborators: leave ----
  if (!isOwner) {
    el.querySelector('#leaveBtn').addEventListener('click', async () => {
      if (!confirm('Leave this meeting? You will lose access until the owner invites you again.')) return;
      const res = await call(el, meetingId, '/meetings/' + meetingId + '/leave', 'DELETE');
      if (res && res.ok) navigate('/app/shared');
    });
    return;
  }

  // ---- owner only ----
  el.querySelector('#shareBtn').addEventListener('click', () => {
    const panel = el.querySelector('#sharePanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  el.querySelector('#archiveBtn').addEventListener('click', async () => {
    const action = meeting.archived_at ? 'restore' : 'archive';
    const res = await call(el, meetingId, '/meetings/' + meetingId + '/' + action, 'PATCH');
    if (res && res.ok) reload();
  });

  el.querySelector('#deleteBtn').addEventListener('click', async () => {
    if (!confirm('Delete this meeting and all its tasks and notes for everyone? This cannot be undone.')) return;
    const res = await call(el, meetingId, '/meetings/' + meetingId, 'DELETE');
    if (res && res.ok) navigate('/app/meetings');
  });

  if (meeting.is_vaulted) {
    el.querySelector('#lockNowBtn').addEventListener('click', () => {
      clearVaultToken(meetingId);
      reload(); // no token any more, so this shows the lock screen
    });

    el.querySelector('#unvaultBtn').addEventListener('click', async () => {
      const ok = await openPinDialog({
        title: 'Remove from vault',
        message: 'Enter your PIN to take this meeting out of the vault. It will appear in your normal lists again.',
        submitLabel: 'Remove from vault',
        onSubmit: async (pin) => {
          const result = await pinRequest('/meetings/' + meetingId + '/vault', 'DELETE', pin);
          return result.ok ? null : (result.data.message || 'Something went wrong');
        }
      });
      if (ok) { clearVaultToken(meetingId); reload(); }
    });
  } else {
    el.querySelector('#vaultBtn').addEventListener('click', async () => {
      const sharedNote = collaborators.length > 0 ? ' Your collaborators will lose access while it is in the vault.' : '';
      const ok = await openPinDialog({
        title: 'Move to vault',
        message: 'Choose a PIN (4 to 32 characters). You will need it every time you open this meeting. If you forget it, the only option is to delete the meeting.' + sharedNote,
        submitLabel: 'Move to vault',
        confirm: true,
        onSubmit: async (pin) => {
          const result = await pinRequest('/meetings/' + meetingId + '/vault', 'POST', pin);
          return result.ok ? null : (result.data.message || 'Something went wrong');
        }
      });
      if (ok) navigate('/app/meetings');
    });
  }

  // ---- owner: sharing ----
  el.querySelector('#inviteBtn').addEventListener('click', async () => {
    const status = el.querySelector('#inviteStatus');
    const emailInput = el.querySelector('#inviteEmail');
    const email = emailInput.value.trim();
    status.classList.remove('error');

    if (!email) { status.classList.add('error'); status.textContent = 'Enter an email address.'; return; }

    const res = await call(el, meetingId, '/meetings/' + meetingId + '/collaborators', 'POST', {
      email,
      role: el.querySelector('#inviteRole').value
    });
    if (!res) return;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) { status.classList.add('error'); status.textContent = data.message || 'Could not invite that person.'; return; }

    emailInput.value = '';
    status.textContent = 'Invited ' + data.collaborator.name + '.';
    refreshCollaborators(el, meetingId);
  });

  attachCollabRowHandlers(el, meetingId);
};
