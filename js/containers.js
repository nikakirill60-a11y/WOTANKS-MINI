// js/containers.js
console.log('📦 containers.js загружен');

const COLLECTION_DB = {
  OB907: { n: "Объект 907", nat: "ussr", tier: 10, hp: 2100, dmg: 330, s: 1.15, off: 5, vr: 400, camo: 0.22, cls: 'mt', nc: '#ff4444', premium: true, collection: true, desc: "Секретный опытный средний танк." },
  OB279E: { n: "Об. 279 (р)", nat: "ussr", tier: 10, hp: 2600, dmg: 440, s: 1.3, off: 10, vr: 370, camo: 0.08, cls: 'ht', armor: 280, nc: '#ff4444', premium: true, collection: true, desc: "Четырёхгусеничный тяжёлый танк." },
  SU76I: { n: "СУ-76И", nat: "ussr", tier: 3, hp: 400, dmg: 110, s: 0.8, isPT: true, off: 8, vr: 300, camo: 0.4, cls: 'td', armor: 60, nc: '#ff4444', premium: true, collection: true, desc: "Редчайшая ПТ-САУ." },
  BT7A: { n: "БТ-7 арт.", nat: "ussr", tier: 3, hp: 300, dmg: 180, s: 0.75, off: 5, vr: 290, camo: 0.3, cls: 'lt', nc: '#ff4444', premium: true, collection: true, desc: "Лёгкий танк с мощным фугасом." },
  E25: { n: "E 25", nat: "germany", tier: 7, hp: 900, dmg: 150, s: 0.8, isPT: true, mag: 3, reload: 5000, off: 8, vr: 360, camo: 0.5, cls: 'td', nc: '#cc0000', premium: true, collection: true, desc: "Невидимая ПТ с автоматом." },
  PZ2J: { n: "Pz.II J", nat: "germany", tier: 3, hp: 450, dmg: 15, s: 0.7, mag: 4, reload: 3000, off: 5, vr: 260, camo: 0.3, cls: 'lt', armor: 80, nc: '#cc0000', premium: true, collection: true, desc: "Неубиваемый лёгкий танк." },
  KPFPZ70: { n: "KPz 70", nat: "germany", tier: 9, hp: 1800, dmg: 400, s: 1.1, mag: 2, reload: 6000, off: 5, vr: 400, camo: 0.18, cls: 'mt', nc: '#cc0000', premium: true, collection: true, desc: "Ракетный танк (прототип)." },
  CHIEFTAIN: { n: "T95/Chieftain", nat: "uk", tier: 10, hp: 2500, dmg: 440, s: 1.25, off: 5, vr: 400, camo: 0.08, cls: 'ht', armor: 280, nc: '#9b59b6', premium: true, collection: true, desc: "Один из самых желанных танков." },
  SENLAC: { n: "FV1066 Senlac", nat: "uk", tier: 8, hp: 1150, dmg: 240, s: 0.95, off: 5, vr: 410, camo: 0.38, cls: 'lt', nc: '#9b59b6', premium: true, collection: true, desc: "Британский лёгкий танк." },
  TYPE59: { n: "Type 59", nat: "china", tier: 8, hp: 1400, dmg: 260, s: 1.05, off: 5, vr: 380, camo: 0.25, cls: 'mt', armor: 120, nc: '#ff6600', premium: true, collection: true, desc: "Легендарный китайский СТ." },
  TYPE59G: { n: "Type 59 G", nat: "china", tier: 8, hp: 1500, dmg: 280, s: 1.05, off: 5, vr: 380, camo: 0.25, cls: 'mt', armor: 140, nc: '#ffd700', premium: true, collection: true, desc: "Золотой Type 59." },
  BZ176: { n: "BZ176", nat: "china", tier: 8, hp: 1700, dmg: 800, s: 1.3, off: 12, vr: 340, camo: 0.08, cls: 'ht', armor: 180, nc: '#ff6600', premium: true, collection: true, reload: 9000, desc: "Ракетный тяжёлый танк." },
  STBGOLD: { n: "STB-1 Gold", nat: "japan", tier: 10, hp: 2000, dmg: 360, s: 1.15, off: 5, vr: 410, camo: 0.2, cls: 'mt', nc: '#ffd700', premium: true, collection: true, desc: "Золотой японский СТ." },
  NAMELESS: { n: "Nameless", nat: "japan", tier: 9, hp: 2000, dmg: 440, s: 1.2, off: 8, vr: 380, camo: 0.1, cls: 'ht', armor: 200, nc: '#d4a574', premium: true, collection: true, desc: "Безымянный танк." },
  M4A3FL: { n: "M4A3E8 FL", nat: "ussr", tier: 7, hp: 1100, dmg: 35, s: 0.95, off: 5, vr: 350, camo: 0.2, cls: 'mt', nc: '#ff4500', premium: true, collection: true, flame: true, mag: 40, reload: 4000, flameRange: 180, flameCone: 0.4, flameDPS: 35, desc: "Огнемётный Шерман. Струя пламени!" },
  TF3: { n: "TF3", nat: "ussr", tier: 8, hp: 1400, dmg: 45, s: 1.05, off: 8, vr: 360, camo: 0.15, cls: 'ht', nc: '#ff4500', premium: true, collection: true, armor: 120, flame: true, mag: 50, reload: 5000, flameRange: 200, flameCone: 0.35, flameDPS: 45, desc: "Тяжёлый огнемёт. Бронирован!" },
  TF4: { n: "TF4", nat: "ussr", tier: 9, hp: 1750, dmg: 55, s: 1.15, off: 10, vr: 370, camo: 0.12, cls: 'ht', nc: '#ff4500', premium: true, collection: true, armor: 150, flame: true, mag: 60, reload: 5500, flameRange: 220, flameCone: 0.3, flameDPS: 55, desc: "Усиленный огнемёт!" },
  ASTRONFL: { n: "ASTRON FL", nat: "ussr", tier: 10, hp: 2100, dmg: 70, s: 1.2, off: 12, vr: 390, camo: 0.1, cls: 'ht', nc: '#ff4500', premium: true, collection: true, armor: 180, flame: true, mag: 80, reload: 6000, flameRange: 250, flameCone: 0.35, flameDPS: 70, desc: "Апогей огнемётов. Ад на гусеницах!" },
  SHERIDAN: { n: "Sheridan Missile", nat: "ussr", tier: 10, hp: 1800, dmg: 560, s: 1.15, off: 5, vr: 420, camo: 0.35, cls: 'lt', nc: '#00ccff', premium: true, collection: true, missile: true, mag: 1, reload: 12000, desc: "Легендарный ПТУР! Управляйте ракетой курсором мыши." },
  MS11: { n: "МС-11", nat: "ussr", tier: 10, gold: 3000, hp: 1750, dmg: 110, s: 0.8, mag: 11, reload: 12000, off: 0, vr: 350, camo: 0.3, cls: 'mt', nc: '#4a7a3a', premium: true, collection: true, desc: "Советский премиум танк." },
  SPRUT99: { n: "Спрут-99", nat: "ussr", tier: 10, gold: 4999, hp: 1400, dmg: 45, s: 0.85, mag: 99, reload: 1000, off: 5, vr: 360, camo: 0.28, cls: 'mt', nc: '#ff6600', premium: true, collection: true, desc: "Особенный танк с барабаном." },
  WTE100: { n: "WT auf E100", nat: "germany", tier: 10, gold: 2000, hp: 2000, dmg: 490, s: 1.3, mag: 5, off: -12, vr: 400, camo: 0.05, cls: 'td', nc: '#7a7a7a', premium: true, collection: true, desc: "Немецкая ПТ-САУ." },
  MAUSKONIG: { n: "Mausekönig", nat: "germany", tier: 11, gold: 9999, hp: 4000, dmg: 650, s: 1.8, off: 5, vr: 380, camo: 0.02, cls: 'ht', armor: 350, nc: '#7a7a7a', premium: true, collection: true, dualGun: true, dualDelay: 400, reload: 6000, desc: "Король мышей. Двуствольный монстр XI уровня." },
  TYPE5: { n: "Type 5 Heavy", nat: "japan", tier: 10, gold: 5000, hp: 3500, dmg: 900, s: 1.8, reload: 8000, off: 0, vr: 350, camo: 0.02, cls: 'ht', armor: 300, nc: '#d4a574', premium: true, collection: true, desc: "Японский сверхтяжёлый танк." },
  KV220BT: { n: "КВ-220-2 Бета", nat: "ussr", tier: 6, hp: 950, dmg: 160, s: 0.9, off: 5, vr: 330, camo: 0.1, cls: 'ht', nc: '#8e44ad', premium: true, collection: true, armor: 120, desc: "Уникальный танк бета-теста. Недоступен в контейнерах." },
  T3485VIC: { n: "Т-34-85 Победный", nat: "ussr", tier: 6, hp: 950, dmg: 180, s: 1, off: 5, vr: 360, camo: 0.25, cls: 'mt', nc: '#e74c3c', premium: true, collection: true, desc: "Специальная версия в честь 23 февраля. За победу!" },

  // TITAN серия
  TITAN_MK1: { n: "Titan mk.I", nat: "uk", tier: 5, hp: 700, dmg: 130, s: 0.9, off: 5, vr: 340, camo: 0.22, cls: 'mt', nc: '#4a8fb5', premium: true, collection: true, titan: true, mag: 2, reload: 4000, armor: 70, desc: "Титановый корпус. Барабан на 2 снаряда." },
  TITAN_150: { n: "Titan-150", nat: "germany", tier: 6, hp: 1050, dmg: 220, s: 1.1, off: 8, vr: 330, camo: 0.1, cls: 'ht', nc: '#4a8fb5', premium: true, collection: true, titan: true, armor: 140, desc: "Тяжёлый танк с титановой бронёй." },
  TITAN_T3257: { n: "Titan T32 57", nat: "ussr", tier: 6, hp: 850, dmg: 120, s: 0.95, off: 5, vr: 360, camo: 0.25, cls: 'mt', nc: '#4a8fb5', premium: true, collection: true, titan: true, mag: 3, reload: 5000, desc: "Средний танк с 3-снарядным барабаном." },
  TITAN_HND: { n: "Titan H-Nd", nat: "germany", tier: 7, hp: 1350, dmg: 300, s: 1.15, off: 10, vr: 350, camo: 0.08, cls: 'ht', nc: '#4a8fb5', premium: true, collection: true, titan: true, armor: 160, desc: "Тяжёлый Titan с усиленным орудием." },
  TITAN_54D: { n: "Titan-54d", nat: "ussr", tier: 8, hp: 1450, dmg: 300, s: 1.05, off: 5, vr: 390, camo: 0.22, cls: 'mt', nc: '#4a8fb5', premium: true, collection: true, titan: true, desc: "Модернизированный Т-54 с титаном." },
  TITAN_CHARIOTEER: { n: "Titan Charioteer", nat: "uk", tier: 8, hp: 1250, dmg: 420, s: 1, off: 5, vr: 380, camo: 0.3, cls: 'td', nc: '#4a8fb5', premium: true, collection: true, titan: true, isPT: true, desc: "ПТ-САУ Titan. Огромный урон." },
  TITAN_JPANTHER2: { n: "Titan JPanther II", nat: "germany", tier: 8, hp: 1500, dmg: 460, s: 1.15, off: 8, vr: 360, camo: 0.25, cls: 'td', nc: '#4a8fb5', premium: true, collection: true, titan: true, isPT: true, armor: 150, desc: "Бронированная ПТ-САУ серии Titan." },
  TITAN_STRIFE: { n: "Titan Strife", nat: "ussr", tier: 8, hp: 1600, dmg: 340, s: 1.1, off: 5, vr: 370, camo: 0.15, cls: 'ht', nc: '#4a8fb5', premium: true, collection: true, titan: true, armor: 180, desc: "Вершина серии Titan." },

  // === ГЕРМАНИЯ - Малые уровни ===
  LTR: { n: "L.Tr", nat: "germany", tier: 1, hp: 180, dmg: 35, s: 0.65, off: -8, vr: 270, camo: 0.35, cls: 'lt', nc: '#7a7a7a', premium: true, collection: true, mag: 3, reload: 4000, desc: "Лёгкий трактор. Башня сзади, барабан на 3." },
  PZJAG1: { n: "Pz.Jäg. I", nat: "germany", tier: 2, hp: 240, dmg: 80, s: 0.75, isPT: true, off: 10, vr: 280, camo: 0.42, cls: 'td', nc: '#7a7a7a', premium: true, collection: true, desc: "ПТ-САУ 2 уровня." },
  PZ38H: { n: "Pz.38H", nat: "germany", tier: 2, hp: 300, dmg: 35, s: 0.7, off: 5, vr: 290, camo: 0.3, cls: 'lt', armor: 60, nc: '#7a7a7a', premium: true, collection: true, desc: "Бронированный лёгкий танк." },
  GROBTRAKTOR: { n: "Großtraktor", nat: "germany", tier: 3, hp: 380, dmg: 60, s: 0.8, off: 12, vr: 300, camo: 0.25, cls: 'mt', nc: '#7a7a7a', premium: true, collection: true, desc: "Большой трактор. Башня спереди." },
  PZ2G: { n: "Pz.II G", nat: "germany", tier: 3, hp: 340, dmg: 40, s: 0.75, off: 5, vr: 310, camo: 0.35, cls: 'lt', nc: '#7a7a7a', premium: true, collection: true, mag: 2, reload: 3500, desc: "Барабан на 2 снаряда." },
  PZ3A: { n: "Pz.III A", nat: "germany", tier: 3, hp: 360, dmg: 50, s: 0.8, off: 5, vr: 310, camo: 0.28, cls: 'mt', nc: '#7a7a7a', premium: true, collection: true, desc: "Ранняя версия Pz.III." },
  PZ4A: { n: "Pz.IV A", nat: "germany", tier: 3, hp: 370, dmg: 65, s: 0.85, off: 5, vr: 300, camo: 0.25, cls: 'mt', nc: '#7a7a7a', premium: true, collection: true, desc: "Ранняя версия Pz.IV." },
  PZS35: { n: "Pz.S35", nat: "germany", tier: 3, hp: 400, dmg: 55, s: 0.8, off: 5, vr: 320, camo: 0.28, cls: 'mt', armor: 50, nc: '#7a7a7a', premium: true, collection: true, desc: "Трофейный французский танк." },
  T15: { n: "T-15", nat: "germany", tier: 3, hp: 320, dmg: 45, s: 0.75, off: 5, vr: 300, camo: 0.32, cls: 'lt', nc: '#7a7a7a', premium: true, collection: true, desc: "Немецкий лёгкий танк." },

  // === СССР - Малые уровни ===
  MS1: { n: "МС-1", nat: "ussr", tier: 1, hp: 200, dmg: 38, s: 0.65, off: 5, vr: 270, camo: 0.33, cls: 'lt', nc: '#4a7a3a', premium: true, collection: true, desc: "МС-1 обр. 1. Первый советский танк." },
  AT1: { n: "АТ-1", nat: "ussr", tier: 2, hp: 260, dmg: 85, s: 0.75, isPT: true, off: 8, vr: 280, camo: 0.4, cls: 'td', nc: '#4a7a3a', premium: true, collection: true, desc: "ПТ-САУ 2 уровня." },
  TETRARCH: { n: "Тетрарх", nat: "ussr", tier: 2, hp: 230, dmg: 40, s: 0.7, off: 5, vr: 330, camo: 0.38, cls: 'lt', nc: '#4a7a3a', premium: true, collection: true, desc: "Британский ленд-лиз." },
  BTSV: { n: "БТ-СВ", nat: "ussr", tier: 3, hp: 380, dmg: 50, s: 0.8, off: 5, vr: 310, camo: 0.3, cls: 'lt', armor: 55, nc: '#4a7a3a', premium: true, collection: true, desc: "Скоростной бронированный БТ." },
  M3LIGHT: { n: "М3 лёгкий", nat: "ussr", tier: 3, hp: 340, dmg: 45, s: 0.75, off: 5, vr: 320, camo: 0.35, cls: 'lt', nc: '#4a7a3a', premium: true, collection: true, desc: "Американский ленд-лиз." },
  SU76: { n: "СУ-76", nat: "ussr", tier: 3, hp: 280, dmg: 90, s: 0.75, isPT: true, off: -10, vr: 300, camo: 0.42, cls: 'td', nc: '#4a7a3a', premium: true, collection: true, desc: "ПТ с орудием сзади." },
  T127: { n: "Т-127", nat: "ussr", tier: 3, hp: 420, dmg: 48, s: 0.8, off: 5, vr: 300, camo: 0.28, cls: 'lt', armor: 65, nc: '#4a7a3a', premium: true, collection: true, desc: "Бронированный лёгкий танк." },
  T46: { n: "Т-46", nat: "ussr", tier: 3, hp: 330, dmg: 55, s: 0.75, off: 5, vr: 310, camo: 0.32, cls: 'lt', nc: '#4a7a3a', premium: true, collection: true, mag: 2, reload: 3500, desc: "Барабан на 2 снаряда." },
  T7057: { n: "Т-70/57", nat: "ussr", tier: 3, hp: 310, dmg: 65, s: 0.75, off: 8, vr: 320, camo: 0.36, cls: 'lt', nc: '#4a7a3a', premium: true, collection: true, desc: "Башня сбоку." },

  // === БРИТАНИЯ - Малые уровни ===
  CRUS1: { n: "Cruiser I", nat: "uk", tier: 2, hp: 240, dmg: 35, s: 0.7, mag: 2, reload: 3000, off: 5, vr: 310, camo: 0.35, cls: 'lt', nc: '#c2a64a', premium: true, collection: true, desc: "Барабан на 2 снаряда." },
  LIGHTVIC: { n: "Light VIC", nat: "uk", tier: 2, hp: 250, dmg: 38, s: 0.72, mag: 2, reload: 3200, off: 5, vr: 320, camo: 0.36, cls: 'lt', nc: '#c2a64a', premium: true, collection: true, desc: "Барабан на 2 снаряда." },
  UC2PDR: { n: "UC 2-pdr", nat: "uk", tier: 2, hp: 220, dmg: 75, s: 0.7, isPT: true, off: 10, vr: 290, camo: 0.42, cls: 'td', nc: '#c2a64a', premium: true, collection: true, desc: "ПТ-САУ 2 уровня." },

  // === ФРАНЦИЯ - Малые уровни ===
  D1: { n: "D1", nat: "france", tier: 2, hp: 280, dmg: 42, s: 0.75, off: 5, vr: 290, camo: 0.28, cls: 'lt', armor: 45, nc: '#2c3e80', premium: true, collection: true, desc: "Французский лёгкий танк." },
  FTAC: { n: "FT AC", nat: "france", tier: 2, hp: 230, dmg: 80, s: 0.7, isPT: true, off: 12, vr: 280, camo: 0.4, cls: 'td', nc: '#2c3e80', premium: true, collection: true, desc: "ПТ-САУ 2 уровня." },

  // === НОВЫЕ ТАНКИ БОЕВОГО ПРОПУСКА (Интегрированы сюда) ===
  PZ2D: { n: "Pz.Kpfw. II Ausf. D", nat: "germany", tier: 2, hp: 280, dmg: 40, s: .75, off: 5, vr: 300, camo: .35, cls: 'lt', nc: '#ffd700', premium: true, collection: true, desc: "Награда 1-го уровня премиум ветки боевого пропуска." },
  T34E: { n: "Т-34 экранированный", nat: "ussr", tier: 5, hp: 700, dmg: 90, s: .95, off: 5, vr: 340, camo: .25, cls: 'mt', armor: 75, nc: '#ffd700', premium: true, collection: true, desc: "Награда 15-го уровня премиум ветки боевого пропуска." },
  E75TS: { n: "E 75 TS", nat: "germany", tier: 8, hp: 1600, dmg: 360, s: 1.25, off: 5, vr: 380, camo: .08, cls: 'ht', armor: 155, nc: '#ffd700', premium: true, collection: true, desc: "Главная награда 30-го уровня премиум ветки боевого пропуска." }
};

