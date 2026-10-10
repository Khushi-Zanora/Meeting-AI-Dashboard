import { apiFetch } from './api.js';
import { setVaultToken } from './vault.js';

// Opens a PIN dialog. onSubmit(pin) must resolve to null on success, or an error message to show.
// The dialog stays open on error. Resolves true if it succeeded, false if cancelled.
export const openPinDialog = ({ title, message = '', submitLabel = 'Confirm', confirm = false, onSubmit }) => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="pinDialogTitle">
        <h3 class="modal-title" id="pinDialogTitle"></h3>
        <p class="modal-message" id="pinDialogMessage"></p>
        <div class="field-group">
          <label class="field-label" for="pinInput">PIN</label>
          <input class="field-input" type="password" id="pinInput" autocomplete="off" />
        </div>
        ${confirm ? '<div class="field-group"><label class="field-label" for="pinConfirm">Confirm PIN</label><input class="field-input" type="password" id="pinConfirm" autocomplete="off" /></div>' : ''}
        <p class="field-error modal-error" id="pinError"></p>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="pinCancel">Cancel</button>
          <button type="button" class="btn-primary" id="pinSubmit" style="width:auto;padding:9px 18px"></button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // textContent, never innerHTML, for anything that could contain user text
    overlay.querySelector('#pinDialogTitle').textContent = title;
    overlay.querySelector('#pinDialogMessage').textContent = message;
    overlay.querySelector('#pinSubmit').textContent = submitLabel;

    const pinInput = overlay.querySelector('#pinInput');
    const confirmInput = overlay.querySelector('#pinConfirm');
    const errorEl = overlay.querySelector('#pinError');
    const submitBtn = overlay.querySelector('#pinSubmit');
    let busy = false;

    const close = (result) => {
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('popstate', onPopState);
      overlay.remove();
      resolve(result);
    };

    const submit = async () => {
      if (busy) return;
      errorEl.textContent = '';
      const pin = pinInput.value;

      if (confirm) {
        if (pin.length < 4 || pin.length > 32) { errorEl.textContent = 'PIN must be 4 to 32 characters'; return; }
        if (pin !== confirmInput.value) { errorEl.textContent = 'PINs do not match'; return; }
      } else if (!pin) {
        errorEl.textContent = 'Enter your PIN';
        return;
      }

      busy = true;
      submitBtn.disabled = true;
      let error;
      try {
        error = await onSubmit(pin);
      } catch {
        error = 'Could not reach the server';
      }
      busy = false;
      submitBtn.disabled = false;

      if (error) { errorEl.textContent = error; pinInput.select(); return; }
      close(true);
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') submit();
    };
    const onPopState = () => close(false); // browser back button closes the dialog

    document.addEventListener('keydown', onKeydown);
    window.addEventListener('popstate', onPopState);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(false); });
    overlay.querySelector('#pinCancel').addEventListener('click', () => close(false));
    submitBtn.addEventListener('click', submit);

    pinInput.focus();
  });
};

// Sends { pin } to a vault endpoint. skip: it is not a login failure when the PIN is wrong.
export const pinRequest = async (path, method, pin) => {
  const res = await apiFetch(path, { method, body: JSON.stringify({ pin }) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
};

// Asks for the PIN and, on success, stores the 10-minute vault token in memory
export const promptUnlock = (meetingId) => openPinDialog({
  title: 'Unlock meeting',
  message: 'Enter the PIN you set for this meeting. Access lasts 10 minutes.',
  submitLabel: 'Unlock',
  onSubmit: async (pin) => {
    const result = await pinRequest('/meetings/' + meetingId + '/vault/unlock', 'POST', pin);
    if (!result.ok) return result.data.message || 'Could not unlock';
    setVaultToken(meetingId, result.data.vaultToken, result.data.expiresInSeconds);
    return null;
  }
});
