// ========== КОНФИГУРАЦИЯ ==========

const CONFIG = {
    // Римские цифры для уровней
    TIER_ROMAN: ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"],
    
    // Типы снарядов
    SHELLS: [
        { name: 'ББ', sMul: 1, dMul: 1, color: '#f1c40f', rico: true },
        { name: 'ОФ', sMul: 0.6, dMul: 1.5, color: '#e74c3c', rico: false },
        { name: 'Подкал', sMul: 1.6, dMul: 0.75, color: '#3498db', rico: true }
    ],
    
    // Сообщения экипажа
    CREW_MESSAGES: {
        HIT: ["Есть пробитие!", "Цель поражена!", "Попали!"],
        RICO: ["Рикошет!", "Не пробили!"],
        KILL: ["Враг уничтожен!", "Цель уничтожена!"]
    },
    
    // Названия наций
    NATIONS: {
        ussr: 'СССР',
        germany: 'Германия',
        uk: 'Британия',
        china: 'Китай',
        japan: 'Япония'
    },
    
    // Классы танков
    TANK_CLASSES: {
        lt: 'ЛТ',
        mt: 'СТ',
        ht: 'ТТ',
        td: 'ПТ'
    }
};

// ========== ГЛОБАЛЬНОЕ СОСТОЯНИЕ ==========

const GameState = {
    // Ресурсы игрока
    XP: 500000,
    GOLD: 5000,
    SILVER: 50000,
    
    // Танки
    owned: ["T26", "PZ2", "MED1", "VAEB", "CRUS2"],
    selected: "T26",
    curNat: "ussr",
    
    // Состояние игры
    gameActive: false,
    controlMode: 'pc',
    pendingBattle: null,
    
    // Боевые данные
    player: null,
    units: [],
    bullets: [],
    walls: [],
    particles: [],
    tracks: [],
    
    // Камера и эффекты
    cam: { x: 0, y: 0 },
    shakeTimer: 0,
    shakeIntensity: 0,
    
    // Текущие настройки
    curShell: 0,
    curMap: 'city',
    battleDmg: 0,
    battleKills: 0,
    
    // Расходники
    consumables: [false, false, false],
    adrenalineActive: false,
    adrenalineTimer: 0,
    
    // Ввод
    keys: {},
    mouse: { x: 0, y: 0 },
    mouseDown: false,
    
    // Мобильное управление
    joystickData: { active: false, dx: 0, dy: 0, angle: 0, mag: 0 },
    mobileFireActive: false
};

// Масштаб для дерева танков
let nodeScale = 1;

function updateScale() {
    const w = window.innerWidth;
    nodeScale = w < 400 ? 0.65 : w < 600 ? 0.75 : w < 900 ? 0.85 : w < 1200 ? 0.95 : 1;
    
    const mm = document.getElementById('minimap');
    const sz = Math.min(Math.max(w * 0.12, 80), 180);
    mm.width = sz;
    mm.height = sz;
    mm.style.width = sz + 'px';
    mm.style.height = sz + 'px';
    
    const tc = document.getElementById('tree-canvas');
    tc.width = 2200 * nodeScale;
    tc.height = 1100 * nodeScale;
}

window.addEventListener('resize', updateScale);