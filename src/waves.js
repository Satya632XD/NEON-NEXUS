// ============================================
// NEON NEXUS — Wave & Spawning Logic
// ============================================

window.NN = window.NN || {};

NN.Waves = (function () {
    'use strict';
    const E = NN.Entities;
    const U = NN.Utils;

    let currentWave = 0;
    let enemiesToSpawn = 0;
    let spawnTimer = 0;
    let spawnInterval = 1.0;
    let waveActive = false;
    let isBossWave = false;

    function startNextWave() {
        currentWave++;
        isBossWave = (currentWave % 5 === 0);
        
        if (isBossWave) {
            enemiesToSpawn = 1;
            spawnTimer = 2.0;
            spawnInterval = 1.0;
        } else {
            enemiesToSpawn = 5 + Math.floor(currentWave * 1.5);
            spawnTimer = 1.0;
            spawnInterval = Math.max(0.2, 1.0 - currentWave * 0.03);
        }
        waveActive = true;
        NN.UI.announceWave(currentWave, isBossWave);
    }

    function update(dt) {
        if (!waveActive) return;

        if (enemiesToSpawn > 0) {
            spawnTimer -= dt;
            if (spawnTimer <= 0) {
                spawnTimer = spawnInterval;
                spawnEnemy();
                enemiesToSpawn--;
            }
        } else if (E.enemies.length === 0) {
            // Wave cleared
            waveActive = false;
            if (!isBossWave) {
                NN.Game.waveCleared();
            }
        }
    }

    function spawnEnemy() {
        const p = E.player;
        const ang = U.rand(0, U.TWO_PI);
        const dist = 600;
        const x = p.x + Math.cos(ang) * dist;
        const y = p.y + Math.sin(ang) * dist;

        if (isBossWave) {
            E.spawnEnemy('boss', x, y);
            return;
        }

        // Determine enemy type based on wave number
        let type = 'chaser';
        const r = Math.random();
        
        if (currentWave >= 3 && r < 0.2) type = 'shooter';
        else if (currentWave >= 4 && r < 0.4) type = 'zigzag';
        else if (currentWave >= 7 && r < 0.5) type = 'shooter';
        else if (currentWave >= 8 && r < 0.1) type = 'tank';
        else type = 'chaser';

        E.spawnEnemy(type, x, y);
    }

    function reset() {
        currentWave = 0;
        enemiesToSpawn = 0;
        waveActive = false;
        isBossWave = false;
    }

    return {
        startNextWave, update, reset,
        get currentWave() { return currentWave; },
        get isBossWave() { return isBossWave; },
        get enemiesLeft() { return enemiesToSpawn + E.enemies.length; }
    };
})();
