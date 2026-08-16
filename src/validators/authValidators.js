export const validateSignupInput = ({ name, email, password, confirmPassword }) => {
  const errors = [];

    if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('A valid email is required');
  }

    if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  return { valid: errors.length === 0, errors };
};

export const validateLoginInput = ({ email, password }) => {
  const errors = [];

  if (!email || !email.trim()) {
    errors.push('Email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  return { valid: errors.length === 0, errors };
};
