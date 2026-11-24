const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.CITY_TANKS_INDEX ? path.dirname(path.resolve(process.env.CITY_TANKS_INDEX)) : path.resolve(__dirname,'..');

function game() {
  let ms = 500;
  const c = vm.createContext({console:{log(){}}, window:{addEventListener(){}},
    performance:{now:()=>ms}, snd(){}, spawnParticles(){}, spawnShellCasing(){}});
  for (const src of ['models/catalog','js/config','js/battle-space','js/armor-system','js/terrain','js/tank']) {
    vm.runInContext(fs.readFileSync(path.join(root, src + '.js'),'utf8'),c);
  }
  vm.runInContext('Math.random = () => .99', c); // no criticals in the base-stat fixture
  return {...vm.runInContext('({USSR_BRANCH, GERMAN_BRANCH, US_BRANCH, USSR_MEDIUM_BRANCH, GERMAN_TD_BRANCH, BRANCHES, traceBattleRay, DB, Tank, GameState, resolveHit, armorLabel, speedLabel, researchParent, BATTLE_UNITS_PER_METRE, applyTerrainToSpeed})',c),
    at:n=>{ms=n;}};
}

test('branch 01 uses the ten supplied stat lines and ten distinct playable models',()=>{
  const {USSR_BRANCH:rows, DB, armorLabel, speedLabel, researchParent} = game();
  assert.deepEqual(Array.from(rows, t=>[t.tier,t.n,t.hp,t.alpha,t.reload,t.pen,armorLabel(t),speedLabel(t)]),[
    [1,'МС-1',120,40,2500,40,'16 / 16','22'],[2,'Т-26',180,50,2600,55,'15 / 15','30'],
    [3,'Т-46',260,60,2800,65,'15 / 15','45'],[4,'Т-28',420,115,4200,95,'30 / 30','37'],
    [5,'КВ-1',700,160,5500,120,'75 / 75','34'],[6,'КВ-1С',950,200,6500,145,'75 / 82','42'],
    [7,'ИС',1300,390,11500,175,'120 / 100','34'],[8,'ИС-3',1600,390,11000,225,'110* / 220','38'],
    [9,'Объект 257',1950,440,11500,248,'140* / 300','45'],[10,'ИС-7',2400,490,12000,260,'150* / 240*','55–59']
  ]);
  const line = Array.from(rows, t=>t.id);
  assert.ok(line.every(id => DB[id].nat==='ussr'));
  assert.equal(new Set(line).size,10);
  assert.deepEqual(line.map(researchParent),[undefined,...line.slice(0,-1)]);
  assert.equal(new Set(Object.values(DB).map(t=>t.file)).size,Object.keys(DB).length);
  assert.equal(DB.IS.file,'is.mesh.js');assert.equal(DB.IS3.file,'is-3.mesh.js');
  for (const spec of Object.values(DB)) for (const key of ['file','thumbnail'])
    assert.ok(fs.statSync(path.join(root,'models',spec[key])).size > 0);
});

test('Germany: ten supplied stat lines, chosen primary loadouts, prices and independent prerequisites',()=>{
  const {GERMAN_BRANCH:rows,USSR_BRANCH:soviet,DB,researchParent,Tank,BATTLE_UNITS_PER_METRE:m}=game();
  assert.deepEqual(Array.from(rows,t=>[t.id,t.hp,t.alpha,t.mag||1,t.reload,t.pen,t.armor,t.turretArmor,t.speed]),[
    ['LTR',115,35,1,2200,38,14,12,30], ['PZII',165,75,5,4500,48,30,15,40],
    ['PZIC',230,96,8,5000,58,30,20,68], ['LUCHS',340,180,6,7500,92,30,30,60],
    ['LEOPARD',500,240,8,9000,105,50,50,60], ['VK2801',680,115,1,3600,135,50,50,64],
    ['SPIC',880,220,1,6800,175,15,15,58], ['HWK12',1100,240,1,6800,190,15,15,65],
    ['RU251',1350,250,1,5800,210,25,20,72], ['RHMPZW',1650,320,1,7200,235,30,20,75]
  ]);
  assert.equal(Object.keys(DB).length,124);
  for(const [i,t] of rows.entries()){
    assert.ok(t.tier===i+1 && t.nat==='germany' && t.cls==='lt');assert.equal(t.xp,soviet[i].xp);
    assert.equal(researchParent(t.id),rows[i-1]?.id);const u=new Tank(t.id,0,0,'enemy');
    assert.equal(Math.round(u.baseSpeed*60*3.6/m),t.speed);assert.equal(u.hp,t.hp);assert.equal(u.turretArmor,t.turretArmor);
  }
});

