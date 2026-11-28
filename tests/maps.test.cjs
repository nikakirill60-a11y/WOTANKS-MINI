const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.CITY_TANKS_INDEX
  ? path.dirname(path.resolve(process.env.CITY_TANKS_INDEX))
  : path.resolve(__dirname, '..');

function game() {
  const noop = () => {};
  const ctx = vm.createContext({
    console: { log: noop },
    window: { addEventListener: noop },
    document: { addEventListener: noop, getElementById: () => ({ getContext: noop }) },
    performance: { now: () => 2000 },
    snd: noop,
    boom: noop,
    spawnParticles: noop,
    spawnShellCasing: noop,
    combatMessage: noop,
    updateScoreboard: noop
  });
  for (const file of [
    'models/catalog',
    'js/tree-event',
    'js/config',
    'js/battle-space',
    'js/battle-ground',
    'js/sector-expansion',
    'js/battle-maps',
    'js/battle-navigation',
    'js/battle-recon',
    'js/artillery',
    'js/bot-ai',
    'js/terrain',
    'js/track-contact',
    'js/track-drive',
    'js/armor-system',
    'js/destructible',
    'js/tank',
    'js/battle',
    'js/main',
    'js/features/combat-mechanics',
    'js/features/weather-environments'
  ]) {
    vm.runInContext(readFileSync(path.join(root, file + '.js'), 'utf8'), ctx, { filename: file });
  }
  return vm.runInContext(
    '({DB,PLAYABLE_NATIONS,makeRosters,BOT_CLEARANCE,BATTLE_UNITS_PER_METRE,BattleRecon,BattleMaps,BattleNavigation,battleFormation,BotAI,GameState,Tank,damageWall,canSee,teamSees,CombatMechanics,WeatherEngine,TrackDrive,getTerrainAt,nearestBattleWall})',
    ctx
  );
}

function assertRoute(nav, from, to) {
  const path = nav.route(from, to);
  assert.ok(path.length, 'no route');
  let last = from;
  for (const p of path) {
    assert.ok(nav.clear(last.x, last.y, p.x, p.y), 'corner cutting or a segment through water/cover');
    last = p;
  }
  assert.ok(Math.hypot(last.x - to.x, last.y - to.y) < 1, 'route must actually reach its destination');
  return path;
}

