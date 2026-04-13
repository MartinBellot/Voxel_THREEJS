import * as THREE from 'three';
import { Arrow } from '../Entities/Arrow.js';
import { ItemType } from '../Item.js';
import { getEnchantmentBonus } from '../EnchantingSystem.js';

export class Bow {
    constructor(game) {
        this.game = game;
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 1.0; // Seconds to full charge
        this.lastStage = -1;
    }

    onUseStart(player) {
        // Get bow enchantments
        const bowItem = player.inventory.getItem(player.inventory.selectedSlot);
        const hasInfinity = bowItem && bowItem.enchantments && 
            bowItem.enchantments.some(e => e.id === 'infinity');

        // Check for arrows (Infinity skips check)
        const hasArrow = hasInfinity || player.inventory.slots.some(slot => slot && slot.type === ItemType.ARROW && slot.count > 0);
        if (!hasArrow) {
            console.log("No arrows!");
            return;
        }

        this.isCharging = true;
        this.chargeTime = 0;
        this.lastStage = -1;
        console.log("Bow charging...");
        
        // Initial texture
        if (player.heldItem) {
            player.heldItem.updateTexture('bow_pulling_0.png');
        }
    }

    onUseEnd(player) {
        if (!this.isCharging) return;
        
        // Reset texture
        if (player.heldItem) {
            player.heldItem.updateTexture('bow.png');
        }
        
        // Get bow enchantments
        const bowItem = player.inventory.getItem(player.inventory.selectedSlot);
        const hasInfinity = bowItem && bowItem.enchantments && 
            bowItem.enchantments.some(e => e.id === 'infinity');

        // Check again and consume
        const arrowSlotIndex = player.inventory.slots.findIndex(slot => slot && slot.type === ItemType.ARROW && slot.count > 0);
        if (arrowSlotIndex === -1 && !hasInfinity) {
            this.isCharging = false;
            this.chargeTime = 0;
            if (player.heldItem && player.heldItem.mesh) {
                 player.heldItem.mesh.position.copy(player.heldItem.basePosition);
            }
            return;
        }

        const chargeLevel = Math.min(this.chargeTime / this.maxChargeTime, 1.0);
        if (chargeLevel > 0.1) {
            // Power enchantment: extra damage
            let damageBonus = 0;
            let punchBonus = 0;
            let isFlaming = false;
            if (bowItem && bowItem.enchantments) {
                damageBonus = getEnchantmentBonus(bowItem.enchantments, 'damage');
                punchBonus = getEnchantmentBonus(bowItem.enchantments, 'knockback');
                isFlaming = bowItem.enchantments.some(e => e.id === 'flame');
            }

            this.fire(player, chargeLevel, damageBonus, punchBonus, isFlaming);
            
            // Infinity: don't consume arrow
            if (!hasInfinity && arrowSlotIndex !== -1) {
                player.inventory.removeItem(arrowSlotIndex, 1);
                player.inventoryUI.updateHotbar();
                if (player.inventoryUI.isOpen) {
                    player.inventoryUI.updateSlots();
                }
            }
        }
        
        this.isCharging = false;
        this.chargeTime = 0;
        console.log("Bow released!");
        
        // Reset held item position
        if (player.heldItem && player.heldItem.mesh) {
             player.heldItem.mesh.position.copy(player.heldItem.basePosition);
        }
    }

    onUpdate(delta, player) {
        if (this.isCharging) {
            this.chargeTime += delta;
            
            const chargeLevel = Math.min(this.chargeTime / this.maxChargeTime, 1.0);
            
            // Texture Animation
            let stage = 0;
            if (chargeLevel > 0.66) stage = 2;
            else if (chargeLevel > 0.33) stage = 1;
            
            if (stage !== this.lastStage) {
                this.lastStage = stage;
                if (player.heldItem) {
                    player.heldItem.updateTexture(`bow_pulling_${stage}.png`);
                }
            }
            
            // Visual feedback: Shake or pull back
            if (player.heldItem && player.heldItem.mesh) {
                // Pull back effect
                // Base pos: 0.8, -0.7, -1.2
                // Pull back: z moves closer to camera (or further? usually closer to eye)
                // Actually, pulling a bow moves the hand closer to the eye/cheek.
                
                // Simple shake
                const shake = (Math.random() - 0.5) * 0.02 * chargeLevel;
                player.heldItem.mesh.position.x = player.heldItem.basePosition.x + shake;
                player.heldItem.mesh.position.y = player.heldItem.basePosition.y + shake;
            }
        }
    }

    fire(player, force, damageBonus = 0, punchBonus = 0, isFlaming = false) {
        const direction = new THREE.Vector3();
        player.camera.getWorldDirection(direction);
        
        const arrow = new Arrow(this.game, player.camera.position, direction, force);
        arrow.damageBonus = damageBonus;
        arrow.punchBonus = punchBonus;
        arrow.isFlaming = isFlaming;
        this.game.entities.push(arrow);
    }
}
