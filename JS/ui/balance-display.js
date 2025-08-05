import { getBalanceHandler } from '../balance-handler.js';

/**
 * Balance Display Component
 * Manages UI for balance display, deposits, withdrawals and history
 */
export class BalanceDisplay {
  constructor() {
    this.balanceHandler = getBalanceHandler();
    this.balanceElement = document.getElementById('account-balance');
    this.accountDropdown = document.getElementById('account-dropdown');
    this.initializeUI();
    this.setupEventListeners();
    this.observeDropdown();
    
    // Listen for balance update events
    window.addEventListener('balanceUpdated', (e) => {
      this.updateBalanceDisplay(e.detail.balance);
    });
    
    // Listen for dropdown update event
    window.addEventListener('accountDropdownUpdated', () => {
      this.accountDropdown = document.getElementById('account-dropdown');
      this.initializeUI();
    });
  }
  /**
   * Observe the account dropdown for visibility changes and re-initialize UI
   */
  observeDropdown() {
    if (!this.accountDropdown) return;
    // Observe style changes to detect when dropdown is shown
    const observer = new MutationObserver(() => {
      if (this.accountDropdown.style.display !== 'none') {
        this.initializeUI();
      }
    });
    observer.observe(this.accountDropdown, { attributes: true, attributeFilter: ['style'] });
  }
  
  /**
   * Initialize the UI elements
   */
  async initializeUI() {
    // Only proceed if the user is logged in
    if (!this.balanceHandler.username) return;

    // First refresh the balance from server
    await this.refreshBalance();

    // Add or update balance actions in account dropdown
    if (this.accountDropdown) {
      // Remove old actions if present (prevents duplicates)
      const oldActions = document.getElementById('balance-actions');
      if (oldActions) oldActions.remove();

      const actionsContainer = document.createElement('div');
      actionsContainer.id = 'balance-actions';
      actionsContainer.className = 'balance-actions';
      actionsContainer.style.marginTop = '10px';
      actionsContainer.style.display = 'flex';
      actionsContainer.style.gap = '5px';

      // Create action buttons
      const depositBtn = document.createElement('button');
      depositBtn.id = 'deposit-btn';
      depositBtn.className = 'balance-action-btn';
      depositBtn.textContent = 'Deposit';
      depositBtn.style.background = '#4CAF50';
      depositBtn.style.color = 'white';
      depositBtn.style.border = 'none';
      depositBtn.style.padding = '5px 10px';
      depositBtn.style.cursor = 'pointer';
      depositBtn.style.flex = '1';

      const withdrawBtn = document.createElement('button');
      withdrawBtn.id = 'withdraw-btn';
      withdrawBtn.className = 'balance-action-btn';
      withdrawBtn.textContent = 'Withdraw';
      withdrawBtn.style.background = '#ff9800';
      withdrawBtn.style.color = 'white';
      withdrawBtn.style.border = 'none';
      withdrawBtn.style.padding = '5px 10px';
      withdrawBtn.style.cursor = 'pointer';
      withdrawBtn.style.flex = '1';

      const historyBtn = document.createElement('button');
      historyBtn.id = 'history-btn';
      historyBtn.className = 'balance-action-btn';
      historyBtn.textContent = 'History';
      historyBtn.style.background = '#2196F3';
      historyBtn.style.color = 'white';
      historyBtn.style.border = 'none';
      historyBtn.style.padding = '5px 10px';
      historyBtn.style.cursor = 'pointer';
      historyBtn.style.flex = '1';

      const refreshBtn = document.createElement('button');
      refreshBtn.id = 'refresh-balance-btn';
      refreshBtn.className = 'balance-action-btn';
      refreshBtn.innerHTML = '&#x21bb;'; // Refresh icon
      refreshBtn.style.background = '#607D8B';
      refreshBtn.style.color = 'white';
      refreshBtn.style.border = 'none';
      refreshBtn.style.padding = '5px';
      refreshBtn.style.cursor = 'pointer';
      refreshBtn.style.width = '30px';

      // Add buttons to container
      actionsContainer.appendChild(depositBtn);
      actionsContainer.appendChild(withdrawBtn);
      actionsContainer.appendChild(historyBtn);
      actionsContainer.appendChild(refreshBtn);

      // Insert before logout button
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        this.accountDropdown.insertBefore(actionsContainer, logoutBtn);
      } else {
        this.accountDropdown.appendChild(actionsContainer);
      }
    }
    
    // Create transaction modal
    this.createTransactionModal();
    
