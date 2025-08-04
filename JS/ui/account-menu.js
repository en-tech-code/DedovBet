import { getCurrentUser, logout } from '../auth/user-accounts.js';

export function updateAccountMenu() {
  const user = getCurrentUser();
  const authContainer = document.getElementById('auth-container');
  const accountMenu = document.getElementById('account-menu');
  
  if (!authContainer || !accountMenu) return;

  if (user) {
    authContainer.style.display = 'none';
    accountMenu.style.display = 'block';
    
    // Use first name if available, otherwise use username
    const displayName = user.name ? user.name : user.username;
    document.getElementById('account-username').textContent = displayName;
    document.getElementById('account-balance').textContent = `$${user.balance.toFixed(2)}`;
  } else {
    authContainer.style.display = 'flex';
    accountMenu.style.display = 'none';
  }
}

export function setupAccountDropdown() {
  const dropdown = document.getElementById('account-dropdown');
  const toggle = document.getElementById('account-toggle');
  
  toggle?.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });
  
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    updateAccountMenu();
  });
}