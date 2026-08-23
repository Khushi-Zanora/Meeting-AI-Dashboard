const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const formStatus = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');
const toggleBtn = document.getElementById('togglePassword');

toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  emailError.textContent = '';
  passwordError.textContent = '';
  formStatus.textContent = '';

  let hasError = false;
  if (!emailInput.value.trim()) { emailError.textContent = 'Email is required'; hasError = true; }
  if (!passwordInput.value) { passwordError.textContent = 'Password is required'; hasError = true; }
  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // required so the refresh-token cookie actually gets set
      body: JSON.stringify({ email: emailInput.value.trim(), password: passwordInput.value })
    });

    const data = await res.json();

    if (!res.ok) {
      formStatus.classList.add('error');
      formStatus.textContent = data.message || 'Login failed';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
      return;
    }

    // No token to store here — the refresh cookie is already set by the browser.
    // The app shell will call initAuth() on load to get a fresh access token from it.
    window.location.href = '/app/dashboard';

  } catch (err) {
    formStatus.classList.add('error');
    formStatus.textContent = 'Could not reach the server';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});