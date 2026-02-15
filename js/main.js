// ========== ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ ==========

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mCtx = document.getElementById('minimap').getContext('2d');

function update() {
    if (!GameState.gameActive || !GameState.player) return;
    
    if (GameState.player.dead) {
        endBattle(false);
        return;
    }
    
    // Проверка адреналина
    if (GameState.adrenalineActive && Date.now() > GameState.adrenalineTimer) {
        GameState.adrenalineActive = false;
        crewMsg("Адреналин кончился", "#aaa");
    }
    
    const player = GameState.player;
    const spd = player.trackBroken ? player.baseSpeed * 0.3 : player.baseSpeed;
    const sz = 25 * player.s;
    
    player.isMoving = false;
    
    // Управление игроком
    if (GameState.controlMode === 'pc') {
        let nx = player.x, ny = player.y;
        
        if (GameState.keys['KeyW']) {
            nx += Math.cos(player.angle) * spd;
            ny += Math.sin(player.angle) * spd;
            player.isMoving = true;
        }
        if (GameState.keys['KeyS']) {
            nx -= Math.cos(player.angle) * spd * 0.6;
            ny -= Math.sin(player.angle) * spd * 0.6;
            player.isMoving = true;
        }
        if (GameState.keys['KeyA']) player.angle -= 0.04;
        if (GameState.keys['KeyD']) player.angle += 0.04;
        
        if (!tankCollides(nx, ny, player.angle, sz)) {
            player.x = nx;
            player.y = ny;
        } else {
            player.isMoving = false;
        }
        
        if (!player.isPT) {
            player.tAngle = Math.atan2(GameState.mouse.y - canvas.height / 2, GameState.mouse.x - canvas.width / 2);
        }
        
        if (GameState.mouseDown) player.fire(GameState.curShell);
        
    } else {
        // Мобильное управление - танк едет в направлении джойстика
        if (GameState.joystickData.mag > 0.15) {
            const targetAngle = GameState.joystickData.angle;
            let angleDiff = targetAngle - player.angle;
            
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            player.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.08);
            
            const nx = player.x + Math.cos(player.angle) * spd * GameState.joystickData.mag;
            const ny = player.y + Math.sin(player.angle) * spd * GameState.joystickData.mag;
            
            if (!tankCollides(nx, ny, player.angle, sz)) {
                player.x = nx;
                player.y = ny;
                player.isMoving = true;
            }
            
            player.tAngle = player.angle;
        }
        
        if (GameState.mobileFireActive) player.fire(GameState.curShell);
    }
    
    if (player.isPT) player.tAngle = player.angle;
    if (player.justFired && Date.now() > player.fireTimer) player.justFired = false;
    
    // Эффекты движения игрока
    if (player.isMoving) {
        player.engineTick++;
        if (player.engineTick % 5 === 0) {
            smoke(player.x - Math.cos(player.angle) * 22 * player.s, player.y - Math.sin(player.angle) * 22 * player.s);
            snd('eng');
        }
        if (player.engineTick % 3 === 0) {
            GameState.tracks.push({ x: player.x, y: player.y, a: player.angle, life: 200, s: player.s });
        }
    }
    
    // Камера следует за игроком
    GameState.cam.x = player.x - canvas.width / 2;
    GameState.cam.y = player.y - canvas.height / 2;
    
    // Тряска камеры
    if (GameState.shakeTimer > 0) {
        GameState.shakeTimer--;
        GameState.cam.x += (Math.random() - 0.5) * GameState.shakeIntensity;
        GameState.cam.y += (Math.random() - 0.5) * GameState.shakeIntensity;
    }
    
    // Обновление AI танков
    updateAI();
    
    // Обновление пуль
    updateBullets();
    
    // Обновление частиц
    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const p = GameState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) GameState.particles.splice(i, 1);
    }
    
    // Обновление следов гусениц
    for (let i = GameState.tracks.length - 1; i >= 0; i--) {
        GameState.tracks[i].life--;
        if (GameState.tracks[i].life <= 0) GameState.tracks.splice(i, 1);
    }
    
    // Обновление HUD
    updateHUD();
    
    // Проверка победы/поражения
    const enemiesAlive = GameState.units.filter(u => u.team === 'enemy' && !u.dead).length;
    const alliesAlive = GameState.units.filter(u => u.team !== 'enemy' && !u.dead).length;
    
    if (enemiesAlive === 0 && GameState.units.length > 1) endBattle(true);
    if (alliesAlive === 0 && GameState.units.length > 1) endBattle(false);
}

// ========== AI ТАНКОВ ==========

