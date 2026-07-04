// ============================================
// NEON NEXUS — Utility Functions
// Global namespace: NN
// ============================================

window.NN = window.NN || {};

NN.Utils = (function () {
    'use strict';

    const TWO_PI = Math.PI * 2;
    const PI = Math.PI;
    const HALF_PI = PI / 2;
    let _uid = 0;

    // --- Random ---
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function randChance(p) { return Math.random() < p; }
    function randSign() { return Math.random() < 0.5 ? -1 : 1; }

    // --- Math ---
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, mn, mx) { return v < mn ? mn : v > mx ? mx : v; }
    function dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
    function distSq(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }
    function angle(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
    function mag(x, y) { return Math.sqrt(x * x + y * y); }
    function norm(x, y) { const m = mag(x, y); return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 }; }

    function normAngle(a) {
        while (a > PI) a -= TWO_PI;
        while (a < -PI) a += TWO_PI;
        return a;
    }
    function angleDiff(a, b) { return Math.abs(normAngle(a - b)); }
    function lerpAngle(a, b, t) { return a + normAngle(b - a) * t; }

    function uid() { return ++_uid; }

    // --- Color helpers ---
    function hsl(h, s, l, a) { return a !== undefined ? `hsla(${h},${s}%,${l}%,${a})` : `hsl(${h},${s}%,${l}%)`; }
    function rgba(r, g, b, a) { return `rgba(${r|0},${g|0},${b|0},${a === undefined ? 1 : a})`; }

    // Parse hex to RGB
    function hexToRgb(hex) {
        const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 };
    }

    // --- Easing ---
    const ease = {
        linear: t => t,
        outCubic: t => 1 - Math.pow(1 - t, 3),
        inCubic: t => t * t * t,
        outQuad: t => t * (2 - t),
        inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
        outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
        outElastic: t => {
            if (t === 0 || t === 1) return t;
            const c4 = (2 * PI) / 3;
            return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        },
        outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    };

    // --- Formatting ---
    function formatNum(n) {
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return Math.floor(n).toString();
    }
    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    // --- Collision ---
    function circleCircle(x1, y1, r1, x2, y2, r2) {
        const r = r1 + r2;
        return distSq(x1, y1, x2, y2) < r * r;
    }

    function pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }

    // --- Object Pool ---
    class Pool {
        constructor(factory, resetFn) {
            this.factory = factory;
            this.resetFn = resetFn;
            this.free = [];
            this.active = [];
        }
        get() {
            const obj = this.free.pop() || this.factory();
            this.active.push(obj);
            return obj;
        }
        release(obj) {
            const idx = this.active.indexOf(obj);
            if (idx >= 0) {
                this.active.splice(idx, 1);
                if (this.resetFn) this.resetFn(obj);
                this.free.push(obj);
            }
        }
        releaseAll() {
            while (this.active.length) {
                const obj = this.active.pop();
                if (this.resetFn) this.resetFn(obj);
                this.free.push(obj);
            }
        }
        forEach(fn) {
            for (let i = this.active.length - 1; i >= 0; i--) fn(this.active[i], i);
        }
        get count() { return this.active.length; }
    }

    // --- Simple seeded RNG (for deterministic proc-gen) ---
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    return {
        TWO_PI, PI, HALF_PI,
        rand, randInt, randChoice, randChance, randSign,
        lerp, clamp, dist, distSq, angle, mag, norm,
        normAngle, angleDiff, lerpAngle,
        uid, hsl, rgba, hexToRgb,
        ease, formatNum, formatTime,
        circleCircle, pointInRect,
        Pool, mulberry32
    };
})();
