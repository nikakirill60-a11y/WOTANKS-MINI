// ========== БАЗА ДАННЫХ ТАНКОВ ==========

const DB = {
    // === СССР ===
    T26: { n: "Т-26", x: 50, y: 400, nat: "ussr", tier: 1, hp: 200, dmg: 40, xp: 0, s: 0.7, off: 5, vr: 280, camo: 0.35, cls: 'lt', nc: '#4a7a3a' },
    BT2: { n: "БТ-2", x: 200, y: 400, p: "T26", nat: "ussr", tier: 2, hp: 250, dmg: 50, xp: 150, s: 0.7, off: 5, vr: 300, camo: 0.35, cls: 'lt', nc: '#4a7a3a' },
    BT7: { n: "БТ-7", x: 350, y: 400, p: "BT2", nat: "ussr", tier: 3, hp: 350, dmg: 60, xp: 500, s: 0.75, off: 5, vr: 320, camo: 0.35, cls: 'lt', nc: '#4a7a3a' },
    A20: { n: "А-20", x: 500, y: 250, p: "BT7", nat: "ussr", tier: 4, hp: 500, dmg: 80, xp: 1500, s: 0.8, off: 5, vr: 340, camo: 0.3, cls: 'mt', nc: '#4a7a3a' },
    KV1: { n: "КВ-1", x: 650, y: 100, p: "A20", nat: "ussr", tier: 5, hp: 800, dmg: 160, xp: 4000, s: 1, off: 8, vr: 310, camo: 0.15, cls: 'ht', armor: 80, nc: '#4a7a3a' },
    KV1S: { n: "КВ-1С", x: 800, y: 50, p: "KV1", nat: "ussr", tier: 6, hp: 900, dmg: 200, xp: 8000, s: 1, off: 8, vr: 320, camo: 0.12, cls: 'ht', armor: 90, nc: '#4a7a3a' },
    IS: { n: "ИС", x: 950, y: 50, p: "KV1S", nat: "ussr", tier: 7, hp: 1200, dmg: 390, xp: 25000, s: 1.1, off: 10, vr: 340, camo: 0.1, cls: 'ht', armor: 120, nc: '#4a7a3a' },
    IS3: { n: "ИС-3", x: 1100, y: 50, p: "IS", nat: "ussr", tier: 8, hp: 1500, dmg: 390, xp: 60000, s: 1.15, off: 12, vr: 350, camo: 0.08, cls: 'ht', armor: 150, nc: '#4a7a3a' },
    IS8: { n: "ИС-8", x: 1250, y: 50, p: "IS3", nat: "ussr", tier: 9, hp: 1800, dmg: 440, xp: 120000, s: 1.2, off: 12, vr: 370, camo: 0.08, cls: 'ht', armor: 160, nc: '#4a7a3a' },
    IS7: { n: "ИС-7", x: 1400, y: 50, p: "IS8", nat: "ussr", tier: 10, hp: 2400, dmg: 490, xp: 195000, s: 1.3, off: 15, vr: 400, camo: 0.06, cls: 'ht', armor: 200, nc: '#4a7a3a' },
    
    KV2: { n: "КВ-2", x: 800, y: 150, p: "KV1", nat: "ussr", tier: 6, hp: 900, dmg: 450, xp: 10000, s: 1.1, off: 5, vr: 310, camo: 0.1, cls: 'ht', armor: 75, nc: '#4a7a3a' },
    KV3: { n: "КВ-3", x: 950, y: 150, p: "KV2", nat: "ussr", tier: 7, hp: 1300, dmg: 320, xp: 25000, s: 1.2, off: 5, vr: 320, camo: 0.08, cls: 'ht', armor: 120, nc: '#4a7a3a' },
    KV4: { n: "КВ-4", x: 1100, y: 150, p: "KV3", nat: "ussr", tier: 8, hp: 1600, dmg: 320, xp: 60000, s: 1.3, off: 5, vr: 330, camo: 0.06, cls: 'ht', armor: 170, nc: '#4a7a3a' },
    ST1: { n: "СТ-1", x: 1250, y: 150, p: "KV4", nat: "ussr", tier: 9, hp: 2000, dmg: 440, xp: 120000, s: 1.3, off: 10, vr: 370, camo: 0.06, cls: 'ht', armor: 180, nc: '#4a7a3a' },
    IS4: { n: "ИС-4", x: 1400, y: 150, p: "ST1", nat: "ussr", tier: 10, hp: 2500, dmg: 440, xp: 195000, s: 1.3, off: 10, vr: 380, camo: 0.05, cls: 'ht', armor: 200, nc: '#4a7a3a' },
    
    T34: { n: "Т-34", x: 500, y: 350, p: "BT7", nat: "ussr", tier: 5, hp: 600, dmg: 90, xp: 4000, s: 0.9, off: 5, vr: 340, camo: 0.3, cls: 'mt', nc: '#4a7a3a' },
    T3485: { n: "Т-34-85", x: 650, y: 350, p: "T34", nat: "ussr", tier: 6, hp: 750, dmg: 160, xp: 8000, s: 1, off: 5, vr: 350, camo: 0.28, cls: 'mt', nc: '#4a7a3a' },
    T43: { n: "Т-43", x: 800, y: 350, p: "T3485", nat: "ussr", tier: 7, hp: 1100, dmg: 160, xp: 20000, s: 1, off: 5, vr: 360, camo: 0.25, cls: 'mt', nc: '#4a7a3a' },
    T44: { n: "Т-44", x: 950, y: 350, p: "T43", nat: "ussr", tier: 8, hp: 1300, dmg: 280, xp: 55000, s: 1.05, off: 5, vr: 370, camo: 0.25, cls: 'mt', nc: '#4a7a3a' },
    T54: { n: "Т-54", x: 1100, y: 350, p: "T44", nat: "ussr", tier: 9, hp: 1650, dmg: 310, xp: 110000, s: 1.1, off: 5, vr: 390, camo: 0.22, cls: 'mt', nc: '#4a7a3a' },
    T62A: { n: "Т-62А", x: 1400, y: 350, p: "T54", nat: "ussr", tier: 10, hp: 2000, dmg: 310, xp: 195000, s: 1.1, off: 5, vr: 400, camo: 0.2, cls: 'mt', nc: '#4a7a3a' },
    
    S85B: { n: "СУ-85Б", x: 500, y: 550, p: "BT7", nat: "ussr", tier: 4, hp: 400, dmg: 160, xp: 1500, s: 0.8, isPT: true, off: 10, vr: 300, camo: 0.45, cls: 'td', nc: '#4a7a3a' },
    S85: { n: "СУ-85", x: 650, y: 550, p: "S85B", nat: "ussr", tier: 5, hp: 600, dmg: 200, xp: 4000, s: 0.85, isPT: true, off: 10, vr: 310, camo: 0.4, cls: 'td', nc: '#4a7a3a' },
    S100: { n: "СУ-100", x: 800, y: 550, p: "S85", nat: "ussr", tier: 6, hp: 850, dmg: 280, xp: 10000, s: 0.9, isPT: true, off: 10, vr: 320, camo: 0.38, cls: 'td', nc: '#4a7a3a' },
    S100M1: { n: "Су-100М1", x: 950, y: 500, p: "S100", nat: "ussr", tier: 7, hp: 1100, dmg: 310, xp: 25000, s: 0.95, isPT: true, off: 10, vr: 330, camo: 0.35, cls: 'td', nc: '#4a7a3a' },
    S101: { n: "СУ-101", x: 1100, y: 500, p: "S100M1", nat: "ussr", tier: 8, hp: 1300, dmg: 400, xp: 60000, s: 1, isPT: true, off: -12, vr: 340, camo: 0.35, cls: 'td', nc: '#4a7a3a' },
    S12254: { n: "СУ-122-54", x: 1250, y: 500, p: "S101", nat: "ussr", tier: 9, hp: 1700, dmg: 420, xp: 120000, s: 1.05, isPT: true, off: 5, vr: 360, camo: 0.3, cls: 'td', nc: '#4a7a3a' },
    OB253: { n: "Об.253", x: 1400, y: 500, p: "S12254", nat: "ussr", tier: 10, hp: 2200, dmg: 490, xp: 195000, s: 1.15, isPT: true, off: 8, vr: 380, camo: 0.28, cls: 'td', nc: '#4a7a3a' },
    
    S152: { n: "СУ-152", x: 950, y: 600, p: "S100", nat: "ussr", tier: 7, hp: 1100, dmg: 640, xp: 25000, s: 1.1, isPT: true, off: 8, vr: 320, camo: 0.25, cls: 'td', nc: '#4a7a3a' },
    ISU152: { n: "ИСУ-152", x: 1100, y: 600, p: "S152", nat: "ussr", tier: 8, hp: 1300, dmg: 640, xp: 60000, s: 1.2, isPT: true, off: 8, vr: 340, camo: 0.2, cls: 'td', nc: '#4a7a3a' },
    OB704: { n: "ОБ.704", x: 1250, y: 600, p: "ISU152", nat: "ussr", tier: 9, hp: 1700, dmg: 640, xp: 120000, s: 1.2, isPT: true, off: 8, vr: 360, camo: 0.2, cls: 'td', nc: '#4a7a3a' },
    OB268: { n: "ОБ.268", x: 1400, y: 600, p: "OB704", nat: "ussr", tier: 10, hp: 2100, dmg: 640, xp: 195000, s: 1.25, isPT: true, off: 10, vr: 380, camo: 0.22, cls: 'td', nc: '#4a7a3a' },
    
    MT25: { n: "МТ-25", x: 650, y: 700, p: "T34", nat: "ussr", tier: 6, hp: 600, dmg: 90, xp: 8000, s: 0.85, off: 5, vr: 380, camo: 0.4, cls: 'lt', nc: '#4a7a3a' },
    LTTB: { n: "ЛТТБ", x: 800, y: 700, p: "MT25", nat: "ussr", tier: 7, hp: 1000, dmg: 160, xp: 20000, s: 0.95, off: 5, vr: 390, camo: 0.38, cls: 'lt', nc: '#4a7a3a' },
    T54O: { n: "Т-54 обл.", x: 950, y: 700, p: "LTTB", nat: "ussr", tier: 8, hp: 1250, dmg: 250, xp: 55000, s: 1, off: 5, vr: 400, camo: 0.36, cls: 'lt', nc: '#4a7a3a' },
    OB84: { n: "Объект 84", x: 1100, y: 700, p: "T54O", nat: "ussr", tier: 9, hp: 1550, dmg: 310, xp: 110000, s: 1.05, off: 5, vr: 410, camo: 0.35, cls: 'lt', nc: '#4a7a3a' },
    T100LT: { n: "Т-100 ЛТ", x: 1400, y: 700, p: "OB84", nat: "ussr", tier: 10, hp: 1800, dmg: 310, xp: 195000, s: 1.1, off: 5, vr: 420, camo: 0.4, cls: 'lt', nc: '#4a7a3a' },
    
    // Премиум СССР
    MS11: { n: "МС-11", x: 50, y: 50, nat: "ussr", tier: 10, gold: 3000, hp: 1750, dmg: 110, s: 0.8, mag: 11, reload: 12000, off: 0, vr: 350, camo: 0.3, cls: 'mt', nc: '#4a7a3a', premium: true },
    SPRUT99: { n: "Спрут-99", x: 50, y: 150, nat: "ussr", tier: 10, gold: 4999, hp: 1400, dmg: 45, s: 0.85, mag: 99, reload: 1000, off: 5, vr: 360, camo: 0.28, cls: 'mt', nc: '#ff6600', premium: true },

    // === ГЕРМАНИЯ ===
    PZ2: { n: "Pz.2", x: 50, y: 400, nat: "germany", tier: 1, hp: 200, dmg: 15, xp: 0, s: 0.7, mag: 4, off: 5, vr: 300, camo: 0.35, cls: 'lt', nc: '#7a7a7a' },
    PZ35T: { n: "Pz.35(t)", x: 200, y: 400, p: "PZ2", nat: "germany", tier: 2, hp: 250, dmg: 40, xp: 150, s: 0.75, off: 5, vr: 310, camo: 0.3, cls: 'lt', nc: '#7a7a7a' },
    PZ3: { n: "Pz.III", x: 350, y: 400, p: "PZ35T", nat: "germany", tier: 3, hp: 400, dmg: 50, xp: 500, s: 0.8, off: 5, vr: 320, camo: 0.28, cls: 'mt', nc: '#7a7a7a' },
    
    HETZER: { n: "Hetzer", x: 500, y: 100, p: "PZ3", nat: "germany", tier: 4, hp: 450, dmg: 250, xp: 1500, s: 0.8, isPT: true, off: 10, vr: 300, camo: 0.45, cls: 'td', nc: '#7a7a7a' },
    STUG3: { n: "StuG 3 G", x: 650, y: 100, p: "HETZER", nat: "germany", tier: 5, hp: 600, dmg: 200, xp: 4000, s: 0.85, isPT: true, off: 10, vr: 310, camo: 0.42, cls: 'td', nc: '#7a7a7a' },
    NASHORN: { n: "Nashorn", x: 800, y: 50, p: "STUG3", nat: "germany", tier: 6, hp: 800, dmg: 280, xp: 10000, s: 1, isPT: true, off: -5, vr: 340, camo: 0.25, cls: 'td', nc: '#7a7a7a' },
    STEMIL: { n: "St.Emil", x: 950, y: 50, p: "NASHORN", nat: "germany", tier: 7, hp: 1100, dmg: 450, xp: 25000, s: 1.1, isPT: true, off: -8, vr: 350, camo: 0.2, cls: 'td', nc: '#7a7a7a' },
    RHMB: { n: "Rhm.-B.WT", x: 1100, y: 50, p: "STEMIL", nat: "germany", tier: 8, hp: 1300, dmg: 490, xp: 60000, s: 1, off: -12, vr: 360, camo: 0.3, cls: 'td', nc: '#7a7a7a' },
    WTPZ5: { n: "WT Pz.IV", x: 1250, y: 50, p: "RHMB", nat: "germany", tier: 9, hp: 1700, dmg: 550, xp: 120000, s: 1.2, off: -12, vr: 380, camo: 0.15, cls: 'td', nc: '#7a7a7a' },
    GRILLE: { n: "Grille 15", x: 1400, y: 50, p: "WTPZ5", nat: "germany", tier: 10, hp: 1900, dmg: 650, xp: 195000, s: 1.3, off: -15, vr: 400, camo: 0.12, cls: 'td', nc: '#7a7a7a' },
    
    JGPZ4: { n: "Jg.Pz.IV", x: 800, y: 150, p: "STUG3", nat: "germany", tier: 6, hp: 800, dmg: 220, xp: 10000, s: 0.9, isPT: true, off: 8, vr: 320, camo: 0.38, cls: 'td', nc: '#7a7a7a' },
    JPANTHER: { n: "Jpanther", x: 950, y: 150, p: "JGPZ4", nat: "germany", tier: 7, hp: 1200, dmg: 280, xp: 25000, s: 1.1, isPT: true, off: 8, vr: 340, camo: 0.3, cls: 'td', nc: '#7a7a7a' },
    JPANTHER2: { n: "Jpanther 2", x: 1100, y: 150, p: "JPANTHER", nat: "germany", tier: 8, hp: 1450, dmg: 450, xp: 60000, s: 1.2, isPT: true, off: 8, vr: 350, camo: 0.25, cls: 'td', nc: '#7a7a7a' },
    JAGTIGER: { n: "Jagdtiger", x: 1250, y: 150, p: "JPANTHER2", nat: "germany", tier: 9, hp: 2000, dmg: 490, xp: 120000, s: 1.3, isPT: true, off: 8, vr: 370, camo: 0.18, cls: 'td', armor: 180, nc: '#7a7a7a' },
    JGE100: { n: "Jg.Pz.E100", x: 1400, y: 150, p: "JAGTIGER", nat: "germany", tier: 10, hp: 2800, dmg: 1000, xp: 195000, s: 1.45, isPT: true, off: -8, vr: 380, camo: 0.1, cls: 'td', armor: 250, nc: '#7a7a7a' },
    
    PZ4D: { n: "Pz.IV D", x: 500, y: 400, p: "PZ3", nat: "germany", tier: 4, hp: 550, dmg: 110, xp: 1500, s: 0.9, off: 5, vr: 330, camo: 0.25, cls: 'mt', nc: '#7a7a7a' },
    PZ5G: { n: "Pz.V/IV", x: 650, y: 400, p: "PZ4D", nat: "germany", tier: 5, hp: 900, dmg: 160, xp: 4000, s: 1, off: 5, vr: 350, camo: 0.2, cls: 'ht', armor: 80, nc: '#7a7a7a' },
    
    VK36H: { n: "VK 36.01H", x: 800, y: 450, p: "PZ5G", nat: "germany", tier: 6, hp: 1050, dmg: 160, xp: 10000, s: 1.05, off: 5, vr: 350, camo: 0.15, cls: 'ht', armor: 80, nc: '#7a7a7a' },
    TIGER1: { n: "Tiger I", x: 950, y: 450, p: "VK36H", nat: "germany", tier: 7, hp: 1400, dmg: 240, xp: 25000, s: 1.15, off: 5, vr: 370, camo: 0.1, cls: 'ht', armor: 100, nc: '#7a7a7a' },
    TIGER2: { n: "Tiger II", x: 1100, y: 450, p: "TIGER1", nat: "germany", tier: 8, hp: 1650, dmg: 320, xp: 60000, s: 1.2, off: 5, vr: 380, camo: 0.08, cls: 'ht', armor: 160, nc: '#7a7a7a' },
    E75: { n: "E 75", x: 1250, y: 450, p: "TIGER2", nat: "germany", tier: 9, hp: 2100, dmg: 440, xp: 120000, s: 1.3, off: 5, vr: 390, camo: 0.06, cls: 'ht', armor: 200, nc: '#7a7a7a' },
    E100: { n: "E 100", x: 1400, y: 450, p: "E75", nat: "germany", tier: 10, hp: 2800, dmg: 640, xp: 195000, s: 1.5, off: 5, vr: 400, camo: 0.04, cls: 'ht', armor: 250, nc: '#7a7a7a' },
    
    VK30P: { n: "VK 30.01P", x: 800, y: 300, p: "PZ5G", nat: "germany", tier: 6, hp: 1100, dmg: 200, xp: 10000, s: 1.1, off: 12, vr: 360, camo: 0.15, cls: 'ht', armor: 100, nc: '#7a7a7a' },
    TIGERP: { n: "Tiger(P)", x: 950, y: 300, p: "VK30P", nat: "germany", tier: 7, hp: 1400, dmg: 220, xp: 25000, s: 1.2, off: 12, vr: 370, camo: 0.1, cls: 'ht', armor: 130, nc: '#7a7a7a' },
    VK45A: { n: "VK 45.02A", x: 1100, y: 250, p: "TIGERP", nat: "germany", tier: 8, hp: 1700, dmg: 320, xp: 60000, s: 1.2, off: 12, vr: 370, camo: 0.08, cls: 'ht', armor: 160, nc: '#7a7a7a' },
    VK45B: { n: "VK 45.02B", x: 1250, y: 250, p: "VK45A", nat: "germany", tier: 9, hp: 2100, dmg: 450, xp: 120000, s: 1.3, off: -15, vr: 380, camo: 0.06, cls: 'ht', armor: 200, nc: '#7a7a7a' },
    VK72: { n: "VK 72.01K", x: 1400, y: 250, p: "VK45B", nat: "germany", tier: 10, hp: 2500, dmg: 490, xp: 195000, s: 1.4, off: -15, vr: 390, camo: 0.05, cls: 'ht', armor: 220, nc: '#7a7a7a' },
    
    VK100: { n: "VK 100.01P", x: 1100, y: 350, p: "TIGERP", nat: "germany", tier: 8, hp: 1900, dmg: 450, xp: 60000, s: 1.4, off: 5, vr: 360, camo: 0.05, cls: 'ht', armor: 200, nc: '#7a7a7a' },
    MAUSCHEN: { n: "Mäuschen", x: 1250, y: 350, p: "VK100", nat: "germany", tier: 9, hp: 2300, dmg: 450, xp: 120000, s: 1.45, off: -5, vr: 370, camo: 0.03, cls: 'ht', armor: 240, nc: '#7a7a7a' },
    MAUS: { n: "Maus", x: 1400, y: 350, p: "MAUSCHEN", nat: "germany", tier: 10, hp: 3000, dmg: 490, xp: 195000, s: 1.6, off: -5, vr: 380, camo: 0.02, cls: 'ht', armor: 280, nc: '#7a7a7a' },
    
    LEOPARD: { n: "Leopard", x: 650, y: 550, p: "PZ4D", nat: "germany", tier: 5, hp: 500, dmg: 30, xp: 4000, s: 0.85, mag: 12, reload: 6000, off: 5, vr: 350, camo: 0.3, cls: 'lt', nc: '#7a7a7a' },
    VK30D: { n: "VK 30.01D", x: 800, y: 550, p: "LEOPARD", nat: "germany", tier: 6, hp: 850, dmg: 160, xp: 10000, s: 0.95, off: 5, vr: 360, camo: 0.25, cls: 'mt', nc: '#7a7a7a' },
    PANTHER: { n: "Panther", x: 950, y: 550, p: "VK30D", nat: "germany", tier: 7, hp: 1200, dmg: 200, xp: 25000, s: 1.05, off: 5, vr: 380, camo: 0.22, cls: 'mt', nc: '#7a7a7a' },
    PANTHER2: { n: "Panther II", x: 1100, y: 550, p: "PANTHER", nat: "germany", tier: 8, hp: 1400, dmg: 280, xp: 60000, s: 1.1, off: 5, vr: 390, camo: 0.2, cls: 'mt', nc: '#7a7a7a' },
    E50: { n: "E 50", x: 1250, y: 550, p: "PANTHER2", nat: "germany", tier: 9, hp: 1800, dmg: 310, xp: 120000, s: 1.15, off: 5, vr: 400, camo: 0.18, cls: 'mt', nc: '#7a7a7a' },
    E50M: { n: "E 50 M", x: 1400, y: 550, p: "E50", nat: "germany", tier: 10, hp: 2050, dmg: 350, xp: 195000, s: 1.2, off: 5, vr: 410, camo: 0.16, cls: 'mt', nc: '#7a7a7a' },
    
    VK30D2: { n: "VK 30.02D", x: 950, y: 650, p: "VK30D", nat: "germany", tier: 7, hp: 1100, dmg: 180, xp: 25000, s: 1, off: 5, vr: 380, camo: 0.25, cls: 'mt', nc: '#7a7a7a' },
    INDIEN: { n: "Indien-Pz.", x: 1100, y: 650, p: "VK30D2", nat: "germany", tier: 8, hp: 1350, dmg: 260, xp: 60000, s: 1.05, off: 5, vr: 390, camo: 0.22, cls: 'mt', nc: '#7a7a7a' },
    LEOPA: { n: "Leopard PTA", x: 1250, y: 650, p: "INDIEN", nat: "germany", tier: 9, hp: 1650, dmg: 350, xp: 120000, s: 1.1, off: 5, vr: 410, camo: 0.2, cls: 'mt', nc: '#7a7a7a' },
    LEO1: { n: "Leopard 1", x: 1400, y: 650, p: "LEOPA", nat: "germany", tier: 10, hp: 1900, dmg: 350, xp: 195000, s: 1.1, off: 5, vr: 420, camo: 0.2, cls: 'mt', nc: '#7a7a7a' },
    
    VK2801: { n: "VK 28.01", x: 800, y: 750, p: "LEOPARD", nat: "germany", tier: 6, hp: 700, dmg: 90, xp: 10000, s: 0.85, off: 5, vr: 390, camo: 0.4, cls: 'lt', nc: '#7a7a7a' },
    SP1C: { n: "Sp I C", x: 950, y: 750, p: "VK2801", nat: "germany", tier: 7, hp: 850, dmg: 120, xp: 25000, s: 0.9, mag: 2, reload: 4000, off: 5, vr: 400, camo: 0.42, cls: 'lt', nc: '#7a7a7a' },
    RU251: { n: "Ru 251", x: 1100, y: 750, p: "SP1C", nat: "germany", tier: 8, hp: 1100, dmg: 200, xp: 60000, s: 0.95, off: 5, vr: 410, camo: 0.4, cls: 'lt', nc: '#7a7a7a' },
    HWK12: { n: "HWK 12", x: 1250, y: 750, p: "RU251", nat: "germany", tier: 9, hp: 1350, dmg: 250, xp: 120000, s: 1, off: 5, vr: 420, camo: 0.38, cls: 'lt', nc: '#7a7a7a' },
    RHMPZW: { n: "Rhm. Pzw.", x: 1400, y: 750, p: "HWK12", nat: "germany", tier: 10, hp: 1600, dmg: 310, xp: 195000, s: 1.05, off: 5, vr: 440, camo: 0.42, cls: 'lt', nc: '#7a7a7a' },
    
    // Премиум Германия
    WTE100: { n: "WT auf E100", x: 50, y: 50, nat: "germany", tier: 10, gold: 2000, hp: 2000, dmg: 490, s: 1.3, mag: 5, off: -12, vr: 400, camo: 0.05, cls: 'td', nc: '#7a7a7a', premium: true },

    // === БРИТАНИЯ ===
    MED1: { n: "Medium I", x: 50, y: 400, nat: "uk", tier: 1, hp: 200, dmg: 10, xp: 0, s: 0.8, mag: 15, reload: 5000, off: 0, vr: 300, camo: 0.25, cls: 'mt', nc: '#c2a64a' },
    MED2: { n: "Medium II", x: 200, y: 400, p: "MED1", nat: "uk", tier: 2, hp: 280, dmg: 45, xp: 150, s: 0.85, off: 0, vr: 310, camo: 0.22, cls: 'mt', nc: '#c2a64a' },
    MED3: { n: "Medium III", x: 350, y: 400, p: "MED2", nat: "uk", tier: 3, hp: 420, dmg: 40, xp: 500, s: 0.9, mag: 3, reload: 4000, off: 0, vr: 320, camo: 0.2, cls: 'mt', nc: '#c2a64a' },
    TOG2: { n: "TOG II*", x: 650, y: 400, p: "MED3", nat: "uk", tier: 6, hp: 1400, dmg: 150, xp: 12000, s: 1.2, isLong: true, off: 20, vr: 330, camo: 0.02, cls: 'ht', armor: 76, nc: '#c2a64a' },
    
    CRUS2: { n: "Cruiser II", x: 50, y: 600, nat: "uk", tier: 1, hp: 200, dmg: 30, xp: 0, s: 0.7, mag: 2, reload: 3000, off: 5, vr: 310, camo: 0.35, cls: 'lt', nc: '#c2a64a' },
    CRUS3: { n: "Cruiser III", x: 200, y: 600, p: "CRUS2", nat: "uk", tier: 2, hp: 260, dmg: 35, xp: 150, s: 0.75, mag: 2, reload: 3000, off: 5, vr: 320, camo: 0.33, cls: 'lt', nc: '#c2a64a' },
    CRUS4: { n: "Cruiser IV", x: 350, y: 600, p: "CRUS3", nat: "uk", tier: 3, hp: 350, dmg: 45, xp: 500, s: 0.8, mag: 2, reload: 3500, off: 5, vr: 330, camo: 0.3, cls: 'lt', nc: '#c2a64a' },
    ALECTO: { n: "Alecto", x: 500, y: 600, p: "CRUS4", nat: "uk", tier: 4, hp: 350, dmg: 200, xp: 1500, s: 0.75, isPT: true, off: 8, vr: 310, camo: 0.45, cls: 'td', nc: '#c2a64a' },
    AT2: { n: "AT 2", x: 650, y: 600, p: "ALECTO", nat: "uk", tier: 5, hp: 850, dmg: 110, xp: 4000, s: 1.1, isPT: true, off: 5, vr: 300, camo: 0.2, cls: 'td', armor: 150, nc: '#c2a64a' },
    AT8: { n: "AT 8", x: 800, y: 600, p: "AT2", nat: "uk", tier: 6, hp: 1000, dmg: 160, xp: 10000, s: 1.15, isPT: true, off: 5, vr: 310, camo: 0.18, cls: 'td', armor: 170, nc: '#c2a64a' },
    AT7: { n: "AT 7", x: 950, y: 600, p: "AT8", nat: "uk", tier: 7, hp: 1200, dmg: 20, xp: 25000, s: 1.2, isPT: true, mag: 15, reload: 8000, off: 5, vr: 320, camo: 0.15, cls: 'td', armor: 180, nc: '#c2a64a' },
    AT15: { n: "AT 15", x: 1100, y: 600, p: "AT7", nat: "uk", tier: 8, hp: 1500, dmg: 280, xp: 60000, s: 1.25, isPT: true, off: 5, vr: 340, camo: 0.12, cls: 'td', armor: 200, nc: '#c2a64a' },
    TORTOISE: { n: "Tortoise", x: 1250, y: 600, p: "AT15", nat: "uk", tier: 9, hp: 2000, dmg: 400, xp: 120000, s: 1.35, isPT: true, off: 5, vr: 370, camo: 0.08, cls: 'td', armor: 250, nc: '#c2a64a' },
    FV183: { n: "FV215b 183", x: 1400, y: 600, p: "TORTOISE", nat: "uk", tier: 10, hp: 2100, dmg: 1150, xp: 195000, s: 1.3, isPT: true, off: 10, reload: 8000, vr: 390, camo: 0.1, cls: 'td', armor: 120, nc: '#c2a64a' },

    // === КИТАЙ ===
    VAEB: { n: "VAE Type B", x: 50, y: 400, nat: "china", tier: 1, hp: 200, dmg: 40, xp: 0, s: 0.7, off: 5, vr: 280, camo: 0.3, cls: 'lt', nc: '#8b0000' },
    VZ38: { n: "LT vz.38", x: 200, y: 400, p: "VAEB", nat: "china", tier: 2, hp: 250, dmg: 45, xp: 150, s: 0.7, off: 5, vr: 300, camo: 0.3, cls: 'lt', nc: '#8b0000' },
    CHIHA: { n: "Chi-Ha", x: 350, y: 400, p: "VZ38", nat: "china", tier: 3, hp: 350, dmg: 60, xp: 500, s: 0.75, off: 5, vr: 310, camo: 0.28, cls: 'mt', nc: '#8b0000' },
    M5A1: { n: "M5A1", x: 500, y: 400, p: "CHIHA", nat: "china", tier: 4, hp: 500, dmg: 80, xp: 1500, s: 0.8, off: 5, vr: 340, camo: 0.35, cls: 'lt', nc: '#8b0000' },
    T34C: { n: "Type T-34", x: 650, y: 400, p: "M5A1", nat: "china", tier: 5, hp: 600, dmg: 90, xp: 4000, s: 0.9, off: 5, vr: 350, camo: 0.28, cls: 'mt', nc: '#8b0000' },
    T58: { n: "Type 58", x: 800, y: 400, p: "T34C", nat: "china", tier: 6, hp: 800, dmg: 160, xp: 10000, s: 1, off: 5, vr: 360, camo: 0.25, cls: 'mt', nc: '#8b0000' },
    BZ58: { n: "BZ-58", x: 950, y: 400, p: "T58", nat: "china", tier: 7, hp: 1250, dmg: 320, xp: 25000, s: 1.1, off: 8, vr: 350, camo: 0.12, cls: 'ht', armor: 130, nc: '#8b0000' },
    BZ166: { n: "BZ-166", x: 1100, y: 400, p: "BZ58", nat: "china", tier: 8, hp: 1600, dmg: 400, xp: 60000, s: 1.2, off: 10, vr: 360, camo: 0.1, cls: 'ht', armor: 160, nc: '#8b0000' },
    BZ68: { n: "BZ-68", x: 1250, y: 400, p: "BZ166", nat: "china", tier: 9, hp: 1900, dmg: 490, xp: 120000, s: 1.25, off: 12, vr: 370, camo: 0.08, cls: 'ht', armor: 180, nc: '#8b0000' },
    BZ75: { n: "BZ-75", x: 1400, y: 400, p: "BZ68", nat: "china", tier: 10, hp: 2400, dmg: 650, xp: 195000, s: 1.35, off: 15, vr: 380, camo: 0.06, cls: 'ht', armor: 220, nc: '#8b0000' },

    // === ЯПОНИЯ ===
    TYPE5: { n: "Type 5 Heavy", x: 100, y: 100, nat: "japan", tier: 10, gold: 5000, hp: 3500, dmg: 900, s: 1.8, reload: 8000, off: 0, vr: 350, camo: 0.02, cls: 'ht', armor: 300, nc: '#d4a574', premium: true }
};