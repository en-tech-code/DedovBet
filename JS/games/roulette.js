import { getCurrentUser } from '../auth/user-accounts.js';
import { getBalanceHandler } from '../balance-handler.js';

// Roulette game configuration - European Roulette Layout
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const NUMBER_COLORS = {
  0: 'green',
  32: 'red', 15: 'black', 19: 'red', 4: 'black', 21: 'red', 2: 'black', 25: 'red',
  17: 'black', 34: 'red', 6: 'black', 27: 'red', 13: 'black', 36: 'red', 11: 'black',
  30: 'red', 8: 'black', 23: 'red', 10: 'black', 5: 'red', 24: 'black', 16: 'red',
  33: 'black', 1: 'red', 20: 'black', 14: 'red', 31: 'black', 9: 'red', 22: 'black',
  18: 'red', 29: 'black', 7: 'red', 28: 'black', 12: 'red', 35: 'black', 3: 'red', 26: 'black'
};

// Payout ratios for different bets
const PAYOUT_RATIOS = {
  'number': 36, // Single number bet
  'red': 2,
  'black': 2,
  'even': 2,
  'odd': 2,
  'low': 2,    // 1-18
  'high': 2    // 19-36
};

const BET_TYPES = {
  'red': { description: 'Red', payout: 2, checker: (num) => NUMBER_COLORS[num] === 'red' },
  'black': { description: 'Black', payout: 2, checker: (num) => NUMBER_COLORS[num] === 'black' },
  'even': { description: 'Even', payout: 2, checker: (num) => num !== 0 && num % 2 === 0 },
  'odd': { description: 'Odd', payout: 2, checker: (num) => num !== 0 && num % 2 === 1 },
  'low': { description: '1-18', payout: 2, checker: (num) => num >= 1 && num <= 18 },
  'high': { description: '19-36', payout: 2, checker: (num) => num >= 19 && num <= 36 },
  'first-dozen': { description: '1-12', payout: 3, checker: (num) => num >= 1 && num <= 12 },
  'second-dozen': { description: '13-24', payout: 3, checker: (num) => num >= 13 && num <= 24 },
  'third-dozen': { description: '25-36', payout: 3, checker: (num) => num >= 25 && num <= 36 }
};

export class RouletteGame {
  constructor() {
    // Game state
    this.currentBet = {};
    this.selectedChip = 1;  // Default chip amount
    this.balance = 0;
    this.pendingBets = [];  // Track all bets for final settlement
    this.virtualBalance = 0; // Virtual balance during gameplay
    this.spinning = false;
    this.history = [];
    this.lastGameResult = null; // Initialize lastGameResult
    this.balanceHandler = getBalanceHandler();
    
    // DOM elements
    this.wheel = document.getElementById('roulette-wheel');
    this.wheelNumbers = document.getElementById('wheel-numbers');
    this.resultDisplay = document.getElementById('result-display');
    this.spinButton = document.getElementById('spin-button');
    this.clearButton = document.getElementById('clear-button');
    this.betNumbers = document.querySelectorAll('.bet-number');
    this.chips = document.querySelectorAll('.chip');
    this.balanceDisplay = document.getElementById('player-balance');
    
    // Clean up any existing balls from previous game sessions
    this.cleanupExistingBalls();
    
    this.init();
  }
  