test('ten maps: separated spawns, a clear practice lane and reachable ground for all three team sizes', () => {
  const { BattleMaps, BattleNavigation, BattleRecon, battleFormation, BOT_CLEARANCE, BATTLE_UNITS_PER_METRE: m } = game();
  const previousMetres = {
    city: [420, 300],
    field: [500, 360],
    desert: [540, 360],
    port: [400, 300],
    quarry: [480, 340],
    frost: [520, 380]
  };
  assert.deepEqual(Object.keys(BattleMaps.specs), ['city','field','desert','port','quarry','frost','burgstadt','cape','sawmill','airfield']);
  for (const id of Object.keys(BattleMaps.specs)) {
    const a = BattleMaps.create(id),
      nav = new BattleNavigation(a);
    const expectedSide = { city: 700, port: 800, burgstadt:800, cape:900, sawmill:900 }[id] || 1000;
    assert.deepEqual(Array.from(a.spec.size), [expectedSide, expectedSide]);
    assert.equal(a.ground.W, a.bounds.x);
    assert.equal(a.ground.H, a.bounds.y);
    assert.equal(a.ground.at(0, 0), 0, id + ' level training lane');
    assert.equal(a.ground.ray(-148, 0, 5, 1, 0, 0, 283), Infinity);
    for (const r of a.walls)for(const fx of [0,.5,1])for(const fy of [0,.5,1])
      assert.ok(Math.abs(a.ground.at(r.x+r.w*fx,r.y+r.h*fy)-r.baseHeight)<.002,id+' level foundation at its rendered elevation');
    const [oldX, oldY] = previousMetres[id]?.map(v=>v*m/2) ?? [a.bounds.x*.53,a.bounds.y*.53];
    assert.deepEqual(
      [a.bounds.x, a.bounds.y],
      Array.from(a.spec.size, (v) => (v * m) / 2)
    );
    if (previousMetres[id]) assert.ok(
      a.bounds.x > oldX && a.bounds.y > oldY && a.bounds.x * a.bounds.y >= 2.9 * oldX * oldY,
      id + ' playable expansion'
    );
    for (const sign of [-1, 1]) {
      assert.ok(
        a.walls.some((w) => w.solid && sign * (w.x + w.w / 2) > oldX),
        id + ' new outer cover along x'
      );
      assert.ok(
        a.walls.some((w) => w.solid && sign * (w.y + w.h / 2) > oldY),
        id + ' new outer cover along y'
      );
    }
    assert.ok(a.walls.some(w=>w.model && w.solid),id+' has custom 3D scenery in the playable area');
    for (const p of a.paths) for (let j=1;j<p.points.length;j++) {
      const u=p.points[j-1],v=p.points[j];
      assert.ok(nav.clear(u.x,u.y,v.x,v.y),id+' painted road obstructed by scenery');
    }
    const recon = new BattleRecon(nav);
    assert.equal(recon.total, 35, id + ' accessible survey anchors');
    assert.equal(a.hubs.length, 5, id + ' distribution lanes');
    for (const r of [...a.walls, ...a.water, ...a.zones]) {
      assert.ok(
        r.w > 0 &&
          r.h > 0 &&
          r.x >= -a.bounds.x &&
          r.y >= -a.bounds.y &&
          r.x + r.w <= a.bounds.x &&
          r.y + r.h <= a.bounds.y,
        id + ' bounds'
      );
    }
    const [p, t] = battleFormation(a, nav, [['MS1'], ['IS7']]);
    assert.ok(nav.clear(p.x, p.y, t.x, t.y) && t.practice, id + ' practice');
    for (const size of [7, 10, 15]) {
      const slots = battleFormation(a, nav, [Array(size).fill('TYPE-5-H'), Array(size).fill('E100')]);
      assert.equal(slots.length, 2 * size);
      for (const side of [0, 1]) {
        const team = slots.filter((s) => s.side === side),
          scouts = team.filter((s) => s.scout);
        assert.equal(team.length, size);
        assert.equal(scouts.length, size === 15 ? 5 : 3);
        assert.equal(new Set(scouts.map((s) => s.lane)).size, scouts.length);
        assert.ok(scouts.every((s) => s.index !== 0 && s.team !== 'player'));
      }
      for (const [i, s] of slots.entries()) {
        assert.ok(slots.slice(0, i).every((o) => Math.hypot(o.x - s.x, o.y - s.y) >= 2 * BOT_CLEARANCE));
        const hub = a.hubs[s.lane],
          destination = nav.point(nav.nearest(hub.x, hub.y));
        assertRoute(nav, s, destination);
        assertRoute(nav, destination, slots[s.side ? 0 : size]);
      }
    }
    // No isolated quay/peninsula that a survey assignment could select but never reach.
    const seen = Uint8Array.from(nav.blocked),
      start = nav.nearest(0, 0),
      queue = [start];
    seen[start] = 1;
    for (let i = 0; i < queue.length; i++) {
      const k = queue[i],
        row = Math.floor(k / nav.cols),
        col = k % nav.cols;
      for (const [x, y] of [
        [col - 1, row],
        [col + 1, row],
        [col, row - 1],
        [col, row + 1]
      ]) {
        const n = x + y * nav.cols;
        if (x < 0 || x >= nav.cols || y < 0 || y >= nav.rows || seen[n]) continue;
        seen[n] = 1;
        queue.push(n);
      }
    }
    for (const [sector, stops] of recon.stops.entries()) {
      assert.ok(stops.length >= 2, id + ' has alternate searches inside every sector');
      for (const q of stops) {
        assert.equal(recon.cell(q.x, q.y), sector);
        assert.ok(seen[nav.cell(q.x, q.y)] && !nav.blocked[nav.cell(q.x, q.y)]);
      }
      assertRoute(nav, nav.point(start), stops[0]);
    }
    assert.equal(seen.indexOf(0), -1, id + ' disconnected ground');
  }
});

function fixture(api, id) {
  const a = api.BattleMaps.create(id || 'city');
  if (!id) {
    a.bounds = { x: 600, y: 460 };
    a.walls = [];
    a.ground = {min:0,max:0,at:()=>0,ray:()=>Infinity};
    a.zones = [];
    a.water = [];
    a.bases = [
      { x: -420, y: 0 },
      { x: 420, y: 0 }
    ];
    a.hubs = [
      { x: 0, y: -190 },
      { x: 0, y: 0 },
      { x: 0, y: 190 }
    ];
  }
  const nav = new api.BattleNavigation(a),
    g = api.GameState;
  Object.assign(g, { arena: a, navigation: nav, walls: a.walls, terrainZones: a.zones });
  function vehicle(x, y, team, id = 'T26') {
    const u = new api.Tank(id, x, y, team);
    u.modelAsset = {
      groundY: 0,
      aimHeight: 0.85,
      pivot: [0, 1, 0],
      gunPivot: [0, 0.25, 0.6],
      muzzle: [0, 0, 1.2],
      hull: { boundingBox: { min: { x: -1, y: 0, z: -2 }, max: { x: 1, y: 1.7, z: 2 } } },
      turret: { boundingBox: { min: { x: -0.9, y: 0.4, z: -1 }, max: { x: 0.9, y: 1.2, z: 1 } } }
    };
    g.units.push(u);
    return u;
  }
  return { a, nav, g, vehicle };
}

const wall = () => ({ type: 'building', solid: true, x: -30, y: -110, w: 60, h: 220, height: 45, hp: 40 });

