import { Game } from './Game.js';
import { Menu } from './Menu.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  const menu = new Menu(game);
  menu.show();
});
