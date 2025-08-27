document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const gameBoard = document.getElementById('gameBoard');
    const moveCounter = document.getElementById('moveCounter');
    const timer = document.getElementById('timer');
    const matchCounter = document.getElementById('matchCounter');
    const totalPairs = document.getElementById('totalPairs');
    const startButton = document.getElementById('startButton');
    const difficultySelect = document.getElementById('difficultySelect');
    const resultModal = document.getElementById('resultModal');
    const finalTime = document.getElementById('finalTime');
    const finalMoves = document.getElementById('finalMoves');
    const playAgainButton = document.getElementById('playAgainButton');
    
    // Game State Variables
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let totalPairsCount = 8;
    let moves = 0;
    let gameStarted = false;
    let gameTime = 0;
    let timerInterval;
    let canFlip = true;
    
    // Card Icons
    const icons = [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
        '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
        '🦄', '🐲', '🦋', '🐙', '🦈', '🦂', '🦉', '🦚'
    ];
    
    // Game Configuration
    const difficulties = {
        easy: { cols: 4, rows: 4 },
        medium: { cols: 4, rows: 5 },
        hard: { cols: 5, rows: 6 }
    };
    
    /**
     * Initializes a new game
     */
    function initGame() {
        resetGameState();
        createCards();
        updateDisplay();
        
        // Start the timer when the first card is clicked
        gameBoard.addEventListener('click', startTimer, { once: true });
    }
    
    /**
     * Resets the game state to starting values
     */
    function resetGameState() {
        cards = [];
        flippedCards = [];
        matchedPairs = 0;
        moves = 0;
        gameStarted = false;
        gameTime = 0;
        canFlip = true;
        
        clearInterval(timerInterval);
        gameBoard.innerHTML = '';
        
        // Set difficulty
        const difficulty = difficultySelect.value;
        const config = difficulties[difficulty];
        gameBoard.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
        
        // Calculate total pairs
        totalPairsCount = Math.floor((config.cols * config.rows) / 2);
        totalPairs.textContent = totalPairsCount;
        
        updateDisplay();
    }
    
    /**
     * Creates the cards and adds them to the game board
     */
    function createCards() {
        const difficulty = difficultySelect.value;
        const config = difficulties[difficulty];
        const totalCards = config.cols * config.rows;
        
        // Ensure we have an even number of cards
        if (totalCards % 2 !== 0) {
            console.error('Card count must be even');
            return;
        }
        
        // Select random icons for this game
        const shuffledIcons = [...icons];
        shuffleArray(shuffledIcons);
        const gameIcons = shuffledIcons.slice(0, totalPairsCount);
        
        // Create pairs of cards
        const cardValues = [...gameIcons, ...gameIcons];
        shuffleArray(cardValues);
        
        // Create card elements
        for (let i = 0; i < totalCards; i++) {
            const card = document.createElement('div');
            card.classList.add(
                'card', 
                'bg-purple-100', 
                'rounded-lg', 
                'shadow',
                'cursor-pointer',
                'transform',
                'transition-transform',
                'duration-300',
                'hover:scale-105',
                'flex',
                'items-center',
                'justify-center',
                'h-20',
                'md:h-24'
            );
            card.dataset.index = i;
            card.dataset.value = cardValues[i];
            
            // Create the front and back of the card
            const cardFront = document.createElement('div');
            cardFront.classList.add('card-front', 'hidden', 'text-2xl', 'md:text-4xl');
            cardFront.textContent = cardValues[i];
            
            const cardBack = document.createElement('div');
            cardBack.classList.add('card-back', 'w-full', 'h-full', 'bg-purple-500', 'rounded-lg', 'flex', 'items-center', 'justify-center');
            cardBack.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
            
            card.appendChild(cardFront);
            card.appendChild(cardBack);
            
            card.addEventListener('click', () => flipCard(card));
            
            gameBoard.appendChild(card);
            cards.push(card);
        }
    }
    
    /**
     * Flips a card and processes the game logic
     * @param {HTMLElement} card - The card element to flip
     */
    function flipCard(card) {
        // Prevent flipping if game logic is processing or card is already flipped/matched
        if (!canFlip || flippedCards.includes(card) || card.classList.contains('matched')) {
            return;
        }
        
        // Visual flip
        const cardFront = card.querySelector('.card-front');
        const cardBack = card.querySelector('.card-back');
        cardFront.classList.remove('hidden');
        cardBack.classList.add('hidden');
        
        // Add to flipped cards
        flippedCards.push(card);
        
        // If we've flipped 2 cards, process the move
        if (flippedCards.length === 2) {
            moves++;
            updateDisplay();
            canFlip = false;
            
            const [card1, card2] = flippedCards;
            
            // Check for a match
            if (card1.dataset.value === card2.dataset.value) {
                // Match found
                setTimeout(() => {
                    card1.classList.add('matched', 'bg-green-200');
                    card2.classList.add('matched', 'bg-green-200');
                    flippedCards = [];
                    canFlip = true;
                    matchedPairs++;
                    updateDisplay();
                    
                    // Check if game is complete
                    if (matchedPairs === totalPairsCount) {
                        endGame();
                    }
                }, 500);
            } else {
                // No match, flip cards back
                setTimeout(() => {
                    card1.querySelector('.card-front').classList.add('hidden');
                    card1.querySelector('.card-back').classList.remove('hidden');
                    card2.querySelector('.card-front').classList.add('hidden');
                    card2.querySelector('.card-back').classList.remove('hidden');
                    flippedCards = [];
                    canFlip = true;
                }, 1000);
            }
        }
    }
    
    /**
     * Starts the game timer
     */
    function startTimer() {
        if (gameStarted) return;
        
        gameStarted = true;
        timerInterval = setInterval(() => {
            gameTime++;
            timer.textContent = gameTime;
        }, 1000);
    }
    
    /**
     * Ends the game and displays results
     */
    function endGame() {
        clearInterval(timerInterval);
        
        // Update results
        finalTime.textContent = gameTime;
        finalMoves.textContent = moves;
        
        // Show modal after a short delay
        setTimeout(() => {
            resultModal.classList.remove('hidden');
        }, 500);
    }
    
    /**
     * Updates the game display with current stats
     */
    function updateDisplay() {
        moveCounter.textContent = moves;
        timer.textContent = gameTime;
        matchCounter.textContent = matchedPairs;
    }
    
    /**
     * Shuffles an array in-place using Fisher-Yates algorithm
     * @param {Array} array - The array to shuffle
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Event Listeners
    startButton.addEventListener('click', initGame);
    
    playAgainButton.addEventListener('click', () => {
        resultModal.classList.add('hidden');
        initGame();
    });
    
    // Initialize the game on load
    initGame();
});