const CONTAINERS = {
  basic: { 
    name: "Базовый", 
    icon: "📦", 
    cost: { silver: 25000 }, 
    color: "#7f8c8d", 
    desc: "Серебро, опыт или редкая техника",
    drops: [
      { type: 'silver', amount: [5000, 15000], weight: 35, label: "Серебро" }, 
      { type: 'xp', amount: [2000, 8000], weight: 25, label: "Опыт" }, 
      { type: 'gold', amount: [50, 200], weight: 15, label: "Золото" }, 
      { type: 'tank', pool: 'common', weight: 15, label: "Обычная техника" }, 
      { type: 'tank', pool: 'rare', weight: 8, label: "Редкая техника" }, 
      { type: 'tank', pool: 'legendary', weight: 2, label: "Легенда!" }
    ] 
  },
  premium: { 
    name: "Премиум", 
    icon: "🎁", 
    cost: { gold: 500 }, 
    color: "#f39c12", 
    desc: "Повышенный шанс на редкую технику + 0.1% Mausekönig",
    drops: [
      { type: 'silver', amount: [15000, 40000], weight: 20, label: "Серебро" }, 
      { type: 'xp', amount: [5000, 20000], weight: 15, label: "Опыт" }, 
      { type: 'gold', amount: [200, 600], weight: 15, label: "Золото" }, 
      { type: 'tank', pool: 'common', weight: 10, label: "Обычная техника" }, 
      { type: 'tank', pool: 'rare', weight: 24.9, label: "Редкая техника" }, 
      { type: 'tank', pool: 'legendary', weight: 15, label: "Легенда!" },
      { type: 'tank', pool: 'mauskonig', weight: 0.1, label: "👑 MAUSEKÖNIG XI!" }
    ] 
  },
  legendary: { 
    name: "Легендарный", 
    icon: "💎", 
    cost: { gold: 1500 }, 
    color: "#9b59b6", 
    desc: "Гарантия редкой или легендарной!",
    drops: [
      { type: 'gold', amount: [500, 1500], weight: 15, label: "Золото" }, 
      { type: 'tank', pool: 'rare', weight: 40, label: "Редкая техника" }, 
      { type: 'tank', pool: 'legendary', weight: 40, label: "Легенда!" }, 
      { type: 'tank', pool: 'missile', weight: 5, label: "🚀 Sheridan!" }
    ] 
  },
  event: { 
    name: "Ивентовый", 
    icon: "🎪", 
    cost: { silver: 50000 }, 
    color: "#e74c3c", 
    desc: "Специальный контейнер!",
    drops: [
      { type: 'silver', amount: [10000, 30000], weight: 15, label: "Серебро" }, 
      { type: 'xp', amount: [10000, 30000], weight: 10, label: "Опыт" }, 
      { type: 'gold', amount: [300, 800], weight: 15, label: "Золото" }, 
      { type: 'tank', pool: 'rare', weight: 30, label: "Редкая техника" }, 
      { type: 'tank', pool: 'legendary', weight: 30, label: "Легенда!" }
    ] 
  },
  flamebox: { 
    name: "Танко-Жарка", 
    icon: "🔥", 
    cost: { gold: 2000 }, 
    color: "#ff4500", 
    desc: "99% Золота, 1% Огнемёт!",
    drops: [
      { type: 'gold', amount: [300, 1000], weight: 99, label: "Золото" }, 
      { type: 'tank', pool: 'flame', weight: 1, label: "🔥 Огнемётный танк!" }
    ] 
  },
  titanbox: { 
    name: "Titan Box", 
    icon: "⚙️", 
    cost: { gold: 1200 }, 
    color: "#4a8fb5", 
    desc: "Эксклюзивная серия Titan! 5% шанс на танк.",
    drops: [
      { type: 'gold', amount: [200, 800], weight: 50, label: "Золото" }, 
      { type: 'silver', amount: [20000, 60000], weight: 25, label: "Серебро" }, 
      { type: 'xp', amount: [5000, 20000], weight: 20, label: "Опыт" }, 
      { type: 'tank', pool: 'titan', weight: 5, label: "⚙️ Titan танк!" }
    ] 
  },
  lowlevels: {
    name: "Малые уровни",
    icon: "🪖",
    cost: { gold: 250 },
    color: "#95a5a6",
    desc: "Эксклюзивные танки 1-3 уровня!",
    drops: [
      { type: 'gold', amount: [50, 150], weight: 30, label: "Золото" },
      { type: 'silver', amount: [5000, 15000], weight: 25, label: "Серебро" },
      { type: 'tank', pool: 'lowlevels', weight: 45, label: "🪖 Малый уровень!" }
    ]
  }
};

