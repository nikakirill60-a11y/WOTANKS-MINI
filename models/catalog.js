// Each route is ordered I → X; forks reuse their entire shared prefix. Alpha is the TOTAL
// damage of a full load; a clip/machine gun fires mag independent projectiles.
const RESEARCH_XP = Object.freeze([0,150,350,1500,4000,8000,25000,60000,120000,195000]);
function defineLine(nat, rows, prefix = []) {
  const line = [...prefix];
  for (const [id,n,cls,model,hp,alpha,reload,pen,armor,turretArmor,speed,s,vr,camo,extra] of rows) {
    const i = line.length;
    line.push(Object.freeze({id,n,nat,tier:i+1,parent:line[i-1]?.id,cls,xp:RESEARCH_XP[i],
      file:model+'.mesh.js',thumbnail:model+'.webp',hp,alpha,reload,pen,armor,turretArmor,speed,s,vr,camo,...extra}));
  }
  return Object.freeze(line);
}
const USSR_BRANCH = defineLine('ussr', [
  // ID, name, class, model · HP, full alpha, reload ms, pen, hull, turret, km/h · arcade size, vision, camo
  ['MS1','МС-1','lt','ms-1',             120, 40, 2500, 40, 16, 16,22,  .65,270,.33],
  ['T26','Т-26','lt','t-26',             180, 50, 2600, 55, 15, 15,30,  .72,280,.32],
  ['T46','Т-46','lt','t-46',             260, 60, 2800, 65, 15, 15,45,  .83,300,.30,{weapon:'machinegun',mag:6}],
  // T28 is an unrelated US vehicle in old saves.
  ['T28_USSR','Т-28','mt','t-28',       420,115, 4200, 95, 30, 30,37, 1.03,330,.24],
  ['KV1','КВ-1','ht','kv-1',            700,160, 5500,120, 75, 75,34,    1,310,.15],
  ['KV1S','КВ-1С','ht','kv-1s',         950,200, 6500,145, 75, 82,42,    1,320,.12],
  ['IS','ИС','ht','is',                 1300,390,11500,175,120,100,34, 1.04,340,.10],
  ['IS3','ИС-3','ht','is-3',            1600,390,11000,225,110,220,38, 1.06,350,.08,{markedHull:true}],
  ['OBJ257','Объект 257','ht','object-257',1950,440,11500,248,140,300,45,1.04,370,.08,{markedHull:true}],
  ['IS7','ИС-7','ht','is-7',            2400,490,12000,260,150,240,55, 1.10,400,.06,{roadSpeed:59,markedHull:true,markedTurret:true}]
]);
// The second heavy line forks at KV-1 (V). I–V are the original vehicle records,
// so a researched KV-1 unlocks either VI without duplicating a purchase or save ID.
const USSR_IS4_BRANCH = defineLine('ussr', [
  ['T150','Т-150','ht','t-150',1050,300, 9200,167, 90,100,35,1.02,320,.12,{minPitch:-20,maxPitch:7}],
  ['KV3','КВ-3','ht','kv-3',   1420,390,11200,175,120,130,32,1.08,320,.08,{minPitch:-24,maxPitch:7}],
  ['KV4','КВ-4','ht','kv-4',   1750,320, 8600,227,180,180,30,1.13,330,.06,{minPitch:-18,maxPitch:6}],
  ['STI','СТ-I','ht','st-i',   2050,440,11200,258,140,250,40,1.07,370,.06,{minPitch:-16,maxPitch:8}],
  ['IS4','ИС-4','ht','is-4',   2600,440,10200,262,160,250,43,1.10,380,.05,{minPitch:-16,maxPitch:6}]
], USSR_BRANCH.slice(0,5));
const GERMAN_BRANCH = defineLine('germany', [
  ['LTR','Leichttraktor','lt','leichttraktor',      115, 35,2200, 38,14,12,30, .65,270,.33],
  ['PZII','Pz.Kpfw. II','lt','pz-ii',               165, 75,4500, 48,30,15,40, .72,285,.32,{mag:5}],
  ['PZIC','Pz.Kpfw. I Ausf. C','lt','pz-i-c',       230, 96,5000, 58,30,20,68, .70,305,.34,{mag:8}],
  ['LUCHS','Pz. II «Luchs»','lt','luchs',           340,180,7500, 92,30,30,60, .76,320,.34,{mag:6}],
  // Primary loadouts only: Leopard's clip (lower end of 105–115), VK 28.01's 115 single shot.
  ['LEOPARD','VK 16.02 Leopard','lt','vk-16-02-leopard',500,240,9000,105,50,50,60,.84,340,.32,{mag:8}],
  ['VK2801','VK 28.01','lt','vk-28-01',             680,115,3600,135,50,50,64, .93,350,.30],
  ['SPIC','Spähpanzer SP I.C.','lt','sp-i-c',       880,220,6800,175,15,15,58, .79,370,.36],
  ['HWK12','HWK 12','lt','hwk-12',                 1100,240,6800,190,15,15,65, .82,380,.34],
  ['RU251','Spähpanzer Ru 251','lt','ru-251',      1350,250,5800,210,25,20,72, .92,390,.33],
  ['RHMPZW','Rhm. Panzerwagen','lt','rheinmetall-panzerwagen',1650,320,7200,235,30,20,75,.99,405,.30]
]);
// The two heavy routes share the original Leichttraktor and one II–V progression.
const GERMAN_MAUS_BRANCH = defineLine('germany', [
  ['PZ35T','Pz.Kpfw. 35 (t)','lt','pz-35-t',        175, 45, 2300, 52, 25, 25,35, .75,300,.30,{minPitch:-20,maxPitch:10}],
  ['PZ38T','Pz.Kpfw. 38 (t)','lt','pz-38-t',        265, 60, 2600, 72, 50, 25,42, .79,310,.29,{minPitch:-20,maxPitch:10}],
  ['PZIVD','Pz.Kpfw. IV Ausf. D','mt','pz-iv-d',    390,110, 3800, 85, 30, 35,40, .90,330,.25,{minPitch:-20,maxPitch:10}],
  ['PZIVH','Pz.Kpfw. IV Ausf. H','mt','pz-iv-h',    600,125, 3700,135, 80, 50,40, .96,340,.22,{minPitch:-20,maxPitch:8}],
  ['VK3001P','VK 30.01 (P)','ht','vk-30-01-p',       920,220, 7000,145, 75, 80,50,1.10,350,.15,{minPitch:-15,maxPitch:8}],
  ['TIGERP','Tiger (P)','ht','tiger-p',             1450,240, 6600,203,200,120,35,1.12,360,.10,{minPitch:-17,maxPitch:6}],
  ['VK10001P','VK 100.01 (P)','ht','vk-100-01-p',   1850,440,12200,220,200,230,20,1.30,360,.05,{minPitch:-30,maxPitch:8}],
  ['MAUSCHEN','Mäuschen','ht','mauschen',          2300,490,12500,246,200,240,20,1.40,370,.04,{minPitch:-24,maxPitch:8}],
  ['MAUS','Maus','ht','maus',                     3000,490,11800,250,200,260,20,1.50,380,.03,{minPitch:-8,maxPitch:24}]
], GERMAN_BRANCH.slice(0,1));
const GERMAN_E100_BRANCH = defineLine('germany', [
  ['VK3601H','VK 36.01 (H)','ht','vk-36-01-h',1000,220, 6800,148,100,100,40,1.05,350,.15,{minPitch:-15,maxPitch:8}],
  ['TIGERI','Tiger I','ht','tiger-i',        1500,240, 5800,203,100,100,40,1.15,370,.10,{minPitch:-13,maxPitch:7}],
  ['TIGERII','Tiger II','ht','tiger-ii',     1650,360, 9200,225,150,185,38,1.20,380,.08,{minPitch:-15,maxPitch:7}],
  ['E75','E 75','ht','e-75',                2100,490,12500,246,160,252,38,1.30,390,.06,{minPitch:-17,maxPitch:8}],
  ['E100','E 100','ht','e-100',             2700,680,16500,246,200,250,30,1.50,400,.04,{minPitch:-20,maxPitch:7}]
], GERMAN_MAUS_BRANCH.slice(0,5));
const GERMAN_E50M_BRANCH = defineLine('germany', [
  ['VK3002M','VK 30.02 (M)','mt','vk-30-02-m', 840,135,3600,150, 60,100,55,1.00,345,.24,{minPitch:-5,maxPitch:15}],
  ['PANTHER','Panther','mt','panther',         1200,135,3200,198, 85,120,55,1.08,360,.22,{minPitch:-5,maxPitch:15}],
  ['PANTHERII','Panther II','mt','panther-ii', 1450,240,6000,223,100,120,55,1.12,370,.20,{minPitch:-5,maxPitch:15}],
  ['E50','E 50','mt','e-50',                  1750,390,8200,220,150,185,60,1.17,385,.18,{minPitch:-5,maxPitch:15}],
  ['E50M','E 50 Ausf. M','mt','e-50-ausf-m', 2050,390,7600,270,150,250,60,1.20,400,.17,{minPitch:-5,maxPitch:15}]
], GERMAN_MAUS_BRANCH.slice(0,5));
const US_BRANCH = defineLine('usa', [
  ['T1C','T1 Cunningham','lt','t1-cunningham',        120, 38,2300, 39,10, 10,32,.68,275,.32],
  ['T2MEDIUM','T2 Medium Tank','mt','t2-medium',      185, 45,2300, 50,22, 22,40,.80,285,.29],
  ['M2MEDIUM','M2 Medium Tank','mt','m2-medium',      270, 65,3000, 62,25, 25,42,.85,305,.27],
  ['M3LEE','M3 Lee','mt','m3-lee',                    400,110,3800, 92,51, 38,38,.98,320,.23,{yawLimits:[-15,15],minPitch:-9,maxPitch:20}],
  ['M4SHERMAN','M4 Sherman','mt','m4-sherman',        600,115,3500,122,51, 76,48,.98,335,.23],
  ['M4A3E8','M4A3E8 Sherman','mt','m4a3e8-sherman',   820,140,3800,142,63, 76,48,  1,345,.22],
  ['T20','T20','mt','t20',                           1080,240,6800,165,63, 89,56,.97,355,.24],
  ['PERSHING','M26 Pershing','mt','m26-pershing',    1400,240,6200,190,102,127,48,1.03,370,.21],
  ['M46PATTON','M46 Patton','mt','m46-patton',       1700,360,7600,218,102,127,48,1.04,380,.20],
  ['M48PATTON','M48 Patton','mt','m48-patton',       2050,390,7200,255,120,254,45,1.06,395,.18]
]);
// The T20 fork reuses I–VII of the Patton route. Store full-clip alpha,
// not per-round damage: reload is the cooldown AFTER the fourth shot.
const US_T57_BRANCH = defineLine('usa', [
  ['T69','T69','mt','t69',                   1350, 960,22000,181,102,114,51,1.02,370,.21,{mag:4,weapon:'drum',oscillating:true,minPitch:-5,maxPitch:15}],
  ['T54E1','T54E1','ht','t54e1',            1800,1560,30000,210,110,127,43,1.11,380,.14,{mag:4,weapon:'drum',oscillating:true,minPitch:-5,maxPitch:15}],
  ['T57HEAVY','T57 Heavy','ht','t57-heavy', 2250,1600,23000,258,127,152,35,1.16,395,.10,{mag:4,weapon:'drum',oscillating:true,minPitch:-5,maxPitch:15}]
], US_BRANCH.slice(0,7));
const US_T110E5_BRANCH = defineLine('usa', [
  ['T1HEAVY','T1 Heavy','ht','t1-heavy', 720,115,3600,128,102,102,35,1.05,320,.15,{minPitch:-5,maxPitch:15}],
  ['M6','M6','ht','m6',                1020,240,7200,160,102,102,35,1.10,330,.13,{minPitch:-8,maxPitch:20}],
  ['T29','T29','ht','t29',              1400,320,9000,198,102,279,35,1.14,350,.11,{minPitch:-8,maxPitch:15}],
  ['T32','T32','ht','t32',              1600,320,8200,218,127,298,35,1.13,360,.10,{minPitch:-8,maxPitch:15}],
  ['M103','M103','ht','m103',           1950,400,9500,258,127,254,34,1.18,380,.08,{minPitch:-8,maxPitch:15}],
  ['T110E5','T110E5','ht','t110e5',     2350,400,8200,258,152,254,37,1.18,395,.07,{minPitch:-10,maxPitch:20}]
], US_BRANCH.slice(0,4)); // M3 Lee → one T1 Heavy, not a second starter
const US_YOH_BRANCH = defineLine('usa', [
  ['PAWLACK','Pawlack Tank','ht','pawlack-tank',930,220,6800,155, 95,110,45,1.06,335,.14,{minPitch:-5,maxPitch:15}],
  ['MIIY','M-II-Y','ht','m-ii-y',             1320,240,6200,190,120,165,40,1.08,350,.12,{minPitch:-10,maxPitch:20}],
  ['MIIIY','M-III-Y','ht','m-iii-y',          1550,320,8200,220,135,220,40,1.10,365,.10,{minPitch:-10,maxPitch:20}],
  ['MVIY','M-VI-Y','ht','m-vi-y',             1900,400,9500,248,140,260,40,1.13,380,.09,{oscillating:true,minPitch:-10,maxPitch:20}],
  ['MVY','M-V-Y','ht','m-v-y',                2250,440,9600,258,150,280,42,1.13,395,.08,{oscillating:true,minPitch:-10,maxPitch:20}]
], US_T110E5_BRANCH.slice(0,5));
// M2 Light Tank is a new node, not the existing M2 Medium or a legacy T2 Light.
const US_SHERIDAN_BRANCH = defineLine('usa', [
  ['M2LT','M2 Light Tank','lt','m2-light-tank',              165, 40, 2100, 46,25,25,55, .72,285,.33,{minPitch:-8,maxPitch:20}],
  ['M3ST','M3 Stuart','lt','m3-stuart',                      240, 45, 2000, 56,38,38,60, .77,300,.33,{minPitch:-8,maxPitch:20}],
  ['M5ST','M5 Stuart','lt','m5-stuart',                      340, 45, 1900, 72,38,38,64, .79,320,.34,{minPitch:-8,maxPitch:20}],
  ['M24','M24 Chaffee','lt','m24-chaffee',                   500,110, 3400,108,25,38,62, .85,340,.34,{minPitch:-8,maxPitch:20}],
  ['T37','T37','lt','t37',                                   670,115, 3400,138,25,25,66, .87,350,.33,{minPitch:-10,maxPitch:20}],
  ['T71CMCD','T71 CMCD','lt','t71-cmcd',                     870,150, 3800,168,25,25,64, .86,365,.35,{minPitch:-10,maxPitch:20}],
  ['M41','M41 Walker Bulldog','lt','m41-walker-bulldog',    1100,175, 4200,185,25,25,70, .92,380,.32,{minPitch:-10,maxPitch:20}],
  ['T49','T49','lt','t49',                                  1400,560,15500,152,25,25,68, .97,390,.31,{minPitch:-10,maxPitch:20}],
  ['SHERIDAN','XM551 Sheridan','lt','xm551-sheridan',       1680,560,13500,230,20,35,65,1.04,400,.30,{minPitch:-8,maxPitch:20}]
], US_BRANCH.slice(0,1));
// The dash in the Soviet TD table means no separate turret plate. The model
// mount supplies each local traverse sector; the armoured casemate stays on the hull.
const USSR_268_BRANCH = defineLine('ussr', [
  ['AT1','АТ-1','td','at-1',                       145, 55, 2400, 62, 15,null,30, .71,275,.34,{yawLimits:[-14,14],minPitch:-5,maxPitch:15}],
  ['SU76M','СУ-76М','td','su-76m',                 205,110, 4000,100, 25,null,45, .76,300,.33,{yawLimits:[-12,12],minPitch:-4,maxPitch:25}],
  ['SU85B','СУ-85Б','td','su-85b',                 315,150, 4400,130, 25,null,45, .81,315,.32,{yawLimits:[-10,10],minPitch:-5,maxPitch:15}],
  ['SU85','СУ-85','td','su-85',                    470,180, 5200,144, 45,null,55, .89,330,.32,{yawLimits:[-10,10],minPitch:-5,maxPitch:15}],
  ['SU100','СУ-100','td','su-100',                 690,390,10500,175, 75,null,50, .97,340,.30,{yawLimits:[-10,10],minPitch:-6,maxPitch:15}],
  ['SU152','СУ-152','td','su-152',                 960,640,14500,150, 75,null,43,1.05,350,.25,{yawLimits:[-9,9],minPitch:-5,maxPitch:15}],
  ['ISU152','ИСУ-152','td','isu-152',             1200,750,15200,260, 90,null,43,1.09,360,.23,{yawLimits:[-9,9],minPitch:-5,maxPitch:15}],
  ['OBJ704','Объект 704','td','object-704',       1650,750,14000,286,120,null,37,1.14,375,.21,{yawLimits:[-10,10],minPitch:-5,maxPitch:15}],
  ['OBJ268','Объект 268','td','object-268',       1950,750,13000,303,187,null,48,1.14,390,.21,{yawLimits:[-10,10],minPitch:-5,maxPitch:15}]
], USSR_BRANCH.slice(0,1));
const USSR_MEDIUM_BRANCH = defineLine('ussr', [
  ['BT2','БТ-2','lt','bt-2',              170, 45,2300, 50, 13, 13,52,.70,300,.35,{minPitch:-8,maxPitch:25}],
  ['BT7','БТ-7','lt','bt-7',              250, 55,2400, 65, 22, 15,60,.75,320,.35,{minPitch:-8,maxPitch:25}],
  ['A20','А-20','lt','a-20',              380, 85,3200, 88, 25, 25,65,.80,340,.30,{minPitch:-7,maxPitch:25}],
  ['T34','Т-34','mt','t-34',              580,110,3400,118, 45, 45,55,.90,340,.30,{minPitch:-6,maxPitch:17}],
  ['T3485','Т-34-85','mt','t-34-85',      800,180,5200,145, 45, 90,54,1.0,350,.28,{minPitch:-7,maxPitch:22}],
  ['T43','Т-43','mt','t-43',             1100,190,4800,160, 75, 90,51,1.0,360,.25,{minPitch:-8,maxPitch:26}],
  ['T44','Т-44','mt','t-44',             1350,260,6600,195, 90,150,52,1.05,370,.25,{minPitch:-7,maxPitch:23}],
  ['T54','Т-54','mt','t-54',             1650,310,6800,220,120,200,55,1.10,390,.22,{minPitch:-5,maxPitch:20}],
  ['OBJ140','Объект 140','mt','object-140',1950,320,5800,250,100,240,55,1.10,400,.22,{minPitch:-6,maxPitch:17}]
], USSR_BRANCH.slice(0,1));
// Medium forks keep the existing owners, prices and stats of every shared node.
const USSR_430U_BRANCH = defineLine('ussr', [
  ['OBJ430','Объект 430','mt','object-430',    1750,390,8800,232,120,248,50,1.08,380,.23,{minPitch:-5,maxPitch:15}],
  ['OBJ430U','Объект 430У','mt','object-430u',2050,440,9000,252,160,300,50,1.12,395,.21,{minPitch:-5,maxPitch:15}]
], USSR_MEDIUM_BRANCH.slice(0,8)); // from T-44, not T-54
const USSR_K91_BRANCH = defineLine('ussr', [
  ['A43','А-43','mt','a-43',                 780,115,3000,135, 75, 75,55, .96,345,.27,{minPitch:-5,maxPitch:15}],
  ['A44','А-44','mt','a-44',                1100,300,8800,167, 75, 90,59,1.01,355,.25,{minPitch:-5,maxPitch:15}],
  ['OBJ416','Объект 416','mt','object-416',   1200,320,6800,201, 75,110,50, .98,365,.29,{minPitch:-5,maxPitch:15}],
  ['OBJ430II','Объект 430 II','mt','object-430-ii',1600,320,6200,219,120,248,55,1.05,380,.24,{minPitch:-5,maxPitch:15}],
  ['K91','К-91','mt','k-91',                1900,320,5200,276,140,220,55,1.07,395,.22,{minPitch:-5,maxPitch:15}]
], USSR_MEDIUM_BRANCH.slice(0,5)); // from T-34; Object 430 II is not Object 430
// The Soviet lights follow the Object 140 route through A-20 (IV), then fork at T-50.
const USSR_LIGHT_BRANCH = defineLine('ussr', [
  ['T50','Т-50','lt','t-50',            520, 75,2600,112,45, 45,55, .79,340,.34,{minPitch:-7,maxPitch:25}],
  ['MT25','МТ-25','lt','mt-25',         670, 90,2700,138,45, 45,62, .85,360,.35,{minPitch:-25,maxPitch:6}],
  ['LTG','ЛТГ','lt','lt-g',             890,180,5200,155,40,100,65, .86,370,.37,{minPitch:-25,maxPitch:5}],
  ['LTTB','ЛТТБ','lt','lttb',         1120,190,4800,178,75, 90,68, .95,380,.36,{minPitch:-15,maxPitch:8}],
  ['T54L','Т-54 обл.','lt','t-54-ltwt',1420,250,6000,200,80,160,69,1.00,390,.36,{minPitch:-17,maxPitch:5}],
  ['T100LT','Т-100 ЛТ','lt','t-100-lt',1700,300,6200,230,90,180,72,1.04,405,.40,{minPitch:-15,maxPitch:5}]
], USSR_MEDIUM_BRANCH.slice(0,4));
// null = no separate turret armour. Yaw limits are in the supplied model's local Y rotation.
const GERMAN_TD_BRANCH = defineLine('germany', [
  ['PZJAG1','Panzerjäger I','td','panzerjager-i', 145,55,2400,68,15,null,40,.70,280,.34,{yawLimits:[-10,10],minPitch:-8,maxPitch:12}],
  ['MARDER2','Marder II','td','marder-ii',         205,115,4300,105,30,null,40,.79,300,.32,{yawLimits:[-32,25],minPitch:-8,maxPitch:10}],
  ['MARDER38','Marder 38T','td','marder-38t',     310,135,4200,125,50,null,42,.81,315,.31,{yawLimits:[-28,28],minPitch:-9,maxPitch:9}],
  ['PZSFL4C','Pz.Sfl. IVc','td','pz-sfl-ivc',     460,220,6200,165,20,null,52,.92,330,.25,{yawLimits:[-5,5],minPitch:-5,maxPitch:35}],
  ['NASHORN','Nashorn','td','nashorn',            660,240,5800,203,30,null,40,1.0,340,.25,{yawLimits:[-15,15],minPitch:-8,maxPitch:20}],
  ['STEMIL','Sturer Emil','td','sturer-emil',     900,460,11200,231,50,null,25,1.05,350,.20,{yawLimits:[-5,7],minPitch:-15,maxPitch:10}],
  ['RHMBWT','Rhm.-Borsig Waffenträger','td','rhm-borsig-waffentrager',1150,490,10500,246,20,20,35,1.0,360,.30,{minPitch:-5,maxPitch:15}],
  ['WTPZ4','Waffenträger auf Pz. IV','td','waffentrager-pz-iv',1550,520,10200,276,80,20,38,1.05,380,.15,{minPitch:-5,maxPitch:45}],
  ['WTE100','Waffenträger auf E 100','td','waffentrager-e100',2000,2080,40000,276,200,20,40,1.10,395,.11,{mag:4,weapon:'drum',minPitch:-8,maxPitch:14}]
], GERMAN_BRANCH.slice(0,1));
// Waffenträger auf Pz. IV offers two independent tier Xs: the old drum or a single-shot Grille.
const GERMAN_GRILLE_BRANCH = defineLine('germany', [
  ['GRILLE15','Grille 15','td','grille-15',1800,750,14500,279,30,20,60,1.13,395,.16,{yawLimits:[-10,10],minPitch:-5,maxPitch:15}]
], GERMAN_TD_BRANCH.slice(0,9));
// Marder II is the last shared node. These casemates have no separate turret armour.
const GERMAN_JGPZE100_BRANCH = defineLine('germany', [
  ['HETZER','Hetzer','td','hetzer',                   330, 110, 3600,110, 60,null,42, .81,310,.33,{yawLimits:[-11,11],minPitch:-5,maxPitch:15}],
  ['STUG3G','StuG III Ausf. G','td','stug-iii-g',    490, 135, 3600,150, 80,null,40, .85,325,.32,{yawLimits:[-11,11],minPitch:-6,maxPitch:14}],
  ['JGPZIV','Jagdpanzer IV','td','jagdpanzer-iv',    700, 220, 5200,145, 80,null,40, .92,340,.31,{yawLimits:[-12,12],minPitch:-5,maxPitch:15}],
  ['JAGDP','Jagdpanther','td','jagdpanther',          980, 320, 7200,200, 80,null,55,1.03,350,.26,{yawLimits:[-10,10],minPitch:-5,maxPitch:15}],
  ['FERDINAND','Ferdinand','td','ferdinand',         1400, 490,11000,246,200,null,30,1.15,360,.18,{yawLimits:[-14,14],minPitch:-5,maxPitch:15}],
  ['JAGDTIGER','Jagdtiger','td','jagdtiger',         1850, 560,10500,276,250,null,38,1.19,375,.16,{yawLimits:[-10,10],minPitch:-5,maxPitch:15}],
  ['JGPZE100','Jagdpanzer E 100','td','jagdpanzer-e-100',2200,1050,22000,299,250,null,30,1.30,390,.10,{yawLimits:[-10,10],minPitch:-5,maxPitch:15}]
], GERMAN_TD_BRANCH.slice(0,3));
// Both Swedish routes start with the SAME free fm/21. Clip alpha is per-shot × 3.
const SWEDISH_BRANCH=defineLine('sweden',[
  ['STRVFM21','Strv fm/21','lt','strv-fm21',115,36,2200,38,14,14,25,.67,270,.33,{minPitch:-10,maxPitch:15}],
  ['STRVM38','Strv m/38','lt','strv-m38',170,45,2300,50,15,15,45,.72,280,.32,{minPitch:-10,maxPitch:25}],
  ['STRVM40L','Strv m/40L','lt','strv-m40l',255,50,2300,64,35,35,48,.77,305,.30,{minPitch:-15,maxPitch:25}],
  ['LAGO','Lago','mt','lago',380,75,2700,90,34,34,45,.86,320,.27,{minPitch:-10,maxPitch:25}],
  ['STRVM42','Strv m/42','mt','strv-m42',570,120,3700,115,55,55,45,.91,335,.26,{minPitch:-15,maxPitch:25}],
  ['STRV74','Strv 74','mt','strv-74',790,150,4000,148,55,55,45,.96,345,.25,{minPitch:-10,maxPitch:20}],
  ['LEO','Leo','mt','leo',1080,280,8000,168,70,70,55,1,360,.23,{minPitch:-10,maxPitch:15}],
  ['EMIL1','Emil I','ht','emil-i',1500,960,22000,215,100,180,48,1.02,355,.14,{mag:3,oscillating:true,weapon:'drum',minPitch:-10,maxPitch:15}],
  ['EMIL2','Emil II','ht','emil-ii',1850,1200,25000,242,120,230,50,1.06,375,.12,{mag:3,oscillating:true,weapon:'drum',minPitch:-9,maxPitch:10}],
  ['KRANVAGN','Kranvagn','ht','kranvagn',2200,1200,22000,252,90,280,55,1.09,395,.11,{mag:3,oscillating:true,weapon:'drum',minPitch:-9,maxPitch:10}]
]);
const SWEDISH_TD_BRANCH=defineLine('sweden',[
  ['PVLVV42','Pvlvv fm/42','td','pvlvv-fm42',145,45,2100,62,15,15,45,.69,280,.34,{yawLimits:[-30,30],minPitch:-7,maxPitch:30}],
  ['IKV72','Ikv 72','td','ikv-72',200,110,4200,88,19,null,57,.76,300,.33,{yawLimits:[-10,10],minPitch:-12,maxPitch:20}],
  ['SAV43','Sav m/43','td','sav-m43',320,140,4600,118,50,null,43,.82,315,.32,{yawLimits:[-20,15],minPitch:-14,maxPitch:20}],
  ['IKV103','Ikv 103','td','ikv-103',480,260,8000,140,19,null,48,.84,325,.34,{yawLimits:[-10,10],minPitch:-12,maxPitch:20}],
  ['IKV65','Ikv 65 Alt II','td','ikv-65-alt-ii',680,240,6200,195,25,null,60,.88,340,.33,{yawLimits:[-15,15],minPitch:-10,maxPitch:12}],
  ['IKV90','Ikv 90 Typ B','td','ikv-90-typ-b',920,260,5800,220,25,null,65,.92,355,.33,{yawLimits:[-20,20],minPitch:-10,maxPitch:12}],
  ['UDES03','UDES 03','td','udes-03',1150,390,8500,275,20,null,70,.94,365,.35,{yawLimits:[0,0],minPitch:-14,maxPitch:20,stance:'hull-gun'}],
  ['STRV1030','Strv 103-0','td','strv-103-0',1500,390,7400,295,40,null,50,1,380,.34,{yawLimits:[0,0],minPitch:-11,maxPitch:11,stance:'hull'}],
  ['STRV103B','Strv 103B','td','strv-103b',1800,390,6500,308,40,null,50,1.04,395,.33,{yawLimits:[0,0],minPitch:-11,maxPitch:11,stance:'hull'}]
],SWEDISH_BRANCH.slice(0,1));
// Hungary has its own free root. Display names/armour follow the supplied I–X sheet;
// the 44M Tas export has a fixed superstructure and a limited gun, not a moving turret.
const HUNGARIAN_BRANCH = defineLine('hungary', [
  ['V440','Straussler V-4','lt','straussler-v4-40',115, 35,2200, 38, 13, 13,35, .66,270,.33,{minPitch:-8,maxPitch:15}],
  ['TOLDI1','38M Toldi I','lt','toldi-i',          165, 80,4000, 45, 13, 13,50, .72,285,.33,{mag:4,weapon:'drum',minPitch:-9,maxPitch:20}],
  ['TOLDI3','43M Toldi III','lt','toldi-iii',      250, 50,2400, 64, 35, 35,50, .76,305,.31,{minPitch:-9,maxPitch:13}],
  ['TURAN1','40M Turán I','mt','turan-i',          390, 60,2500, 85, 50, 50,47, .86,320,.27,{minPitch:-8,maxPitch:15}],
  ['TURAN2','41M Turán II','mt','turan-ii',        580,140,4400,105, 60, 60,43, .90,335,.24,{minPitch:-8,maxPitch:15}],
  ['TURAN3','43M Turán III','mt','turan-iii',      820,145,3900,145, 80, 80,43, .96,345,.23,{minPitch:-8,maxPitch:15}],
  ['TAS','44M Tas','td','tas',                    1180,220,5600,190,120,120,45,1.00,355,.28,{yawLimits:[-10,10],minPitch:-8,maxPitch:12}],
  ['T54A','T-54A','mt','t-54a',                   1380,280,6800,200,100,200,50,1.04,370,.22,{minPitch:-6,maxPitch:17}],
  ['T55A','T-55A','mt','t-55a',                   1680,320,6800,225,100,205,50,1.07,385,.22,{minPitch:-6,maxPitch:17}],
  ['T55AM1','T-55AM','mt','t-55am-1',            2000,330,5900,262,160,250,50,1.10,395,.21,{minPitch:-6,maxPitch:17}]
]);
function nationTree(number,title,...routes) {
  return Object.freeze({number,title,routes:Object.freeze(routes),tanks:Object.freeze([...new Set(routes.flat())])});
}
const BRANCHES = Object.freeze({
  ussr: nationTree('01','ИС-7, ИС-4, Объект 140, Объект 430У, К-91, Т-100 ЛТ и Объект 268',
    USSR_BRANCH, USSR_IS4_BRANCH, USSR_MEDIUM_BRANCH, USSR_430U_BRANCH, USSR_K91_BRANCH, USSR_LIGHT_BRANCH, USSR_268_BRANCH),
  germany: nationTree('02','Rhm. Panzerwagen, WT auf E 100, Grille 15, Jagdpanzer E 100, Maus, E 50 Ausf. M и E 100',
    GERMAN_BRANCH, GERMAN_TD_BRANCH, GERMAN_GRILLE_BRANCH, GERMAN_JGPZE100_BRANCH,
    GERMAN_MAUS_BRANCH, GERMAN_E50M_BRANCH, GERMAN_E100_BRANCH),
  usa: nationTree('03','M48 Patton, T57 Heavy, T110E5, M-V-Y и XM551 Sheridan',
    US_BRANCH, US_T57_BRANCH, US_T110E5_BRANCH, US_YOH_BRANCH, US_SHERIDAN_BRANCH),
  sweden: nationTree('04','Kranvagn и Strv 103B',SWEDISH_BRANCH,SWEDISH_TD_BRANCH),
  hungary: nationTree('05','Путь к танку: T-55AM',HUNGARIAN_BRANCH)
});
const PLAYABLE_NATIONS = Object.freeze(Object.keys(BRANCHES));
// Special vehicles have a real tier, but no XP price or research parent.
// The three acquisition pools are disjoint (the two TL-7s are separate models).
const SPECIAL_TANKS = Object.freeze([
  // source, ID, name, nation, tier, class, slug, HP, full load, reload ms, pen, hull, turret, km/h, model limits
  ['collection','M4A3E2','M4A3E2 Sherman Jumbo','usa',6,'mt','m4a3e2-sherman-jumbo',880,140,4000,138,102,152,35,{minPitch:-25,maxPitch:10}],
  ['collection','T71DA','T71 DA','usa',7,'lt','t71-da',860,900,20000,175,25,25,64,{mag:6,weapon:'drum',oscillating:true,minPitch:-20,maxPitch:7}],
  ['collection','JPANTHERII','Jagdpanther II','germany',8,'td','jagdpanther-ii',1200,490,10800,246,100,null,55,{yawLimits:[-10,10],minPitch:-15,maxPitch:6.5}],
  ['collection','T62A','Т-62А','ussr',10,'mt','t-62a',1950,320,5600,255,102,240,50,{minPitch:-17,maxPitch:6}],
  ['collection','TL7','TL-7','usa',9,'td','tl-7',1500,1440,32000,252,100,200,50,{mag:4,weapon:'drum',minPitch:-10,maxPitch:15}],
  ['premium','IS6','ИС-6','ussr',8,'ht','is-6',1550,390,10800,196,100,150,35,{price:7000,minPitch:-20,maxPitch:6}],
  ['premium','LOWE','Löwe','germany',8,'ht','lowe',1650,320,9200,234,150,120,35,{price:8000,minPitch:-17,maxPitch:8}],
  ['premium','T34HEAVY','T34','usa',8,'ht','t34-heavy',1550,400,12200,248,102,279,35,{price:7600,minPitch:-15,maxPitch:10}],
  ['premium','STA2','STA-2','japan',8,'mt','sta-2',1380,240,5700,212,45,70,55,{price:6100,minPitch:-10,maxPitch:13}],
  ['premium','STRVS1','Strv S1','sweden',8,'td','strv-s1',1100,390,8800,288,30,null,50,{price:6500,stance:'hull',yawLimits:[0,0],minPitch:-11,maxPitch:11}],
  ['advent','BT42','БТ-42','finland',4,'lt','bt-42',370,210,7500,75,22,15,54,{minPitch:-5,maxPitch:15}],
  ['advent','TL7OLEN','TL-7 Олень','usa',9,'td','tl-7-olen',1500,1440,32000,252,100,200,50,{mag:4,weapon:'drum',minPitch:-10,maxPitch:15}]
].map(([source,id,n,nat,tier,cls,slug,hp,alpha,reload,pen,armor,turretArmor,speed,extra]) => Object.freeze({
  source,id,n,nat,tier,cls,file:slug+'.mesh.js',thumbnail:slug+'.webp',hp,alpha,reload,pen,armor,turretArmor,speed,
  s:({lt:.86,mt:1,ht:1.12,td:1.04})[cls],vr:300+8*tier,camo:({lt:.32,mt:.22,ht:.09,td:.28})[cls],...extra
})));
const DB = Object.freeze(Object.fromEntries([...Object.values(BRANCHES).flatMap(b=>b.tanks),...SPECIAL_TANKS].map(t=>[t.id,t])));
const TRAINING_NATIONS = Object.freeze([...new Set(Object.values(DB).map(t=>t.nat))]);
const STARTER_TANK = 'MS1';
const shotDamage = t => t.alpha / (t.mag || 1);
const magazineName = t => t.weapon === 'machinegun' || t.weapon === 'drum' ? 'Барабан' : 'Кассета';
const damageLabel = t => !t.mag ? 'Урон за выстрел' : magazineName(t) === 'Барабан' ? 'Урон барабана' : 'Урон кассеты';
const damageSummary = t => t.mag ? `${t.alpha} (${t.mag} × ${shotDamage(t)})` : String(t.alpha);
const armorLabel = t => `${t.armor}${t.markedHull ? '*' : ''} / ${t.turretArmor ?? '—'}${t.markedTurret ? '*' : ''}`;
const speedLabel = t => t.roadSpeed ? `${t.speed}–${t.roadSpeed}` : String(t.speed);
const researchParent = id => DB[id].parent;
