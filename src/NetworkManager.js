import { RemotePlayer } from './Player/RemotePlayer.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.remotePlayers = new Map();
        this.playerId = null;
    }

    connect(username) {
        this.username = username;
        console.log('Connecting to WebSocket...');
        // Force connection to VPS as requested
        const wsUrl = 'ws://148.230.117.98:8011/ws/game/';
        
        console.log(`Attempting connection to: ${wsUrl}`);
        try {
            this.socket = new WebSocket(wsUrl);
        } catch (e) {
            console.error("Error creating WebSocket:", e);
            this.game.isPlaying = true;
            return;
        }

        // Monitor readyState
        const stateInterval = setInterval(() => {
            console.log('WebSocket readyState:', this.socket.readyState);
            if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CLOSED) {
                clearInterval(stateInterval);
            }
        }, 500);

        // Timeout plus long (5s) pour laisser le temps à la connexion de s'établir
        const connectionTimeout = setTimeout(() => {
            clearInterval(stateInterval);
            if (this.socket.readyState !== WebSocket.OPEN) {
                console.log('Connection timed out (5s). Starting in offline mode. State:', this.socket.readyState);
                this.game.isPlaying = true;
            }
        }, 5000);

        this.socket.onopen = () => {
            clearInterval(stateInterval);
            clearTimeout(connectionTimeout);
            console.log('Connected to server');
            this.connected = true;
            this.send({
                type: 'join',
                username: username
            });
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            this.handleMessage(data);
        };

        this.socket.onclose = (event) => {
            console.log('Disconnected from server', event.code, event.reason);
            this.connected = false;
            // Si la connexion se ferme (ou échoue immédiatement), on s'assure que le jeu tourne
            if (!this.game.isPlaying) {
                 console.log('Connection failed/closed. Starting in offline mode.');
                 this.game.isPlaying = true;
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            // L'erreur déclenchera souvent onclose, mais par sécurité :
            if (!this.connected && !this.game.isPlaying) {
                 // On laisse le timeout ou onclose gérer, mais on log.
            }
        };
    }

    send(data) {
        if (this.connected) {
            this.socket.send(JSON.stringify(data));
        }
    }

    sendBlockUpdate(x, y, z, blockType) {
        this.send({
            type: 'block_update',
            position: { x, y, z },
            blockType: blockType
        });
    }

    sendInventoryUpdate(inventorySlots) {
        this.send({
            type: 'inventory_update',
            inventory: inventorySlots
        });
    }

    showMotd(message) {
        const container = document.getElementById('motd-container');
        const text = document.getElementById('motd-text');
        if (container && text) {
            text.innerText = message;
            container.style.display = 'block';
            
            // Reset animation
            container.style.animation = 'none';
            container.offsetHeight; /* trigger reflow */
            container.style.animation = 'fadeOut 5s forwards';
            container.style.animationDelay = '3s';
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'player_init':
                this.playerId = data.id;
                if (this.game.player) {
                    console.log('Initializing player position/rotation:', data.position, data.rotation);
                    this.game.player.camera.position.set(data.position.x, data.position.y, data.position.z);
                    
                    // Load inventory if present
                    if (data.inventory && Array.isArray(data.inventory)) {
                        console.log('Loading inventory from server:', data.inventory);
                        this.game.player.inventory.slots = data.inventory;
                        if (this.game.player.inventoryUI) {
                            this.game.player.inventoryUI.updateHotbar();
                        }
                    }

                    // Set gamemode and health
                    if (data.gamemode) {
                        this.game.player.setGamemode(data.gamemode);
                    }
                    if (data.health !== undefined) {
                        this.game.player.setHealth(data.health);
                    }
                    
                    // Reset rotation completely first
                    this.game.player.camera.rotation.set(0, 0, 0);
                    
                    // Apply rotation from server (Pitch = X, Yaw = Y)
                    
                    // Force rotation order to YXZ (standard for FPS)
                    this.game.player.camera.rotation.order = 'YXZ';
                    
                    const pitch = data.rotation.x || 0;
                    const yaw = data.rotation.y || 0;

                    // Clamp pitch to avoid camera flipping
                    this.game.player.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
                    this.game.player.camera.rotation.y = yaw;
                    this.game.player.camera.rotation.z = 0; // Ensure no roll
                    
                    this.game.player.velocity.set(0, 0, 0);
                }
                this.game.isPlaying = true;
                break;
            case 'gamemode_update':
                if (this.game.player) {
                    this.game.player.setGamemode(data.gamemode);
                }
                break;
            case 'health_update':
                if (this.game.player) {
                    this.game.player.setHealth(data.health);
                }
                break;
            case 'world_data':
                this.game.world.setModifications(data.modifications);
                this.game.world.setSeed(data.seed);
                if (data.motd) {
                    this.showMotd(data.motd);
                }
                break;
            case 'block_update':
                this.game.world.addModification(data.position.x, data.position.y, data.position.z, data.blockType);
                break;
            case 'players_list':
                data.players.forEach(player => {
                    if (player.id !== this.playerId) {
                        this.addRemotePlayer(player);
                    }
                });
                this.game.updatePlayerList(data.players);
                break;
            case 'player_joined':
                if (data.player.id === this.playerId) return;
                this.addRemotePlayer(data.player);
                // Request full list or just add to UI
                // For simplicity, we might want to maintain a list in Game
                this.game.addPlayerToTab(data.player);
                break;
            case 'player_left':
                this.removeRemotePlayer(data.id);
                this.game.removePlayerFromTab(data.id);
                break;
            case 'player_update':
                this.updateRemotePlayer(data.id, data.position, data.rotation);
                break;
        }
    }

    addRemotePlayer(playerData) {
        if (playerData.id === this.playerId) return;
        if (this.remotePlayers.has(playerData.id)) return;
        
        // Create visual representation
        const remotePlayer = new RemotePlayer(this.game, playerData);
        this.remotePlayers.set(playerData.id, remotePlayer);
        // this.game.scene.add(remotePlayer.mesh); // Handled in RemotePlayer
    }

    removeRemotePlayer(id) {
        const remotePlayer = this.remotePlayers.get(id);
        if (remotePlayer) {
            remotePlayer.dispose();
            this.remotePlayers.delete(id);
        }
    }

    updateRemotePlayer(id, position, rotation) {
        const remotePlayer = this.remotePlayers.get(id);
        if (remotePlayer) {
            remotePlayer.updatePosition(position, rotation);
        }
    }

    update(delta) {
        this.remotePlayers.forEach(player => player.update(delta));
    }
}

