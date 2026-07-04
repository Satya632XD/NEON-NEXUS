// ============================================
// NEON NEXUS — Particle System
// High-performance pooled particles & floating text
// ============================================

window.NN = window.NN || {};

NN.Particles = (function () {
    'use strict';

    const U = NN.Utils;
    let pool;
    let active = [];

    function init() {
        pool = new U.Pool(
            () => ({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 1,
                size: 1, color: '#fff',
                type: 'spark', // spark, ring, text
                text: '', fontSize: 12,
                drag: 0.9, grav: 0,
                rot: 0, rotSpeed: 0,
                startSize: 1, endSize: 1
            }),
            (p) => { p.life = 0; }
        );
    }

    function spawn(opts) {
        const p = pool.get();
        p.x = opts.x || 0;
        p.y = opts.y || 0;
        p.vx = opts.vx || 0;
        p.vy = opts.vy || 0;
        p.maxLife = opts.life || 1;
        p.life = p.maxLife;
        p.color = opts.color || '#fff';
        p.type = opts.type || 'spark';
        p.size = opts.size || 2;
        p.startSize = opts.startSize || p.size;
        p.endSize = opts.endSize !== undefined ? opts.endSize : 0;
        p.text = opts.text || '';
        p.fontSize = opts.fontSize || 14;
        p.drag = opts.drag !== undefined ? opts.drag : 0.9;
        p.grav = opts.grav || 0;
        p.rot = opts.rot || 0;
        p.rotSpeed = opts.rotSpeed || 0;
        active.push(p);
        return p;
    }

    function burst(x, y, count, opts) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (opts.speed || 100) * (0.5 + Math.random() * 0.5);
            spawn({
                ...opts,
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            });
        }
    }

    function floatingText(x, y, text, color, size = 14) {
        spawn({
            x, y,
            vx: (Math.random() - 0.5) * 20,
            vy: -40 - Math.random() * 20,
            life: 1.0,
            color,
            type: 'text',
            text,
            fontSize: size,
            drag: 0.8,
            grav: 0
        });
    }

    function update(dt) {
        for (let i = active.length - 1; i >= 0; i--) {
            const p = active[i];
            p.life -= dt;
            
            if (p.life <= 0) {
                active.splice(i, 1);
                pool.release(p);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            const dragFactor = Math.pow(p.drag, dt * 60);
            p.vx *= dragFactor;
            p.vy *= dragFactor;
            p.vy += p.grav * dt;
            p.rot += p.rotSpeed * dt;

            // Interpolate size
            const t = 1 - (p.life / p.maxLife);
            p.size = U.lerp(p.startSize, p.endSize, t);
        }
    }

    function render(ctx) {
        // Group by blend mode for performance
        // Additive blending for sparks and rings
        ctx.globalCompositeOperation = 'lighter';
        
        for (let i = 0; i < active.length; i++) {
            const p = active[i];
            const alpha = Math.min(1, p.life / p.maxLife * 2); // Fade out quicker at end
            
            if (p.type === 'spark') {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'ring') {
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = alpha;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Normal blending for text
        ctx.globalCompositeOperation = 'source-over';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < active.length; i++) {
            const p = active[i];
            if (p.type === 'text') {
                const alpha = Math.min(1, p.life / p.maxLife * 1.5);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.fontSize}px Courier New`;
                ctx.fillText(p.text, p.x, p.y);
            }
        }
        
        ctx.globalAlpha = 1;
    }

    function clear() {
        while (active.length) pool.release(active.pop());
    }

    return {
        init, spawn, burst, floatingText,
        update, render, clear,
        get count() { return active.length; }
    };
})();
