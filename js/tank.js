// ========== КЛАСС ТАНКА ==========

class Tank {
    constructor(id, x, y, team) {
        const d = DB[id];
        
        this.id = id;
        this.name = d.n;
        this.team = team;
        this.x = x;
        this.y = y;
        
        this.hp = d.hp;
        this.maxHp = d.hp;
        this.dmg = d.dmg;
        this.s = d.s;
        this.tier = d.tier;
        
        this.isPT = d.isPT || false;
        this.isLong = d.isLong || false;
        this.off = d.off || 0;
        this.cls = d.cls || 'mt';
        this.nc = d.nc || '#666';
        
        this.vr = d.vr || 350;
        this.camo = d.camo || 0.2;
        this.armor = d.armor || 0;
        
        this.angle = 0;
        this.tAngle = 0;
        this.lastShot = 0;
        this.dead = false;
        
        this.magSize = d.mag || 1;
        this.curMag = this.magSize;
        this.isReloading = false;
        this.reloadTime = d.reload || 2500;
        this.baseSpeed = d.moveSpeed || 2.5;
        
        this.isMoving = false;
        this.justFired = false;
        this.fireTimer = 0;
        this.trackBroken = false;
        this.visible = true;
        this.engineTick = 0;
        this.premium = d.premium || false;
        this.shotDelay = this.magSize >= 20 ? 80 : 200;
        
        // AI состояние
        this.stuckTimer = 0;
        this.lastPos = { x, y };
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
    }
    