// Use a deterministic stream for coverage; production calls the same deal with Math.random.
test('separate rosters: every player model and size, all research nations, premium and collectible bots on both sides, distinct models whenever the match band permits', () => {
  const { DB, PLAYABLE_NATIONS, GameState:g, makeRosters } = game();
  let seed = 113;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const specialBots = [new Set(), new Set()];
  const pool = Object.values(DB).filter(t=>!t.source || ['premium','collection'].includes(t.source));
  const owned = JSON.stringify([g.owned, g.rentalBattles, g.usedPromos]);
  for (const player of Object.values(DB)) for (const size of [7,10,15]) {
    for (const roll of [random, () => 0]) {
      const [allies, enemies] = makeRosters(player.id, size, roll);
      assert.equal(allies[0], player.id);
      const tiers=team=>Array.from(team,id=>DB[id].tier).sort((a,b)=>a-b);
      assert.deepEqual(tiers(allies),tiers(enemies));
      const band=new Set(tiers(allies));assert.ok(Math.max(...band)-Math.min(...band)<=1);
      for (const [side, team] of [allies, enemies].entries()) {
        // A special in the player's own seat does not count as a bot appearance.
        for (const id of (side === 0 ? team.slice(1) : team)) if (DB[id].source) specialBots[side].add(id);
        assert.equal(team.length,size);
        for(const tier of band) {
          const seats=team.filter(id=>DB[id].tier===tier), available=new Set(pool.filter(t=>t.tier===tier).map(t=>t.id));
          if (side===0 && player.tier===tier) available.add(player.id);
          assert.equal(new Set(seats).size,Math.min(seats.length,available.size));
        }
        assert.ok(team.every(id => Math.abs(DB[id].tier - player.tier) <= 1));
        // With a non-research player (the Finnish Advent BT-42), only six of
        // seven places remain in a 7×7. Every seat still represents a different nation.
        const seats = size - Number(side === 0 && !PLAYABLE_NATIONS.includes(player.nat));
        const represented = new Set(team.map(id => DB[id].nat).filter(n => PLAYABLE_NATIONS.includes(n)));
        assert.equal(represented.size, Math.min(seats, PLAYABLE_NATIONS.length));
      }
      if (pool.some(t=>band.has(t.tier) && !allies.includes(t.id)))
        assert.ok(enemies.some(id => !allies.includes(id)), player.id+' '+size+' distinct sets with a reserve');
    }
  }
  const eligibleSpecials = new Set(Object.values(DB).filter(t => t.source === 'premium' || t.source === 'collection').map(t => t.id));
  for (const seen of specialBots) assert.deepEqual(seen, eligibleSpecials);
  const enemies = new Set(), allies = new Set(), spgCount = [0,0]; let sameFirst = 0;
  for(let k=0;k<400;k++) {
    const [a,b] = makeRosters('MS1', 7, random);
    allies.add(a.slice().sort().join()); enemies.add(b.slice().sort().join());
    if(b[0]==='MS1')sameFirst++; if(a.includes('GPZ'))spgCount[0]++;if(b.includes('GPZ'))spgCount[1]++;
  }
  assert.ok(enemies.size>30 && allies.size>30 && sameFirst>0 && sameFirst<350, 'variety, not a compulsory counterpart or a model ban');
  assert.ok(spgCount.every(n=>n>0 && n<400));assert.equal(JSON.stringify([g.owned,g.rentalBattles,g.usedPromos]),owned);
});

test('one 50/25/25 band for both teams; boundaries fold to same tier, adjacent and sparse human seats stay legal', () => {
  const {DB,makeRosters}=game();
  for(const [id,expected] of [['KV1S',[50,25,25]],['LTR',[75,0,25]],['IS7',[75,25,0]]]) {
    const tier=DB[id].tier, observed=[0,0,0];
    for(let k=0;k<100;k++) {
      let first=true;const random=()=>{if(first){first=false;return k/100;}return .32;};
      const teams=makeRosters(id,7,random,[id,,id]);assert.equal(teams[0][2],id);
      const levels=teams.map(team=>Array.from(team,t=>DB[t].tier).sort((a,b)=>a-b));assert.deepEqual(levels[0],levels[1]);
      const [lo,hi]=[levels[0][0],levels[0][6]];assert.ok(hi-lo<=1 && lo<=tier && tier<=hi);
      observed[lo===hi?0:lo<tier?1:2]++;
    }
    assert.deepEqual(observed,expected,id);
  }
  for(const rng of [0,.5,.999]) {
    const [a,b]=makeRosters('KV1',7,()=>rng,['KV1',,'KV1S']);assert.deepEqual([a[0],a[2]],['KV1','KV1S']);
    for(const team of [a,b])assert.deepEqual(Array.from(team,t=>DB[t].tier).sort(),[5,5,5,6,6,6,6]);
  }
  assert.throws(()=>makeRosters('LTR',7,()=>0,['LTR','IS7']),/соседних/);
});

