# Game Center

A lightweight web application hosting various browser games, powered by Node.js.

## Overview

Game Center is a simple web server that hosts a collection of browser-based games. The server is built with vanilla Node.js without any external dependencies, making it easy to set up and run locally.

## Features

- **Simple Node.js Server**: Lightweight HTTP server without frameworks
- **Multiple Games**: Collection of browser-based games
- **Responsive Design**: Games work across different devices and screen sizes

### Current Games

- **Hangman**: Classic word guessing game with animated SVG graphics, on-screen keyboard, and win/lose animations

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd game-center
   ```

2. No dependencies to install! The project uses vanilla Node.js.

## Usage

1. Start the server:
   ```
   node server.js
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Select a game from the home page to play.

## Project Structure

```
game-center/
├── server.js              # Node.js HTTP server
├── public/                # Public assets directory
│   ├── index.html         # Home page / game selection
│   ├── hangman.html       # Hangman game page
│   ├── hangman.css        # Hangman-specific styles
│   ├── hangman.js         # Hangman game logic
│   ├── styles.css         # Common styles
│   └── 404.html           # Not found page
└── README.md              # This file
```

## Development

To add a new game:
1. Create HTML, CSS, and JS files for your game in the `public` directory
2. Add a link to your game on the index.html page

## License

[MIT License](LICENSE)