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
   * Get current balance - refreshes from session storage first
   */
  getBalance() {
    // Refresh from session storage to ensure we have the latest balance
    const user = getCurrentUser();
    if (user && typeof user.balance !== 'undefined') {
      this.balance = user.balance;
    }
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
        category: 'game', // Categorize as game transaction
        amount: -amount,
        gameType,
        details,
        timestamp: new Date().toISOString(),
        balance: this.balance
      };
      this.transactions.unshift(transaction);
      // Persist balance and transaction to server
      await this.persistBalance();
      await this.saveTransactionToServer(transaction);
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
          category: 'game', // Categorize as game transaction
          amount: result.winAmount,
          gameType: result.gameType,
          details: result.details,
          timestamp: new Date().toISOString(),
          balance: this.balance
        };
        this.transactions.unshift(transaction);
        // Persist balance and transaction to server
        await this.persistBalance();
        await this.saveTransactionToServer(transaction);
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
  async deposit(amount, method = 'demo') {
    if (!this.username) {
      return { success: false, error: 'User not logged in' };
    }
    if (amount < 10) {
      return { success: false, error: 'Minimum deposit is $10' };
    }
    if (amount > 9999) {
      return { success: false, error: 'Maximum deposit is $9,999' };
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
        category: 'account', // Categorize as account transaction
        amount,
        method,
        timestamp: new Date().toISOString(),
        balance: this.balance,
        transactionId: data.transactionId
      };
      this.transactions.unshift(transaction);
      // Persist transaction to server
      await this.saveTransactionToServer(transaction);
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
    if (amount < 25) {
      return { success: false, error: 'Minimum withdrawal is $25' };
    }
    if (amount > 5000) {
      return { success: false, error: 'Maximum withdrawal is $5,000' };
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
        category: 'account', // Categorize as account transaction
        amount: -amount,
        method,
        timestamp: new Date().toISOString(),
        balance: this.balance,
        transactionId: data.transactionId
      };
      this.transactions.unshift(transaction);
      // Persist transaction to server
      await this.saveTransactionToServer(transaction);
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
      console.log('No username, returning empty transaction history');
      return [];
    }
    
    console.log('Getting transaction history with filters:', filters);
    console.log('Total transactions before filtering:', this.transactions.length);
    
    let filteredTransactions = [...this.transactions];
    
    // Apply category filter first (account vs game transactions)
    if (filters.category && filters.category !== 'all') {
      console.log(`Filtering by category: ${filters.category}`);
      filteredTransactions = filteredTransactions.filter(t => t.category === filters.category);
    }
    
    // Apply transaction type filter (deposit, withdrawal, bet, win)
    if (filters.type) {
      console.log(`Filtering by type: ${filters.type}`);
      filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
    }
    // Date filtering: only compare date part (YYYY-MM-DD)
    if (filters.dateFrom) {
      const fromDateStr = filters.dateFrom;
      filteredTransactions = filteredTransactions.filter(t => {
        const txDate = t.timestamp ? t.timestamp.slice(0, 10) : '';
        return txDate >= fromDateStr;
      });
    }
    if (filters.dateTo) {
      const toDateStr = filters.dateTo;
      filteredTransactions = filteredTransactions.filter(t => {
        const txDate = t.timestamp ? t.timestamp.slice(0, 10) : '';
        return txDate <= toDateStr;
      });
    }
    return filteredTransactions;
  }

  /**
   * Load transaction history from server
   * @param {boolean} forceReload - Force reload from server even if transactions are already loaded
   * @returns {Promise<boolean>} Success status
   */
  async loadTransactionHistory(forceReload = false) {
    if (!this.username) {
      console.log('Cannot load transactions: No username');
      return false;
    }
    
    // If transactions are already loaded and force reload is not requested, return true
    if (this.transactions.length > 0 && !forceReload) {
      console.log('Using cached transactions (length:', this.transactions.length, ')');
      return true;
    }
    
    try {
      console.log('Loading transactions for user:', this.username, forceReload ? '(forced reload)' : '');
      
      const response = await fetch(`http://localhost:3000/api/transactions?username=${this.username}&_t=${Date.now()}`);
      if (!response.ok) {
        console.error('Server returned an error:', response.status, response.statusText);
        return false;
      }
      
      const data = await response.json();
      console.log('Transaction API response:', data);
      
      if (data.success && Array.isArray(data.transactions)) {
        this.transactions = data.transactions;
        console.log(`Loaded ${this.transactions.length} transactions`);
        return true;
      } else {
        console.warn('No transactions found or invalid response format');
        this.transactions = []; // Ensure this is an empty array not undefined
        return false;
      }
    } catch (error) {
      console.error('Error loading transaction history:', error);
      this.transactions = []; // Ensure this is an empty array not undefined
      return false;
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
        
        // Dispatch a custom event that components can listen for
        const balanceUpdateEvent = new CustomEvent('balanceUpdated', {
          detail: {
            balance: this.balance,
            username: this.username
          }
        });
        window.dispatchEvent(balanceUpdateEvent);
      }
      return { success: true };
    } catch (error) {
      console.error('Error persisting balance:', error);
      return { success: false, error: 'Failed to persist balance' };
    }
  }

  /**
   * Refund a bet amount (for canceled bets)
   * @param {number} amount - Refund amount
   * @param {string} gameType - Type of game
   * @returns {Promise<object>} Result of refund
   */
  async refundBet(amount, gameType = 'roulette') {
    if (!this.username) {
      return { success: false, error: 'User not logged in' };
    }
    if (amount <= 0) {
      return { success: false, error: 'Invalid refund amount' };
    }
    try {
      // Add refund amount to balance
      this.balance += amount;
      // Record transaction
      const transaction = {
        type: 'refund',
        category: 'game',
        amount: amount,
        gameType,
        details: { reason: 'Bet canceled' },
        timestamp: new Date().toISOString(),
        balance: this.balance
      };
      this.transactions.unshift(transaction);
      // Persist balance and transaction to server
      await this.persistBalance();
      await this.saveTransactionToServer(transaction);
      return {
        success: true,
        balance: this.balance,
        transaction
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return { success: false, error: 'Failed to process refund' };
    }
  }

  /**
   * Save a transaction to the server for persistence
   * @param {object} transaction
   */
  async saveTransactionToServer(transaction) {
    if (!this.username) {
      console.log('Cannot save transaction: No username');
      return;
    }
    try {
      console.log('Saving transaction for user:', this.username, transaction);
      const response = await fetch('http://localhost:3000/api/saveTransaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          transaction
        })
      });
      const result = await response.json();
      console.log('Transaction save response:', result);
      
      if (!result.success) {
        console.error('Failed to save transaction:', result.message);
      }
    } catch (error) {
      console.error('Error saving transaction to server:', error);
    }
  }
}

/**
 * Get the balance handler singleton instance
 */
export function getBalanceHandler() {
  return new BalanceHandler();
}