test('formation uses both actual rosters: bot SPGs spawn at their own base, scout roles follow each side’s mobile models', () => {
  const { BattleMaps, BattleNavigation, battleFormation, BOT_CLEARANCE } = game();
  for(const map of Object.keys(BattleMaps.specs)) {
    const a=BattleMaps.create(map), nav=new BattleNavigation(a);
    for(const size of [7,10,15]) {
      const teams=[Array(size).fill('T26'),Array(size).fill('KV1')], width=size===15?5:3;
      teams[0][1]='GPZ'; teams[0][1+width]='BT7';
      teams[1][1]='BT7'; teams[1][1+width]='GPZ';
      const slots=battleFormation(a,nav,teams);
      assert.equal(slots[0].team,'player');assert.ok(!slots[0].scout);
      for(const side of [0,1]) {
        const team=slots.filter(s=>s.side===side), post=team.find(s=>s.id==='GPZ');
        assert.equal(Array.from(team,s=>s.id).join(),teams[side].join());
        assert.ok(!post.scout && Math.hypot(post.x-a.bases[side].x,post.y-a.bases[side].y)<240,map+' base berth');
        assert.ok(nav.clear(post.x,post.y,post.x,post.y));
        assert.ok(slots.every(s=>s===post || Math.hypot(s.x-post.x,s.y-post.y)>=2*BOT_CLEARANCE));
        assert.equal(team.filter(s=>s.scout).length,width);
        assert.equal(team.find(s=>s.scout && s.lane===post.lane).id,'BT7');
      }
    }
  }
});

test('mobile bots hold a usable position, regroup when outnumbered or low on HP and resume after danger clears', () => {
  for(const side of [0,1]) for(const lowHP of [false,true]) {
    const { BotAI, ...api }=game(), { nav, vehicle }=fixture(api);
    const us=side?'enemy':'ally', them=side?'player':'enemy', dir=side?-1:1;
    const bot=vehicle(0,0,us), target=vehicle(dir*360,0,them), extra=vehicle(dir*390,55,them);
    bot.angle=bot.tAngle=bot.lookYaw=side?Math.PI:0;
    BotAI.attach(bot,{side,index:0,lane:1},nav);target.spotted=true;
    bot.nextShot=1e6;bot.isReloading=true;
    const step=i=>{BotAI.beginTick(nav,i);BotAI.step(bot,i);};
    for(let i=1;i<=40;i++)step(i);
    assert.equal(bot.bot.mode,'engage','hidden enemy does not count');assert.ok(Math.abs(bot.x)<1,'no needless closing');
    if(lowHP)bot.hp=bot.maxHp*.30;else extra.spotted=true;
    // A dead teammate is neither support nor a reason to drive on.
    vehicle(-dir*15,60,us).dead=true;
    for(let i=41;i<=370;i++)step(i);
    assert.equal(bot.bot.mode,'regroup');assert.ok(bot.x*dir < -35,'actually backed off along walkable ground');
    assert.ok(nav.clear(bot.x,bot.y,bot.x,bot.y));
    target.spotted=extra.spotted=false;step(371);
    assert.equal(bot.bot.target,null);assert.equal(bot.bot.mode,'regroup','no immediate rush to last-known point');
    const until=bot.bot.regroupUntil;
    for(let i=372;i<=until+20;i++)step(i);
    assert.notEqual(bot.bot.mode,'regroup','not parked for the rest of the match');
  }
});

test('last two low-HP bots stop searching and rally to fixed berths; a standing allied SPG stays at its post', () => {
  for(const withPost of [false,true]) {
    const api=game(),{nav,vehicle}=fixture(api), home=nav.arena.bases[1];
    const movers=[vehicle(320,170,'enemy'),withPost?vehicle(home.x,home.y,'enemy','GPZ'):vehicle(320,-170,'enemy')];
    const lost=vehicle(0,-270,'enemy'), foe=vehicle(-300,-210,'ally');
    movers.forEach((u,i)=>{api.BotAI.attach(u,{side:1,index:i,lane:i},nav);u.hp=1;});
    const tick=i=>{api.BotAI.beginTick(nav,i);for(const u of movers)api.BotAI.step(u,i);};
    tick(1);assert.ok(movers.every(u=>!u.bot.stand));lost.dead=true;tick(12);
    const [first,other]=movers.map(u=>u.bot.stand || u.bot.post);
    assert.ok(Math.hypot(first.x-other.x,first.y-other.y)>=2*api.BOT_CLEARANCE);
    assert.ok(Math.hypot(first.x-(withPost?home.x:0),first.y)<140);
    for(let i=13;i<1700;i++)tick(i);
    for(const u of movers){const q=u.bot.stand || u.bot.post;assert.ok(Math.hypot(u.x-q.x,u.y-q.y)<50);
      assert.equal(u.bot.mode,u.isSPG?'base':'lastStand');assert.equal(u.bot.sector,-1);assert.equal(u.bot.target,null);}
    foe.x=first.x-90;foe.y=first.y;foe.spotted=true;movers[0].isReloading=true;tick(1728);
    assert.equal(movers[0].bot.mode,'lastStand');assert.equal(movers[0].bot.target,foe);assert.equal(movers[0].bot.stand,first);
    if(withPost)assert.deepEqual([movers[1].x,movers[1].y],[home.x,home.y]);
  }
});

