const test=require('node:test'),assert=require('node:assert/strict');
const {openGame}=require('./winter-harness.cjs'),{ids,active}=require('./fixtures/national.cjs');
const counts={ussr:14,germany:15,usa:15,sweden:14,japan:13,france:15};

// The expected per-model intervals come from the agreed percentages and the source
// manifest, not the runtime bands. 120 bp = 1.2% on each individual tier-V tank.
const perTankBP=[0,0,300,240,170,120,80,50,25,10,5];
const levelRow=(card,tier)=>card.getByRole('row').filter({has:card.page().getByRole('rowheader',{name:tier,exact:true})}).getByRole('cell').allTextContents();

test('20% victory roll is separate from opening a national box; no roll on loss or for unsupported nations',async t=>{
  const {page}=await openGame(t);
  const nations=await page.evaluate(()=>{
    const never=()=>{throw Error('unexpected roll');};
    for(const id of ['BT42','V440','NAT015','does-not-exist']){
      const g={player:{id},inventory:{}};if(nationalVictoryBox(g,true,never) || Object.keys(g.inventory).length)throw Error(id);
    }
    const result=[];
    for(const [id,b] of Object.entries(CONTAINERS).filter(([,b])=>b.national)){
      if(b.cost || b.slotChance!==0)throw Error(id+' for sale or bonus');
      const nat=id.slice(9),player=Object.values(DB).find(t=>t.nat===nat && !t.source),g={player,selected:'IS7',curNat:'france',inventory:{basic:2}};
      if(nationalVictoryBox(g,false,never)!==null)throw Error('loss');
      for(const r of [.20,.9999])if(nationalVictoryBox(g,true,()=>r)!==null)throw Error('win boundary: '+id);
      for(const r of [0,.199999])if(nationalVictoryBox(g,true,()=>r)!==id)throw Error('missed win: '+id);
      if(g.inventory[id]!==2 || g.inventory.basic!==2)throw Error('wrong inventory');result.push(nat);
    }
    return result;
  });
  assert.deepEqual(nations.sort(),Object.keys(counts).sort());
});

test('every eligible collector keeps its own absolute chance in all six national boxes; only the resource pool grows as tanks are collected',async t=>{
  const {page}=await openGame(t);
  for(const [nat,n] of Object.entries(counts)){
    const fleet=active.filter(t=>t.nat===nat && t.source==='collection');assert.equal(fleet.length,n);
    const stock=ids(nat,'collection');
    for(const [owned,pending] of [[[],[]],[stock.filter((_,i)=>i%3===0),stock.filter((_,i)=>i%3===1)],[stock.slice(0,3),stock.slice(3)]]){
      const probes=[];let sumBP=0;
      for(let tier=2;tier<=10;tier++){
        const pool=fleet.filter(t=>t.tier===tier && !owned.includes(t.id) && !pending.includes(t.id));
        const start=sumBP/10000;sumBP+=perTankBP[tier]*pool.length;
        // Both edges of the tier's interval, and both edges of each member's 1/N share.
        pool.forEach(({id},i)=>probes.push([start,i/pool.length,id],[sumBP/10000-1e-10,(i+1)/pool.length-1e-10,id]));
      }
      assert.ok(sumBP<10000,'the manifest must leave room for resources');
      const end=sumBP/10000,s=end+(1-end)*.6,x=end+(1-end)*.9;
      probes.push([end,0,'silver:5000'],[s-1e-10,.999999,'silver:15000'],[s+1e-10,0,'xp:2000'],
        [x-1e-10,.999999,'xp:8000'],[x+1e-10,0,'gold:50'],[.999999,.999999,'gold:200']);
      const got=await page.evaluate(({box,owned,pending,rolls})=>rolls.map(pair=>{
        GameState.owned=[...owned];GameState.pendingVehicles=[...pending];GameState.rentalBattles={};
        const r=openContainerDirect(box,()=>{if(!pair.length)throw Error('extra RNG draw');return pair.shift();});
        if(pair.length || r.slot || (r.id && !HangarSlots.received(r.id)))throw Error('bad award '+box);
        return r.id || `${r.type}:${r.amount}`;
      }),{box:'national-'+nat,owned,pending,rolls:probes.map(([a,b])=>[a,b])});
      assert.deepEqual(got,probes.map(p=>p[2]),`${nat}, ${owned.length} owned, ${pending.length} queued`);
    }
  }
});

