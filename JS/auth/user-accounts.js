// User account system with session management
let currentUser = JSON.parse(sessionStorage.getItem('current_user')) || null;

export async function registerUser(userData) {
  try {
    // Log the userData to verify what's being received
    console.log('Sending registration data:', userData);
    
    // Only include fields that have values
    const formattedData = {
      username: userData.username,
      email: userData.email,
      password: userData.password
    };
    
    // Add optional fields only if they exist
    if (userData.name) formattedData.name = userData.name;
    if (userData.surname) formattedData.surname = userData.surname;
    if (userData.dateOfBirth) formattedData.dateOfBirth = userData.dateOfBirth;
    if (userData.nationality) formattedData.nationality = userData.nationality;

    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedData)
    });
    
    // Better error handling for API responses
    if (!res.ok) {
      try {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Registration failed');
      } catch (e) {
        // If parsing JSON fails
        throw new Error('Registration failed: Server error');
      }
    }

    const data = await res.json();
    
    // Store in session
    sessionStorage.setItem('current_user', JSON.stringify(data.user));
    currentUser = data.user;
    return data;
    
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export async function validateLogin(loginInput, password) {
  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginInput, password })
    });

    if (!res.ok) throw new Error('Login failed');

    const data = await res.json();
    
    // Store with your required structure
    sessionStorage.setItem('current_user', JSON.stringify({
      username: data.user.username || "",
      name: data.user.name || "",
      surname: data.user.surname || "",
      email: data.user.email || "",
      password: "!", // Never store actual password
      dateOfBirth: data.user.dateOfBirth || "",
      nationality: data.user.nationality || "",
      balance: data.user.balance || 0,
      joinedDate: data.user.joinedDate || ""
    }));
    
    currentUser = JSON.parse(sessionStorage.getItem('current_user'));
    return data;
    
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Other functions remain the same
export function logout() {
  sessionStorage.removeItem('current_user');
  currentUser = null;
}

export function getCurrentUser() {
  return currentUser || JSON.parse(sessionStorage.getItem('current_user'));
}