test('survey, combat and SPG sight never exceed the player hull and relative mount rates on asphalt', () => {
  const wrap=a=>Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));
  for(const [id,deg] of [['BT2',52],['M4SHERMAN',42],['KV1',30],['T67',34],['GPZ',34]]) {
    const api=game(),{nav,g,vehicle}=fixture(api), u=vehicle(0,0,'ally',id), e=vehicle(20,320,'enemy');
    g.terrainZones=[{x:-600,y:-460,w:1200,h:920,type:'asphalt'}];
    api.BotAI.attach(u,{side:0,index:0,lane:0},nav);let maxHull=0,maxMount=0;
    for(let i=1;i<=180;i++) {
      if(i===61)e.spotted=true;
      const hull=u.angle,rel=u.tAngle-hull,pitch=u.aimPitch;api.BotAI.beginTick(nav,i);api.BotAI.step(u,i);
      maxHull=Math.max(maxHull,wrap(u.angle-hull));maxMount=Math.max(maxMount,wrap(u.tAngle-u.angle-rel));
      assert.ok(Math.abs(u.aimPitch-pitch)<=28*Math.PI/180/60+1e-8,id+' elevation');
    }
    assert.ok(maxHull<=api.TrackDrive.profile(u).traverse/60+1e-8,id+' hull');
    assert.ok(maxMount>0 && maxMount<=deg*Math.PI/180/60+1e-8,id+' relative yaw');
  }
});

test('bot artillery on either side stays at its post, uses only team sightings and goes back if displaced', () => {
  for(const side of [0,1]) {
    const api=game(), { a, nav, g, vehicle }=fixture(api), home=a.bases[side];
    const us=side?'enemy':'ally', them=side?'player':'enemy', dir=side?-1:1;
    const gun=vehicle(home.x,home.y,us,'GPZ'), t=vehicle(-home.x,42,them), ally=vehicle(t.x,t.y+12,us);
    gun.angle=gun.lookYaw=gun.tAngle=side?Math.PI:0;
    api.BotAI.attach(gun,{side,index:2,lane:1,scout:true},nav);g.holdTurret=true; // player's controls do not operate this NPC
    const tick=i=>{api.BotAI.beginTick(nav,i);api.BotAI.step(gun,i);};
    for(let i=1;i<=120;i++)tick(i);
    assert.equal(gun.bot.mode,'base');assert.equal(gun.bot.scout,false);assert.equal(gun.bot.sector,-1);assert.equal(gun.bot.goal,null);
    assert.equal(g.bullets.length,0,'cannot see through fog');
    t.spotted=true;
    for(let i=121;i<=400;i++)tick(i);
    assert.equal(gun.bot.target,t);assert.equal(g.bullets.length,0,'friendly too near the board cursor');
    ally.dead=true;
    for(let i=401;i<=520;i++)tick(i);
    assert.equal(g.bullets.length,1);const shot=g.bullets[0];assert.ok(shot.arc && shot.shooter===gun && gun.isReloading);
    assert.equal(gun.nextShot,16500);assert.equal(gun.x,home.x);assert.equal(gun.y,home.y);
    t.spotted=false;const old=gun.bot.board.x;t.x+=dir*110;
    for(let i=521;i<=600;i++)tick(i);
    assert.equal(gun.bot.target,null);assert.equal(gun.bot.board.x,old);assert.equal(gun.bot.sector,-1);
    gun.x+=dir*185;tick(601);assert.equal(gun.bot.mode,'return');
    for(let i=602;i<=1700;i++)tick(i);
    assert.equal(gun.bot.mode,'base');assert.ok(Math.hypot(gun.x-home.x,gun.y-home.y)<35);assert.equal(g.bullets.length,1);
  }
});

test('solid cover changes the route; bots really steer around it, and destruction opens a new route', () => {
  const api = game(),
    { a, nav, g, vehicle } = fixture(api),
    w = wall();
  a.walls.push(w);
  a.revision++;
  api.BotAI.beginTick(nav, 0);
  const from = { x: -300, y: 0 },
    to = { x: 300, y: 0 };
  assert.ok(!nav.clear(from.x, from.y, to.x, to.y));
  assert.ok(assertRoute(nav, from, to).length > 1);
  const u = vehicle(from.x, from.y, 'ally');
  api.BotAI.attach(u, { side: 0, lane: 1, index: 0 }, nav);
  u.bot.opening = to;
  let detour = 0;
  for (let t = 1; t < 1800 && Math.hypot(u.x - to.x, u.y - to.y) > 18; t++) {
    api.BotAI.beginTick(nav, t);
    api.BotAI.step(u, t);
    assert.ok(nav.clear(u.x, u.y, u.x, u.y));
    detour = Math.max(detour, Math.abs(u.y));
  }
  assert.ok(detour > w.h / 2 && Math.hypot(u.x - to.x, u.y - to.y) <= 18, 'controller reached the far side');
  const revision = a.revision;
  api.damageWall(w, w.hp, 0);
  api.BotAI.beginTick(nav, 0);
  assert.ok(w.destroyed && g.walls.length === 0 && nav.revision > revision);
  assert.equal(assertRoute(nav, from, to).length, 1);
  const fresh = api.BattleMaps.create('city');
  assert.ok(fresh.walls.length && fresh.walls.every((w) => !w.destroyed));
});