test('German and Swedish autoloaders: real independent projectiles, total base damage and full-clip cooldown for both sides',()=>{
  const {Tank,GameState:g,at,resolveHit}=game();
  for(const [id,n,alpha,reload] of [['PZII',5,15,4500],['PZIC',8,12,5000],['LUCHS',6,30,7500],['LEOPARD',8,30,9000],['WTE100',4,520,40000],['EMIL1',3,320,22000],['EMIL2',3,400,25000],['KRANVAGN',3,400,22000]]){
    for(const team of ['player','enemy']){
      g.bullets=[];const u=new Tank(id,0,0,team),t=new Tank('LTR',200,0,'enemy');
      u.modelAsset={groundY:0,pivot:[0,1,0],gunPivot:[0,.25,.7],muzzle:[0,0,2]};
      for(let i=0;i<n;i++){
        at(1000+i*120);assert.ok(u.fire(1));assert.equal(u.curMag,n-i-1);assert.equal(u.isReloading,i===n-1);
        at(1001+i*120);assert.equal(u.fire(0),false);
      }
      assert.equal(g.bullets.length,n);assert.ok(g.bullets.every(b=>b.st===0 && b.dmg===alpha));
      assert.equal(g.bullets.reduce((s,b)=>s+resolveHit(b,t,'hull').dmg,0),alpha*n);
      const ready=1000+(n-1)*120+reload;at(ready-1);assert.equal(u.fire(),false);at(ready);assert.ok(u.fire());assert.equal(u.curMag,n-1);
    }
  }
});

test('T-46: six independent rounds share 60 base damage; the whole drum reloads only after the last shot',()=>{
  const {Tank,GameState:g,at,resolveHit}=game();
  for(const team of ['player','enemy']) {
    g.bullets=[];
    const gun=new Tank('T46',0,0,team), target=new Tank('T28_USSR',250,0,'enemy');
    target.angle=target.tAngle=Math.PI;
    gun.modelAsset={groundY:0,pivot:[0,1,0],gunPivot:[0,.25,.7],muzzle:[0,0,2]};
    assert.equal(gun.hp,260);assert.equal(gun.dmg,10);assert.equal(gun.pen,65);
    for(let i=0;i<6;i++) {
      at(500+i*120);assert.equal(gun.fire(1),true,'held fire, including an incompatible shell choice');
      assert.equal(gun.curMag,5-i);assert.equal(gun.isReloading,i===5);
      at(500+i*120+1);assert.equal(gun.fire(),false,'neither a second click nor another tick bypasses the cadence');
    }
    assert.equal(g.bullets.length,6);assert.ok(g.bullets.every(b=>b.dmg===10&&b.st===0));
    assert.equal(g.bullets.reduce((s,b)=>s+resolveHit(b,target,'hull').dmg,0),60);
    assert.equal(gun.nextShot,1100+2800);
    at(3899);gun.updateReload(3899);assert.equal(gun.curMag,0);assert.equal(gun.fire(),false);
    at(3900);gun.updateReload(3900);assert.equal(gun.curMag,6);assert.equal(gun.isReloading,false);
    assert.equal(gun.fire(),true);assert.equal(gun.curMag,5);
  }
});