  init() {
    // Get user balance from the balance handler with server refresh
    this.fetchCurrentBalance().then(() => {
      this.updateBalanceDisplay();
      console.log('Initial balance loaded from server:', this.balance);
    });
    
    // Create wheel numbers
    this.createWheelNumbers();
    
    // Add pulse animation style
    this.addPulseAnimation();
    
    // Event listeners
    this.spinButton.addEventListener('click', () => this.spin());
    this.clearButton.addEventListener('click', () => this.clearBet());
    
    // Listen for balance update events - when other components update the balance
    window.addEventListener('balanceUpdated', (e) => {
      console.log('Roulette received balance update:', e.detail);
      // Update the local balance
      this.balance = e.detail.balance;
      // Only update virtual balance if we're not in the middle of betting
      if (this.pendingBets.length === 0 && !this.spinning) {
        this.virtualBalance = this.balance;
        this.updateBalanceDisplay();
      }
    });
    
    // Make sure to clean up balls and commit changes before page unload/reload
    window.addEventListener('beforeunload', (e) => {
      // This needs to be synchronous for beforeunload
      console.log('Page unloading, committing balance changes');
      
      // Force direct update to balance handler if there's a difference
      if (this.virtualBalance !== this.balance) {
        const difference = this.virtualBalance - this.balance;
        
        // If we gained money, process a win, otherwise process a loss
        if (difference > 0) {
          this.balanceHandler.processGameResult({
            isWin: true,
            winAmount: difference,
            gameType: 'roulette',
            details: { gameType: 'roulette', beforeUnload: true }
          });
        } else if (difference < 0) {
          // For losses, we need to handle it appropriately
          this.balanceHandler.processGameResult({
            isWin: false,
            winAmount: 0,
            betAmount: Math.abs(difference),
            gameType: 'roulette',
            details: { gameType: 'roulette', beforeUnload: true }
          });
        }
      }
      
      this.cleanupExistingBalls();
    });
    
    this.betNumbers.forEach(number => {
      number.addEventListener('click', () => this.placeBet(number));
    });
    
    this.chips.forEach(chip => {
      chip.addEventListener('click', () => this.selectChip(chip));
      // Mark the default chip as selected
      if (parseInt(chip.dataset.amount) === this.selectedChip) {
        chip.classList.add('selected');
      }
    });
    
    // Add event listeners for bet options
    document.querySelectorAll('.bet-option').forEach(option => {
      option.addEventListener('click', () => this.placeBetOption(option));
    });
  }
  
  createWheelNumbers() {
    // Clear existing numbers
    this.wheelNumbers.innerHTML = '';
    
    // Add numbers to the wheel
    ROULETTE_NUMBERS.forEach((number, index) => {
      const numberElement = document.createElement('div');
      numberElement.classList.add('wheel-number');
      numberElement.textContent = number;
      
      // Position the number around the wheel - perfectly centered in segments
      // Start at 90 degrees to align with conic-gradient offset
      const anglePerSegment = 360 / 37; // Exactly 9.7297297... degrees per segment
      const startOffset = 90; // Offset to align with conic-gradient "from 90deg"
      const segmentCenter = startOffset + (index * anglePerSegment) + (anglePerSegment / 2);
      
      // Position numbers closer to the rim but inside the wheel
      const radius = 190; // Back to original positioning
      const angleRad = (segmentCenter * Math.PI) / 180;
      const x = Math.cos(angleRad) * radius;
      const y = Math.sin(angleRad) * radius;
      
      // Center the number element precisely (24px / 2 = 12px)
      numberElement.style.left = `calc(50% + ${x}px - 12px)`;
      numberElement.style.top = `calc(50% + ${y}px - 12px)`;
      numberElement.style.transform = 'none';
      
      // Add data attribute for easier targeting
      numberElement.dataset.number = number;
      
      // Add background color based on the number
      const bgColor = NUMBER_COLORS[number];
      numberElement.classList.add(bgColor);
      
      this.wheelNumbers.appendChild(numberElement);
    });
  }
  