test('bots prefer an open contact; teammates, intervening cover and smoke withhold a shot, then contact expires', () => {
  const api = game(),
    { g, nav, vehicle } = fixture(api);
  const u = vehicle(-116, 0, 'ally'),
    hidden = vehicle(-116, 124, 'enemy'),
    t = vehicle(83, 0, 'enemy');
  g.walls.push({ ...wall(), x: -140, y: 40, w: 60, h: 24 });
  g.arena.revision++;
  // The second contact is reported by a teammate, but the shooter's view of it is blocked.
  vehicle(-310, 0, 'ally'); // support behind the observer: this fixture is about sight, not regrouping
  hidden.spotted = t.spotted = true;
  u.nextShot = 10000;
  api.BotAI.attach(u, { side: 0, lane: 1, index: 0 }, nav);
  const tick = (n) => {
    api.BotAI.beginTick(nav, n);
    api.BotAI.step(u, n);
  };
  for (let n = 1; n <= 33; n++) tick(n);
  assert.equal(u.bot.target, t);
  assert.ok(u.bot.aimTicks >= 24 && api.canSee(u, t) && !api.canSee(u, hidden));
  u.nextShot = 0;
  const ally = vehicle(0, 0, 'player');
  tick(34);
  assert.equal(g.bullets.length, 0, 'friend in the lane');
  ally.dead = true;
  g.walls.push({ ...wall(), x: -53, y: -30, w: 15, h: 60 });
  g.arena.revision++;
  tick(35);
  assert.equal(g.bullets.length, 0, 'wall after last observation');
  g.walls.pop();
  g.arena.revision++;
  api.CombatMechanics.smokeClouds.push({ x: -21, y: 0, radius: 38 });
  tick(36);
  assert.ok(!api.teamSees(t, 'player'));
  assert.equal(g.bullets.length, 0, 'smoke');
  api.CombatMechanics.smokeClouds = [];
  tick(37);
  assert.equal(g.bullets.length, 1);
  assert.equal(g.bullets[0].shooter, u);
  api.BotAI.onBlockedHit(u, t);
  assert.equal(u.bot.shell, 2, 'uses the alternate arcade shell after a deflection');
  const last = { ...u.bot.memory };
  t.spotted = hidden.spotted = false;
  t.x = 470;
  t.y = 330;
  tick(38);
  assert.equal(u.bot.target, null);
  assert.equal(u.bot.mode, 'search');
  assert.equal(u.bot.memory.x, last.x);
  assert.equal(u.bot.memory.y, last.y, 'no live tracking through cover');
  tick(last.until + 1);
  assert.equal(u.bot.memory, null);
  assert.equal(u.bot.mode, 'investigate', 'a newer radio sighting can outlast personal memory');
  tick(38 + api.BattleRecon.reportLife);
  assert.equal(u.bot.mode, 'survey');
});

test('deep water depends on model height, banks are safe and both teams recover at the same rate', () => {
  const api = game(),
    { vehicle } = fixture(api),
    land = api.BattleMaps.create('frost'),
    r = land.water[1];
  api.WeatherEngine.initWeatherForBattle(land);
  for (const team of ['player', 'enemy']) {
    const u = vehicle(r.x + r.w / 2, r.y + r.h / 2, team);
    const center = u.x;
    u.x = r.x + 0.1;
    api.WeatherEngine.updateWaterPhysics(u, 11);
    assert.ok(!u.dead && u.drownTimer == null, 'shallow shoreline');
    u.x = center;
    api.WeatherEngine.updateWaterPhysics(u, 4);
    assert.equal(u.drownTimer, 6);
    u.y = 0;
    api.WeatherEngine.updateWaterPhysics(u, 0.5);
    assert.equal(u.drownTimer, null);
    u.y = r.y + r.h / 2;
    api.WeatherEngine.updateWaterPhysics(u, 1);
    assert.equal(u.drownTimer, 6, 'one second of immersion recovered in half a second on land');
    api.WeatherEngine.updateWaterPhysics(u, 6);
    assert.ok(u.dead && u.hp === 0);
  }
});

