// js/config.js
// ========== КОНФИГУРАЦИЯ ИГРЫ ==========

const CONFIG = {
  TIER_ROMAN: ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"],
  SHELLS: [
    { name: 'ББ', sMul: 1, dMul: 1, penMul: 1, color: '#f1c40f', rico: true },
    { name: 'ОФ', sMul: 0.6, dMul: 1.5, penMul: 0.55, color: '#e74c3c', rico: false },
    { name: 'Подкал', sMul: 1.6, dMul: 0.75, penMul: 1.3, color: '#3498db', rico: true }
  ],
  NATIONS: {
    ussr: 'СССР',
    germany: 'Германия',
    usa: 'США',
    uk: 'Британия',
    japan: 'Япония',
    china: 'Китай',
    france: 'Франция',
    sweden: 'Швеция'
  },
  TANK_CLASSES: { lt: 'ЛТ', mt: 'СТ', ht: 'ТТ', td: 'ПТ' },
  PROMOCODES: {
    "BETA_TEST": { gold: 500 },
    "START2025": { gold: 100, silver: 5000 },
    "TANKS": { xp: 1000 },
    "MAUS": { gold: 5000, xp: 10000, silver: 50000 }
  },
  MODULES: {
    rammer: { name: "Досылатель", desc: "Перезарядка -10%", icon: "🔧", cost: 5000, stat: 'reload', value: -0.1 },
    optics: { name: "Улуч. оптика", desc: "Обзор +10%", icon: "🔭", cost: 4000, stat: 'vr', value: 0.1 },
    vents: { name: "Вентиляция", desc: "Урон +5%", icon: "💨", cost: 6000, stat: 'dmg', value: 0.05 },
    spall: { name: "Подбой", desc: "ХП +8%", icon: "🛡️", cost: 5000, stat: 'hp', value: 0.08 },
    camo_net: { name: "Масксеть", desc: "Маскировка +15%", icon: "🌿", cost: 3000, stat: 'camo', value: 0.15 },
    gun_lay: { name: "Стабилизатор", desc: "Скорость снаряда +10%", icon: "🎯", cost: 5500, stat: 'shell_speed', value: 0.1 },
    turbo: { name: "Турбонаддув", desc: "Скорость +12%", icon: "⚡", cost: 7000, stat: 'speed', value: 0.12 },
    armor_plate: { name: "Допброня", desc: "Броня +20%", icon: "🪨", cost: 8000, stat: 'armor', value: 0.2 }
  },
  CONSUMABLES: [
    { name: "Ремкомплект", shortName: "РЕМ", key: "5/Q", icon: "🔧", cost: 500, desc: "Чинит гусеницу и двигатель" },
    { name: "Аптечка", shortName: "АПТ", key: "4", icon: "💊", cost: 500, desc: "+15% ХП" },
    { name: "Адреналин", shortName: "АДР", key: "R", icon: "💉", cost: 500, desc: "Ускорение перезарядки 10сек" },
    { name: "Огнетушитель", shortName: "ОГН", key: "6/F", icon: "🧯", cost: 600, desc: "Снимает горение, +5% ХП" },
    { name: "Доп.паёк", shortName: "ПАЁ", key: "9", icon: "🍫", cost: 800, desc: "+5% урон на весь бой" },
    { name: "Топливо 105", shortName: "ТОП", key: "0", icon: "⛽", cost: 700, desc: "+15% скорость на 15сек" }
  ],
  BOOSTERS: {
    xp: { name: "Бустер опыта x2", icon: "⭐", color: "#3498db", multiplier: 2, costGold: 100 },
    gold: { name: "Бустер золота x2", icon: "🪙", color: "#f1c40f", multiplier: 2, costGold: 150 },
    silver: { name: "Бустер серебра x2", icon: "💰", color: "#bdc3c7", multiplier: 2, costGold: 80 }
  },
  UPGRADES: {
    gun: [
      { name: "Стоковое орудие", desc: "Урон: x1, КД: x1", dmgMul: 1, reloadMul: 1 },
      { name: "Орудие Тип Б", desc: "Урон: x1.1, КД: x0.95", dmgMul: 1.1, reloadMul: 0.95 },
      { name: "Орудие Тип X", desc: "Урон: x1.25, КД: x0.9", dmgMul: 1.25, reloadMul: 0.9 }
    ],
    engine: [
      { name: "Стоковый двигатель", desc: "Скор: x1", speedMul: 1 },
      { name: "Улучшенный двигатель", desc: "Скор: x1.1", speedMul: 1.1 },
      { name: "Топовый двигатель", desc: "Скор: x1.2", speedMul: 1.2 }
    ],
    turret: [
      { name: "Стоковая башня", desc: "ХП: x1, Обзор: x1", hpMul: 1, vrMul: 1 },
      { name: "Усиленная башня", desc: "ХП: x1.1, Обзор: x1.05", hpMul: 1.1, vrMul: 1.05 },
      { name: "Элитная башня", desc: "ХП: x1.2, Обзор: x1.1", hpMul: 1.2, vrMul: 1.1 }
    ]
  },
  UPGRADE_COSTS: {
    1: [500, 1000], 2: [800, 1500], 3: [1500, 3000], 4: [3000, 6000], 5: [5000, 10000],
    6: [8000, 16000], 7: [12000, 25000], 8: [18000, 35000], 9: [25000, 50000], 10: [40000, 80000]
  },

  // ========== ФИЗИКА ЛАНДШАФТА ==========
  // Rolling/steering resistance and the fraction of lateral slip removed per 60 Hz step.
  TERRAIN: {
    normal:  { name: 'Грунт',        speedMul: 1,    resistance: 1,    grip: .29 },
    trail:   { name: 'Просёлок',     speedMul: 1,    resistance: .92,  grip: .30 },
    sand:    { name: 'Рыхлый песок', speedMul: .85,  resistance: 1.5,  grip: .22 },
    gravel:  { name: 'Щебень',       speedMul: .96,  resistance: 1.1,  grip: .24 },
    stubble: { name: 'Стерня',       speedMul: .94,  resistance: 1.18, grip: .27 },
    mud:     { name: 'Грязь',        speedMul: .55,  resistance: 1.85, grip: .33 },
    ice:     { name: 'Лёд',          speedMul: 1.05, resistance: 1.12, grip: .026 },
    asphalt: { name: 'Асфальт',      speedMul: 1,    resistance: .78,  grip: .52 }
  },

  // ========== КРИТИЧЕСКИЕ ПОВРЕЖДЕНИЯ МОДУЛЕЙ ==========
  CRITICALS: {
    engine:  { name: "Двигатель повреждён", icon: "⚙️", chance: 0.12, duration: 12000, effect: 'speed', value: 0.5 },
    ammo:    { name: "Боеукладка повреждена", icon: "💥", chance: 0.08, duration: 10000, effect: 'reload', value: 0.6 },
    gun:     { name: "Орудие повреждено", icon: "🎯", chance: 0.10, duration: 15000, effect: 'dmg', value: 0.8 }
  },

  // ========== БРОНЕЗОНЫ ==========
  ARMOR_ZONES: {
    front: { mul: 1.0,  label: "лоб" },
    side:  { mul: 0.55, label: "борт" },
    rear:  { mul: 0.3,  label: "корма" }
  }
};

