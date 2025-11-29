import * as THREE from 'three';

export class PlayerMesh {
    constructor(scene) {
        this.scene = scene;
        this.isWalking = false;
        this.walkTime = 0;

        // Texture loading via Canvas to support 64x32 and 64x64 skins
        this.loadTexture('assets/textures/entities/player.png');

        this.material = new THREE.MeshStandardMaterial({
            map: null, // Will be set when texture loads
            roughness: 1,
            metalness: 0,
            transparent: true,
            alphaTest: 0.5
        });

        this.mesh = new THREE.Group();
        
        // Dimensions (Minecraft: 1 unit = 1 meter approx, player is ~1.8m)
        // Head: 8x8x8 pixels -> 0.5x0.5x0.5 units? 
        // Let's stick to a scale where 1 block = 1 unit.
        // Player height 1.8 units.
        // Head: 0.4 x 0.4 x 0.4
        // Body: 0.4 x 0.6 x 0.2
        // Arms: 0.2 x 0.6 x 0.2
        // Legs: 0.2 x 0.6 x 0.2
        
        const pixelScale = 1 / 16; // 16 pixels = 1 unit (roughly)
        
        // Scale factor: 1 pixel = ? units.
        // Total height = 32 pixels. Target height = 1.8 units.
        const s = 1.8 / 32; 
        this.scale = s;

        // Head
        // UV: [0, 0] is top-left of texture usually in 2D coords, but ThreeJS UV (0,0) is bottom-left.
        // Texture is 64x64.
        
        this.head = this.createBox(8, 8, 8, 0, 0); // size: 8x8x8, uv: 0,0 (top-left of head zone)
        this.head.position.set(0, 24 * s, 0);
        // Center of head is at 24 + 4 = 28px height.
        // But createBox creates centered box.
        // We want to rotate head around neck. Neck is at 24px.
        // So geometry should be translated up by 4px (half height).
        this.head.geometry.translate(0, 4 * s, 0);
        
        // Body
        this.body = this.createBox(8, 12, 4, 16, 16);
        this.body.position.set(0, 12 * s, 0);
        this.body.geometry.translate(0, 6 * s, 0); // Pivot at 12px (waist/legs top)

        // Left Arm
        this.leftArm = this.createBox(4, 12, 4, 32, 48);
        this.leftArm.position.set(6 * s, 24 * s, 0); // Shoulder position at top of body
        this.leftArm.geometry.translate(0, -6 * s, 0); // Pivot at top

        // Right Arm
        this.rightArm = this.createBox(4, 12, 4, 40, 16);
        this.rightArm.position.set(-6 * s, 24 * s, 0);
        this.rightArm.geometry.translate(0, -6 * s, 0); // Pivot at top

        // Left Leg
        this.leftLeg = this.createBox(4, 12, 4, 16, 48);
        this.leftLeg.position.set(2 * s, 12 * s, 0); // Hip position
        this.leftLeg.geometry.translate(0, -6 * s, 0); // Pivot at hip

        // Right Leg
        this.rightLeg = this.createBox(4, 12, 4, 0, 16);
        this.rightLeg.position.set(-2 * s, 12 * s, 0);
        this.rightLeg.geometry.translate(0, -6 * s, 0);

        this.mesh.add(this.head);
        this.mesh.add(this.body);
        this.mesh.add(this.leftArm);
        this.mesh.add(this.rightArm);
        this.mesh.add(this.leftLeg);
        this.mesh.add(this.rightLeg);
        
        // Add to scene? No, let the caller add it.
    }

    createBox(w, h, d, u, v) {
        const geometry = new THREE.BoxGeometry(w * this.scale, h * this.scale, d * this.scale);
        this.mapUVs(geometry, w, h, d, u, v);
        return new THREE.Mesh(geometry, this.material);
    }

    mapUVs(geometry, w, h, d, u, v) {
        // Minecraft texture layout (standard)
        // Texture size 64x64
        const texW = 64;
        const texH = 64;
        
        // Helper to convert pixel coords to UV (0..1)
        // ThreeJS UV origin is bottom-left. Minecraft texture coords usually top-left.
        // So v = 1 - (y / texH)
        
        const uv = geometry.attributes.uv;
        
        // BoxGeometry faces order: Right, Left, Top, Bottom, Front, Back
        // Each face has 4 vertices (2 triangles). 
        // We need to set UVs for each vertex.
        
        // Function to set UV for a face
        const setFaceUV = (faceIndex, x, y, w, h) => {
            // x, y are top-left coordinates in texture pixels
            // w, h are width and height of the face in texture pixels
            
            // UV coordinates
            // 0: top-left (x, y+h) -> (x, 1-(y+h)) ? No.
            // ThreeJS PlaneGeometry/BoxGeometry default UVs:
            // 0: (0, 1) Top-Left
            // 1: (1, 1) Top-Right
            // 2: (0, 0) Bottom-Left
            // 3: (1, 0) Bottom-Right
            
            // We need to map these to our texture coordinates.
            // u0 = x / texW
            // u1 = (x + w) / texW
            // v0 = 1 - (y + h) / texH  (Bottom)
            // v1 = 1 - y / texH        (Top)
            
            const u0 = x / texW;
            const u1 = (x + w) / texW;
            const v0 = 1 - (y + h) / texH;
            const v1 = 1 - y / texH;
            
            // Indices for the face (2 triangles, 6 vertices? No, BoxGeometry is indexed? No, usually non-indexed for separate face normals/uvs if needed, but default BoxGeometry is indexed? 
            // Actually BoxGeometry in Three.js is non-indexed by default? Or indexed?
            // Let's check attributes. usually position count is 24 (4 verts * 6 faces).
            
            const i = faceIndex * 4;
            
            // Order: Top-Left, Top-Right, Bottom-Left, Bottom-Right
            // Standard BoxGeometry vertices order for a face (looking at it):
            // 0: Top-Left
            // 1: Top-Right
            // 2: Bottom-Left
            // 3: Bottom-Right
            
            // Wait, let's verify standard BoxGeometry UV mapping order.
            // Usually it's (0,1), (1,1), (0,0), (1,0).
            
            uv.setXY(i + 0, u0, v1); // Top-Left
            uv.setXY(i + 1, u1, v1); // Top-Right
            uv.setXY(i + 2, u0, v0); // Bottom-Left
            uv.setXY(i + 3, u1, v0); // Bottom-Right
        };

        // Right Face
        // Texture: (u + d + w, v + d) size (d, h) -> No.
        // Standard layout:
        // Top: (u+d, v) size (w, d)
        // Bottom: (u+d+w, v) size (w, d)
        // Right: (u, v+d) size (d, h)
        // Front: (u+d, v+d) size (w, h)
        // Left: (u+d+w, v+d) size (d, h)
        // Back: (u+d+w+d, v+d) size (w, h)
        
        // Let's map strictly to standard MC layout
        // u, v passed are the top-left of the "box" zone in texture.
        
        // Right Face (x+)
        setFaceUV(0, u, v + d, d, h);
        
        // Left Face (x-)
        setFaceUV(1, u + d + w, v + d, d, h);
        
        // Top Face (y+)
        setFaceUV(2, u + d, v, w, d);
        
        // Bottom Face (y-)
        setFaceUV(3, u + d + w, v, w, d);
        
        // Front Face (z+) - This is the "Back" of the player because player faces -Z
        // So we map the Back Texture here.
        setFaceUV(4, u + d + w + d, v + d, w, h);
        
        // Back Face (z-) - This is the "Front" of the player
        // So we map the Front Texture here.
        setFaceUV(5, u + d, v + d, w, h);
        
        uv.needsUpdate = true;
    }

