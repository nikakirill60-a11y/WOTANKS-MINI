// Five supplied sheets in their original units (per-shot damage, shots, seconds).
// Last column: triangle count from the corresponding french-game-viewer.zip export.
const ft = ['FT','Renault FT','lt',115,35,1,2.3,36,22,22,20,4356];
const td = [ft,
  ['FT-AC','Renault FT AC','td',135,45,1,2.3,62,16,null,20,5963],
  ['UE-57','Renault UE 57','td',185,75,1,3.0,105,9,null,36,6168],
  ['SAU-40','Somua SAu 40','td',320,115,1,4.0,115,40,null,37,4045],
  ['S35-CA','S35 CA','td',470,240,1,6.8,155,56,null,37,4782],
  ['ARL-V39','ARL V39','td',680,240,1,6.2,185,60,null,42,4847],
  ['AMX-AC-46','AMX AC mle. 46','td',950,300,1,7.2,212,120,null,50,4240],
  ['AMX-AC-48','AMX AC mle. 48','td',1200,400,1,9.2,248,150,null,50,4097],
  ['FOCH','AMX 50 Foch','td',1650,400,1,7.8,257,180,null,50,4555],
  ['FOCH-155','AMX 50 Foch (155)','td',1900,750,3,40.0,293,180,null,50,4247]
];
const heavy = [ft,
  ['D1','D1','lt',195,45,1,2.4,46,35,35,20,5608],
  ['D2','D2','mt',290,55,1,2.6,62,40,46,23,4087],
  ['B1','B1','ht',460,65,1,2.4,66,60,60,30,4772],
  ['BDR-G1-B','BDR G1 B','ht',710,240,1,7.8,135,60,70,30,3920],
  ['ARL-44','ARL 44','ht',960,240,1,6.8,212,120,110,37,4548],
  ['AMX-M4-45','AMX M4 mle. 45','ht',1320,240,1,6.2,212,90,100,40,4529],
  ['AMX-50-100','AMX 50 100','ht',1450,300,6,38.0,232,90,90,51,7199],
  ['AMX-50-120','AMX 50 120','ht',1850,400,4,30.0,257,100,100,65,6206],
  ['AMX-50-B','AMX 50 B','ht',2200,400,4,26.0,257,170,100,65,8852]
];
const m4 = [...heavy.slice(0,7),
  ['AMX-65-T','AMX 65 t','ht',1550,300,1,7.6,232,100,250,38,4805],
  ['AMX-M4-51','AMX M4 mle. 51','ht',1950,400,1,9.5,257,180,280,40,5112],
  ['AMX-M4-54','AMX M4 mle. 54','ht',2400,520,1,11.8,255,220,300,40,5571]
];
const scout = [ft,
  ['H35','Hotchkiss H35','lt',175,40,1,2.2,45,40,40,28,3638],
  ['AMX-38','AMX 38','lt',270,50,1,2.4,58,60,40,25,4798],
  ['AMX-40','AMX 40','lt',390,75,1,3.0,74,70,70,35,4289],
  ['AMX-ELC-BIS','AMX ELC bis','lt',460,220,1,7.5,140,14,14,65,4627],
  ['AMX-12-T','AMX 12 t','lt',650,135,4,14.0,144,30,40,60,6424],
  ['AMX-13-75','AMX 13 75','lt',870,135,4,12.0,155,40,40,61,7250],
  ['B-C-12-T','Bat.-Châtillon 12 t','lt',1100,170,4,15.0,175,40,25,68,6646],
  ['B-C-25-T-AP','Bat.-Châtillon 25 t AP','mt',1600,300,6,34.0,232,50,30,65,5827],
  ['B-C-25-T','Bat.-Châtillon 25 t','mt',1850,390,5,34.0,259,60,50,65,8613]
];
// Four 1.5 sheets; dashes are references to the same row, not new unlocks.
const light = [...scout.slice(0,8),
  ['AMX1390','AMX 13 90','lt',1320,240,4,20,205,40,40,64,7726],
  ['AMX13105','AMX 13 105','lt',1600,360,3,21,234,50,40,68,7502]];
const wheels = [...scout.slice(0,5),
  ['AMD178B','Panhard AMD 178B','lt',600,110,1,3.6,125,20,26,72,7160],
  ['HOTCHKISSEBR','Hotchkiss EBR','lt',780,175,1,5.2,150,30,20,78,8366],
  ['LYNX6X6','Panhard AML Lynx 6×6','lt',980,240,1,6.8,182,20,20,80,8029],
  ['EBR90','Panhard EBR 90','lt',1200,240,1,6.2,190,40,40,85,9501],
  ['EBR105','Panhard EBR 105','lt',1450,360,1,9.2,210,40,40,90,9711]];
const medium = [...scout.slice(0,6),
  ['AMX13M24','AMX 13 M24','mt',1050,175,1,4.6,165,40,40,58,1809],
  ['ERAC105','ERAC 105 Proto','mt',1300,300,2,12.5,205,50,70,60,7010],
  ['PROJETLOUIS','Projet Louis','mt',1600,350,2,13,232,120,160,60,11727],
  ['PROJETMURAT','Projet Murat','mt',1900,390,2,12.5,252,150,220,62,9073]];
const arty = [ft,
  ['RENAULTFT75BS','Renault FT 75 BS','spg',120,190,1,13,34,16,null,14,5674],
  ['LORRAINE39LAM','Lorraine 39L AM','spg',165,240,1,14.5,38,12,null,37,7338],
  ['AMX105AM47','AMX 105 AM mle. 47','spg',220,310,1,17,42,20,null,60,7228],
  ['AMX13105AM50','AMX 13 105 AM mle. 50','spg',260,390,1,18.5,45,20,null,60,6931],
  ['AMX13F3AM','AMX 13 F3 AM','spg',320,500,1,22,48,20,null,60,6997],
  ['LORRAINE15550','Lorraine 155 mle. 50','spg',370,600,1,25,50,50,null,60,7618],
  ['LORRAINE15551','Lorraine 155 mle. 51','spg',420,650,1,26,52,50,null,60,7667],
  ['BC15555','Bat.-Châtillon 155 55','spg',480,680,1,27,52,50,16,56,7893],
  ['BC15558','Bat.-Châtillon 155 58','spg',540,680,3,48,54,16,16,62,7535]];
const routes = [td,heavy,m4,scout,light,wheels,medium,arty];
const additions = [...light.slice(8),...wheels.slice(5),...medium.slice(6),...arty.slice(1)];
module.exports = {routes, additions, unique:[...new Set(routes.flat())], native:{AMD178B:4,HOTCHKISSEBR:6,LYNX6X6:6,EBR90:8,EBR105:8}};