const DROP_POOLS = { 
  common: [], 
  rare: [], 
  legendary: [], 
  flame: [], 
  missile: ['SHERIDAN'], 
  titan: [],
  mauskonig: ['MAUSKONIG'],
  lowlevels: []
};

function initContainers() {
  const activeDB = window.DB || (typeof DB !== 'undefined' ? DB : null);
  if (!activeDB) {
    console.warn("⚠️ База данных техники DB еще не готова. Инициализация контейнеров отложена.");
    return;
  }

  for (let id in COLLECTION_DB) {
    activeDB[id] = COLLECTION_DB[id];
  }
  
  for (let id in COLLECTION_DB) {
    if (id === 'KV220BT' || id === 'T3485VIC') continue;
    const t = COLLECTION_DB[id];
    
    if (id === 'MAUSKONIG') {
      DROP_POOLS.mauskonig.push(id);
      continue;
    }
    
    if (t.tier <= 3 && (
      id === 'LTR' || id === 'PZJAG1' || id === 'PZ38H' || id === 'GROBTRAKTOR' || 
      id === 'PZ2G' || id === 'PZ2J' || id === 'PZ3A' || id === 'PZ4A' || id === 'PZS35' || 
      id === 'T15' || id === 'MS1' || id === 'AT1' || id === 'TETRARCH' || id === 'BT7A' || 
      id === 'BTSV' || id === 'M3LIGHT' || id === 'SU76' || id === 'SU76I' || id === 'T127' || 
      id === 'T46' || id === 'T7057' || id === 'CRUS1' || id === 'LIGHTVIC' || id === 'UC2PDR' || 
      id === 'D1' || id === 'FTAC'
    )) {
      DROP_POOLS.lowlevels.push(id);
      continue;
    }
    
    if (t.titan) DROP_POOLS.titan.push(id);
    else if (t.flame) DROP_POOLS.flame.push(id);
    else if (id === 'SHERIDAN') DROP_POOLS.missile.push(id);
    else if (t.tier <= 5) DROP_POOLS.common.push(id);
    else if (t.tier <= 8) DROP_POOLS.rare.push(id);
    else DROP_POOLS.legendary.push(id);
  }
}