// Только эти поля переживают перезапуск. Бой, снаряды и ввод остаются в памяти.
function initialProgress() {
  return {
    XP: 500, GOLD: 0, SILVER: 5000, charges: 0,
    owned: [STARTER_TANK], selected: STARTER_TANK, curNat: DB[STARTER_TANK].nat,
    usedPromos: [],
    inventory: {}, boosters: { xp: 0, gold: 0, silver: 0 }, boosterStock: { xp: 0, gold: 0, silver: 0 },
    modules: {}, upgrades: {}, upgradesBought: {},
    totalBattles: 0, lifetimeWins: 0, lifetimeKills: 0,
    loginCalendar: { claimedDays: [] }, tutorialDone: false, settings: { volume: 1, lookSensitivity: 1, showTracks: true, lang: 'ru' }
  };
}

// Only battle timers stop in the controls menu. Calendar, saves, FPS and the
// hangar still use real time. Preserve the two original deadline time bases.
const BattleClock = {
  reset() {
    this.at = this.dateAt = null;
    this.skip = this.dateSkip = 0;
  },
  pause() {
    if (this.at !== null) return;
    this.at = performance.now();
    this.dateAt = Date.now();
  },
  resume() {
    if (this.at === null) return;
    this.skip += performance.now() - this.at;
    this.dateSkip += Date.now() - this.dateAt;
    this.at = this.dateAt = null;
  },
  now() { return (this.at ?? performance.now()) - this.skip; },
  date() { return (this.dateAt ?? Date.now()) - this.dateSkip; }
};
BattleClock.reset();

const GameState = {
  ...initialProgress(),
  // Состояние игры
  gameActive: false,
  controlMode: 'pc',
  pendingBattle: null,

  // Игрок и юниты
  player: null,
  units: [],
  arena: null, navigation: null, terrainZones: [],
  bullets: [],
  walls: [],
  particles: [],
  tracks: [],

  // Камера
  aim: { x: 0, y: 0 },
  shakeTimer: 0,
  shakeIntensity: 0,

  // Бой
  curShell: 0,
  battleDmg: 0,
  battleKills: 0,

  // Расходники
  consumables: [false, false, false, false, false, false],
  adrenalineActive: false,
  adrenalineTimer: 0,
  fuelBoostActive: false,
  fuelBoostTimer: 0,
  paiokActive: false,

  // Управление
  keys: {},
  mouseDown: false, holdTurret: false,
  joystickData: { active: false, dx: 0, dy: 0, mag: 0 },
  mobileFireActive: false
};

// ========== МАСШТАБ ==========
function updateScale() {
  const w = window.innerWidth;

  const mm = document.getElementById('minimap');
  if (mm) {
    const large = GameState.units.length === 30;
    const sz = Math.round(large ? Math.min(208, Math.max(112, w * .14)) : Math.min(180, Math.max(86, w * .12)));
    const b = GameState.arena?.bounds;
    mm.width = sz;
    mm.height = Math.round(8 + (sz-8)*(b ? b.y/b.x : .72));
    mm.style.width = sz + 'px';
    mm.style.height = 'auto';
  }
}

window.addEventListener('resize', updateScale);

console.log('✅ config.js загружен');