    loadTexture(url) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            // Check if it's a legacy 64x32 skin
            if (img.height === 32) {
                // Mirror Right Leg to Left Leg
                // Right Leg: x=0, y=16, w=16, h=16 (including all faces)
                // Target Left Leg: x=16, y=48
                this.copySkinPart(ctx, 0, 16, 16, 16, 16, 48, true);
                
                // Mirror Right Arm to Left Arm
                // Right Arm: x=40, y=16, w=16, h=16
                // Target Left Arm: x=32, y=48
                this.copySkinPart(ctx, 40, 16, 16, 16, 32, 48, true);
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            
            this.material.map = texture;
            this.material.needsUpdate = true;
        };
        img.src = url;
    }

    copySkinPart(ctx, sX, sY, w, h, dX, dY, flip) {
        // Create a temporary canvas to manipulate the image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the source part onto the temp canvas
        tempCtx.drawImage(ctx.canvas, sX, sY, w, h, 0, 0, w, h);
        
        if (flip) {
            // Flip horizontally
            ctx.save();
            ctx.translate(dX + w, dY);
            ctx.scale(-1, 1);
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.restore();
        } else {
            ctx.drawImage(tempCanvas, dX, dY);
        }
    }

    update(deltaTime, isMoving, isSprinting = false, cameraYaw = 0, cameraPitch = 0) {
        // Body Rotation Lag
        // We want the body to follow the camera yaw but with a delay.
        // However, the head should track the camera exactly.
        
        // Current body rotation
        let currentBodyYaw = this.mesh.rotation.y;
        
        // Shortest angle interpolation for body
        let diff = cameraYaw - currentBodyYaw;
        // Normalize diff to -PI to PI
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // If the difference is large (e.g. > 90 degrees), snap or move faster?
        // Minecraft logic: Body can be offset from head by ~50-70 degrees.
        // If it exceeds, body rotates to catch up.
        // If moving, body rotates to face movement direction (which is usually cameraYaw if moving forward).
        
        if (isMoving) {
            // If moving, body faces movement direction (cameraYaw usually)
            // Lerp faster
            currentBodyYaw += diff * deltaTime * 10;
        } else {
            // If standing still, body can lag behind head
            // But we want it to eventually catch up or stay within limits.
            // Let's just do a slow lerp for "lag" effect requested.
            currentBodyYaw += diff * deltaTime * 5;
        }
        
        this.mesh.rotation.y = currentBodyYaw;
        
        // Head Rotation
        // Head yaw is relative to body.
        // Head World Yaw = Camera Yaw
        // Head Local Yaw = Camera Yaw - Body Yaw
        let headLocalYaw = cameraYaw - currentBodyYaw;
        
        // Normalize head local yaw
        while (headLocalYaw > Math.PI) headLocalYaw -= Math.PI * 2;
        while (headLocalYaw < -Math.PI) headLocalYaw += Math.PI * 2;
        
        // Clamp head rotation to realistic limits (e.g. +/- 90 degrees)
        // If it hits limit, we might want to pull the body?
        // For now, just clamp visual head rotation.
        // headLocalYaw = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, headLocalYaw));
        
        this.head.rotation.y = headLocalYaw;
        this.head.rotation.x = cameraPitch;

        // Animation
        if (isMoving) {
            const speed = isSprinting ? 20 : 10;
            this.walkTime += deltaTime * speed;
            
            const angle = Math.sin(this.walkTime) * 0.5;
            
            this.leftArm.rotation.x = angle;
            this.rightArm.rotation.x = -angle;
            
            this.leftLeg.rotation.x = -angle;
            this.rightLeg.rotation.x = angle;
        } else {
            // Reset animation smoothly
            this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, deltaTime * 10);
            this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, deltaTime * 10);
            this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, deltaTime * 10);
            this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, deltaTime * 10);
        }
    }
}