  placeBet(numberElement) {
    if (this.spinning) return;
    
    const number = numberElement.dataset.number;
    const amount = this.selectedChip;
    
    console.log('Placing bet on number:', number, 'amount:', amount);
    console.log('Current virtual balance:', this.virtualBalance);
    
    // Ensure we have enough virtual balance
    if (amount > this.virtualBalance) {
      this.resultDisplay.textContent = 'Insufficient balance!';
      this.resultDisplay.style.color = '#ff6b6b';
      return;
    }
    
    // Initialize the bet for this number if it doesn't exist
    if (!this.currentBet[number]) {
      this.currentBet[number] = 0;
    }
    
    // Add the bet amount
    this.currentBet[number] += amount;
    
    // Deduct from virtual balance only
    this.virtualBalance -= amount;
    console.log('New virtual balance after bet:', this.virtualBalance);
    
    // Save bet information for later processing
    this.pendingBets.push({
      type: 'number',
      betType: 'number',
      number: number,
      amount: amount
    });
    
    // Update the virtual balance display
    this.updateBalanceDisplay();
    
    // Show prompt to spin the wheel
    this.resultDisplay.textContent = 'Bet placed! Press SPIN to play.';
    this.resultDisplay.style.color = '#e0c78c';
    
    // Highlight the spin button
    this.spinButton.style.animation = 'pulse 1.5s infinite';
    
    // Update the display
    numberElement.classList.add('active-bet');
    numberElement.setAttribute('data-bet-amount', `$${this.currentBet[number]}`);
  }
  
  selectChip(chipElement) {
    if (this.spinning) return;
    
    // Remove selected class from all chips
    this.chips.forEach(chip => chip.classList.remove('selected'));
    
    // Add selected class to clicked chip
    chipElement.classList.add('selected');
    
    // Set current chip amount
    this.selectedChip = parseInt(chipElement.dataset.amount);
  }
  
  clearBet() {
    if (this.spinning) return;
    
    // Calculate total bet amount
    let totalBet = 0;
    for (const betType in this.currentBet) {
      totalBet += this.currentBet[betType];
    }
    
    // Reset virtual balance to initial value
    if (totalBet > 0) {
      this.virtualBalance = this.balance;
      this.updateBalanceDisplay();
      
      // Clear pending bets
      this.pendingBets = [];
      
      // Reset the spin button animation
      this.spinButton.style.animation = 'none';
    }
    
    // Clear current bets
    this.currentBet = {};
    
    // Reset the display of bet numbers
    this.betNumbers.forEach(number => {
      number.textContent = number.dataset.number;
      number.classList.remove('active-bet');
      number.removeAttribute('data-bet-amount');
    });
    
    // Reset all bet options
    document.querySelectorAll('.bet-option').forEach(option => {
      option.classList.remove('active-bet');
      option.removeAttribute('data-bet-amount');
    });
    
    this.resultDisplay.textContent = '';
    
    // Reset spin button animation
    this.spinButton.style.animation = 'none';
  }
  
  // Add the pulse animation style to the document if it doesn't exist
  addPulseAnimation() {
    if (!document.getElementById('roulette-animations')) {
      const style = document.createElement('style');
      style.id = 'roulette-animations';
      style.textContent = `
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 204, 0, 0.7);
            transform: scale(1);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 204, 0, 0);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 204, 0, 0);
            transform: scale(1);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Fetch current balance from server
  async fetchCurrentBalance() {
    try {
      // First refresh the balance handler
      this.balance = this.balanceHandler.getBalance();
      
      // Then fetch from server to be absolutely sure
      if (this.balanceHandler.username) {
        const response = await fetch(`http://localhost:3000/api/getBalance?username=${this.balanceHandler.username}`);
        const data = await response.json();
        
        if (data.success) {
          console.log('Fetched balance from server:', data.balance);
          this.balance = data.balance;
          this.virtualBalance = this.balance;
          
          // Update balance handler and session storage
          this.balanceHandler.balance = this.balance;
          const user = getCurrentUser();
          if (user) {
            user.balance = this.balance;
            sessionStorage.setItem('current_user', JSON.stringify(user));
          }
        }
      } else {
        this.virtualBalance = this.balance;
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Fallback to balance handler value
      this.virtualBalance = this.balance;
    }
  }
  
  updateBalanceDisplay() {
    // Use virtual balance for display during gameplay
    if (this.balanceDisplay) {
      this.balanceDisplay.textContent = this.virtualBalance.toFixed(2);
    }
  }
  
