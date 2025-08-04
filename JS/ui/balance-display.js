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
  }
  
  /**
   * Initialize the UI elements
   */
  initializeUI() {
    // Only proceed if the user is logged in
    if (!this.balanceHandler.username) return;
    
    // Add balance actions to account dropdown if it exists
    if (this.accountDropdown) {
      // Create balance actions container if it doesn't exist
      if (!document.getElementById('balance-actions')) {
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
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2 id="transaction-title">Deposit</h2>
          <span class="modal-close" id="close-transaction">✕</span>
        </div>
        <div class="modal-body">
          <div class="form-content">
            <label for="transaction-amount">Amount:</label>
            <input type="number" id="transaction-amount" min="1" step="1" value="100">
            
            <label for="transaction-method">Payment Method:</label>
            <select id="transaction-method">
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="e_wallet">E-Wallet</option>
              <option value="crypto">Cryptocurrency</option>
            </select>
            
            <div id="transaction-error" style="color: red; margin-top: 10px;"></div>
            <div id="transaction-success" style="color: green; margin-top: 10px;"></div>
            
            <div class="form-buttons">
              <button id="submit-transaction" style="background: #4CAF50; color: white;">Submit</button>
              <button id="cancel-transaction" style="background: #f44336; color: white; margin-left: 10px;">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
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
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h2>Transaction History</h2>
          <span class="modal-close" id="close-history">✕</span>
        </div>
        <div class="modal-body">
          <div class="history-filters" style="margin-bottom: 15px; display: flex; gap: 10px;">
            <select id="history-type-filter">
              <option value="">All Transactions</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="bet">Bets</option>
              <option value="win">Wins</option>
            </select>
            
            <input type="date" id="history-date-from" placeholder="From Date">
            <input type="date" id="history-date-to" placeholder="To Date">
            
            <button id="apply-history-filters" style="background: #2196F3; color: white;">Apply Filters</button>
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
   */
  updateBalanceDisplay() {
    if (this.balanceElement) {
      this.balanceElement.textContent = this.balanceHandler.getFormattedBalance();
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
        
        // Show toast notification
        this.showToast('Balance refreshed!', 'success');
      } else {
        this.showToast('Failed to refresh balance', 'error');
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
    
    const type = modal.dataset.type;
    const amountInput = document.getElementById('transaction-amount');
    const methodSelect = document.getElementById('transaction-method');
    const errorDiv = document.getElementById('transaction-error');
    const successDiv = document.getElementById('transaction-success');
    
    errorDiv.textContent = '';
    successDiv.textContent = '';
    
    // Validate amount
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      errorDiv.textContent = 'Please enter a valid amount';
      return;
    }
    
    // Process based on type
    try {
      let result;
      
      if (type === 'deposit') {
        result = await this.balanceHandler.deposit(amount, methodSelect.value);
      } else {
        result = await this.balanceHandler.withdraw(amount, methodSelect.value);
      }
      
      if (result.success) {
        successDiv.textContent = `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} successful!`;
        this.updateBalanceDisplay();
        
        // Show toast notification
        this.showToast(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${amount.toFixed(2)} successful!`, 'success');
        
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
   * Show history modal and load transactions
   */
  async showHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (!modal) return;
    
    // Load latest transactions
    await this.balanceHandler.loadTransactionHistory();
    
    // Display transactions
    this.displayTransactions();
    
    modal.style.display = 'flex';
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
    const typeFilter = document.getElementById('history-type-filter').value;
    const dateFrom = document.getElementById('history-date-from').value;
    const dateTo = document.getElementById('history-date-to').value;
    
    const filters = {};
    
    if (typeFilter) {
      filters.type = typeFilter;
    }
    
    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }
    
    if (dateTo) {
      filters.dateTo = dateTo;
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
    
    if (transactions.length === 0) {
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
      
      // Format type
      let typeText = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
      let typeColor = '#333';
      
      if (transaction.type === 'deposit') {
        typeColor = '#4CAF50';
      } else if (transaction.type === 'withdrawal') {
        typeColor = '#ff9800';
      } else if (transaction.type === 'bet') {
        typeColor = '#f44336';
      } else if (transaction.type === 'win') {
        typeColor = '#2196F3';
      }
      
      // Format amount
      const amount = transaction.amount;
      const formattedAmount = `${amount >= 0 ? '+' : ''}${amount.toFixed(2)}`;
      const amountColor = amount >= 0 ? '#4CAF50' : '#f44336';
      
      // Format details
      let details = '';
      
      if (transaction.method) {
        details += `Method: ${transaction.method.replace('_', ' ')}<br>`;
      }
      
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
      
      // Create cells
      row.innerHTML = `
        <td style="padding: 8px;">${formattedDate}</td>
        <td style="padding: 8px; color: ${typeColor};">${typeText}</td>
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
