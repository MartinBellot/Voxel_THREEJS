import * as THREE from 'three';
import { ItemType } from '../Item.js';

export class Pig {
    constructor(game, position) {
        this.game = game;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Y rotation
        
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        
        // Scale up the pig to be more visible and closer to MC size perception
        this.mesh.scale.set(1.5, 1.5, 1.5);
        
        this.isMoving = false;
        this.moveSpeed = 2.0;
        this.turnSpeed = 2.0;
        
        // Animation state
        this.walkTime = 0;
        
        this.createBody();
        this.game.scene.add(this.mesh);
        
        // Physics
        // Adjusted for scale
        this.width = 0.6 * 1.5; 
        this.depth = 0.6 * 1.5;
        this.height = 0.9 * 1.5;
        this.onGround = false;
    }

    createBody() {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('assets/textures/entities/pig.png');
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 1,
            metalness: 0
        });

        // Dimensions (Minecraft pixels / 16)
        // Head: 8x8x8 -> 0.5 x 0.5 x 0.5
        // Body: 10x16x8 -> 0.625 x 1.0 x 0.5 (Rotated)
        // Legs: 4x6x4 -> 0.25 x 0.375 x 0.25

        const pixelSize = 1/16;

        // Head
        const headGeo = new THREE.BoxGeometry(8 * pixelSize, 8 * pixelSize, 8 * pixelSize);
        this.mapUVs(headGeo, 64, 32, 0, 0, 8, 8, 8); // Standard MC mapping guess
        this.head = new THREE.Mesh(headGeo, material);
        // Position: In front of body.
        // Body center Z is 0. Body length 16. Front is at -8.
        // Head center Z should be -8 - 4 = -12.
        this.head.position.set(0, 12 * pixelSize, -12 * pixelSize);
        this.mesh.add(this.head);

        // Snout
        const snoutGeo = new THREE.BoxGeometry(4 * pixelSize, 3 * pixelSize, 1 * pixelSize);
        this.mapUVs(snoutGeo, 64, 32, 16, 17, 4, 3, 1);
        this.snout = new THREE.Mesh(snoutGeo, material);
        this.snout.position.set(0, -1 * pixelSize, -4.5 * pixelSize); // Relative to head
        this.head.add(this.snout);

        // Body
        // Dimensions: 10 wide, 16 high, 8 deep (Texture coordinates)
        // We create it vertical to match texture layout, then rotate it.
        const bodyGeo = new THREE.BoxGeometry(10 * pixelSize, 16 * pixelSize, 8 * pixelSize);
        this.mapUVs(bodyGeo, 64, 32, 28, 16, 10, 16, 8); 
        this.body = new THREE.Mesh(bodyGeo, material);
        this.body.rotation.x = Math.PI / 2;
        this.body.position.set(0, 10 * pixelSize, 0);
        this.mesh.add(this.body);

        // Head
        // Head is 8x8x8.
        // Position: In front of body.
        // Body center Z is 0. Body length 16. Front is at -8.
        // Head center Z should be -8 - 4 = -12.
        // Head Y: Body top is 6+8=14. Head center Y?
        // Usually head is aligned with body top or slightly higher.
        // Let's put head center at Y=12 (same as before).
        this.head.position.set(0, 12 * pixelSize, -12 * pixelSize); // Adjusted Z


        // Legs
        this.legs = [];
        const legGeo = new THREE.BoxGeometry(4 * pixelSize, 6 * pixelSize, 4 * pixelSize);
        this.mapUVs(legGeo, 64, 32, 0, 16, 4, 6, 4); // Standard MC mapping guess

        // Leg positions relative to body center
        const legPositions = [
            { x: -3, z: 7, name: 'BL' }, // Back Left
            { x: 3, z: 7, name: 'BR' },  // Back Right
            { x: -3, z: -5, name: 'FL' }, // Front Left
            { x: 3, z: -5, name: 'FR' }   // Front Right
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo.clone(), material);
            leg.position.set(pos.x * pixelSize, 3 * pixelSize, pos.z * pixelSize);
            this.legs.push(leg);
            this.mesh.add(leg);
        });
    }

    // Helper to map UVs for a box based on texture atlas coordinates
    // textureWidth, textureHeight: dimensions of the full texture
    // u, v: top-left coordinate of the box in the texture
    // width, height, depth: dimensions of the box in pixels
    mapUVs(geometry, texW, texH, u, v, width, height, depth) {
        const uvs = [];

        // Helper to add UVs for a face
        // x, y, w, h in texture pixels
        const addFace = (x, y, w, h) => {
            // Convert to 0..1
            // In Three.js UV (0,0) is bottom-left, (1,1) is top-right.
            // In image coordinates (0,0) is top-left.
            
            const u0 = x / texW;
            const u1 = (x + w) / texW;
            const v1 = (texH - y) / texH; // Top of image is high V
            const v0 = (texH - (y + h)) / texH; // Bottom of image is low V
            
            // BoxGeometry face vertex order is:
            // 0: Top-Left
            // 1: Top-Right
            // 2: Bottom-Left
            // 3: Bottom-Right
            
            uvs.push(
                u0, v1, // 0
                u1, v1, // 1
                u0, v0, // 2
                u1, v0  // 3
            );
        };

        // BoxGeometry faces order: Right, Left, Top, Bottom, Front, Back
        // We need to map MC texture faces to these Three.js faces.
        // Since the pig is facing -Z:
        // Three.js +X (Right) -> Pig Left Side -> MC Left Texture
        // Three.js -X (Left)  -> Pig Right Side -> MC Right Texture
        // Three.js +Y (Top)   -> Pig Top -> MC Top Texture
        // Three.js -Y (Bottom)-> Pig Bottom -> MC Bottom Texture
        // Three.js +Z (Front) -> Pig Back (Butt) -> MC Back Texture
        // Three.js -Z (Back)  -> Pig Front (Face) -> MC Front Texture

        // MC Texture Layout (u, v):
        // Top: u+d, v (w x d)
        // Bottom: u+d+w, v (w x d)
        // Right: u, v+d (d x h)
        // Front: u+d, v+d (w x h)
        // Left: u+d+w, v+d (d x h)
        // Back: u+d+w+d, v+d (w x h)

        // 1. Right Face (+x) -> MC Left Texture
        // Texture: (u + depth + width, v + depth)
        // Size: depth x height
        addFace(u + depth + width, v + depth, depth, height);

        // 2. Left Face (-x) -> MC Right Texture
        // Texture: (u, v + depth)
        // Size: depth x height
        addFace(u, v + depth, depth, height);

        // 3. Top Face (+y) -> MC Top Texture
        // Texture: (u + depth, v)
        // Size: width x depth
        addFace(u + depth, v, width, depth);

        // 4. Bottom Face (-y) -> MC Bottom Texture
        // Texture: (u + depth + width, v)
        // Size: width x depth
        addFace(u + depth + width, v, width, depth);

        // 5. Front Face (+z) -> MC Back Texture
        // Texture: (u + depth + width + depth, v + depth)
        // Size: width x height
        addFace(u + depth + width + depth, v + depth, width, height);

        // 6. Back Face (-z) -> MC Front Texture
        // Texture: (u + depth, v + depth)
        // Size: width x height
        addFace(u + depth, v + depth, width, height);

        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    update(dt) {
        this.updatePhysics(dt);
        this.updateAI(dt);
        this.updateAnimation(dt);
        
        this.mesh.position.copy(this.position);
        // Rotate 180 degrees because the model is built facing -Z
        this.mesh.rotation.y = this.rotation + Math.PI;
    }

    updatePhysics(dt) {
        const world = this.game.world;
        
        // Gravity
        this.velocity.y -= 32.0 * dt;
        
        // 1. Apply X Movement & Collision
        const dx = this.velocity.x * dt;
        this.position.x += dx;
        
        if (this.checkCollision(world)) {
            this.position.x -= dx;
            this.velocity.x = 0;
            // Jump if blocked
            if (this.onGround) this.velocity.y = 10;
        }

        // 2. Apply Z Movement & Collision
        const dz = this.velocity.z * dt;
        this.position.z += dz;
        
        if (this.checkCollision(world)) {
            this.position.z -= dz;
            this.velocity.z = 0;
            // Jump if blocked
            if (this.onGround) this.velocity.y = 10;
        }

        // 3. Apply Y Movement & Collision
        const dy = this.velocity.y * dt;
        this.position.y += dy;
        
        // Ground Check
        // We check if the bounding box intersects with any block
        // But specifically for Y, we want to know if we hit the floor or ceiling
        
        const box = this.getBoundingBox();
        
        // Check floor
        // We check points slightly below the feet
        const minX = Math.floor(box.min.x);
        const maxX = Math.floor(box.max.x);
        const minZ = Math.floor(box.min.z);
        const maxZ = Math.floor(box.max.z);
        const checkY = Math.floor(this.position.y - 0.05); // Just below feet
        
        let landed = false;
        
        if (this.velocity.y <= 0) {
            // Check if any block is below us
            for (let x = minX; x <= maxX; x++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (world.getBlock(x, checkY, z) !== 0) {
                        landed = true;
                        break;
                    }
                }
                if (landed) break;
            }
            
            if (landed) {
                this.position.y = checkY + 1;
                this.velocity.y = 0;
                this.onGround = true;
            } else {
                this.onGround = false;
            }
        } else {
            this.onGround = false;
        }
    }

    getBoundingBox() {
        const halfW = this.width / 2;
        const halfD = this.depth / 2;
        return {
            min: { x: this.position.x - halfW, y: this.position.y, z: this.position.z - halfD },
            max: { x: this.position.x + halfW, y: this.position.y + this.height, z: this.position.z + halfD }
        };
    }

    checkCollision(world) {
        const box = this.getBoundingBox();
        const minX = Math.floor(box.min.x);
        const maxX = Math.floor(box.max.x);
        // Start checking slightly above the feet to avoid floor collision when walking
        // Increased tolerance to 0.5 to allow stepping up/jumping easier without getting stuck on bottom edge
        const minY = Math.floor(box.min.y + 0.5); 
        const maxY = Math.floor(box.max.y);
        const minZ = Math.floor(box.min.z);
        const maxZ = Math.floor(box.max.z);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y < maxY; y++) { // Don't check top edge strictly
                for (let z = minZ; z <= maxZ; z++) {
                    if (world.getBlock(x, y, z) !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    updateAI(dt) {
        const player = this.game.player;
        const inventory = player.inventory;
        const selectedItem = inventory.getItem(inventory.selectedSlot);
        
        let isAttracted = false;
        if (selectedItem && selectedItem.type === ItemType.CARROT) {
            const dist = this.position.distanceTo(player.camera.position);
            if (dist < 10) { // Detect carrot within 10 blocks
                isAttracted = true;
                
                // Look at player
                const dx = player.camera.position.x - this.position.x;
                const dz = player.camera.position.z - this.position.z;
                
                // Calculate target rotation
                // Math.atan2(x, z) gives angle from Z axis.
                // Our model faces -Z (after 180 deg rotation in update).
                // Actually, let's just calculate the angle to move.
                
                const targetRotation = Math.atan2(dx, dz);
                
                // Smooth rotation
                let diff = targetRotation - this.rotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                
                this.rotation += diff * dt * 5; // Turn speed
                
                if (dist > 2.5) { // Stop if too close
                    this.isMoving = true;
                } else {
                    this.isMoving = false;
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                }
            }
        }

        if (!isAttracted) {
            // Random movement
            if (Math.random() < 0.02) {
                if (this.isMoving) {
                    this.isMoving = false;
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                } else {
                    this.isMoving = true;
                    this.rotation = Math.random() * Math.PI * 2;
                }
            }
        }

        if (this.isMoving) {
            const speed = 2.0;
            this.velocity.x = Math.sin(this.rotation) * speed;
            this.velocity.z = Math.cos(this.rotation) * speed;
        }
    }

    updateAnimation(dt) {
        if (this.isMoving) {
            this.walkTime += dt * 10;
            const angle = Math.sin(this.walkTime) * 0.5;
            
            // Swing legs
            this.legs[0].rotation.x = angle;
            this.legs[1].rotation.x = -angle;
            this.legs[2].rotation.x = -angle;
            this.legs[3].rotation.x = angle;
        } else {
            // Reset legs
            this.legs.forEach(leg => leg.rotation.x = 0);
        }
    }
}
