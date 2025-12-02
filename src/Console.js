export class Console {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.history = [];
        this.historyIndex = -1;
        this.socket = null;
        
        this.createUI();
        this.setupEvents();
        this.connect();
    }

    connect() {
        const wsUrl = 'ws://148.230.117.98:8011/ws/console/';
        console.log(`Connecting to Console WebSocket: ${wsUrl}`);
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('Connected to Console Server');
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.socket.onclose = () => {
            console.log('Console WebSocket closed. Reconnecting in 5s...');
            setTimeout(() => this.connect(), 5000);
        };
    }

    handleMessage(data) {
        switch (data.type) {
            case 'console_log':
                this.log(data.message, data.level);
                break;
            case 'time_update':
                this.game.time = data.time;
                this.log(`Time synced to ${data.time}`);
                break;
            case 'teleport':
                this.game.player.camera.position.set(data.x, data.y, data.z);
                this.game.player.velocity.set(0, 0, 0);
                break;
            case 'fly_mode':
                if (data.state === 'on') this.game.player.flyMode = true;
                else if (data.state === 'off') this.game.player.flyMode = false;
                else this.game.player.flyMode = !this.game.player.flyMode;
                this.log(`Fly mode: ${this.game.player.flyMode ? 'ON' : 'OFF'}`);
                break;
        }
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
        
        this.history.push(input);
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'command',
                command: input,
                username: this.game.networkManager?.username || 'Anonymous'
            }));
        } else {
            this.log('Error: Not connected to server', 'error');
        }
    }
}