test('earned inventory: open a national batch once; show resources and queued M7, deliver after sale, reload intact',async t=>{
  const owned=['MS1','LTR','T26','IS3','BT2','BT7','A20','T34','T50','V440'];
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned,selected:'V440',garageSlots:10,GOLD:0,SILVER:0,XP:0,
    inventory:{...Object.fromEntries(Object.keys(counts).map(n=>['national-'+n,1])),'national-usa':4,basic:1,'national-finland':3}}});
  const stock=(await saved()).inventory;assert.equal(Object.keys(stock).length,7);assert.equal(stock['national-finland'],undefined);
  await click('Контейнеры');const exhibit=page.locator('.national-card').filter({has:page.getByRole('button',{name:'Осмотреть модель: Ящик США',exact:true})});
  await exhibit.locator('summary').click();assert.deepEqual(await levelRow(exhibit,'I'),['0','—','0%']);
  assert.deepEqual(await levelRow(exhibit,'V'),['3','1,2%','3,6%']);assert.deepEqual(await levelRow(exhibit,'VI'),['2','0,8%','1,6%']);
  assert.deepEqual(await exhibit.locator('li').filter({hasText:/^V · /}).allTextContents(),['V · T14 — 1,2%','V · M7 — 1,2%','V · M4A2E4 Sherman — 1,2%']);
  await click('Инвентарь');
  const card=page.locator('.inv-card').filter({hasText:'Ящик США × 4'});
  assert.match(await card.locator('.c-desc').innerText(),/^11,85% на танк.*Серебро — 52,89%, опыт — 26,445%, золото — 8,815%/);
  await card.locator('summary').click();assert.deepEqual(await levelRow(card,'V'),['3','1,2%','3,6%']);
  await card.getByRole('button',{name:'Осмотреть модель: Ящик США'}).click();await click('Открыть крышку');await click('Назад');
  assert.deepEqual((await saved()).inventory,stock);
  await card.locator('.inv-open-all').evaluate(b=>{
    const old=Math.random,values=[.05,.5,.1065,0,.80,0,.99,0]; // US tier V, second of its three collectors is M7; then resources
    try{Math.random=()=>{return values.length ? values.shift() : old();};b.click();}finally{Math.random=old;}
  });
  await page.locator('#reward-display:not([hidden])').waitFor();
  assert.match(await page.locator('#reward-lines').innerText(),/M7[\s\S]*Ожидает слота/);
  const before=await saved(),{['national-usa']:used,...rest}=stock;
  assert.deepEqual([before.inventory,before.pendingVehicles,before.owned,before.SILVER,before.XP,before.GOLD,before.garageSlots],
    [rest,['NAT114'],owned,5000,2000,50,10]);
  await page.locator('#unpack-replay').click();await page.locator('#unpack-skip').click();await page.locator('#unpack-collect').click();
  await click('Магазин');await exhibit.locator('summary').click();assert.deepEqual(await levelRow(exhibit,'V'),['2','1,2%','2,4%']);
  assert.deepEqual(await levelRow(exhibit,'VI'),['2','0,8%','1,6%']);assert.match(await exhibit.innerText(),/10,65% на танк/);
  assert.deepEqual(await exhibit.locator('li').filter({hasText:/^V · /}).allTextContents(),['V · T14 — 1,2%','V · M7 — ✓ получена','V · M4A2E4 Sherman — 1,2%']);
  await page.reload();assert.deepEqual(await saved(),before);await click('Продать: Straussler V-4');
  await click('Подтвердить продажу');const delivered=await saved();assert.ok(delivered.owned.includes('NAT114'));assert.deepEqual(delivered.pendingVehicles,[]);
  await click('Выбрать для боя: M7');await page.reload();assert.equal(await page.locator('#dispatch-name').innerText(),'M7');assert.equal((await saved()).researched.includes('NAT114'),false);
});

