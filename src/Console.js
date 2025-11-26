export class Console {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.history = [];
        this.historyIndex = -1;
        
        this.createUI();
        this.setupEvents();
    }

    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'game-console';
        this.container.style.display = 'none';
        
        this.output = document.createElement('div');
        this.output.id = 'console-output';
        
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.id = 'console-input';
        this.input.placeholder = 'Enter command...';
        
        this.container.appendChild(this.output);
        this.container.appendChild(this.input);
        document.body.appendChild(this.container);
    }

    setupEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' || e.key === 't') {
                if (!this.isOpen && !this.game.player.controls.isLocked) {
                    // If chat is not open and controls are unlocked (menu mode), do nothing or maybe open?
                    // Usually we open chat when playing
                }
                
                if (!this.isOpen && this.game.player.controls.isLocked) {
                    e.preventDefault();
                    this.open();
                    if (e.key === '/') {
                        setTimeout(() => {
                            this.input.value = '/';
                        }, 0);
                    }
                }
            }

            if (this.isOpen) {
                e.stopPropagation(); // Prevent game controls from reacting
                
                if (e.key === 'Escape') {
                    this.close();
                } else if (e.key === 'Enter') {
                    this.processCommand(this.input.value);
                    this.input.value = '';
                }
            }
        });
        
        // Prevent clicks from closing pointer lock when clicking on console
        this.container.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
    }

    open() {
        this.isOpen = true;
        this.container.style.display = 'flex';
        this.game.player.controls.unlock();
        this.input.focus();
    }

    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
        this.game.player.controls.lock();
        this.input.blur();
    }

    log(message, type = 'info') {
        const line = document.createElement('div');
        line.textContent = message;
        line.className = `console-line ${type}`;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    processCommand(input) {
        if (!input.trim()) return;
        
        this.log(`> ${input}`);
        this.history.push(input);
        
        const args = input.trim().split(' ');
        const command = args.shift().toLowerCase().replace('/', '');
        
        switch (command) {
            case 'tp':
            case 'teleport':
                this.cmdTeleport(args);
                break;
            case 'fly':
                this.cmdFly(args);
                break;
            case 'time':
                this.cmdTime(args);
                break;
            case 'help':
                this.cmdHelp();
                break;
            default:
                this.log(`Unknown command: ${command}`, 'error');
        }
    }

    cmdTeleport(args) {
        if (args.length < 3) {
            this.log('Usage: /tp <x> <y> <z>', 'error');
            return;
        }
        
        const x = parseFloat(args[0]);
        const y = parseFloat(args[1]);
        const z = parseFloat(args[2]);
        
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            this.log('Invalid coordinates', 'error');
            return;
        }
        
        this.game.player.camera.position.set(x, y, z);
        this.game.player.velocity.set(0, 0, 0);
        this.log(`Teleported to ${x}, ${y}, ${z}`);
    }

    cmdFly(args) {
        if (args.length === 0) {
            this.game.player.flyMode = !this.game.player.flyMode;
        } else {
            const state = args[0].toLowerCase();
            if (state === 'on') this.game.player.flyMode = true;
            else if (state === 'off') this.game.player.flyMode = false;
            else {
                this.log('Usage: /fly [on/off]', 'error');
                return;
            }
        }
        this.log(`Fly mode: ${this.game.player.flyMode ? 'ON' : 'OFF'}`);
    }

    cmdTime(args) {
        if (args.length < 2 || args[0] !== 'set') {
            this.log('Usage: /time set <day/night/value>', 'error');
            return;
        }
        
        const value = args[1].toLowerCase();
        if (value === 'day') {
            this.game.time = 6000;
        } else if (value === 'night') {
            this.game.time = 18000;
        } else {
            const timeVal = parseInt(value);
            if (!isNaN(timeVal)) {
                this.game.time = timeVal;
            } else {
                this.log('Invalid time value', 'error');
                return;
            }
        }
        this.log(`Time set to ${this.game.time}`);
    }

    cmdHelp() {
        this.log('Available commands:');
        this.log('/tp <x> <y> <z> - Teleport');
        this.log('/fly [on/off] - Toggle fly mode');
        this.log('/time set <day/night/value> - Set time');
    }
}