function updateAI() {
    GameState.units.forEach(u => {
        if (u.dead || u === GameState.player) return;
        if (u.justFired && Date.now() > u.fireTimer) u.justFired = false;
        
        const spd = u.trackBroken ? u.baseSpeed * 0.3 : u.baseSpeed;
        const sz = 25 * u.s;
        
        // Проверка застревания
        const distMoved = Math.hypot(u.x - u.lastPos.x, u.y - u.lastPos.y);
        if (distMoved < 0.5) u.stuckTimer++;
        else u.stuckTimer = 0;
        u.lastPos = { x: u.x, y: u.y };
        
        // Поиск целей
        let targets = GameState.units.filter(t => !t.dead && (u.team === 'enemy' ? t.team !== 'enemy' : t.team === 'enemy'));
        
        // Фильтруем только видимые цели (своя команда видит)
        targets = targets.filter(t => {
            if (canSee(u, t)) return true;
            // Проверяем, видит ли кто-то из союзников
            return GameState.units.some(ally => {
                if (ally.dead || ally === u) return false;
                const sameTeam = (u.team === 'enemy') === (ally.team === 'enemy');
                return sameTeam && canSee(ally, t);
            });
        });
        
        // Сортируем по расстоянию
        const target = targets.sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0];
        
        u.isMoving = false;
        
        if (target) {
            const dist = Math.hypot(target.x - u.x, target.y - u.y);
            const targetAngle = Math.atan2(target.y - u.y, target.x - u.x);
            
            // Поворот к цели
            let angleDiff = targetAngle - u.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            u.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.06);
            u.tAngle = u.angle;
            
            // Движение к цели если далеко
            if (dist > 300) {
                // Если застряли - пробуем обход
                if (u.stuckTimer > 30) {
                    u.wanderAngle = u.angle + (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random());
                    u.stuckTimer = 0;
                    u.wanderTimer = 60;
                }
                
                const moveAngle = u.wanderTimer > 0 ? u.wanderAngle : u.angle;
                if (u.wanderTimer > 0) u.wanderTimer--;
                
                let nx = u.x + Math.cos(moveAngle) * spd;
                let ny = u.y + Math.sin(moveAngle) * spd;
                
                if (!tankCollides(nx, ny, u.angle, sz)) {
                    u.x = nx;
                    u.y = ny;
                    u.isMoving = true;
                } else {
                    // Пробуем обойти препятствие
                    for (let off of [0.4, -0.4, 0.8, -0.8, 1.2, -1.2]) {
                        nx = u.x + Math.cos(moveAngle + off) * spd;
                        ny = u.y + Math.sin(moveAngle + off) * spd;
                        if (!tankCollides(nx, ny, u.angle, sz)) {
                            u.x = nx;
                            u.y = ny;
                            u.isMoving = true;
                            break;
                        }
                    }
                }
            }
            
            // Стрельба если нацелились
            if (dist < 600 && Math.abs(angleDiff) < 0.3) {
                u.fire(u.dmg >= 400 ? 1 : 0);
            }
        } else {
            // Нет цели - движемся к центру карты
            const centerAngle = Math.atan2(-u.y, -u.x);
            let angleDiff = centerAngle - u.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            u.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.04);
            u.tAngle = u.angle;
            
            const nx = u.x + Math.cos(u.angle) * spd * 0.7;
            const ny = u.y + Math.sin(u.angle) * spd * 0.7;
            
            if (!tankCollides(nx, ny, u.angle, sz)) {
                u.x = nx;
                u.y = ny;
                u.isMoving = true;
            } else {
                u.angle += 0.15;
            }
        }
        
        // Следы от гусениц
        u.engineTick = (u.engineTick || 0) + 1;
        if (u.isMoving && u.engineTick % 8 === 0) {
            GameState.tracks.push({ x: u.x, y: u.y, a: u.angle, life: 150, s: u.s });
        }
    });
}

// ========== ОБНОВЛЕНИЕ ПУЛЬ ==========

