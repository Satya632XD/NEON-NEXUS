// ============================================
// NEON NEXUS — Main Game Loop & State Manager
// ============================================

window.NN = window.NN || {};

NN.Game = (function () {
    'use strict';
    const U = NN.Utils;
    const R = NN.Renderer;
    const P = NN.Particles;
    const A = NN.Audio;
    const E = NN.Entities;
    const W = NN.Waves;
    const UI = NN.UI;

    let canvas;
    let lastTime = 0;
    let state = 'MENU'; // MENU, PLAYING, PAUSED, UPGRADE, GAMEOVER
    let slowMoTimer = 0;
    let waveClearedFlag = false;

    function init() {
        canvas = document.getElementById('game-canvas');
        R.init(canvas);
        A.init();
        A.setVolumes(NN.Save.get().settings.master, NN.Save.get().settings.sfx, NN.Save.get().settings.music);
        P.init();
        UI.init();
        NN.Input.init(canvas);

        requestAnimationFrame(loop);
    }

    function loop(time) {
        const dt = Math.min(0.05, (time - lastTime) / 1000);
        lastTime = time;

        let scaledDt = dt;
        if (slowMoTimer > 0) {
            scaledDt *= 0.2;
            slowMoTimer -= dt;
        }

        update(scaledDt);
        render();

        NN.Input.endFrame();
        requestAnimationFrame(loop);
    }

    function update(dt) {
        R.update(dt);
        P.update(dt);

        if (state === 'PLAYING') {
            E.update(dt);
            W.update(dt);
            UI.updateHUD();
            UI.updateWaveUI(W.currentWave, W.enemiesLeft, W.isBossWave);

            // Check for pause
            if (NN.Input.justPressed('Escape') || NN.Input.justPressed('KeyP')) {
                pauseGame();
            }
            
            // Check wave clear
            if (waveClearedFlag) {
                waveClearedFlag = false;
                state = 'UPGRADE';
                const ups = NN.Upgrades.getRandomUpgrades(3);
                UI.showUpgrades(ups, () => {
                    W.startNextWave();
                    state = 'PLAYING';
                    UI.showHUD(true);
                });
            }
        } else if (state === 'PAUSED') {
            if (NN.Input.justPressed('Escape') || NN.Input.justPressed('KeyP')) {
                resumeGame();
            }
        }
    }

    function render() {
        R.applyTransform();
        R.drawBackground();

        if (state === 'PLAYING' || state === 'PAUSED' || state === 'UPGRADE' || state === 'GAMEOVER') {
            E.render();
            P.render(R.ctx);
        }

        R.drawForeground();
    }

    // --- State Transitions ---
        function startGame() {
        A.resume();
        E.reset();
        W.reset();
        P.clear();
        W.startNextWave();
        state = 'PLAYING';
        UI.showScreen(null); // <--- THIS LINE HIDES ALL MENUS
        UI.showHUD(true);
        A.startMusic();
        }

    function pauseGame() {
        if (state !== 'PLAYING') return;
        state = 'PAUSED';
        UI.showScreen('pause-menu');
        A.stopMusic();
    }

    function resumeGame() {
        if (state !== 'PAUSED') return;
        state = 'PLAYING';
        UI.showScreen('none'); // Hide menus
        UI.showHUD(true);
        A.startMusic();
    }

    function quitToMenu() {
        state = 'MENU';
        UI.showHUD(false);
        UI.showScreen('main-menu');
        A.stopMusic();
    }

    function playerDied() {
        state = 'GAMEOVER';
        A.sfx.gameOver();
        A.stopMusic();
        R.addShake(30);
        R.flashScreen('rgba(255,0,0,0.6)', 1.0);
        const p = E.player;
        NN.Save.addStats({ kills: p.stats.kills, wave: W.currentWave, score: p.stats.score });
        setTimeout(() => {
            UI.showGameOver(p.stats.score, W.currentWave);
        }, 1000);
    }

    function bossDefeated() {
        // Maybe special effects or drops handled in entities
    }

    function waveCleared() {
        waveClearedFlag = true;
    }

    function triggerSlowMo(duration) {
        slowMoTimer = duration;
    }

    return {
        init, startGame, pauseGame, resumeGame, quitToMenu,
        playerDied, waveCleared, triggerSlowMo, bossDefeated,
        get state() { return state; }
    };
})();

// Boot
window.addEventListener('load', NN.Game.init);
