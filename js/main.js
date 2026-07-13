// js/main.js
// ========== ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ ==========

var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var mCtx = document.getElementById('minimap').getContext('2d');

// Переменные для расчета производительности (FPS и Пинг)
let lastLoopRun = Date.now();
let fpsInterval = 1000;
let fpsCount = 0;
let currentFPS = 60;
let lastPingTime = 0;
let currentPing = 0;

function drawPerformanceIndicators(ctx) {
  let now = Date.now();
  fpsCount++;
  if (now - lastLoopRun >= fpsInterval) {
    currentFPS = fpsCount;
    fpsCount = 0;
    lastLoopRun = now;
    
    if (window.supabaseClient) {
      let t0 = Date.now();
      window.supabaseClient.from('users').select('id').limit(1).then(() => {
        currentPing = Date.now() - t0;
      });
    }
  }

  ctx.save();
  ctx.font = "bold 11px Arial";
  ctx.fillStyle = "#2ecc71";
  ctx.fillText(`FPS: ${currentFPS}`, canvas.width - 80, 20);
  ctx.fillStyle = currentPing < 100 ? "#2ecc71" : currentPing < 250 ? "#f1c40f" : "#e74c3c";
  ctx.fillText(`PING: ${currentPing} ms`, canvas.width - 80, 35);
  ctx.restore();
}

