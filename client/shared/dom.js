// Prevents user-provided text (meeting titles, task text, etc.) from being
// interpreted as HTML when inserted via innerHTML — the frontend's equivalent
// of parameterized SQL queries.
export const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
};