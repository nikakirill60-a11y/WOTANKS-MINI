const test=require('node:test'),assert=require('node:assert/strict');
const {openGame}=require('./winter-harness.cjs'),{ids,active}=require('./fixtures/national.cjs');
const counts={ussr:14,germany:15,usa:15,sweden:14,japan:13,france:15};

test('20% victory roll is separate: tier-weighted tank odds, every same-tier collector, resource boundaries and unsupported nations',async t=>{
  const {page}=await openGame(t);
  const results=await page.evaluate(()=>{
    const unsupported=['BT42','V440','NAT015','does-not-exist'];
    for(const id of unsupported){const g={player:{id},inventory:{}};if(nationalVictoryBox(g,true,()=>{throw Error(id+' rolled');}) || Object.keys(g.inventory).length)throw Error(id);}
    const out={};
    for(const [id,b] of Object.entries(CONTAINERS).filter(([,b])=>b.national)){
      if(b.cost || b.slotChance!==0)throw Error(id+' for sale or bonus');
      const nat=id.slice(9),player=Object.values(DB).find(t=>t.nat===nat && !t.source),g={player,selected:'IS7',curNat:'france',inventory:{basic:2}};
      if(nationalVictoryBox(g,false,()=>{throw Error('roll on loss');})!==null)throw Error('loss');
      for(const r of [.20,.9999])if(nationalVictoryBox(g,true,()=>r)!==null)throw Error('win boundary: '+id);
      for(const r of [0,.199999])if(nationalVictoryBox(g,true,()=>r)!==id)throw Error('missed win: '+id);
      if(g.inventory[id]!==2 || g.inventory.basic!==2)throw Error('wrong inventory');
      const check=(rolls)=>{const r=openContainerDirect(id,()=>{if(!rolls.length)throw Error('unexpected RNG '+id);return rolls.shift();});if(rolls.length || r.slot)throw Error(id);return r;};
      function fresh(roll,detail){
        GameState.owned=[];GameState.pendingVehicles=[];GameState.rentalBattles={};
        const r=check([roll,detail]);if(r.type!=='vehicle' || !GameState.owned.includes(r.id))throw Error(id+' failed to award');return r.id;
      }
      // Stratify the first 1,000 basis points of a fresh profile, without Monte Carlo noise.
      const hits=Array(11).fill(0),probe=[],draws=[];
      for(let i=0;i<1000;i++){
        const roll=(i+.5)/10000,tier=DB[fresh(roll,0)].tier;hits[tier]++;probe[tier]=roll;
      }
      for(let tier=2;tier<=10;tier++){
        const pool=b.vehicles.filter(k=>DB[k].tier===tier);
        pool.forEach((k,i)=>{
          if(fresh(probe[tier],(i+.5)/pool.length)!==k)throw Error('nonuniform selection: '+k);
          draws.push(k);
        });
      }
      if(nat==='ussr'){
        const edges=[.03,.054,.071,.083,.091,.096,.0985,.0995]; // II→III through IX→X
        edges.forEach((r,i)=>{if(DB[fresh(r-1e-10,0)].tier!==i+2 || DB[fresh(r,0)].tier!==i+3)throw Error('tier boundary '+r);});
        if(fresh(.0995,.49999999)!=='NAT013' || fresh(.0995,.5)!=='NAT014')throw Error('the two tens share ONE 0.05% band');
      }
      GameState.owned=[];
      for(const [value,expected,amt] of [[.10,'silver',5000],[.63999999,'silver',5000],[.64000001,'xp',2000],[.90999999,'xp',2000],[.91000001,'gold',50]]){
        const r=check([value,0]);if(r.type!==expected || r.amount!==amt)throw Error(id+': '+JSON.stringify(r));
      }
      GameState.owned=b.vehicles.slice(0,3);GameState.pendingVehicles=b.vehicles.slice(3); // nothing left, even those in the queue count
      for(const [roll,k,max] of [[0,'silver',15000],[.60,'xp',8000],[.90,'gold',200]]){
        const r=check([roll,.999999]);if(r.type!==k || r.amount!==max)throw Error('complete collection: '+id);
      }
      out[nat]={draws,hits};
    }
    return out;
  });
  assert.deepEqual(Object.keys(results).sort(),Object.keys(counts).sort());
  const base=[0,0,300,240,170,120,80,50,25,10,5];
  for(const [nat,n] of Object.entries(counts)){
    const {draws,hits}=results[nat];assert.equal(draws.length,n);assert.deepEqual(draws.sort(),ids(nat,'collection').sort());
    const present=new Set(active.filter(t=>t.nat===nat && t.source==='collection').map(t=>t.tier));
    const lower=[...present].filter(t=>t<10),sum=lower.reduce((n,t)=>n+base[t],0),top=present.has(10)?5:0;
    assert.equal(hits[10],top);assert.equal(hits.reduce((a,b)=>a+b),1000);
    for(let tier=1;tier<10;tier++){
      const expected=present.has(tier)?(1000-top)*base[tier]/sum:0;
      assert.ok(Math.abs(hits[tier]-expected)<1,`${nat} / ${tier}: ${hits[tier]} vs ${expected} bp`);
    }
  }
});

