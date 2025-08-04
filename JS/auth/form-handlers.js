import { registerUser as apiRegisterUser, validateLogin as apiValidateLogin } from './user-accounts.js';
import { validatePassword } from './password-strength.js';
import { updateAccountMenu } from '../ui/account-menu.js';

export function openForm(formId) {
  document.getElementById(formId).style.display = 'block';
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

if (!loginInput || !password) {
      errorDiv.textContent = 'Please enter both username/email and password';
      errorDiv.style.color = 'red';
      return;
    }

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
  }
}