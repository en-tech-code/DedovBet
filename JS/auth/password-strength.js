export function updatePasswordStrength(input) {
  const password = input.value;
  const meterFill = document.getElementById('strength-meter-fill');
  const criteria = document.getElementById('strength-criteria')?.children;

  if (!meterFill || !criteria) return;

  const rules = [
    { test: password.length >= 8, element: criteria[0] },
    { test: /[A-Z]/.test(password), element: criteria[1] },
    { test: /\d/.test(password), element: criteria[2] },
    { test: /[!@#$%^&*]/.test(password), element: criteria[3] }
  ];

  let strength = 0;
  rules.forEach(rule => {
    rule.element?.classList.toggle('valid', rule.test);
    //Change the color of the criteria text based on validity
    // rule.element.style.color = rule.test ? 'green' : '';
     
    if (rule.test) strength += 25;
  });

  meterFill.style.width = `${strength}%`;
  meterFill.style.background = strength < 40 ? 'red' : strength < 80 ? 'orange' : '#4CAF50';
}

export function checkPasswordMatch() {
  const password = document.getElementById('register-password')?.value;
  const confirm = document.getElementById('confirm-password')?.value;
  const matchText = document.getElementById('password-match-text');
  
  if (!matchText) return;
  
  if (!confirm) {
    // No text if confirm field is empty
    matchText.textContent = '';
    matchText.className = '';
  } else if (password === confirm) {
    matchText.textContent = '✓ Passwords match';
    matchText.className = 'match';
  } else {
    matchText.textContent = '✗ Passwords do not match';
    matchText.className = 'mismatch';
  }
}

export function validatePassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*]/.test(password)
  );
}