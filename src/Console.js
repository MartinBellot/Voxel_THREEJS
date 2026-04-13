export class Console {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.history = [];
        this.historyIndex = -1;
        this.socket = null;
        this.isOp = false;

        this.commandDefs = [
            { cmd: 'help', requiresOp: false, usage: '/help' },
            { cmd: 'time', requiresOp: true, usage: '/time set <day|night|value>',
              args: [['set'], ['day', 'night']] },
            { cmd: 'tp', requiresOp: true, usage: '/tp <x> <y> <z>' },
            { cmd: 'teleport', requiresOp: true, usage: '/teleport <x> <y> <z>' },
            { cmd: 'fly', requiresOp: true, usage: '/fly [on|off]',
              args: [['on', 'off']] },
            { cmd: 'gamemode', requiresOp: true, usage: '/gamemode <survival|creative> [player]',
              args: [['survival', 'creative'], '__players__'] },
        ];

        this.suggestions = [];
        this.selectedSuggestionIndex = 0;
        
        this.createUI();
        this.setupEvents();
        this.connect();
    }

    connect() {
        const wsUrl = 'ws://127.0.0.1:8011/ws/console/';
        console.log(`Connecting to Console WebSocket: ${wsUrl}`);
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('Connected to Console Server');
            this.checkOpStatus();
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
            case 'op_status':
                this.isOp = data.is_op;
                break;
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

        this.inputWrapper = document.createElement('div');
        this.inputWrapper.id = 'console-input-wrapper';

        this.suggestionsContainer = document.createElement('div');
        this.suggestionsContainer.id = 'console-suggestions';
        this.suggestionsContainer.style.display = 'none';
        
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.id = 'console-input';
        this.input.placeholder = 'Enter command...';

        this.inputWrapper.appendChild(this.suggestionsContainer);
        this.inputWrapper.appendChild(this.input);
        
        this.container.appendChild(this.output);
        this.container.appendChild(this.inputWrapper);
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
                            this.updateSuggestions();
                        }, 0);
                    }
                }
            }

            if (this.isOpen) {
                e.stopPropagation(); // Prevent game controls from reacting
                
                if (e.key === 'Escape') {
                    if (this.suggestions.length > 0) {
                        this.hideSuggestions();
                    } else {
                        this.close();
                    }
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    this.applySuggestion();
                } else if (e.key === 'ArrowUp') {
                    if (this.suggestions.length > 0) {
                        e.preventDefault();
                        this.selectedSuggestionIndex = Math.max(0, this.selectedSuggestionIndex - 1);
                        this.renderSuggestions();
                    } else {
                        // History navigation
                        if (this.history.length > 0) {
                            if (this.historyIndex === -1) this.historyIndex = this.history.length;
                            this.historyIndex = Math.max(0, this.historyIndex - 1);
                            this.input.value = this.history[this.historyIndex];
                        }
                    }
                } else if (e.key === 'ArrowDown') {
                    if (this.suggestions.length > 0) {
                        e.preventDefault();
                        this.selectedSuggestionIndex = Math.min(this.suggestions.length - 1, this.selectedSuggestionIndex + 1);
                        this.renderSuggestions();
                    } else {
                        // History navigation
                        if (this.historyIndex !== -1) {
                            this.historyIndex = Math.min(this.history.length - 1, this.historyIndex + 1);
                            this.input.value = this.history[this.historyIndex];
                        }
                    }
                } else if (e.key === 'Enter') {
                    this.hideSuggestions();
                    this.processCommand(this.input.value);
                    this.input.value = '';
                    this.historyIndex = -1;
                }
            }
        });

        this.input.addEventListener('input', () => {
            this.updateSuggestions();
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
        this.checkOpStatus();
    }

    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
        this.hideSuggestions();
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

    checkOpStatus() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'check_op',
                username: this.game.networkManager?.username || 'Anonymous'
            }));
        }
    }

    getPlayerNames() {
        const names = [];
        const nm = this.game.networkManager;
        if (nm) {
            if (nm.username) names.push(nm.username);
            if (nm.remotePlayers) {
                nm.remotePlayers.forEach(p => {
                    if (p.username) names.push(p.username);
                });
            }
        }
        return names;
    }

    getCompletions(input) {
        if (!input.startsWith('/')) return [];

        const raw = input.slice(1);
        const parts = raw.split(' ');
        const isTrailingSpace = input.endsWith(' ') && raw.length > 0;

        // Completing command name
        if (parts.length === 1 && !isTrailingSpace) {
            const partial = parts[0].toLowerCase();
            return this.commandDefs
                .filter(c => c.cmd.startsWith(partial) && (!c.requiresOp || this.isOp))
                .map(c => ({ text: c.cmd, display: c.cmd, usage: c.usage, type: 'command' }));
        }

        // Find the command def
        const cmdName = parts[0].toLowerCase();
        const cmdDef = this.commandDefs.find(c => c.cmd === cmdName);
        if (!cmdDef || !cmdDef.args) return [];
        if (cmdDef.requiresOp && !this.isOp) return [];

        // Determine arg index and partial text
        const argIndex = parts.length - 2;
        const partial = isTrailingSpace ? '' : parts[parts.length - 1].toLowerCase();
        const lookupIndex = isTrailingSpace ? argIndex + 1 : argIndex;

        if (lookupIndex >= cmdDef.args.length) return [];

        let values = cmdDef.args[lookupIndex];
        if (values === '__players__') {
            values = this.getPlayerNames();
        }
        if (!Array.isArray(values)) return [];

        return values
            .filter(v => v.toLowerCase().startsWith(partial))
            .map(v => ({ text: v, display: v, type: 'arg' }));
    }

    updateSuggestions() {
        const input = this.input.value;
        this.suggestions = this.getCompletions(input);
        this.selectedSuggestionIndex = 0;

        if (this.suggestions.length > 0) {
            this.renderSuggestions();
            this.suggestionsContainer.style.display = 'block';
        } else {
            this.hideSuggestions();
        }
    }

    renderSuggestions() {
        this.suggestionsContainer.innerHTML = '';
        this.suggestions.forEach((s, i) => {
            const item = document.createElement('div');
            item.className = 'console-suggestion' + (i === this.selectedSuggestionIndex ? ' selected' : '');
            item.textContent = s.type === 'command' ? `/${s.display}` : s.display;
            if (s.usage) {
                const usage = document.createElement('span');
                usage.className = 'console-suggestion-usage';
                usage.textContent = s.usage;
                item.appendChild(usage);
            }
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.selectedSuggestionIndex = i;
                this.applySuggestion();
                this.input.focus();
            });
            this.suggestionsContainer.appendChild(item);
        });
    }

    applySuggestion() {
        if (this.suggestions.length === 0) return;
        const suggestion = this.suggestions[this.selectedSuggestionIndex];
        if (!suggestion) return;

        const input = this.input.value;
        const parts = input.slice(1).split(' ');

        if (suggestion.type === 'command') {
            this.input.value = '/' + suggestion.text + ' ';
        } else {
            // Replace the last partial with the suggestion
            parts[parts.length - 1] = suggestion.text;
            this.input.value = '/' + parts.join(' ') + ' ';
        }

        this.hideSuggestions();
        this.updateSuggestions();
    }

    hideSuggestions() {
        this.suggestions = [];
        this.selectedSuggestionIndex = 0;
        this.suggestionsContainer.style.display = 'none';
        this.suggestionsContainer.innerHTML = '';
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