test('without contact the scouts split up, drive into the outer map and keep surveying instead of parking', () => {
  const api = game(),
    { a, nav, g, vehicle } = fixture(api, 'port');
  const slots = api
    .battleFormation(
      a,
      nav,
      [Array.from({ length: 15 }, (_, i) => (i % 2 ? 'BT7' : 'T26')), Array(15).fill('MS1')]
    )
    .slice(0, 15);
  for (const s of slots) {
    const u = vehicle(s.x, s.y, s.team, s.id);
    u.angle = u.tAngle = u.lookYaw = s.angle;
    if (s.team !== 'player') api.BotAI.attach(u, s, nav);
  }
  const r = nav.recon,
    team = r.teams[0],
    entered = new Set(),
    goals = new Set(),
    surveyors = new Set();
  const moved = new Set();
  let outer = false;
  for (let tick = 1; tick <= 6000; tick++) {
    if (tick === 1 || tick % 12 === 0) for (const u of g.units) entered.add(r.cell(u.x, u.y));
    api.BotAI.beginTick(nav, tick);
    for (const [i, u] of g.units.entries())
      if (u.bot) {
        api.BotAI.step(u, tick);
        const b = u.bot;
        if (b.mode === 'survey') {
          goals.add(b.sector);
          surveyors.add(i);
          // A scout can't discover a cell just by claiming it from across the map.
          if (tick === 1) assert.equal(team.visited[b.sector], -1);
          if (
            Math.abs(u.x) > 200 * api.BATTLE_UNITS_PER_METRE ||
            Math.abs(u.y) > 150 * api.BATTLE_UNITS_PER_METRE
          )
            outer = true;
        }
        if (Math.hypot(u.x - slots[i].x, u.y - slots[i].y) > 180) moved.add(i);
        if (tick % 12 === 0)
          assert.ok(nav.clear(u.x, u.y, u.x, u.y), 'actual drive remains on passable ground');
      }
    const busy = g.units.filter((u) => u.bot?.sector >= 0);
    assert.equal(
      new Set(busy.map((u) => u.bot.sector)).size,
      busy.length,
      'live allies reserve different destinations'
    );
    assert.equal(team.count, entered.size, 'only physically entered sectors count');
    if (tick === 1) assert.equal(busy.length, 5);
    if (team.count >= 24 && surveyors.size === 14 && goals.size >= 15 && outer) break;
  }
  assert.equal(moved.size, 14);
  assert.equal(surveyors.size, 14);
  assert.ok(
    outer && team.count >= 24 && goals.size >= 15,
    `reached ${team.count} sectors with ${goals.size} goals`
  );
  assert.equal(r.teams[1].count, 0, 'no map knowledge is shared across sides');
  assert.equal(g.bullets.length, 0, 'no shots at unreported targets');
});

test('a support bot investigates the team’s last report, never the hidden vehicle; the report expires', () => {
  const api = game(),
    { g, nav, vehicle } = fixture(api);
  const u = vehicle(-275, 0, 'ally'),
    t = vehicle(170, 0, 'enemy');
  api.BotAI.attach(u, { side: 0, lane: 1, index: 1 }, nav);
  const r = nav.recon;
  t.spotted = true;
  api.BotAI.beginTick(nav, 12); // radio sighting before this particular bot's next decision
  t.spotted = false;
  const reported = t.x;
  t.x = -470;
  t.y = 360;
  api.BotAI.beginTick(nav, 24);
  api.BotAI.step(u, 24);
  assert.equal(r.teams[1].reports.size, 0);
  assert.equal(u.bot.target, null);
  assert.equal(u.bot.memory, null);
  assert.equal(u.bot.mode, 'investigate');
  assert.equal(u.bot.goal.x, reported);
  assert.equal(u.bot.goal.y, 0);
  const start = u.x;
  for (let tick = 25; tick <= 145; tick++) {
    api.BotAI.beginTick(nav, tick);
    api.BotAI.step(u, tick);
  }
  assert.ok(u.x > start + 15 && u.bot.radio.x === reported && u.bot.radio.y === 0);
  assert.equal(g.bullets.length, 0);
  const late = 12 + api.BattleRecon.reportLife + 12;
  api.BotAI.beginTick(nav, late);
  api.BotAI.step(u, late);
  assert.equal(r.teams[0].reports.size, 0);
  assert.equal(u.bot.mode, 'survey');
});

test('survey reservations recover from a blocked or dead scout and stale cells get revisited', () => {
  const api = game(),
    { nav, g, vehicle } = fixture(api),
    u = vehicle(0, 0, 'ally');
  api.BotAI.attach(u, { side: 0, lane: 1, index: 1, scout: true }, nav);
  const r = nav.recon,
    t = r.teams[0],
    now = 6000;
  // One distant old cell; near alternatives have only just been visited.
  t.visited.fill(now);
  t.visited[0] = 0;
  u.bot.firstSurvey = false;
  assert.equal(r.destination(u, now), r.anchors[0]);
  assert.equal(t.claims[0], u);
  const later = u.bot.progressUntil + 1;
  assert.notEqual(r.destination(u, later), r.anchors[0]);
  assert.equal(t.claims[0], null);
  r.release(u);
  u.bot.skipSector = -1;
  const secondPass = r.destination(u, later + 3);
  assert.equal(r.cell(secondPass.x, secondPass.y), 0);
  assert.notEqual(secondPass, r.anchors[0], 'second visit checks a different part of the same sector');
  u.dead = true;
  r.sample(g.units, later + 12);
  assert.ok(t.claims.every((v) => !v));
  const fresh = new api.BattleRecon(nav);
  assert.ok(fresh.teams.every((side) => side.count === 0 && side.visited.every((v) => v === -1)));
});