test('single/bulk: each tier X stays at 0.05%, two tens give 0.1% and collected or queued tanks only increase resource odds',async t=>{
  const fleet=active.filter(t=>t.nat==='ussr' && t.source==='collection' && t.tier<9).map(t=>t.id);
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned:fleet,selected:fleet[0],garageSlots:fleet.length,inventory:{'national-ussr':6}}});
  const start=await saved();
  await click('Контейнеры');const exhibit=page.locator('.national-card').filter({has:page.getByRole('button',{name:'Осмотреть модель: Ящик СССР',exact:true})});
  await exhibit.locator('summary').click();assert.deepEqual(await levelRow(exhibit,'IX'),['1','0,1%','0,1%']);assert.deepEqual(await levelRow(exhibit,'X'),['2','0,05%','0,1%']);
  await click('Инвентарь');const card=page.locator('.inv-card').filter({hasText:'Ящик СССР'});
  await card.locator('summary').click();assert.deepEqual(await levelRow(card,'X'),['2','0,05%','0,1%']);assert.ok(await card.evaluate(c=>c.scrollWidth<=c.clientWidth));
  const open=async(button,rolls)=>{
    const left=await card.locator(button).evaluate((b,seq)=>{
      const old=Math.random;try{Math.random=()=>seq.length?seq.shift():old();b.click();return seq.length;}finally{Math.random=old;}
    },rolls);assert.equal(left,0);await click('ЗАБРАТЬ');
  };
  await open('.inv-open',[.000999999,0]);assert.deepEqual((await saved()).pendingVehicles,['NAT012']);
  await card.locator('summary').click();assert.deepEqual(await levelRow(card,'IX'),['0','0,1%','0%']);assert.deepEqual(await levelRow(card,'X'),['2','0,05%','0,1%']);
  assert.match(await card.locator('.c-desc').innerText(),/^0,1% на танк.*Серебро — 59,94%, опыт — 29,97%, золото — 9,99%/);
  // Two Xs → 0.001 is silver. After the first X, 0.0005 is silver. After the last, even zero is silver.
  await open('.inv-open-all',[.001,0,.000999999,.9999,.0005,.999999,.000499999,0,0,0]);
  const done=await saved();assert.deepEqual(done.pendingVehicles,['NAT012','NAT014','NAT013']);assert.deepEqual(done.owned,fleet);
  assert.deepEqual(done.inventory,{});assert.deepEqual([done.SILVER,done.GOLD,done.XP,done.garageSlots],[start.SILVER+25000,start.GOLD,start.XP,fleet.length]);
  await page.reload();assert.deepEqual(await saved(),done);await click('Контейнеры');await exhibit.locator('summary').click();
  assert.deepEqual(await exhibit.locator('.crate-tier-odds tbody td:last-child').allTextContents(),Array(10).fill('0%'));assert.match(await exhibit.innerText(),/Все машины этого ящика получены/);
});

test('a last rental wins its own country once; loss, aborted and duplicate results do not add national stock',async t=>{
  const {page,saved}=await openGame(t,{webgl:true,seed:{owned:['MS1','GPZ'],selected:'GPZ',curNat:'france',rentalBattles:{GPZ:1},usedPromos:['ARTA']}});
  const settle=async(won)=>page.evaluate(async won=>{
    GameState.controlMode='mobile';if(!await startBattle(7))throw Error('Team launch failed');stopBattleLoop();
    const sortie=[GameState.player.id,GameState.selected,!!GameState.player.rented],old=Math.random;
    try{Math.random=()=>.19;if(won!==null){endBattle(won);endBattle(true);}else{backToGarage();endBattle(true);}}finally{Math.random=old;}
    if(won!==null)backToGarage();return sortie;
  },won);
  assert.deepEqual(await settle(true),['GPZ','MS1',true]);
  for(const won of [false,null])assert.deepEqual(await settle(won),['MS1','MS1',false]);
  await page.reload();const s=await saved();assert.equal(s.totalBattles,2);assert.deepEqual(s.owned,['MS1']);assert.deepEqual(s.rentalBattles,{});
  assert.equal(s.inventory['national-germany'],1);assert.ok(!s.inventory['national-ussr'] && !s.inventory['national-france']);
});

test('all 24 new premiums can actually be bought for gold within ten dates; old save aliases never grant a special',async t=>{
  const {page,click,saved}=await openGame(t,{seed:{owned:['MS1','CHINI','R35','NAT087'],selected:'NAT087',GOLD:200000,garageSlots:31}});
  assert.deepEqual((await saved()).owned,['MS1']);await click('Премиум-магазин');
  assert.equal(await page.locator('#premium-roster li').count(),29);
  const bought=await page.evaluate(()=>{
    const now=WinterSeason.now,start=now(),firstGold=GameState.GOLD,bought={};let spend=0;
    try{for(let i=0;i<10;i++){
      const ms=start+i*86400000;WinterSeason.now=()=>ms;renderPremiumShop();
      for(const t of WinterSeason.offers(ms)){
        if(!t.id.startsWith('NAT') || GameState.owned.includes(t.id))continue;
        const card=document.querySelector(`.offer-card[data-id="${t.id}"] button`);if(!card || card.disabled)throw Error('unavailable '+t.id);
        card.click();if(!GameState.owned.includes(t.id))throw Error(t.id);bought[t.id]=t.price;spend+=t.price;
        if(GameState.GOLD!==firstGold-spend || !document.querySelector(`.offer-card[data-id="${t.id}"] button`).disabled)throw Error('double charge');
      }
    }}finally{WinterSeason.now=now;}return bought;
  });
  assert.deepEqual(bought,Object.fromEntries(active.filter(t=>t.source==='premium').map(t=>[t.id,t.tier*900])));
  const s=await saved();await page.reload();assert.deepEqual(await saved(),s);assert.deepEqual(s.researched,['MS1']);
});