  // Commit the virtual balance to the real balance when game ends
  commitBalanceChanges() {
    // Add debugging to see if this method is being called
    console.log('commitBalanceChanges called');
    console.log('virtualBalance:', this.virtualBalance);
    console.log('balance:', this.balance);
    console.log('lastGameResult:', this.lastGameResult);
    
    // Force update regardless of lastGameResult - calculate net change
    const balanceDifference = this.virtualBalance - this.balance;
    
    if (balanceDifference !== 0) {
      console.log('Balance difference detected:', balanceDifference);
      
      // Create a game result object if none exists
      if (!this.lastGameResult) {
        console.log('Creating new game result for balance difference');
        this.lastGameResult = {
          isWin: balanceDifference > 0,
          winAmount: Math.abs(balanceDifference),
          gameType: 'roulette',
          details: {
            gameType: 'roulette',
            forcedUpdate: true,
            balanceDifference: balanceDifference
          }
        };
      }
      
      // Process the game result with the balance handler
      console.log('Sending game result to balance handler:', this.lastGameResult);
      this.balanceHandler.processGameResult(this.lastGameResult)
        .then(result => {
          if (result.success) {
            console.log('Balance committed successfully, new balance:', result.balance);
            // Update our local balance to match
            this.balance = result.balance || this.balanceHandler.getBalance();
            this.virtualBalance = this.balance;
            this.updateBalanceDisplay();
            
            // Dispatch balance updated event to notify other components
            const event = new CustomEvent('balanceUpdated', {
              detail: { balance: this.balance }
            });
            window.dispatchEvent(event);
          } else {
            console.error('Failed to commit balance changes:', result.error);
          }
        })
        .catch(error => {
          console.error('Error in commitBalanceChanges:', error);
        });
      
      // Reset the last game result
      this.lastGameResult = null;
    } else {
      console.log('No balance difference to commit');
    }
  }
  