test('a shell tests the actual hull/turret plate; mobility comes from the speed column',()=>{
  const {Tank,resolveHit,BATTLE_UNITS_PER_METRE:metre,GameState:g,applyTerrainToSpeed}=game();
  const target=new Tank('KV1S',100,0,'enemy');target.angle=target.tAngle=Math.PI;
  const b={a:0,dmg:10,pen:79,shooter:{team:'ally'}};
  assert.equal(resolveHit(b,target,'hull').dmg,10,'75 mm hull');
  assert.equal(resolveHit(b,target,'turret').dmg,0,'82 mm turret');
  target.tAngle=0;assert.equal(resolveHit(b,target,'turret').dmg,10,'turret has its own facing');
  const u=new Tank('IS7',0,0,'ally');
  const kmh=s=>Math.round(s*60*3.6/metre);
  assert.equal(kmh(u.baseSpeed),55);
  g.terrainZones=[{type:'asphalt',x:-1,y:-1,w:2,h:2}];assert.equal(kmh(applyTerrainToSpeed(u,u.baseSpeed)),59);
});


test('USA I–X: each single-shot stat line and research step matches the supplied table',()=>{
  const {US_BRANCH:rows,USSR_BRANCH,DB,researchParent,Tank,BATTLE_UNITS_PER_METRE:m}=game();
  assert.deepEqual(Array.from(rows,t=>[t.id,t.n,t.hp,t.alpha,t.reload,t.pen,t.armor,t.turretArmor,t.speed]),[
    ['T1C','T1 Cunningham',120,38,2300,39,10,10,32],['T2MEDIUM','T2 Medium Tank',185,45,2300,50,22,22,40],
    ['M2MEDIUM','M2 Medium Tank',270,65,3000,62,25,25,42],['M3LEE','M3 Lee',400,110,3800,92,51,38,38],
    ['M4SHERMAN','M4 Sherman',600,115,3500,122,51,76,48],['M4A3E8','M4A3E8 Sherman',820,140,3800,142,63,76,48],
    ['T20','T20',1080,240,6800,165,63,89,56],['PERSHING','M26 Pershing',1400,240,6200,190,102,127,48],
    ['M46PATTON','M46 Patton',1700,360,7600,218,102,127,48],['M48PATTON','M48 Patton',2050,390,7200,255,120,254,45]
  ]);
  assert.deepEqual(Object.keys(DB).filter(id=>DB[id].nat==='usa' && !DB[id].source),Array.from(rows,t=>t.id));
  for (const [i,t] of rows.entries()) {
    assert.equal(researchParent(t.id),rows[i-1]?.id);assert.equal(t.tier,i+1);assert.equal(t.xp,USSR_BRANCH[i].xp);
    const u=new Tank(t.id,0,0,'player');assert.equal(u.magSize,1);assert.equal(u.dmg,t.alpha);
    assert.equal(u.reloadTime,t.reload);assert.equal(Math.round(u.baseSpeed*60*3.6/m),t.speed);
  }
});


