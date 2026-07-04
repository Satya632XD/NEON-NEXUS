// ============================================
// NEON NEXUS — Procedural Audio Engine
// Web Audio API synthesis and music generation
// ============================================

window.NN = window.NN || {};

NN.Audio = (function () {
    'use strict';

    let ctx = null;
    let masterGain, sfxGain, musicGain;
    let musicScheduler = null;
    let nextNoteTime = 0;
    let currentStep = 0;
    let tempo = 120.0;
    let pattern = [];
    let musicPlaying = false;

    // Synth parameters
    const scale = [220.00, 246.94, 261.63, 293.66, 329.63, 369.99, 392.00, 440.00]; // A minor

    function init() {
        if (ctx) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            sfxGain = ctx.createGain();
            musicGain = ctx.createGain();

            masterGain.gain.value = 0.8;
            sfxGain.gain.value = 0.6;
            musicGain.gain.value = 0.4;

            masterGain.connect(ctx.destination);
            sfxGain.connect(masterGain);
            musicGain.connect(masterGain);

            generatePattern();
        } catch (e) {
            console.warn("Web Audio API not supported");
        }
    }

    function resume() {
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    function setVolumes(master, sfx, music) {
        if (!ctx) return;
        masterGain.gain.value = master;
        sfxGain.gain.value = sfx;
        musicGain.gain.value = music;
    }

    // --- Core Synth Voices ---
    function playTone(freq, time, dur, type = 'sine', vol = 0.5, attack = 0.01, decay = 0.1, dest = null) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, time + attack + decay);

        osc.connect(gain);
        gain.connect(dest || sfxGain);

        osc.start(time);
        osc.stop(time + dur + 0.05);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }

    function playSweep(startFreq, endFreq, time, dur, type = 'sawtooth', vol = 0.3) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), time + dur);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);

        osc.start(time);
        osc.stop(time + dur + 0.05);
        osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    }

    function playNoise(time, dur, vol = 0.3, filterFreq = 1000, type = 'highpass') {
        if (!ctx) return;
        const bufferSize = ctx.sampleRate * dur;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = filterFreq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);

        noise.start(time);
        noise.stop(time + dur);
        noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    }

    // --- SFX Library ---
    const sfx = {
        shoot: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playSweep(800, 400, t, 0.08, 'square', 0.15);
        },
        enemyShoot: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playSweep(300, 150, t, 0.12, 'sawtooth', 0.1);
        },
        hit: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playTone(150, t, 0.1, 'square', 0.2, 0.01, 0.08);
            playNoise(t, 0.05, 0.1, 2000, 'bandpass');
        },
        enemyDeath: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playSweep(400, 50, t, 0.3, 'sawtooth', 0.2);
            playNoise(t, 0.2, 0.15, 500, 'lowpass');
        },
        playerHurt: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playSweep(200, 80, t, 0.4, 'sawtooth', 0.3);
            playNoise(t, 0.3, 0.2, 300, 'lowpass');
        },
        dash: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playSweep(100, 1000, t, 0.15, 'sine', 0.2);
        },
        pulse: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playSweep(50, 800, t, 0.5, 'sine', 0.4);
            playNoise(t, 0.4, 0.2, 500, 'lowpass');
        },
        pickup: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playTone(880, t, 0.1, 'sine', 0.2);
            playTone(1320, t + 0.05, 0.1, 'sine', 0.2);
        },
        upgrade: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playTone(523, t, 0.15, 'triangle', 0.2); // C5
            playTone(659, t + 0.08, 0.15, 'triangle', 0.2); // E5
            playTone(784, t + 0.16, 0.3, 'triangle', 0.2); // G5
        },
        waveStart: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playTone(330, t, 0.2, 'sine', 0.2);
            playTone(440, t + 0.1, 0.3, 'sine', 0.2);
        },
        bossSpawn: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playSweep(100, 50, t, 1.0, 'sawtooth', 0.4);
            playNoise(t, 1.0, 0.3, 200, 'lowpass');
        },
        gameOver: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playSweep(440, 55, t, 1.5, 'sawtooth', 0.3);
            playTone(110, t + 0.5, 1.0, 'sine', 0.2);
        },
        menuClick: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playTone(600, t, 0.05, 'square', 0.1);
        },
        menuHover: () => {
            if (!ctx) return;
            const t = ctx.currentTime;
            playTone(800, t, 0.03, 'sine', 0.05);
        }
    };

    // --- Procedural Music ---
    function generatePattern() {
        pattern = [];
        const steps = 32; // 2 bars of 16th notes
        const bassNotes = [0, 0, 5, 5, 3, 3, 4, 4]; // A, A, D, D, C, C, D, E (scale indices)
        
        for (let i = 0; i < steps; i++) {
            const step = { bass: null, lead: null, hat: false };
            
            // Bass on 1/4 notes
            if (i % 4 === 0) {
                step.bass = scale[bassNotes[(i / 4) % bassNotes.length] % scale.length] / 2;
            }
            
            // Lead randomly
            if (Math.random() < 0.25) {
                step.lead = scale[Math.floor(Math.random() * scale.length)] * 2;
            }
            
            // Hats on off-beats
            if (i % 2 === 1) step.hat = true;
            
            pattern.push(step);
        }
    }

    function playMusicStep(step, time) {
        if (!pattern[step]) return;
        const p = pattern[step];

        if (p.bass) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.value = p.bass;
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.25, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(musicGain);
            osc.start(time);
            osc.stop(time + 0.4);
            osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
        }

        if (p.lead) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = p.lead;
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.1, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            
            osc.connect(gain);
            gain.connect(musicGain);
            osc.start(time);
            osc.stop(time + 0.25);
            osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        }

        if (p.hat) {
            const bufferSize = ctx.sampleRate * 0.05;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 7000;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.05, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            noise.connect(filter); filter.connect(gain); gain.connect(musicGain);
            noise.start(time); noise.stop(time + 0.06);
            noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
        }
    }

    function scheduler() {
        if (!musicPlaying) return;
        while (nextNoteTime < ctx.currentTime + 0.1) {
            playMusicStep(currentStep, nextNoteTime);
            nextNoteTime += (60.0 / tempo) / 4; // 16th notes
            currentStep = (currentStep + 1) % pattern.length;
        }
        setTimeout(scheduler, 25);
    }

    function startMusic() {
        if (!ctx || musicPlaying) return;
        musicPlaying = true;
        currentStep = 0;
        nextNoteTime = ctx.currentTime + 0.05;
        scheduler();
    }

    function stopMusic() {
        musicPlaying = false;
    }

    function regenerateMusic() {
        generatePattern();
    }

    return {
        init, resume, setVolumes, sfx,
        startMusic, stopMusic, regenerateMusic
    };
})();
