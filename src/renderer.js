// ============================================
// NEON NEXUS — Canvas Renderer & Camera
// Handles drawing, neon effects, and camera shake
// ============================================

window.NN = window.NN || {};

NN.Renderer = (function () {
    'use strict';

    let canvas, ctx;
    let width = 0, height = 0; // Logical dimensions (CSS pixels)
    let dpr = 1;

    const cam = {
        x: 0, y: 0,
        targetX: 0, targetY: 0,
        zoom: 1, targetZoom: 1,
        shakeX: 0, shakeY: 0,
        shakeMag: 0
    };

    let bgOffset = 0;
    let flashAlpha = 0;
    let flashColor = 'rgba(255,255,255,1)';

    function init(c) {
        canvas = c;
        ctx = c.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Scale for DPR
    }

    function setCameraTarget(x, y) {
        cam.targetX = x;
        cam.targetY = y;
    }

    function setZoom(z) {
        cam.targetZoom = z;
    }

    function addShake(amount) {
        cam.shakeMag = Math.min(cam.shakeMag + amount, 25);
    }

    function flashScreen(color, intensity = 0.6) {
        flashColor = color;
        flashAlpha = intensity;
    }

    function update(dt) {
        // Smooth camera follow
        cam.x += (cam.targetX - cam.x) * Math.min(1, dt * 8);
        cam.y += (cam.targetY - cam.y) * Math.min(1, dt * 8);
        cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * 5);

        // Shake decay
        if (cam.shakeMag > 0.1) {
            cam.shakeX = (Math.random() * 2 - 1) * cam.shakeMag;
            cam.shakeY = (Math.random() * 2 - 1) * cam.shakeMag;
            cam.shakeMag *= Math.pow(0.001, dt); // Fast exponential decay
        } else {
            cam.shakeX = 0; cam.shakeY = 0; cam.shakeMag = 0;
        }

        bgOffset += dt * 20;
        flashAlpha *= Math.pow(0.0001, dt);
    }

    function applyTransform() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Clear
        ctx.fillStyle = '#02020a';
        ctx.fillRect(0, 0, width, height);

        // Apply camera
        ctx.translate(width / 2, height / 2);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x + cam.shakeX, -cam.y + cam.shakeY);
    }

    function drawBackground() {
        const U = NN.Utils;
        const gridSize = 80;
        
        // Calculate visible world bounds
        const viewW = width / cam.zoom;
        const viewH = height / cam.zoom;
        const startX = Math.floor((cam.x - viewW / 2) / gridSize) * gridSize;
        const endX = Math.ceil((cam.x + viewW / 2) / gridSize) * gridSize;
        const startY = Math.floor((cam.y - viewH / 2) / gridSize) * gridSize;
        const endY = Math.ceil((cam.y + viewH / 2) / gridSize) * gridSize;

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1 / cam.zoom;
        ctx.beginPath();
        
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();

        // Animated stars/particles in background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const starOffsetX = cam.x * 0.2 % width;
        const starOffsetY = cam.y * 0.2 % height;
        // Just draw some static dots relative to camera for performance
        for(let i=0; i<20; i++) {
            const sx = (i * 137 - cam.x*0.5) % 2000 - 1000;
            const sy = (i * 89 - cam.y*0.5) % 2000 - 1000;
            ctx.fillRect(sx, sy, 2, 2);
        }
    }

    function drawForeground() {
        // Screen flash
        if (flashAlpha > 0.01) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = flashColor.replace('1)', flashAlpha + ')');
            ctx.fillRect(0, 0, width, height);
        }
    }

    // --- Neon Drawing Helpers ---
    function neonCircle(x, y, r, color, glow = 15, fill = true) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        if (fill) ctx.fill();
        else ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function neonLine(x1, y1, x2, y2, color, width = 2, glow = 10) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function neonPolygon(points, color, glow = 15, fill = true) {
        if (points.length < 3) return;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        if (fill) ctx.fill();
        else ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function clearShadows() { ctx.shadowBlur = 0; }

    return {
        init, update, resize,
        applyTransform, drawBackground, drawForeground,
        setCameraTarget, setZoom, addShake, flashScreen,
        neonCircle, neonLine, neonPolygon, clearShadows,
        get ctx() { return ctx; },
        get width() { return width; },
        get height() { return height; },
        get cam() { return cam; }
    };
})();
