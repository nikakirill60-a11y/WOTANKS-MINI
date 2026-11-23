// Эффекты дополнительного снаряжения. Основные снаряды и расходники — в tank.js и ui.js.
const CombatMechanics = {
  smokeClouds: [],
  artilleryStrikes: [],

  // 23. ДЫМОВАЯ ЗАВЕСА (Smoke Screen)
  deploySmokeScreen(caster) {
    if (!GameState.gameActive || !caster || caster.dead) return;
    this.smokeClouds.push({
      x: caster.x,
      y: caster.y,
      radius: 38, // matches the footprint of the rendered puffs
      duration: 12.0, // 12 секунд
      maxDuration: 12.0
    });
    if (typeof snd === 'function') snd('hit');
  },

  // 24. АРТИЛЛЕРИЙСКИЙ УДАР (Artillery Strike)
  callArtilleryStrike(targetX, targetY) {
    if (!GameState.gameActive) return;
    this.artilleryStrikes.push({
      x: targetX,
      y: targetY,
      timer: 2.5, // задержка перед прилетом
      radius: 140,
      exploded: false
    });
  },

  update(dt) {
    // Обновление дыма
    this.smokeClouds.forEach(s => s.duration -= dt);
    this.smokeClouds = this.smokeClouds.filter(s => s.duration > 0);

    // Обновление арт-ударов
    this.artilleryStrikes.forEach(a => {
      a.timer -= dt;
      if (a.timer <= 0 && !a.exploded) {
        a.exploded = true;
        if (typeof spawnParticles === 'function') {
          spawnParticles(a.x, a.y, '#ff2200', 60, 10, 45);
        }
        if (typeof snd === 'function') snd('boom');
        if (GameState.units) {
          GameState.units.forEach(u => {
            const dist = Math.hypot(u.x - a.x, u.y - a.y);
            if (!u.dead && dist < a.radius) {
              const dmg = Math.round(650 * (1 - dist / a.radius));
              if (u.team==='enemy') GameState.battleDmg+=Math.min(u.hp,dmg);
              u.hp = Math.max(0, u.hp - dmg);
              if (u.hp === 0) {
                u.dead = true; boom(u.x,u.y);
                if (u.team==='enemy') GameState.battleKills++;
                updateScoreboard();
              }
            }
          });
        }
      }
    });
    this.artilleryStrikes = this.artilleryStrikes.filter(a => !a.exploded || a.timer > -1);
  }
};