for(const mobile of [false,true])test(`French all-branches graph: distinct clickable cards and a drawn prerequisite for every child (${mobile?'phone':'desktop'})`,async t=>{
  const {page,click}=await openGame(t,{mobile});await click('Дерево развития');await click('ФРАНЦИЯ');
  const report=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('#nodes .node')], overlap=[],noEdge=[],canvas=document.querySelector('#tree-canvas'),ctx=canvas.getContext('2d'),dpr=canvas.width/canvas.offsetWidth;
    nodes.forEach((a,i)=>{
      const r=a.getBoundingClientRect();for(const b of nodes.slice(i+1)){
        const s=b.getBoundingClientRect();if(Math.min(r.right,s.right)>Math.max(r.left,s.left) && Math.min(r.bottom,s.bottom)>Math.max(r.top,s.top))overlap.push([a.dataset.tankId,b.dataset.tankId]);
      }
      const parent=researchParent(a.dataset.tankId);if(!parent)return;
      const p=nodes.find(n=>n.dataset.tankId===parent),x=(p.offsetLeft+p.offsetWidth+a.offsetLeft)/2,y=(p.offsetTop+a.offsetTop+a.offsetHeight)/2;
      if(!ctx.getImageData(Math.round(x*dpr),Math.round(y*dpr),1,1).data[3])noEdge.push(a.dataset.tankId);
    });return [nodes.length,overlap,noEdge];
  });assert.deepEqual(report,[51,[],[]]);
  for(const [id,name] of [['AMX-12-T','AMX 12 t'],['AMD178B','Panhard AMD 178B']]){await page.locator(`.node[data-tank-id="${id}"]`).click();assert.equal(await page.locator('#tree-name').innerText(),name);}
});

test('training and tutorial never roll either container; practice currency bonuses remain and the next team match is eligible again',async t=>{
  const inventory={basic:1,ornament:2,'national-ussr':3};
  const {page,saved}=await openGame(t,{mobile:true,webgl:true,seed:{inventory,tree2026:{bauble:1},treeSlots2026:['bauble',null,null,null]}});
  let before=await saved();
  for(const [mode,won] of [['training',true],['training',false],['tutorial',true],['tutorial',false],[10,true],[15,false]]){
    const practice=typeof mode==='string';
    const result=await page.evaluate(async({mode,won})=>{
      GameState.controlMode='mobile';
      if(mode==='training')await startTraining();else if(mode==='tutorial')await startTutorial();else await startBattle(mode);
      if(!GameState.gameActive)throw Error('Launch failed: '+mode);stopBattleLoop();
      const training=GameState.training,tutorial=document.body.classList.contains('in-tutorial');
      const tree=TreeEvent.settle,national=nationalVictoryBox,draws=[0,0];
      // A zero roll always wins when eligible. Count draws only at the two reward hooks.
      TreeEvent.settle=(g,base)=>tree(g,base,()=>{draws[0]++;return 0;});
      nationalVictoryBox=(g,won)=>national(g,won,()=>{draws[1]++;return 0;});
      try{creditDamage(GameState.player,200);endBattle(won);endBattle(won);}
      finally{TreeEvent.settle=tree;nationalVictoryBox=national;}
      const text=document.getElementById('result-tree').textContent;backToGarage();return {training,tutorial,draws,text};
    },{mode,won});
    assert.equal(result.training,practice);assert.equal(result.tutorial,mode==='tutorial');assert.deepEqual(result.draws,practice?[0,0]:[1,+won]);
    const after=await saved();assert.deepEqual([after.SILVER-before.SILVER,after.XP-before.XP,after.GOLD-before.GOLD],[110,won?330:110,won?55:11]);
    if(practice){assert.match(result.text,/контейнеры не выдаются/);assert.doesNotMatch(result.text,/получен|не выпал/i);}
    else{inventory.ornament++;if(won)inventory['national-ussr']++;assert.match(result.text,/Получен ёлочный ларец/);}
    assert.deepEqual(after.inventory,inventory);before=after;
  }
  await page.reload();assert.deepEqual((await saved()).inventory,inventory);
});
