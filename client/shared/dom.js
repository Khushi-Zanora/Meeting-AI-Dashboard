// Prevents user-provided text (meeting titles, task text, etc.) from being
// interpreted as HTML when inserted via innerHTML — the frontend's equivalent
// of parameterized SQL queries.
export const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
};

export const renderSkeleton = (count = 3) => {
  return Array(count).fill('<div class="skeleton-row"></div>').join('');
};

export const renderEmptyState = ({ icon = 'ti-inbox', title, subtitle, ctaLabel, ctaHref }) => `
  <div class="empty-card">
    <i class="ti ${icon}" aria-hidden="true"></i>
    <h3>${title}</h3>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
    ${ctaLabel && ctaHref ? `<a href="${ctaHref}" data-link><button class="btn-primary" style="width:auto;padding:9px 18px">${ctaLabel}</button></a>` : ''}
  </div>
`;