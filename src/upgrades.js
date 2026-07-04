// ============================================
// NEON NEXUS — Upgrade System
// ============================================

window.NN = window.NN || {};

NN.Upgrades = (function () {
    'use strict';
    const U = NN.Utils;

    const definitions = [
        { id: 'fire_rate', name: 'Overclock', desc: '+15% Fire Rate', tier: 'common', apply: p => p.fireRate *= 0.85 },
        { id: 'dmg', name: 'High Caliber', desc: '+25% Damage', tier: 'common', apply: p => p.bulletDmg *= 1.25 },
        { id: 'speed', name: 'Thrusters', desc: '+10% Move Speed', tier: 'common', apply: p => p.speed *= 1.1 },
        { id: 'hp', name: 'Hull Plating', desc: '+25 Max HP & Heal', tier: 'common', apply: p => { p.maxHp += 25; p.hp += 25; } },
        { id: 'pierce', name: 'Piercing Rounds', desc: 'Bullets pierce +1 enemy', tier: 'rare', apply: p => p.bulletPierce += 1 },
        { id: 'dash_cd', name: 'Phase Shift', desc: '-25% Dash Cooldown', tier: 'rare', apply: p => p.maxDashCd *= 0.75 },
        { id: 'pulse_charge', name: 'Overcharge', desc: '+30% Pulse Charge Rate', tier: 'rare', apply: p => p.pulseChargeRate *= 1.3 },
        { id: 'multishot', name: 'Split Barrel', desc: '+1 Projectile per shot', tier: 'epic', apply: p => { p.bulletCount += 1; p.spread = 0.2; } },
        { id: 'big_shot', name: 'Cannon', desc: 'Huge bullets, +50% Dmg, -20% RoF', tier: 'epic', apply: p => { p.bulletDmg *= 1.5; p.fireRate *= 1.2; } }
    ];

    function getRandomUpgrades(count) {
        const pooled = [...definitions];
        const results = [];
        
        for (let i = 0; i < count; i++) {
            if (pooled.length === 0) break;
            
            // Weighted rarity selection
            const r = Math.random();
            let targetTier = 'common';
            if (r > 0.95) targetTier = 'epic';
            else if (r > 0.75) targetTier = 'rare';
            
            // Filter by tier, fallback to any if none left
            let filtered = pooled.filter(u => u.tier === targetTier);
            if (filtered.length === 0) filtered = pooled;
            
            const chosen = U.randChoice(filtered);
            results.push(chosen);
            
            // Remove from pool to prevent duplicates
            const idx = pooled.indexOf(chosen);
            if (idx >= 0) pooled.splice(idx, 1);
        }
        return results;
    }

    function applyUpgrade(upgradeId) {
        const up = definitions.find(u => u.id === upgradeId);
        if (up && NN.Entities.player) {
            up.apply(NN.Entities.player);
        }
    }

    return { getRandomUpgrades, applyUpgrade };
})();
