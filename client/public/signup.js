const form = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');
const toggleBtn = document.getElementById('togglePassword');
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

const errors = {
  name: document.getElementById('nameError'),
  email: document.getElementById('emailError'),
  password: document.getElementById('passwordError'),
  confirmPassword: document.getElementById('confirmPasswordError')
};

toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
});

const scorePassword = (value) => {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score; // 0-5
};

passwordInput.addEventListener('input', () => {
  const score = scorePassword(passwordInput.value);
  const percent = (score / 5) * 100;
  const levels = [
    { max: 1, color: 'var(--priority-high)', label: 'Weak' },
    { max: 3, color: 'var(--priority-medium)', label: 'Fair' },
    { max: 5, color: 'var(--priority-low)', label: 'Strong' }
  ];
  const level = levels.find(l => score <= l.max) || levels[levels.length - 1];

  strengthFill.style.width = `${percent}%`;
  strengthFill.style.background = level.color;
  strengthLabel.textContent = passwordInput.value ? level.label : '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  Object.values(errors).forEach(el => el.textContent = '');
  formStatus.textContent = '';
  formStatus.classList.remove('error');

  let hasError = false;
  if (nameInput.value.trim().length < 2) { errors.name.textContent = 'Enter your full name'; hasError = true; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) { errors.email.textContent = 'Enter a valid email'; hasError = true; }
  if (passwordInput.value.length < 8) { errors.password.textContent = 'At least 8 characters'; hasError = true; }
  if (passwordInput.value !== confirmInput.value) { errors.confirmPassword.textContent = 'Passwords do not match'; hasError = true; }
  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
        confirmPassword: confirmInput.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      formStatus.classList.add('error');
      formStatus.textContent = data.message || (data.errors && data.errors[0]) || 'Signup failed';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
      return;
    }

    window.location.href = '/app/dashboard';

  } catch (err) {
    formStatus.classList.add('error');
    formStatus.textContent = 'Could not reach the server';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});