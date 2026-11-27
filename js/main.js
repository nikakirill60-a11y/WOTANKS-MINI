const minimap = document.getElementById('minimap'),
  mCtx = minimap.getContext('2d');
const TICK = 1000 / 60;
let battleFrame = 0,
  lastFrame = 0,
  accumulated = 0,
  ticks = 0;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// A tap fires immediately from the current rendered barrel, not from the camera.
function firePlayer() {
  const g = GameState,
    p = g.player;
  if (!g.gameActive || !BattleInput.running || g.platoon?.result || !p || p.dead) return;
  const sight = BattleView.artillery;
  if (sight) BattleInput.consumeLook();
  if (g.platoon && !g.platoon.host) g.platoon.action('fire');
  else p.fire(g.curShell, sight);
}
function driveIntent() {
  const g = GameState, j = g.joystickData, k = g.keys;
  const forward = Number(!!(k.KeyW || k.ArrowUp)) - Number(!!(k.KeyS || k.ArrowDown)) || -j.dy;
  const turn = Number(!!(k.KeyD || k.ArrowRight)) - Number(!!(k.KeyA || k.ArrowLeft)) || j.dx;
  const brake = k.Space || ((k.KeyW || k.ArrowUp) && (k.KeyS || k.ArrowDown));
  return {forward,turn,brake:!!brake};
}
function updatePlayer() {
  const g = GameState, p = g.player, mountYaw = wrapAngle(p.tAngle - p.angle);
  const {forward,turn,brake} = driveIntent();
  const assist = !turn && !forward && !brake && !g.holdTurret && !p.isMoving ? BattleView.artillery?.steer(p) : 0;
  TrackDrive.step(p, forward, turn || assist || 0, brake);
  BattleInput.consumeLook();
  BattleView.stepPlayer(1 / 60, mountYaw);
  if (g.mouseDown || g.mobileFireActive) firePlayer();
  if (p.isMoving && ++p.engineTick % 8 === 0) {
    smoke(p.x - 14 * Math.cos(p.angle), p.y - 14 * Math.sin(p.angle));
    snd('eng');
  }
}
// In a shared sortie, attribute each hit to its driver; never put a wingman's
// damage or kill XP in the commander's garage. Settle only the final receipt.
function creditDamage(source, damage) {
  const g = GameState;
  if (g.platoon) g.platoon.credit(source,damage,0,0);
  else if (source === g.player) g.battleDmg += damage;
}
function creditKill(source, bonus = 0) {
  const g = GameState;
  if (g.platoon) g.platoon.credit(source,0,1,bonus);
  else if (source === g.player) { g.battleKills++; g.battleKillXP += bonus; }
}
function damageUnit(b, u, part, incidenceCos) {
  const { dmg, zone, ricochet } = resolveHit(b, u, part, incidenceCos);
  if (!dmg) {
    BotAI.onBlockedHit(b.shooter, u);
    sparks(b.x, b.y, b.h);
    snd('rico');
    if (b.shooter === GameState.player) {
      combatMessage((ricochet ? 'Рикошет: ' : 'Не пробито: ') + (part === 'turret' ? 'башня' : 'корпус'), '#eabb70');
    }
    return;
  }
  const dealt = Math.min(u.hp, dmg);
  u.hp = Math.max(0, u.hp - dmg);
  sparksAdvanced(b.x, b.y, b.a, b.h);
  snd('hit');
  if (!u.trackBroken && Math.random() < 0.1) {
    u.trackBroken = true;
    u.trackRepairAt = BattleClock.date() + 7000;
    if (u === GameState.player) combatMessage('Сбита гусеница · ремонт 7 с', '#f28b68');
  }
  creditDamage(b.shooter, dealt);
  if (b.shooter === GameState.player) {
    dmgLog('−' + Math.ceil(dealt) + ' · ' + CONFIG.ARMOR_ZONES[zone].label, '#ffd38a');
  }
  if (u === GameState.player) {
    dmgLog('−' + Math.ceil(dealt), '#ffa78b');
    onPlayerHit(b.a, dealt);
  }
  const hitAngle = b.a - u.angle;
  u.pitchVel += 0.06 * Math.cos(hitAngle);
  u.rollVel -= 0.06 * Math.sin(hitAngle);
  finishUnit(u, b.shooter);
}
function finishUnit(u, source) {
  if (u.hp > 0 || u.dead) return;
  u.dead = true;
  boom(u.x, u.y);
  snd('boom');
  if (u.team === 'enemy') creditKill(source,u.tier * 500);
  if (source === GameState.player && u.team === 'enemy') {
    combatMessage('Цель уничтожена', '#ffe3ae');
  }
  updateScoreboard();
}
function motionDamage(u, amount, source) {
  if (u.dead || amount <= 0) return;
  const lost = Math.min(amount, u.hp);
  u.hp -= lost;
  if (u.team === 'enemy') creditDamage(source,lost);
  if (source === GameState.player && u.team === 'enemy') {
    dmgLog('Таран · −' + Math.ceil(lost), '#ffd38a');
  }
  if (u === GameState.player)
    dmgLog((source ? 'Столкновение' : 'Падение') + ' · −' + Math.ceil(lost), '#ffa78b');
  finishUnit(u, source);
}
function ramContact(a, b, lossA, lossB) {
  motionDamage(a, lossA, b);
  motionDamage(b, lossB, a);
}
function updateBullets() {
  for (let i = GameState.bullets.length - 1; i >= 0; i--) {
    const b = GameState.bullets[i];
    const length = b.arc ? artilleryStep(b) : b.speed;
    const step = traceBattleRay(b.x, b.y, b.h, b.dx, b.dy, b.dh, length, b.shooter, false, false, false, b.round?.ricochetDeg !== undefined);
    b.x = step.x;
    b.y = step.y;
    b.h = step.h;
    b.traveled += step.distance;
    if (step.hit instanceof Tank) damageUnit(b, step.hit, step.part, step.incidenceCos);
    else if (step.hit) {
      spawnParticles(b.x, b.y, '#e2bc7b', 8, 2, 11, b.h);
      if (step.hit.type === 'building') damageWall(step.hit, b.dmg, GameState.walls.indexOf(step.hit));
      if (b.arc && step.hit === 'ground') artilleryBurst(b);
    }
    if (step.hit || (b.arc ? b.arc.tick >= b.arc.frames : b.traveled >= BATTLE_RANGE)) {
      GameState.bullets.splice(i, 1);
    }
  }
}
function update() {
  const g = GameState,
    p = g.player,
    now = BattleClock.date();
  ticks++;
  if (g.adrenalineActive && now > g.adrenalineTimer) g.adrenalineActive = false;
  if (g.fuelBoostActive && now > g.fuelBoostTimer) g.fuelBoostActive = false;
  // Spot once per team, not again inside every bot's target search (up to 30 units at 60 Hz).
  if (ticks === 1 || ticks % 6 === 0)
    for (const u of g.units) {
      u.spotted = g.training || teamSees(u, u.team === 'enemy' ? 'player' : 'enemy');
      u.visible = u.team !== 'enemy' || u.spotted;
    }
  BotAI.beginTick(g.navigation, ticks);
  for (const u of g.units) {
    if (u.dead) continue;
    const gunTime = BattleClock.now();
    u.updateReload(gunTime);
    if (u.calibration) u.updateCalibration(gunTime);
    u.justFired = now < u.fireTimer;
    if (u === p && g.platoon && (!BattleInput.running || document.hidden)) TrackDrive.step(p,0,0,true);
    else if (u === p) updatePlayer();
    else if (u.driverSeat != null) g.platoon.stepDriver(u);
    else BotAI.step(u, ticks);
    if (u.landingSpeed > 7)
      motionDamage(u, Math.round((u.landingSpeed - 7) ** 2 * TrackDrive.profile(u).mass * 0.35), null);
    u.landingSpeed = 0;
    WeatherEngine.updateWaterPhysics(u, TICK / 1000);
    if (u.isMoving && !u.airborne && ticks % 5 === 0 && g.settings.showTracks)
      g.tracks.push({
        unspotted: u.team === 'enemy' && !u.visible,
        x: u.x,
        y: u.y,
        h: surfaceHeight(u.x, u.y),
        pitch: u.groundPitch,
        roll: u.groundRoll,
        a: u.angle,
        s: u.s,
        life: 130
      });
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
  TrackContact.pairs(g.units, ticks, ramContact);
  updateBullets();
  CombatMechanics.update(TICK / 1000);
  updateVisualEffects();
  const enemies = g.units.some((u) => u.team === 'enemy' && !u.dead);
  if (g.platoon) {
    if (!enemies || !g.units.some(u=>u.driverSeat != null && !u.dead)) g.platoon.finish(!enemies);
  } else if (p.dead || !enemies) endBattle(!p.dead);
}
function updateVisualEffects() {
  const g = GameState;
  for (const x of g.particles) {
    x.x += x.vx;
    x.y += x.vy;
    x.life--;
  }
  g.particles = g.particles.filter((x) => x.life > 0);
  g.tracks = g.tracks.filter((tr) => --tr.life > 0);
  updateCasings();
}
function updateHUD() {
  const p = GameState.player,
    g = GameState,
    ammo = document.getElementById('ammo-val');
  const hp = Math.ceil(Math.max(0, p.hp));
  document.getElementById('hp-text').textContent = `${hp} / ${p.maxHp} HP`;
  document.getElementById('hp-bar').style.width = clamp((p.hp / p.maxHp) * 100, 0, 100) + '%';
  document.getElementById('drive-speed').textContent = `${Math.round(p.speedKmh)} км/ч`;
  const grade = Math.round(Math.tan(p.groundPitch) * 100);
  document.getElementById('drive-surface').textContent =
    CONFIG.TERRAIN[p.currentTerrain].name +
    (p.airborne ? ' · в воздухе' : Math.abs(grade) >= 2 ? ' · ' + (grade > 0 ? '+' : '') + grade + '%' : '');
  const gunTime = BattleClock.now();
  if (p.calibration) ShellUI.status(p, gunTime);
  ammo.textContent =
    (p.usesMagazine
      ? `${magazineName(DB[p.id]).toUpperCase()} ${p.curMag}/${p.magSize}`
      : p.isSPG ? CONFIG.SPG_ROUND.name : (p.salvoSize > 1 ? `ЗАЛП ×${p.salvoSize} · ` : '') + p.roundFor(g.curShell).name) +
    '  /  ' +
    (p.isReloading
      ? `ПЕРЕЗАРЯДКА  ${Math.max(0, (p.nextShot - gunTime) / 1000).toFixed(1)} с`
      : p.calibration?.until != null ? 'ПЕРЕКЛЮЧЕНИЕ' : 'ГОТОВ');
  const water = document.getElementById('water-warning');
  water.hidden = p.drownTimer == null || p.dead;
  if (!water.hidden) water.textContent = `Глубокая вода · до затопления ${Math.ceil(p.drownTimer)} с`;
  if (g.platoon && p.dead) ammo.textContent = 'Машина потеряна · взвод продолжает бой';
  MapChart.drawHUD(minimap, mCtx, g);
}
function resetFrameTime() {
  lastFrame = null;
  accumulated = 0;
}
function startBattleLoop() {
  stopBattleLoop();
  resetFrameTime();
  ticks = 0;
  function frame(now) {
    if (!GameState.gameActive) return;
    if (!document.hidden) {
      // Use RAF timestamps for both ends. The first callback can belong to the frame
      // that started a long WebGL upload and predate performance.now() at launch.
      const dt = lastFrame === null ? TICK : clamp(now - lastFrame, 0, 100);
      BattleView.budget(dt);
      const net = GameState.platoon;
      if (net && !net.host) net.stepView(dt);
      // The host steps from its own timer, not the renderer or the pointer-lock gate.
      accumulated = !net && BattleInput.running ? accumulated + dt : 0;
      while (accumulated >= TICK && GameState.gameActive) {
        update();
        accumulated -= TICK;
      }
      BattleView.syncCamera();
      BattleView.aim();
      BattleView.draw();
      updateHUD();
      BattleInput.refreshRoster();
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
function enterHangar() {
  const entry = document.getElementById('entry-screen');
  if (entry.hidden) return;
  entry.hidden = true;
  document.getElementById('ui').hidden = false;
  applySettings();
  GarageViewer.init();
  MapChart.initPicker();
  updateScale();
  BattleInput.init();
  fillTrainNatSelect();
  fillEnemySelect();
  renderTree();
  renderCarousel();
  updateResources();
  updateInvCount();
  updateBoosterUI();
  WinterSeason.init();
  startAutosave();
  document.getElementById('bay-inspect-tab').focus({preventScroll:true});
}
document.addEventListener('DOMContentLoaded', () => {
  // Don't start a garage, read/write a guest save or award an Advent visit behind the checkpoint.
  Accounts.init(enterHangar);
}, { once: true });
