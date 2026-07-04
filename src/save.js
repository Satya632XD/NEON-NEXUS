// ============================================
// NEON NEXUS — Save System (Local Storage)
// ============================================

window.NN = window.NN || {};

NN.Save = (function () {
    'use strict';
    const KEY = 'neon_nexus_save_v1';
    
    let data = {
        highScore: 0,
        totalKills: 0,
        totalRuns: 0,
        highestWave: 0,
        settings: { master: 0.8, sfx: 0.6, music: 0.4 }
    };

    function load() {
        try {
            const saved = localStorage.getItem(KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                data = { ...data, ...parsed, settings: { ...data.settings, ...(parsed.settings || {}) } };
            }
        } catch (e) { console.warn("Save load failed", e); }
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch (e) { console.warn("Save failed", e); }
    }

    function get() { return data; }
    
    function set(newData) { 
        data = { ...data, ...newData }; 
        save(); 
    }
    
    function addStats(stats) {
        data.totalKills += stats.kills || 0;
        data.totalRuns += 1;
        data.highestWave = Math.max(data.highestWave, stats.wave || 0);
        data.highScore = Math.max(data.highScore, stats.score || 0);
        save();
    }

    function reset() {
        data = { highScore: 0, totalKills: 0, totalRuns: 0, highestWave: 0, settings: { master: 0.8, sfx: 0.6, music: 0.4 } };
        save();
    }

    return { load, save, get, set, addStats, reset };
})();