function update() {
  if (!GameState.gameActive || !GameState.player) return;
  if (GameState.player.dead) { endBattle(false); return; }
  if (GameState.adrenalineActive && Date.now() > GameState.adrenalineTimer) { GameState.adrenalineActive = false; crewMsg("Адреналин кончился", "#aaa"); }
  if (GameState.fuelBoostActive && Date.now() > GameState.fuelBoostTimer) { GameState.fuelBoostActive = false; crewMsg("Топливо кончилось", "#aaa"); }

  var p = GameState.player;

  // Рассчитываем грунт под гусеницами (Замедление в кустах / Лёд на дюнах)
  let terrainSpeedMultiplier = 1.0;
  let isOnIce = false;
  
  for (let w of GameState.walls) {
      if (w.type === 'bush' && Math.hypot(p.x - w.x, p.y - w.y) < w.w) {
          terrainSpeedMultiplier = 0.65;
      }
      if (w.type === 'dune' && Math.hypot(p.x - w.x, p.y - w.y) < w.w) {
          isOnIce = true;
      }
  }

  var baseSpd = p.trackBroken ? p.baseSpeed * 0.3 : p.baseSpeed;
  var spd = GameState.fuelBoostActive ? baseSpd * 1.15 : baseSpd;
  spd = spd * terrainSpeedMultiplier;
  
  var sz = 25 * p.s;
  p.isMoving = false;
  p.driftFactor = isOnIce ? 0.95 : 1.0;

  if (GameState.controlMode === 'pc') {
    var nx = p.x, ny = p.y;
    if (GameState.keys['KeyW']) { nx += Math.cos(p.angle) * spd; ny += Math.sin(p.angle) * spd; p.isMoving = true; }
    if (GameState.keys['KeyS']) { nx -= Math.cos(p.angle) * spd * 0.6; ny -= Math.sin(p.angle) * spd * 0.6; p.isMoving = true; }
    if (GameState.keys['KeyA']) p.angle -= 0.04;
    if (GameState.keys['KeyD']) p.angle += 0.04;
    if (!tankCollides(nx, ny, p.angle, sz)) { p.x = nx; p.y = ny; } else p.isMoving = false;
    if (!p.isPT) p.tAngle = Math.atan2(GameState.mouse.y - canvas.height / 2, GameState.mouse.x - canvas.width / 2);
    if (GameState.mouseDown) p.fire(GameState.curShell); else if (p.flame) p.flameActive = false;
  } else {
    if (GameState.joystickData.mag > 0.15) {
      var ta = GameState.joystickData.angle; var ad = ta - p.angle;
      while (ad > Math.PI) ad -= Math.PI * 2; while (ad < -Math.PI) ad += Math.PI * 2;
      p.angle += Math.sign(ad) * Math.min(Math.abs(ad), 0.08);
      var nx2 = p.x + Math.cos(p.angle) * spd * GameState.joystickData.mag;
      var ny2 = p.y + Math.sin(p.angle) * spd * GameState.joystickData.mag;
      if (!tankCollides(nx2, ny2, p.angle, sz)) { p.x = nx2; p.y = ny2; p.isMoving = true; }
      p.tAngle = p.angle;
    }
    if (GameState.mobileFireActive) p.fire(GameState.curShell); else if (p.flame) p.flameActive = false;
  }

  if (p.isPT) p.tAngle = p.angle;
  if (p.justFired && Date.now() > p.fireTimer) p.justFired = false;
  if (p.flame && p.flameActive && Date.now() - p.lastShot > 200) p.flameActive = false;

  // Разрушение стен тараном на технике >= VI уровня
  for (let i = GameState.walls.length - 1; i >= 0; i--) {
      let w = GameState.walls[i];
      if (w.type === 'building' && Math.hypot(p.x - w.x, p.y - w.y) < 55) {
          if (p.tier >= 6) { 
              GameState.walls.splice(i, 1);
              boom(w.x + w.w / 2, w.y + w.h / 2);
              snd('boom');
              dmgLog("🛡️ Стена разрушена тараном!", "#f1c40f");
          }
      }
  }

  if (p.isMoving) {
    p.engineTick++;
    if (p.engineTick % 5 === 0) { smoke(p.x - Math.cos(p.angle) * 22 * p.s, p.y - Math.sin(p.angle) * 22 * p.s); snd('eng'); }
    if (p.engineTick % 3 === 0) GameState.tracks.push({ x: p.x, y: p.y, a: p.angle, life: 200, s: p.s });
  }

  GameState.cam.x = p.x - canvas.width / 2;
  GameState.cam.y = p.y - canvas.height / 2;
  if (GameState.shakeTimer > 0) {
    GameState.shakeTimer--;
    GameState.cam.x += (Math.random() - 0.5) * GameState.shakeIntensity;
    GameState.cam.y += (Math.random() - 0.5) * GameState.shakeIntensity;
  }

  updateAI();
  updateBullets();

  // Логика горения игрока
  if (p && !p.dead && p.onFire) {
    if (!p.fireDmgTimer || Date.now() - p.fireDmgTimer > 1000) {
      var fireDmg = Math.floor(p.maxHp * 0.02);
      p.hp -= fireDmg;
      p.fireDmgTimer = Date.now();
      dmgLog('🔥-' + fireDmg, '#ff4500');
      spawnParticles(p.x, p.y, '#ff4500', 3, 2, 10);
      if (p.hp <= 0) { p.dead = true; boom(p.x, p.y); snd('boom'); }
    }
  }

  // Логика горения ботов
  for (var gi = 0; gi < GameState.units.length; gi++) {
    var gu = GameState.units[gi];
    if (gu.dead || gu === p || !gu.onFire) continue;
    if (!gu.fireDmgTimer || Date.now() - gu.fireDmgTimer > 1000) {
      var fd = Math.floor(gu.maxHp * 0.02);
      gu.hp -= fd; gu.fireDmgTimer = Date.now();
      spawnParticles(gu.x, gu.y, '#ff4500', 2, 2, 8);
      if (gu.hp <= 0) { gu.dead = true; boom(gu.x, gu.y); snd('boom'); updateScoreboard(); }
    }
  }

  for (var pi2 = GameState.particles.length - 1; pi2 >= 0; pi2--) {
    var pp = GameState.particles[pi2]; pp.x += pp.vx; pp.y += pp.vy; pp.life--;
    if (pp.life <= 0) GameState.particles.splice(pi2, 1);
  }
  for (var ti = GameState.tracks.length - 1; ti >= 0; ti--) {
    GameState.tracks[ti].life--;
    if (GameState.tracks[ti].life <= 0) GameState.tracks.splice(ti, 1);
  }

  updateHUD();

  var ea = 0, aa = 0;
  for (var ci = 0; ci < GameState.units.length; ci++) {
    if (GameState.units[ci].team === 'enemy' && !GameState.units[ci].dead) ea++;
    if (GameState.units[ci].team !== 'enemy' && !GameState.units[ci].dead) aa++;
  }
  if (ea === 0 && GameState.units.length > 1) endBattle(true);
  if (aa === 0 && GameState.units.length > 1) endBattle(false);
}

// ... [ЗДЕСЬ ОСТАЮТСЯ ВАШИ СТАНДАРТНЫЕ ФУНКЦИИ ИЗ СТАРОГО main.js: updateAI, updateBullets, updateHUD] ...