function getRarityColor(tier) {
  if (tier >= 11) return "#ff00ff";
  if (tier >= 9) return "#9b59b6";
  if (tier >= 6) return "#3498db";
  return "#2ecc71";
}

function getRarityName(tier) {
  if (tier >= 11) return "ЭКСКЛЮЗИВ";
  if (tier >= 9) return "ЛЕГЕНДАРНАЯ";
  if (tier >= 6) return "РЕДКАЯ";
  return "ОБЫЧНАЯ";
}

function randomRange(a, b) { 
  return Math.floor(Math.random() * (b - a + 1)) + a; 
}

function openContainerDirect(cid) {
  const c = CONTAINERS[cid]; 
  if (!c) return null;
  
  const tw = c.drops.reduce((s, d) => s + d.weight, 0);
  let roll = Math.random() * tw;
  let sel = c.drops[0];
  
  for (let d of c.drops) { 
    roll -= d.weight; 
    if (roll <= 0) { 
      sel = d; 
      break; 
    } 
  }
  
  const rwd = { type: sel.type, label: sel.label };
  
  if (sel.type === 'silver') {
    const a = randomRange(sel.amount[0], sel.amount[1]); 
    GameState.SILVER += a;
    rwd.amount = a; 
    rwd.display = a + " ₽"; 
    rwd.icon = "💰"; 
    rwd.color = "#bdc3c7";
  }
  else if (sel.type === 'xp') {
    const a = randomRange(sel.amount[0], sel.amount[1]); 
    GameState.XP += a;
    rwd.amount = a; 
    rwd.display = a + " XP"; 
    rwd.icon = "⭐"; 
    rwd.color = "#3498db";
  }
  else if (sel.type === 'gold') {
    const a = randomRange(sel.amount[0], sel.amount[1]); 
    GameState.GOLD += a;
    rwd.amount = a; 
    rwd.display = a + " G"; 
    rwd.icon = "🪙"; 
    rwd.color = "#f1c40f";
  }
  else if (sel.type === 'tank') {
    const pool = DROP_POOLS[sel.pool] || [];
    const avail = pool.filter(id => !GameState.owned.includes(id));
    
    if (!avail.length) {
      const comp = sel.pool === 'mauskonig' ? 10000 : 
                   sel.pool === 'legendary' ? 1000 : 
                   sel.pool === 'flame' ? 1500 : 
                   sel.pool === 'missile' ? 2000 : 
                   sel.pool === 'titan' ? 1500 : 
                   sel.pool === 'lowlevels' ? 300 :
                   sel.pool === 'rare' ? 500 : 200;
      GameState.GOLD += comp;
      rwd.type = 'compensation'; 
      rwd.display = comp + " G (компенсация)"; 
      rwd.icon = "🔄"; 
      rwd.color = "#f39c12"; 
      rwd.desc = "Все танки из пула уже есть!";
    } else {
      const tid = avail[Math.floor(Math.random() * avail.length)]; 
      const td = activeDB[tid] || COLLECTION_DB[tid];
      GameState.owned.push(tid);
      rwd.tankId = tid;
      rwd.display = td.n + " [" + (CONFIG.TIER_ROMAN[td.tier] || "XI") + "]";
      
      if (tid === 'MAUSKONIG') {
        rwd.icon = "👑";
        rwd.color = "#ffd700";
        rwd.desc = "ЛЕГЕНДАРНЫЙ ДВУСТВОЛЬНЫЙ ТАНК XI УРОВНЯ!";
        rwd.rarity = "КОРОЛЬ МЫШЕЙ";
        rwd.isMauskonig = true;
      } else {
        rwd.icon = td.flame ? "🔥" : (td.missile ? "🚀" : (td.titan ? "⚙️" : "🎖️"));
        rwd.color = td.flame ? "#ff4500" : (td.missile ? "#00ccff" : (td.titan ? "#4a8fb5" : getRarityColor(td.tier)));
        rwd.desc = td.desc || "";
        rwd.rarity = td.flame ? "ОГНЕМЁТНЫЙ" : (td.missile ? "ПТУР" : (td.titan ? "TITAN" : getRarityName(td.tier)));
      }
      
      rwd.isFlame = td.flame || false;
      rwd.isTitan = td.titan || false;
    }
  }
  
  updateResources(); 
  return rwd;
}

