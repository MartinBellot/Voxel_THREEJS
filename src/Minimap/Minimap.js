import { BlockDefinitions, BlockType } from '../World/Block.js';

export class Minimap {
    constructor(game) {
        this.game = game;
        this.size = 200; // Size of the minimap in pixels
        this.viewRadius = 64; // Radius of the area to show in blocks
        this.zoom = 1; // Scale factor
        
        // Container
        this.container = document.createElement('div');
        this.container.id = 'minimap-container';
        document.body.appendChild(this.container);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        // Inline styles are now handled by CSS with !important, but let's keep them just in case
        this.canvas.style.width = `${this.size}px`;
        this.canvas.style.height = `${this.size}px`;
        this.container.appendChild(this.canvas);
        
        // Time Display Container
        this.timeContainer = document.createElement('div');
        this.timeContainer.id = 'minimap-time';
        this.container.appendChild(this.timeContainer);

        this.timeIcon = document.createElement('span');
        this.timeContainer.appendChild(this.timeIcon);

        this.timeText = document.createElement('span');
        this.timeContainer.appendChild(this.timeText);

        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        // Pre-allocate buffer for pixel manipulation for maximum performance
        this.imageData = this.ctx.createImageData(this.size, this.size);
        this.pixelBuffer = new Uint32Array(this.imageData.data.buffer);
        
        this.lastUpdate = 0;
        this.updateInterval = 50; // Update every 50ms (20fps)
        
        this.visible = true;
    }

