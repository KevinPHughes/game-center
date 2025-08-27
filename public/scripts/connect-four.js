document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const gameBoard = document.getElementById('gameBoard');
    const columnIndicators = document.getElementById('columnIndicators');
    const gameStatus = document.getElementById('gameStatus');
    const resetButton = document.getElementById('resetButton');
    const clearScoresButton = document.getElementById('clearScoresButton');
    const player1NameInput = document.getElementById('player1Name');
    const player2NameInput = document.getElementById('player2Name');
    const player1NameDisplay = document.getElementById('player1NameDisplay');
    const player2NameDisplay = document.getElementById('player2NameDisplay');
    const player1ScoreDisplay = document.getElementById('player1Score');
    const player2ScoreDisplay = document.getElementById('player2Score');
    const winnerModal = document.getElementById('winnerModal');
    const winnerMessage = document.getElementById('winnerMessage');
    const playAgainButton = document.getElementById('playAgainButton');

    // Game Constants
    const ROWS = 6;
    const COLS = 7;
    const EMPTY = 0;
    const PLAYER1 = 1; // Red
    const PLAYER2 = 2; // Yellow
    const localStorageKey = 'connectFourGameData';

    // Game State Variables
    let board = [];
    let currentPlayer = PLAYER1;
    let gameActive = true;
    let player1Score = 0;
    let player2Score = 0;
    let player1Name = 'Red';
    let player2Name = 'Yellow';
    let winningCells = [];

    /**
     * Initializes the game board and state
     */
    function initializeGame() {
        // Create empty board
        board = Array(ROWS).fill().map(() => Array(COLS).fill(EMPTY));
        currentPlayer = PLAYER1;
        gameActive = true;
        winningCells = [];
        
        // Load saved data
        loadGameData();
        
        // Create column indicators
        createColumnIndicators();
        
        // Create initial board UI
        createBoardUI();
        
        // Update status
        updateStatus();
    }

    /**
     * Creates the column selection indicators
     */
    function createColumnIndicators() {
        columnIndicators.innerHTML = '';
        
        for (let col = 0; col < COLS; col++) {
            const indicator = document.createElement('div');
            indicator.classList.add(
                'column-indicator',
                'h-8',
                'flex',
                'items-center',
                'justify-center',
                'cursor-pointer',
                'hover:bg-gray-100',
                'rounded-t-lg',
                'transition',
                'duration-200'
            );
            
            // Add arrow icon
            indicator.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            `;
            
            // Add column data and click handler
            indicator.dataset.col = col;
            indicator.addEventListener('click', () => handleColumnClick(col));
            
            columnIndicators.appendChild(indicator);
        }
    }

    /**
     * Creates the game board UI
     */
    function createBoardUI() {
        gameBoard.innerHTML = '';
        
        // Create cells for the board
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cell = document.createElement('div');
                cell.classList.add(
                    'cell',
                    'aspect-square',
                    'rounded-full',
                    'bg-white',
                    'p-1',
                    'border-2',
                    'border-blue-700',
                    'flex',
                    'items-center',
                    'justify-center'
                );
                
                // Create the disc container (for animation purposes)
                const disc = document.createElement('div');
                disc.classList.add(
                    'disc',
                    'w-full',
                    'h-full',
                    'rounded-full'
                );
                
                // Set cell data attributes for identification
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add to the board
                cell.appendChild(disc);
                gameBoard.appendChild(cell);
            }
        }
        
        // Update cells based on board state
        updateBoardUI();
    }

    /**
     * Updates the UI to match the current board state
     */
    function updateBoardUI() {
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cell = gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const disc = cell.querySelector('.disc');
                
                // Reset classes
                disc.className = 'disc w-full h-full rounded-full';
                cell.classList.remove('winning-cell');
                
                // Add player-specific classes - only add ONE background class
                if (board[row][col] === PLAYER1) {
                    disc.classList.add('bg-player1');
                } else if (board[row][col] === PLAYER2) {
                    disc.classList.add('bg-player2');
                } else {
                    disc.classList.add('bg-white');
                }
                
                // Highlight winning cells
                if (winningCells.some(([r, c]) => r === row && c === col)) {
                    cell.classList.add('winning-cell');
                }
            }
        }
    }

    /**
     * Handles a click on a column to drop a disc
     * @param {number} col - The column index
     */
    function handleColumnClick(col) {
        if (!gameActive) return;
        
        // Find the lowest empty row in the selected column
        const row = findLowestEmptyRow(col);
        
        if (row === -1) {
            // Column is full
            return;
        }
        
        // Place the disc
        dropDisc(row, col);
        
        // Check for win or draw
        if (checkWin(row, col)) {
            gameActive = false;
            highlightWinningCells();
            updateScore();
            showWinnerModal();
        } else if (checkDraw()) {
            gameActive = false;
            showDrawModal();
        } else {
            // Switch player
            currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
            updateStatus();
        }
    }

    /**
     * Finds the lowest empty row in a column
     * @param {number} col - The column index
     * @returns {number} - The row index, or -1 if column is full
     */
    function findLowestEmptyRow(col) {
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === EMPTY) {
                return row;
            }
        }
        return -1; // Column is full
    }

    /**
     * Drops a disc into the specified position with animation
     * @param {number} row - The row index
     * @param {number} col - The column index
     */
    function dropDisc(row, col) {
        board[row][col] = currentPlayer;
        
        // Animate the disc dropping
        const targetCell = gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const disc = targetCell.querySelector('.disc');
        
        // Clear any existing background classes
        disc.classList.remove('bg-white', 'bg-player1', 'bg-player2');
        
        // Add drop animation
        disc.style.transform = 'translateY(-' + (row * 100) + '%)';
        disc.style.opacity = '0';
        
        // Set the disc color
        if (currentPlayer === PLAYER1) {
            disc.classList.add('bg-player1');
        } else {
            disc.classList.add('bg-player2');
        }
        
        // Reset transform and fade in
        setTimeout(() => {
            disc.style.transition = 'transform 0.5s ease-in, opacity 0.2s ease-in';
            disc.style.transform = 'translateY(0)';
            disc.style.opacity = '1';
        }, 50);
        
        // Remove transition after animation
        setTimeout(() => {
            disc.style.transition = '';
        }, 600);
    }

    /**
     * Checks if the current player has won
     * @param {number} row - The row of the last placed disc
     * @param {number} col - The column of the last placed disc
     * @returns {boolean} - True if the current player has won
     */
    function checkWin(row, col) {
        const directions = [
            [0, 1],   // Horizontal
            [1, 0],   // Vertical
            [1, 1],   // Diagonal down-right
            [1, -1],  // Diagonal down-left
        ];
        
        for (const [dx, dy] of directions) {
            let count = 1; // Count the placed disc itself
            const connected = [[row, col]];
            
            // Check in positive direction
            for (let i = 1; i < 4; i++) {
                const newRow = row + i * dx;
                const newCol = col + i * dy;
                
                if (isValidPosition(newRow, newCol) && board[newRow][newCol] === currentPlayer) {
                    count++;
                    connected.push([newRow, newCol]);
                } else {
                    break;
                }
            }
            
            // Check in negative direction
            for (let i = 1; i < 4; i++) {
                const newRow = row - i * dx;
                const newCol = col - i * dy;
                
                if (isValidPosition(newRow, newCol) && board[newRow][newCol] === currentPlayer) {
                    count++;
                    connected.push([newRow, newCol]);
                } else {
                    break;
                }
            }
            
            if (count >= 4) {
                winningCells = connected;
                return true;
            }
        }
        
        return false;
    }

    /**
     * Checks if the position is within the board
     * @param {number} row - The row index
     * @param {number} col - The column index
     * @returns {boolean} - True if the position is valid
     */
    function isValidPosition(row, col) {
        return row >= 0 && row < ROWS && col >= 0 && col < COLS;
    }

    /**
     * Checks if the game is a draw
     * @returns {boolean} - True if the game is a draw
     */
    function checkDraw() {
        return board[0].every(cell => cell !== EMPTY);
    }

    /**
     * Highlights the winning cells
     */
    function highlightWinningCells() {
        updateBoardUI();
        
        // Add a pulsing animation to the winning cells
        winningCells.forEach(([row, col]) => {
            const cell = gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            cell.classList.add('winning-cell', 'animate-pulse');
        });
    }

    /**
     * Updates the game status display
     */
    function updateStatus() {
        const playerName = currentPlayer === PLAYER1 ? player1Name : player2Name;
        gameStatus.textContent = `${playerName}'s turn`;
        
        // Update player name displays
        player1NameDisplay.textContent = player1Name;
        player2NameDisplay.textContent = player2Name;
    }

    /**
     * Updates the score based on the winner
     */
    function updateScore() {
        if (currentPlayer === PLAYER1) {
            player1Score++;
            player1ScoreDisplay.textContent = player1Score;
        } else {
            player2Score++;
            player2ScoreDisplay.textContent = player2Score;
        }
        
        saveGameData();
    }

    /**
     * Shows the winner modal
     */
    function showWinnerModal() {
        const playerName = currentPlayer === PLAYER1 ? player1Name : player2Name;
        winnerMessage.textContent = `${playerName} wins!`;
        
        // Add player-specific class to the message
        winnerMessage.className = 'text-xl mb-6 font-bold';
        if (currentPlayer === PLAYER1) {
            winnerMessage.classList.add('text-player1');
        } else {
            winnerMessage.classList.add('text-player2');
        }
        
        winnerModal.classList.remove('hidden');
    }

    /**
     * Shows the draw modal
     */
    function showDrawModal() {
        winnerMessage.textContent = "It's a draw!";
        winnerMessage.className = 'text-xl mb-6 font-bold text-gray-700';
        winnerModal.classList.remove('hidden');
    }

    /**
     * Resets the game
     */
    function resetGame() {
        board = Array(ROWS).fill().map(() => Array(COLS).fill(EMPTY));
        currentPlayer = PLAYER1;
        gameActive = true;
        winningCells = [];
        
        updateStatus();
        createBoardUI();
    }

    /**
     * Clears the scores
     */
    function clearScores() {
        player1Score = 0;
        player2Score = 0;
        
        player1ScoreDisplay.textContent = player1Score;
        player2ScoreDisplay.textContent = player2Score;
        
        saveGameData();
    }

    /**
     * Saves the game data to localStorage
     */
    function saveGameData() {
        const gameData = {
            player1Score,
            player2Score,
            player1Name,
            player2Name
        };
        
        localStorage.setItem(localStorageKey, JSON.stringify(gameData));
    }

    /**
     * Loads the game data from localStorage
     */
    function loadGameData() {
        const savedData = localStorage.getItem(localStorageKey);
        
        if (savedData) {
            try {
                const gameData = JSON.parse(savedData);
                
                player1Score = gameData.player1Score || 0;
                player2Score = gameData.player2Score || 0;
                player1Name = gameData.player1Name || 'Red';
                player2Name = gameData.player2Name || 'Yellow';
                
                player1ScoreDisplay.textContent = player1Score;
                player2ScoreDisplay.textContent = player2Score;
                player1NameInput.value = player1Name;
                player2NameInput.value = player2Name;
            } catch (error) {
                console.error('Error loading game data:', error);
            }
        }
    }

    // Event Listeners
    resetButton.addEventListener('click', resetGame);
    clearScoresButton.addEventListener('click', clearScores);
    playAgainButton.addEventListener('click', () => {
        winnerModal.classList.add('hidden');
        resetGame();
    });
    
    // Player name input handlers
    player1NameInput.addEventListener('input', (e) => {
        player1Name = e.target.value || 'Red';
        player1NameDisplay.textContent = player1Name;
        saveGameData();
        if (currentPlayer === PLAYER1 && gameActive) {
            updateStatus();
        }
    });
    
    player2NameInput.addEventListener('input', (e) => {
        player2Name = e.target.value || 'Yellow';
        player2NameDisplay.textContent = player2Name;
        saveGameData();
        if (currentPlayer === PLAYER2 && gameActive) {
            updateStatus();
        }
    });

    // Initialize the game
    initializeGame();
});
