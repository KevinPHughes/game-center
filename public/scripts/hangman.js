// Hangman specific JavaScript

document.addEventListener('DOMContentLoaded', () => {
    console.log("Hangman page loaded.");

    // --- DOM Elements ---
    const wordSettingArea = document.getElementById('wordSettingArea');
    const secretWordInput = document.getElementById('secretWordInput');
    const setWordButton = document.getElementById('setWordButton');
    const randomWordButton = document.getElementById('randomWordButton');

    const guessingArea = document.getElementById('guessingArea');
    const hangmanSVG = document.getElementById('hangmanSVG'); // Reference to the SVG element
    const maskedWordDisplay = document.getElementById('maskedWordDisplay');
    const usedLettersDisplay = document.getElementById('usedLettersDisplay');
    const gameStatus = document.getElementById('gameStatus');
    const playAgainButton = document.getElementById('playAgainButton');
    const loseOverlay = document.getElementById('loseOverlay');
    const body = document.body; // Reference to the body element
    const keyboardElement = document.getElementById('keyboard');

    // Add new modal elements
    const winModal = document.getElementById('winModal');
    const loseModal = document.getElementById('loseModal');
    const winWordReveal = document.getElementById('winWordReveal');
    const loseWordReveal = document.getElementById('loseWordReveal');
    const winPlayAgainButton = document.getElementById('winPlayAgainButton');
    const losePlayAgainButton = document.getElementById('losePlayAgainButton');
    const confettiContainer = document.getElementById('confetti-container');

    // --- SVG Hangman Parts ---
    const hangmanParts = [
        document.getElementById('gallowsBase'),
        document.getElementById('gallowsPost'),
        document.getElementById('gallowsBeam'),
        document.getElementById('gallowsRope'),
        document.getElementById('manHead'),
        document.getElementById('manBody'),
        document.getElementById('manLeftArm'),
        document.getElementById('manRightArm'),
        document.getElementById('manLeftLeg'),
        document.getElementById('manRightLeg')
    ];

    // --- Game State Variables ---
    let secretWord = '';
    let maskedWord = '';
    let guessedLetters = new Set();
    let incorrectGuesses = 0;
    const maxIncorrectGuesses = hangmanParts.filter(part => part.id.startsWith('man')).length;
    let isRandomWord = false;

    let gamePhase = 'settingWord';

    // --- Functions ---

    function initializeGame() {
        console.log("Initializing game...");
        incorrectGuesses = 0;
        guessedLetters.clear();
        isRandomWord = false;

        showWordSetting();
        gameStatus.textContent = '';
        gameStatus.classList.remove('win-text', 'lose-text', 'win-animation', 'lose-animation');
        hideEffects();
        hideModals();

        updateHangmanDisplay();
        usedLettersDisplay.textContent = 'Used Letters: ';
        playAgainButton.classList.add('hidden');
        secretWordInput.value = '';

        createKeyboard();

        // Re-enable the random word button if it was disabled
        randomWordButton.disabled = false;
        randomWordButton.classList.remove('opacity-50');

        console.log("Game initialized to word setting phase.");
    }

    function showWordSetting() {
        wordSettingArea.classList.remove('hidden');
        guessingArea.classList.add('hidden');
        gamePhase = 'settingWord';
        console.log("Switched to word setting phase.");
    }

    function showGuessing() {
        wordSettingArea.classList.add('hidden');
        guessingArea.classList.remove('hidden');
        gamePhase = 'guessing';
        console.log("Switched to guessing phase.");
    }

    /**
     * Handles setting the secret word.
     */
    function handleSetWord() {
        const phrase = secretWordInput.value.trim().toUpperCase();

        if (phrase === '') {
            alert("Please enter a word or phrase.");
            return;
        }

        // Validate that the input only contains letters and spaces
        if (!/^[A-Z\s]+$/.test(phrase)) {
            alert("Please use only letters and spaces.");
            return;
        }

        // Validate each word against the dictionary
        validatePhrase(phrase).then(isValid => {
            if (isValid) {
                secretWord = phrase;
                
                // Create masked word, preserving spaces
                maskedWord = '';
                for (let i = 0; i < secretWord.length; i++) {
                    if (secretWord[i] === ' ') {
                        maskedWord += ' ';
                    } else {
                        maskedWord += '_';
                    }
                }
                
                displayMaskedWord(); // Use the new function to display
                gameStatus.textContent = 'Start guessing!';
                
                showGuessing();
                console.log("Secret phrase set. Switched to guessing phase.");
            } else {
                gameStatus.textContent = '';
            }
        });
    }

    /**
     * Handles fetching and setting a random word
     */
    async function handleRandomWord() {
        try {
            gameStatus.textContent = 'Fetching a random word...';
            
            // Disable the button while fetching
            randomWordButton.disabled = true;
            randomWordButton.classList.add('opacity-50');
            
            const word = await fetchRandomWord();
            
            if (word) {
                secretWord = word.toUpperCase();
                isRandomWord = true;
                
                // Create masked word
                maskedWord = '_'.repeat(secretWord.length);
                
                displayMaskedWord();
                gameStatus.textContent = 'Start guessing the random word!';
                
                showGuessing();
                console.log("Random word set. Switched to guessing phase.");
            } else {
                gameStatus.textContent = 'Failed to get a random word. Please try again.';
                // Re-enable the button
                randomWordButton.disabled = false;
                randomWordButton.classList.remove('opacity-50');
            }
        } catch (error) {
            console.error("Error getting random word:", error);
            gameStatus.textContent = 'Failed to get a random word. Please try again.';
            // Re-enable the button
            randomWordButton.disabled = false;
            randomWordButton.classList.remove('opacity-50');
        }
    }
    
    /**
     * Fetches a random word from an API
     * @returns {Promise<string>} A promise that resolves to a random word
     */
    async function fetchRandomWord() {
        try {
            // Using the Random Word API
            const response = await fetch('https://random-word-api.herokuapp.com/word');
            const data = await response.json();
            
            // The API returns an array with a single word
            if (data && data.length > 0) {
                return data[0];
            }
            
            throw new Error('Invalid response from random word API');
        } catch (error) {
            console.error("Error fetching random word:", error);
            
            // Fallback to a local list of words if the API fails
            const fallbackWords = [
                'APPLE', 'BANANA', 'COMPUTER', 'DEVELOPER', 'ELEPHANT', 
                'FOOTBALL', 'GUITAR', 'HANGMAN', 'INTERNET', 'JAVASCRIPT',
                'KEYBOARD', 'LIGHTHOUSE', 'MOUNTAIN', 'NOTEBOOK', 'OCEAN',
                'PUZZLE', 'QUALITY', 'RAINBOW', 'SOFTWARE', 'TECHNOLOGY'
            ];
            
            const randomIndex = Math.floor(Math.random() * fallbackWords.length);
            return fallbackWords[randomIndex];
        }
    }

    /**
     * Validates a phrase by checking each word against a dictionary API.
     * @param {string} phrase - The phrase to validate.
     * @returns {Promise<boolean>} - Promise resolving to true if all words are valid.
     */
    async function validatePhrase(phrase) {
        // Split the phrase into individual words
        const words = phrase.split(/\s+/).filter(word => word.length > 0);
        
        if (words.length === 0) return false;
        
        try {
            // Track which words are invalid
            const invalidWords = [];
            
            // Check each word against the dictionary API
            for (const word of words) {
                const isValid = await checkWordInDictionary(word);
                if (!isValid) {
                    invalidWords.push(word.toLowerCase());
                }
            }
            
            // If any words are invalid, show an error
            if (invalidWords.length > 0) {
                if (invalidWords.length === 1) {
                    alert(`"${invalidWords[0]}" is not in our dictionary. Please use common words.`);
                } else {
                    alert(`The following words are not in our dictionary: ${invalidWords.join(', ')}. Please use common words.`);
                }
                return false;
            }
            
            return true;
        } catch (error) {
            console.error("Dictionary validation error:", error);
            // If there's an API error, allow the word to proceed
            alert("We couldn't validate some words. You can continue, but please ensure all words are valid.");
            return true;
        }
    }

    /**
     * Checks if a word exists in the dictionary using an API.
     * @param {string} word - The word to validate.
     * @returns {Promise<boolean>} - Promise resolving to true if the word is valid.
     */
    async function checkWordInDictionary(word) {
        if (word.length <= 1) return false;
        
        try {
            // Use Free Dictionary API to check if the word exists
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
            return response.ok;
        } catch (error) {
            console.error(`Error checking word "${word}":`, error);
            return true; // Assume valid on error
        }
    }

    /**
     * Displays the masked word, maintaining proper spacing and placing each word on a new line.
     */
    function displayMaskedWord() {
        // Split the masked word by spaces to get individual words
        const words = maskedWord.split(' ');
        
        // Process each word to add spaces between letters for display
        const formattedWords = words.map(word => 
            word.split('').join(' ')
        );
        
        // Join the words with HTML line breaks
        const displayText = formattedWords.join('<br>');
        
        maskedWordDisplay.innerHTML = displayText;
    }

    /**
     * Updates the masked word display with correctly guessed letters.
     * @param {string} guess - The correctly guessed letter.
     */
    function updateMaskedWordDisplay(guess) {
        let newMaskedWord = '';
        let wordChanged = false;
        
        for (let i = 0; i < secretWord.length; i++) {
            if (secretWord[i] === ' ') {
                newMaskedWord += ' '; // Preserve spaces
            } else if (secretWord[i] === guess) {
                newMaskedWord += guess;
                if (maskedWord[i] !== guess) {
                    wordChanged = true; // Flag if any underscore was replaced
                }
            } else {
                newMaskedWord += maskedWord[i];
            }
        }
        
        maskedWord = newMaskedWord;
        displayMaskedWord(); // Use the new display function

        // Return true if the masked word actually changed
        return wordChanged;
    }

    function createKeyboard() {
        keyboardElement.innerHTML = '';

        const keyboardRows = [
            'QWERTYUIOP',
            'ASDFGHJKL',
            'ZXCVBNM'
        ];

        keyboardRows.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.classList.add('flex', 'justify-center', 'gap-1');

            for (const letter of row) {
                const button = document.createElement('div');
                button.classList.add('keyboard-letter');
                button.textContent = letter;
                button.dataset.letter = letter;
                button.addEventListener('click', handleLetterClick);
                rowElement.appendChild(button);
            }

            keyboardElement.appendChild(rowElement);
        });

        console.log("QWERTY on-screen keyboard created.");
    }

    function handleLetterClick(event) {
        const clickedButton = event.target;
        const guess = clickedButton.dataset.letter;

        if (clickedButton.classList.contains('guessed')) {
            console.log(`Letter '${guess}' already guessed.`);
            return;
        }

        guessedLetters.add(guess);
        updateUsedLettersDisplay();

        clickedButton.classList.add('guessed');

        if (secretWord.includes(guess)) {
            gameStatus.textContent = `'${guess}' is correct!`;
            gameStatus.classList.remove('lose-text', 'lose-animation');
            updateMaskedWordDisplay(guess);
            checkWin();
        } else {
            gameStatus.textContent = `'${guess}' is incorrect.`;
            gameStatus.classList.remove('win-text', 'win-animation');
            incorrectGuesses++;
            updateHangmanDisplay();
            checkLoss();
        }
        console.log(`Guessed: ${guess}. Secret word: ${secretWord}. Masked word: ${maskedWord}`);
    }

    function updateHangmanDisplay() {
        hangmanParts.forEach(part => {
            if (part.id.startsWith('man')) {
                part.classList.add('hidden-part');
            } else {
                part.classList.remove('hidden-part');
            }
        });

        const manParts = hangmanParts.filter(part => part.id.startsWith('man'));
        for (let i = 0; i < incorrectGuesses; i++) {
            if (i < manParts.length) {
                if (manParts[i]) {
                    manParts[i].classList.remove('hidden-part');
                }
            }
        }
    }

    function updateUsedLettersDisplay() {
        usedLettersDisplay.textContent = 'Used Letters: ' + Array.from(guessedLetters).sort().join(', ');
    }

    /**
     * Checks if the player has won the game.
     */
    function checkWin() {
        // Player wins if the masked word no longer contains underscores
        if (!maskedWord.includes('_')) {
            const winMessage = isRandomWord ? 
                `You won! The random word was "${secretWord}"!` : 
                `You won! The phrase was "${secretWord}"!`;
            
            gameStatus.textContent = winMessage;
            gameStatus.classList.add('win-text', 'win-animation');

            showWinModal();
            endGame();
            console.log("Game won.");
        }
    }

    function checkLoss() {
        if (incorrectGuesses >= maxIncorrectGuesses) {
            const loseMessage = isRandomWord ? 
                `You lost! The random word was "${secretWord}".` : 
                `You lost! The word was "${secretWord}".`;
            
            gameStatus.textContent = loseMessage;
            gameStatus.classList.add('lose-text', 'lose-animation');
            updateHangmanDisplay();

            showLoseModal();

            endGame();

            console.log("Game lost.");
        }
    }

    function endGame() {
        keyboardElement.querySelectorAll('.keyboard-letter').forEach(button => {
            button.classList.add('guessed');
        });

        playAgainButton.classList.remove('hidden');
        console.log("Game ended.");
    }

    function hideEffects() {
        body.classList.remove('win-background');
        loseOverlay.classList.remove('show-overlay');
        hideModals();
        console.log("Full-screen effects hidden.");
    }

    function hideModals() {
        winModal.classList.remove('show-modal');
        loseModal.classList.remove('show-modal');
    }

    // Update the win and lose modal functions to properly display phrases
    function showWinModal() {
        winWordReveal.textContent = secretWord;
        winModal.classList.add('show-modal');
        fireConfetti();
    }

    function showLoseModal() {
        loseWordReveal.textContent = secretWord;
        loseModal.classList.add('show-modal');
    }

    function fireConfetti() {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    }

    function playAgain() {
        console.log("Play Again button clicked. Resetting game.");
        initializeGame();
    }

    setWordButton.addEventListener('click', handleSetWord);
    randomWordButton.addEventListener('click', handleRandomWord);
    playAgainButton.addEventListener('click', playAgain);

    secretWordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSetWord();
        }
    });

    winPlayAgainButton.addEventListener('click', playAgain);
    losePlayAgainButton.addEventListener('click', playAgain);

    initializeGame();
});