    update() {
        if (!this.visible) return;

        const now = performance.now();
        if (now - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = now;

        const playerPos = this.game.player.camera.position;
        const px = Math.floor(playerPos.x);
        const pz = Math.floor(playerPos.z);
        const py = Math.floor(playerPos.y);
        const playerRotation = this.game.player.camera.rotation.y;
        const cos = Math.cos(playerRotation);
        const sin = Math.sin(playerRotation);

        // Calculate Day/Night Brightness
        const time = this.game.time; // 0-24000
        let globalBrightness = 1.0;
        
        // 0 = Sunrise (6AM), 6000 = Noon (12PM), 12000 = Sunset (6PM), 18000 = Midnight (12AM)
        // Day: 0-12000
        // Night: 12000-24000
        
        if (time > 12000 && time < 24000) {
            // Night
            // Transition at dusk (12000-13000) and dawn (23000-24000/0)
            if (time < 13000) {
                // Dusk transition
                globalBrightness = 1.0 - ((time - 12000) / 1000) * 0.7; // 1.0 -> 0.3
            } else if (time > 23000) {
                // Dawn transition
                globalBrightness = 0.3 + ((time - 23000) / 1000) * 0.7; // 0.3 -> 1.0
            } else {
                // Deep night
                globalBrightness = 0.3;
            }
        }

        // Update Time Display
        // Game Time 0 = 6:00 AM
        // Hours = (time / 1000 + 6) % 24
        const totalHours = (time / 1000 + 6) % 24;
        const hours = Math.floor(totalHours);
        const minutes = Math.floor((totalHours - hours) * 60);
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        
        this.timeText.innerText = timeString;
        this.timeIcon.innerText = (hours >= 6 && hours < 18) ? '☀️' : '🌙';

        // Clear buffer with background color (e.g., black or dark gray)
        // 0xFF000000 is opaque black in ABGR (little-endian)
        this.pixelBuffer.fill(0xFF000000);

        const center = this.size / 2;
        const scale = (this.size / 2) / this.viewRadius; // Pixels per block
        const chunkSize = this.game.world.chunkSize;

        // Optimization: Cache last chunk to reduce Map lookups
        let lastCx = -999999;
        let lastCz = -999999;
        let lastChunk = null;

        // We iterate over the pixels of the minimap to fill them
        // This ensures we fill the circle without gaps
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                // Distance from center of minimap
                const dx = x - center;
                const dy = y - center;
                
                // Circular mask
                if (dx * dx + dy * dy > center * center) continue;

                // Rotate the view based on player rotation
                // We want the map to rotate so that "forward" (up on minimap) corresponds to player direction.
                // To get world coordinates from map coordinates (where up is forward):
                // We need to rotate (dx, dy) by `playerRotation`.
                
                const rdx = dx * cos + dy * sin;
                const rdy = dy * cos - dx * sin; 

                // Map pixel to world coordinate
                // World X corresponds to Minimap X
                // World Z corresponds to Minimap Y
                const wx = Math.floor(px + rdx / scale);
                const wz = Math.floor(pz + rdy / scale);

                // Get the chunk and block
                // Optimized lookup
                const cx = Math.floor(wx / chunkSize);
                const cz = Math.floor(wz / chunkSize);
                
                let chunk = lastChunk;
                if (cx !== lastCx || cz !== lastCz) {
                    const key = `${cx},${cz}`;
                    chunk = this.game.world.chunks.get(key);
                    lastChunk = chunk;
                    lastCx = cx;
                    lastCz = cz;
                }

                if (chunk) {
                    let lx = wx % chunkSize;
                    let lz = wz % chunkSize;
                    if (lx < 0) lx += chunkSize;
                    if (lz < 0) lz += chunkSize;

                    const topBlock = chunk.getTopBlock(lx, lz);
                    
                    if (topBlock && topBlock.id !== BlockType.AIR) {
                        const def = BlockDefinitions[topBlock.id];
                        if (def && def.color) {
                            // Simple shading based on height difference
                            // We compare with player height or absolute height?
                            // Let's use absolute height for terrain relief.
                            // We can't easily get neighbor height here without more lookups.
                            // So let's just use the color.
                            
                            let color = def.color;
                            
                            // Height shading: darker if lower
                            // Base brightness on height relative to sea level (40)
                            // This gives a topographic map feel
                            const heightDiff = topBlock.y - py;
                            let brightness = 1.0;
                            
                            if (heightDiff < -10) brightness = 0.7;
                            else if (heightDiff < -5) brightness = 0.8;
                            else if (heightDiff > 5) brightness = 1.1;
                            else if (heightDiff > 10) brightness = 1.2;
                            
                            // Apply global brightness (Day/Night)
                            brightness *= globalBrightness;

                            // Apply brightness
                            const r = Math.min(255, Math.max(0, ((color >> 16) & 255) * brightness));
                            const g = Math.min(255, Math.max(0, ((color >> 8) & 255) * brightness));
                            const b = Math.min(255, Math.max(0, (color & 255) * brightness));
                            
                            // Write to buffer (ABGR format for little-endian)
                            this.pixelBuffer[y * this.size + x] = 
                                (255 << 24) | // Alpha
                                (b << 16) |   // Blue
                                (g << 8) |    // Green
                                r;            // Red
                        }
                    }
                }
            }
        }

        this.ctx.putImageData(this.imageData, 0, 0);

        // Draw Player Arrow (Center) - Fixed Up
        this.ctx.save();
        this.ctx.translate(center, center);
        // No rotation for player cursor, it always points up
        
        this.ctx.fillStyle = '#0A84FF';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -5);
        this.ctx.lineTo(4, 5);
        this.ctx.lineTo(0, 3);
        this.ctx.lineTo(-4, 5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
        
        // Draw Cardinal Directions (N) on the border
        // Calculate position of North relative to center
        // North is at angle -playerRotation relative to Up
        const radius = this.size / 2 - 12;
        const nx = center + radius * Math.sin(playerRotation);
        const ny = center - radius * Math.cos(playerRotation);

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('N', nx, ny);
    }

    getChunkAt(x, z) {
        // Helper to get chunk from world
        // Assuming World has a way to get chunk by key or we calculate key
        const chunkSize = this.game.world.chunkSize;
        const cx = Math.floor(x / chunkSize);
        const cz = Math.floor(z / chunkSize);
        const key = `${cx},${cz}`;
        return this.game.world.chunks.get(key);
    }
}
