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

    let gamePhase = 'settingWord';

    // --- Functions ---

    function initializeGame() {
        console.log("Initializing game...");
        incorrectGuesses = 0;
        guessedLetters.clear();

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

    function handleSetWord() {
        const word = secretWordInput.value.trim().toUpperCase();

        if (word === '' || !/^[A-Z]+$/.test(word)) {
            alert("Please enter a valid word using only letters.");
            return;
        }

        secretWord = word;
        maskedWord = '_'.repeat(secretWord.length);
        maskedWordDisplay.textContent = maskedWord.split('').join(' ');
        gameStatus.textContent = 'Start guessing!';

        showGuessing();
        console.log("Secret word set. Switched to guessing phase.");
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

    function updateMaskedWordDisplay(guess) {
        let newMaskedWord = '';
        let wordChanged = false;
        for (let i = 0; i < secretWord.length; i++) {
            if (secretWord[i] === guess) {
                newMaskedWord += guess;
                if (maskedWord[i] !== guess) {
                    wordChanged = true;
                }
            } else {
                newMaskedWord += maskedWord[i];
            }
        }
        maskedWord = newMaskedWord;
        maskedWordDisplay.textContent = maskedWord.split('').join(' ');

        return wordChanged;
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

    function checkWin() {
        if (!maskedWord.includes('_')) {
            gameStatus.textContent = `You won! The word was "${secretWord}"!`;
            gameStatus.classList.add('win-text', 'win-animation');

            showWinModal();

            endGame();

            console.log("Game won.");
        }
    }

    function checkLoss() {
        if (incorrectGuesses >= maxIncorrectGuesses) {
            gameStatus.textContent = `You lost! The word was "${secretWord}".`;
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
