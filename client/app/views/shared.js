import { apiFetch } from '../../shared/api.js';
import { escapeHtml, renderSkeleton, renderEmptyState } from '../../shared/dom.js';

export const renderShared = async (el) => {
  el.innerHTML = `
    <div class="page-header"><h2 class="section-title">Shared with me</h2></div>
    <div id="sharedList">${renderSkeleton(3)}</div>
  `;
  const listEl = el.querySelector('#sharedList');

  try {
    const res = await apiFetch('/meetings/shared');
    if (!res.ok) throw new Error('Failed to load shared meetings');
    const { meetings } = await res.json();

    if (meetings.length === 0) {
      listEl.innerHTML = renderEmptyState({
        icon: 'ti-users',
        title: 'Nothing shared with you yet',
        subtitle: 'When someone invites you to a meeting, it will show up here.'
      });
      return;
    }

    listEl.innerHTML = meetings.map((m) => `
      <a href="/app/meetings/${m.id}" data-link style="text-decoration:none">
        <div class="list-card meeting-card">
          <div style="flex:1">
            <div class="list-card-title">${escapeHtml(m.title || m.meeting_code)}</div>
            <div class="list-card-meta">${escapeHtml(m.meeting_code)} · Shared by ${escapeHtml(m.owner_name)} · ${new Date(m.created_at).toLocaleDateString()}</div>
          </div>
          <span class="badge badge-${m.access_role}">${m.access_role === 'editor' ? 'Editor' : 'Viewer'}</span>
        </div>
      </a>
    `).join('');
  } catch (err) {
    console.error(err);
    listEl.innerHTML = renderEmptyState({ icon: 'ti-alert-triangle', title: 'Could not load shared meetings' });
  }
};
