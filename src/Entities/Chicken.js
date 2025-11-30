import * as THREE from 'three';

export class Chicken {
    constructor(game, position) {
        this.game = game;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Y rotation
        
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        
        // Scale up to be consistent with Pig
        this.mesh.scale.set(1.5, 1.5, 1.5);
        
        this.isMoving = false;
        this.moveSpeed = 2.0;
        this.turnSpeed = 2.0;
        
        // Animation state
        this.walkTime = 0;
        this.wingFlapTime = 0;
        
        this.createBody();
        this.game.scene.add(this.mesh);
        
        // Physics
        this.width = 0.4 * 1.5; 
        this.depth = 0.4 * 1.5;
        this.height = 0.7 * 1.5;
        this.onGround = false;
    }

    createBody() {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('assets/textures/entities/chicken.png');
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 1,
            metalness: 0,
            side: THREE.DoubleSide,
            alphaTest: 0.5
        });

        const pixelSize = 1/16;

        // Head
        // 4x6x3
        const headGeo = new THREE.BoxGeometry(4 * pixelSize, 6 * pixelSize, 3 * pixelSize);
        this.mapUVs(headGeo, 64, 32, 0, 0, 4, 6, 3);
        this.head = new THREE.Mesh(headGeo, material);
        this.head.position.set(0, 11 * pixelSize, -4 * pixelSize);
        this.mesh.add(this.head);

        // Bill (Beak)
        // 4x2x2
        const billGeo = new THREE.BoxGeometry(4 * pixelSize, 2 * pixelSize, 2 * pixelSize);
        this.mapUVs(billGeo, 64, 32, 14, 0, 4, 2, 2);
        this.bill = new THREE.Mesh(billGeo, material);
        this.bill.position.set(0, 0 * pixelSize, -2.5 * pixelSize); // Relative to head
        this.head.add(this.bill);

        // Chin (Wattle)
        // 2x2x2
        const chinGeo = new THREE.BoxGeometry(2 * pixelSize, 2 * pixelSize, 2 * pixelSize);
        this.mapUVs(chinGeo, 64, 32, 14, 4, 2, 2, 2);
        this.chin = new THREE.Mesh(chinGeo, material);
        this.chin.position.set(0, -2 * pixelSize, -2.5 * pixelSize); // Relative to head
        this.head.add(this.chin);

        // Body
        // 6x8x6 (Texture dimensions)
        // Rotated X 90 degrees
        const bodyGeo = new THREE.BoxGeometry(6 * pixelSize, 8 * pixelSize, 6 * pixelSize);
        this.mapUVs(bodyGeo, 64, 32, 0, 9, 6, 8, 6);
        this.body = new THREE.Mesh(bodyGeo, material);
        this.body.rotation.x = Math.PI / 2;
        this.body.position.set(0, 8 * pixelSize, 0);
        this.mesh.add(this.body);

        // Legs
        // 3x5x3
        const legGeo = new THREE.BoxGeometry(3 * pixelSize, 5 * pixelSize, 3 * pixelSize);
        this.mapUVs(legGeo, 64, 32, 26, 0, 3, 5, 3);

        this.leftLeg = new THREE.Mesh(legGeo.clone(), material);
        this.leftLeg.position.set(-1.5 * pixelSize, 2.5 * pixelSize, 1 * pixelSize);
        this.mesh.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo.clone(), material);
        this.rightLeg.position.set(1.5 * pixelSize, 2.5 * pixelSize, 1 * pixelSize);
        this.mesh.add(this.rightLeg);

        // Wings
        // 1x4x6
        const wingGeo = new THREE.BoxGeometry(1 * pixelSize, 4 * pixelSize, 6 * pixelSize);
        this.mapUVs(wingGeo, 64, 32, 24, 13, 1, 4, 6);

        this.leftWing = new THREE.Mesh(wingGeo.clone(), material);
        this.leftWing.position.set(-3.5 * pixelSize, 9 * pixelSize, 0);
        this.mesh.add(this.leftWing);

        this.rightWing = new THREE.Mesh(wingGeo.clone(), material);
        this.rightWing.position.set(3.5 * pixelSize, 9 * pixelSize, 0);
        this.mesh.add(this.rightWing);
    }

    mapUVs(geometry, texW, texH, u, v, width, height, depth) {
        const uvs = [];

        const addFace = (x, y, w, h) => {
            const u0 = x / texW;
            const u1 = (x + w) / texW;
            const v1 = (texH - y) / texH;
            const v0 = (texH - (y + h)) / texH;
            
            uvs.push(
                u0, v1,
                u1, v1,
                u0, v0,
                u1, v0
            );
        };

        // 1. Right Face (+x) -> MC Left Texture
        addFace(u + depth + width, v + depth, depth, height);

        // 2. Left Face (-x) -> MC Right Texture
        addFace(u, v + depth, depth, height);

        // 3. Top Face (+y) -> MC Top Texture
        addFace(u + depth, v, width, depth);

        // 4. Bottom Face (-y) -> MC Bottom Texture
        addFace(u + depth + width, v, width, depth);

        // 5. Front Face (+z) -> MC Back Texture
        addFace(u + depth + width + depth, v + depth, width, height);

        // 6. Back Face (-z) -> MC Front Texture
        addFace(u + depth, v + depth, width, height);

        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    update(dt) {
        this.updatePhysics(dt);
        this.updateAI(dt);
        this.updateAnimation(dt);
    }

    updatePhysics(dt) {
        // Simple gravity
        if (!this.onGround) {
            this.velocity.y -= 20 * dt;
        }

        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(dt));

        // Floor collision (Simple)
        const terrainHeight = this.game.world.getHeight(this.position.x, this.position.z);
        if (this.position.y < terrainHeight) {
            this.position.y = terrainHeight;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }

    updateAI(dt) {
        // Random movement
        if (Math.random() < 0.02) {
            this.isMoving = !this.isMoving;
            if (this.isMoving) {
                this.rotation = Math.random() * Math.PI * 2;
            }
        }

        if (this.isMoving) {
            const direction = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            this.position.add(direction.multiplyScalar(this.moveSpeed * dt));
        }
    }

    updateAnimation(dt) {
        if (this.isMoving) {
            this.walkTime += dt * 10;
            const legAngle = Math.sin(this.walkTime) * 0.5;
            
            this.rightLeg.rotation.x = legAngle;
            this.leftLeg.rotation.x = -legAngle;
            
            // Wing flap when moving (chickens flap wings when running sometimes)
            this.wingFlapTime += dt * 20;
            const wingAngle = Math.abs(Math.sin(this.wingFlapTime)) * 0.5;
            this.leftWing.rotation.z = -wingAngle;
            this.rightWing.rotation.z = wingAngle;
        } else {
            this.rightLeg.rotation.x = 0;
            this.leftLeg.rotation.x = 0;
            
            // Slow wing flap when idle
            this.wingFlapTime += dt * 2;
            const wingAngle = Math.abs(Math.sin(this.wingFlapTime)) * 0.1;
            this.leftWing.rotation.z = -wingAngle;
            this.rightWing.rotation.z = wingAngle;
        }
        
        // Head bob
        this.head.rotation.x = Math.sin(this.walkTime * 0.5) * 0.1;
    }
}