test('every playable map has substantial reachable high ground, a real drivable ramp and elevated solid cover',()=>{
  const api=game(),m=api.BATTLE_UNITS_PER_METRE;
  for(const id in api.BattleMaps.specs){const {a,nav,g,vehicle}=fixture(api,id),f=a.ground;
    const high=[],step=11*m;let ramp;
    for(let y=-f.H+step;y<f.H;y+=step)for(let x=-f.W+step;x<f.W;x+=step){
      if(!nav.clear(x,y,x,y))continue;high.push(f.at(x,y)/m);
      if(!ramp && f.at(x,y)>2*m){const gx=(f.at(x+10,y)-f.at(x-10,y))/20,gy=(f.at(x,y+10)-f.at(x,y-10))/20;
        const angle=Math.atan2(gy,gx),dx=Math.cos(angle),dy=Math.sin(angle),dist=32*m;
        if(Math.hypot(gx,gy)>.08 && nav.clear(x,y,x+dx*dist,y+dy*dist) && f.at(x+dx*dist,y+dy*dist)>f.at(x,y)+dist*.085)ramp={x,y,angle,dx,dy};}
    }
    high.sort((a,b)=>a-b);assert.ok(high.at(-1)>(id==='city'?10:id==='port'?15:19) && high[Math.floor(high.length*.85)]>5,id+' uplands inside accessible terrain');
    assert.ok(ramp,id+' approach to a summit');const u=vehicle(ramp.x,ramp.y,'player','KV1');u.angle=ramp.angle;g.player=u;api.TrackDrive.place(u);
    const before=u.rideHeight;let steps=0;while(steps++<1600 && Math.hypot(u.x-ramp.x,u.y-ramp.y)<28*m)api.TrackDrive.step(u,1,0,false,nav);
    assert.ok(steps<1600 && u.rideHeight>before+1.5*m,id+' heavy can really drive up the slope');
    const w=a.walls.find(w=>w.baseHeight>4*m),roof=w.baseHeight+w.height;
    const hit=api.nearestBattleWall(w.x+w.w/2,w.y+w.h/2,roof+18,0,0,-1,80);
    assert.equal(hit.hit,w);assert.ok(Math.abs(hit.distance-18)<.001,id+' shell hits the raised roof');
  }
});

// Not just a decorative hill: drive a heavy up each switchback without assigning
// its position/heading between waypoints. Then let an ordinary lane-4 supporter
// plan and drive from the corresponding team base into the courtyard on its own.
test('Burgstadt: north and south castle approaches carry a player and a bot into the elevated courtyard', () => {
  const api = game(), m = api.BATTLE_UNITS_PER_METRE;
  for (const side of [0,1]) {
    const {a,nav,g,vehicle} = fixture(api,'burgstadt'), road = a.paths[side].points,
      start = road[0], target = road.at(-1), elevation = a.ground.at(target.x,target.y);
    assert.ok(elevation-a.ground.at(start.x,start.y)>12*m);
    const u = vehicle(start.x,start.y,'player','KV1'); g.player=u;
    for (const p of road.slice(1)) {
      assert.ok(nav.clear(u.x,u.y,p.x,p.y));
      assert.equal(api.getTerrainAt(p.x,p.y),'cobble');
      let n=0;
      while (Math.hypot(p.x-u.x,p.y-u.y)>1.7*m && n++<4000) {
        const bearing=Math.atan2(p.y-u.y,p.x-u.x)-u.angle;
        const diff=Math.atan2(Math.sin(bearing),Math.cos(bearing));
        api.TrackDrive.step(u, Math.abs(diff)<.45?1:0, Math.max(-1, Math.min(1,diff*4)), Math.abs(diff)>=.45);
      }
      assert.ok(n<4000,'player reached switchback point '+JSON.stringify(p));
    }
    assert.ok(u.rideHeight>elevation-m && !u.driveBlocked);
    g.units.length=0; g.player=null;
    const from=nav.point(nav.nearest(a.bases[side].x,a.bases[side].y));
    const bot=vehicle(from.x,from.y,side?'enemy':'ally','T26');
    api.BotAI.attach(bot,{side,lane:4,index:4},nav);
    const goal=bot.bot.opening;
    assert.ok(Math.hypot(goal.x-target.x,goal.y-target.y)<18*m,'natural opening is inside the gates');
    let tick=0;
    while (Math.hypot(bot.x-goal.x,bot.y-goal.y)>3*m && ++tick<18000) {
      api.BotAI.beginTick(nav,tick); api.BotAI.step(bot,tick);
      if (tick%60===0) assert.ok(nav.clear(bot.x,bot.y,bot.x,bot.y));
    }
    assert.ok(tick<18000 && bot.rideHeight>elevation-3*m,'bot reached court from side '+side);
  }
});

test('every adjacent-tier platoon gets only opponents and allies within one tier of EACH seat; wide parties cannot deploy',()=>{
  const {DB,makeRosters}=game(), ids=[];
  for(const t of Object.values(DB))ids[t.tier]??=t.id;
  for(const a of ids.filter(Boolean)) for(const b of ids.filter(Boolean)) {
    const party=[a,b,a];
    if(Math.abs(DB[a].tier-DB[b].tier)>1){assert.throws(()=>makeRosters(a,7,()=>.4,party),/соседних уровней/);continue;}
    const teams=makeRosters(a,7,()=>.42,party);
    for(const id of teams.flat())assert.ok(party.every(h=>Math.abs(DB[h].tier-DB[id].tier)<=1),[a,b,id]);
  }
});
