import * as THREE from 'three';
import { BlockDefinitions } from '../World/Block.js';

export class TextureManager {
    constructor(game) {
        this.game = game;
        this.texturePath = 'assets/textures/block/';
        this.colormapPath = 'assets/textures/colormap/';
        this.textureMap = {}; // Map texture filename to atlas info
        this.colormaps = {};
        this.atlasTexture = null;
        this.tileSize = 16; // Minecraft textures are 16x16
    }

    async loadTextures() {
        await this.loadColormaps();
        const loader = new THREE.TextureLoader();
        const textureFiles = new Set();

        // Collect all texture files needed
        for (const key in BlockDefinitions) {
            const def = BlockDefinitions[key];
            if (def.textures) {
                if (def.textures.all) textureFiles.add(def.textures.all);
                if (def.textures.top) textureFiles.add(def.textures.top);
                if (def.textures.bottom) textureFiles.add(def.textures.bottom);
                if (def.textures.side) textureFiles.add(def.textures.side);
            }
        }

        if (textureFiles.size === 0) return;

        const sortedFiles = Array.from(textureFiles).sort();
        const textures = await Promise.all(sortedFiles.map(file => {
            return new Promise((resolve, reject) => {
                loader.load(this.texturePath + file, (tex) => {
                    tex.name = file;
                    resolve(tex);
                }, undefined, (err) => {
                    console.error(`Failed to load texture: ${file}`, err);
                    resolve(null);
                });
            });
        }));

        this.createAtlas(textures.filter(t => t !== null));
    }

    async loadColormaps() {
        const loader = new THREE.ImageLoader();
        const colormaps = ['grass.png', 'foliage.png'];

        await Promise.all(colormaps.map(file => {
            return new Promise((resolve) => {
                loader.load(this.colormapPath + file, (image) => {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0);
                    this.colormaps[file.split('.')[0]] = ctx.getImageData(0, 0, image.width, image.height);
                    resolve();
                }, undefined, (err) => {
                    console.error(`Failed to load colormap: ${file}`, err);
                    resolve();
                });
            });
        }));
    }

    getBiomeColor(type, temperature, humidity) {
        if (!this.colormaps[type]) return null;
        
        const data = this.colormaps[type];
        const width = data.width;
        const height = data.height;

        // Minecraft logic:
        // temperature and humidity are 0.0 to 1.0
        // x = (1.0 - temperature) * 255
        // y = (1.0 - (temperature * humidity)) * 255
        
        // Clamp values
        temperature = Math.max(0, Math.min(1, temperature));
        humidity = Math.max(0, Math.min(1, humidity));

        const x = Math.floor((1.0 - temperature) * (width - 1));
        const y = Math.floor((1.0 - (temperature * humidity)) * (height - 1));

        const index = (y * width + x) * 4;
        
        return new THREE.Color(
            data.data[index] / 255,
            data.data[index + 1] / 255,
            data.data[index + 2] / 255
        );
    }

    createAtlas(textures) {
        const count = textures.length;
        if (count === 0) return;

        // Calculate atlas size (power of 2)
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        
        // Ensure power of 2 dimensions for better compatibility (optional but good)
        const atlasWidth = Math.pow(2, Math.ceil(Math.log2(cols * this.tileSize)));
        const atlasHeight = Math.pow(2, Math.ceil(Math.log2(rows * this.tileSize)));

        const canvas = document.createElement('canvas');
        canvas.width = atlasWidth;
        canvas.height = atlasHeight;
        const ctx = canvas.getContext('2d');
        
        // Disable smoothing for pixel art look
        ctx.imageSmoothingEnabled = false;

        textures.forEach((tex, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = col * this.tileSize;
            const y = row * this.tileSize;

            // Draw texture to canvas
            ctx.drawImage(tex.image, x, y, this.tileSize, this.tileSize);

            // Calculate UVs
            // Three.js UV (0,0) is bottom-left
            // Canvas (0,0) is top-left
            
            const uMin = x / atlasWidth;
            const uMax = (x + this.tileSize) / atlasWidth;
            
            // In Three.js UVs, V=1 is top, V=0 is bottom.
            // In Canvas, Y=0 is top, Y=H is bottom.
            // So Y=0 corresponds to V=1.
            // Y=tileSize corresponds to V = 1 - (tileSize/H)
            
            const vMax = 1 - (y / atlasHeight);
            const vMin = 1 - ((y + this.tileSize) / atlasHeight);

            this.textureMap[tex.name] = {
                uMin: uMin,
                uMax: uMax,
                vMin: vMin,
                vMax: vMax
            };
        });

        this.atlasTexture = new THREE.CanvasTexture(canvas);
        this.atlasTexture.magFilter = THREE.NearestFilter;
        this.atlasTexture.minFilter = THREE.NearestFilter;
        this.atlasTexture.colorSpace = THREE.SRGBColorSpace;
    }

    getUVs(textureName) {
        return this.textureMap[textureName];
    }
}
