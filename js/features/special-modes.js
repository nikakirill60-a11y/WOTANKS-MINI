// js/features/special-modes.js
// 🎮 Специальные режимы боев: Mad Games, Гравитация, Охота на Босса, Оружейная гонка, Полигон, Дуэли
console.log('🕹️ special-modes.js загружается...');

const SpecialModes = {
  currentSpecialMode: 'standard', // 'standard', 'mad_games', 'gravity', 'boss_rush', 'big_boss', 'gun_game', 'polygon', 'tournament'

  // 36. MAD GAMES СПОСОБНОСТИ
  madAbilities: {
    nitro: { name: 'Закись Азота', cd: 15, active: false, timer: 0 },
    invisibility: { name: 'Хамелеон (Невидимость)', cd: 25, active: false, timer: 0 },
    vampire: { name: 'Вампиризм (Лечение при попадании)', active: true }
  },

  // 37. ГРАВИТАЦИЯ
  gravityFactor: 1.0,

  // 38. РЕЖИМ БОСС-РАШ (Horde PvE)
  hordeWave: 1,
  hordeScore: 0,

  setMode(mode) {
    this.currentSpecialMode = mode;
    this.gravityFactor = mode === 'gravity' ? 0.35 : 1.0;
    console.log('🎮 Установлен режим боя:', mode);
  },

  onTankFired(tank) {
    // 37. Отдача в режиме гравитации
    if (this.currentSpecialMode === 'gravity' && tank) {
      const kick = 8.0;
      tank.vx = (tank.vx || 0) - Math.cos(tank.a) * kick;
      tank.vy = (tank.vy || 0) - Math.sin(tank.a) * kick;
    }
  },

  onTankKill(killer, victim) {
    // 42. ОРУЖЕЙНАЯ ГОНКА (Arms Race / Gun Game)
    if (this.currentSpecialMode === 'gun_game' && killer && killer.type === 'player') {
      const upgradePath = ['T26', 'BT7', 'T34', 'T34_85', 'T44', 'T54', 'T62A', 'WT_E110'];
      const curIdx = upgradePath.indexOf(killer.id);
      if (curIdx !== -1 && curIdx < upgradePath.length - 1) {
        const nextTank = upgradePath[curIdx + 1];
        killer.id = nextTank;
        killer.name = DB[nextTank] ? DB[nextTank].name : nextTank;
        killer.stats = DB[nextTank] ? { ...DB[nextTank] } : killer.stats;
        killer.hp = killer.stats.hp;
        if (typeof snd === 'function') snd('victory');
        if (typeof crewMsg === 'function') crewMsg(`🎉 ПОВЫШЕНИЕ ДО: ${killer.name}!`, '#00e5ff');
      }
    }

    // 38. ВОЛНЫ В РЕЖИМЕ ОРДЫ
    if (this.currentSpecialMode === 'boss_rush') {
      this.hordeScore += 100;
      const aliveEnemies = GameState.units.filter(u => u.type === 'enemy' && u.hp > 0).length;
      if (aliveEnemies <= 1) {
        this.hordeWave++;
        this.spawnHordeWave();
      }
    }
  },

  spawnHordeWave() {
    if (typeof crewMsg === 'function') crewMsg(`⚠️ ВОЛНА ${this.hordeWave}! ПРИБЛИЖАЕТСЯ ПОДКРЕПЛЕНИЕ!`, '#ff2200');
    const isBossWave = (this.hordeWave % 3 === 0);
    const count = 3 + this.hordeWave;
    for (let i = 0; i < count; i++) {
      const tId = isBossWave && i === 0 ? 'MAUS' : (['T34_85', 'T44', 'IS3', 'T54'][i % 4]);
      const x = 800 + Math.random() * 400;
      const y = -600 + Math.random() * 1200;
      const bot = new Tank(tId, x, y, 'enemy', { mod: {}, upg: {} });
      if (isBossWave && i === 0) {
        bot.hp *= 3;
        bot.name = `👑 БОСС ВОЛНЫ ${this.hordeWave}: ${bot.name}`;
      }
      GameState.units.push(bot);
    }
  },

  // 41. ТРЕНИРОВОЧНЫЙ ПОЛИГОН (Training Polygon)
  initPolygon() {
    this.setMode('polygon');
    if (GameState.player) {
      GameState.player.hp = 99999;
      GameState.player.maxHp = 99999;
    }
    // Спавн мишеней с разной толщиной брони
    const targets = ['T26', 'T34', 'IS3', 'MAUS', 'WT_E110'];
    targets.forEach((tId, idx) => {
      const dummy = new Tank(tId, 200 + idx * 180, -200 + (idx % 2) * 150, 'enemy', { mod: {}, upg: {} });
      dummy.isDummy = true;
      GameState.units.push(dummy);
    });
  }
};

window.SpecialModes = SpecialModes;
console.log('✅ special-modes.js полностью готов');
