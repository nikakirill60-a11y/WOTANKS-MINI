// js/config.js
// ========== КОНФИГУРАЦИЯ ИГРЫ ==========

const CONFIG = {
  TIER_ROMAN: ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"],
  SHELLS: [
    { name: 'ББ', sMul: 1, dMul: 1, color: '#f1c40f', rico: true },
    { name: 'ОФ', sMul: 0.6, dMul: 1.5, color: '#e74c3c', rico: false },
    { name: 'Подкал', sMul: 1.6, dMul: 0.75, color: '#3498db', rico: true }
  ],
  CREW_MESSAGES: {
    HIT: ["Есть пробитие!", "Цель поражена!", "Попали!"],
    RICO: ["Рикошет!", "Не пробили!"],
    KILL: ["Враг уничтожен!", "Цель уничтожена!"]
  },
  NATIONS: { ussr: 'СССР', germany: 'Германия', france: 'Франция', uk: 'Британия', china: 'Китай', japan: 'Япония' },
  TANK_CLASSES: { lt: 'ЛТ', mt: 'СТ', ht: 'ТТ', td: 'ПТ' },
  PROMOCODES: {
    "BETA_TEST": { tank: "KV220BT" },
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
    { name: "Ремкомплект", shortName: "РЕМ", key: "4", icon: "🔧", cost: 500, desc: "Чинит гусеницу" },
    { name: "Аптечка", shortName: "АПТ", key: "5", icon: "💊", cost: 500, desc: "+15% ХП" },
    { name: "Адреналин", shortName: "АДР", key: "6", icon: "💉", cost: 500, desc: "Ускорение перезарядки 10сек" },
    { name: "Огнетушитель", shortName: "ОГН", key: "7", icon: "🧯", cost: 600, desc: "Снимает горение, +5% ХП" },
    { name: "Доп.паёк", shortName: "ПАЁ", key: "8", icon: "🍫", cost: 800, desc: "+5% урон на весь бой" },
    { name: "Топливо 105", shortName: "ТОП", key: "9", icon: "⛽", cost: 700, desc: "+15% скорость на 15сек" }
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
  TERRAIN: {
    normal:  { name: "Грунт",   speedMul: 1,    turnMul: 1,    drift: 0,    color: null },
    mud:     { name: "Грязь",   speedMul: 0.55, turnMul: 0.7,  drift: 0,    color: '#3a2e1a' },
    ice:     { name: "Лёд",     speedMul: 1.05, turnMul: 1.35, drift: 0.35, color: '#bcdfe8' },
    asphalt: { name: "Асфальт", speedMul: 1.25, turnMul: 1.1,  drift: 0,    color: '#444448' }
  },

  // ========== КРИТИЧЕСКИЕ ПОВРЕЖДЕНИЯ МОДУЛЕЙ ==========
  CRITICALS: {
    engine:  { name: "Двигатель повреждён", icon: "⚙️", chance: 0.12, duration: 12000, effect: 'speed', value: 0.5 },
    ammo:    { name: "Боеукладка повреждена", icon: "💥", chance: 0.08, duration: 10000, effect: 'reload', value: 0.6 },
    gunner:  { name: "Наводчик ранен", icon: "🎯", chance: 0.10, duration: 15000, effect: 'spread', value: 0.8 }
  },

  // ========== БРОНЕЗОНЫ ==========
  ARMOR_ZONES: {
    front: { mul: 1.0,  label: "лоб" },
    side:  { mul: 0.55, label: "борт" },
    rear:  { mul: 0.3,  label: "корма" }
  },

  // ========== КАМУФЛЯЖИ ==========
  CAMOS: {
    forest:  { name: "Лесной",     icon: "🌲", cost: 2000, currency: 'silver', camoBonus: 0.02, color: '#2d5a1e' },
    desert_c:{ name: "Пустынный",  icon: "🏜️", cost: 2000, currency: 'silver', camoBonus: 0.02, color: '#c2a645' },
    urban:   { name: "Городской",  icon: "🏙️", cost: 2500, currency: 'silver', camoBonus: 0.02, color: '#5a5a5a' },
    winter:  { name: "Зимний",     icon: "❄️", cost: 2500, currency: 'silver', camoBonus: 0.02, color: '#dfeaf0' },
    tiger:   { name: "Тигровый",   icon: "🐯", cost: 150,  currency: 'gold',   camoBonus: 0.02, color: '#e0a030' },
    golden:  { name: "Золотой",    icon: "✨", cost: 500,  currency: 'gold',   camoBonus: 0.02, color: '#f1c40f' }
  },

  // ========== ЭКИПАЖ И ПЕРКИ ==========
  CREW_ROLES: ['commander', 'driver', 'gunner'],
  CREW_XP_PER_LEVEL: 500,
  CREW_MAX_LEVEL: 10,
  CREW_PERKS: {
    sixth_sense:  { name: "Шестое чувство", desc: "Лампочка при обнаружении танка врагом", icon: "💡", role: 'commander', reqLevel: 3, cost: 1 },
    eagle_eye:    { name: "Орлиный глаз",   desc: "Обзор +5%", icon: "🦅", role: 'commander', reqLevel: 6, cost: 1, stat: 'vr', value: 0.05 },
    smooth_ride:  { name: "Плавный ход",    desc: "Устойчивость на разбитой местности +10%", icon: "🛞", role: 'driver', reqLevel: 3, cost: 1, stat: 'stability', value: 0.1 },
    offroad:      { name: "Король бездорожья", desc: "Штраф грязи/льда снижен на 15%", icon: "🚜", role: 'driver', reqLevel: 6, cost: 1, stat: 'terrainRes', value: 0.15 },
    steady_hand:  { name: "Твёрдая рука",   desc: "Разброс при движении -8%", icon: "✋", role: 'gunner', reqLevel: 3, cost: 1, stat: 'accuracyMoving', value: 0.08 },
    deadeye:      { name: "Снайпер",        desc: "Шанс крит. повреждения модулей врага +5%", icon: "🎯", role: 'gunner', reqLevel: 6, cost: 1, stat: 'critChance', value: 0.05 }
  },

  // ========== ЧЕРТЕЖИ ==========
  BLUEPRINTS_PER_TANK: 10,
  BLUEPRINT_DISCOUNT_PER_FRAGMENT: 0.1,

  // ========== БОЕВОЙ ПРОПУСК ==========
  BATTLE_PASS: {
    maxLevel: 30,
    xpPerLevel: 1000,
    premiumCostGold: 2500,
    seasonName: "Сезонный",
    premiumTankLevels: {
      1:  { id: 'BP_PZ2D',  name: "Pz.Kpfw. II Ausf. D", tier: 2 },
      15: { id: 'BP_T34E',  name: "Т-34 экранированный", tier: 5 },
      30: { id: 'BP_E75TS', name: "E 75 TS",             tier: 8 }
    }
  },

  // ========== РЕФЕРАЛЬНАЯ ПРОГРАММА ==========
  REFERRAL: {
    bonusForInviter: { silver: 5000, gold: 50 },
    bonusForNewbie: { silver: 3000 },
    milestoneRewards: {
      5:  { gold: 100 },
      10: { gold: 250 },
      25: { gold: 750 }
    }
  },

  // ========== РЫНОК ==========
  MARKETPLACE: {
    minBattlesToSellTank: 100,
    feePercent: 0.1
  }
};

// ========== ГЛОБАЛЬНОЕ СОСТОЯНИЕ ИГРЫ ==========
const GameState = {
  // Ресурсы
  XP: 500,
  GOLD: 0,
  SILVER: 5000,
  
  // Танки
  owned: ["T26", "PZ2", "CRUS2", "VAEB", "R35"],
  selected: "T26",
  curNat: "ussr",
  
  // Состояние игры
  gameActive: false,
  controlMode: 'pc',
  pendingBattle: null,
  
  // Игрок и юниты
  player: null,
  units: [],
  bullets: [],
  walls: [],
  particles: [],
  tracks: [],
  
  // Камера
  cam: { x: 0, y: 0 },
  shakeTimer: 0,
  shakeIntensity: 0,
  
  // Бой
  curShell: 0,
  curMap: 'city',
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
  mouse: { x: 0, y: 0 },
  mouseDown: false,
  joystickData: { active: false, dx: 0, dy: 0, angle: 0, mag: 0 },
  mobileFireActive: false,
  
  // Прогресс
  usedPromos: [],
  quest23: { active: true, kills: 0, target: 15, claimed: false },
  inventory: {},
  boosters: { xp: 0, gold: 0, silver: 0 },
  boosterStock: { xp: 0, gold: 0, silver: 0 },
  modules: {},
  upgrades: {},
  upgradesBought: {},
  
  // ✅ МУЛЬТИПЛЕЕР (ВАЖНО!)
  multiplayerMode: false,
  currentRoomId: null,
  multiplayerEnemies: [],
  multiplayerAllies: [],
  otherPlayers: {},

  // Общая статистика (нужна рынку: 100 боёв для продажи коллекционных танков)
  totalBattles: 0,

  // Камуфляжи: { camoId: true } куплены, equippedCamo: { tankId: camoId }
  camos: {},
  equippedCamo: {},

  // Экипаж: { tankId: { commander:{xp,level,perks:[]}, driver:{...}, gunner:{...} } }
  crew: {},

  // Чертежи: { tankId: fragmentsCount }
  blueprints: {},

  // Коллекционные бонусы, которые уже выданы (чтобы не дублировать)
  collectionBonusesClaimed: [],

  // Боевой пропуск
  battlePass: {
    season: 1,
    level: 1,
    xp: 0,
    premium: false,
    claimedFree: [],
    claimedPremium: []
  },

  // Реферальная программа
  referralCode: null,
  referredBy: null,
  referralCount: 0,
  referralClaimedMilestones: [],

  // Рынок
  marketBattlesCache: 0,

  // Новости
  newsLastSeenId: 0
};

// ========== МАСШТАБ ==========
let nodeScale = 1;

function updateScale() {
  const w = window.innerWidth;
  nodeScale = w < 400 ? 0.65 : w < 600 ? 0.75 : w < 900 ? 0.85 : w < 1200 ? 0.95 : 1;
  
  const mm = document.getElementById('minimap');
  if (mm) {
    const sz = Math.min(Math.max(w * 0.12, 80), 180);
    mm.width = sz;
    mm.height = sz;
    mm.style.width = sz + 'px';
    mm.style.height = sz + 'px';
  }
  
  const tc = document.getElementById('tree-canvas');
  if (tc) {
    tc.width = 2200 * nodeScale;
    tc.height = 1100 * nodeScale;
  }
}

window.addEventListener('resize', updateScale);

console.log('✅ config.js загружен');