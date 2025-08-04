// Balance Handler - Manages deposits, withdrawals and balance transactions
import { getCurrentUser } from './auth/user-accounts.js';

// Singleton instance
let instance = null;

/**
 * Balance Handler class - manages all user balance operations
 */
export class BalanceHandler {
  constructor() {
    if (instance) {
      return instance;
    }
    
    this.transactions = [];
    this.initializeFromUser();
    
    // Listen for user login/logout events
    window.addEventListener('userLoggedIn', () => this.initializeFromUser());
    window.addEventListener('userLoggedOut', () => this.reset());
    
    instance = this;
  }
  
  /**
   * Initialize balance from current user
   */
  initializeFromUser() {
    const user = getCurrentUser();
    if (user && typeof user.balance !== 'undefined') {
      this.balance = user.balance;
      this.username = user.username;
      this.loadTransactionHistory();
    } else {
      this.balance = 0;
      this.username = null;
      this.transactions = [];
    }
  }
  
  /**
   * Reset the handler when user logs out
   */
  reset() {
    this.balance = 0;
    this.username = null;
    this.transactions = [];
  }
  
  /**
   * Get current balance
   */
  getBalance() {
    return this.balance;
  }
  
  /**
   * Get formatted balance with currency symbol
   */
  getFormattedBalance() {
    return `$${this.balance.toFixed(2)}`;
  }
  
  /**
   * Place a bet
   * @param {number} amount - Bet amount
   * @param {string} gameType - Type of game (slots, roulette, etc.)
   * @param {object} details - Additional bet details
   * @returns {Promise<object>} Result of the bet
   */
  async placeBet(amount, gameType, details = {}) {
    if (!this.username) {
      return { success: false, error: 'User not logged in' };
    }
    
    if (amount <= 0) {
      return { success: false, error: 'Invalid bet amount' };
    }
    
    if (amount > this.balance) {
      return { success: false, error: 'Insufficient balance' };
    }
    
    try {
      // Deduct bet amount from balance
      this.balance -= amount;
      
      // Record transaction
      const transaction = {
        type: 'bet',
        amount: -amount,
        gameType,
        details,
        timestamp: new Date().toISOString(),
        balance: this.balance
      };
      
      this.transactions.unshift(transaction);
      
      // Persist balance to server
      await this.persistBalance();
      
      return { 
        success: true,
        balance: this.balance,
        transaction
      };
    } catch (error) {
      console.error('Error placing bet:', error);
      return { success: false, error: 'Failed to place bet' };
    }
  }
  
  /**
   * Process game result (win or loss)
   * @param {object} result - Game result
   * @returns {Promise<object>} Result of processing
   */
  async processGameResult(result) {
    if (!this.username) {
      return { success: false, error: 'User not logged in' };
    }
    
    try {
      if (result.isWin && result.winAmount > 0) {
        // Add winnings to balance
        this.balance += result.winAmount;
        
        // Record win transaction
        const transaction = {
          type: 'win',
          amount: result.winAmount,
          gameType: result.gameType,
          details: result.details,
          timestamp: new Date().toISOString(),
          balance: this.balance
        };
        
        this.transactions.unshift(transaction);
        
        // Persist balance to server
        await this.persistBalance();
        
        return { 
          success: true, 
          balance: this.balance,
          transaction 
        };
      } else {
        // Loss already recorded during placeBet
        return { 
          success: true, 
          balance: this.balance 
        };
      }
    } catch (error) {
      console.error('Error processing game result:', error);
      return { success: false, error: 'Failed to process game result' };
    }
  }
  
  /**
   * Make a deposit
   * @param {number} amount - Deposit amount
   * @param {string} method - Payment method
   * @returns {Promise<object>} Result of deposit
   */
  async deposit(amount, method = 'credit_card') {
    if (!this.username) {
      return { success: false, error: 'User not logged in' };
    }
    
    if (amount <= 0) {
      return { success: false, error: 'Invalid deposit amount' };
    }
    
    try {
      // Process deposit
      const depositResult = await fetch('http://localhost:3000/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          amount,
          method
        })
      });
      
      const data = await depositResult.json();
      
      if (!data.success) {
        return { success: false, error: data.message };
      }
      
      // Update local balance
      this.balance = data.balance;
      
      // Record transaction
      const transaction = {
        type: 'deposit',
        amount,
        method,
        timestamp: new Date().toISOString(),
        balance: this.balance,
        transactionId: data.transactionId
      };
      
      this.transactions.unshift(transaction);
      
      return { 
        success: true, 
        balance: this.balance,
        transaction 
      };
    } catch (error) {
      console.error('Error making deposit:', error);
      return { success: false, error: 'Failed to process deposit' };
    }
  }
  
  /**
   * Make a withdrawal
   * @param {number} amount - Withdrawal amount
   * @param {string} method - Payment method
   * @returns {Promise<object>} Result of withdrawal
   */
  async withdraw(amount, method = 'credit_card') {
    if (!this.username) {
      return { success: false, error: 'User not logged in' };
    }
    
    if (amount <= 0) {
      return { success: false, error: 'Invalid withdrawal amount' };
    }
    
    if (amount > this.balance) {
      return { success: false, error: 'Insufficient balance' };
    }
    
    try {
      // Process withdrawal
      const withdrawResult = await fetch('http://localhost:3000/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          amount,
          method
        })
      });
      
      const data = await withdrawResult.json();
      
      if (!data.success) {
        return { success: false, error: data.message };
      }
      
      // Update local balance
      this.balance = data.balance;
      
      // Record transaction
      const transaction = {
        type: 'withdrawal',
        amount: -amount,
        method,
        timestamp: new Date().toISOString(),
        balance: this.balance,
        transactionId: data.transactionId
      };
      
      this.transactions.unshift(transaction);
      
      return { 
        success: true, 
        balance: this.balance,
        transaction 
      };
    } catch (error) {
      console.error('Error making withdrawal:', error);
      return { success: false, error: 'Failed to process withdrawal' };
    }
  }
  
  /**
   * Get transaction history
   * @param {object} filters - Optional filters for transactions
   * @returns {Array} Filtered transactions
   */
  getTransactionHistory(filters = {}) {
    if (!this.username) {
      return [];
    }
    
    let filteredTransactions = [...this.transactions];
    
    // Apply filters if provided
    if (filters.type) {
      filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.timestamp) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.timestamp) <= toDate);
    }
    
    return filteredTransactions;
  }
  
  /**
   * Load transaction history from server
   */
  async loadTransactionHistory() {
    if (!this.username) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3000/api/transactions?username=${this.username}`);
      const data = await response.json();
      
      if (data.success) {
        this.transactions = data.transactions;
      }
    } catch (error) {
      console.error('Error loading transaction history:', error);
    }
  }
  
  /**
   * Persist balance to server and sessionStorage
   */
  async persistBalance() {
    if (!this.username) {
      return { success: false, error: 'User not logged in' };
    }
    
    try {
      // Update server
      const response = await fetch('http://localhost:3000/api/updateBalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          balance: this.balance
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        return { success: false, error: data.message };
      }
      
      // Update session storage
      const user = getCurrentUser();
      if (user) {
        user.balance = this.balance;
        sessionStorage.setItem('current_user', JSON.stringify(user));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error persisting balance:', error);
      return { success: false, error: 'Failed to persist balance' };
    }
  }
}

/**
 * Get the balance handler singleton instance
 */
export function getBalanceHandler() {
  return new BalanceHandler();
}