function updateBullets() {
    for (let i = GameState.bullets.length - 1; i >= 0; i--) {
        const b = GameState.bullets[i];
        b.x += Math.cos(b.a) * b.speed;
        b.y += Math.sin(b.a) * b.speed;
        
        let hit = false;
        
        // Проверка столкновения со стенами
        for (let w of GameState.walls) {
            if (w.type === 'bush' || w.type === 'dune') continue;
            if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
                hit = true;
                sparks(b.x, b.y);
                snd('hit');
                break;
            }
        }
        
        // Проверка попадания в танки
        if (!hit) {
            for (let u of GameState.units) {
                const friendly = (b.team === u.team) || 
                    (b.team === 'player' && u.team === 'ally') || 
                    (b.team === 'ally' && u.team === 'player');
                
                if (!u.dead && !friendly && Math.hypot(u.x - b.x, u.y - b.y) < 30 * u.s) {
                    // Проверка рикошета
                    if (checkRicochet(b.shooter, u, b.st)) {
                        hit = true;
                        sparks(b.x, b.y);
                        snd('rico');
                        if (b.team === 'player') {
                            crewMsg("Рикошет!", "#ff8800");
                        }
                        break;
                    }
                    
                    // Нанесение урона
                    u.hp -= b.dmg;
                    hit = true;
                    sparks(b.x, b.y);
                    snd('hit');
                    
                    // Шанс сбить гусеницу
                    if (!u.trackBroken && Math.random() < 0.1) {
                        u.trackBroken = true;
                        if (u === GameState.player) {
                            crewMsg("Гусеница!", "#e74c3c");
                        }
                    }
                    
                    // Сообщения для игрока
                    if (b.team === 'player') {
                        GameState.battleDmg += b.dmg;
                        dmgLog(`-${Math.floor(b.dmg)}`, '#ff4444');
                        crewMsg(CONFIG.CREW_MESSAGES.HIT[Math.floor(Math.random() * CONFIG.CREW_MESSAGES.HIT.length)], '#2ecc71');
                    }
                    
                    // Получение урона игроком
                    if (u === GameState.player) {
                        dmgLog(`-${Math.floor(b.dmg)}`, '#ff0000');
                        GameState.shakeTimer = 5;
                        GameState.shakeIntensity = 3;
                    }
                    
                    // Уничтожение танка
                    if (u.hp <= 0) {
                        u.dead = true;
                        boom(u.x, u.y);
                        snd('boom');
                        
                        if (b.team === 'player') {
                            GameState.XP += u.tier * 500;
                            GameState.battleKills++;
                            crewMsg(CONFIG.CREW_MESSAGES.KILL[Math.floor(Math.random() * CONFIG.CREW_MESSAGES.KILL.length)], '#f1c40f');
                        }
                    }
                    
                    updateScoreboard();
                    break;
                }
            }
        }
        
        // Удаление пули если попала или улетела далеко
        if (hit || Math.abs(b.x - GameState.player.x) > 3000 || Math.abs(b.y - GameState.player.y) > 3000) {
            GameState.bullets.splice(i, 1);
        }
    }
}

// ========== ОБНОВЛЕНИЕ HUD ==========

function updateHUD() {
    const player = GameState.player;
    const ammoText = document.getElementById('ammo-val');
    
    if (player.isReloading) {
        ammoText.innerText = "ПЕРЕЗАРЯДКА...";
        ammoText.style.color = "#ff4444";
    } else {
        const shell = CONFIG.SHELLS[GameState.curShell];
        if (player.magSize > 1) {
            ammoText.innerText = `${shell.name}|${player.curMag}/${player.magSize}`;
        } else {
            ammoText.innerText = `${shell.name}|ГОТОВ`;
        }
        ammoText.style.color = shell.color;
    }
    
    // HP бар
    document.getElementById('hp-bar').style.width = Math.max(0, player.hp / player.maxHp * 100) + "%";
    
    // Миникарта
    const mm = document.getElementById('minimap');
    const mmW = mm.width, mmH = mm.height;
    
    mCtx.fillStyle = "rgba(0,0,0,.8)";
    mCtx.fillRect(0, 0, mmW, mmH);
    
    // Отображение танков на миникарте
    GameState.units.forEach(u => {
        if (u.team === 'enemy' && !u.visible && !u.dead) return;
        
        if (u.dead) {
            mCtx.fillStyle = "#444";
        } else if (u.team === 'enemy') {
            mCtx.fillStyle = "red";
        } else if (u.team === 'player') {
            mCtx.fillStyle = "#2ecc71";
        } else {
            mCtx.fillStyle = "#3498db";
        }
        
        const mx = mmW / 2 + (u.x - player.x) / 40;
        const my = mmH / 2 + (u.y - player.y) / 40;
        
        if (mx > 2 && mx < mmW - 2 && my > 2 && my < mmH - 2) {
            mCtx.fillRect(mx - 2, my - 2, 4, 4);
        }
    });
    
    // Позиция игрока (центр)
    mCtx.fillStyle = "#fff";
    mCtx.fillRect(mmW / 2 - 2, mmH / 2 - 2, 4, 4);
}

