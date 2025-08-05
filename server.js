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
    joinedDate: new Date().toISOString(),
    transactions: [] // Initialize empty transactions array
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

// Get user balance endpoint
app.get('/api/getBalance', (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, balance: user.balance || 0 });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Deposit endpoint
app.post('/api/deposit', (req, res) => {
  try {
    const { username, amount, method } = req.body;
    let users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (amount < 10) {
      return res.status(400).json({ success: false, message: 'Deposit amount must be at least $10' });
    }
    if (amount > 9999) {
      return res.status(400).json({ success: false, message: 'Maximum deposit amount is $9,999' });
    }
    
    // Generate transaction ID
    const transactionId = `dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    console.log(`Processing deposit for ${username}: $${amount} via ${method}, ID: ${transactionId}`);
    
    // Update user balance
    user.balance += amount;
    writeUsers(users);
    res.json({ 
      success: true, 
      balance: user.balance,
      transactionId
    });
  } catch (error) {
    console.error('Error processing deposit:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Withdrawal endpoint
app.post('/api/withdraw', (req, res) => {
  try {
    const { username, amount, method } = req.body;
    let users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (amount < 25) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is $25' });
    }
    if (amount > 5000) {
      return res.status(400).json({ success: false, message: 'Maximum withdrawal amount is $5,000' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    
    // Generate transaction ID
    const transactionId = `wit_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    console.log(`Processing withdrawal for ${username}: $${amount} via ${method}, ID: ${transactionId}`);
    
    // Update user balance
    user.balance -= amount;
    writeUsers(users);
    res.json({ 
      success: true, 
      balance: user.balance,
      transactionId
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

  // Transaction history endpoint
app.get('/api/transactions', (req, res) => {
  try {
    const { username } = req.query;
    console.log(`Request for transactions from user: ${username}`);
    
    let users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user) {
      console.error(`User not found: ${username}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize transactions array if it doesn't exist
    if (!Array.isArray(user.transactions)) {
      console.log(`Creating transactions array for user: ${username}`);
      user.transactions = [];
      // Save the change to disk
      writeUsers(users);
    }
    
    console.log(`Returning ${user.transactions ? user.transactions.length : 0} transactions for user: ${username}`);
    
    res.json({ success: true, transactions: user.transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});// Save transaction endpoint
app.post('/api/saveTransaction', (req, res) => {
  const { username, transaction } = req.body;
  
  console.log('Save transaction request for user:', username);
  console.log('Transaction data:', JSON.stringify(transaction));
  
  if (!username || !transaction) {
    console.error('Missing username or transaction data');
    return res.status(400).json({ success: false, message: 'Missing username or transaction' });
  }
  
  let users = readUsers();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    console.error(`User not found: ${username}`);
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  console.log('Saving transaction for user:', username);
  
  // Ensure user has a transactions array
  if (!Array.isArray(users[userIndex].transactions)) {
    console.log(`Creating transactions array for user: ${username}`);
    users[userIndex].transactions = [];
  }
  
  // Add new transaction to the beginning
  users[userIndex].transactions.unshift(transaction);
  
  try {
    writeUsers(users);
    console.log(`Transaction saved successfully for ${username}. Total transactions: ${users[userIndex].transactions.length}`);
    
    // Log first 3 transactions for debugging
    if (users[userIndex].transactions.length > 0) {
      console.log('Recent transactions:', JSON.stringify(users[userIndex].transactions.slice(0, 3)));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to save transaction' });
  }
});

// Update user balance endpoint
app.post('/api/updateBalance', (req, res) => {
  try {
    const { username, balance } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    
    if (balance === undefined || isNaN(balance)) {
      return res.status(400).json({ success: false, message: 'Valid balance is required' });
    }
    
    let users = readUsers();
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log(`Updating balance for ${username}: ${users[userIndex].balance} -> ${balance}`);
    users[userIndex].balance = balance;
    
    writeUsers(users);
    res.json({ success: true, balance });
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({ success: false, message: 'Failed to update balance' });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));