test('two forks, one starter each: all Object 140 and Waffenträger route stats apply to the playable tanks',()=>{
  const {BRANCHES,USSR_MEDIUM_BRANCH:med,GERMAN_TD_BRANCH:td,DB,Tank,researchParent,armorLabel,BATTLE_UNITS_PER_METRE:m}=game();
  const table = route=>Array.from(route,t=>{
    const u=new Tank(t.id,0,0,'player');
    return [t.n,u.maxHp,u.dmg,u.magSize,u.reloadTime,u.pen,u.armor,u.turretArmor,Math.round(u.baseSpeed*60*3.6/m)];
  });
  assert.deepEqual(table(med),[
    ['МС-1',120,40,1,2500,40,16,16,22],['БТ-2',170,45,1,2300,50,13,13,52],
    ['БТ-7',250,55,1,2400,65,22,15,60],['А-20',380,85,1,3200,88,25,25,65],
    ['Т-34',580,110,1,3400,118,45,45,55],['Т-34-85',800,180,1,5200,145,45,90,54],
    ['Т-43',1100,190,1,4800,160,75,90,51],['Т-44',1350,260,1,6600,195,90,150,52],
    ['Т-54',1650,310,1,6800,220,120,200,55],['Объект 140',1950,320,1,5800,250,100,240,55]
  ]);
  assert.deepEqual(table(td),[
    ['Leichttraktor',115,35,1,2200,38,14,12,30],['Panzerjäger I',145,55,1,2400,68,15,null,40],
    ['Marder II',205,115,1,4300,105,30,null,40],['Marder 38T',310,135,1,4200,125,50,null,42],
    ['Pz.Sfl. IVc',460,220,1,6200,165,20,null,52],['Nashorn',660,240,1,5800,203,30,null,40],
    ['Sturer Emil',900,460,1,11200,231,50,null,25],['Rhm.-Borsig Waffenträger',1150,490,1,10500,246,20,20,35],
    ['Waffenträger auf Pz. IV',1550,520,1,10200,276,80,20,38],['Waffenträger auf E 100',2000,520,4,40000,276,200,20,40]
  ]);
  assert.equal(armorLabel(DB.STEMIL),'50 / —');assert.equal(DB.WTE100.alpha,2080);
  for(const [nation,route] of [['ussr',med],['germany',td]]){
    const tree=BRANCHES[nation],old=tree.routes[0];
    assert.ok(tree.routes.includes(route));assert.equal(old[0],route[0]);assert.equal(tree.tanks.length,nation==='ussr'?37:46);
    assert.equal(new Set(tree.tanks.map(t=>t.id)).size,tree.tanks.length);assert.equal(route.length,10);
    for(const [i,t] of route.entries()){
      assert.equal(DB[t.id],t);assert.equal(t.nat,nation);assert.equal(t.tier,i+1);assert.equal(t.xp,old[i].xp);
      assert.equal(researchParent(t.id),route[i-1]?.id);if(i>0)assert.ok(!old.includes(t));
    }
  }
});

test('casemates: honour asymmetric model traverse and use hull armour for the upper mesh; Rhm.-Borsig has a turret',()=>{
  const {Tank,GameState:g,traceBattleRay,resolveHit}=game();const rad=d=>d*Math.PI/180;
  const m=new Tank('MARDER2',100,0,'enemy'), r=new Tank('RHMBWT',100,0,'enemy'), shooter=new Tank('T34',0,0,'player');
  assert.ok(m.canTraverseTo(rad(31)) && !m.canTraverseTo(rad(33)) && !m.canTraverseTo(rad(-26)) && m.canTraverseTo(rad(-24)));
  assert.ok(r.canTraverseTo(Math.PI));m.setLook(rad(-70),1);m.slewSight(Math.PI,Math.PI);
  assert.ok(Math.abs(m.tAngle-rad(-25))<1e-8 && Math.abs(m.aimPitch-rad(10))<1e-8);
  const box=(lo,hi)=>({boundingBox:{min:{x:-1,y:lo,z:-1},max:{x:1,y:hi,z:1}}});
  for(const u of [m,r]){
    u.modelAsset={groundY:0,hull:box(0,1),pivot:[0,1,0],turret:box(0,1)};u.angle=u.tAngle=Math.PI;
    g.units=[shooter,u];g.walls=[];
    const hit=traceBattleRay(0,0,1.5*u.modelScale,1,0,0,200,shooter);
    assert.equal(hit.hit,u);assert.equal(hit.part,u===m?'hull':'turret');
    assert.equal(resolveHit({a:0,pen:22,dmg:55,shooter},u,hit.part).dmg,u===m?0:55);
  }
});


