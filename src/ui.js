// ============================================
// NEON NEXUS — UI Manager
// ============================================

window.NN = window.NN || {};

NN.UI = (function () {
    'use strict';
    const U = NN.Utils;

    const elements = {};

    function init() {
        // Cache DOM elements
        const ids = [
            'main-menu', 'howto-menu', 'stats-menu', 'pause-menu', 'upgrade-menu', 'gameover-menu',
            'btn-start', 'btn-howto', 'btn-stats', 'btn-howto-back', 'btn-stats-back', 'btn-reset-stats',
            'btn-resume', 'btn-quit', 'btn-retry', 'btn-menu',
            'hud', 'hp-fill', 'hp-text', 'wave-num', 'enemies-left', 'pulse-fill', 'dash-cd', 'score-val',
            'boss-hp-bar', 'boss-hp-fill', 'boss-name', 'wave-announce',
            'upgrade-cards', 'upgrade-title', 'stats-content', 'gameover-stats', 'highscore-display'
        ];
        ids.forEach(id => elements[id] = document.getElementById(id));

        // Bind buttons
        elements['btn-start'].onclick = () => { NN.Audio.sfx.menuClick(); NN.Game.startGame(); };
        elements['btn-howto'].onclick = () => { showScreen('howto-menu'); NN.Audio.sfx.menuClick(); };
        elements['btn-stats'].onclick = () => { showStats(); showScreen('stats-menu'); NN.Audio.sfx.menuClick(); };
        elements['btn-howto-back'].onclick = () => { showScreen('main-menu'); NN.Audio.sfx.menuClick(); };
        elements['btn-stats-back'].onclick = () => { showScreen('main-menu'); NN.Audio.sfx.menuClick(); };
        elements['btn-reset-stats'].onclick = () => { NN.Save.reset(); showStats(); NN.Audio.sfx.menuClick(); };
        
        elements['btn-resume'].onclick = () => { NN.Game.resumeGame(); NN.Audio.sfx.menuClick(); };
        elements['btn-quit'].onclick = () => { NN.Game.quitToMenu(); NN.Audio.sfx.menuClick(); };
        
        elements['btn-retry'].onclick = () => { NN.Game.startGame(); NN.Audio.sfx.menuClick(); };
        elements['btn-menu'].onclick = () => { NN.Game.quitToMenu(); NN.Audio.sfx.menuClick(); };

        // Hover sounds
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => NN.Audio.sfx.menuHover());
        });

        updateHighScoreDisplay();
    }

    function showScreen(id) {
        ['main-menu', 'howto-menu', 'stats-menu', 'pause-menu', 'upgrade-menu', 'gameover-menu'].forEach(s => {
            elements[s].classList.add('hidden');
        });
        if (elements[id]) elements[id].classList.remove('hidden');
    }

    function showHUD(show) {
        elements['hud'].classList.toggle('hidden', !show);
    }

    function updateHighScoreDisplay() {
        const save = NN.Save.get();
        if (save.highScore > 0) {
            elements['highscore-display'].textContent = `HIGH SCORE: ${save.highScore}`;
        } else {
            elements['highscore-display'].textContent = '';
        }
    }

    function showStats() {
        const save = NN.Save.get();
        const html = `
            <div class="stat-row"><span class="stat-label">HIGH SCORE</span><span class="stat-val gold">${save.highScore}</span></div>
            <div class="stat-row"><span class="stat-label">HIGHEST WAVE</span><span class="stat-val">${save.highestWave}</span></div>
            <div class="stat-row"><span class="stat-label">TOTAL KILLS</span><span class="stat-val red">${save.totalKills}</span></div>
            <div class="stat-row"><span class="stat-label">TOTAL RUNS</span><span class="stat-val">${save.totalRuns}</span></div>
        `;
        elements['stats-content'].innerHTML = html;
    }

    function updateHUD() {
        const p = NN.Entities.player;
        if (!p) return;

        const hpPct = Math.max(0, p.hp / p.maxHp) * 100;
        elements['hp-fill'].style.width = hpPct + '%';
        elements['hp-text'].textContent = Math.ceil(p.hp);

        const pulsePct = Math.min(100, (p.pulseCharge / p.maxPulseCharge) * 100);
        elements['pulse-fill'].style.width = pulsePct + '%';
        if (p.pulseCharge >= p.maxPulseCharge) elements['pulse-fill'].classList.add('pulse-ready');
        else elements['pulse-fill'].classList.remove('pulse-ready');

        elements['dash-cd'].textContent = p.dashCd > 0 ? `DASH: ${p.dashCd.toFixed(1)}s` : 'DASH READY';
        elements['score-val'].textContent = U.formatNum(p.stats.score);
    }

    function updateWaveUI(wave, enemiesLeft, isBossWave) {
        elements['wave-num'].textContent = wave;
        elements['enemies-left'].textContent = enemiesLeft + ' left';
        
        if (isBossWave && NN.Entities.boss) {
            const boss = NN.Entities.boss;
            elements['boss-hp-bar'].classList.remove('hidden');
            elements['boss-hp-fill'].style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + '%';
            elements['boss-name'].textContent = 'VOID ENTITY';
        } else {
            elements['boss-hp-bar'].classList.add('hidden');
        }
    }

    function announceWave(wave, isBoss) {
        const el = elements['wave-announce'];
        el.textContent = isBoss ? `BOSS WAVE ${wave}` : `WAVE ${wave}`;
        el.classList.toggle('boss', isBoss);
        el.classList.remove('show');
        void el.offsetWidth; // Trigger reflow
        el.classList.add('show');
    }

    function showUpgrades(upgrades, callback) {
        elements['upgrade-title'].textContent = `WAVE ${NN.Waves.currentWave} CLEARED`;
        elements['upgrade-cards'].innerHTML = '';
        
        upgrades.forEach(up => {
            const card = document.createElement('div');
            card.className = `upgrade-card ${up.tier}`;
            card.innerHTML = `
                <div class="upgrade-icon">${up.tier === 'epic' ? '★' : up.tier === 'rare' ? '◆' : '○'}</div>
                <div class="upgrade-name">${up.name}</div>
                <div class="upgrade-desc">${up.desc}</div>
                <div class="upgrade-tier">${up.tier.toUpperCase()}</div>
            `;
            card.onclick = () => {
                NN.Audio.sfx.upgrade();
                NN.Upgrades.applyUpgrade(up.id);
                callback();
            };
            elements['upgrade-cards'].appendChild(card);
        });
        
        showScreen('upgrade-menu');
    }

    function showGameOver(score, wave) {
        const save = NN.Save.get();
        const isNewHighScore = score > save.highScore;
        
        if (isNewHighScore) {
            save.highScore = score;
            save.highestWave = Math.max(save.highestWave, wave);
            NN.Save.set(save);
        }
        
        const html = `
            ${isNewHighScore ? '<div class="new-record">NEW HIGH SCORE!</div>' : ''}
            <div class="stat-row"><span class="stat-label">SCORE</span><span class="stat-val gold">${score}</span></div>
            <div class="stat-row"><span class="stat-label">WAVE REACHED</span><span class="stat-val">${wave}</span></div>
        `;
        elements['gameover-stats'].innerHTML = html;
        showScreen('gameover-menu');
        updateHighScoreDisplay();
    }

    return {
        init, showScreen, showHUD, updateHUD, updateWaveUI, 
        announceWave, showUpgrades, showGameOver, showStats, updateHighScoreDisplay
    };
})();
