import { openForm, closeForm, submitForm } from './auth/form-handlers.js';
import { updateAccountMenu, setupAccountDropdown } from './ui/account-menu.js';
import { updatePasswordStrength, checkPasswordMatch } from './auth/password-strength.js';
import { initRouletteGame } from './games/roulette.js';
import './ui/balance-display.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize account menu
  updateAccountMenu();
  setupAccountDropdown();

  // Initialize roulette game with proper event listeners
  initRouletteGame();

  // Form openers
  document.getElementById('login-btn')?.addEventListener('click', () => openForm('loginForm'));
  document.getElementById('register-btn')?.addEventListener('click', () => openForm('registerForm'));

  // Form closers
  document.querySelectorAll('[data-form-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeForm(btn.dataset.formClose);
    });
  });

  document.querySelectorAll('[data-form-submit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      submitForm(btn.dataset.formSubmit);
    });
  });

  // Password strength
  document.getElementById('register-password')?.addEventListener('input', (e) => {
    updatePasswordStrength(e.target);
  });
  
  document.getElementById('confirm-password')?.addEventListener('input', checkPasswordMatch);

  // Login form real-time validation
  setupLoginValidation();

  // Password visibility toggles
  setupPasswordToggles();
  
  // Sidebar and bet slip toggles
  document.getElementById('open-sidebar')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('active');
  });
  document.getElementById('open-betslip')?.addEventListener('click', () => {
    document.querySelector('.bet-slip')?.classList.toggle('active');
  });
  document.getElementById('open-betslip-menu')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.remove('active');
    document.querySelector('.bet-slip')?.classList.add('active');
  });

  // Generate date dropdown options
  generateDateOptions();

  // Setup Enter key submission
  setupEnterKeySubmission();
});

// Function to generate all date-related dropdowns
function generateDateOptions() {
  // Generate days (1-31)
  const daySelect = document.getElementById('dob-day');
  if (daySelect) {
    daySelect.innerHTML = '<option value="">Day</option>';
    
    for (let day = 1; day <= 31; day++) {
      const option = document.createElement('option');
      option.value = day;
      option.textContent = day;
      daySelect.appendChild(option);
    }
  }
  
  // Generate months
  const monthSelect = document.getElementById('dob-month');
  if (monthSelect) {
    const months = [
      { value: 1, name: 'January' },
      { value: 2, name: 'February' },
      { value: 3, name: 'March' },
      { value: 4, name: 'April' },
      { value: 5, name: 'May' },
      { value: 6, name: 'June' },
      { value: 7, name: 'July' },
      { value: 8, name: 'August' },
      { value: 9, name: 'September' },
      { value: 10, name: 'October' },
      { value: 11, name: 'November' },
      { value: 12, name: 'December' }
    ];
    
    monthSelect.innerHTML = '<option value="">Month</option>';
    
    months.forEach(month => {
      const option = document.createElement('option');
      option.value = month.value;
      option.textContent = month.name;
      monthSelect.appendChild(option);
    });
  }
  
  // Generate years (1900 to current year)
  const yearSelect = document.getElementById('dob-year');
  if (yearSelect) {
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '<option value="">Year</option>';
    
    for (let year = currentYear; year >= 1900; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }
  }
}

// Function to handle password visibility toggles
function setupPasswordToggles() {
  // Individual password toggles for registration form
  const togglePassword = document.getElementById('toggle-password');
  const passwordField = document.getElementById('register-password');
  const confirmPasswordField = document.getElementById('confirm-password');
  
  // Login password toggle
  const toggleLoginPassword = document.getElementById('toggle-login-password');
  const loginPasswordField = document.getElementById('login-password');
  
  // Make the password toggle control both password fields
  if (togglePassword && passwordField && confirmPasswordField) {
    togglePassword.addEventListener('click', () => {
      // Toggle both password fields with one button
      const isPasswordVisible = passwordField.type === 'text';
      
      if (isPasswordVisible) {
        // Change both back to hidden password
        passwordField.type = 'password';
        confirmPasswordField.type = 'password';
        togglePassword.textContent = '👁️';
      } else {
        // Show both passwords
        passwordField.type = 'text';
        confirmPasswordField.type = 'text';
        togglePassword.textContent = '✕';
      }
    });
  }
  
  // Login form password toggle remains the same
  if (toggleLoginPassword && loginPasswordField) {
    toggleLoginPassword.addEventListener('click', () => {
      togglePasswordVisibility(loginPasswordField, toggleLoginPassword);
    });
  }
}

// Helper function for the login password toggle
function togglePasswordVisibility(inputField, toggleIcon) {
  if (inputField.type === 'password') {
    inputField.type = 'text';
    toggleIcon.textContent = '✕';
  } else {
    inputField.type = 'password';
    toggleIcon.textContent = '👁️';
  }
}

// Function to setup Enter key submission for forms
function setupEnterKeySubmission() {
  // For login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const loginInputs = loginForm.querySelectorAll('input');
    loginInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitForm('loginForm');
        }
      });
    });
  }
  
  // For registration form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    const registerInputs = registerForm.querySelectorAll('input');
    registerInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitForm('registerForm');
        }
      });
    });
  }
}

// Function to setup real-time login form validation
function setupLoginValidation() {
  const loginInput = document.getElementById('login-input');
  const loginPassword = document.getElementById('login-password');
  
  if (loginInput) {
    loginInput.addEventListener('input', (e) => {
      validateLoginInput(e.target);
    });
    
    loginInput.addEventListener('blur', (e) => {
      validateLoginInput(e.target);
    });
  }
  
  if (loginPassword) {
    loginPassword.addEventListener('input', (e) => {
      validateLoginPassword(e.target);
    });
    
    loginPassword.addEventListener('blur', (e) => {
      validateLoginPassword(e.target);
    });
  }
}

// Validate login input (username/email)
function validateLoginInput(inputElement) {
  const value = inputElement.value.trim();
  
  // Remove previous validation classes
  inputElement.classList.remove('input-error', 'input-valid');
  
  if (value.length === 0) {
    // No validation styling for empty input (neutral state)
    return;
  }
  
  if (value.length < 3) {
    inputElement.classList.add('input-error');
    return;
  }
  
  // If it contains @, validate as email
  if (value.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
      inputElement.classList.add('input-valid');
    } else {
      inputElement.classList.add('input-error');
    }
  } else {
    // Username validation
    if (value.length >= 3) {
      inputElement.classList.add('input-valid');
    } else {
      inputElement.classList.add('input-error');
    }
  }
}

// Validate login password
function validateLoginPassword(inputElement) {
  const value = inputElement.value;
  
  // Remove previous validation classes
  inputElement.classList.remove('input-error', 'input-valid');
  
  if (value.length === 0) {
    // No validation styling for empty input (neutral state)
    return;
  }
  
  if (value.length < 6) {
    inputElement.classList.add('input-error');
  } else {
    inputElement.classList.add('input-valid');
  }
}