test('earned inventory: open a national batch once; show resources and queued M7, deliver after sale, reload intact',async t=>{
  const owned=['MS1','LTR','T26','IS3','BT2','BT7','A20','T34','T50','V440'];
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned,selected:'V440',garageSlots:10,GOLD:0,SILVER:0,XP:0,
    inventory:{...Object.fromEntries(Object.keys(counts).map(n=>['national-'+n,1])),'national-usa':4,basic:1,'national-finland':3}}});
  const stock=(await saved()).inventory;assert.equal(Object.keys(stock).length,7);assert.equal(stock['national-finland'],undefined);
  await click('Контейнеры');const exhibit=page.locator('.national-card').filter({has:page.getByRole('button',{name:'Осмотреть модель: Ящик СССР',exact:true})});
  await exhibit.locator('summary').click();assert.deepEqual(await exhibit.locator('.crate-tier-odds dd').allTextContents(),
    ['0%','3%','2,4%','1,7%','1,2%','0,8%','0,5%','0,25%','0,1%','0,05%']);
  await click('Инвентарь');
  const card=page.locator('.inv-card').filter({hasText:'Ящик США × 4'});
  assert.match(await card.locator('.c-desc').innerText(),/^10% на танк.*Серебро — 54%, опыт — 27%, золото — 9%/);
  await card.getByRole('button',{name:'Осмотреть модель: Ящик США'}).click();await click('Открыть крышку');await click('Назад');
  assert.deepEqual((await saved()).inventory,stock);
  await card.locator('.inv-open-all').evaluate(b=>{
    const old=Math.random,values=[.05,.5,.10,0,.80,0,.99,0]; // US tier V, second of its three collectors is M7; then resources
    try{Math.random=()=>{return values.length ? values.shift() : old();};b.click();}finally{Math.random=old;}
  });
  await page.locator('#reward-display:not([hidden])').waitFor();
  assert.match(await page.locator('#reward-lines').innerText(),/M7[\s\S]*Ожидает слота/);
  const before=await saved(),{['national-usa']:used,...rest}=stock;
  assert.deepEqual([before.inventory,before.pendingVehicles,before.owned,before.SILVER,before.XP,before.GOLD,before.garageSlots],
    [rest,['NAT114'],owned,5000,2000,50,10]);
  await page.locator('#unpack-replay').click();await page.locator('#unpack-skip').click();await page.locator('#unpack-collect').click();
  await page.reload();assert.deepEqual(await saved(),before);await click('Продать: Straussler V-4');
  await click('Подтвердить продажу');const delivered=await saved();assert.ok(delivered.owned.includes('NAT114'));assert.deepEqual(delivered.pendingVehicles,[]);
  await click('Выбрать для боя: M7');await page.reload();assert.equal(await page.locator('#dispatch-name').innerText(),'M7');assert.equal((await saved()).researched.includes('NAT114'),false);
});

test('single/bulk: level odds match the current hangar and queue, X stays at 0.05% even as the last prize',async t=>{
  const fleet=active.filter(t=>t.nat==='ussr' && t.source==='collection' && t.tier<9).map(t=>t.id);
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned:fleet,selected:fleet[0],garageSlots:fleet.length,inventory:{'national-ussr':5}}});
  const start=await saved(),levels=c=>c.locator('.crate-tier-odds dd').allTextContents();
  const atStart=[...Array(8).fill('0%'),'9,95%','0,05%'];
  await click('Контейнеры');const exhibit=page.locator('.national-card').filter({has:page.getByRole('button',{name:'Осмотреть модель: Ящик СССР',exact:true})});
  await exhibit.locator('summary').click();assert.deepEqual(await levels(exhibit),atStart);
  await click('Инвентарь');const card=page.locator('.inv-card').filter({hasText:'Ящик СССР'});
  await card.locator('summary').click();assert.deepEqual(await levels(card),atStart);assert.ok(await card.evaluate(c=>c.scrollWidth<=c.clientWidth));
  const open=async(button,rolls)=>{
    const left=await card.locator(button).evaluate((b,seq)=>{
      const old=Math.random;try{Math.random=()=>seq.length?seq.shift():old();b.click();return seq.length;}finally{Math.random=old;}
    },rolls);assert.equal(left,0);await click('ЗАБРАТЬ');
  };
  await open('.inv-open',[.09949999,0]);assert.deepEqual((await saved()).pendingVehicles,['NAT012']);
  await card.locator('summary').click();assert.deepEqual(await levels(card),[...Array(9).fill('0%'),'0,05%']);
  assert.match(await card.locator('.c-desc').innerText(),/^0,05% на танк.*Серебро — 59,97%, опыт — 29,985%, золото — 9,995%/);
  // Exact upper bound is silver. The next two win DIFFERENT queued Xs, then a zero roll is silver too.
  await open('.inv-open-all',[.0005,0,.000499999,.9999,.000499999,.9999,0,0]);
  const done=await saved();assert.deepEqual(done.pendingVehicles,['NAT012','NAT014','NAT013']);assert.deepEqual(done.owned,fleet);
  assert.deepEqual(done.inventory,{});assert.deepEqual([done.SILVER,done.GOLD,done.XP,done.garageSlots],[start.SILVER+10000,start.GOLD,start.XP,fleet.length]);
  await page.reload();assert.deepEqual(await saved(),done);await click('Контейнеры');await exhibit.locator('summary').click();
  assert.deepEqual(await levels(exhibit),Array(10).fill('0%'));assert.match(await exhibit.innerText(),/Все машины этого ящика получены/);
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