// ========== ОТРИСОВКА ==========

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    if (!GameState.gameActive || !GameState.player) return;
    
    const { cam, curMap, player } = GameState;
    
    // Цвет фона в зависимости от карты
    const bgColor = curMap === 'desert' ? '#3d3520' : (curMap === 'field' ? '#1e2e1e' : '#1a1a1a');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Сетка
    const gridColor = curMap === 'desert' ? '#4a4030' : (curMap === 'field' ? '#2a3a2a' : '#252525');
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    const gx = Math.floor(cam.x / 200) * 200;
    const gy = Math.floor(cam.y / 200) * 200;
    
    for (let x = gx; x < cam.x + canvas.width; x += 200) {
        ctx.beginPath();
        ctx.moveTo(x - cam.x, 0);
        ctx.lineTo(x - cam.x, canvas.height);
        ctx.stroke();
    }
    for (let y = gy; y < cam.y + canvas.height; y += 200) {
        ctx.beginPath();
        ctx.moveTo(0, y - cam.y);
        ctx.lineTo(canvas.width, y - cam.y);
        ctx.stroke();
    }
    
    // Следы гусениц
    GameState.tracks.forEach(t => {
        const alpha = t.life / 200;
        ctx.save();
        ctx.translate(t.x - cam.x, t.y - cam.y);
        ctx.rotate(t.a);
        ctx.fillStyle = `rgba(60,50,30,${alpha * 0.4})`;
        ctx.fillRect(-18 * t.s, -14 * t.s, 4, 28 * t.s);
        ctx.fillRect(14 * t.s, -14 * t.s, 4, 28 * t.s);
        ctx.restore();
    });
    
    // Стены и объекты
    GameState.walls.forEach(w => {
        if (w.type === 'bush') {
            ctx.fillStyle = '#3a7a2a';
            ctx.beginPath();
            ctx.arc(w.x - cam.x + w.w / 2, w.y - cam.y + w.h / 2, w.w / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        
        ctx.fillStyle = w.color || '#333';
        ctx.fillRect(w.x - cam.x, w.y - cam.y, w.w, w.h);
        
        if (w.type !== 'dune') {
            ctx.strokeStyle = "#222";
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x - cam.x, w.y - cam.y, w.w, w.h);
        }
    });
    
    // Танки
    GameState.units.forEach(u => u.draw(ctx));
    
    // Пули
    GameState.bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x - cam.x, b.y - cam.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Трейсер
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x - cam.x, b.y - cam.y);
        ctx.lineTo(b.x - cam.x - Math.cos(b.a) * 20, b.y - cam.y - Math.sin(b.a) * 20);
        ctx.stroke();
        ctx.globalAlpha = 1;
    });
    
    // Частицы
    GameState.particles.forEach(p => {
        const alpha = p.life / p.ml;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - cam.x, p.y - cam.y, p.sz * alpha, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // Радиус обзора игрока
    if (!player.dead) {
        ctx.strokeStyle = 'rgba(100,200,100,.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.arc(player.x - cam.x, player.y - cam.y, player.vr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Прицел для мобильного управления
    if (GameState.controlMode === 'mobile') {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(player.tAngle);
        
        // Линия прицела
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, 0);
        ctx.lineTo(120, 0);
        ctx.stroke();
        
        // Кружок прицела
        ctx.beginPath();
        ctx.arc(120, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Индикатор направления джойстика
        if (GameState.joystickData.mag > 0.15) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(GameState.joystickData.angle);
            
            ctx.strokeStyle = 'rgba(46,204,113,0.5)';
            ctx.lineWidth = 3;
            
            // Линия направления
            ctx.beginPath();
            ctx.moveTo(30, 0);
            ctx.lineTo(30 + GameState.joystickData.mag * 40, 0);
            ctx.stroke();
            
            // Стрелка
            const arrowX = 30 + GameState.joystickData.mag * 40;
            ctx.beginPath();
            ctx.moveTo(arrowX - 8, -6);
            ctx.lineTo(arrowX, 0);
            ctx.lineTo(arrowX - 8, 6);
            ctx.stroke();
            
            ctx.restore();
        }
    }
}

// ========== ГЛАВНЫЙ ЦИКЛ ==========

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

function init() {
    // Масштабирование UI
    updateScale();
    
    // Настройка управления
    setupPCControls();
    setupMobileControls();
    
    // Заполнение селекторов
    fillTrainNatSelect();
    fillEnemySelect();
    
    // Рендер дерева танков
    renderTree();
    
    // Обновление ресурсов
    updateResources();
    
    // Запуск игрового цикла
    gameLoop();
    
    console.log('🎮 CITY TANKS инициализирован!');
    console.log(`📦 Загружено танков: ${Object.keys(DB).length}`);
}

// Запуск при загрузке страницы
init();