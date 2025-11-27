export class Menu {
  constructor(game) {
    this.game = game;
    this.menuElement = document.getElementById('main-menu');
    this.playButton = document.getElementById('play-button');
    this.usernameInput = document.getElementById('username-input');
    this.renderDistanceInput = document.getElementById('render-distance-input');
    this.renderDistanceValue = document.getElementById('render-distance-value');

    this.setupEventListeners();
    
    // Set initial random username
    this.usernameInput.value = "Player" + Math.floor(Math.random() * 1000);
  }

  setupEventListeners() {
    // Update render distance value display
    this.renderDistanceInput.addEventListener('input', (e) => {
      this.renderDistanceValue.innerText = e.target.value;
    });

    // Play button click
    this.playButton.addEventListener('click', () => {
      this.startGame();
    });

    // Allow Enter key to start game
    this.usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.startGame();
      }
    });
  }

  startGame() {
    const username = this.usernameInput.value.trim() || "Player";
    const renderDistance = parseInt(this.renderDistanceInput.value);

    // Hide menu
    this.menuElement.style.display = 'none';
    
    // Start the game
    this.game.start(username, renderDistance);
  }

  show() {
    this.menuElement.style.display = 'flex';
  }
}
