const minimap = document.getElementById('minimap'),
  mCtx = minimap.getContext('2d');
const TICK = 1000 / 60;
let battleFrame = 0,
  lastFrame = 0,
  accumulated = 0,
  ticks = 0;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// A click (or a held round during a multi-tick frame) may precede the next draw.
// Resolve the screen sight against this hull pose before emitting the real projectile.
function firePlayer() {
  const g = GameState,
    p = g.player;
  if (!g.gameActive || !p || p.dead || performance.now() < p.nextShot) return;
  BattleView.syncCamera();
  BattleView.aim();
  p.fire(g.curShell);
}
function updatePlayer() {
  const g = GameState,
    p = g.player,
    joy = g.joystickData,
    pc = g.controlMode === 'pc';
  const key = (code) => (g.keys[code] ? 1 : 0);
  const forward = pc ? key('KeyW') - key('KeyS') : Math.abs(joy.dy) > 0.12 ? -joy.dy : 0;
  const turn = pc ? key('KeyD') - key('KeyA') : Math.abs(joy.dx) > 0.12 ? joy.dx : 0;
  TrackDrive.step(p, forward, turn, pc && (g.keys.Space || (g.keys.KeyW && g.keys.KeyS)));
  if (g.mouseDown || g.mobileFireActive) firePlayer();
  if (p.isMoving && ++p.engineTick % 8 === 0) {
    smoke(p.x - 14 * Math.cos(p.angle), p.y - 14 * Math.sin(p.angle));
    snd('eng');
  }
}
function damageUnit(b, u, part) {
  const { dmg, zone } = resolveHit(b, u, part);
  if (!dmg) {
    BotAI.onBlockedHit(b.shooter, u);
    sparks(b.x, b.y);
    snd('rico');
    if (b.shooter === GameState.player) {
      combatMessage('Не пробито: ' + (part === 'turret' ? 'башня' : 'корпус'), '#eabb70');
    }
    return;
  }
  const dealt = Math.min(u.hp, dmg);
  u.hp = Math.max(0, u.hp - dmg);
  sparksAdvanced(b.x, b.y, b.a);
  snd('hit');
  if (!u.trackBroken && Math.random() < 0.1) {
    u.trackBroken = true;
    if (u === GameState.player) combatMessage('Повреждена гусеница', '#f28b68');
  }
  if (b.shooter === GameState.player) {
    GameState.battleDmg += dealt;
    dmgLog('−' + Math.ceil(dealt) + ' · ' + CONFIG.ARMOR_ZONES[zone].label, '#ffd38a');
  }
  if (u === GameState.player) {
    dmgLog('−' + Math.ceil(dealt), '#ffa78b');
    onPlayerHit(b.a, dealt);
  }
  if (u.hp > 0) return;
  u.dead = true;
  boom(u.x, u.y);
  snd('boom');
  if (b.shooter === GameState.player) {
    GameState.XP += u.tier * 500;
    GameState.battleKills++;
    combatMessage('Цель уничтожена', '#ffe3ae');
  }
  updateScoreboard();
}
function updateBullets() {
  for (let i = GameState.bullets.length - 1; i >= 0; i--) {
    const b = GameState.bullets[i];
    const step = traceBattleRay(b.x, b.y, b.h, b.dx, b.dy, b.dh, b.speed, b.shooter);
    b.x = step.x;
    b.y = step.y;
    b.h = step.h;
    b.traveled += step.distance;
    if (step.hit instanceof Tank) damageUnit(b, step.hit, step.part);
    else if (step.hit) {
      spawnParticles(b.x, b.y, '#e2bc7b', 8, 2, 11, b.h);
      if (step.hit.type === 'building') damageWall(step.hit, b.dmg, GameState.walls.indexOf(step.hit));
    }
    if (step.hit || b.traveled >= BATTLE_RANGE) {
      GameState.bullets.splice(i, 1);
    }
  }
}
function update() {
  const g = GameState,
    p = g.player,
    now = Date.now();
  ticks++;
  BotAI.beginTick(g.navigation);
  if (g.adrenalineActive && now > g.adrenalineTimer) g.adrenalineActive = false;
  if (g.fuelBoostActive && now > g.fuelBoostTimer) g.fuelBoostActive = false;
  // Spot once per team, not again inside every bot's target search (20 units at 60 Hz).
  if (ticks === 1 || ticks % 6 === 0)
    for (const u of g.units) {
      u.spotted = g.training || teamSees(u, u.team === 'enemy' ? 'player' : 'enemy');
      u.visible = u.team !== 'enemy' || u.spotted;
    }
  for (const u of g.units) {
    if (u.dead) continue;
    u.updateReload(performance.now());
    u.justFired = now < u.fireTimer;
    if (u === p) updatePlayer();
    else BotAI.step(u, ticks);
    WeatherEngine.updateWaterPhysics(u, TICK / 1000);
    if (u.isMoving && ticks % 5 === 0 && g.settings.showTracks)
      g.tracks.push({ x: u.x, y: u.y, a: u.angle, s: u.s, life: 130 });
    if (u.onFire && now - u.fireDmgTimer >= 1000) {
      u.hp = Math.max(0, u.hp - Math.floor(u.maxHp * 0.02));
      u.fireDmgTimer = now;
      spawnParticles(u.x, u.y, '#ef833c', 5, 2, 10);
      if (!u.hp) {
        u.dead = true;
        boom(u.x, u.y);
        updateScoreboard();
      }
    }
  }
  updateBullets();
  CombatMechanics.update(TICK / 1000);
  for (const x of g.particles) {
    x.x += x.vx;
    x.y += x.vy;
    x.life--;
  }
  g.particles = g.particles.filter((x) => x.life > 0);
  g.tracks = g.tracks.filter((tr) => --tr.life > 0);
  updateCasings();
  if (p.dead || !g.units.some((u) => u.team === 'enemy' && !u.dead)) endBattle(!p.dead);
}
function updateHUD() {
  const p = GameState.player,
    g = GameState,
    ammo = document.getElementById('ammo-val');
  const hp = Math.ceil(Math.max(0, p.hp));
  document.getElementById('hp-text').textContent = `${hp} / ${p.maxHp} HP`;
  document.getElementById('hp-bar').style.width = clamp((p.hp / p.maxHp) * 100, 0, 100) + '%';
  document.getElementById('drive-speed').textContent = `${Math.round(p.speedKmh)} км/ч`;
  document.getElementById('drive-surface').textContent = CONFIG.TERRAIN[p.currentTerrain].name;
  ammo.textContent =
    (p.usesMagazine
      ? `${magazineName(DB[p.id]).toUpperCase()} ${p.curMag}/${p.magSize}`
      : CONFIG.SHELLS[g.curShell].name) +
    '  /  ' +
    (p.isReloading
      ? `ПЕРЕЗАРЯДКА  ${Math.max(0, (p.nextShot - performance.now()) / 1000).toFixed(1)} с`
      : 'ГОТОВ');
  const water = document.getElementById('water-warning');
  water.hidden = p.drownTimer == null || p.dead;
  if (!water.hidden) water.textContent = `Глубокая вода · до затопления ${Math.ceil(p.drownTimer)} с`;
  MapChart.drawHUD(minimap, mCtx, g);
}
function startBattleLoop() {
  stopBattleLoop();
  lastFrame = null;
  accumulated = 0;
  ticks = 0;
  function frame(now) {
    if (!GameState.gameActive) return;
    if (!document.hidden) {
      // Use RAF timestamps for both ends. The first callback can belong to the frame
      // that started a long WebGL upload and predate performance.now() at launch.
      const dt = lastFrame === null ? TICK : clamp(now - lastFrame, 0, 150);
      BattleView.budget(dt);
      accumulated += dt;
      while (accumulated >= TICK && GameState.gameActive) {
        update();
        accumulated -= TICK;
      }
      BattleView.syncCamera();
      BattleView.aim();
      BattleView.draw();
      updateHUD();
      countPerfFrame();
    }
    lastFrame = now;
    if (GameState.gameActive) battleFrame = requestAnimationFrame(frame);
  }
  battleFrame = requestAnimationFrame(frame);
}
function stopBattleLoop() {
  cancelAnimationFrame(battleFrame);
  battleFrame = 0;
}
function init() {
  loadProgress();
  applySettings();
  GarageViewer.init();
  MapChart.initPicker();
  updateScale();
  setupPCControls();
  setupMobileControls();
  fillTrainNatSelect();
  fillEnemySelect();
  renderTree();
  renderCarousel();
  updateResources();
  updateInvCount();
  updateBoosterUI();
  startAutosave();
}
document.addEventListener('DOMContentLoaded', init, { once: true });
