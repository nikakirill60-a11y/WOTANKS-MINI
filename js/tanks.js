const DB={
    // ===================== СССР =====================
    T26:{n:"Т-26",x:50,y:400,nat:"ussr",tier:1,hp:200,dmg:40,xp:0,s:.7,off:5,vr:280,camo:.35,cls:'lt',nc:'#4a7a3a'},
    BT2:{n:"БТ-2",x:200,y:400,p:"T26",nat:"ussr",tier:2,hp:250,dmg:50,xp:150,s:.7,off:5,vr:300,camo:.35,cls:'lt',nc:'#4a7a3a'},
    BT7:{n:"БТ-7",x:350,y:400,p:"BT2",nat:"ussr",tier:3,hp:350,dmg:60,xp:500,s:.75,off:5,vr:320,camo:.35,cls:'lt',nc:'#4a7a3a'},
    A20:{n:"А-20",x:500,y:250,p:"BT7",nat:"ussr",tier:4,hp:500,dmg:80,xp:1500,s:.8,off:5,vr:340,camo:.3,cls:'mt',nc:'#4a7a3a'},
    // ТТ ветка верхняя
    KV1:{n:"КВ-1",x:650,y:100,p:"A20",nat:"ussr",tier:5,hp:800,dmg:160,xp:4000,s:1,off:8,vr:310,camo:.15,cls:'ht',armor:80,nc:'#4a7a3a'},
    KV1S:{n:"КВ-1С",x:800,y:50,p:"KV1",nat:"ussr",tier:6,hp:900,dmg:200,xp:8000,s:1,off:8,vr:320,camo:.12,cls:'ht',armor:90,nc:'#4a7a3a'},
    IS:{n:"ИС",x:950,y:50,p:"KV1S",nat:"ussr",tier:7,hp:1200,dmg:390,xp:25000,s:1.1,off:10,vr:340,camo:.1,cls:'ht',armor:120,nc:'#4a7a3a'},
    IS3:{n:"ИС-3",x:1100,y:50,p:"IS",nat:"ussr",tier:8,hp:1500,dmg:390,xp:60000,s:1.15,off:12,vr:350,camo:.08,cls:'ht',armor:150,nc:'#4a7a3a'},
    IS8:{n:"ИС-8",x:1250,y:50,p:"IS3",nat:"ussr",tier:9,hp:1800,dmg:440,xp:120000,s:1.2,off:12,vr:370,camo:.08,cls:'ht',armor:160,nc:'#4a7a3a'},
    IS7:{n:"ИС-7",x:1400,y:50,p:"IS8",nat:"ussr",tier:10,hp:2400,dmg:490,xp:195000,s:1.3,off:15,vr:400,camo:.06,cls:'ht',armor:200,nc:'#4a7a3a'},
    // КВ-2 ответвление
    KV2:{n:"КВ-2",x:800,y:150,p:"KV1",nat:"ussr",tier:6,hp:900,dmg:450,xp:10000,s:1.1,off:5,vr:310,camo:.1,cls:'ht',armor:75,nc:'#4a7a3a'},
    KV3:{n:"КВ-3",x:950,y:150,p:"KV2",nat:"ussr",tier:7,hp:1300,dmg:320,xp:25000,s:1.2,off:5,vr:320,camo:.08,cls:'ht',armor:120,nc:'#4a7a3a'},
    KV4:{n:"КВ-4",x:1100,y:150,p:"KV3",nat:"ussr",tier:8,hp:1600,dmg:320,xp:60000,s:1.3,off:5,vr:330,camo:.06,cls:'ht',armor:170,nc:'#4a7a3a'},
    ST1:{n:"СТ-1",x:1250,y:150,p:"KV4",nat:"ussr",tier:9,hp:2000,dmg:440,xp:120000,s:1.3,off:10,vr:370,camo:.06,cls:'ht',armor:180,nc:'#4a7a3a'},
    IS4:{n:"ИС-4",x:1400,y:150,p:"ST1",nat:"ussr",tier:10,hp:2500,dmg:440,xp:195000,s:1.3,off:10,vr:380,camo:.05,cls:'ht',armor:200,nc:'#4a7a3a'},
    // СТ ветка
    T34:{n:"Т-34",x:500,y:350,p:"BT7",nat:"ussr",tier:5,hp:600,dmg:90,xp:4000,s:.9,off:5,vr:340,camo:.3,cls:'mt',nc:'#4a7a3a'},
    T3485:{n:"Т-34-85",x:650,y:350,p:"T34",nat:"ussr",tier:6,hp:750,dmg:160,xp:8000,s:1,off:5,vr:350,camo:.28,cls:'mt',nc:'#4a7a3a'},
    T43:{n:"Т-43",x:800,y:350,p:"T3485",nat:"ussr",tier:7,hp:1100,dmg:160,xp:20000,s:1,off:5,vr:360,camo:.25,cls:'mt',nc:'#4a7a3a'},
    T44:{n:"Т-44",x:950,y:350,p:"T43",nat:"ussr",tier:8,hp:1300,dmg:280,xp:55000,s:1.05,off:5,vr:370,camo:.25,cls:'mt',nc:'#4a7a3a'},
    T54:{n:"Т-54",x:1100,y:350,p:"T44",nat:"ussr",tier:9,hp:1650,dmg:310,xp:110000,s:1.1,off:5,vr:390,camo:.22,cls:'mt',nc:'#4a7a3a'},
    T62A:{n:"Т-62А",x:1400,y:350,p:"T54",nat:"ussr",tier:10,hp:2000,dmg:310,xp:195000,s:1.1,off:5,vr:400,camo:.2,cls:'mt',nc:'#4a7a3a'},
    // ПТ ветка верхняя
    S85B:{n:"СУ-85Б",x:500,y:550,p:"BT7",nat:"ussr",tier:4,hp:400,dmg:160,xp:1500,s:.8,isPT:true,off:10,vr:300,camo:.45,cls:'td',nc:'#4a7a3a'},
    S85:{n:"СУ-85",x:650,y:550,p:"S85B",nat:"ussr",tier:5,hp:600,dmg:200,xp:4000,s:.85,isPT:true,off:10,vr:310,camo:.4,cls:'td',nc:'#4a7a3a'},
    S100:{n:"СУ-100",x:800,y:550,p:"S85",nat:"ussr",tier:6,hp:850,dmg:280,xp:10000,s:.9,isPT:true,off:10,vr:320,camo:.38,cls:'td',nc:'#4a7a3a'},
    S100M1:{n:"СУ-100М1",x:950,y:500,p:"S100",nat:"ussr",tier:7,hp:1100,dmg:310,xp:25000,s:.95,isPT:true,off:10,vr:330,camo:.35,cls:'td',nc:'#4a7a3a'},
    S101:{n:"СУ-101",x:1100,y:500,p:"S100M1",nat:"ussr",tier:8,hp:1300,dmg:400,xp:60000,s:1,isPT:true,off:-12,vr:340,camo:.35,cls:'td',nc:'#4a7a3a'},
    S12254:{n:"СУ-122-54",x:1250,y:500,p:"S101",nat:"ussr",tier:9,hp:1700,dmg:420,xp:120000,s:1.05,isPT:true,off:5,vr:360,camo:.3,cls:'td',nc:'#4a7a3a'},
    OB263:{n:"Об.263",x:1400,y:500,p:"S12254",nat:"ussr",tier:10,hp:2200,dmg:490,xp:195000,s:1.15,isPT:true,off:8,vr:380,camo:.28,cls:'td',nc:'#4a7a3a'},
    // ПТ ветка нижняя фугасницы
    S152:{n:"СУ-152",x:950,y:600,p:"S100",nat:"ussr",tier:7,hp:1100,dmg:640,xp:25000,s:1.1,isPT:true,off:8,vr:320,camo:.25,cls:'td',nc:'#4a7a3a'},
    ISU152:{n:"ИСУ-152",x:1100,y:600,p:"S152",nat:"ussr",tier:8,hp:1300,dmg:640,xp:60000,s:1.2,isPT:true,off:8,vr:340,camo:.2,cls:'td',nc:'#4a7a3a'},
    OB704:{n:"ОБ.704",x:1250,y:600,p:"ISU152",nat:"ussr",tier:9,hp:1700,dmg:640,xp:120000,s:1.2,isPT:true,off:8,vr:360,camo:.2,cls:'td',nc:'#4a7a3a'},
    OB268:{n:"ОБ.268",x:1400,y:600,p:"OB704",nat:"ussr",tier:10,hp:2100,dmg:640,xp:195000,s:1.25,isPT:true,off:10,vr:380,camo:.22,cls:'td',nc:'#4a7a3a'},
    // ЛТ ветка
    MT25:{n:"МТ-25",x:650,y:700,p:"T34",nat:"ussr",tier:6,hp:600,dmg:90,xp:8000,s:.85,off:5,vr:380,camo:.4,cls:'lt',nc:'#4a7a3a'},
    LTTB:{n:"ЛТТБ",x:800,y:700,p:"MT25",nat:"ussr",tier:7,hp:1000,dmg:160,xp:20000,s:.95,off:5,vr:390,camo:.38,cls:'lt',nc:'#4a7a3a'},
    T54O:{n:"Т-54 обл.",x:950,y:700,p:"LTTB",nat:"ussr",tier:8,hp:1250,dmg:250,xp:55000,s:1,off:5,vr:400,camo:.36,cls:'lt',nc:'#4a7a3a'},
    OB84:{n:"Объект 84",x:1100,y:700,p:"T54O",nat:"ussr",tier:9,hp:1550,dmg:310,xp:110000,s:1.05,off:5,vr:410,camo:.35,cls:'lt',nc:'#4a7a3a'},
    T100LT:{n:"Т-100 ЛТ",x:1400,y:700,p:"OB84",nat:"ussr",tier:10,hp:1800,dmg:310,xp:195000,s:1.1,off:5,vr:420,camo:.4,cls:'lt',nc:'#4a7a3a'},
    // Премиум СССР
    MS11:{n:"МС-11",x:50,y:50,nat:"ussr",tier:10,gold:3000,hp:1750,dmg:110,s:.8,mag:11,reload:12000,off:0,vr:350,camo:.3,cls:'mt',nc:'#4a7a3a',premium:true},
    SPRUT99:{n:"Спрут-99",x:50,y:150,nat:"ussr",tier:10,gold:4999,hp:1400,dmg:45,s:.85,mag:99,reload:1000,off:5,vr:360,camo:.28,cls:'mt',nc:'#ff6600',premium:true},

    // ===================== ГЕРМАНИЯ =====================
    PZ2:{n:"Pz.2",x:50,y:400,nat:"germany",tier:1,hp:200,dmg:15,xp:0,s:.7,mag:4,off:5,vr:300,camo:.35,cls:'lt',nc:'#7a7a7a'},
    PZ35T:{n:"Pz.35(t)",x:200,y:400,p:"PZ2",nat:"germany",tier:2,hp:250,dmg:40,xp:150,s:.75,off:5,vr:310,camo:.3,cls:'lt',nc:'#7a7a7a'},
    PZ3:{n:"Pz.III",x:350,y:400,p:"PZ35T",nat:"germany",tier:3,hp:400,dmg:50,xp:500,s:.8,off:5,vr:320,camo:.28,cls:'mt',nc:'#7a7a7a'},
    // ПТ верхняя
    HETZER:{n:"Hetzer",x:500,y:100,p:"PZ3",nat:"germany",tier:4,hp:450,dmg:250,xp:1500,s:.8,isPT:true,off:10,vr:300,camo:.45,cls:'td',nc:'#7a7a7a'},
    STUG3:{n:"StuG III",x:650,y:100,p:"HETZER",nat:"germany",tier:5,hp:600,dmg:200,xp:4000,s:.85,isPT:true,off:10,vr:310,camo:.42,cls:'td',nc:'#7a7a7a'},
    NASHORN:{n:"Nashorn",x:800,y:50,p:"STUG3",nat:"germany",tier:6,hp:800,dmg:280,xp:10000,s:1,isPT:true,off:-5,vr:340,camo:.25,cls:'td',nc:'#7a7a7a'},
    STEMIL:{n:"St.Emil",x:950,y:50,p:"NASHORN",nat:"germany",tier:7,hp:1100,dmg:450,xp:25000,s:1.1,isPT:true,off:-8,vr:350,camo:.2,cls:'td',nc:'#7a7a7a'},
    RHMB:{n:"Rhm.-B.WT",x:1100,y:50,p:"STEMIL",nat:"germany",tier:8,hp:1300,dmg:490,xp:60000,s:1,off:-12,vr:360,camo:.3,cls:'td',nc:'#7a7a7a'},
    WTPZ4:{n:"WT Pz.IV",x:1250,y:50,p:"RHMB",nat:"germany",tier:9,hp:1700,dmg:550,xp:120000,s:1.2,off:-12,vr:380,camo:.15,cls:'td',nc:'#7a7a7a'},
    GRILLE:{n:"Grille 15",x:1400,y:50,p:"WTPZ4",nat:"germany",tier:10,hp:1900,dmg:650,xp:195000,s:1.3,off:-15,vr:400,camo:.12,cls:'td',nc:'#7a7a7a'},
    // ПТ нижняя броня
    JGPZ4:{n:"Jg.Pz.IV",x:800,y:150,p:"STUG3",nat:"germany",tier:6,hp:800,dmg:220,xp:10000,s:.9,isPT:true,off:8,vr:320,camo:.38,cls:'td',nc:'#7a7a7a'},
    JPANTHER:{n:"Jpanther",x:950,y:150,p:"JGPZ4",nat:"germany",tier:7,hp:1200,dmg:280,xp:25000,s:1.1,isPT:true,off:8,vr:340,camo:.3,cls:'td',nc:'#7a7a7a'},
    JPANTHER2:{n:"Jpanther II",x:1100,y:150,p:"JPANTHER",nat:"germany",tier:8,hp:1450,dmg:450,xp:60000,s:1.2,isPT:true,off:8,vr:350,camo:.25,cls:'td',nc:'#7a7a7a'},
    JAGTIGER:{n:"Jagdtiger",x:1250,y:150,p:"JPANTHER2",nat:"germany",tier:9,hp:2000,dmg:490,xp:120000,s:1.3,isPT:true,off:8,vr:370,camo:.18,cls:'td',armor:180,nc:'#7a7a7a'},
    JGE100:{n:"Jg.Pz.E100",x:1400,y:150,p:"JAGTIGER",nat:"germany",tier:10,hp:2800,dmg:1000,xp:195000,s:1.45,isPT:true,off:-8,vr:380,camo:.1,cls:'td',armor:250,nc:'#7a7a7a'},
    // ТТ верхняя
    PZ4D:{n:"Pz.IV D",x:500,y:400,p:"PZ3",nat:"germany",tier:4,hp:550,dmg:110,xp:1500,s:.9,off:5,vr:330,camo:.25,cls:'mt',nc:'#7a7a7a'},
    PZ5G:{n:"Pz.V/IV",x:650,y:400,p:"PZ4D",nat:"germany",tier:5,hp:900,dmg:160,xp:4000,s:1,off:5,vr:350,camo:.2,cls:'ht',armor:80,nc:'#7a7a7a'},
    VK36H:{n:"VK 36.01H",x:800,y:400,p:"PZ5G",nat:"germany",tier:6,hp:1050,dmg:160,xp:10000,s:1.05,off:5,vr:350,camo:.15,cls:'ht',armor:80,nc:'#7a7a7a'},
    TIGER1:{n:"Tiger I",x:950,y:400,p:"VK36H",nat:"germany",tier:7,hp:1400,dmg:240,xp:25000,s:1.15,off:5,vr:370,camo:.1,cls:'ht',armor:100,nc:'#7a7a7a'},
    TIGER2:{n:"Tiger II",x:1100,y:400,p:"TIGER1",nat:"germany",tier:8,hp:1650,dmg:320,xp:60000,s:1.2,off:5,vr:380,camo:.08,cls:'ht',armor:160,nc:'#7a7a7a'},
    E75:{n:"E 75",x:1250,y:400,p:"TIGER2",nat:"germany",tier:9,hp:2100,dmg:440,xp:120000,s:1.3,off:5,vr:390,camo:.06,cls:'ht',armor:200,nc:'#7a7a7a'},
    E100:{n:"E 100",x:1400,y:400,p:"E75",nat:"germany",tier:10,hp:2800,dmg:640,xp:195000,s:1.5,off:5,vr:400,camo:.04,cls:'ht',armor:250,nc:'#7a7a7a'},
    // Порше
    VK30P:{n:"VK 30.01P",x:800,y:280,p:"PZ5G",nat:"germany",tier:6,hp:1100,dmg:200,xp:10000,s:1.1,off:12,vr:360,camo:.15,cls:'ht',armor:100,nc:'#7a7a7a'},
    TIGERP:{n:"Tiger(P)",x:950,y:280,p:"VK30P",nat:"germany",tier:7,hp:1400,dmg:220,xp:25000,s:1.2,off:12,vr:370,camo:.1,cls:'ht',armor:130,nc:'#7a7a7a'},
    VK45A:{n:"VK 45.02A",x:1100,y:250,p:"TIGERP",nat:"germany",tier:8,hp:1700,dmg:320,xp:60000,s:1.2,off:12,vr:370,camo:.08,cls:'ht',armor:160,nc:'#7a7a7a'},
    VK45B:{n:"VK 45.02B",x:1250,y:250,p:"VK45A",nat:"germany",tier:9,hp:2100,dmg:450,xp:120000,s:1.3,off:-15,vr:380,camo:.06,cls:'ht',armor:200,nc:'#7a7a7a'},
    VK72:{n:"VK 72.01K",x:1400,y:250,p:"VK45B",nat:"germany",tier:10,hp:2500,dmg:490,xp:195000,s:1.4,off:-15,vr:390,camo:.05,cls:'ht',armor:220,nc:'#7a7a7a'},
    // Маус
    VK100:{n:"VK 100.01P",x:1100,y:330,p:"TIGERP",nat:"germany",tier:8,hp:1900,dmg:450,xp:60000,s:1.4,off:5,vr:360,camo:.05,cls:'ht',armor:200,nc:'#7a7a7a'},
    MAUSCH:{n:"Mäuschen",x:1250,y:330,p:"VK100",nat:"germany",tier:9,hp:2300,dmg:450,xp:120000,s:1.45,off:-5,vr:370,camo:.03,cls:'ht',armor:240,nc:'#7a7a7a'},
    MAUS:{n:"Maus",x:1400,y:330,p:"MAUSCH",nat:"germany",tier:10,hp:3000,dmg:490,xp:195000,s:1.6,off:-5,vr:380,camo:.02,cls:'ht',armor:280,nc:'#7a7a7a'},
    // СТ верхняя
    LEOPARD:{n:"Leopard",x:650,y:550,p:"PZ4D",nat:"germany",tier:5,hp:500,dmg:30,xp:4000,s:.85,mag:12,reload:6000,off:5,vr:350,camo:.3,cls:'lt',nc:'#7a7a7a'},
    VK30D:{n:"VK 30.01D",x:800,y:550,p:"LEOPARD",nat:"germany",tier:6,hp:850,dmg:160,xp:10000,s:.95,off:5,vr:360,camo:.25,cls:'mt',nc:'#7a7a7a'},
    PANTHER:{n:"Panther",x:950,y:550,p:"VK30D",nat:"germany",tier:7,hp:1200,dmg:200,xp:25000,s:1.05,off:5,vr:380,camo:.22,cls:'mt',nc:'#7a7a7a'},
    PANTHER2:{n:"Panther II",x:1100,y:550,p:"PANTHER",nat:"germany",tier:8,hp:1400,dmg:280,xp:60000,s:1.1,off:5,vr:390,camo:.2,cls:'mt',nc:'#7a7a7a'},
    E50:{n:"E 50",x:1250,y:550,p:"PANTHER2",nat:"germany",tier:9,hp:1800,dmg:310,xp:120000,s:1.15,off:5,vr:400,camo:.18,cls:'mt',nc:'#7a7a7a'},
    E50M:{n:"E 50 M",x:1400,y:550,p:"E50",nat:"germany",tier:10,hp:2050,dmg:350,xp:195000,s:1.2,off:5,vr:410,camo:.16,cls:'mt',nc:'#7a7a7a'},
    // СТ нижняя Леопард
    VK30D2:{n:"VK 30.02D",x:950,y:650,p:"VK30D",nat:"germany",tier:7,hp:1100,dmg:180,xp:25000,s:1,off:5,vr:380,camo:.25,cls:'mt',nc:'#7a7a7a'},
    INDIEN:{n:"Indien-Pz.",x:1100,y:650,p:"VK30D2",nat:"germany",tier:8,hp:1350,dmg:260,xp:60000,s:1.05,off:5,vr:390,camo:.22,cls:'mt',nc:'#7a7a7a'},
    LEOPA:{n:"Leopard PTA",x:1250,y:650,p:"INDIEN",nat:"germany",tier:9,hp:1650,dmg:350,xp:120000,s:1.1,off:5,vr:410,camo:.2,cls:'mt',nc:'#7a7a7a'},
    LEO1:{n:"Leopard 1",x:1400,y:650,p:"LEOPA",nat:"germany",tier:10,hp:1900,dmg:350,xp:195000,s:1.1,off:5,vr:420,camo:.2,cls:'mt',nc:'#7a7a7a'},
    // ЛТ
    VK2801:{n:"VK 28.01",x:800,y:750,p:"LEOPARD",nat:"germany",tier:6,hp:700,dmg:90,xp:10000,s:.85,off:5,vr:390,camo:.4,cls:'lt',nc:'#7a7a7a'},
    SP1C:{n:"Sp I C",x:950,y:750,p:"VK2801",nat:"germany",tier:7,hp:850,dmg:120,xp:25000,s:.9,mag:2,reload:4000,off:5,vr:400,camo:.42,cls:'lt',nc:'#7a7a7a'},
    RU251:{n:"Ru 251",x:1100,y:750,p:"SP1C",nat:"germany",tier:8,hp:1100,dmg:200,xp:60000,s:.95,off:5,vr:410,camo:.4,cls:'lt',nc:'#7a7a7a'},
    HWK12:{n:"HWK 12",x:1250,y:750,p:"RU251",nat:"germany",tier:9,hp:1350,dmg:250,xp:120000,s:1,off:5,vr:420,camo:.38,cls:'lt',nc:'#7a7a7a'},
    RHMPZW:{n:"Rhm. Pzw.",x:1400,y:750,p:"HWK12",nat:"germany",tier:10,hp:1600,dmg:310,xp:195000,s:1.05,off:5,vr:440,camo:.42,cls:'lt',nc:'#7a7a7a'},
    // Премиум Германия
    WTE100:{n:"WT auf E100",x:50,y:50,nat:"germany",tier:10,gold:2000,hp:2000,dmg:490,s:1.3,mag:5,off:-12,vr:400,camo:.05,cls:'td',nc:'#7a7a7a',premium:true},

    // ===================== ФРАНЦИЯ =====================
    // Общий ствол tier 1-3
    R35:{n:"R35",x:50,y:400,nat:"france",tier:1,hp:220,dmg:35,xp:0,s:.7,off:5,vr:280,camo:.3,cls:'lt',nc:'#2c3e80'},
    AMX38:{n:"AMX 38",x:200,y:400,p:"R35",nat:"france",tier:2,hp:300,dmg:40,xp:150,s:.75,off:5,vr:290,camo:.25,cls:'lt',armor:60,nc:'#2c3e80'},
    D2:{n:"D2",x:350,y:400,p:"AMX38",nat:"france",tier:3,hp:400,dmg:55,xp:500,s:.8,off:5,vr:310,camo:.22,cls:'mt',armor:50,nc:'#2c3e80'},

    // --- ПТ ветка: Sau 40 → S35 CA → ARL V39 → AMX AC 46 → AMX AC 48 → Foch → Foch 155 ---
    SAU40:{n:"Sau 40",x:500,y:100,p:"D2",nat:"france",tier:4,hp:420,dmg:160,xp:1500,s:.8,isPT:true,off:15,vr:300,camo:.4,cls:'td',nc:'#2c3e80'},
    S35CA:{n:"S35 CA",x:650,y:100,p:"SAU40",nat:"france",tier:5,hp:580,dmg:240,xp:4000,s:.85,isPT:true,off:15,vr:320,camo:.35,cls:'td',nc:'#2c3e80'},
    ARLV39:{n:"ARL V39",x:800,y:100,p:"S35CA",nat:"france",tier:6,hp:780,dmg:280,xp:10000,s:.9,isPT:true,off:15,vr:330,camo:.3,cls:'td',armor:80,nc:'#2c3e80'},
    AC46:{n:"AMX AC 46",x:950,y:100,p:"ARLV39",nat:"france",tier:7,hp:1050,dmg:320,xp:25000,s:.95,isPT:true,off:18,vr:340,camo:.28,cls:'td',armor:120,nc:'#2c3e80'},
    AC48:{n:"AMX AC 48",x:1100,y:100,p:"AC46",nat:"france",tier:8,hp:1350,dmg:400,xp:60000,s:1,isPT:true,off:18,vr:350,camo:.25,cls:'td',armor:140,nc:'#2c3e80'},
    FOCH:{n:"Foch",x:1250,y:100,p:"AC48",nat:"france",tier:9,hp:1750,dmg:400,xp:120000,s:1.1,isPT:true,off:20,mag:2,reload:6000,vr:370,camo:.2,cls:'td',armor:180,nc:'#2c3e80'},
    FOCH155:{n:"Foch 155",x:1400,y:100,p:"FOCH",nat:"france",tier:10,hp:2100,dmg:640,xp:195000,s:1.2,isPT:true,off:20,mag:2,reload:8000,vr:380,camo:.15,cls:'td',armor:200,nc:'#2c3e80'},

    // --- ТТ ветка: B1 → BDR G1 B → ARL 44 → AMX M4 45 → AMX 50 100 → AMX 50 120 → AMX 50 B ---
    B1:{n:"B1",x:500,y:300,p:"D2",nat:"france",tier:4,hp:550,dmg:65,xp:1500,s:.95,off:5,vr:310,camo:.15,cls:'ht',armor:70,nc:'#2c3e80'},
    BDRG1B:{n:"BDR G1 B",x:650,y:250,p:"B1",nat:"france",tier:5,hp:750,dmg:160,xp:4000,s:1,off:5,vr:320,camo:.12,cls:'ht',armor:80,nc:'#2c3e80'},
    ARL44:{n:"ARL 44",x:800,y:250,p:"BDRG1B",nat:"france",tier:6,hp:950,dmg:220,xp:10000,s:1.05,off:5,vr:340,camo:.1,cls:'ht',armor:100,nc:'#2c3e80'},
    AMXM445:{n:"AMX M4 45",x:950,y:250,p:"ARL44",nat:"france",tier:7,hp:1200,dmg:240,xp:25000,s:1.1,off:5,vr:360,camo:.1,cls:'ht',armor:110,nc:'#2c3e80'},
    AMX50100:{n:"AMX 50 100",x:1100,y:250,p:"AMXM445",nat:"france",tier:8,hp:1400,dmg:300,xp:60000,s:1.15,off:5,mag:3,reload:8000,vr:370,camo:.08,cls:'ht',armor:90,nc:'#2c3e80'},
    AMX50120:{n:"AMX 50 120",x:1250,y:250,p:"AMX50100",nat:"france",tier:9,hp:1800,dmg:400,xp:120000,s:1.2,off:5,mag:4,reload:10000,vr:380,camo:.06,cls:'ht',armor:100,nc:'#2c3e80'},
    AMX50B:{n:"AMX 50 B",x:1400,y:250,p:"AMX50120",nat:"france",tier:10,hp:2100,dmg:400,xp:195000,s:1.25,off:5,mag:3,reload:8000,vr:400,camo:.06,cls:'ht',armor:120,nc:'#2c3e80'},

    // --- ЛТ/СТ ветка: B1 → ELC → AMX 12 t → AMX 13 75 → AMX 13 90 → B-C 25 t AP → B-C 25 t ---
    AMXELC:{n:"AMX ELC bis",x:650,y:450,p:"B1",nat:"france",tier:5,hp:450,dmg:120,xp:4000,s:.7,off:-10,vr:360,camo:.48,cls:'lt',nc:'#2c3e80'},
    AMX12T:{n:"AMX 12 t",x:800,y:450,p:"AMXELC",nat:"france",tier:6,hp:620,dmg:70,xp:10000,s:.8,off:-8,mag:3,reload:5000,vr:380,camo:.42,cls:'lt',nc:'#2c3e80'},
    AMX1375:{n:"AMX 13 75",x:950,y:450,p:"AMX12T",nat:"france",tier:7,hp:880,dmg:120,xp:25000,s:.85,off:-8,mag:3,reload:5500,vr:390,camo:.4,cls:'lt',nc:'#2c3e80'},
    AMX1390:{n:"AMX 13 90",x:1100,y:450,p:"AMX1375",nat:"france",tier:8,hp:1100,dmg:190,xp:60000,s:.9,off:-8,mag:3,reload:6000,vr:400,camo:.38,cls:'lt',nc:'#2c3e80'},
    BC25TAP:{n:"B-C 25 t AP",x:1250,y:450,p:"AMX1390",nat:"france",tier:9,hp:1500,dmg:240,xp:120000,s:1,off:-8,mag:4,reload:8000,vr:410,camo:.3,cls:'mt',nc:'#2c3e80'},
    BC25T:{n:"B-C 25 t",x:1400,y:450,p:"BC25TAP",nat:"france",tier:10,hp:1800,dmg:300,xp:195000,s:1.05,off:-8,mag:4,reload:9000,vr:420,camo:.28,cls:'mt',nc:'#2c3e80'},

    // --- Колёсные ЛТ: AMX 13 75 → AMX 13 M24 → ERAC 105 → Projet Louis → Projet Murat ---
    AMX13M24:{n:"AMX 13 M24",x:1100,y:600,p:"AMX12T",nat:"france",tier:7,hp:1000,dmg:150,xp:60000,s:.85,off:-8,mag:2,reload:4000,vr:410,camo:.4,cls:'lt',nc:'#2c3e80'},
    ERAC105:{n:"ERAC 105",x:1250,y:600,p:"AMX13M24",nat:"france",tier:8,hp:1300,dmg:280,xp:120000,s:.95,off:5,mag:2,reload:5000,vr:420,camo:.35,cls:'lt',nc:'#2c3e80'},
    PRLOUIS:{n:"Projet Louis",x:1400,y:600,p:"ERAC105",nat:"france",tier:9,hp:1600,dmg:330,xp:195000,s:1,off:5,mag:2,reload:5500,vr:430,camo:.32,cls:'lt',nc:'#2c3e80'},
    // --- Альтернативная ветка с Projet Murat (от ERAC 105) ---
    PRMURAT:{n:"Projet Murat",x:1400,y:700,p:"PRLOUIS",nat:"france",tier:10,hp:1700,dmg:350,xp:195000,s:1.05,off:5,mag:2,reload:6000,vr:420,camo:.3,cls:'mt',nc:'#2c3e80'},

    // ===================== БРИТАНИЯ =====================
    CRUS2:{n:"Cruiser II",x:50,y:400,nat:"uk",tier:1,hp:200,dmg:30,xp:0,s:.7,mag:2,reload:3000,off:5,vr:310,camo:.35,cls:'lt',nc:'#c2a64a'},
    CRUS3:{n:"Cruiser III",x:200,y:400,p:"CRUS2",nat:"uk",tier:2,hp:260,dmg:35,xp:150,s:.75,mag:2,reload:3000,off:5,vr:320,camo:.33,cls:'lt',nc:'#c2a64a'},
    CRUS4:{n:"Cruiser IV",x:350,y:400,p:"CRUS3",nat:"uk",tier:3,hp:350,dmg:45,xp:500,s:.8,mag:2,reload:3500,off:5,vr:330,camo:.3,cls:'lt',nc:'#c2a64a'},
    MATILDA:{n:"Matilda",x:500,y:400,p:"CRUS4",nat:"uk",tier:4,hp:550,dmg:75,xp:1500,s:.95,off:5,vr:320,camo:.18,cls:'mt',armor:75,nc:'#c2a64a'},
    CRUSADER:{n:"Crusader",x:650,y:350,p:"MATILDA",nat:"uk",tier:5,hp:650,dmg:80,xp:4000,s:.85,mag:2,reload:3000,off:5,vr:360,camo:.32,cls:'lt',nc:'#c2a64a'},
    // СТ
    CROMWELL:{n:"Cromwell",x:800,y:300,p:"CRUSADER",nat:"uk",tier:6,hp:850,dmg:140,xp:10000,s:.9,off:5,vr:360,camo:.28,cls:'mt',nc:'#c2a64a'},
    COMET:{n:"Comet",x:950,y:300,p:"CROMWELL",nat:"uk",tier:7,hp:1150,dmg:180,xp:25000,s:.95,off:5,vr:370,camo:.26,cls:'mt',nc:'#c2a64a'},
    CENT1:{n:"Centurion I",x:1100,y:300,p:"COMET",nat:"uk",tier:8,hp:1450,dmg:280,xp:60000,s:1.05,off:5,vr:390,camo:.22,cls:'mt',nc:'#c2a64a'},
    CENT71:{n:"Centurion 7/1",x:1250,y:300,p:"CENT1",nat:"uk",tier:9,hp:1750,dmg:350,xp:120000,s:1.1,off:5,vr:400,camo:.2,cls:'mt',nc:'#c2a64a'},
    FV4202:{n:"FV4202",x:1400,y:300,p:"CENT71",nat:"uk",tier:10,hp:1950,dmg:350,xp:195000,s:1.1,off:5,vr:410,camo:.18,cls:'mt',nc:'#c2a64a'},
    // ЛТ
    FV301:{n:"FV301",x:1100,y:450,p:"COMET",nat:"uk",tier:8,hp:1100,dmg:200,xp:60000,s:.9,off:5,vr:410,camo:.38,cls:'lt',nc:'#c2a64a'},
    VICKERSCR:{n:"Vickers CR",x:1250,y:450,p:"FV301",nat:"uk",tier:9,hp:1350,dmg:260,xp:120000,s:.95,off:5,vr:420,camo:.36,cls:'lt',nc:'#c2a64a'},
    VICKERSLT:{n:"Vickers Light",x:1400,y:450,p:"VICKERSCR",nat:"uk",tier:10,hp:1550,dmg:320,xp:195000,s:1,off:5,vr:430,camo:.4,cls:'lt',nc:'#c2a64a'},
    // ПТ верхняя
    FIREFLY:{n:"Sherman Firefly",x:800,y:150,p:"CRUSADER",nat:"uk",tier:6,hp:800,dmg:230,xp:10000,s:.95,isPT:true,off:8,vr:340,camo:.28,cls:'td',nc:'#c2a64a'},
    CHALLENGER:{n:"Challenger",x:950,y:150,p:"FIREFLY",nat:"uk",tier:7,hp:1100,dmg:280,xp:25000,s:1,isPT:true,off:10,vr:360,camo:.25,cls:'td',nc:'#c2a64a'},
    CHARIOTEER:{n:"Charioteer",x:1100,y:150,p:"CHALLENGER",nat:"uk",tier:8,hp:1300,dmg:390,xp:60000,s:1.05,off:5,vr:380,camo:.28,cls:'td',nc:'#c2a64a'},
    CONWAY:{n:"Conway",x:1250,y:150,p:"CHARIOTEER",nat:"uk",tier:9,hp:1700,dmg:480,xp:120000,s:1.15,off:8,vr:390,camo:.22,cls:'td',nc:'#c2a64a'},
    FV4005:{n:"FV4005",x:1400,y:150,p:"CONWAY",nat:"uk",tier:10,hp:1850,dmg:1150,xp:195000,s:1.2,off:5,reload:9000,vr:390,camo:.08,cls:'td',nc:'#c2a64a'},
    // ТТ
    CHURCHILL1:{n:"Churchill I",x:650,y:550,p:"MATILDA",nat:"uk",tier:5,hp:900,dmg:120,xp:4000,s:1.1,off:5,vr:320,camo:.1,cls:'ht',armor:100,nc:'#c2a64a'},
    CHURCHILL7:{n:"Churchill VII",x:800,y:550,p:"CHURCHILL1",nat:"uk",tier:6,hp:1100,dmg:150,xp:10000,s:1.15,off:5,vr:330,camo:.08,cls:'ht',armor:140,nc:'#c2a64a'},
    BLACKPRINCE:{n:"Black Prince",x:950,y:550,p:"CHURCHILL7",nat:"uk",tier:7,hp:1350,dmg:180,xp:25000,s:1.2,off:5,vr:350,camo:.06,cls:'ht',armor:160,nc:'#c2a64a'},
    CAERNARVON:{n:"Caernarvon",x:1100,y:550,p:"BLACKPRINCE",nat:"uk",tier:8,hp:1600,dmg:280,xp:60000,s:1.2,off:5,vr:370,camo:.08,cls:'ht',armor:170,nc:'#c2a64a'},
    CONQUEROR:{n:"Conqueror",x:1250,y:550,p:"CAERNARVON",nat:"uk",tier:9,hp:2000,dmg:400,xp:120000,s:1.25,off:5,vr:390,camo:.06,cls:'ht',armor:200,nc:'#c2a64a'},
    FV215B:{n:"FV215B",x:1400,y:550,p:"CONQUEROR",nat:"uk",tier:10,hp:2300,dmg:440,xp:195000,s:1.3,off:-10,vr:400,camo:.05,cls:'ht',armor:230,nc:'#c2a64a'},
    // ПТ нижняя броня
    ALECTO:{n:"Alecto",x:500,y:700,p:"CRUS4",nat:"uk",tier:4,hp:350,dmg:200,xp:1500,s:.75,isPT:true,off:8,vr:310,camo:.45,cls:'td',nc:'#c2a64a'},
    AT2:{n:"AT 2",x:650,y:700,p:"ALECTO",nat:"uk",tier:5,hp:850,dmg:110,xp:4000,s:1.1,isPT:true,off:5,vr:300,camo:.2,cls:'td',armor:150,nc:'#c2a64a'},
    AT8:{n:"AT 8",x:800,y:700,p:"AT2",nat:"uk",tier:6,hp:1000,dmg:160,xp:10000,s:1.15,isPT:true,off:5,vr:310,camo:.18,cls:'td',armor:170,nc:'#c2a64a'},
    AT7:{n:"AT 7",x:950,y:700,p:"AT8",nat:"uk",tier:7,hp:1200,dmg:20,xp:25000,s:1.2,isPT:true,mag:15,reload:8000,off:5,vr:320,camo:.15,cls:'td',armor:180,nc:'#c2a64a'},
    AT15:{n:"AT 15",x:1100,y:700,p:"AT7",nat:"uk",tier:8,hp:1500,dmg:280,xp:60000,s:1.25,isPT:true,off:5,vr:340,camo:.12,cls:'td',armor:200,nc:'#c2a64a'},
    TORTOISE:{n:"Tortoise",x:1250,y:700,p:"AT15",nat:"uk",tier:9,hp:2000,dmg:400,xp:120000,s:1.35,isPT:true,off:5,vr:370,camo:.08,cls:'td',armor:250,nc:'#c2a64a'},
    FV183:{n:"FV215b 183",x:1400,y:700,p:"TORTOISE",nat:"uk",tier:10,hp:2100,dmg:1150,xp:195000,s:1.3,isPT:true,off:10,reload:8000,vr:390,camo:.1,cls:'td',armor:120,nc:'#c2a64a'},
    // Премиум Британия
    MK1HEAVY:{n:"Mk I* Heavy",x:200,y:50,nat:"uk",tier:1,gold:500,hp:350,dmg:90,s:1.1,off:0,vr:280,camo:.1,cls:'td',armor:50,nc:'#8e44ad',premium:true,isLong:true},
    MED1:{n:"Medium I",x:50,y:50,nat:"uk",tier:1,gold:10,hp:200,dmg:10,s:.8,mag:15,reload:5000,off:0,vr:300,camo:.25,cls:'mt',nc:'#c2a64a',premium:true},
    TOG2:{n:"TOG II*",x:400,y:50,nat:"uk",tier:6,gold:350,hp:1400,dmg:150,s:1.2,isLong:true,off:20,vr:330,camo:.02,cls:'ht',armor:76,nc:'#c2a64a',premium:true},

    // ===================== КИТАЙ =====================
    // Общий ствол
    VAEB:{n:"VAE Type B",x:50,y:400,nat:"china",tier:1,hp:200,dmg:40,xp:0,s:.7,off:5,vr:280,camo:.3,cls:'lt',nc:'#8b0000'},
    VZ38:{n:"LT vz.38",x:200,y:400,p:"VAEB",nat:"china",tier:2,hp:250,dmg:45,xp:150,s:.7,off:5,vr:300,camo:.3,cls:'lt',nc:'#8b0000'},
    CHIHA:{n:"Chi-Ha",x:350,y:400,p:"VZ38",nat:"china",tier:3,hp:350,dmg:60,xp:500,s:.75,off:5,vr:310,camo:.28,cls:'lt',nc:'#8b0000'},
    M5A1:{n:"M5A1",x:500,y:400,p:"CHIHA",nat:"china",tier:4,hp:500,dmg:80,xp:1500,s:.8,off:5,vr:340,camo:.35,cls:'lt',nc:'#8b0000'},
    TYP34:{n:"Type T-34",x:650,y:400,p:"M5A1",nat:"china",tier:5,hp:600,dmg:90,xp:4000,s:.9,off:5,vr:350,camo:.28,cls:'mt',nc:'#8b0000'},
    // ТТ
    T58HT:{n:"Type 58",x:800,y:150,p:"TYP34",nat:"china",tier:6,hp:800,dmg:160,xp:10000,s:1,off:5,vr:360,camo:.25,cls:'mt',nc:'#8b0000'},
    IS2C:{n:"IS-2",x:950,y:100,p:"T58HT",nat:"china",tier:7,hp:1250,dmg:390,xp:25000,s:1.1,off:10,vr:340,camo:.1,cls:'ht',armor:120,nc:'#8b0000'},
    WZ110:{n:"WZ-110",x:1100,y:100,p:"IS2C",nat:"china",tier:8,hp:1550,dmg:390,xp:60000,s:1.15,off:12,vr:350,camo:.08,cls:'ht',armor:150,nc:'#8b0000'},
    WZ1114:{n:"WZ-111 1-4",x:1250,y:100,p:"WZ110",nat:"china",tier:9,hp:1900,dmg:440,xp:120000,s:1.2,off:12,vr:370,camo:.07,cls:'ht',armor:170,nc:'#8b0000'},
    WZ113:{n:"WZ-113",x:1400,y:100,p:"WZ1114",nat:"china",tier:10,hp:2350,dmg:490,xp:195000,s:1.3,off:15,vr:390,camo:.06,cls:'ht',armor:210,nc:'#8b0000'},
    // СТ
    T58MT:{n:"Type 58",x:800,y:300,p:"TYP34",nat:"china",tier:6,hp:800,dmg:160,xp:10000,s:1,off:5,vr:360,camo:.25,cls:'mt',nc:'#8b0000'},
    T341:{n:"T-34-1",x:950,y:300,p:"T58MT",nat:"china",tier:7,hp:1050,dmg:180,xp:20000,s:.95,off:5,vr:370,camo:.28,cls:'mt',nc:'#8b0000'},
    T342:{n:"T-34-2",x:1100,y:300,p:"T341",nat:"china",tier:8,hp:1300,dmg:280,xp:55000,s:1,off:5,vr:380,camo:.25,cls:'mt',nc:'#8b0000'},
    WZ120:{n:"WZ-120",x:1250,y:300,p:"T342",nat:"china",tier:9,hp:1650,dmg:390,xp:110000,s:1.1,off:5,vr:390,camo:.2,cls:'mt',nc:'#8b0000'},
    WZ121:{n:"WZ-121",x:1400,y:300,p:"WZ120",nat:"china",tier:10,hp:2000,dmg:440,xp:195000,s:1.15,off:5,vr:400,camo:.18,cls:'mt',nc:'#8b0000'},
    // ЛТ
    C5916:{n:"59-16",x:800,y:500,p:"TYP34",nat:"china",tier:6,hp:650,dmg:80,xp:8000,s:.8,off:5,vr:390,camo:.42,cls:'lt',nc:'#8b0000'},
    WZ131:{n:"WZ-131",x:950,y:500,p:"C5916",nat:"china",tier:7,hp:900,dmg:130,xp:20000,s:.85,off:5,vr:400,camo:.4,cls:'lt',nc:'#8b0000'},
    WZ132:{n:"WZ-132",x:1100,y:500,p:"WZ131",nat:"china",tier:8,hp:1150,dmg:200,xp:55000,s:.9,off:5,vr:410,camo:.38,cls:'lt',nc:'#8b0000'},
    WZ132A:{n:"WZ-132A",x:1250,y:500,p:"WZ132",nat:"china",tier:9,hp:1400,dmg:260,xp:110000,s:.95,off:5,vr:420,camo:.36,cls:'lt',nc:'#8b0000'},
    WZ1321:{n:"WZ-132-1",x:1400,y:500,p:"WZ132A",nat:"china",tier:10,hp:1650,dmg:310,xp:195000,s:1,off:5,vr:430,camo:.4,cls:'lt',nc:'#8b0000'},
    // ПТ
    VZ131GFT:{n:"VZ-131G FT",x:800,y:650,p:"TYP34",nat:"china",tier:6,hp:750,dmg:250,xp:10000,s:.9,isPT:true,off:15,vr:320,camo:.4,cls:'td',nc:'#8b0000'},
    T342GFT:{n:"T-34-2G FT",x:950,y:650,p:"VZ131GFT",nat:"china",tier:7,hp:1000,dmg:310,xp:25000,s:.95,isPT:true,off:15,vr:330,camo:.38,cls:'td',nc:'#8b0000'},
    WZ1111GFT:{n:"WZ-111-1G FT",x:1100,y:650,p:"T342GFT",nat:"china",tier:8,hp:1350,dmg:440,xp:60000,s:1.05,isPT:true,off:18,vr:340,camo:.32,cls:'td',armor:130,nc:'#8b0000'},
    WZ111GFT:{n:"WZ-111G FT",x:1250,y:650,p:"WZ1111GFT",nat:"china",tier:9,hp:1700,dmg:560,xp:120000,s:1.15,isPT:true,off:18,vr:360,camo:.28,cls:'td',armor:160,nc:'#8b0000'},
    WZ113GFT:{n:"WZ-113G FT",x:1400,y:650,p:"WZ111GFT",nat:"china",tier:10,hp:2100,dmg:640,xp:195000,s:1.25,isPT:true,off:20,vr:380,camo:.25,cls:'td',armor:200,nc:'#8b0000'},
    // BZ
    BZ58:{n:"BZ-58",x:800,y:800,p:"TYP34",nat:"china",tier:7,hp:1250,dmg:320,xp:25000,s:1.1,off:8,vr:350,camo:.12,cls:'ht',armor:130,nc:'#8b0000'},
    BZ166:{n:"BZ-166",x:950,y:800,p:"BZ58",nat:"china",tier:8,hp:1600,dmg:400,xp:60000,s:1.2,off:10,vr:360,camo:.1,cls:'ht',armor:160,nc:'#8b0000'},
    BZ68:{n:"BZ-68",x:1100,y:800,p:"BZ166",nat:"china",tier:9,hp:1900,dmg:490,xp:120000,s:1.25,off:12,vr:370,camo:.08,cls:'ht',armor:180,nc:'#8b0000'},
    BZ75:{n:"BZ-75",x:1400,y:800,p:"BZ68",nat:"china",tier:10,hp:2400,dmg:650,xp:195000,s:1.35,off:15,vr:380,camo:.06,cls:'ht',armor:220,nc:'#8b0000'},

    // ===================== ЯПОНИЯ =====================
    TYPE5:{n:"Type 5 Heavy",x:100,y:100,nat:"japan",tier:10,gold:5000,hp:3500,dmg:900,s:1.8,reload:8000,off:0,vr:350,camo:.02,cls:'ht',armor:300,nc:'#d4a574',premium:true}
};