let containerAnimating = false;

function showContainerShop() {
  document.getElementById('container-modal').classList.add('show');
  renderContainerGrid();
  updateInvCount();
}

function hideContainerShop() { 
  document.getElementById('container-modal').classList.remove('show'); 
}

function switchTab(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active')); 
  btn.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active-tab'));
  document.getElementById('tab-' + tab).classList.add('active-tab');
  
  if (tab === 'shop') renderContainerGrid();
  if (tab === 'inventory') renderInventoryGrid();
  if (tab === 'collection') renderCollectionGrid();
}

function openInventoryTab() {
  showContainerShop();
  setTimeout(() => {
    const btn = document.querySelectorAll('.modal-tab')[1];
    if (btn) switchTab('inventory', btn);
  }, 50);
}

function getInvTotal() {
  let total = 0;
  for (let cid in GameState.inventory) total += GameState.inventory[cid];
  return total;
}

function updateInvCount() {
  const el = document.getElementById('inv-count');
  if (el) el.innerText = getInvTotal();
  const badge = document.getElementById('inv-top-badge');
  if (badge) {
    const t = getInvTotal();
    badge.style.display = t > 0 ? 'flex' : 'none';
    badge.innerText = t;
  }
}

function buyContainer(cid) {
  if (containerAnimating) return;
  const c = CONTAINERS[cid]; 
  if (!c) return;
  
  if (c.cost.silver && GameState.SILVER < c.cost.silver) { 
    alert("Недостаточно серебра!"); 
    return; 
  }
  if (c.cost.gold && GameState.GOLD < c.cost.gold) { 
    alert("Недостаточно золота!"); 
    return; 
  }
  
  if (c.cost.silver) GameState.SILVER -= c.cost.silver;
  if (c.cost.gold) GameState.GOLD -= c.cost.gold;
  
  if (!GameState.inventory[cid]) GameState.inventory[cid] = 0;
  GameState.inventory[cid]++;
  
  updateResources();
  updateInvCount();
  renderContainerGrid();
  saveProgress();
  showInvNotification(c.name, c.icon);
}

function openFromInventory(cid) {
  if (containerAnimating) return;
  if (!GameState.inventory[cid] || GameState.inventory[cid] <= 0) return;
  
  GameState.inventory[cid]--;
  if (GameState.inventory[cid] <= 0) delete GameState.inventory[cid];
  
  const rwd = openContainerDirect(cid);
  if (!rwd) return;
  
  showOpenAnim(cid, rwd);
  updateInvCount();
  saveProgress();
}

