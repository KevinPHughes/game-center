// Hangman specific JavaScript

document.addEventListener('DOMContentLoaded', () => {
    console.log("Hangman page loaded.");

    // --- DOM Elements ---
    const wordSettingArea = document.getElementById('wordSettingArea');
    const secretWordInput = document.getElementById('secretWordInput');
    const setWordButton = document.getElementById('setWordButton');

    const guessingArea = document.getElementById('guessingArea');
    const hangmanSVG = document.getElementById('hangmanSVG'); // Reference to the SVG element
    const maskedWordDisplay = document.getElementById('maskedWordDisplay');
    // const guessInput = document.getElementById('guessInput'); // Removed native input
    // const guessButton = document.getElementById('guessButton'); // Removed native button
    const usedLettersDisplay = document.getElementById('usedLettersDisplay');
    const gameStatus = document.getElementById('gameStatus');
    const playAgainButton = document.getElementById('playAgainButton');
    // Full-screen overlay element
    const loseOverlay = document.getElementById('loseOverlay');
    const body = document.body; // Reference to the body element
    // New: On-screen keyboard container
    const keyboardElement = document.getElementById('keyboard');


    // --- SVG Hangman Parts ---
    // Get references to each SVG element representing a hangman part
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
    let guessedLetters = new Set(); // Use a Set for efficient checking of used letters
    let incorrectGuesses = 0;
    // The number of incorrect guesses allowed is now tied to the number of man parts
    const maxIncorrectGuesses = hangmanParts.filter(part => part.id.startsWith('man')).length; // Count only the 'man' parts


    let gamePhase = 'settingWord'; // 'settingWord' or 'guessing'

    // --- Functions ---

    /**
     * Initializes the game state and UI based on the current phase.
     */
    function initializeGame() {
        console.log("Initializing game...");
        incorrectGuesses = 0;
        guessedLetters.clear();
        // gameActive = true; // Assuming gameActive is managed within Hangman if needed

        // Start in the word setting phase
        showWordSetting();
        gameStatus.textContent = ''; // Clear status message
        // Remove any win/lose animation classes from previous game status text
        gameStatus.classList.remove('win-text', 'lose-text', 'win-animation', 'lose-animation');
        // Hide any full-screen effects
        hideEffects();

        updateHangmanDisplay(); // Show initial empty gallows (no man parts)
        usedLettersDisplay.textContent = 'Used Letters: '; // Clear used letters
        playAgainButton.classList.add('hidden'); // Hide play again button
        secretWordInput.value = ''; // Clear secret word input

        createKeyboard(); // Create and reset the on-screen keyboard

         console.log("Game initialized to word setting phase.");
    }

    /**
     * Shows the word setting area and hides the guessing area.
     */
    function showWordSetting() {
        wordSettingArea.classList.remove('hidden');
        guessingArea.classList.add('hidden');
        gamePhase = 'settingWord';
        console.log("Switched to word setting phase.");
    }

    /**
     * Shows the guessing area and hides the word setting area.
     */
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
        const word = secretWordInput.value.trim().toUpperCase(); // Get word and convert to uppercase

        // Basic validation: check if word is not empty and contains only letters
        if (word === '' || !/^[A-Z]+$/.test(word)) {
            // Use a more user-friendly way than alert() in a real app, but keeping for now
            alert("Please enter a valid word using only letters.");
            return;
        }

        secretWord = word;
        maskedWord = '_'.repeat(secretWord.length); // Initialize masked word with underscores
        maskedWordDisplay.textContent = maskedWord.split('').join(' '); // Display with spaces
        gameStatus.textContent = 'Start guessing!';

        showGuessing(); // Switch to the guessing phase
        // No need to focus native input anymore
        console.log("Secret word set. Switched to guessing phase.");
    }

    /**
     * Creates the on-screen keyboard buttons.
     */
    function createKeyboard() {
        keyboardElement.innerHTML = ''; // Clear any existing keyboard
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const letter of alphabet) {
            const button = document.createElement('div'); // Use div for styling flexibility
            button.classList.add('keyboard-letter'); // Apply base style class
            button.textContent = letter;
            button.dataset.letter = letter; // Store the letter in a data attribute
            button.addEventListener('click', handleLetterClick); // Add click listener
            keyboardElement.appendChild(button);
        }
        console.log("On-screen keyboard created.");
    }

    /**
     * Handles a click on a letter button in the on-screen keyboard.
     * @param {Event} event - The click event object.
     */
    function handleLetterClick(event) {
        const clickedButton = event.target;
        const guess = clickedButton.dataset.letter; // Get the letter from the data attribute

        // Check if the button is already disabled (guessed)
        if (clickedButton.classList.contains('guessed')) {
            console.log(`Letter '${guess}' already guessed.`);
            return; // Ignore clicks on already guessed letters
        }

        // Add the guessed letter to the set of used letters
        guessedLetters.add(guess);
        updateUsedLettersDisplay(); // Update the display of used letters

        // Disable the clicked button
        clickedButton.classList.add('guessed');

        // Check if the guessed letter is in the secret word
        if (secretWord.includes(guess)) {
            gameStatus.textContent = `'${guess}' is correct!`;
            // Remove lose classes if they were there
            gameStatus.classList.remove('lose-text', 'lose-animation');
            updateMaskedWordDisplay(guess); // Update the masked word display
            checkWin(); // Check if the player has won
        } else {
            gameStatus.textContent = `'${guess}' is incorrect.`;
             // Remove win classes if they were there
            gameStatus.classList.remove('win-text', 'win-animation');
            incorrectGuesses++; // Increment incorrect guesses
            updateHangmanDisplay(); // Update the hangman drawing
            checkLoss(); // Check if the player has lost
        }
         console.log(`Guessed: ${guess}. Secret word: ${secretWord}. Masked word: ${maskedWord}`);
    }


    /**
     * Updates the masked word display with correctly guessed letters.
     * @param {string} guess - The correctly guessed letter.
     */
    function updateMaskedWordDisplay(guess) {
        let newMaskedWord = '';
        let wordChanged = false;
        for (let i = 0; i < secretWord.length; i++) {
            if (secretWord[i] === guess) {
                newMaskedWord += guess;
                if (maskedWord[i] !== guess) {
                    wordChanged = true; // Flag if any underscore was replaced
                }
            } else {
                newMaskedWord += maskedWord[i];
            }
        }
        maskedWord = newMaskedWord;
        maskedWordDisplay.textContent = maskedWord.split('').join(' '); // Display with spaces

        // Return true if the masked word actually changed (i.e., the guess was correct and new)
        return wordChanged;
    }

    /**
     * Updates the hangman drawing based on the number of incorrect guesses.
     * Controls the visibility of SVG parts.
     */
    function updateHangmanDisplay() {
         // Hide all man parts initially
        hangmanParts.forEach(part => {
            if (part.id.startsWith('man')) {
                 part.classList.add('hidden-part'); // Use a CSS class to hide
            } else {
                 // Ensure gallows parts are visible
                 part.classList.remove('hidden-part');
            }
        });

        // Show man parts based on incorrect guesses
        const manParts = hangmanParts.filter(part => part.id.startsWith('man'));
        for (let i = 0; i < incorrectGuesses; i++) {
            if (i < manParts.length) {
                 if (manParts[i]) {
                      manParts[i].classList.remove('hidden-part');
                 }
            }
        }
    }

    /**
     * Updates the display of letters that have already been guessed.
     */
    function updateUsedLettersDisplay() {
        usedLettersDisplay.textContent = 'Used Letters: ' + Array.from(guessedLetters).sort().join(', ');
    }

    /**
     * Checks if the player has won the game.
     */
    function checkWin() {
        // Player wins if the masked word no longer contains underscores
        if (!maskedWord.includes('_')) {
            gameStatus.textContent = `You won! The word was "${secretWord}"!`;
            gameStatus.classList.add('win-text', 'win-animation'); // Add win classes to status text
            // Trigger win background effect
            body.classList.add('win-background');
            endGame();
            // Hide effects after a delay
            setTimeout(hideEffects, 3000); // Hide effects after 3 seconds
            console.log("Game won.");
        }
    }

    /**
     * Checks if the player has lost the game.
     */
    function checkLoss() {
        // Player loses if incorrect guesses reach the maximum allowed
        if (incorrectGuesses >= maxIncorrectGuesses) {
            gameStatus.textContent = `You lost! The word was "${secretWord}".`;
            gameStatus.classList.add('lose-text', 'lose-animation'); // Add lose classes to status text
            updateHangmanDisplay(); // Ensure the final hangman stage is shown
            // Trigger lose overlay effect
            loseOverlay.classList.add('show-overlay');
            endGame();
             // Hide effects after a delay
            setTimeout(hideEffects, 3000); // Hide effects after 3 seconds
            console.log("Game lost.");
        }
    }

    /**
     * Ends the current game session.
     */
    function endGame() {
        // gameActive = false; // Assuming gameActive is managed within Hangman if needed
        // Disable all keyboard buttons
        keyboardElement.querySelectorAll('.keyboard-letter').forEach(button => {
            button.classList.add('guessed'); // Use the 'guessed' class to disable clicks and style
        });

        playAgainButton.classList.remove('hidden'); // Show the play again button
        console.log("Game ended.");
    }

     /**
     * Hides any active full-screen win or lose effects.
     */
    function hideEffects() {
        body.classList.remove('win-background');
        loseOverlay.classList.remove('show-overlay');
        console.log("Full-screen effects hidden.");
    }


    /**
     * Resets the game to the initial state.
     */
    function playAgain() {
        console.log("Play Again button clicked. Resetting game.");
        initializeGame(); // Re-initialize the game
    }


    // --- Event Listeners ---
    setWordButton.addEventListener('click', handleSetWord);
    playAgainButton.addEventListener('click', playAgain);

     // Allow pressing Enter in the secret word input to trigger setting the word
     secretWordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission behavior
            handleSetWord();
        }
    });


    // --- Initial Setup ---
    initializeGame(); // Start the game when the page loads

}); // End DOMContentLoaded wrapper
