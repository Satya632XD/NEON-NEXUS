// ============================================
// NEON NEXUS — Entities & Game Objects
// Player, Enemies, Bosses, Bullets, Pickups
// ============================================

window.NN = window.NN || {};

NN.Entities = (function () {
    'use strict';
    const U = NN.Utils;
    const R = NN.Renderer;
    const P = NN.Particles;
    const A = NN.Audio;

    let player = null;
    let enemies = [];
    let bullets = [];
    let pickups = [];
    let boss = null;

    // Object Pools to prevent Garbage Collection stutter
    const bulletPool = new U.Pool(
        () => ({ x:0, y:0, vx:0, vy:0, r:0, dmg:0, life:0, color:'#fff', friendly:false, pierce:0 }),
        (b) => { b.life = 0; b.pierce = 0; }
    );
    const enemyPool = new U.Pool(
        () => ({ x:0, y:0, vx:0, vy:0, r:0, hp:0, maxHp:0, type:'', color:'#fff', fireTimer:0, speed:0, dmg:0, score:0, isBoss:false, phase:0, pattern:0, patternTimer:0, angleOffset:0 }),
        (e) => { e.isBoss = false; e.hp = 0; }
    );
    const pickupPool = new U.Pool(
        () => ({ x:0, y:0, vx:0, vy:0, r:0, type:'xp', value:1, life:0, color:'#fff', pulse:0 }),
        (p) => { p.life = 0; }
    );

    function initPlayer() {
        player = {
            x: 0, y: 0, vx: 0, vy: 0,
            r: 14, speed: 280,
            hp: 100, maxHp: 100,
            fireRate: 0.15, fireTimer: 0,
            bulletDmg: 10, bulletSpeed: 600, bulletPierce: 0, bulletCount: 1, spread: 0,
            pulseCharge: 0, maxPulseCharge: 100, pulseChargeRate: 1,
            dashCd: 0, maxDashCd: 2.0, dashTimer: 0, invuln: 0,
            aimX: 1, aimY: 0, angle: 0,
            stats: { kills: 0, score: 0 }
        };
    }

    function spawnEnemy(type, x, y) {
        const e = enemyPool.get();
        e.x = x; e.y = y; e.vx = 0; e.vy = 0;
        e.type = type; e.isBoss = false;
        e.fireTimer = U.rand(1, 3);
        e.phase = 0; e.pattern = 0; e.patternTimer = 0; e.angleOffset = U.rand(0, U.TWO_PI);

        switch (type) {
            case 'chaser':
                e.r = 12; e.hp = 20; e.speed = 90; e.dmg = 10; e.color = '#ff3355'; e.score = 10;
                break;
            case 'shooter':
                e.r = 14; e.hp = 30; e.speed = 50; e.dmg = 15; e.color = '#ff8800'; e.score = 20;
                break;
            case 'zigzag':
                e.r = 10; e.hp = 15; e.speed = 120; e.dmg = 10; e.color = '#aa66ff'; e.score = 15;
                break;
            case 'tank':
                e.r = 24; e.hp = 100; e.speed = 40; e.dmg = 25; e.color = '#ff00aa'; e.score = 50;
                break;
            case 'boss':
                e.isBoss = true;
                e.r = 60; e.hp = 1000; e.speed = 60; e.dmg = 30; e.color = '#ff00aa'; e.score = 500;
                e.phase = 1; e.pattern = U.randInt(0, 2);
                break;
        }
        e.maxHp = e.hp;
        enemies.push(e);
        if (e.isBoss) boss = e;
        return e;
    }

    function spawnBullet(opts) {
        const b = bulletPool.get();
        b.x = opts.x; b.y = opts.y;
        b.vx = opts.vx; b.vy = opts.vy;
        b.r = opts.r || 4;
        b.dmg = opts.dmg || 10;
        b.life = opts.life || 2;
        b.color = opts.color || '#fff';
        b.friendly = opts.friendly || false;
        b.pierce = opts.pierce || 0;
        bullets.push(b);
        return b;
    }

    function spawnPickup(x, y, type, value) {
        const p = pickupPool.get();
        p.x = x; p.y = y;
        const ang = U.rand(0, U.TWO_PI);
        p.vx = Math.cos(ang) * 50; p.vy = Math.sin(ang) * 50;
        p.r = 6; p.type = type; p.value = value || 1; p.life = 15;
        p.color = type === 'xp' ? '#00ff88' : '#ffee00';
        p.pulse = U.rand(0, U.TWO_PI);
        pickups.push(p);
        return p;
    }

    // --- Update Logic ---
    function update(dt) {
        if (!player) return;

        updatePlayer(dt);
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            updateEnemy(e, dt);
            if (e.hp <= 0) {
                killEnemy(e);
                enemies.splice(i, 1);
                enemyPool.release(e);
            }
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0 || Math.abs(b.x) > 2000 || Math.abs(b.y) > 2000) {
                bullets.splice(i, 1);
                bulletPool.release(b);
            }
        }

        for (let i = pickups.length - 1; i >= 0; i--) {
            const p = pickups[i];
            p.life -= dt;
            p.pulse += dt * 5;
            
            // Magnet effect
            const distToPlayer = U.dist(p.x, p.y, player.x, player.y);
            if (distToPlayer < 150) {
                const ang = U.angle(p.x, p.y, player.x, player.y);
                p.vx += Math.cos(ang) * 800 * dt;
                p.vy += Math.sin(ang) * 800 * dt;
            }
            p.vx *= Math.pow(0.1, dt);
            p.vy *= Math.pow(0.1, dt);
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.life <= 0) {
                pickups.splice(i, 1);
                pickupPool.release(p);
            }
        }

        checkCollisions();
    }

    function updatePlayer(dt) {
        const p = player;
        p.invuln = Math.max(0, p.invuln - dt);
        p.dashCd = Math.max(0, p.dashCd - dt);
        p.fireTimer = Math.max(0, p.fireTimer - dt);

        const mv = NN.Input.getMoveVector();
        p.vx = mv.x * p.speed;
        p.vy = mv.y * p.speed;

        // Aim
        const aim = NN.Input.getAimPoint(p.x, p.y);
        if (aim) {
            p.aimX = aim.x; p.aimY = aim.y;
            p.angle = U.angle(p.x, p.y, aim.x, aim.y);
        }

        // Dash
        if (NN.Input.justPressed('Space') && p.dashCd <= 0) {
            const dMv = NN.Input.getMoveVector();
            const dx = dMv.mag > 0.1 ? dMv.x : Math.cos(p.angle);
            const dy = dMv.mag > 0.1 ? dMv.y : Math.sin(p.angle);
            p.vx = dx * p.speed * 4;
            p.vy = dy * p.speed * 4;
            p.invuln = 0.2;
            p.dashCd = p.maxDashCd;
            A.sfx.dash();
            R.addShake(4);
            // Dash trail
            for(let i=0; i<5; i++) {
                P.spawn({ x: p.x, y: p.y, vx: -dx*100 + U.rand(-20,20), vy: -dy*100 + U.rand(-20,20), life: 0.3, color: '#00f0ff', size: 5, endSize: 0 });
            }
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Fire
        if (p.fireTimer <= 0) {
            p.fireTimer = p.fireRate;
            A.sfx.shoot();
            const count = p.bulletCount;
            const spreadStep = p.spread / (count > 1 ? count - 1 : 1);
            for (let i = 0; i < count; i++) {
                const ang = p.angle + (count > 1 ? -p.spread/2 + i * spreadStep : 0);
                spawnBullet({
                    x: p.x + Math.cos(ang) * p.r,
                    y: p.y + Math.sin(ang) * p.r,
                    vx: Math.cos(ang) * p.bulletSpeed,
                    vy: Math.sin(ang) * p.bulletSpeed,
                    r: 4, dmg: p.bulletDmg, life: 1.5, color: '#00f0ff', friendly: true, pierce: p.bulletPierce
                });
            }
        }

        // Pulse
        if (NN.Input.justPressed('ShiftLeft') && p.pulseCharge >= p.maxPulseCharge) {
            p.pulseCharge = 0;
            A.sfx.pulse();
            R.addShake(15);
            R.flashScreen('rgba(255,0,170,0.4)', 0.8);
            NN.Game.triggerSlowMo(0.6);
            
            // Destroy enemy bullets in radius
            const pulseRadius = 350;
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                if (!b.friendly && U.dist(b.x, b.y, p.x, p.y) < pulseRadius) {
                    P.burst(b.x, b.y, 5, { color: '#ff00aa', life: 0.5, speed: 100, size: 3 });
                    bullets.splice(i, 1);
                    bulletPool.release(b);
                }
            }
            // Damage & push enemies
            for (let e of enemies) {
                const d = U.dist(e.x, e.y, p.x, p.y);
                if (d < pulseRadius) {
                    e.hp -= 50;
                    const ang = U.angle(p.x, p.y, e.x, e.y);
                    e.vx += Math.cos(ang) * 400;
                    e.vy += Math.sin(ang) * 400;
                }
            }
            // Visual
            P.spawn({ x: p.x, y: p.y, life: 0.6, color: '#ff00aa', type: 'ring', startSize: 10, endSize: pulseRadius, size: 10 });
            P.spawn({ x: p.x, y: p.y, life: 0.4, color: '#ffffff', type: 'ring', startSize: 10, endSize: pulseRadius*0.8, size: 10 });
        }
    }

    function updateEnemy(e, dt) {
        if (!player) return;
        const distToPlayer = U.dist(e.x, e.y, player.x, player.y);
        const ang = U.angle(e.x, e.y, player.x, player.y);

        if (e.isBoss) {
            updateBoss(e, dt, ang, distToPlayer);
        } else {
            switch (e.type) {
                case 'chaser':
                    e.vx = Math.cos(ang) * e.speed;
                    e.vy = Math.sin(ang) * e.speed;
                    break;
                case 'shooter':
                    if (distToPlayer > 300) {
                        e.vx = Math.cos(ang) * e.speed;
                        e.vy = Math.sin(ang) * e.speed;
                    } else {
                        e.vx *= 0.9; e.vy *= 0.9;
                    }
                    e.fireTimer -= dt;
                    if (e.fireTimer <= 0) {
                        e.fireTimer = 2.0;
                        A.sfx.enemyShoot();
                        spawnBullet({ x: e.x, y: e.y, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, r: 5, dmg: e.dmg, life: 4, color: e.color, friendly: false });
                    }
                    break;
                case 'zigzag':
                    const perpAng = ang + Math.PI / 2;
                    const wave = Math.sin(performance.now() * 0.005 + e.angleOffset) * 0.6;
                    e.vx = (Math.cos(ang) + Math.cos(perpAng) * wave) * e.speed;
                    e.vy = (Math.sin(ang) + Math.sin(perpAng) * wave) * e.speed;
                    break;
                case 'tank':
                    e.vx = Math.cos(ang) * e.speed;
                    e.vy = Math.sin(ang) * e.speed;
                    e.fireTimer -= dt;
                    if (e.fireTimer <= 0 && distToPlayer < 600) {
                        e.fireTimer = 3.0;
                        A.sfx.enemyShoot();
                        for(let i=-1; i<=1; i++) {
                            const sAng = ang + i * 0.2;
                            spawnBullet({ x: e.x, y: e.y, vx: Math.cos(sAng)*250, vy: Math.sin(sAng)*250, r: 6, dmg: e.dmg, life: 4, color: e.color, friendly: false });
                        }
                    }
                    break;
            }
        }

        e.x += e.vx * dt;
        e.y += e.vy * dt;

        // Friction for pushed enemies
        e.vx *= Math.pow(0.9, dt * 60);
        e.vy *= Math.pow(0.9, dt * 60);
    }

    function updateBoss(e, dt, ang, dist) {
        e.patternTimer += dt;
        
        // Movement: Orbit player slowly
        const orbitAng = ang + Math.PI / 2;
        e.vx = Math.cos(orbitAng) * e.speed * 0.5;
        e.vy = Math.sin(orbitAng) * e.speed * 0.5;
        if (dist > 400) { e.vx += Math.cos(ang)*e.speed; e.vy += Math.sin(ang)*e.speed; }

        // Update phase based on HP
        if (e.hp < e.maxHp * 0.33) e.phase = 3;
        else if (e.hp < e.maxHp * 0.66) e.phase = 2;
        else e.phase = 1;

        const fireRate = e.phase === 3 ? 0.6 : e.phase === 2 ? 0.8 : 1.2;

        if (e.patternTimer > fireRate) {
            e.patternTimer = 0;
            A.sfx.enemyShoot();
            
            if (e.pattern === 0) {
                // Radial burst
                const count = 12 + (e.phase * 4);
                for (let i = 0; i < count; i++) {
                    const sAng = (i / count) * U.TWO_PI + e.angleOffset;
                    spawnBullet({ x: e.x, y: e.y, vx: Math.cos(sAng)*180, vy: Math.sin(sAng)*180, r: 6, dmg: 15, life: 5, color: '#ff00aa', friendly: false });
                }
                e.angleOffset += 0.2;
            } else if (e.pattern === 1) {
                // Spiral
                for (let i = 0; i < 3; i++) {
                    const sAng = e.angleOffset + i * (U.TWO_PI / 3);
                    spawnBullet({ x: e.x, y: e.y, vx: Math.cos(sAng)*200, vy: Math.sin(sAng)*200, r: 5, dmg: 15, life: 5, color: '#ff8800', friendly: false });
                }
                e.angleOffset += 0.3;
            } else {
                // Aimed shot
                for (let i = -2; i <= 2; i++) {
                    const sAng = ang + i * 0.15;
                    spawnBullet({ x: e.x, y: e.y, vx: Math.cos(sAng)*300, vy: Math.sin(sAng)*300, r: 5, dmg: 15, life: 4, color: '#aa66ff', friendly: false });
                }
            }
        }
    }

    function killEnemy(e) {
        A.sfx.enemyDeath();
        R.addShake(e.isBoss ? 25 : 5);
        P.burst(e.x, e.y, e.isBoss ? 50 : 15, { color: e.color, life: 0.8, speed: 200, size: 4, endSize: 0 });
        
        if (player) {
            player.stats.kills++;
            player.stats.score += e.score;
            player.pulseCharge = Math.min(player.maxPulseCharge, player.pulseCharge + (e.isBoss ? 50 : 5) * player.pulseChargeRate);
        }

        if (e.isBoss) {
            boss = null;
            // Boss drops lots of XP
            for(let i=0; i<10; i++) spawnPickup(e.x, e.y, 'xp', 5);
            NN.Game.bossDefeated();
        } else {
            // Normal drop
            if (U.randChance(0.6)) spawnPickup(e.x, e.y, 'xp', 1);
            if (U.randChance(0.05)) spawnPickup(e.x, e.y, 'hp', 25);
        }
    }

    function checkCollisions() {
        if (!player) return;

        // Player vs Pickups
        for (let i = pickups.length - 1; i >= 0; i--) {
            const p = pickups[i];
            if (U.dist(player.x, player.y, p.x, p.y) < player.r + p.r) {
                A.sfx.pickup();
                if (p.type === 'xp') {
                    player.pulseCharge = Math.min(player.maxPulseCharge, player.pulseCharge + p.value * player.pulseChargeRate);
                } else if (p.type === 'hp') {
                    player.hp = Math.min(player.maxHp, player.hp + p.value);
                }
                P.burst(p.x, p.y, 5, { color: p.color, life: 0.3, speed: 100, size: 3 });
                pickups.splice(i, 1);
                pickupPool.release(p);
            }
        }

        // Player vs Enemies
        if (player.invuln <= 0) {
            for (let e of enemies) {
                if (U.dist(player.x, player.y, e.x, e.y) < player.r + e.r) {
                    player.hp -= e.dmg;
                    player.invuln = 0.8;
                    A.sfx.playerHurt();
                    R.addShake(12);
                    R.flashScreen('rgba(255,50,50,0.4)', 0.5);
                    // Knockback
                    const ang = U.angle(e.x, e.y, player.x, player.y);
                    player.vx += Math.cos(ang) * 300;
                    player.vy += Math.sin(ang) * 300;
                    if (player.hp <= 0) {
                        NN.Game.playerDied();
                        return;
                    }
                    break;
                }
            }
        }

        // Bullets vs Entities
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            let hit = false;

            if (b.friendly) {
                for (let e of enemies) {
                    if (U.dist(b.x, b.y, e.x, e.y) < b.r + e.r) {
                        e.hp -= b.dmg;
                        b.pierce--;
                        P.burst(b.x, b.y, 3, { color: e.color, life: 0.2, speed: 80, size: 2 });
                        A.sfx.hit();
                        if (b.pierce < 0) { hit = true; break; }
                    }
                }
            } else {
                if (player.invuln <= 0 && U.dist(b.x, b.y, player.x, player.y) < b.r + player.r) {
                    player.hp -= b.dmg;
                    player.invuln = 0.5;
                    A.sfx.playerHurt();
                    R.addShake(8);
                    R.flashScreen('rgba(255,50,50,0.3)', 0.4);
                    hit = true;
                    if (player.hp <= 0) {
                        NN.Game.playerDied();
                        return;
                    }
                }
            }
            if (hit) {
                bullets.splice(i, 1);
                bulletPool.release(b);
            }
        }
    }

    // --- Rendering ---
    function render() {
        const ctx = R.ctx;
        
        // Render Pickups
        for (let p of pickups) {
            const pulse = 1 + Math.sin(p.pulse) * 0.2;
            const blink = p.life < 3 && Math.floor(p.life * 10) % 2 === 0 ? 0.3 : 1;
            ctx.globalAlpha = blink;
            R.neonCircle(p.x, p.y, p.r * pulse, p.color, 10);
            ctx.globalAlpha = 1;
        }

        // Render Bullets
        ctx.globalCompositeOperation = 'lighter';
        for (let b of bullets) {
            R.neonCircle(b.x, b.y, b.r, b.color, 12);
        }
        ctx.globalCompositeOperation = 'source-over';

        // Render Enemies
        for (let e of enemies) {
            const flash = e.hp < e.maxHp * 0.3 ? 0.5 + Math.sin(performance.now() * 0.02) * 0.5 : 1;
            ctx.globalAlpha = flash;
            
            if (e.isBoss) {
                // Boss rendering: Large rotating polygon
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(performance.now() * 0.0005);
                const pts = [];
                const sides = 6;
                for(let i=0; i<sides; i++) {
                    const a = (i/sides) * U.TWO_PI;
                    pts.push({ x: Math.cos(a)*e.r, y: Math.sin(a)*e.r });
                }
                R.neonPolygon(pts, e.color, 30, false);
                ctx.restore();
                
                // Inner core
                R.neonCircle(e.x, e.y, e.r * 0.5, e.color, 20);
            } else if (e.type === 'chaser') {
                // Triangle
                const pts = [
                    { x: e.x + Math.cos(U.angle(e.x,e.y,player.x,player.y))*e.r, y: e.y + Math.sin(U.angle(e.x,e.y,player.x,player.y))*e.r },
                    { x: e.x + Math.cos(U.angle(e.x,e.y,player.x,player.y)+2.5)*e.r, y: e.y + Math.sin(U.angle(e.x,e.y,player.x,player.y)+2.5)*e.r },
                    { x: e.x + Math.cos(U.angle(e.x,e.y,player.x,player.y)-2.5)*e.r, y: e.y + Math.sin(U.angle(e.x,e.y,player.x,player.y)-2.5)*e.r }
                ];
                R.neonPolygon(pts, e.color, 15, false);
            } else if (e.type === 'shooter') {
                R.neonCircle(e.x, e.y, e.r, e.color, 15, false);
                R.neonCircle(e.x, e.y, e.r*0.5, e.color, 10);
            } else if (e.type === 'zigzag') {
                const pts = [{x: e.x, y: e.y - e.r}, {x: e.x - e.r, y: e.y + e.r}, {x: e.x + e.r, y: e.y + e.r}];
                R.neonPolygon(pts, e.color, 15, false);
            } else if (e.type === 'tank') {
                R.neonCircle(e.x, e.y, e.r, e.color, 20, false);
                R.neonCircle(e.x, e.y, e.r*0.7, e.color, 15, false);
            }
            ctx.globalAlpha = 1;
        }

        // Render Player
        if (player) {
            const p = player;
            const blink = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0 ? 0.4 : 1;
            ctx.globalAlpha = blink;
            
            // Ship triangle
            const pts = [
                { x: p.x + Math.cos(p.angle)*p.r, y: p.y + Math.sin(p.angle)*p.r },
                { x: p.x + Math.cos(p.angle+2.5)*p.r, y: p.y + Math.sin(p.angle+2.5)*p.r },
                { x: p.x + Math.cos(p.angle-2.5)*p.r, y: p.y + Math.sin(p.angle-2.5)*p.r }
            ];
            R.neonPolygon(pts, '#00f0ff', 20, false);
            R.neonCircle(p.x, p.y, p.r*0.3, '#ffffff', 10);
            
            // Dash trail
            if (p.dashCd > p.maxDashCd - 0.2) {
                P.spawn({ x: p.x, y: p.y, life: 0.2, color: '#00f0ff', size: p.r, endSize: 0 });
            }
            ctx.globalAlpha = 1;
        }
    }

    function reset() {
        enemies.length = 0;
        bullets.length = 0;
        pickups.length = 0;
        boss = null;
        enemyPool.releaseAll();
        bulletPool.releaseAll();
        pickupPool.releaseAll();
        initPlayer();
    }

    return {
        initPlayer, reset, update, render,
        spawnEnemy, spawnBullet, spawnPickup,
        get player() { return player; },
        get enemies() { return enemies; },
        get bullets() { return bullets; },
        get boss() { return boss; }
    };
})();
