import { registerUser as apiRegisterUser, validateLogin as apiValidateLogin } from './user-accounts.js';
import { validatePassword } from './password-strength.js';
import { updateAccountMenu } from '../ui/account-menu.js';

export function openForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.style.display = 'block';
    
    // Clear any previous validation states
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
      input.classList.remove('input-error', 'input-valid');
    });
    
    // Clear error messages
    const errorDiv = form.querySelector('.error-message');
    if (errorDiv) {
      errorDiv.textContent = '';
    }
    
    // Focus on the first input
    const firstInput = form.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

export function closeForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.style.display = 'none';
    form.querySelector('.error-message').textContent = '';
    form.reset?.();
  }
}

export async function submitForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  const errorDiv = form.querySelector('.error-message');
  errorDiv.textContent = '';
  errorDiv.style.color = '';

  if (formId === 'registerForm') {
    const name = form.querySelector('#register-name').value.trim();
    const surname = form.querySelector('#register-surname').value.trim();
    const username = form.querySelector('#register-username').value.trim();
    const email = form.querySelector('#register-email').value.trim();
    const password = form.querySelector('#register-password').value;
    const confirmPassword = form.querySelector('#confirm-password').value;
    const dobDay = form.querySelector('#dob-day').value;
    const dobMonth = form.querySelector('#dob-month').value;
    const dobYear = form.querySelector('#dob-year').value;
    const nationality = form.querySelector('#register-nationality').value;

    if (password !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.style.color = 'red';
      return;
    }

    if (!validatePassword(password)) {
      errorDiv.textContent = 'Password does not meet requirements';
      errorDiv.style.color = 'red';
      return;
    }

    // Ensure data is properly formatted
    const dateOfBirth = dobYear && dobMonth && dobDay 
      ? `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`
      : '';
    
    // Log the data to verify it's properly formatted
    console.log('Registration data:', {
      name, surname, username, email, password, dateOfBirth, nationality
    });

    const userData = {
      name: name.trim() || undefined,       // Only include if not empty
      surname: surname.trim() || undefined, // Only include if not empty
      username: username.trim(),
      email: email.trim(),
      password: password,
      dateOfBirth: dateOfBirth || undefined, // Only include if not empty
      nationality: nationality || undefined  // Only include if not empty
    };

    try {
      const result = await apiRegisterUser(userData);


    if (result.success) {
      // Auto-login after registration
      const loginResult = await apiValidateLogin(username, password);
      
      if (loginResult.success) {
        errorDiv.textContent = 'Registration successful! Logging you in...';
        errorDiv.style.color = '#4CAF50';
        setTimeout(() => {
          closeForm(formId);
          updateAccountMenu();
          window.location.reload();
        }, 2000); // Reduced from 12000 to 2000 ms
      } else {
        errorDiv.textContent = 'Registration succeeded, but auto-login failed.';
        errorDiv.style.color = 'orange';
      }
    } else {
      errorDiv.textContent = result.message;
      errorDiv.style.color = 'red';
    }
  } 
    catch (error) {
      errorDiv.textContent = 'An error occurred during registration';
      errorDiv.style.color = 'red';
      console.error('Registration error:', error);
     }
    }  else if (formId === 'loginForm') {
    const loginInput = form.querySelector('#login-input').value.trim();
    const password = form.querySelector('#login-password').value;

    // Enhanced validation with specific error messages
    if (!loginInput) {
      errorDiv.textContent = 'Please enter your username or email';
      errorDiv.style.color = 'red';
      return;
    }

    if (!password) {
      errorDiv.textContent = 'Please enter your password';
      errorDiv.style.color = 'red';
      return;
    }

    // Basic email/username format validation
    if (loginInput.length < 3) {
      errorDiv.textContent = 'Username must be at least 3 characters long';
      errorDiv.style.color = 'red';
      return;
    }

    // If it looks like an email, validate email format
    if (loginInput.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginInput)) {
        errorDiv.textContent = 'Please enter a valid email address';
        errorDiv.style.color = 'red';
        return;
      }
    }

    if (password.length < 6) {
      errorDiv.textContent = 'Password must be at least 6 characters long';
      errorDiv.style.color = 'red';
      return;
    }

    try {
      const result = await apiValidateLogin(loginInput, password);

      if (result.success) {
        const welcomeName = result.user.name ? result.user.name : result.user.username;
        errorDiv.textContent = `Welcome back, ${welcomeName}!`;
        errorDiv.style.color = '#4CAF50';
        setTimeout(() => {
          closeForm(formId);
          updateAccountMenu();
          window.location.reload();
        }, 1500);
      } else {
        errorDiv.textContent = result.message;
        errorDiv.style.color = 'red';
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Enhanced error handling with helpful suggestions
      if (error.message.includes('not found')) {
        errorDiv.textContent = 'Username or email not found. Please check your credentials or register a new account.';
      } else if (error.message.includes('password')) {
        errorDiv.textContent = 'Incorrect password. Please try again or reset your password.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorDiv.textContent = 'Connection error. Please check your internet connection and try again.';
      } else if (error.message.includes('Server error')) {
        errorDiv.textContent = 'Server is temporarily unavailable. Please try again in a few minutes.';
      } else {
        errorDiv.textContent = 'Login failed. Please verify your credentials and try again.';
      }
      errorDiv.style.color = 'red';
      
      // Add visual feedback to inputs based on error type
      if (error.message.includes('not found')) {
        form.querySelector('#login-input')?.classList.add('input-error');
      } else if (error.message.includes('password')) {
        form.querySelector('#login-password')?.classList.add('input-error');
      }
    }
  }
}