function openAllFromInventory(cid) {
  if (containerAnimating) return;
  const count = GameState.inventory[cid] || 0;
  if (count <= 0) return;
  if (count > 10 && !confirm("Открыть " + count + " контейнеров?")) return;
  
  let results = [];
  for (let i = 0; i < count; i++) {
    const rwd = openContainerDirect(cid);
    if (rwd) results.push(rwd);
  }
  
  delete GameState.inventory[cid];
  showBulkOpenResults(results, CONTAINERS[cid]);
  updateInvCount();
  renderInventoryGrid();
  saveProgress();
}

function showInvNotification(name, icon) {
  const notif = document.createElement('div');
  notif.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.9);border:2px solid #2ecc71;border-radius:10px;padding:20px 30px;z-index:9999;text-align:center;animation:invNotif 1.5s forwards;pointer-events:none;';
  notif.innerHTML = '<div style="font-size:40px">' + icon + '</div><div style="color:#2ecc71;font-weight:bold;margin-top:5px">В инвентарь!</div><div style="color:#aaa;font-size:12px">' + name + '</div>';
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 1500);
}

function showBulkOpenResults(results, container) {
  const ov = document.getElementById('container-opening');
  ov.classList.add('show');
  ov.classList.remove('flame-opening', 'titan-opening');
  ov.style.background = '';
  
  const ac = document.getElementById('anim-container');
  const rd = document.getElementById('reward-display');
  ac.style.display = 'none';
  rd.style.display = 'flex';
  
  let silverTotal = 0, goldTotal = 0, xpTotal = 0;
  let tanks = [];
  
  results.forEach(r => {
    if (r.type === 'silver') silverTotal += (r.amount || 0);
    else if (r.type === 'gold' || r.type === 'compensation') goldTotal += (r.amount || 0);
    else if (r.type === 'xp') xpTotal += (r.amount || 0);
    if (r.tankId) tanks.push(r);
  });
  
  let html = '<div class="rwd-glow" style="color:#f1c40f;max-width:400px">';
  html += '<div class="rwd-icon">📦×' + results.length + '</div>';
  html += '<div class="rwd-text" style="color:#f1c40f;font-size:20px">Открыто ' + results.length + ' контейнеров!</div>';
  html += '<div style="text-align:left;width:100%;font-size:13px;line-height:2">';
  
  if (silverTotal > 0) html += '<div>💰 Серебро: <span style="color:#bdc3c7">+' + silverTotal + ' ₽</span></div>';
  if (goldTotal > 0) html += '<div>🪙 Золото: <span style="color:#f1c40f">+' + goldTotal + ' G</span></div>';
  if (xpTotal > 0) html += '<div>⭐ Опыт: <span style="color:#3498db">+' + xpTotal + ' XP</span></div>';
  
  if (tanks.length > 0) {
    html += '<div style="margin-top:8px;border-top:1px solid #333;padding-top:5px;font-weight:bold;color:#2ecc71">🎖️ Танки:</div>';
    tanks.forEach(t => { 
      html += '<div style="color:' + t.color + '">' + t.icon + ' ' + t.display + '</div>'; 
    });
  }
  
  html += '</div></div>';
  html += '<button class="btn rwd-collect" onclick="collectReward()">OK</button>';
  rd.innerHTML = html;
  containerAnimating = true;
}

function renderContainerGrid() {
  const g = document.getElementById('container-grid'); 
  if (!g) return; 
  g.innerHTML = '';
  
  for (let id in CONTAINERS) {
    const c = CONTAINERS[id]; 
    const costTxt = c.cost.gold ? c.cost.gold + ' G' : c.cost.silver + ' ₽';
    const ok = c.cost.gold ? GameState.GOLD >= c.cost.gold : GameState.SILVER >= c.cost.silver;
    const tw = c.drops.reduce((s, d) => s + d.weight, 0);
    
    const isF = id === 'flamebox';
    const isT = id === 'titanbox';
    const isLL = id === 'lowlevels';
    
    const card = document.createElement('div');
    card.className = 'c-card' + (ok ? '' : ' no-money') + 
      (isF ? ' flame-card' : '') + 
      (isT ? ' titan-card' : '') +
      (isLL ? ' lowlevels-card' : '');
    card.style.borderColor = c.color;
    
    let extra = '';
    
    if (isF) {
      const ft = Object.keys(COLLECTION_DB).filter(i => COLLECTION_DB[i].flame);
      extra = '<div class="flame-subtitle">🔥 ЭКСКЛЮЗИВ 🔥</div><div class="flame-preview">' + 
        ft.map(i => { 
          const t = COLLECTION_DB[i]; 
          const h = GameState.owned.includes(i); 
          return '<div class="flame-tank-row ' + (h ? 'owned' : '') + '">' +
            '<span class="flame-tier">' + CONFIG.TIER_ROMAN[t.tier] + '</span>' +
            '<span class="flame-name">' + (h ? t.n : '???') + '</span>' +
            '<span class="flame-status">' + (h ? '✅' : '🔒') + '</span>' +
            '</div>'; 
        }).join('') + '</div>';
    }
    
    if (isT) {
      const tt = Object.keys(COLLECTION_DB).filter(i => COLLECTION_DB[i].titan);
      extra = '<div class="titan-subtitle">⚙️ TITAN СЕРИЯ ⚙️</div><div class="titan-preview">' + 
        tt.map(i => { 
          const t = COLLECTION_DB[i]; 
          const h = GameState.owned.includes(i); 
          return '<div class="titan-tank-row ' + (h ? 'owned' : '') + '">' +
            '<span class="titan-tier">' + CONFIG.TIER_ROMAN[t.tier] + '</span>' +
            '<span class="titan-name">' + (h ? t.n : '???') + '</span>' +
            '<span class="titan-status">' + (h ? '✅' : '🔒') + '</span>' +
            '</div>'; 
        }).join('') + '</div>';
    }
    
    const invQty = GameState.inventory[id] || 0;
    const invInfo = invQty > 0 ? '<div style="font-size:11px;color:#2ecc71;margin:2px 0">В инвентаре: ' + invQty + ' шт.</div>' : '';
    
    card.innerHTML = 
      '<div class="c-icon" style="text-shadow:0 0 15px ' + c.color + '">' + c.icon + '</div>' +
      '<div class="c-name" style="color:' + c.color + '">' + c.name + '</div>' + 
      extra + 
      '<div class="c-desc">' + c.desc + '</div>' +
      '<div class="c-drops">' + 
        c.drops.map(d => 
          '<div class="c-drop-row">' +
            '<span>' + d.label + '</span>' +
            '<span class="c-pct">' + Math.round(d.weight / tw * 100) + '%</span>' +
          '</div>'
        ).join('') + 
      '</div>' + 
      invInfo + 
      '<div class="c-cost ' + (ok ? '' : 'red') + '">' + costTxt + '</div>' +
      '<button class="btn c-buy" ' + (ok ? '' : 'disabled') + ' style="background:' + c.color + '" onclick="buyContainer(\'' + id + '\')">КУПИТЬ</button>';
    
    g.appendChild(card);
  }
}