test('Sweden: both supplied I–X tables govern real vehicles with independent prerequisites and one shared root',()=>{
  const {BRANCHES,Tank,DB,researchParent,BATTLE_UNITS_PER_METRE:m}=game(),se=BRANCHES.sweden;
  assert.equal(se.routes.length,2);assert.equal(se.tanks.length,19);assert.equal(se.routes[0][0],se.routes[1][0]);
  const root=['STRVFM21',115,36,1,2200,38,14,14,25];
  const rows=[
    [root,['STRVM38',170,45,1,2300,50,15,15,45],['STRVM40L',255,50,1,2300,64,35,35,48],['LAGO',380,75,1,2700,90,34,34,45],
    ['STRVM42',570,120,1,3700,115,55,55,45],['STRV74',790,150,1,4000,148,55,55,45],['LEO',1080,280,1,8000,168,70,70,55],
    ['EMIL1',1500,320,3,22000,215,100,180,48],['EMIL2',1850,400,3,25000,242,120,230,50],['KRANVAGN',2200,400,3,22000,252,90,280,55]],
    [root,['PVLVV42',145,45,1,2100,62,15,15,45],['IKV72',200,110,1,4200,88,19,null,57],['SAV43',320,140,1,4600,118,50,null,43],
    ['IKV103',480,260,1,8000,140,19,null,48],['IKV65',680,240,1,6200,195,25,null,60],['IKV90',920,260,1,5800,220,25,null,65],
    ['UDES03',1150,390,1,8500,275,20,null,70],['STRV1030',1500,390,1,7400,295,40,null,50],['STRV103B',1800,390,1,6500,308,40,null,50]]
  ];
  for(const [lane,route] of se.routes.entries()){
    assert.equal(route.length,10);for(const [i,t] of route.entries()){
      assert.equal(t.nat,'sweden');assert.equal(DB[t.id],t);assert.equal(t.tier,i+1);assert.equal(t.xp,BRANCHES.ussr.routes[0][i].xp);
      assert.equal(researchParent(t.id),route[i-1]?.id);
      const u=new Tank(t.id,0,0,'player');assert.deepEqual([u.id,u.hp,u.dmg,u.magSize,u.reloadTime,u.pen,u.armor,u.turretArmor,Math.round(u.baseSpeed*60*3.6/m)],rows[lane][i]);
      if(lane && i>=7){u.setLook(1,.2);u.slewSight(3,1);assert.equal(u.tAngle,0);assert.ok(!u.canTraverseTo(.01));}
    }
  }
});


