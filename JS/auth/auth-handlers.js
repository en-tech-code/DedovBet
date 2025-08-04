import { setupForms } from './form-handlers.js';
import { initializeAuth } from './user-accounts.js';

export function initializeApp() {
  initializeAuth();
  setupForms();
}