  async spin() {
    if (this.spinning) return;
    
    // Reset any previous winning number magnification
    document.querySelectorAll('.wheel-number').forEach(el => {
      el.style.transform = el.style.transform.replace(' scale(1.5)', '');
      el.style.zIndex = '';
      el.style.textShadow = '';
      el.style.fontWeight = '';
    });
    
    // Check if any bets were placed
    const totalBet = Object.values(this.currentBet).reduce((sum, bet) => sum + bet, 0);
    if (totalBet === 0) {
      this.resultDisplay.textContent = 'Please place a bet first!';
      this.resultDisplay.style.color = '#ff6b6b';
      return;
    }
    
    this.spinning = true;
    this.spinButton.disabled = true;
    this.clearButton.disabled = true;
    
    // Reset the pulse animation
    this.spinButton.style.animation = 'none';
    
    // Display "Spinning..." message
    this.resultDisplay.textContent = 'Spinning...';
    this.resultDisplay.style.color = '#e0c78c';
    
    // Calculate random result
    const randomIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const result = ROULETTE_NUMBERS[randomIndex];
    const resultColor = NUMBER_COLORS[result];
    
    // Calculate rotation - realistic roulette physics (3-5 full rotations)
    const currentRotation = this.getRotationDegrees(this.wheel);
    const baseRotations = 1080 + Math.random() * 720; // 3-5 rotations
    // Each number is exactly 9.7297297... degrees apart (360/37)
    const numberAngle = randomIndex * (360/37); // Use exact angle calculation for precision
    const finalWheelRotation = currentRotation + baseRotations + numberAngle;
    
    // Apply realistic roulette animation with proper deceleration
    this.wheel.style.transition = 'transform 5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    this.wheel.style.transform = `rotate(${finalWheelRotation}deg)`;
    
    // Numbers will automatically rotate with the wheel since they're now inside it
    
    // Enhanced visual feedback while spinning - Ball
    const wheelContainer = document.querySelector('.wheel-container');
    
    // Remove any existing roulette balls first to prevent multiple balls
    document.querySelectorAll('.roulette-ball').forEach(ball => {
      ball.parentNode.removeChild(ball);
    });
    document.querySelectorAll('.winning-ball').forEach(ball => {
      ball.parentNode.removeChild(ball);
    });
    
    const ballElement = document.createElement('div');
    ballElement.classList.add('roulette-ball');
    
    // Position ball initially on the outer edge of the wheel
    ballElement.style.position = 'absolute';
    ballElement.style.left = 'calc(50% - 6px)'; // Center horizontally
    ballElement.style.top = 'calc(50% - 196px)'; // Position at top edge of wheel
    ballElement.style.transformOrigin = '6px 196px'; // Set rotation origin to center of wheel
    ballElement.style.zIndex = '100'; /* Highest priority */
    
    wheelContainer.appendChild(ballElement);
    
    // Calculate ball final position (same direction as wheel but at different speed)
    const ballFinalRotation = finalWheelRotation * 0.9; // Ball moves same direction, slightly faster
    
    // Create dynamic ball animation for new position with natural deceleration
    const ballKeyframes = `
      @keyframes ballSpinDynamic {
        0% {
          transform: rotate(90deg) translateY(0);
          animation-timing-function: cubic-bezier(0.33, 0, 0.67, 1);
        }
        20% {
          transform: rotate(-720deg) translateY(0);
          animation-timing-function: cubic-bezier(0.33, 0, 0.67, 1);
        }
        40% {
          transform: rotate(-1440deg) translateY(0);
          animation-timing-function: cubic-bezier(0.33, 0, 0.67, 1);
        }
        60% {
          transform: rotate(-2160deg) translateY(0);
          animation-timing-function: cubic-bezier(0.33, 0, 0.67, 1);
        }
        75% {
          transform: rotate(-2700deg) translateY(0);
          animation-timing-function: cubic-bezier(0.33, 0, 0.67, 1);
        }
        85% {
          transform: rotate(-3060deg) translateY(0);
          animation-timing-function: cubic-bezier(0.17, 0.67, 0.15, 1);
        }
        95% {
          transform: rotate(${ballFinalRotation * 0.95 + 90}deg) translateY(0);
          animation-timing-function: cubic-bezier(0.17, 0.67, 0.15, 1);
        }
        100% {
          transform: rotate(${ballFinalRotation + 90}deg) translateY(0);
        }
      }
    `;
    
    // Inject the dynamic keyframes
    const styleSheet = document.createElement('style');
    styleSheet.textContent = ballKeyframes;
    document.head.appendChild(styleSheet);
    
    // Apply ball animation with natural deceleration timing
    ballElement.style.animation = 'ballSpinDynamic 5s forwards';
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 4900)); // Stop just before animation fully completes
    
    // IMPORTANT: Save the exact final position from the animation
    // This prevents the jump that occurs when switching from animation to static position
    const finalComputedStyle = window.getComputedStyle(ballElement);
    const ballRect = ballElement.getBoundingClientRect();
    const wheelContainerRect = wheelContainer.getBoundingClientRect();
    
    // Calculate position relative to wheel container
    const relativeLeft = ballRect.left - wheelContainerRect.left + (ballRect.width / 2);
    const relativeTop = ballRect.top - wheelContainerRect.top + (ballRect.height / 2);
    
    // Stop the animation at its EXACT current position to prevent jumps
    ballElement.style.animation = 'none';
    ballElement.style.transition = 'none'; // Temporarily disable transitions
    ballElement.style.transform = finalComputedStyle.transform; // Keep exact transform
    
    // Clean up animation styles but KEEP the ball element
    try {
      document.head.removeChild(styleSheet);
    } catch (e) {
      console.log("Cleanup failed, continuing game...");
    }
    
    // Now calculate the winning position
    const numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const winningIndex = numbers.indexOf(result);
    
    // Use the same calculation as createWheelNumbers for perfect alignment
    const anglePerSegment = 360 / 37;
    const startOffset = 90; // Same offset as conic-gradient from 90deg
    const segmentCenter = startOffset + (winningIndex * anglePerSegment) + (anglePerSegment / 2);
    
    // Calculate wheel rotation for position adjustment
    const currentWheelRotation = this.getRotationDegrees(this.wheel);
    
    // Position ball at winning number position
    const angleRad = ((segmentCenter + currentWheelRotation) * Math.PI) / 180;
    const x = Math.cos(angleRad) * 190;
    const y = Math.sin(angleRad) * 190;
    
    // Small delay to allow the browser to apply the static position before transitioning
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Now transition smoothly to the winning position
    // Calculate the final position relative to the wheel center
    const finalX = x;
    const finalY = y + 190; // Adjust Y to be relative to wheel center
    
    ballElement.style.transition = 'left 0.8s cubic-bezier(0.33, 0, 0.67, 1), top 0.8s cubic-bezier(0.33, 0, 0.67, 1)';
    ballElement.style.left = `calc(50% + ${finalX}px - 6px)`;
    ballElement.style.top = `calc(50% + ${finalY - 190}px - 6px)`;
    
    // Wait for final transition to complete
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Keep the ball at the final position with no transition for stability
    ballElement.style.transition = 'none';
    ballElement.style.transform = 'none';
    ballElement.style.zIndex = '1000';
    
    // Process the result and highlight winning number
    this.processResult(result, resultColor);
    
    // Add to history
    this.addToHistory(result, resultColor);
    
    // Add winning ball class to the existing ball for glow effect
    ballElement.classList.add('winning-ball');
    
    // Reset game state
    setTimeout(() => {
      this.spinning = false;
      
      // Magnify the winning number (ball is already positioned)
      const winningNumberElement = document.querySelector(`.wheel-number[data-number="${result}"]`);
      if (winningNumberElement) {
        winningNumberElement.classList.add('winning-number');
      }
      
      this.spinButton.disabled = false;
      this.clearButton.disabled = false;
      
      // Remove the ball after 5 seconds to clean up
      setTimeout(() => {
        if (wheelContainer.contains(ballElement)) {
          wheelContainer.removeChild(ballElement);
        }
      }, 5000);
      
    }, 1000); // Shorter timeout since we now have a more fluid animation
  }
  
  getRotationDegrees(element) {
    const style = window.getComputedStyle(element);
    const matrix = style.transform || style.webkitTransform || style.mozTransform;
    
    if (matrix !== 'none') {
      const values = matrix.split('(')[1].split(')')[0].split(',');
      const a = values[0];
      const b = values[1];
      const angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
      return (angle < 0) ? angle + 360 : angle;
    }
    return 0;
  }
  
  cleanupExistingBalls() {
    // Remove ALL balls from the wheel container
    const wheelContainer = document.querySelector('.wheel-container');
    if (wheelContainer) {
      document.querySelectorAll('.roulette-ball, .winning-ball').forEach(ball => {
        if (ball && ball.parentNode) {
          ball.parentNode.removeChild(ball);
        }
      });
    }
  }
  
  highlightWinningNumber(number) {
    // Remove previous highlights from wheel
    document.querySelectorAll('.wheel-number').forEach(el => {
      el.classList.remove('winning-number');
    });
    
    // Remove previous highlights from betting table
    document.querySelectorAll('.bet-number').forEach(el => {
      el.classList.remove('winning-number');
    });
    
    // Find and highlight the winning number on the wheel
    const wheelNumber = this.wheelNumbers.querySelector(`[data-number="${number}"]`);
    if (wheelNumber) {
      wheelNumber.classList.add('winning-number');
      
      // Note: We don't create a new ball here as it's now handled in the spin method
      // Instead, just highlight the wheel number
      
      // Remove highlight after 5 seconds
      setTimeout(() => {
        wheelNumber.classList.remove('winning-number');
      }, 5000);
    }
    
    // Highlight the corresponding number in the betting table
    const tableNumber = document.querySelector(`.bet-number[data-number="${number}"]`);
    if (tableNumber) {
      tableNumber.classList.add('winning-number');
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        tableNumber.classList.remove('winning-number');
      }, 3000);
    }
  }
  
  processResult(number, color) {
    // Highlight the winning number on the wheel
    this.highlightWinningNumber(number);
    
    // Calculate total bet amount for loss tracking
    const totalBetAmount = Object.values(this.currentBet).reduce((sum, bet) => sum + bet, 0);
    console.log('Total bet amount:', totalBetAmount);
    
    let winnings = 0;
    let winningBets = [];
    
    // Check if there's a direct bet on the winning number
    if (this.currentBet[number]) {
      const betAmount = this.currentBet[number];
      const win = betAmount * PAYOUT_RATIOS.number;
      winnings += win;
      winningBets.push(`${number}: $${win}`);
    }
    
    // Check for special bets
    for (const [betType, bet] of Object.entries(this.currentBet)) {
      // Skip if it's a number bet (already handled above)
      if (!isNaN(betType)) continue;
      
      // Check if this bet type is a winner
      if (BET_TYPES[betType] && BET_TYPES[betType].checker(number)) {
        const betAmount = bet;
        const win = betAmount * BET_TYPES[betType].payout;
        winnings += win;
        winningBets.push(`${BET_TYPES[betType].description}: $${win}`);
      }
    }
    
    console.log('Winnings calculated:', winnings);
    
    // Prepare the game details
    const gameDetails = {
      gameType: 'roulette',
      winNumber: number,
      winColor: color,
      winningBets: winningBets,
      totalBetAmount: totalBetAmount
    };
    
    // Process the result with virtual balance
    if (winnings > 0) {
      // Add winnings to virtual balance
      this.virtualBalance += winnings;
      
      // Save the result for when we close the game
      this.lastGameResult = {
        isWin: true,
        winAmount: winnings,
        betAmount: totalBetAmount,
        gameType: 'roulette',
        details: gameDetails
      };
      
      this.resultDisplay.textContent = `${number} ${color.toUpperCase()} - You won $${winnings}!`;
      this.resultDisplay.style.color = '#4CAF50';
    } else {
      // All bets are already deducted from virtual balance during betting
      // Just need to save the result for when we close the game
      this.lastGameResult = {
        isWin: false,
        winAmount: 0,
        betAmount: totalBetAmount,
        gameType: 'roulette',
        details: gameDetails
      };
      
      this.resultDisplay.textContent = `${number} ${color.toUpperCase()} - You lost!`;
      this.resultDisplay.style.color = '#ff6b6b';
    }
    
    console.log('Game result prepared:', this.lastGameResult);
    console.log('Virtual balance after result:', this.virtualBalance);
    this.updateBalanceDisplay();
    
    // Clear bets
    this.currentBet = {};
    this.pendingBets = [];
    
    this.betNumbers.forEach(number => {
      number.textContent = number.dataset.number;
      number.classList.remove('active-bet');
      number.removeAttribute('data-bet-amount');
    });
    
    document.querySelectorAll('.bet-option').forEach(option => {
      option.classList.remove('active-bet');
      option.removeAttribute('data-bet-amount');
    });
    
    // Update user balance in session storage
    const user = getCurrentUser();
    if (user) {
      // Use virtualBalance to reflect current game state
      user.balance = this.virtualBalance;
      sessionStorage.setItem('current_user', JSON.stringify(user));
      console.log('Updated session storage balance to:', this.virtualBalance);
    }
  }
  
  addToHistory(number, color) {
    this.history.unshift({ number, color });
    if (this.history.length > 10) {
      this.history.pop();
    }
    
    // Update history display if available
    const historyContainer = document.getElementById('history-numbers');
    if (historyContainer) {
      historyContainer.innerHTML = '';
      
      this.history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-number', item.color);
        historyItem.textContent = item.number;
        historyContainer.appendChild(historyItem);
      });
    }
  }
  
  placeBetOption(optionElement) {
    if (this.spinning) return;
    
    const betType = optionElement.dataset.bet;
    const amount = this.selectedChip;
    
    console.log('Placing bet on option:', betType, 'amount:', amount);
    console.log('Current virtual balance:', this.virtualBalance);
    
    // Ensure we have enough virtual balance
    if (amount > this.virtualBalance) {
      this.resultDisplay.textContent = 'Insufficient balance!';
      this.resultDisplay.style.color = '#ff6b6b';
      return;
    }
    
    // Initialize the bet for this type if it doesn't exist
    if (!this.currentBet[betType]) {
      this.currentBet[betType] = 0;
    }
    
    // Add the bet amount
    this.currentBet[betType] += amount;
    
    // Deduct from virtual balance only
    this.virtualBalance -= amount;
    console.log('New virtual balance after bet:', this.virtualBalance);
    
    // Save bet information for later processing
    this.pendingBets.push({
      type: 'option',
      betType: betType,
      description: BET_TYPES[betType]?.description || betType,
      amount: amount
    });
    
    // Update the virtual balance display
    this.updateBalanceDisplay();
    
    // Show prompt to spin the wheel
    this.resultDisplay.textContent = 'Bet placed! Press SPIN to play.';
    this.resultDisplay.style.color = '#e0c78c';
    
    // Highlight the spin button
    this.spinButton.style.animation = 'pulse 1.5s infinite';
    
    // Update the display
    optionElement.classList.add('active-bet');
    optionElement.setAttribute('data-bet-amount', `$${this.currentBet[betType]}`);
  }
}

