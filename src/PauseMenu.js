export class PauseMenu {
  constructor(game) {
    this.game = game;
    this.menuElement = document.getElementById('pause-menu');
    this.resumeButton = document.getElementById('resume-button');
    this.fullscreenButton = document.getElementById('fullscreen-button');
    this.quitButton = document.getElementById('quit-button');
    this.renderDistanceInput = document.getElementById('pause-render-distance-input');
    this.renderDistanceValue = document.getElementById('pause-render-distance-value');
    
    this.isVisible = false;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Resume button
    this.resumeButton.addEventListener('click', () => {
      this.resume();
    });

    // Fullscreen button
    this.fullscreenButton.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Quit button
    this.quitButton.addEventListener('click', () => {
      // For now, simplest way to quit to title is to reload, 
      // as resetting the whole Three.js / Game state manually is complex.
      window.location.reload();
    });

    // Render Distance
    this.renderDistanceInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.renderDistanceValue.innerText = value;
      
      // Save to localStorage
      localStorage.setItem('voxel_render_distance', value);

      // Update game render distance
      if (this.game.world) {
        this.game.world.setRenderDistance(value);
      }
    });
  }

  show() {
    this.isVisible = true;
    this.menuElement.style.display = 'flex';
    
    // Sync render distance value
    if (this.game.world) {
      this.renderDistanceInput.value = this.game.world.renderDistance;
      this.renderDistanceValue.innerText = this.game.world.renderDistance;
    }
  }

  hide() {
    this.isVisible = false;
    this.menuElement.style.display = 'none';
  }

  resume() {
    this.hide();
    this.game.player.controls.lock();
    
    // Attempt to restore fullscreen if it was lost
    if (!document.fullscreenElement) {
        this.requestFullscreen();
    } else {
        // Already in fullscreen, try to lock keys again just in case
        this.lockKeys();
    }
  }

  toggleFullscreen() {
      if (!document.fullscreenElement) {
          this.requestFullscreen();
      } else {
          document.exitFullscreen();
      }
  }

  requestFullscreen() {
      document.body.requestFullscreen().then(() => {
          this.lockKeys();
      }).catch(err => {
          console.warn("Error attempting to enable full-screen mode:", err);
      });
  }

  lockKeys() {
      // Experimental API to capture Escape key
      if (navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock(['Escape']).catch(console.error);
      }
  }
  
  toggle() {
      if (this.isVisible) {
          this.resume();
      } else {
          this.show();
      }
  }
}
