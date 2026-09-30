// js/features/progression-upgrades.js
// 🛠️ Полевая модернизация, 9 слотов оборудования, Амуниция и пайки, Перки экипажа, Знаки мастерства, Сравнение танков
console.log('📈 progression-upgrades.js загружается...');

const ProgressionEngine = {
  // 68. 9 СЛОТОВ ОБОРУДОВАНИЯ
  equipmentList: {
    rammer: { name: 'Орудийный досылатель', desc: '-10% время перезарядки', cost: 150000, stat: 'reload', val: -0.10, icon: '⚡' },
    optics: { name: 'Просветленная оптика', desc: '+10% радиус обзора', cost: 120000, stat: 'vr', val: 0.10, icon: '🔭' },
    vents: { name: 'Улучшенная вентиляция', desc: '+5% ко всем навыкам экипажа', cost: 100000, stat: 'all', val: 0.05, icon: '💨' },
    armor: { name: 'Усиленная броня', desc: '+4% прочность танка', cost: 180000, stat: 'hp', val: 0.04, icon: '🛡️' },
    camo_net: { name: 'Маскировочная сеть', desc: '+10% незаметность', cost: 80000, stat: 'camo', val: 0.10, icon: '🌿' },
    v_stab: { name: 'Стабилизатор наводки', desc: '-15% разброс при движении', cost: 200000, stat: 'stab', val: 0.15, icon: '🎯' },
    gun_lay: { name: 'Усиленные приводы наводки', desc: '+10% скорость сведения', cost: 130000, stat: 'aim', val: 0.10, icon: '⏱️' },
    toolbox: { name: 'Большой ящик с инструментами', desc: '+25% скорость ремонта гусениц', cost: 90000, stat: 'repair', val: 0.25, icon: '🧰' },
    spall_liner: { name: 'Противоосколочный подбой', desc: '-30% урон от тарана и фугасов', cost: 160000, stat: 'spall', val: 0.30, icon: '🧱' }
  },

  // 69. АМУНИЦИЯ И ПАЙКИ (Provisions)
  provisionsList: {
    rations: { name: 'Доппаёк', bonus: '+10% ко всем характеристикам', cost: 5000, icon: '🥫' },
    octane: { name: 'Высокооктановое топливо', bonus: '+5% мощность двигателя', cost: 3500, icon: '⛽' },
    prot_kit: { name: 'Защитный комплект', bonus: '+15% прочность модулей', cost: 2500, icon: '🧯' }
  },

  // 70. ПЕРКИ ЭКИПАЖА
  crewPerks: {
    sixth_sense: { name: 'Шестое чувство (Лампочка)', desc: 'Предупреждает о засвете', icon: '💡' },
    bia: { name: 'Боевое братство', desc: '+5% ко всем характеристикам', icon: '🤝' },
    smooth_ride: { name: 'Плавный ход', desc: 'Уменьшает разброс на ходу', icon: '🏎️' },
    snap_shot: { name: 'Плавный поворот башни', desc: 'Точнее стрельба при вращении башни', icon: '🎯' },
    clutch: { name: 'Виртуоз', desc: '+5% скорость поворота танка', icon: '🔄' },
    deadeye: { name: 'Снайпер', desc: '+3% шанс крита по модулям', icon: '👁️' },
    repairs: { name: 'Ремонт', desc: '+25% скорость починки гусениц', icon: '🔧' }
  },

  // 67. ПОЛЕВАЯ МОДЕРНИЗАЦИЯ (Field Modification)
  getFieldModForTank(tankId) {
    if (!GameState.fieldMods) GameState.fieldMods = {};
    return GameState.fieldMods[tankId] || { level: 0, choices: {} };
  },

  upgradeFieldMod(tankId) {
    const cur = this.getFieldModForTank(tankId);
    const cost = 25000 * (cur.level + 1);
    if (GameState.SILVER < cost) {
      alert(`Недостаточно серебра! Нужно ${cost} 🥈`);
      return false;
    }
    GameState.SILVER -= cost;
    cur.level = Math.min(5, cur.level + 1);
    GameState.fieldMods[tankId] = cur;
    if (typeof saveProgress === 'function') saveProgress();
    return true;
  },

  // 71. ЗНАКИ МАСТЕРСТВА (Mastery Badges)
  calculateMasteryBadge(xp) {
    if (xp >= 1400) return { name: '🎖️ Мастер', badge: 'M', color: '#ffd700' };
    if (xp >= 1000) return { name: '🥇 1 Степень', badge: '1', color: '#00e5ff' };
    if (xp >= 700) return { name: '🥈 2 Степень', badge: '2', color: '#c0c0c0' };
    if (xp >= 400) return { name: '🥉 3 Степень', badge: '3', color: '#cd7f32' };
    return null;
  },

  // 74. СРАВНЕНИЕ ТАНКОВ (Comparison Tool)
  compareTanks(tankIdA, tankIdB) {
    const tA = DB[tankIdA] || { name: tankIdA, hp: 1000, dmg: 200, reload: 6, speed: 40, armor: 100, vr: 250 };
    const tB = DB[tankIdB] || { name: tankIdB, hp: 1000, dmg: 200, reload: 6, speed: 40, armor: 100, vr: 250 };

    const dpmA = Math.round((tA.dmg * 60) / (tA.reload || 6));
    const dpmB = Math.round((tB.dmg * 60) / (tB.reload || 6));

    return {
      tankA: { ...tA, dpm: dpmA },
      tankB: { ...tB, dpm: dpmB }
    };
  }
};

window.ProgressionEngine = ProgressionEngine;
console.log('✅ progression-upgrades.js полностью готов');