// Initialize the game when the modal opens
export function initRouletteGame() {
  let rouletteGame = null;
  
  const liveCasinoButton = document.querySelector('.menu-item a[href="#live-casino"]');
  const rouletteModal = document.getElementById('roulette-modal');
  const closeButton = document.getElementById('close-roulette');
  
  if (liveCasinoButton && rouletteModal) {
    liveCasinoButton.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Roulette game opening');
      rouletteModal.style.display = 'block';
      
      // Initialize game if not already created
      if (!rouletteGame) {
        console.log('Creating new roulette game instance');
        rouletteGame = new RouletteGame();
      } else {
        console.log('Using existing roulette game instance');
        // Refresh the balance from server
        rouletteGame.fetchCurrentBalance().then(() => {
          rouletteGame.updateBalanceDisplay();
          console.log('Balance refreshed on game open:', rouletteGame.balance);
        });
      }
    });
    
    // Direct call to balance handler for immediate updates
    function updateGameBalanceOnClose() {
      console.log('Roulette game closing');
      if (rouletteGame) {
        const balanceDiff = rouletteGame.virtualBalance - rouletteGame.balance;
        console.log('Balance difference on close:', balanceDiff);
        
        if (balanceDiff !== 0) {
          console.log('Updating balance on close, difference:', balanceDiff);
          
          // Direct balance update to server
          fetch('http://localhost:3000/api/updateBalance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: rouletteGame.balanceHandler.username,
              balance: rouletteGame.virtualBalance,
              source: 'roulette-game-close'
            })
          })
          .then(response => response.json())
          .then(data => {
            console.log('Balance updated on server:', data);
            
            // Update local balance handler
            rouletteGame.balance = rouletteGame.virtualBalance;
            
            // Update balance handler's internal balance
            rouletteGame.balanceHandler.balance = rouletteGame.virtualBalance;
            
            // Update user in session storage
            const user = getCurrentUser();
            if (user) {
              user.balance = rouletteGame.virtualBalance;
              sessionStorage.setItem('current_user', JSON.stringify(user));
              console.log('Updated session storage balance on close to:', rouletteGame.virtualBalance);
            }
            
            // Dispatch balance updated event
            const event = new CustomEvent('balanceUpdated', {
              detail: { balance: rouletteGame.virtualBalance }
            });
            window.dispatchEvent(event);
          })
          .catch(err => {
            console.error('Error updating balance on close:', err);
          });
        }
      }
      
      rouletteModal.style.display = 'none';
    }
    
    closeButton.addEventListener('click', updateGameBalanceOnClose);
    
    // Close on clicking outside
    rouletteModal.addEventListener('click', (e) => {
      if (e.target === rouletteModal) {
        updateGameBalanceOnClose();
      }
    });
  }
}