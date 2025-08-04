// User account system with session management
const users = JSON.parse(localStorage.getItem('dedovbet_users')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('current_user'));

export function registerUser(username, email, password) {
  if (users.some(user => user.email === email)) {
    return { success: false, message: 'Email already registered!' };
  }
  
  const newUser = { 
    username, 
    email, 
    password,
    balance: 1000, // Starting balance
    joinedDate: new Date().toISOString() 
  };
  
  users.push(newUser);
  localStorage.setItem('dedovbet_users', JSON.stringify(users));
  
  // Auto-login after registration
  sessionStorage.setItem('current_user', JSON.stringify(newUser));
  currentUser = newUser;
  
  return { success: true, user: newUser };
}

export function validateLogin(loginInput, password) {
  const users = JSON.parse(localStorage.getItem('dedovbet_users')) || [];
  let user = users.find(u => u.email === loginInput);
  if (!user) {
    user = users.find(u => u.username === loginInput);
    if (!user) return { success: false, message: 'Email or username not found' };
  }
  if (user.password !== password) return { success: false, message: 'Incorrect password' };

  sessionStorage.setItem('current_user', JSON.stringify(user));
  currentUser = user;
  return { success: true, user };
}

export function logout() {
  sessionStorage.removeItem('current_user');
  currentUser = null;
}

export function getCurrentUser() {
  return currentUser;
}