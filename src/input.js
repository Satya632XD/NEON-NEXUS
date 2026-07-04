// ============================================
// NEON NEXUS — Input Handler
// Keyboard, Mouse, and Touch support
// ============================================

window.NN = window.NN || {};

NN.Input = (function () {
    'use strict';

    const U = NN.Utils;

    const keys = {};
    const justPressedKeys = {};
    const justReleasedKeys = {};

    const mouse = {
        x: 0, y: 0,
        down: false,
        rightDown: false,
        justDown: false,
        justRightDown: false
    };

    // Virtual joystick for mobile movement
    const joystick = {
        active: false,
        baseX: 0, baseY: 0,
        knobX: 0, knobY: 0,
        dx: 0, dy: 0,
        touchId: null
    };

    // Mobile aim touch
    const aimTouch = {
        active: false,
        x: 0, y: 0,
        touchId: null
    };

    let canvas = null;
    let isTouchDevice = false;
    let isMobile = false;

    function init(canvasEl) {
        canvas = canvasEl;
        isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        isMobile = isTouchDevice && window.innerWidth < 1024;

        // --- Keyboard ---
        window.addEventListener('keydown', e => {
            const code = e.code;
            if (!keys[code]) justPressedKeys[code] = true;
            keys[code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', e => {
            keys[e.code] = false;
            justReleasedKeys[e.code] = true;
        });

        window.addEventListener('blur', () => {
            for (const k in keys) keys[k] = false;
            mouse.down = false;
            mouse.rightDown = false;
            joystick.active = false;
            aimTouch.active = false;
        });

        // --- Mouse ---
        canvas.addEventListener('mousemove', e => {
            const r = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - r.left) * (canvas.width / r.width) / (window.devicePixelRatio || 1);
            mouse.y = (e.clientY - r.top) * (canvas.height / r.height) / (window.devicePixelRatio || 1);
        });

        canvas.addEventListener('mousedown', e => {
            if (e.button === 0) { mouse.down = true; mouse.justDown = true; }
            if (e.button === 2) { mouse.rightDown = true; mouse.justRightDown = true; }
            e.preventDefault();
        });

        canvas.addEventListener('mouseup', e => {
            if (e.button === 0) mouse.down = false;
            if (e.button === 2) mouse.rightDown = false;
        });

        canvas.addEventListener('contextmenu', e => e.preventDefault());

        // --- Touch ---
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

        // Show mobile controls if touch device
        if (isMobile) {
            const mc = document.getElementById('mobile-controls');
            if (mc) mc.classList.remove('hidden');
            setupMobileButtons();
        }
    }

    function getCanvasPos(touch) {
        const r = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        return {
            x: (touch.clientX - r.left) * (canvas.width / r.width) / dpr,
            y: (touch.clientY - r.top) * (canvas.height / r.height) / dpr
        };
    }

    function onTouchStart(e) {
        e.preventDefault();
        const w = window.innerWidth;
        for (const touch of e.changedTouches) {
            const pos = getCanvasPos(touch);
            const clientX = touch.clientX;
            const clientY = touch.clientY;

            // Left side = joystick, right side = aim
            if (clientX < w * 0.45 && !joystick.active) {
                joystick.active = true;
                joystick.touchId = touch.identifier;
                joystick.baseX = clientX;
                joystick.baseY = clientY;
                joystick.knobX = clientX;
                joystick.knobY = clientY;
                joystick.dx = 0;
                joystick.dy = 0;
                // Update visual
                const base = document.getElementById('joystick-base');
                const knob = document.getElementById('joystick-knob');
                if (base) {
                    base.style.left = (clientX - 65) + 'px';
                    base.style.top = (clientY - 65) + 'px';
                    base.style.bottom = 'auto';
                    base.style.display = 'block';
                }
            } else if (!aimTouch.active) {
                aimTouch.active = true;
                aimTouch.touchId = touch.identifier;
                aimTouch.x = pos.x;
                aimTouch.y = pos.y;
                mouse.x = pos.x;
                mouse.y = pos.y;
                mouse.down = true;
                mouse.justDown = true;
            }
        }
    }

    function onTouchMove(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystick.touchId) {
                joystick.knobX = touch.clientX;
                joystick.knobY = touch.clientY;
                const dx = touch.clientX - joystick.baseX;
                const dy = touch.clientY - joystick.baseY;
                const m = U.mag(dx, dy);
                const maxDist = 60;
                if (m > maxDist) {
                    joystick.dx = (dx / m) * maxDist / maxDist;
                    joystick.dy = (dy / m) * maxDist / maxDist;
                } else {
                    joystick.dx = dx / maxDist;
                    joystick.dy = dy / maxDist;
                }
                // Update knob visual
                const knob = document.getElementById('joystick-knob');
                if (knob) {
                    const clampedDx = U.clamp(dx, -maxDist, maxDist);
                    const clampedDy = U.clamp(dy, -maxDist, maxDist);
                    knob.style.transform = `translate(calc(-50% + ${clampedDx}px), calc(-50% + ${clampedDy}px))`;
                }
            } else if (touch.identifier === aimTouch.touchId) {
                const pos = getCanvasPos(touch);
                aimTouch.x = pos.x;
                aimTouch.y = pos.y;
                mouse.x = pos.x;
                mouse.y = pos.y;
            }
        }
    }

    function onTouchEnd(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystick.touchId) {
                joystick.active = false;
                joystick.touchId = null;
                joystick.dx = 0;
                joystick.dy = 0;
                const knob = document.getElementById('joystick-knob');
                if (knob) knob.style.transform = 'translate(-50%, -50%)';
            } else if (touch.identifier === aimTouch.touchId) {
                aimTouch.active = false;
                aimTouch.touchId = null;
                mouse.down = false;
            }
        }
    }

    function setupMobileButtons() {
        const dashBtn = document.getElementById('btn-dash-mobile');
        const pulseBtn = document.getElementById('btn-pulse-mobile');

        if (dashBtn) {
            dashBtn.addEventListener('touchstart', e => {
                e.preventDefault();
                justPressedKeys['Space'] = true;
                keys['Space'] = true;
            }, { passive: false });
            dashBtn.addEventListener('touchend', e => {
                e.preventDefault();
                keys['Space'] = false;
            }, { passive: false });
        }

        if (pulseBtn) {
            pulseBtn.addEventListener('touchstart', e => {
                e.preventDefault();
                justPressedKeys['ShiftLeft'] = true;
                keys['ShiftLeft'] = true;
            }, { passive: false });
            pulseBtn.addEventListener('touchend', e => {
                e.preventDefault();
                keys['ShiftLeft'] = false;
            }, { passive: false });
        }
    }

    // --- Public API ---
    function justPressed(code) { return !!justPressedKeys[code]; }
    function justReleased(code) { return !!justReleasedKeys[code]; }
    function isDown(code) { return !!keys[code]; }

    function anyJustPressed(codes) {
        for (const c of codes) if (justPressedKeys[c]) return true;
        return false;
    }

    function getMoveVector() {
        let x = 0, y = 0;
        if (keys['KeyW'] || keys['ArrowUp']) y -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) y += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) x -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) x += 1;

        if (joystick.active) {
            x = joystick.dx;
            y = joystick.dy;
        }

        const m = U.mag(x, y);
        if (m > 1) { x /= m; y /= m; }
        return { x, y, mag: Math.min(m, 1) };
    }

    function getAimPoint(playerX, playerY) {
        // Returns the point the player is aiming at
        if (isTouchDevice && aimTouch.active) {
            return { x: mouse.x, y: mouse.y };
        }
        if (isTouchDevice && !aimTouch.active) {
            // No aim touch, return point in front of player based on movement
            const mv = getMoveVector();
            if (mv.mag > 0.1) {
                return { x: playerX + mv.x * 100, y: playerY + mv.y * 100 };
            }
            return null; // Will trigger auto-aim
        }
        return { x: mouse.x, y: mouse.y };
    }

    function endFrame() {
        for (const k in justPressedKeys) justPressedKeys[k] = false;
        for (const k in justReleasedKeys) justReleasedKeys[k] = false;
        mouse.justDown = false;
        mouse.justRightDown = false;
    }

    function isMobileDevice() { return isMobile; }
    function hasTouch() { return isTouchDevice; }

    return {
        init, endFrame,
        justPressed, justReleased, isDown, anyJustPressed,
        getMoveVector, getAimPoint,
        isMobileDevice, hasTouch,
        mouse, joystick, aimTouch,
        get keys() { return keys; }
    };
})();
