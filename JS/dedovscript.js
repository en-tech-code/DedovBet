  // Password Strength Meter
  function updatePasswordStrength(input) {
    const password = input.value;
    const meterFill = document.getElementById('strength-meter-fill');
    const criteriaList = document.getElementById('strength-criteria').children;
    
    // Check criteria
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*]/.test(password);
    
    // Update checkboxes
    updateCriteria(criteriaList[0], hasMinLength);
    updateCriteria(criteriaList[1], hasUpperCase);
    updateCriteria(criteriaList[2], hasNumber);
    updateCriteria(criteriaList[3], hasSymbol);
    
    // Calculate strength (0-100)
    const strength = Math.min(
      100,
      (password.length / 8) * 25 + // Length contributes up to 25%
      (hasUpperCase ? 25 : 0) +     // Uppercase: 25%
      (hasNumber ? 25 : 0) +        // Number: 25%
      (hasSymbol ? 25 : 0)          // Symbol: 25%
    );
    
    // Update progress bar
    meterFill.style.width = `${strength}%`;
    meterFill.style.background = 
      strength < 40 ? 'red' :
      strength < 80 ? 'orange' : 'green';
  }
  
  function updateCriteria(element, isValid) {
    if (isValid) {
      element.classList.add('valid');
    } else {
      element.classList.remove('valid');
    }
  }

  // Form Validation (on submit)
  function submitForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input');
    let isValid = true;
    const errorDiv = form.querySelector('.error-message') || document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.color = 'red';
    errorDiv.style.marginTop = '10px';
    form.appendChild(errorDiv);
    errorDiv.innerHTML = '';

    // Validate each field
    inputs.forEach(input => {
      input.style.border = '1px solid #666'; // Reset border

      if (input.value.trim() === '') {
        isValid = false;
        input.style.border = '2px solid red';
        errorDiv.innerHTML += `• ${input.placeholder} is required<br>`;
      } else if (input.type === 'password' && formId === 'registerForm') {
        const password = input.value;
        let errors = [];
        if (password.length < 8) errors.push('8+ characters');
        if (!/\d/.test(password)) errors.push('1 number');
        if (!/[!@#$%^&*]/.test(password)) errors.push('1 symbol (!@#$%^&*)');
        
        if (errors.length > 0) {
          isValid = false;
          input.style.border = '2px solid red';
          errorDiv.innerHTML += `• Password needs: ${errors.join(', ')}<br>`;
        }
      } else if (input.placeholder.toLowerCase().includes('email')) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
          isValid = false;
          input.style.border = '2px solid red';
          errorDiv.innerHTML += '• Enter a valid email (e.g., test@test.com)<br>';
        }
      }
    });

    // Check password match (for registration)
    if (formId === 'registerForm') {
      const password = document.querySelector('#registerForm input[type="password"]').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      if (password !== confirmPassword) {
        isValid = false;
        document.getElementById('confirm-password').style.border = '2px solid red';
        errorDiv.innerHTML += '• Passwords do not match<br>';
      }
    }

    if (isValid) {
      errorDiv.style.color = 'green';
      errorDiv.innerHTML = formId === 'registerForm' ? '✓ Registration successful!' : '✓ Login successful!';
      setTimeout(() => form.style.display = 'none', 1500);
    }
  }

  // Close form
  function closeForm(formId) {
    document.getElementById(formId).style.display = 'none';
    // Clear errors
    const errorDiv = document.querySelector(`#${formId} .error-message`);
    if (errorDiv) errorDiv.innerHTML = '';
  }