test('each vehicle has its own transparent offline WebP and data-only mesh, never a model card',()=>{
  const {DB}=game(),icons=new Set();
  for(const t of Object.values(DB)){
    const icon=fs.readFileSync(path.join(root,'models',t.thumbnail));assert.equal(icon.toString('ascii',8,12),'WEBP');
    assert.equal(icon.toString('ascii',12,16),'VP8X');assert.ok(icon[20]&16,t.id+' missing alpha');icons.add(require('crypto').createHash('sha256').update(icon).digest('hex'));
    const model=fs.readFileSync(path.join(root,'models',t.file),'utf8');assert.match(model,/^BattleModels\.receive\(\{/);
    const data=JSON.parse(model.slice('BattleModels.receive('.length,-3));assert.equal(data.id,t.id);assert.equal(data.meshes.length,t.id==='TL7OLEN'?10:5);
  }assert.equal(icons.size,Object.keys(DB).length);
  assert.ok(!fs.readdirSync(path.join(root,'models')).some(f=>f.endsWith('.html')));
});


test('IS-4 shares I–V with IS-7, then uses five independent single-shot heavy tanks and their supplied base stats',()=>{
  const {BRANCHES,USSR_BRANCH:original,DB,Tank,GameState:g,at,researchParent,BATTLE_UNITS_PER_METRE:m}=game();
  const route=BRANCHES.ussr.routes.find(r=>r.at(-1).id==='IS4');
  assert.equal(BRANCHES.ussr.routes.length,6);assert.equal(route.length,10);
  for(let i=0;i<5;i++)assert.equal(route[i],original[i],'one owned vehicle shared between both routes');
  assert.deepEqual(Array.from(BRANCHES.ussr.tanks).filter(t=>t.parent==='KV1').map(t=>t.id),['KV1S','T150']);
  const rows=[
    ['T150','Т-150',1050,300,9200,167,90,100,35,8000],
    ['KV3','КВ-3',1420,390,11200,175,120,130,32,25000],
    ['KV4','КВ-4',1750,320,8600,227,180,180,30,60000],
    ['STI','СТ-I',2050,440,11200,258,140,250,40,120000],
    ['IS4','ИС-4',2600,440,10200,262,160,250,43,195000]
  ];
  for(const [i,row] of rows.entries()){
    const [id,name,hp,dmg,reload,pen,hull,turret,speed,xp]=row,t=route[i+5];
    assert.equal(t,DB[id]);assert.equal(t.nat,'ussr');assert.equal(t.cls,'ht');assert.equal(t.tier,i+6);
    assert.equal(t.xp,xp);assert.equal(researchParent(id),route[i+4].id);assert.ok(!original.includes(t));
    for(const team of ['player','enemy']){
      const u=new Tank(id,0,0,team);assert.deepEqual([u.name,u.hp,u.dmg,u.reloadTime,u.pen,u.armor,u.turretArmor,Math.round(u.baseSpeed*60*3.6/m)],[name,hp,dmg,reload,pen,hull,turret,speed]);
      assert.equal(u.magSize,1);u.modelAsset={groundY:0,pivot:[0,1,0],gunPivot:[0,.3,1],muzzle:[0,0,2]};g.bullets=[];
      at(100);assert.ok(u.fire());assert.equal(g.bullets[0].dmg,dmg);assert.equal(g.bullets[0].pen,pen);assert.equal(u.curMag,0);
      at(100+reload-1);assert.equal(u.fire(),false);at(100+reload);assert.ok(u.fire());assert.equal(g.bullets.length,2);
    }
  }
});

test('Maus, E 100 and T-100 LT: supplied rows, shared prerequisites and single-shot handling in battle', () => {
  const { BRANCHES, DB, Tank, GameState, at, BATTLE_UNITS_PER_METRE: m } = game();
  const route = (nation, end) => BRANCHES[nation].routes.find(r => r.at(-1).id === end);
  const maus = route('germany', 'MAUS'), e100 = route('germany', 'E100');
  const scout = route('ussr', 'T100LT'), medium = route('ussr', 'OBJ140');
  assert.equal(Object.values(BRANCHES).reduce((n, tree) => n + tree.routes.length, 0), 16);
  assert.equal(maus[0], DB.LTR);
  for (let i = 0; i < 5; i++) assert.equal(e100[i], maus[i]);
  for (let i = 0; i < 4; i++) assert.equal(scout[i], medium[i]);
  assert.notEqual(DB.T54L, DB.T54); assert.notEqual(DB.E100, DB.WTE100);
  const rows = [
    [maus, 1, [
      ['PZ35T',175,45,2300,52,25,25,35], ['PZ38T',265,60,2600,72,50,25,42],
      ['PZIVD',390,110,3800,85,30,35,40], ['PZIVH',600,125,3700,135,80,50,40],
      ['VK3001P',920,220,7000,145,75,80,50], ['TIGERP',1450,240,6600,203,200,120,35],
      ['VK10001P',1850,440,12200,220,200,230,20], ['MAUSCHEN',2300,490,12500,246,200,240,20],
      ['MAUS',3000,490,11800,250,200,260,20]
    ]],
    [e100, 5, [
      ['VK3601H',1000,220,6800,148,100,100,40], ['TIGERI',1500,240,5800,203,100,100,40],
      ['TIGERII',1650,360,9200,225,150,185,38], ['E75',2100,490,12500,246,160,252,38],
      ['E100',2700,680,16500,246,200,250,30]
    ]],
    [scout, 4, [
      ['T50',520,75,2600,112,45,45,55], ['MT25',670,90,2700,138,45,45,62],
      ['LTG',890,180,5200,155,40,100,65], ['LTTB',1120,190,4800,178,75,90,68],
      ['T54L',1420,250,6000,200,80,160,69], ['T100LT',1700,300,6200,230,90,180,72]
    ]]
  ];
  for (const [line, start, values] of rows) {
    assert.equal(line.length, 10);
    for (const [i, row] of values.entries()) {
      const idx = start + i, t = line[idx];
      assert.equal(t, DB[row[0]]); assert.equal(t.parent, line[idx - 1].id);
      assert.equal(t.xp, BRANCHES.usa.tanks[idx].xp); assert.equal(t.tier, idx + 1);
      for (const team of ['player', 'enemy']) {
        const u = new Tank(t.id, 0, 0, team);
        assert.deepEqual([u.id, u.hp, u.dmg, u.reloadTime, u.pen, u.armor, u.turretArmor,
          Math.round(u.baseSpeed * 60 * 3.6 / m)], row);
        assert.equal(u.magSize, 1); assert.ok(u.canTraverseTo(Math.PI));
        u.modelAsset = {groundY: 0, pivot: [0,1,0], gunPivot: [0,.3,1], muzzle: [0,0,2]};
        GameState.bullets = []; at(100);
        assert.ok(u.fire()); assert.equal(GameState.bullets[0].dmg, row[2]);
        assert.equal(GameState.bullets[0].pen, row[4]); assert.ok(u.isReloading);
        at(100 + row[3] - 1); assert.equal(u.fire(), false);
        at(100 + row[3]); assert.ok(u.fire()); assert.equal(GameState.bullets.length, 2);
      }
    }
  }
});

test('12 special vehicles use the supplied combat stats, nonresearch acquisition and decorated submeshes',()=>{
  const {DB,BRANCHES,Tank,BATTLE_UNITS_PER_METRE:m}=game();
  assert.equal(Object.values(BRANCHES).flatMap(b=>b.tanks).length,112);
  const rows=[['M4A3E2',6,880,140,1,4000,138,102,152,35],['T71DA',7,860,150,6,20000,175,25,25,64],
    ['JPANTHERII',8,1200,490,1,10800,246,100,null,55],['T62A',10,1950,320,1,5600,255,102,240,50],
    ['TL7',9,1500,360,4,32000,252,100,200,50],['IS6',8,1550,390,1,10800,196,100,150,35],
    ['LOWE',8,1650,320,1,9200,234,150,120,35],['T34HEAVY',8,1550,400,1,12200,248,102,279,35],
    ['STA2',8,1380,240,1,5700,212,45,70,55],['STRVS1',8,1100,390,1,8800,288,30,null,50],
    ['BT42',4,370,210,1,7500,75,22,15,54],['TL7OLEN',9,1500,360,4,32000,252,100,200,50]];
  for (const [i,row] of rows.entries()) {
    const u=new Tank(row[0],0,0,'player'),t=DB[u.id];
    assert.deepEqual([u.id,t.tier,u.maxHp,u.dmg,u.magSize,u.reloadTime,u.pen,u.armor,u.turretArmor,Math.round(u.baseSpeed*60*3.6/m)],row);
    assert.equal(t.source,i<5?'collection':i<10?'premium':'advent');assert.equal(t.xp,undefined);assert.equal(t.parent,undefined);
  }
  const data=id=>JSON.parse(fs.readFileSync(path.join(root,'models',DB[id].file),'utf8').slice('BattleModels.receive('.length,-3));
  const regular=data('TL7'),deer=data('TL7OLEN');assert.deepEqual(deer.meshes.slice(0,5),regular.meshes);
  assert.notEqual(deer.color,regular.color);assert.deepEqual(deer.meshes.slice(5).map(m=>[m[0],m[3]]),[
    ['body','#ece7dc'],['turret','#ece7dc'],['turret','#b9a87f'],['turret','#b9a87f'],['gun','#c63b2a']]);
  assert.equal(deer.triangles,5175);assert.equal(regular.triangles,4707);
  assert.equal(DB.BT42.nat,'finland');assert.equal(DB.STA2.nat,'japan');assert.equal(DB.T34HEAVY.nat,'usa');
});

test('five supplied progression tables: one record per shared tier, twenty new single-shot vehicles in both teams', () => {
  const {BRANCHES, DB, Tank, BATTLE_UNITS_PER_METRE: m} = game();
  const routes = [ // existing route, shared tiers, followed by columns transcribed from each card
    ['OBJ140', 8, [
      ['OBJ430',1750,390,8800,232,120,248,50], ['OBJ430U',2050,440,9000,252,160,300,50]
    ]],
    ['OBJ140', 5, [
      ['A43',780,115,3000,135,75,75,55], ['A44',1100,300,8800,167,75,90,59],
      ['OBJ416',1200,320,6800,201,75,110,50], ['OBJ430II',1600,320,6200,219,120,248,55], ['K91',1900,320,5200,276,140,220,55]
    ]],
    ['WTE100', 9, [['GRILLE15',1800,750,14500,279,30,20,60]]],
    ['MAUS', 5, [
      ['VK3002M',840,135,3600,150,60,100,55], ['PANTHER',1200,135,3200,198,85,120,55],
      ['PANTHERII',1450,240,6000,223,100,120,55], ['E50',1750,390,8200,220,150,185,60], ['E50M',2050,390,7600,270,150,250,60]
    ]],
    ['WTE100', 3, [
      ['HETZER',330,110,3600,110,60,null,42], ['STUG3G',490,135,3600,150,80,null,40],
      ['JGPZIV',700,220,5200,145,80,null,40], ['JAGDP',980,320,7200,200,80,null,55],
      ['FERDINAND',1400,490,11000,246,200,null,30], ['JAGDTIGER',1850,560,10500,276,250,null,38], ['JGPZE100',2200,1050,22000,299,250,null,30]
    ]]
  ];
  const traverse = {GRILLE15:10,HETZER:11,STUG3G:11,JGPZIV:12,JAGDP:10,FERDINAND:14,JAGDTIGER:10,JGPZE100:10};
  const added = new Set();
  for (const [sibling, shared, rows] of routes) {
    const tree = BRANCHES[DB[sibling].nat], lookup = end => tree.routes.find(r => r.at(-1).id === end);
    const old = lookup(sibling), route = lookup(rows.at(-1)[0]);
    assert.equal(route.length, 10); assert.equal(rows.length + shared, 10);
    for (let i=0; i<shared; i++) assert.equal(route[i], old[i], 'shared nodes must not be copied');
    for (const [i,row] of rows.entries()) {
      const idx = shared+i, t = route[idx], id = row[0];
      assert.equal(t, DB[id]); assert.equal(t.parent, route[idx-1].id); assert.equal(t.tier, idx+1);
      assert.equal(t.nat, old[0].nat); assert.equal(t.xp, old[idx].xp); assert.equal(t.source, undefined);
      assert.ok(!added.has(id) && !old.includes(t)); added.add(id);
      assert.equal(t.cls, sibling === 'WTE100' ? 'td' : 'mt');
      for (const team of ['player','enemy']) {
        const u = new Tank(id,0,0,team), rad = d => d*Math.PI/180;
        assert.deepEqual([id,u.hp,u.dmg,u.reloadTime,u.pen,u.armor,u.turretArmor,Math.round(u.baseSpeed*60*3.6/m)],row);
        assert.equal(u.magSize,1); assert.equal(u.minPitch,rad(id === 'STUG3G' ? -6 : -5));
        assert.equal(u.maxPitch,rad(id === 'STUG3G' ? 14 : 15));
        assert.equal(u.maxYaw,rad(traverse[id] ?? 180)); assert.equal(u.minYaw,-u.maxYaw);
      }
    }
  }
  assert.equal(added.size,20); assert.equal(DB.JPANTHERII.source,'collection');
});