function draw() {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  if (!GameState.gameActive || !GameState.player) return;
  var cam = GameState.cam; var curMap = GameState.curMap; var p = GameState.player;

  ctx.fillStyle = curMap === 'desert' ? '#3d3520' : curMap === 'field' ? '#1e2e1e' : '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = curMap === 'desert' ? '#4a4030' : curMap === 'field' ? '#2a3a2a' : '#252525'; ctx.lineWidth = 1;
  var gx = Math.floor(cam.x / 200) * 200, gy = Math.floor(cam.y / 200) * 200;
  for (var x = gx; x < cam.x + canvas.width; x += 200) { ctx.beginPath(); ctx.moveTo(x - cam.x, 0); ctx.lineTo(x - cam.x, canvas.height); ctx.stroke(); }
  for (var y = gy; y < cam.y + canvas.height; y += 200) { ctx.beginPath(); ctx.moveTo(0, y - cam.y); ctx.lineTo(canvas.width, y - cam.y); ctx.stroke(); }

  for (var tri = 0; tri < GameState.tracks.length; tri++) {
    var tr = GameState.tracks[tri]; var al = tr.life / 200;
    ctx.save(); ctx.translate(tr.x - cam.x, tr.y - cam.y); ctx.rotate(tr.a);
    ctx.fillStyle = 'rgba(60,50,30,' + al * 0.4 + ')';
    ctx.fillRect(-18 * tr.s, -14 * tr.s, 4, 28 * tr.s); ctx.fillRect(14 * tr.s, -14 * tr.s, 4, 28 * tr.s);
    ctx.restore();
  }

  for (var wli = 0; wli < GameState.walls.length; wli++) {
    var wl = GameState.walls[wli];
    if (wl.type === 'bush') { ctx.fillStyle = '#3a7a2a'; ctx.beginPath(); ctx.arc(wl.x - cam.x + wl.w / 2, wl.y - cam.y + wl.h / 2, wl.w / 2, 0, Math.PI * 2); ctx.fill(); continue; }
    ctx.fillStyle = wl.color || '#333'; ctx.fillRect(wl.x - cam.x, wl.y - cam.y, wl.w, wl.h);
    if (wl.type !== 'dune') { ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.strokeRect(wl.x - cam.x, wl.y - cam.y, wl.w, wl.h); }
  }

  for (var dui = 0; dui < GameState.units.length; dui++) { GameState.units[dui].draw(ctx); }

  for (var bli = 0; bli < GameState.bullets.length; bli++) {
    var bl = GameState.bullets[bli];
    ctx.fillStyle = bl.color; ctx.beginPath(); ctx.arc(bl.x - cam.x, bl.y - cam.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.3; ctx.strokeStyle = bl.color; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(bl.x - cam.x, bl.y - cam.y); ctx.lineTo(bl.x - cam.x - Math.cos(bl.a) * 20, bl.y - cam.y - Math.sin(bl.a) * 20); ctx.stroke(); ctx.globalAlpha = 1;
  }

  for (var ppi = 0; ppi < GameState.particles.length; ppi++) {
    var pp2 = GameState.particles[ppi]; var alp = pp2.life / pp2.ml;
    ctx.globalAlpha = alp; ctx.fillStyle = pp2.color; ctx.beginPath();
    ctx.arc(pp2.x - cam.x, pp2.y - cam.y, pp2.sz * alp, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (!p.dead) {
    ctx.strokeStyle = 'rgba(100,200,100,.12)'; ctx.lineWidth = 1; ctx.setLineDash([5,10]);
    ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.vr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  if (!p.dead && p.flame) {
    ctx.save(); ctx.translate(p.x - cam.x, p.y - cam.y); ctx.rotate(p.isPT ? p.angle : p.tAngle);
    ctx.strokeStyle = 'rgba(255,69,0,0.15)'; ctx.fillStyle = 'rgba(255,69,0,0.05)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, p.flameRange, -p.flameCone, p.flameCone); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  if (GameState.controlMode === 'mobile') {
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(p.tAngle);
    ctx.strokeStyle = p.flame ? '#ff4500' : '#e74c3c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(50, 0); ctx.lineTo(120, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(120, 0, 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (GameState.joystickData.mag > 0.15) {
      ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(GameState.joystickData.angle);
      ctx.strokeStyle = 'rgba(46,204,113,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(30 + GameState.joystickData.mag * 40, 0); ctx.stroke();
      var ax = 30 + GameState.joystickData.mag * 40;
      ctx.beginPath(); ctx.moveTo(ax - 8, -6); ctx.lineTo(ax, 0); ctx.lineTo(ax - 8, 6); ctx.stroke(); ctx.restore();
    }
  }

  // Отрисовка FPS и пинга поверх всей сцены
  drawPerformanceIndicators(ctx);
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

function init() {
  updateScale();
  setupPCControls();
  setupMobileControls();
  fillTrainNatSelect();
  fillEnemySelect();
  renderTree();
  renderCarousel();
  updateResources();
  
  if (typeof window.updateInvCount === 'function') {
    window.updateInvCount();
  }
  
  updateBoosterUI();
  gameLoop();
}

init();