    draw(ctx) {
        const { cam } = GameState;
        
        if (this.team === 'enemy' && !this.dead) {
            this.visible = teamSees(this, 'player');
            if (!this.visible) return;
        }
        
        ctx.save();
        ctx.translate(this.x - cam.x, this.y - cam.y);
        
        // HP бар
        if (!this.dead) {
            ctx.fillStyle = "#441111";
            ctx.fillRect(-30, -45, 60, 6);
            ctx.fillStyle = this.team === 'enemy' ? "#e74c3c" : "#2ecc71";
            ctx.fillRect(-30, -45, 60 * (this.hp / this.maxHp), 6);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.strokeRect(-30, -45, 60, 6);
            
            // Имя
            ctx.fillStyle = this.premium ? "#f1c40f" : "#fff";
            ctx.font = "bold 9px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`${this.premium ? '★ ' : ''}${this.name} [${CONFIG.TIER_ROMAN[this.tier]}]`, 0, -50);
            
            if (this.trackBroken) {
                ctx.fillStyle = "#ff0";
                ctx.fillText("⚠", 0, -60);
            }
        }
        
        // Корпус
        ctx.save();
        ctx.rotate(this.angle);
        
        let bodyColor = this.dead ? '#333' : 
            (this.team === 'player' ? (this.premium ? '#ff6600' : '#27ae60') : 
            (this.team === 'ally' ? (this.nc || '#2980b9') : '#c0392b'));
        
        ctx.fillStyle = bodyColor;
        let bW = this.isLong ? 80 : 44;
        ctx.fillRect(-bW/2 * this.s, -14 * this.s, bW * this.s, 28 * this.s);
        
        // Гусеницы
        ctx.fillStyle = "#111";
        ctx.fillRect(-bW/2 * this.s - 2, -16 * this.s, (bW + 4) * this.s, 6 * this.s);
        ctx.fillRect(-bW/2 * this.s - 2, 10 * this.s, (bW + 4) * this.s, 6 * this.s);
        ctx.restore();
        
        // Башня
        if (!this.dead) {
            ctx.save();
            ctx.translate(Math.cos(this.angle) * this.off * this.s, Math.sin(this.angle) * this.off * this.s);
            ctx.rotate(this.isPT ? this.angle : this.tAngle);
            
            let turretColor = this.team === 'player' ? (this.premium ? '#ff8800' : '#2ecc71') :
                (this.team === 'ally' ? (this.nc || '#3498db') : '#e74c3c');
            
            ctx.fillStyle = turretColor;
            ctx.fillRect(-10 * this.s, -10 * this.s, 20 * this.s, 20 * this.s);
            
            // Пушка
            ctx.fillStyle = "#111";
            ctx.fillRect(5 * this.s, -3 * this.s, 35 * this.s, 6 * this.s);
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    fire(shellType = 0) {
        if (this.dead || this.isReloading || Date.now() - this.lastShot < this.shotDelay) {
            return false;
        }
        
        const shell = CONFIG.SHELLS[shellType];
        const fireAngle = this.isPT ? this.angle : this.tAngle;
        const tx = this.x + Math.cos(this.angle) * this.off * this.s;
        const ty = this.y + Math.sin(this.angle) * this.off * this.s;
        
        GameState.bullets.push({
            x: tx,
            y: ty,
            a: fireAngle,
            team: this.team,
            dmg: this.dmg * shell.dMul,
            speed: 12 * shell.sMul,
            color: shell.color,
            st: shellType,
            shooter: this
        });
        
        this.lastShot = Date.now();
        this.justFired = true;
        this.fireTimer = Date.now() + 3000;
        this.curMag--;
        
        // Звук
        if (this.magSize >= 20) snd('rapidfire');
        else if (this.dmg >= 400) snd('bigshot');
        else snd('shot');
        
        // Частицы
        spawnParticles(
            tx + Math.cos(fireAngle) * 35 * this.s,
            ty + Math.sin(fireAngle) * 35 * this.s,
            '#ff8800',
            this.magSize >= 20 ? 2 : 5,
            3,
            10
        );
        
        // Тряска камеры
        if (this === GameState.player && this.dmg >= 300) {
            GameState.shakeTimer = 10;
            GameState.shakeIntensity = Math.min(this.dmg / 100, 8);
        }
        
        // Перезарядка
        if (this.curMag <= 0) {
            this.isReloading = true;
            const reloadMul = (this === GameState.player && GameState.adrenalineActive) ? 0.5 : 1;
            setTimeout(() => {
                this.curMag = this.magSize;
                this.isReloading = false;
            }, this.reloadTime * reloadMul);
        }
        
        return true;
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function canSee(observer, target) {
    if (observer === target || target.dead) return true;
    
    const dist = Math.hypot(observer.x - target.x, observer.y - target.y);
    const viewRange = observer.vr || 350;
    const camo = target.camo || 0.2;
    let effectiveRange = viewRange * (1 - camo * 0.7);
    
    if (target.isMoving) effectiveRange *= 1.3;
    if (target.justFired) effectiveRange *= 1.5;
    
    return dist <= effectiveRange;
}

function teamSees(target, team) {
    for (let u of GameState.units) {
        if (u.dead) continue;
        const sameTeam = (team === 'enemy') ? (u.team === 'enemy') : (u.team !== 'enemy');
        if (sameTeam && canSee(u, target)) return true;
    }
    return false;
}

function checkRicochet(shooter, target, shellType) {
    if (!CONFIG.SHELLS[shellType].rico) return false;
    
    const armor = target.armor || 0;
    if (armor <= 0) return false;
    
    const hitAngle = Math.atan2(target.y - shooter.y, target.x - shooter.x);
    let angleDiff = Math.abs(hitAngle - target.angle);
    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
    
    const chance = Math.abs(Math.cos(angleDiff)) * (armor / 400) * (shellType === 2 ? 0.5 : 1);
    return Math.random() < chance;
}

function tankCollides(x, y, angle, size) {
    const points = [
        { dx: 0, dy: 0 },
        { dx: size, dy: 0 },
        { dx: -size * 0.8, dy: 0 },
        { dx: size * 0.6, dy: size * 0.5 },
        { dx: size * 0.6, dy: -size * 0.5 },
        { dx: -size * 0.6, dy: size * 0.5 },
        { dx: -size * 0.6, dy: -size * 0.5 }
    ];
    
    for (let p of points) {
        const rx = x + p.dx * Math.cos(angle) - p.dy * Math.sin(angle);
        const ry = y + p.dx * Math.sin(angle) + p.dy * Math.cos(angle);
        
        for (let w of GameState.walls) {
            if (w.type === 'bush' || w.type === 'dune') continue;
            if (rx > w.x - 5 && rx < w.x + w.w + 5 && ry > w.y - 5 && ry < w.y + w.h + 5) {
                return true;
            }
        }
    }
    return false;
}