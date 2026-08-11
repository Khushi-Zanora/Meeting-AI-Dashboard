export const validateSignupInput = ({ name, email, password, confirmPassword }) => {
  const errors = [];

if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }



};