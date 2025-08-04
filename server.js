const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const app = express();
const USERS_FILE = './users.json';

app.use(cors());
app.use(bodyParser.json());

// Helper to read users
function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, '[]');
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
}

// Helper to write users
function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
    throw new Error('Failed to save user data');
  }
}

// Register endpoint
app.post('/api/register', (req, res) => {
  console.log('Registration attempt:', req.body);
  
  const {
    name = "",
    surname = "",
    username,
    email,
    password,
    dateOfBirth = "",
    nationality = ""
  } = req.body;
  
  let users = readUsers();
  
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username, email and password are required' 
    });
  }

  if (users.find(u => typeof u.email === 'string' && u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already registered!' });
  }
  if (users.find(u => typeof u.username === 'string' && u.username === username)) {
    return res.status(400).json({ success: false, message: 'Username already taken!' });
  }
  
  // Create new user with all fields explicitly included
  const newUser = {
    username,
    email,
    password,
    balance: 1000,
    joinedDate: new Date().toISOString()
  };
  
  // Only add optional fields if they have values
  if (name) newUser.name = name;
  if (surname) newUser.surname = surname;
  if (dateOfBirth) newUser.dateOfBirth = dateOfBirth;
  if (nationality) newUser.nationality = nationality;
  
  users.push(newUser);
  writeUsers(users);
  console.log('User registered successfully:', newUser.username);
  res.json({ success: true, user: newUser });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { loginInput, password } = req.body;
  
  // Basic input validation
  if (!loginInput) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username or email is required' 
    });
  }
  
  if (!password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password is required' 
    });
  }
  
  // Trim inputs to prevent whitespace issues
  const trimmedInput = loginInput.trim();
  
  if (trimmedInput.length < 3) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username must be at least 3 characters long' 
    });
  }
  
  let users = readUsers();
  
  // Find user by email or username (case-insensitive search)
  let user = users.find(u => {
    if (!u.email || !u.username) return false;
    return (
      u.email.toLowerCase() === trimmedInput.toLowerCase() || 
      u.username.toLowerCase() === trimmedInput.toLowerCase()
    );
  });
  
  if (!user) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email or username not found' 
    });
  }
  
  if (user.password !== password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Incorrect password' 
    });
  }

  // Ensure all fields are present
  const safeUser = {
    name: user.name || "",
    surname: user.surname || "",
    username: user.username,
    email: user.email,
    password: user.password,
    dateOfBirth: user.dateOfBirth || "",
    nationality: user.nationality || "",
    balance: user.balance,
    joinedDate: user.joinedDate || ""
  };

  console.log('User logged in successfully:', user.username);
  res.json({ success: true, user: safeUser });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));