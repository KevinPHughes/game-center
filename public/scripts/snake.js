document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const highScoreDisplay = document.getElementById('highScoreDisplay');
    const gameStatus = document.getElementById('gameStatus');
    const speedSelect = document.getElementById('speedSelect');
    const startButton = document.getElementById('startButton');
    const desktopStartButton = document.getElementById('desktopStartButton');
    const resetButton = document.getElementById('resetButton');
    const clearScoreButton = document.getElementById('clearScoreButton');
    const gameOverModal = document.getElementById('gameOverModal');
    const finalScoreMessage = document.getElementById('finalScoreMessage');
    const newHighScoreMessage = document.getElementById('newHighScoreMessage');
    const playAgainButton = document.getElementById('playAgainButton');
    const instructionsModal = document.getElementById('instructionsModal');
    const startPlayingButton = document.getElementById('startPlayingButton');
    
    // Mobile controls
    const upButton = document.getElementById('upButton');
    const downButton = document.getElementById('downButton');
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');
    
    // Game Constants
    const GRID_SIZE = 20; // Size of each grid cell
    const localStorageKey = 'snakeGameData';
    
    // Speed settings in milliseconds (lower = faster)
    const speeds = {
        slow: 200,
        medium: 120,
        fast: 80
    };
    
    // Game State Variables
    let snake = [];
    let food = {};
    let direction = 'right';
    let nextDirection = 'right';
    let score = 0;
    let highScore = 0;
    let gameInterval;
    let gameActive = false;
    let canvasWidth = 400;
    let canvasHeight = 400;
    let gridWidth, gridHeight;
    
    /**
     * Initializes the game
     */
    function initGame() {
        // Set up canvas dimensions based on container size
        setupCanvas();
        
        // Load high score
        loadGameData();
        
        // Initialize the snake in the middle of the grid
        const startX = Math.floor(gridWidth / 2);
        const startY = Math.floor(gridHeight / 2);
        
        snake = [
            {x: startX, y: startY},       // Head
            {x: startX - 1, y: startY},   // Body
            {x: startX - 2, y: startY}    // Tail
        ];
        
        // Create initial food
        createFood();
        
        // Reset score and direction
        score = 0;
        direction = 'right';
        nextDirection = 'right';
        gameActive = false;
        
        // Update displays
        scoreDisplay.textContent = score;
        highScoreDisplay.textContent = highScore;
        gameStatus.textContent = 'Press Start or any arrow key to begin';
        
        // Clear any existing game interval
        clearInterval(gameInterval);
        
        // Draw initial state
        drawGame();
    }
    
    /**
     * Sets up the canvas dimensions based on container size
     */
    function setupCanvas() {
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Make the canvas as large as possible while fitting in the container
        // and maintaining a grid of whole cells
        canvasWidth = Math.floor(containerWidth / GRID_SIZE) * GRID_SIZE;
        canvasHeight = Math.floor(containerWidth / GRID_SIZE) * GRID_SIZE;
        
        // Maximum size limit
        canvasWidth = Math.min(canvasWidth, 400);
        canvasHeight = Math.min(canvasHeight, 400);
        
        // Set canvas dimensions
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Calculate grid dimensions
        gridWidth = canvasWidth / GRID_SIZE;
        gridHeight = canvasHeight / GRID_SIZE;
    }
    
    /**
     * Starts the game
     */
    function startGame() {
        if (gameActive) return;
        
        gameActive = true;
        gameStatus.textContent = 'Game in progress';
        
        // Get current speed setting
        const speed = speeds[speedSelect.value];
        
        // Start game loop
        gameInterval = setInterval(updateGame, speed);
    }
    
    /**
     * Updates the game state
     */
    function updateGame() {
        // Move snake
        moveSnake();
        
        // Check for collisions
        if (checkCollision()) {
            endGame();
            return;
        }
        
        // Check if food was eaten
        checkFood();
        
        // Draw updated game state
        drawGame();
    }
    
    /**
     * Moves the snake one cell in the current direction
     */
    function moveSnake() {
        // Update direction from the nextDirection
        direction = nextDirection;
        
        // Calculate new head position
        const head = {x: snake[0].x, y: snake[0].y};
        
        switch (direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }
        
        // Add new head to the beginning of the snake array
        snake.unshift(head);
        
        // Remove tail (unless food was eaten, which is handled in checkFood)
        snake.pop();
    }
    
    /**
     * Checks for collisions with walls or self
     * @returns {boolean} - True if a collision occurred
     */
    function checkCollision() {
        const head = snake[0];
        
        // Check wall collision
        if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
            return true;
        }
        
        // Check self collision (start from index 1 to skip the head)
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Checks if the snake has eaten food
     */
    function checkFood() {
        const head = snake[0];
        
        if (head.x === food.x && head.y === food.y) {
            // Increase score
            score++;
            scoreDisplay.textContent = score;
            
            // Create new food
            createFood();
            
            // Grow snake (by not removing the tail in moveSnake)
            // Add a new segment at the current tail position
            const tail = snake[snake.length - 1];
            snake.push({x: tail.x, y: tail.y});
        }
    }
    
    /**
     * Creates food at a random position that's not on the snake
     */
    function createFood() {
        // Generate random position
        let newFood;
        let foodOnSnake;
        
        do {
            foodOnSnake = false;
            newFood = {
                x: Math.floor(Math.random() * gridWidth),
                y: Math.floor(Math.random() * gridHeight)
            };
            
            // Check if the food is on any part of the snake
            for (const segment of snake) {
                if (newFood.x === segment.x && newFood.y === segment.y) {
                    foodOnSnake = true;
                    break;
                }
            }
        } while (foodOnSnake);
        
        // Set the new food
        food = newFood;
    }
    
    /**
     * Draws the current game state to the canvas
     */
    function drawGame() {
        // Clear canvas
        ctx.fillStyle = '#f7fafc'; // Light gray background
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw light grid lines for better visualization
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;
        
        // Vertical grid lines
        for (let x = 0; x <= canvasWidth; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let y = 0; y <= canvasHeight; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }
        
        // Draw food
        ctx.fillStyle = '#e53e3e'; // Red food
        drawRoundedRect(
            food.x * GRID_SIZE, 
            food.y * GRID_SIZE, 
            GRID_SIZE, 
            GRID_SIZE, 
            GRID_SIZE / 4
        );
        
        // Draw snake
        for (let i = 0; i < snake.length; i++) {
            // Different shade for head
            if (i === 0) {
                ctx.fillStyle = '#2f855a'; // Darker green for head
            } else {
                ctx.fillStyle = '#38a169'; // Green for body
            }
            
            // Draw rounded rectangle for each segment
            drawRoundedRect(
                snake[i].x * GRID_SIZE, 
                snake[i].y * GRID_SIZE, 
                GRID_SIZE, 
                GRID_SIZE, 
                GRID_SIZE / 4
            );
        }
    }
    
    /**
     * Helper function to draw rounded rectangles
     */
    function drawRoundedRect(x, y, width, height, radius) {
        // Ensure radius is not too large
        radius = Math.min(radius, Math.min(width, height) / 2);
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Ends the game
     */
    function endGame() {
        clearInterval(gameInterval);
        gameActive = false;
        
        // Check for high score
        if (score > highScore) {
            highScore = score;
            highScoreDisplay.textContent = highScore;
            saveGameData();
            newHighScoreMessage.classList.remove('hidden');
        } else {
            newHighScoreMessage.classList.add('hidden');
        }
        
        // Update game over modal
        finalScoreMessage.textContent = `Your score: ${score}`;
        gameOverModal.classList.remove('hidden');
    }
    
    /**
     * Resets the game
     */
    function resetGame() {
        // Hide modals
        gameOverModal.classList.add('hidden');
        
        // Initialize new game
        initGame();
    }
    
    /**
     * Clears the high score
     */
    function clearHighScore() {
        highScore = 0;
        highScoreDisplay.textContent = highScore;
        saveGameData();
    }
    
    /**
     * Saves game data to localStorage
     */
    function saveGameData() {
        const gameData = {
            highScore
        };
        
        localStorage.setItem(localStorageKey, JSON.stringify(gameData));
    }
    
    /**
     * Loads game data from localStorage
     */
    function loadGameData() {
        const savedData = localStorage.getItem(localStorageKey);
        
        if (savedData) {
            try {
                const gameData = JSON.parse(savedData);
                highScore = gameData.highScore || 0;
                highScoreDisplay.textContent = highScore;
            } catch (error) {
                console.error('Error loading game data:', error);
                highScore = 0;
            }
        } else {
            highScore = 0;
        }
    }
    
    /**
     * Changes the snake's direction based on keypress
     */
    function changeDirection(newDirection) {
        // Prevent 180-degree turns (can't go directly opposite)
        if (
            (direction === 'up' && newDirection === 'down') ||
            (direction === 'down' && newDirection === 'up') ||
            (direction === 'left' && newDirection === 'right') ||
            (direction === 'right' && newDirection === 'left')
        ) {
            return;
        }
        
        nextDirection = newDirection;
        
        // Start the game if it hasn't started yet
        if (!gameActive) {
            startGame();
        }
    }
    
    // Event Listeners
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault(); // Prevent page scrolling
                changeDirection('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                changeDirection('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                changeDirection('left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                changeDirection('right');
                break;
        }
    });
    
    // Mobile control buttons
    upButton.addEventListener('click', () => changeDirection('up'));
    downButton.addEventListener('click', () => changeDirection('down'));
    leftButton.addEventListener('click', () => changeDirection('left'));
    rightButton.addEventListener('click', () => changeDirection('right'));
    
    // Speed selector
    speedSelect.addEventListener('change', () => {
        if (gameActive) {
            // Restart game with new speed
            clearInterval(gameInterval);
            const speed = speeds[speedSelect.value];
            gameInterval = setInterval(updateGame, speed);
        }
    });
    
    // Start buttons
    startButton.addEventListener('click', startGame);
    desktopStartButton.addEventListener('click', startGame);
    
    // Reset button
    resetButton.addEventListener('click', resetGame);
    
    // Clear high score button
    clearScoreButton.addEventListener('click', clearHighScore);
    
    // Play again button in game over modal
    playAgainButton.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        resetGame();
    });
    
    // Start playing button in instructions modal
    startPlayingButton.addEventListener('click', () => {
        instructionsModal.classList.add('hidden');
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Only resize if the game isn't active
        if (!gameActive) {
            setupCanvas();
            drawGame();
        }
    });
    
    // Touch swipe detection for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    // Add touch event listeners to the canvas
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent scrolling when touching the canvas
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        const swipeThreshold = 30; // Minimum distance for a swipe
        const horizontalDistance = touchEndX - touchStartX;
        const verticalDistance = touchEndY - touchStartY;
        
        // Check if the swipe is primarily horizontal or vertical
        if (Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
            // Horizontal swipe
            if (horizontalDistance > swipeThreshold) {
                changeDirection('right');
            } else if (horizontalDistance < -swipeThreshold) {
                changeDirection('left');
            }
        } else {
            // Vertical swipe
            if (verticalDistance > swipeThreshold) {
                changeDirection('down');
            } else if (verticalDistance < -swipeThreshold) {
                changeDirection('up');
            }
        }
    }
    
    // Add touch event to whole document to prevent unwanted scrolling during game
    document.addEventListener('touchmove', function(e) {
        if (gameActive) {
            e.preventDefault(); // Prevent scrolling while game is active
        }
    }, { passive: false });
    
    // Improve mobile button experience by adding a small vibration feedback if available
    function vibrateIfAvailable(duration = 20) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }
    
    // Update mobile control buttons with vibration
    upButton.addEventListener('touchstart', () => {
        vibrateIfAvailable();
        changeDirection('up');
    });
    
    downButton.addEventListener('touchstart', () => {
        vibrateIfAvailable();
        changeDirection('down');
    });
    
    leftButton.addEventListener('touchstart', () => {
        vibrateIfAvailable();
        changeDirection('left');
    });
    
    rightButton.addEventListener('touchstart', () => {
        vibrateIfAvailable();
        changeDirection('right');
    });
    
    // Initialize the game
    initGame();
});