function renderInventoryGrid() {
  const g = document.getElementById('inventory-grid'); 
  if (!g) return;
  const empty = document.getElementById('inventory-empty'); 
  if (!empty) return;
  
  g.innerHTML = '';
  const total = getInvTotal();
  
  if (total === 0) {
    empty.style.display = 'block';
    g.style.display = 'none';
    return;
  }
  
  empty.style.display = 'none';
  g.style.display = 'flex';
  
  for (let cid in GameState.inventory) {
    const qty = GameState.inventory[cid];
    if (qty <= 0) continue;
    
    const c = CONTAINERS[cid];
    if (!c) continue;
    
    const isF = cid === 'flamebox';
    const isT = cid === 'titanbox';
    const isLL = cid === 'lowlevels';
    
    const card = document.createElement('div');
    card.className = 'inv-card' + 
      (isF ? ' flame-inv' : '') + 
      (isT ? ' titan-inv' : '') +
      (isLL ? ' lowlevels-inv' : '');
    card.style.borderColor = c.color;
    
    card.innerHTML = 
      '<div class="inv-qty">' + qty + '</div>' +
      '<div class="inv-icon" style="text-shadow:0 0 20px ' + c.color + '">' + c.icon + '</div>' +
      '<div class="inv-name" style="color:' + c.color + '">' + c.name + '</div>' +
      '<button class="btn inv-open" style="background:' + c.color + '" onclick="openFromInventory(\'' + cid + '\')">ОТКРЫТЬ 1</button>' + 
      (qty > 1 ? '<button class="btn inv-open-all" onclick="openAllFromInventory(\'' + cid + '\')">ОТКРЫТЬ ВСЕ (' + qty + ')</button>' : '');
    
    g.appendChild(card);
  }
}

function showOpenAnim(cid, rwd) {
  containerAnimating = true; 
  const c = CONTAINERS[cid];
  
  const isF = cid === 'flamebox' || rwd.isFlame;
  const isT = cid === 'titanbox' || rwd.isTitan;
  const isMK = rwd.isMauskonig || false;
  
  const ov = document.getElementById('container-opening'); 
  ov.classList.add('show');
  ov.classList.remove('flame-opening', 'titan-opening');
  ov.style.background = '';
  
  if (isF) ov.classList.add('flame-opening');
  if (isT) ov.classList.add('titan-opening');
  if (isMK) ov.style.background = 'radial-gradient(ellipse at center, rgba(60, 50, 0, 0.98), rgba(0, 0, 0, 0.99))';
  
  const ac = document.getElementById('anim-container');
  const rd = document.getElementById('reward-display');
  rd.style.display = 'none'; 
  ac.style.display = 'flex';
  
  ac.innerHTML = '<div class="op-box ' + 
    (isF ? 'flame-box' : '') + 
    (isT ? ' titan-box' : '') + 
    '" style="border-color:' + c.color + ';box-shadow:0 0 25px ' + c.color + '">' +
    '<span class="op-icon">' + c.icon + '</span>' +
    '</div>';
  
  const box = ac.querySelector('.op-box');
  
  setTimeout(() => box.classList.add('shake'), 200);
  
  setTimeout(() => {
    box.classList.remove('shake'); 
    box.classList.add('glow');
    box.style.boxShadow = '0 0 50px ' + rwd.color + ',0 0 100px ' + rwd.color;
    if (isF) box.classList.add('flame-glow');
    if (isT) box.classList.add('titan-glow');
  }, 1500);
  
  setTimeout(() => { 
    box.classList.add('explode'); 
    setTimeout(() => {
      ac.style.display = 'none'; 
      rd.style.display = 'flex';
      
      const rb = rwd.rarity ? '<div class="rwd-rarity" style="background:' + rwd.color + '">' + rwd.rarity + '</div>' : '';
      const tc = rwd.tankId ? '<canvas id="rwd-tank-cvs" width="180" height="100"></canvas>' : '';
      const ff = rwd.isFlame ? '<div class="flame-reward-fx">🔥🔥🔥</div>' : '';
      const tf = rwd.isTitan ? '<div class="titan-reward-fx">⚙️⚙️⚙️</div>' : '';
      const mkf = rwd.isMauskonig ? '<div class="mauskonig-fx">👑👑👑</div>' : '';
      
      const glowClass = rwd.isFlame ? 'flame-reward' : 
                        (rwd.isTitan ? 'titan-reward' : 
                        (rwd.isMauskonig ? 'mauskonig-reward' : ''));
      
      rd.innerHTML = '<div class="rwd-glow ' + glowClass + '" style="color:' + rwd.color + '">' + 
        rb + ff + tf + mkf +
        '<div class="rwd-icon">' + rwd.icon + '</div>' + tc + 
        '<div class="rwd-text" style="color:' + rwd.color + '">' + rwd.display + '</div>' + 
        (rwd.desc ? '<div class="rwd-desc">' + rwd.desc + '</div>' : '') + 
        '</div><button class="btn rwd-collect" onclick="collectReward()">ЗАБРАТЬ</button>';
      
      if (rwd.tankId) setTimeout(() => { 
        const cv = document.getElementById('rwd-tank-cvs'); 
        if (cv) drawTankIcon(cv, rwd.tankId); 
      }, 50);
    }, 400); 
  }, 2500);
}

function collectReward() {
  containerAnimating = false;
  document.getElementById('container-opening').classList.remove('show');
  document.getElementById('container-opening').classList.remove('flame-opening');
  document.getElementById('container-opening').classList.remove('titan-opening');
  document.getElementById('container-opening').style.background = '';
  renderContainerGrid();
  renderInventoryGrid();
  renderCarousel();
  renderTree();
  updateResources();
  updateInvCount();
}

