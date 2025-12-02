export class Menu {
  constructor(game) {
    this.game = game;
    this.menuElement = document.getElementById('main-menu');
    this.playButton = document.getElementById('play-button');
    this.usernameInput = document.getElementById('username-input');
    this.renderDistanceInput = document.getElementById('render-distance-input');
    this.renderDistanceValue = document.getElementById('render-distance-value');
    this.rendererSelect = document.getElementById('renderer-select');

    this.setupEventListeners();
    
    // Load username from localStorage
    const savedUsername = localStorage.getItem('voxel_username');
    if (savedUsername) {
      this.usernameInput.value = savedUsername;
    } else {
      // Set initial random username
      this.usernameInput.value = "Player" + Math.floor(Math.random() * 1000);
    }

    // Load render distance from localStorage
    const savedRenderDistance = localStorage.getItem('voxel_render_distance');
    if (savedRenderDistance) {
      this.renderDistanceInput.value = savedRenderDistance;
      this.renderDistanceValue.innerText = savedRenderDistance;
    }

    // Load renderer choice from localStorage
    const savedRenderer = localStorage.getItem('voxel_renderer');
    if (savedRenderer) {
      this.rendererSelect.value = savedRenderer;
    }
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

  async startGame() {
    const username = this.usernameInput.value.trim() || "Player";
    const renderDistance = parseInt(this.renderDistanceInput.value);
    const rendererType = this.rendererSelect.value;

    // Save username to localStorage
    localStorage.setItem('voxel_username', username);
    // Save render distance to localStorage
    localStorage.setItem('voxel_render_distance', renderDistance);
    // Save renderer choice to localStorage
    localStorage.setItem('voxel_renderer', rendererType);

    // Hide menu
    this.menuElement.style.display = 'none';
    
    // Start the game
    await this.game.start(username, renderDistance, rendererType);
  }

  show() {
    this.menuElement.style.display = 'flex';
  }
}
