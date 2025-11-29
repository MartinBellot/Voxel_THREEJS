import * as THREE from 'three';
import { BlockDefinitions, BlockModels } from '../World/Block.js';
import { ItemDefinitions } from '../Item.js';

export class HeldItem {
    constructor(game, player) {
        this.game = game;
        this.player = player;

        // Separate scene for the held item to avoid clipping
        this.scene = new THREE.Scene();
        
        // Camera for the held item
        // FOV 70 is standard for viewmodels
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 0, 0);

        // Lights for the held item scene
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.sunLight.position.set(5, 10, 7);
        this.scene.add(this.sunLight);

        this.moonLight = new THREE.DirectionalLight(0x6666ff, 0.0);
        this.moonLight.position.set(-5, 10, -7);
        this.scene.add(this.moonLight);

        this.mesh = null;
        this.currentItemType = null;

        // Animation state
        this.bobTime = 0;
        this.swayPosition = new THREE.Vector2(0, 0);
        this.basePosition = new THREE.Vector3(0.8, -0.7, -1.2); // Right hand position (more to the right)
        this.baseRotation = new THREE.Euler(0, -Math.PI / 8, 0); // Slight inward tilt
        
        this.textureLoader = new THREE.TextureLoader();
    }

    update(delta) {
        if (!this.mesh) return;

        // Sync Lighting with Game World
        if (this.game.ambientLight) {
            this.ambientLight.color.copy(this.game.ambientLight.color);
            this.ambientLight.intensity = this.game.ambientLight.intensity;
        }

        if (this.game.sunLight) {
            this.sunLight.color.copy(this.game.sunLight.color);
            this.sunLight.intensity = this.game.sunLight.intensity;
        }

        if (this.game.moonLight) {
            this.moonLight.color.copy(this.game.moonLight.color);
            this.moonLight.intensity = this.game.moonLight.intensity;
        }

        // Handle window resize
        if (this.camera.aspect !== window.innerWidth / window.innerHeight) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }

        // Bobbing animation when moving
        const speed = this.player.velocity.length();
        const isMoving = speed > 0.1 && this.player.canJump;

        if (isMoving) {
            this.bobTime += delta * (this.player.isSprinting ? 15 : 10);
            
            // Bobbing calculation
            const bobX = Math.cos(this.bobTime) * 0.05;
            const bobY = Math.abs(Math.sin(this.bobTime)) * 0.05; // Bobs up and down in a U shape

            this.mesh.position.x = this.basePosition.x + bobX;
            this.mesh.position.y = this.basePosition.y + bobY;
        } else {
            // Return to rest
            this.bobTime = 0;
            this.mesh.position.lerp(this.basePosition, delta * 10);
        }

        // Swaying based on camera rotation (mouse movement)
        // We can approximate this by checking the difference in camera rotation or just using input
        // For now, let's keep it simple with just bobbing.
        
        // Apply base rotation
        this.mesh.rotation.copy(this.baseRotation);
        
        // Add some subtle breathing animation
        this.mesh.position.y += Math.sin(performance.now() / 1000) * 0.005;
    }

    setItem(itemType) {
        if (this.currentItemType === itemType) return;
        this.currentItemType = itemType;

        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            // Don't dispose material if it's shared (atlas)
            this.mesh = null;
        }

        if (!itemType) return;

        const itemDef = ItemDefinitions[itemType];
        
        // Check if it's a block or an item
        if (itemDef && itemDef.blockType && itemDef.isPlaceable) {
            this.createBlockMesh(itemDef.blockType);
        } else if (itemDef && itemDef.texture) {
            this.createItemMesh(itemDef);
        }
    }

    createItemMesh(itemDef) {
        // Flat item (plane)
        const geometry = new THREE.PlaneGeometry(0.6, 0.6);
        
        const texturePath = `assets/textures/item/${itemDef.texture}`;
        const texture = this.textureLoader.load(texturePath);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        
        // Items are usually held slightly differently
        this.mesh.position.copy(this.basePosition);
        this.mesh.rotation.set(0, 0, 0);
        // Tilt item slightly
        this.mesh.rotation.y = -Math.PI / 4;
        this.mesh.rotation.x = Math.PI / 8;
        
        this.scene.add(this.mesh);
    }

    createBlockMesh(blockType) {
        const def = BlockDefinitions[blockType];
        if (!def) return;

        // Create mesh
        // Standard block size in hand is usually smaller or scaled
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        
        let material;
        if (this.game.textureManager && this.game.textureManager.atlasTexture) {
            material = new THREE.MeshLambertMaterial({ 
                map: this.game.textureManager.atlasTexture,
                transparent: def.transparent || false,
                opacity: def.opacity || 1.0,
                alphaTest: 0.1
            });
            this.updateUVs(geometry, def);
        } else {
            material = new THREE.MeshLambertMaterial({ color: def.color || 0xffffff });
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.basePosition);
        this.mesh.rotation.copy(this.baseRotation);
        
        this.scene.add(this.mesh);
    }

    updateUVs(geometry, def) {
        if (!def.textures) return;
        
        const uvAttribute = geometry.attributes.uv;
        const faces = ['side', 'side', 'top', 'bottom', 'side', 'side'];
        if (def.textures.all) {
            faces.fill('all');
        }
        
        const getTextureName = (faceIndex) => {
            const faceType = faces[faceIndex];
            if (faceType === 'all') return def.textures.all;
            return def.textures[faceType] || def.textures.all;
        };

        for (let i = 0; i < 6; i++) {
            const textureName = getTextureName(i);
            if (!textureName) continue;
            
            const uvs = this.game.textureManager.getUVs(textureName);
            if (!uvs) continue;
            
            const baseIndex = i * 4;
            
            uvAttribute.setXY(baseIndex + 0, uvs.uMin, uvs.vMax);
            uvAttribute.setXY(baseIndex + 1, uvs.uMax, uvs.vMax);
            uvAttribute.setXY(baseIndex + 2, uvs.uMin, uvs.vMin);
            uvAttribute.setXY(baseIndex + 3, uvs.uMax, uvs.vMin);
        }
        
        uvAttribute.needsUpdate = true;
    }

    render(renderer) {
        renderer.clearDepth();
        renderer.render(this.scene, this.camera);
    }
}