function renderCollectionGrid() {
  const g = document.getElementById('collection-grid'); 
  if (!g) return; 
  g.innerHTML = '';
  
  const total = Object.keys(COLLECTION_DB).length;
  const oc = Object.keys(COLLECTION_DB).filter(id => GameState.owned.includes(id)).length;
  
  const st = document.createElement('div'); 
  st.className = 'coll-stats';
  st.innerHTML = '<div class="coll-bar"><div class="coll-fill" style="width:' + 
    (total > 0 ? oc / total * 100 : 0) + '%"></div></div>' +
    '<div class="coll-text">Собрано: ' + oc + '/' + total + ' (' + 
    (total > 0 ? Math.round(oc / total * 100) : 0) + '%)</div>';
  g.appendChild(st);

  const ft = Object.keys(COLLECTION_DB).filter(id => 
    COLLECTION_DB[id].flame || COLLECTION_DB[id].missile || 
    COLLECTION_DB[id].tier > 10 || id === 'T3485VIC'
  );
  
  if (ft.length) {
    const h = document.createElement('div'); 
    h.className = 'coll-nat-hdr flame-hdr'; 
    h.innerHTML = '⭐ СПЕЦИАЛЬНЫЕ ТАНКИ ⭐'; 
    g.appendChild(h);
    const gr = document.createElement('div'); 
    gr.className = 'coll-nat-grid';
    ft.sort((a, b) => COLLECTION_DB[a].tier - COLLECTION_DB[b].tier).forEach(id => gr.appendChild(mkCollCard(id)));
    g.appendChild(gr);
  }

  const titanTanks = Object.keys(COLLECTION_DB).filter(id => COLLECTION_DB[id].titan);
  if (titanTanks.length) {
    const h = document.createElement('div'); 
    h.className = 'coll-nat-hdr titan-hdr'; 
    h.innerHTML = '⚙️ СЕРИЯ TITAN ⚙️'; 
    g.appendChild(h);
    const gr = document.createElement('div'); 
    gr.className = 'coll-nat-grid';
    titanTanks.sort((a, b) => COLLECTION_DB[a].tier - COLLECTION_DB[b].tier).forEach(id => gr.appendChild(mkCollCard(id)));
    g.appendChild(gr);
  }

  const lowLevelTanks = Object.keys(COLLECTION_DB).filter(id => 
    COLLECTION_DB[id].tier <= 3 && 
    !COLLECTION_DB[id].flame && 
    !COLLECTION_DB[id].missile && 
    !COLLECTION_DB[id].titan && 
    id !== 'T3485VIC'
  );
  
  if (lowLevelTanks.length) {
    const h = document.createElement('div'); 
    h.className = 'coll-nat-hdr'; 
    h.style.color = '#95a5a6';
    h.innerHTML = '🪖 МАЛЫЕ УРОВНИ 🪖'; 
    g.appendChild(h);
    const gr = document.createElement('div'); 
    gr.className = 'coll-nat-grid';
    lowLevelTanks.sort((a, b) => COLLECTION_DB[a].tier - COLLECTION_DB[b].tier).forEach(id => gr.appendChild(mkCollCard(id)));
    g.appendChild(gr);
  }

  ['ussr', 'germany', 'france', 'uk', 'china', 'japan'].forEach(nat => {
    const tanks = Object.keys(COLLECTION_DB).filter(id =>
      COLLECTION_DB[id].nat === nat &&
      !COLLECTION_DB[id].flame &&
      !COLLECTION_DB[id].missile &&
      !COLLECTION_DB[id].titan &&
      COLLECTION_DB[id].tier > 3 &&
      COLLECTION_DB[id].tier <= 10 &&
      id !== 'T3485VIC'
    );
    if (!tanks.length) return;
    const h = document.createElement('div'); 
    h.className = 'coll-nat-hdr'; 
    h.innerText = CONFIG.NATIONS[nat]; 
    g.appendChild(h);
    const gr = document.createElement('div'); 
    gr.className = 'coll-nat-grid';
    tanks.sort((a, b) => COLLECTION_DB[a].tier - COLLECTION_DB[b].tier).forEach(id => gr.appendChild(mkCollCard(id)));
    g.appendChild(gr);
  });
}

function mkCollCard(id) {
  const t = COLLECTION_DB[id]; 
  const has = GameState.owned.includes(id);
  const card = document.createElement('div');
  card.className = 'coll-card ' + (has ? 'owned' : 'locked') + 
    (t.flame ? ' flame-coll' : '') + 
    (t.titan ? ' titan-coll' : '');
  
  const border = t.flame ? '#ff4500' : 
                 (t.missile ? '#00ccff' : 
                 (t.titan ? '#4a8fb5' : 
                 (t.dualGun ? '#ffd700' : getRarityColor(t.tier))));
  card.style.borderColor = has ? border : '#333';
  
  const typeLabel = t.flame ? 'ОГНЕМЁТ' : 
                    (t.missile ? 'ПТУР' : 
                    (t.titan ? 'TITAN' : 
                    (t.dualGun ? 'ДВУСТВОЛ' : getRarityName(t.tier))));
  
  const clsLabel = t.flame ? '🔥 ОТ' : 
                   (t.missile ? '🚀 ЛТ' : 
                   (t.titan ? '⚙️ ' + CONFIG.TANK_CLASSES[t.cls || 'mt'] : 
                   (t.dualGun ? '👑 ' + CONFIG.TANK_CLASSES[t.cls || 'mt'] :
                   CONFIG.TANK_CLASSES[t.cls || 'mt'])));
  
  card.innerHTML = '<div class="cc-hdr">' +
    '<span class="cc-tier" style="color:' + border + '">' + (CONFIG.TIER_ROMAN[t.tier] || "XI") + '</span>' +
    '<span class="cc-rar" style="color:' + border + '">' + typeLabel + '</span>' +
    '</div>' +
    '<div class="cc-body"><canvas class="cc-cvs" width="110" height="60"></canvas></div>' +
    '<div class="cc-name ' + (has ? '' : 'lk') + '">' + (has ? t.n : '???') + '</div>' +
    '<div class="cc-cls">' + clsLabel + '</div>' + 
    (has && t.desc ? '<div class="cc-desc">' + t.desc + '</div>' : '') + 
    (!has ? '<div class="cc-lock">' + 
      (t.flame ? '🔥' : (t.missile ? '🚀' : (t.titan ? '⚙️' : (t.dualGun ? '👑' : '🔒')))) + 
      '</div>' : '');
  
  setTimeout(() => {
    const cv = card.querySelector('.cc-cvs');
    if (cv && has) drawTankIcon(cv, id);
    else if (cv) {
      const cx = cv.getContext('2d'); 
      cx.fillStyle = '#222'; 
      cx.fillRect(0, 0, cv.width, cv.height);
      cx.fillStyle = t.flame ? '#ff4500' : 
                     (t.missile ? '#00ccff' : 
                     (t.titan ? '#4a8fb5' : 
                     (t.dualGun ? '#ffd700' : '#444')));
      cx.font = '30px Arial'; 
      cx.textAlign = 'center';
      cx.fillText(t.flame ? '🔥' : (t.missile ? '🚀' : (t.titan ? '⚙️' : (t.dualGun ? '👑' : '?'))), 
                  cv.width / 2, cv.height / 2 + 10);
    }
  }, 30);
  return card;
}

window.renderContainerGrid = renderContainerGrid;
window.renderInventoryGrid = renderInventoryGrid;
window.renderCollectionGrid = renderCollectionGrid;
window.showContainerShop = showContainerShop;
window.hideContainerShop = hideContainerShop;
window.switchTab = switchTab;
window.buyContainer = buyContainer;
window.openFromInventory = openFromInventory;
window.openAllFromInventory = openAllFromInventory;
window.collectReward = collectReward;
window.updateInvCount = updateInvCount;
window.openInventoryTab = openInventoryTab;

initContainers();
console.log('📦 containers.js полностью загружен');