    // Create history modal
    this.createHistoryModal();
  }
  
  /**
   * Create transaction modal for deposits and withdrawals
   */
  createTransactionModal() {
    // Check if modal already exists
    if (document.getElementById('transaction-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'transaction-modal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 350px;">
        <div class="modal-header">
          <h2 id="transaction-title">Deposit</h2>
          <span class="modal-close" id="close-transaction">✕</span>
        </div>
        <div class="modal-body">
          <div class="form-content">
            <label for="transaction-amount">Amount:</label>
            <input type="number" id="transaction-amount" min="10" max="500" step="1" value="100" style="width: 100%; font-size: 1.2em; margin-bottom: 10px; border-radius: 8px; border: 1px solid #ccc; padding: 8px 12px; background: #181818; color: #fff;">
            <div style="font-size: 0.95em; color: #4CAF50; margin-bottom: 8px;">Demo deposit: min $10, max $500</div>
            <div id="transaction-error" style="color: red; margin-top: 10px;"></div>
            <div id="transaction-success" style="color: green; margin-top: 10px;"></div>
            <div class="form-buttons">
              <button id="submit-transaction" style="background: #2196F3; color: white;">Submit</button>
              <button id="cancel-transaction" style="background: #f44336; color: white; margin-left: 10px;">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    // Remove scroll/stepper for input type=number
    const amountInput = modal.querySelector('#transaction-amount');
    amountInput.addEventListener('wheel', (e) => e.preventDefault());
    amountInput.addEventListener('keydown', (e) => {
      if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    });
    
    document.body.appendChild(modal);
  }
  
  /**
   * Create history modal for viewing transaction history
   */
  createHistoryModal() {
    // Check if modal already exists
    if (document.getElementById('history-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'history-modal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>Transaction History</h2>
          <span class="modal-close" id="close-history">✕</span>
        </div>
        <div class="modal-body">
          <div class="history-filters" style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <div style="display: flex; gap: 10px; align-items: center; margin-right: 20px;">
              <label for="history-category" style="white-space: nowrap;">Type:</label>
              <select id="history-category" style="min-width: 120px;">
                <option value="all">All Transactions</option>
                <option value="account">Account Only</option>
                <option value="game">Game Only</option>
              </select>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <label for="history-date-range" style="white-space: nowrap;">Period:</label>
              <select id="history-date-range" style="min-width: 120px;">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="month">Last Month</option>
                <option value="date">Specific Date</option>
              </select>
              <input type="date" id="history-specific-date" style="display:none;">
              <button id="apply-history-filters" style="background: #2196F3; color: white;">Apply</button>
            </div>
          </div>
          <div id="history-container" style="max-height: 400px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #333; color: white;">
                  <th style="padding: 8px; text-align: left;">Date</th>
                  <th style="padding: 8px; text-align: left;">Type</th>
                  <th style="padding: 8px; text-align: right;">Amount</th>
                  <th style="padding: 8px; text-align: right;">Balance</th>
                  <th style="padding: 8px; text-align: left;">Details</th>
                </tr>
              </thead>
              <tbody id="history-table-body">
                <!-- Transactions will be added here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    // Show/hide date input based on dropdown
    const rangeSelect = modal.querySelector('#history-date-range');
    const dateInput = modal.querySelector('#history-specific-date');
    rangeSelect.addEventListener('change', () => {
      dateInput.style.display = rangeSelect.value === 'date' ? '' : 'none';
    });
    // Set default date to today
    dateInput.value = new Date().toISOString().slice(0, 10);
    
    document.body.appendChild(modal);
  }
  
  /**
   * Set up event listeners for balance actions
   */
  setupEventListeners() {
    // Store reference to bound handler
    this.clickHandler = this.handleClick.bind(this);
    document.addEventListener('click', this.clickHandler);
    
    // Add cleanup method
    window.addEventListener('beforeunload', () => this.cleanup());
    
    // Listen for user login/logout events
    window.addEventListener('userLoggedIn', (e) => {
      this.balanceHandler.username = e.detail.user.username;
      this.balanceHandler.balance = e.detail.user.balance;
      this.updateBalanceDisplay();
      this.initializeUI();
    });
    
    window.addEventListener('userLoggedOut', () => {
      this.balanceHandler.username = null;
      this.balanceHandler.balance = 0;
      this.updateBalanceDisplay();
      this.initializeUI();
    });
    
    // Listen for balance update events
    window.addEventListener('balanceUpdated', (e) => {
      console.log('Balance updated event received:', e.detail);
      // Update local handler balance to match event data
      if (e.detail.username === this.balanceHandler.username) {
        this.balanceHandler.balance = e.detail.balance;
        this.updateBalanceDisplay();
      }
    });
  }
  
  // Separate method for the click handler
  handleClick(e) {
    if (e.target.id === 'deposit-btn') {
      this.showTransactionModal('deposit');
    }
    
    // Withdraw button
    if (e.target.id === 'withdraw-btn') {
      this.showTransactionModal('withdraw');
    }
    
    // History button
    if (e.target.id === 'history-btn') {
      this.showHistoryModal();
    }
    
    // Refresh balance button
    if (e.target.id === 'refresh-balance-btn') {
      this.refreshBalance();
    }
    
    // Transaction modal buttons
    if (e.target.id === 'submit-transaction') {
      this.processTransaction();
    }
    
    if (e.target.id === 'cancel-transaction' || e.target.id === 'close-transaction') {
      this.hideTransactionModal();
    }
    
    // History modal buttons
    if (e.target.id === 'close-history') {
      this.hideHistoryModal();
    }
    
    if (e.target.id === 'apply-history-filters') {
      this.applyHistoryFilters();
    }
  }
  
  // Cleanup method to remove listeners
  cleanup() {
    document.removeEventListener('click', this.clickHandler);
  }
  
  /**
   * Update the balance display
   * @param {number} balance - Optional balance to display
   */
  updateBalanceDisplay(balance) {
    if (this.balanceElement) {
      if (balance !== undefined) {
        this.balanceElement.textContent = `$${balance.toFixed(2)}`;
      } else {
        this.balanceElement.textContent = this.balanceHandler.getFormattedBalance();
      }
    }
  }
  
  /**
   * Refresh balance from server
   */
  async refreshBalance() {
    if (!this.balanceHandler.username) return;
    
    try {
      // Show loading state
      if (this.balanceElement) {
        this.balanceElement.innerHTML = '<span style="opacity: 0.7;">Loading...</span>';
      }
      
      // Get fresh balance from server
      const response = await fetch(`http://localhost:3000/api/getBalance?username=${this.balanceHandler.username}`);
      const data = await response.json();
      
      if (data.success) {
        // Update handler balance
        this.balanceHandler.balance = data.balance;
        
        // Update session storage
        const user = JSON.parse(sessionStorage.getItem('current_user'));
        if (user) {
          user.balance = data.balance;
          sessionStorage.setItem('current_user', JSON.stringify(user));
        }
        
        // Update display
        this.updateBalanceDisplay();
        
        console.log('Balance refreshed from server:', data.balance);
        
        // Show toast notification if it exists
        if (typeof this.showToast === 'function') {
          this.showToast('Balance refreshed!', 'success');
        }
        
        return data.balance;
      } else {
        console.error('Failed to refresh balance:', data.message);
        
        // Show toast notification if it exists
        if (typeof this.showToast === 'function') {
          this.showToast('Failed to refresh balance', 'error');
        }
        
        this.updateBalanceDisplay(); // Fallback to current balance
        return null;
      }
    } catch(error) {
      console.error('Error refreshing balance:', error);
      this.showToast('Connection error', 'error');
    }
  }
  
  /**
   * Show transaction modal (deposit or withdraw)
   */
  showTransactionModal(type) {
    const modal = document.getElementById('transaction-modal');
    if (!modal) return;
    
    // Add safety checks for all elements
    const title = document.getElementById('transaction-title');
    const submitBtn = document.getElementById('submit-transaction');
    const errorDiv = document.getElementById('transaction-error');
    const successDiv = document.getElementById('transaction-success');
    const amountInput = document.getElementById('transaction-amount');
    
    // Only proceed if all required elements exist
    if (!title || !submitBtn || !errorDiv || !successDiv || !amountInput) {
      console.error('Missing modal elements');
      return;
    }
    
    // Now safely use the elements
    amountInput.value = '100';
    errorDiv.textContent = '';
    successDiv.textContent = '';
    
    // Set up for deposit or withdraw
    if (type === 'deposit') {
      title.textContent = 'Deposit';
      submitBtn.textContent = 'Deposit Funds';
      submitBtn.style.background = '#4CAF50';
      modal.dataset.type = 'deposit';
    } else {
      title.textContent = 'Withdraw';
      submitBtn.textContent = 'Withdraw Funds';
      submitBtn.style.background = '#ff9800';
      modal.dataset.type = 'withdraw';
    }
    
    modal.style.display = 'flex';
  }
  
  /**
   * Hide transaction modal
   */
  hideTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  /**
   * Process transaction (deposit or withdraw)
   */
  async processTransaction() {
    const modal = document.getElementById('transaction-modal');
    if (!modal) return;
    const type = document.getElementById('transaction-title').textContent.toLowerCase();
    const amountInput = document.getElementById('transaction-amount');
    const errorDiv = document.getElementById('transaction-error');
    const successDiv = document.getElementById('transaction-success');
    errorDiv.textContent = '';
    successDiv.textContent = '';
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount < 10 || amount > 500) {
      errorDiv.textContent = 'Amount must be between $10 and $500.';
      amountInput.focus();
      return;
    }
    try {
      let result;
      if (type === 'deposit') {
        result = await this.balanceHandler.deposit(amount, 'demo');
      } else {
        result = await this.balanceHandler.withdraw(amount, 'credit_card');
      }
      if (result.success) {
        successDiv.textContent = `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} successful!`;
        this.updateBalanceDisplay();
        this.showToast(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${amount.toFixed(2)} successful!`, 'success');
        
        // Reload transaction history to ensure it's up to date
        await this.balanceHandler.loadTransactionHistory();
        
        // Close modal after a delay
        setTimeout(() => this.hideTransactionModal(), 2000);
      } else {
        errorDiv.textContent = result.error || 'Transaction failed';
      }
    } catch (error) {
      console.error(`Error processing ${type}:`, error);
      errorDiv.textContent = 'An error occurred. Please try again.';
    }
  }
  
  /**
   * Add a test transaction to the system
   */
  async addTestTransaction() {
    if (!this.balanceHandler.username) {
      console.log("Cannot add test transaction: No user logged in");
      return;
    }
    
    console.log("Adding test transaction for debugging");
    
    // Create a test deposit transaction
    await this.balanceHandler.deposit(100, 'test_method');
    
    // Create a test game transaction
    await this.balanceHandler.placeBet(10, 'roulette', { betType: 'red' });
    
    // Create a test win transaction
    await this.balanceHandler.processGameResult({
      isWin: true,
      winAmount: 20,
      gameType: 'roulette',
      details: { winNumber: 32, winColor: 'red' }
    });
    
    // Show success toast
    this.showToast('Test transactions added!', 'success');
  }
  
  /**
   * Show history modal and load transactions
   */
  async showHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (!modal) return;
    
    // Show loading state
    const tableBody = document.getElementById('history-table-body');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px;">
            <div>Loading transactions...</div>
          </td>
        </tr>
      `;
    }
    
    modal.style.display = 'flex';
    
    // Load latest transactions
    const loaded = await this.balanceHandler.loadTransactionHistory();
    console.log("Transaction loading result:", loaded);
    console.log("Transactions:", this.balanceHandler.transactions);
    
    // Display transactions regardless of whether they exist or not
    // The displayTransactions method will handle the empty case
    this.displayTransactions();
  }
  
  /**
   * Hide history modal
   */
  hideHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  /**
   * Apply filters to transaction history
   */
  applyHistoryFilters() {
    console.log("Applying history filters");
    
    // Get selected category
    const category = document.getElementById('history-category')?.value;
    console.log("Selected category:", category);
    
    // Get selected date range
    const range = document.getElementById('history-date-range')?.value;
    const dateInput = document.getElementById('history-specific-date');
    let dateFrom = null, dateTo = null;
    const today = new Date();
    if (range === 'today') {
      const todayStr = today.toISOString().slice(0, 10);
      dateFrom = dateTo = todayStr;
    } else if (range === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      dateFrom = dateTo = yestStr;
    } else if (range === '7days') {
      dateTo = today.toISOString().slice(0, 10);
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      dateFrom = d.toISOString().slice(0, 10);
    } else if (range === 'month') {
      dateTo = today.toISOString().slice(0, 10);
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      dateFrom = d.toISOString().slice(0, 10);
    } else if (range === 'date' && dateInput.value) {
      dateFrom = dateTo = dateInput.value;
    }
    
    // Build the filters object
    const filters = { dateFrom, dateTo };
    
    // Add category filter if not set to 'all'
    if (category && category !== 'all') {
      filters.category = category;
    }
    
    this.displayTransactions(filters);
  }
  
  /**
   * Display transactions in the history modal
   */
  displayTransactions(filters = {}) {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Get filtered transactions
    const transactions = this.balanceHandler.getTransactionHistory(filters);
    console.log('Displaying transactions with filters:', filters);
    console.log('Transactions to display:', transactions);
    
    if (!transactions || transactions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px;">
            No transactions found
          </td>
        </tr>
      `;
      return;
    }
    
    // Add transaction rows
    transactions.forEach(transaction => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #ddd';
      
      // Format date
      const date = new Date(transaction.timestamp);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      
      // Format type based on category and type
      let typeText = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
      let typeColor = '#333';
      let categoryBadge = '';
      
      // Determine colors and format type text based on transaction type
      if (transaction.type === 'deposit') {
        typeColor = '#4CAF50';
        typeText = 'Deposit';
      } else if (transaction.type === 'withdrawal') {
        typeColor = '#ff9800';
        typeText = 'Withdrawal';
      } else if (transaction.type === 'bet') {
        typeColor = '#f44336';
        typeText = 'Bet';
      } else if (transaction.type === 'win') {
        typeColor = '#2196F3';
        typeText = 'Win';
      }
      
      // Add category badge
      if (transaction.category === 'game') {
        categoryBadge = '<span style="font-size: 0.8em; background: #2c2c2c; color: #aaa; padding: 2px 4px; border-radius: 3px; margin-left: 5px;">GAME</span>';
      }
      
      // Format amount
      const amount = transaction.amount;
      const formattedAmount = `${amount >= 0 ? '+' : ''}${amount.toFixed(2)}`;
      const amountColor = amount >= 0 ? '#4CAF50' : '#f44336';
      
      // Format details based on transaction category
      let details = '';
      
      if (transaction.category === 'account') {
        // Account transaction details
        if (transaction.method) {
          details += `Payment method: ${transaction.method.replace('_', ' ')}<br>`;
        }
        if (transaction.transactionId) {
          details += `ID: ${transaction.transactionId}<br>`;
        }
      } else if (transaction.category === 'game') {
        // Game transaction details
        if (transaction.gameType) {
          details += `Game: ${transaction.gameType.charAt(0).toUpperCase() + transaction.gameType.slice(1)}<br>`;
        }
        
        if (transaction.details) {
          if (transaction.details.symbols) {
            details += `Symbols: ${transaction.details.symbols.join(', ')}<br>`;
          }
          
          if (transaction.details.lines) {
            details += `Lines: ${transaction.details.lines}<br>`;
          }
          
          if (transaction.details.multiplier) {
            details += `Multiplier: ${transaction.details.multiplier}x<br>`;
          }
        }
      }
      
      // Create cells
      row.innerHTML = `
        <td style="padding: 8px;">${formattedDate}</td>
        <td style="padding: 8px; color: ${typeColor};">${typeText}${categoryBadge}</td>
        <td style="padding: 8px; text-align: right; color: ${amountColor};">${formattedAmount}</td>
        <td style="padding: 8px; text-align: right;">${transaction.balance.toFixed(2)}</td>
        <td style="padding: 8px;">${details}</td>
      `;
      
      tableBody.appendChild(row);
    });
  }
  
  /**
   * Show a toast notification
   */
  showToast(message, type = 'info') {
    // Check if toast container exists, create if not
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.position = 'fixed';
      toastContainer.style.bottom = '20px';
      toastContainer.style.right = '20px';
      toastContainer.style.zIndex = '9999';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.minWidth = '250px';
    toast.style.margin = '10px';
    toast.style.padding = '15px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
    toast.style.display = 'flex';
    toast.style.justifyContent = 'space-between';
    toast.style.alignItems = 'center';
    toast.style.animation = 'fadeIn 0.5s, fadeOut 0.5s 2.5s';
    toast.style.animationFillMode = 'forwards';
    
    // Set color based on type
    if (type === 'success') {
      toast.style.backgroundColor = '#4CAF50';
      toast.style.color = 'white';
    } else if (type === 'error') {
      toast.style.backgroundColor = '#f44336';
      toast.style.color = 'white';
    } else {
      toast.style.backgroundColor = '#2196F3';
      toast.style.color = 'white';
    }
    
    // Add message and close button
    toast.innerHTML = `
      <div>${message}</div>
      <span style="margin-left: 10px; cursor: pointer;" onclick="this.parentElement.remove()">✕</span>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 3000);
    
    // Add CSS for animations if not already present
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only create the instance when DOM is ready
  window.balanceDisplay = new BalanceDisplay();
});
