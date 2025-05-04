// Wait for the DOM to be fully loaded before running game logic
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const boardElement = document.getElementById('board');
    const statusElement = document.getElementById('status');
    const resetButton = document.getElementById('resetButton');
    // Score display elements
    const xScoreElement = document.getElementById('xScore');
    const oScoreElement = document.getElementById('oScore');
    // New: Player name input elements
    const playerXNameInput = document.getElementById('playerXName');
    const playerONameInput = document.getElementById('playerOName');
    // New: Player name display elements in score area
    const xPlayerNameDisplay = document.getElementById('xPlayerName');
    const oPlayerNameDisplay = document.getElementById('oPlayerName');
    // New: Clear scores button
    const clearScoresButton = document.getElementById('clearScoresButton');


    // --- Game State Variables ---
    let currentPlayer = 'X'; // 'X' starts the first game
    let lastStartingPlayer = 'O'; // Track who started the last game (initially 'O' so 'X' starts first)
    let boardState = ['', '', '', '', '', '', '', '', '']; // Represents the 3x3 board, '' means empty
    let gameActive = true; // Flag to check if the game is currently playable
    let winningCombination = null; // To store the winning line indices
    // Score variables
    let xScore = 0;
    let oScore = 0;
    // New: Player name variables
    let playerXName = 'Player X';
    let playerOName = 'Player O';

    const localStorageKey = 'ticTacToeGameData'; // Key for localStorage to store all game data

    // --- Winning Combinations ---
    // All possible ways to win in Tic Tac Toe represented by cell indices
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    // --- Functions ---

    /**
     * Initializes or resets the game board.
     * Clears the board, resets the state variables, and sets up the cells.
     */
    function initializeBoard() {
        console.log("Initializing/Resetting board...");
        boardElement.innerHTML = ''; // Clear previous cells if any
        boardState = ['', '', '', '', '', '', '', '', '']; // Reset internal board state
        gameActive = true; // Game is active again
        
        // Alternate the starting player for a new game
        currentPlayer = lastStartingPlayer === 'X' ? 'O' : 'X';
        lastStartingPlayer = currentPlayer; // Remember who starts this game
        
        winningCombination = null; // Clear any previous winning line

        loadGameData(); // Load all game data (scores and names) from localStorage

        // Update status display using player names
        statusElement.textContent = `${getCurrentPlayerName()}'s turn`;

        // Create 9 cells for the board
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            // Apply Tailwind classes for styling and layout
            cell.classList.add(
                'cell',             // Custom class for potential specific styling
                'w-full', 'h-full', // Fill grid cell
                'bg-gray-200',      // Default background
                'rounded',          // Rounded corners
                'flex', 'items-center', 'justify-center', // Center content
                'text-4xl', 'md:text-6xl', // Responsive text size
                'font-bold',        // Bold text
                'cursor-pointer',   // Indicate clickable
                'hover:bg-gray-300', // Hover effect
                'transition', 'duration-200' // Smooth transition
            );
            cell.dataset.index = i; // Store the index (0-8) in the cell's data attribute
            cell.addEventListener('click', handleCellClick); // Add click listener
            boardElement.appendChild(cell); // Add the cell to the board
        }

        displayScores(); // Display the loaded scores (and names)
        updatePlayerNameInputs(); // Update input fields with loaded names

        console.log("Board initialized.");
    }

    /**
     * Handles clicks on a cell. This is the main game loop trigger.
     * @param {Event} event - The click event object.
     */
    function handleCellClick(event) {
        const clickedCell = event.target;
        // Get the index from the data attribute, convert to number
        const clickedCellIndex = parseInt(clickedCell.dataset.index);

        // --- Input Validation ---
        // 1. Check if the cell is already filled
        // 2. Check if the game is still active (hasn't been won or drawn)
        if (boardState[clickedCellIndex] !== '' || !gameActive) {
            console.log("Invalid move: Cell taken or game over.");
            return; // Ignore the click if the cell is taken or game is over
        }

        // --- Update Game State ---
        boardState[clickedCellIndex] = currentPlayer; // Update the internal state array

        // --- Update UI ---
        clickedCell.textContent = currentPlayer; // Display 'X' or 'O'
        // Add player-specific class for styling (e.g., different colors for X and O)
        clickedCell.classList.add(currentPlayer.toLowerCase());
        // Remove hover effect styling after a cell is clicked
        clickedCell.classList.remove('hover:bg-gray-300', 'cursor-pointer');
        clickedCell.classList.add('cursor-default'); // Change cursor


        // --- Check for Game End Conditions ---
        if (checkWin()) {
            const winnerName = getCurrentPlayerName();
            console.log(`${winnerName} wins!`);
            statusElement.textContent = `${winnerName} wins!`; // Update status
            gameActive = false; // Stop the game
            highlightWinningCells(); // Highlight the winning line
            // Increment score and save
            if (currentPlayer === 'X') {
                xScore++;
            } else {
                oScore++;
            }
            saveGameData(); // Save scores and names
            displayScores();

        } else if (checkDraw()) {
            console.log("Game is a draw!");
            statusElement.textContent = 'Game is a draw!'; // Update status
            gameActive = false; // Stop the game
            // No score change on draw
            // saveGameData(); // Optionally save state on draw
        } else {
            // --- Continue Game: Switch Player ---
            switchPlayer();
            // Update status display using player names
            statusElement.textContent = `${getCurrentPlayerName()}'s turn`;
             console.log(`Switched player to ${currentPlayer}. Board state:`, boardState);
        }
    }

    /**
     * Switches the current player between 'X' and 'O'.
     */
    function switchPlayer() {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }

     /**
     * Gets the current player's name based on the currentPlayer variable.
     * @returns {string} The current player's name.
     */
    function getCurrentPlayerName() {
        return currentPlayer === 'X' ? playerXName : playerOName;
    }


    /**
     * Checks if the current player has won by comparing boardState against winningCombinations.
     * @returns {boolean} - True if the current player has won, false otherwise.
     */
    function checkWin() {
        for (const combination of winningCombinations) {
            // Destructure the combination array into individual indices
            const [a, b, c] = combination;
            // Check if the cells at these indices are:
            // 1. Not empty (boardState[a])
            // 2. All contain the same player's mark (X or O)
            if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
                // Store the winning combination to highlight later
                winningCombination = combination;
                return true; // Found a winning line
            }
        }
        winningCombination = null; // Reset if no win found in this check
        return false; // No win found
    }

    /**
     * Checks if the game is a draw.
     * A draw occurs if all cells are filled and no player has won.
     * @returns {boolean} - True if the game is a draw, false otherwise.
     */
    function checkDraw() {
        // If the boardState array does *not* include any empty strings ('')
        // AND the game is technically still active (meaning checkWin() just returned false)
        // then it's a draw.
        return !boardState.includes('') && gameActive;
    }

     /**
     * Adds a visual style to the cells that form the winning line.
     */
    function highlightWinningCells() {
        if (!winningCombination) return; // Only proceed if a winning combination was found

        winningCombination.forEach(index => {
            // Find the cell element corresponding to the index
            const cell = boardElement.querySelector(`.cell[data-index='${index}']`);
            if (cell) {
                // Add the 'win' class (defined in style.css) for highlighting
                cell.classList.add('win');
            }
        });
         console.log("Highlighted winning cells:", winningCombination);
    }

    /**
     * Loads all game data (scores and player names) from localStorage.
     */
    function loadGameData() {
        console.log("Attempting to load game data from localStorage...");
        if (typeof(Storage) !== "undefined") { // Check if localStorage is supported
            const storedData = localStorage.getItem(localStorageKey);
            if (storedData) {
                try {
                    const gameData = JSON.parse(storedData);
                    // Load scores, ensuring they are numbers
                    xScore = parseInt(gameData.xScore) || 0;
                    oScore = parseInt(gameData.oScore) || 0;
                    // Load player names, defaulting if not found
                    playerXName = gameData.playerXName || 'Player X';
                    playerOName = gameData.playerOName || 'Player O';

                    console.log("Game data loaded:", { xScore, oScore, playerXName, playerOName });
                } catch (e) {
                    console.error("Error parsing game data from localStorage:", e);
                    // Reset all data if parsing fails
                    xScore = 0;
                    oScore = 0;
                    playerXName = 'Player X';
                    playerOName = 'Player O';
                }
            } else {
                console.log("No game data found in localStorage.");
                // Data remains at initial values (0 and default names)
            }
        } else {
            console.warn("localStorage is not supported by this browser. Game data not loaded.");
            // Data remains at initial values
        }
    }

    /**
     * Saves current game data (scores and player names) to localStorage.
     */
    function saveGameData() {
        console.log("Attempting to save game data to localStorage:", { xScore, oScore, playerXName, playerOName });
        if (typeof(Storage) !== "undefined") { // Check if localStorage is supported
            const gameDataToSave = {
                xScore: xScore,
                oScore: oScore,
                playerXName: playerXName,
                playerOName: playerOName
            };
            try {
                localStorage.setItem(localStorageKey, JSON.stringify(gameDataToSave));
                console.log("Game data saved successfully.");
            } catch (e) {
                console.error("Error saving game data to localStorage:", e);
            }
        } else {
             console.warn("localStorage is not supported by this browser. Game data not saved.");
        }
    }

    /**
     * Displays the current scores and player names in the HTML elements.
     */
    function displayScores() {
        if (xScoreElement && oScoreElement && xPlayerNameDisplay && oPlayerNameDisplay) {
            xScoreElement.textContent = xScore;
            oScoreElement.textContent = oScore;
            xPlayerNameDisplay.textContent = playerXName;
            oPlayerNameDisplay.textContent = playerOName;
            console.log("Scores and names displayed.");
        } else {
             console.error("Score or name display elements not found!");
        }
    }

    /**
     * Updates the player name input fields with the current player names.
     */
    function updatePlayerNameInputs() {
        if (playerXNameInput && playerONameInput) {
            playerXNameInput.value = playerXName;
            playerONameInput.value = playerOName;
            console.log("Player name inputs updated.");
        } else {
            console.error("Player name input elements not found!");
        }
    }

    /**
     * Clears the scores for both players, saves to localStorage, and updates display.
     */
    function clearScores() {
        console.log("Clearing scores...");
        xScore = 0;
        oScore = 0;
        saveGameData(); // Save the cleared scores
        displayScores(); // Update the score display
        console.log("Scores cleared.");
    }


    /**
     * Resets the game board to the initial state. Does NOT reset scores or names.
     * Attached to the reset button.
     */
    function resetGame() {
        console.log("Reset button clicked.");
        // Keep scores and names, just reset the board state
        boardElement.innerHTML = '';
        boardState = ['', '', '', '', '', '', '', '', ''];
        gameActive = true;
        
        // Alternate the starting player for the next game
        currentPlayer = lastStartingPlayer === 'X' ? 'O' : 'X';
        lastStartingPlayer = currentPlayer; // Remember who starts this game
        
        winningCombination = null;
        statusElement.textContent = `${getCurrentPlayerName()}'s turn`;

         // Re-create cells for the board
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.classList.add(
                'cell', 'w-full', 'h-full', 'bg-gray-200', 'rounded',
                'flex', 'items-center', 'justify-center',
                'text-4xl', 'md:text-6xl', 'font-bold',
                'cursor-pointer', 'hover:bg-gray-300', 'transition', 'duration-200'
            );
            cell.dataset.index = i;
            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
        console.log("Board reset.");
    }


    // --- Event Listeners ---
    // Attach the resetGame function to the reset button's click event
    resetButton.addEventListener('click', resetGame);

    // New: Attach clearScores function to the clear scores button's click event
    if (clearScoresButton) {
        clearScoresButton.addEventListener('click', clearScores);
    } else {
        console.error("Clear Scores button not found!");
    }

    // New: Add input event listeners to player name inputs
    if (playerXNameInput) {
        playerXNameInput.addEventListener('input', (event) => {
            playerXName = event.target.value || 'Player X'; // Default to 'Player X' if input is empty
            displayScores(); // Update the displayed name immediately
            saveGameData(); // Save the new name
            // Update status if it's currently X's turn
            if (currentPlayer === 'X' && gameActive) {
                 statusElement.textContent = `${playerXName}'s turn`;
            }
        });
    } else {
        console.error("Player X name input not found!");
    }

     if (playerONameInput) {
        playerONameInput.addEventListener('input', (event) => {
            playerOName = event.target.value || 'Player O'; // Default to 'Player O' if input is empty
            displayScores(); // Update the displayed name immediately
            saveGameData(); // Save the new name
             // Update status if it's currently O's turn
             if (currentPlayer === 'O' && gameActive) {
                 statusElement.textContent = `${playerOName}'s turn`;
            }
        });
    } else {
        console.error("Player O name input not found!");
    }


    // --- Initial Game Setup ---
    // Call initializeBoard once when the script loads to set up the initial game state
    // This will now also load and display scores and names.
    initializeBoard();

}); // End DOMContentLoaded wrapper
