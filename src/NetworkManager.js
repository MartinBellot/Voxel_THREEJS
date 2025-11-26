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
        this.socket = new WebSocket('ws://localhost:8000/ws/game/');

        this.socket.onopen = () => {
            console.log('Connected to server');
            this.connected = true;
            this.send({
                type: 'join',
                username: username
            });
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.socket.onclose = () => {
            console.log('Disconnected from server');
            this.connected = false;
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

    handleMessage(data) {
        switch (data.type) {
            case 'world_data':
                this.game.world.setModifications(data.modifications);
                this.game.world.setSeed(data.seed);
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
}

