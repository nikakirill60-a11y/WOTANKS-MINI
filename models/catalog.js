// Branches are independent, ordered tier I → X. In all tables alpha is the TOTAL
// damage of a full load; a clip/machine gun fires mag independent projectiles.
const RESEARCH_XP = Object.freeze([0,150,350,1500,4000,8000,25000,60000,120000,195000]);
function defineLine(nat, rows) {
  return Object.freeze(rows.map(([id,n,cls,model,hp,alpha,reload,pen,armor,turretArmor,speed,s,vr,camo,extra],i) =>
    Object.freeze({id,n,nat,tier:i+1,cls,xp:RESEARCH_XP[i],file:model+'-game.html',thumbnail:model+'.webp',
      hp,alpha,reload,pen,armor,turretArmor,speed,s,vr,camo,...extra})));
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
const US_BRANCH = defineLine('usa', [
  ['T1C','T1 Cunningham','lt','t1-cunningham',        120, 38,2300, 39,10, 10,32,.68,275,.32],
  ['T2MEDIUM','T2 Medium Tank','mt','t2-medium',      185, 45,2300, 50,22, 22,40,.80,285,.29],
  ['M2MEDIUM','M2 Medium Tank','mt','m2-medium',      270, 65,3000, 62,25, 25,42,.85,305,.27],
  ['M3LEE','M3 Lee','mt','m3-lee',                    400,110,3800, 92,51, 38,38,.98,320,.23,{yawArc:15,minPitch:-9,maxPitch:20}],
  ['M4SHERMAN','M4 Sherman','mt','m4-sherman',        600,115,3500,122,51, 76,48,.98,335,.23],
  ['M4A3E8','M4A3E8 Sherman','mt','m4a3e8-sherman',   820,140,3800,142,63, 76,48,  1,345,.22],
  ['T20','T20','mt','t20',                           1080,240,6800,165,63, 89,56,.97,355,.24],
  ['PERSHING','M26 Pershing','mt','m26-pershing',    1400,240,6200,190,102,127,48,1.03,370,.21],
  ['M46PATTON','M46 Patton','mt','m46-patton',       1700,360,7600,218,102,127,48,1.04,380,.20],
  ['M48PATTON','M48 Patton','mt','m48-patton',       2050,390,7200,255,120,254,45,1.06,395,.18]
]);
const BRANCHES = Object.freeze({
  ussr: Object.freeze({number:'01', title:'Путь к ИС-7', tanks:USSR_BRANCH}),
  germany: Object.freeze({number:'02', title:'Путь к Rhm. Panzerwagen', tanks:GERMAN_BRANCH}),
  usa: Object.freeze({number:'03', title:'Путь к M48 Patton', tanks:US_BRANCH})
});
const PLAYABLE_NATIONS = Object.freeze(Object.keys(BRANCHES));
const DB = Object.freeze(Object.fromEntries(Object.values(BRANCHES).flatMap(b=>b.tanks.map(t=>[t.id,t]))));
const STARTER_TANK = 'MS1';
const shotDamage = t => t.alpha / (t.mag || 1);
const magazineName = t => t.weapon === 'machinegun' ? 'Барабан' : 'Кассета';
const damageLabel = t => !t.mag ? 'Урон за выстрел' : t.weapon === 'machinegun' ? 'Урон барабана' : 'Урон кассеты';
const damageSummary = t => t.mag ? `${t.alpha} (${t.mag} × ${shotDamage(t)})` : String(t.alpha);
const armorLabel = t => `${t.armor}${t.markedHull ? '*' : ''} / ${t.turretArmor}${t.markedTurret ? '*' : ''}`;
const speedLabel = t => t.roadSpeed ? `${t.speed}–${t.roadSpeed}` : String(t.speed);
const researchParent = id => BRANCHES[DB[id].nat].tanks[DB[id].tier - 2]?.id;
